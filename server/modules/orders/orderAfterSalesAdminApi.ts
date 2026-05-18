import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { randomUUID } from "crypto";
import { URL } from "url";
import {
  ApiResponseSchema,
  ORDER_ADMIN_PERMISSIONS,
  OrderAfterSalesAdminActionRequestSchema,
  OrderAfterSalesAdminMutationResultSchema,
  OrderAfterSalesAuditEventSchema,
  OrderAfterSalesRequestSchema,
  TRANSACTION_ADMIN_PERMISSIONS,
  userCan,
  type LoginSession,
  type OrderAfterSalesAdminActionRequest,
  type OrderAfterSalesAdminMutationResult,
  type OrderAfterSalesAuditEvent,
  type OrderAfterSalesAuditSnapshot,
  type OrderAfterSalesRequest,
} from "../../../shared/domain";
import { authorizeRequest } from "../auth/authorization";
import {
  getPaymentWebhookEventStore,
  type PaymentWebhookEventStore,
} from "../payments/paymentWebhookEventStore";
import {
  getTransactionOperationStore,
  type TransactionOperationStore,
} from "../transactions/transactionOperationStore";
import {
  getTransactionRefundProvider,
  type TransactionRefundProvider,
} from "../transactions/transactionRefundProvider";
import { updateAdminTransactionActionPayload } from "../transactions/transactionAdminApi";
import { summarizeOrderAfterSalesRequest } from "./orderAfterSalesApi";
import {
  getOrderAfterSalesStore,
  type OrderAfterSalesStore,
} from "./orderAfterSalesStore";

type OrderAfterSalesAdminActor = Pick<LoginSession["user"], "id" | "roles">;

const OrderAfterSalesAdminMutationResponseSchema = ApiResponseSchema(
  OrderAfterSalesAdminMutationResultSchema
);

function sendJson(
  res: Response | ServerResponse,
  status: number,
  payload: unknown
) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function errorPayload(
  code:
    | "BAD_REQUEST"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "INTERNAL_ERROR",
  message: string
) {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  } as const;
}

function readRequestBody(req: IncomingMessage): Promise<unknown> {
  return new Promise(resolve => {
    let body = "";
    req.on("data", chunk => {
      body += chunk.toString();
    });
    req.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        resolve(undefined);
      }
    });
  });
}

function auditSnapshot(
  request: OrderAfterSalesRequest
): OrderAfterSalesAuditSnapshot {
  return {
    status: request.status,
    linkedTransactionId: request.linkedTransactionId,
    linkedRefundRequestId: request.linkedRefundRequestId,
    operatorNote: request.operatorNote,
  };
}

function buildAuditEvent({
  actor,
  before,
  after,
  request,
  action,
  now,
}: {
  actor: OrderAfterSalesAdminActor;
  before: OrderAfterSalesAuditSnapshot;
  after: OrderAfterSalesAuditSnapshot;
  request: OrderAfterSalesRequest;
  action: OrderAfterSalesAdminActionRequest;
  now: string;
}): OrderAfterSalesAuditEvent {
  return OrderAfterSalesAuditEventSchema.parse({
    id: `order_after_sales_audit_${randomUUID()}`,
    requestId: request.id,
    orderId: request.orderId,
    userId: request.userId,
    actorId: actor.id,
    actorRoles: actor.roles,
    action: action.action,
    reason: action.reason,
    before,
    after,
    createdAt: now,
  });
}

function transitionConflict(
  request: OrderAfterSalesRequest,
  action: OrderAfterSalesAdminActionRequest
) {
  if (action.action === "start_review") {
    return request.status === "submitted"
      ? undefined
      : "只有已提交的售后申请可以标记处理中。";
  }

  if (action.action === "link_refund") {
    return ["submitted", "reviewing"].includes(request.status)
      ? undefined
      : "只有待处理或处理中的售后申请可以联动退款。";
  }

  if (action.action === "resolve") {
    return ["submitted", "reviewing", "linked_to_refund"].includes(
      request.status
    )
      ? undefined
      : "当前售后申请已结束，不能重复标记解决。";
  }

  if (action.action === "close") {
    return ["submitted", "reviewing"].includes(request.status)
      ? undefined
      : "只有待处理或处理中的售后申请可以关闭。";
  }

  return undefined;
}

function statusAfterAction(action: OrderAfterSalesAdminActionRequest) {
  if (action.action === "start_review") return "reviewing";
  if (action.action === "resolve") return "resolved";
  if (action.action === "close") return "closed";
  return "linked_to_refund";
}

async function mutationResult(
  request: OrderAfterSalesRequest,
  auditEvent: OrderAfterSalesAuditEvent,
  now: string,
  store: OrderAfterSalesStore
): Promise<OrderAfterSalesAdminMutationResult> {
  return OrderAfterSalesAdminMutationResultSchema.parse({
    summary: summarizeOrderAfterSalesRequest(request),
    auditEvent,
    auditEvents: await store.listAuditEventsByRequestId(request.id),
    serverTime: now,
  });
}

