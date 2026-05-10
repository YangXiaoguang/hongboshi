import type { Express, Request, Response } from "express";
import type {
  IncomingHttpHeaders,
  IncomingMessage,
  ServerResponse,
} from "http";
import { URL } from "url";
import { z } from "zod";
import {
  ApiResponseSchema,
  PaymentReconciliationConsoleSchema,
  PaymentWebhookReceiptSnapshotSchema,
  PaymentWebhookEventSchema,
  userCan,
  type LoginSession,
  type PaymentBusinessOrderSnapshot,
  type PaymentReconciliationEntry,
  type PaymentReconciliationIssue,
  type PaymentReconciliationSeverity,
  type PaymentWebhookEvent,
} from "../../../shared/domain";
import {
  CounselingPaymentWebhookResultSchema,
  CounselingRefundWebhookResultSchema,
  getCounselingPaymentOrderSnapshot,
  processCounselingPaymentWebhookEvent,
  processCounselingRefundWebhookEvent,
} from "../counseling/counselingApi";
import { getLoginSessionFromRequest } from "../auth/authSessionApi";
import {
  getPaymentWebhookEventStore,
  type PaymentWebhookEventStore,
  type PaymentWebhookReceipt,
} from "./paymentWebhookEventStore";
import {
  resolvePaymentWebhookSecret,
  shouldRequirePaymentWebhookSignature,
  verifyPaymentWebhookSignature,
} from "./paymentWebhookSecurity";

const PaymentWebhookResponseSchema = ApiResponseSchema(
  z.union([
    CounselingPaymentWebhookResultSchema,
    CounselingRefundWebhookResultSchema,
  ])
);
const PaymentReconciliationConsoleResponseSchema = ApiResponseSchema(
  PaymentReconciliationConsoleSchema
);

type PaymentWebhookErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

type PaymentWebhookErrorPayload = ReturnType<typeof errorPayload>;
type PaymentWebhookSuccessPayload = z.infer<
  typeof PaymentWebhookResponseSchema
>;
type PaymentWebhookApiPayload = {
  status: number;
  body: PaymentWebhookSuccessPayload | PaymentWebhookErrorPayload;
};

type PaymentWebhookProcessingOptions = {
  headers?: IncomingHttpHeaders | Record<string, string | string[] | undefined>;
  rawBody?: string;
  now?: Date;
  requireSignature?: boolean;
  secret?: string;
  store?: PaymentWebhookEventStore;
};

type PaymentWebhookRawBodyRequest = Request & {
  rawBody?: string;
};
type PaymentOperationsActor = Pick<LoginSession["user"], "id" | "roles">;

function sendJson(
  res: Response | ServerResponse,
  status: number,
  payload: unknown
) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function errorPayload(code: PaymentWebhookErrorCode, message: string) {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  } as const;
}

function rawBodyFromPayload(body: unknown) {
  return JSON.stringify(body ?? {});
}

function apiPayloadFromReceipt(
  receipt: PaymentWebhookReceipt
): PaymentWebhookApiPayload {
  if (
    receipt.responseStatus &&
    isPaymentWebhookResponseBody(receipt.responseBody)
  ) {
    return {
      status: receipt.responseStatus,
      body: receipt.responseBody,
    };
  }

  return {
    status: 409,
    body: errorPayload("CONFLICT", "支付回调正在处理，请稍后重试"),
  };
}

function isPaymentWebhookResponseBody(
  body: unknown
): body is PaymentWebhookApiPayload["body"] {
  if (!body || typeof body !== "object") return false;
  return "ok" in body && typeof body.ok === "boolean";
}

function shouldVerifySignature(options: PaymentWebhookProcessingOptions) {
  return options.requireSignature ?? shouldRequirePaymentWebhookSignature();
}

function verifyWebhookSignatureIfNeeded(
  body: unknown,
  options: PaymentWebhookProcessingOptions
): PaymentWebhookErrorPayload | undefined {
  if (!shouldVerifySignature(options)) return undefined;

  const verification = verifyPaymentWebhookSignature({
    rawBody: options.rawBody ?? rawBodyFromPayload(body),
    headers: options.headers,
    secret: options.secret ?? resolvePaymentWebhookSecret(),
    now: options.now,
  });

  if (verification.ok) return undefined;
  return errorPayload("UNAUTHORIZED", verification.message);
}

async function routePaymentWebhookEvent(
  event: PaymentWebhookEvent
): Promise<PaymentWebhookApiPayload> {
  if (
    event.type === "payment.succeeded" &&
    event.orderId.startsWith("order_counseling_")
  ) {
    return processCounselingPaymentWebhookEvent(event);
  }

  if (
    event.type === "refund.succeeded" &&
    event.orderId.startsWith("order_counseling_")
  ) {
    return processCounselingRefundWebhookEvent(event);
  }

  return {
    status: 404,
    body: errorPayload("NOT_FOUND", "支付回调关联的业务订单不存在"),
  };
}

