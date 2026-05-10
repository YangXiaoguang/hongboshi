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
  PaymentWebhookEventSchema,
  type PaymentWebhookEvent,
} from "../../../shared/domain";
import {
  CounselingPaymentWebhookResultSchema,
  processCounselingPaymentWebhookEvent,
} from "../counseling/counselingApi";
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
  CounselingPaymentWebhookResultSchema
);

type PaymentWebhookErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
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
  };
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
  if (event.orderId.startsWith("order_counseling_")) {
    return processCounselingPaymentWebhookEvent(event);
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

export function registerPaymentApi(app: Express) {
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