function denyUnauthorizedActor(actor: OrderAfterSalesAdminActor | null | undefined) {
  if (!actor) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", "请先登录后继续操作"),
    } as const;
  }

  if (!userCan(actor, ORDER_ADMIN_PERMISSIONS.operate)) {
    return {
      status: 403,
      body: errorPayload("FORBIDDEN", "当前账号暂无售后处理权限"),
    } as const;
  }

  return undefined;
}

export async function updateOrderAfterSalesAdminActionPayload(
  actor: OrderAfterSalesAdminActor | null | undefined,
  requestId: string,
  body: unknown,
  now = new Date().toISOString(),
  store: OrderAfterSalesStore = getOrderAfterSalesStore(),
  paymentStore: PaymentWebhookEventStore = getPaymentWebhookEventStore(),
  transactionOperationStore: TransactionOperationStore =
    getTransactionOperationStore(),
  refundProvider: TransactionRefundProvider = getTransactionRefundProvider()
) {
  const denied = denyUnauthorizedActor(actor);
  if (denied) return denied;

  const parsed = OrderAfterSalesAdminActionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "售后处理参数不合法"),
    } as const;
  }

  const current = await store.getById(requestId);
  if (!current) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "售后申请不存在"),
    } as const;
  }

  const conflict = transitionConflict(current, parsed.data);
  if (conflict) {
    return {
      status: 409,
      body: errorPayload("CONFLICT", conflict),
    } as const;
  }

  let linkedRefundRequestId = current.linkedRefundRequestId;
  if (parsed.data.action === "link_refund") {
    if (!userCan(actor as OrderAfterSalesAdminActor, TRANSACTION_ADMIN_PERMISSIONS.operate)) {
      return {
        status: 403,
        body: errorPayload("FORBIDDEN", "当前账号暂无交易退款操作权限"),
      } as const;
    }

    const refundPayload = await updateAdminTransactionActionPayload(
      actor as OrderAfterSalesAdminActor,
      parsed.data.transactionId,
      {
        action: "request_refund",
        reason: parsed.data.reason,
        afterSalesRequestId: current.id,
      },
      now,
      paymentStore,
      transactionOperationStore,
      refundProvider
    );

    if (!refundPayload.body.ok) {
      return refundPayload;
    }

    linkedRefundRequestId =
      refundPayload.body.data.auditEvent.refundProviderResult?.requestId;
  }

  const before = auditSnapshot(current);
  const next = await store.save(
    OrderAfterSalesRequestSchema.parse({
      ...current,
      status: statusAfterAction(parsed.data),
      linkedTransactionId:
        parsed.data.action === "link_refund"
          ? parsed.data.transactionId
          : current.linkedTransactionId,
      linkedRefundRequestId,
      operatorNote: parsed.data.reason,
      updatedAt: now,
    })
  );
  const auditEvent = await store.appendAuditEvent(
    buildAuditEvent({
      actor: actor as OrderAfterSalesAdminActor,
      before,
      after: auditSnapshot(next),
      request: next,
      action: parsed.data,
      now,
    })
  );

  return {
    status: 200,
    body: OrderAfterSalesAdminMutationResponseSchema.parse({
      ok: true,
      data: await mutationResult(next, auditEvent, now, store),
    }),
  } as const;
}

export function registerOrderAfterSalesAdminApi(app: Express) {
  app.patch(
    "/api/orders/admin/after-sales/:requestId/actions",
    async (req: Request, res: Response) => {
      const auth = await authorizeRequest(req, ORDER_ADMIN_PERMISSIONS.operate);
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await updateOrderAfterSalesAdminActionPayload(
        auth.session.user,
        req.params.requestId,
        req.body
      );
      sendJson(res, payload.status, payload.body);
    }
  );
}

export function handleOrderAfterSalesAdminApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  if (!req.url || !req.url.startsWith("/api/orders/admin/after-sales")) {
    return false;
  }

  const url = new URL(req.url, "http://localhost");
  const match = url.pathname.match(
    /^\/api\/orders\/admin\/after-sales\/([^/]+)\/actions$/
  );

  if (req.method === "PATCH" && match?.[1]) {
    void (async () => {
      const [auth, body] = await Promise.all([
        authorizeRequest(req, ORDER_ADMIN_PERMISSIONS.operate),
        readRequestBody(req),
      ]);
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await updateOrderAfterSalesAdminActionPayload(
        auth.session.user,
        decodeURIComponent(match[1]),
        body
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "售后处理失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "售后处理失败"));
    });
    return true;
  }

  sendJson(res, 404, errorPayload("NOT_FOUND", "售后处理接口不存在"));
  return true;
}