function webhookFailureMessage(payload: PaymentWebhookApiPayload) {
  if (!payload.body.ok) return payload.body.error.message;
  return "支付回调处理失败";
}

function snapshotFromReceipt(receipt: PaymentWebhookReceipt) {
  const event = receipt.eventPayload;
  return PaymentWebhookReceiptSnapshotSchema.parse({
    id: receipt.id,
    type: event.type,
    orderId: receipt.orderId,
    channel: event.channel,
    status: receipt.status,
    amount: event.amount,
    transactionId: event.transactionId,
    occurredAt: event.occurredAt,
    receivedAt: receipt.receivedAt,
    processedAt: receipt.processedAt,
    responseStatus: receipt.responseStatus,
    errorMessage: receipt.errorMessage,
  });
}

function issue(
  code: PaymentReconciliationIssue["code"],
  severity: PaymentReconciliationIssue["severity"],
  message: string
): PaymentReconciliationIssue {
  return { code, severity, message };
}

function severityFromIssues(
  issues: PaymentReconciliationIssue[]
): PaymentReconciliationSeverity {
  if (issues.some(item => item.severity === "critical")) return "critical";
  if (issues.length > 0) return "warning";
  return "ok";
}

function buildReconciliationIssues(
  receipt: PaymentWebhookReceipt,
  business: PaymentBusinessOrderSnapshot | undefined
) {
  const issues: PaymentReconciliationIssue[] = [];
  const event = receipt.eventPayload;

  if (receipt.status === "processing") {
    issues.push(issue("webhook_processing", "warning", "支付回调仍在处理中"));
  }

  if (receipt.status === "failed") {
    issues.push(
      issue(
        "webhook_failed",
        "critical",
        receipt.errorMessage ?? "支付回调处理失败"
      )
    );
  }

  if (!business) {
    issues.push(
      issue("business_order_missing", "critical", "未找到关联业务订单")
    );
    return issues;
  }

  if (
    typeof business.payableAmount === "number" &&
    business.payableAmount !== event.amount
  ) {
    issues.push(
      issue("order_amount_mismatch", "critical", "回调金额与业务订单金额不一致")
    );
  }

  if (
    receipt.status === "processed" &&
    event.type === "payment.succeeded" &&
    business.orderStatus &&
    !["paid", "refunding", "refunded"].includes(business.orderStatus)
  ) {
    issues.push(
      issue(
        "payment_order_not_settled",
        "critical",
        "支付成功后业务订单尚未进入已支付或后续退款状态"
      )
    );
  }

  if (
    receipt.status === "processed" &&
    event.type === "refund.succeeded" &&
    business.orderStatus &&
    business.orderStatus !== "refunded"
  ) {
    issues.push(
      issue(
        "refund_order_not_completed",
        "critical",
        "退款成功后业务订单尚未进入已退款状态"
      )
    );
  }

  if (
    receipt.status === "processed" &&
    event.type === "refund.succeeded" &&
    business.appointmentStatus &&
    business.appointmentStatus !== "refunded"
  ) {
    issues.push(
      issue(
        "refund_appointment_not_completed",
        "critical",
        "退款成功后咨询预约尚未进入已退款状态"
      )
    );
  }

  return issues;
}

async function businessSnapshotForReceipt(receipt: PaymentWebhookReceipt) {
  if (receipt.orderId.startsWith("order_counseling_")) {
    return getCounselingPaymentOrderSnapshot(receipt.orderId);
  }

  return undefined;
}

async function reconciliationEntryFromReceipt(
  receipt: PaymentWebhookReceipt,
  checkedAt: string
): Promise<PaymentReconciliationEntry> {
  const business = await businessSnapshotForReceipt(receipt);
  const issues = buildReconciliationIssues(receipt, business);
  return {
    id: receipt.id,
    webhook: snapshotFromReceipt(receipt),
    business,
    severity: severityFromIssues(issues),
    issues,
    checkedAt,
  };
}

function buildReconciliationSummary(entries: PaymentReconciliationEntry[]) {
  return {
    receiptCount: entries.length,
    processedCount: entries.filter(
      entry => entry.webhook.status === "processed"
    ).length,
    failedCount: entries.filter(entry => entry.webhook.status === "failed")
      .length,
    processingCount: entries.filter(
      entry => entry.webhook.status === "processing"
    ).length,
    okCount: entries.filter(entry => entry.severity === "ok").length,
    warningCount: entries.filter(entry => entry.severity === "warning").length,
    criticalCount: entries.filter(entry => entry.severity === "critical")
      .length,
  };
}

function parsedPaymentWebhookPayload(
  body: unknown
): PaymentWebhookApiPayload | PaymentWebhookEvent {
  const parsed = PaymentWebhookEventSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "支付回调参数不合法"),
    };
  }

  return parsed.data;
}

function readRequestBody(
  req: IncomingMessage
): Promise<{ rawBody: string; body: unknown }> {
  return new Promise(resolve => {
    let rawBody = "";
    req.on("data", chunk => {
      rawBody += chunk.toString();
    });
    req.on("end", () => {
      if (!rawBody.trim()) {
        resolve({ rawBody, body: {} });
        return;
      }

      try {
        resolve({ rawBody, body: JSON.parse(rawBody) });
      } catch {
        resolve({ rawBody, body: undefined });
      }
    });
  });
}

export function capturePaymentWebhookRawBody(
  req: IncomingMessage & { originalUrl?: string; rawBody?: string },
  _res: ServerResponse,
  buf: Buffer
) {
  const url = req.originalUrl ?? req.url ?? "";
  if (url.startsWith("/api/payments/webhooks")) {
    req.rawBody = buf.toString("utf8");
  }
}

export async function processPaymentWebhookPayload(
  body: unknown,
  options: PaymentWebhookProcessingOptions = {}
): Promise<PaymentWebhookApiPayload> {
  const parsed = parsedPaymentWebhookPayload(body);
  if ("body" in parsed) return parsed;

  const signatureError = verifyWebhookSignatureIfNeeded(body, options);
  if (signatureError) {
    return {
      status: 401,
      body: signatureError,
    };
  }

  const now = options.now ?? new Date();
  const store = options.store ?? getPaymentWebhookEventStore();
  const beginResult = await store.begin(parsed, now.toISOString());
  if (!beginResult.accepted) return apiPayloadFromReceipt(beginResult.receipt);

  let payload: PaymentWebhookApiPayload;
  try {
    payload = await routePaymentWebhookEvent(parsed);
  } catch (err) {
    console.error(err instanceof Error ? err.message : "支付回调处理失败");
    payload = {
      status: 500,
      body: errorPayload("INTERNAL_ERROR", "支付回调处理失败"),
    };
  }

  if (payload.body.ok) {
    await store.markProcessed(
      parsed.id,
      payload.status,
      payload.body,
      now.toISOString()
    );
  } else {
    await store.markFailed(
      parsed.id,
      payload.status,
      payload.body,
      webhookFailureMessage(payload),
      now.toISOString()
    );
  }

  return payload;
}

export async function getPaymentReconciliationConsolePayload(
  actor?: PaymentOperationsActor,
  now = new Date().toISOString(),
  store: PaymentWebhookEventStore = getPaymentWebhookEventStore()
) {
  if (!actor) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", "请先登录后查看支付对账"),
    } as const;
  }

  if (!userCan(actor, "admin:manage")) {
    return {
      status: 403,
      body: errorPayload("FORBIDDEN", "当前账号暂无支付对账权限"),
    } as const;
  }

  const receipts = await store.listRecent(50);
  const entries = await Promise.all(
    receipts.map(receipt => reconciliationEntryFromReceipt(receipt, now))
  );

  return {
    status: 200,
    body: PaymentReconciliationConsoleResponseSchema.parse({
      ok: true,
      data: {
        entries,
        summary: buildReconciliationSummary(entries),
        serverTime: now,
      },
    }),
  } as const;
}

export function registerPaymentApi(app: Express) {
  app.get(
    "/api/payments/admin/reconciliation",
    async (req: Request, res: Response) => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getPaymentReconciliationConsolePayload(
        session?.user
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.post(
    "/api/payments/webhooks/simulated",
    async (req: Request, res: Response) => {
      const request = req as PaymentWebhookRawBodyRequest;
      const payload = await processPaymentWebhookPayload(req.body, {
        headers: req.headers,
        rawBody: request.rawBody,
      });
      if (payload.body.ok) {
        sendJson(
          res,
          payload.status,
          PaymentWebhookResponseSchema.parse(payload.body)
        );
        return;
      }
      sendJson(res, payload.status, payload.body);
    }
  );
}

export function handlePaymentApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  if (!req.url || !req.url.startsWith("/api/payments")) return false;

  const url = new URL(req.url, "http://localhost");
  if (
    req.method === "GET" &&
    url.pathname === "/api/payments/admin/reconciliation"
  ) {
    void (async () => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getPaymentReconciliationConsolePayload(
        session?.user
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "支付对账读取失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "支付对账读取失败"));
    });
    return true;
  }

  if (
    req.method === "POST" &&
    url.pathname === "/api/payments/webhooks/simulated"
  ) {
    void readRequestBody(req)
      .then(async ({ rawBody, body }) => {
        const payload = await processPaymentWebhookPayload(body, {
          headers: req.headers,
          rawBody,
        });
        if (payload.body.ok) {
          sendJson(
            res,
            payload.status,
            PaymentWebhookResponseSchema.parse(payload.body)
          );
          return;
        }
        sendJson(res, payload.status, payload.body);
      })
      .catch(err => {
        console.error(err instanceof Error ? err.message : "支付回调处理失败");
        sendJson(res, 500, errorPayload("INTERNAL_ERROR", "支付回调处理失败"));
      });
    return true;
  }

  sendJson(res, 404, errorPayload("NOT_FOUND", "支付接口不存在"));
  return true;
}
