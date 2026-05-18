import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { randomUUID } from "crypto";
import { URL } from "url";
import {
  ApiResponseSchema,
  OrderAfterSalesCreateRequestSchema,
  OrderAfterSalesListResultSchema,
  OrderAfterSalesMutationResultSchema,
  OrderAfterSalesRequestSchema,
  OrderAfterSalesSummarySchema,
  type Order,
  type OrderAfterSalesListResult,
  type OrderAfterSalesMutationResult,
  type OrderAfterSalesRequest,
  type OrderAfterSalesRequestStatus,
  type OrderAfterSalesSummary,
} from "../../../shared/domain";
import { authorizeRequest } from "../auth/authorization";
import { loadCourseAccessState } from "../courses/courseAccessApi";
import {
  getOrderAfterSalesStore,
  type OrderAfterSalesStore,
} from "./orderAfterSalesStore";

const OrderAfterSalesListResponseSchema = ApiResponseSchema(
  OrderAfterSalesListResultSchema
);
const OrderAfterSalesMutationResponseSchema = ApiResponseSchema(
  OrderAfterSalesMutationResultSchema
);

const ACTIVE_AFTER_SALES_STATUSES: OrderAfterSalesRequestStatus[] = [
  "submitted",
  "reviewing",
  "linked_to_refund",
];

const ORDER_AFTER_SALES_PRIVACY_NOTICE =
  "售后申请仅用于订单核查、客服处理和后台交易联动，用户端提交不会直接改变退款状态。";

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

function sortAfterSalesRequests(
  requests: OrderAfterSalesRequest[]
): OrderAfterSalesRequest[] {
  return [...requests].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

function isActiveAfterSalesRequest(request: OrderAfterSalesRequest) {
  return ACTIVE_AFTER_SALES_STATUSES.includes(request.status);
}

function descriptionPreview(description: string) {
  const normalized = description.replace(/\s+/g, " ").trim();
  return normalized.length > 140
    ? `${normalized.slice(0, 137)}...`
    : normalized;
}

function maskContact(contact: string) {
  const trimmed = contact.trim();
  if (/^1[3-9]\d{9}$/.test(trimmed)) {
    return `${trimmed.slice(0, 3)}****${trimmed.slice(-4)}`;
  }

  const emailMatch = trimmed.match(/^(.)([^@]*)(@.+)$/);
  if (emailMatch) {
    return `${emailMatch[1]}***${emailMatch[3]}`;
  }

  if (trimmed.length <= 4) return `${trimmed[0] ?? ""}***`;
  return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
}

export function summarizeOrderAfterSalesRequest(
  request: OrderAfterSalesRequest
): OrderAfterSalesSummary {
  return OrderAfterSalesSummarySchema.parse({
    id: request.id,
    orderId: request.orderId,
    userId: request.userId,
    requestType: request.requestType,
    status: request.status,
    descriptionPreview: descriptionPreview(request.description),
    contactMasked: maskContact(request.contact),
    linkedTransactionId: request.linkedTransactionId,
    linkedRefundRequestId: request.linkedRefundRequestId,
    operatorNote: request.operatorNote,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  });
}

function resultFromRequests(
  requests: OrderAfterSalesRequest[],
  now: string
): OrderAfterSalesListResult {
  const sorted = sortAfterSalesRequests(requests);
  return OrderAfterSalesListResultSchema.parse({
    requests: sorted,
    summaries: sorted.map(summarizeOrderAfterSalesRequest),
    activeRequest: sorted.find(isActiveAfterSalesRequest),
    privacyNotice: ORDER_AFTER_SALES_PRIVACY_NOTICE,
    generatedAt: now,
  });
}

async function findUserOrder(userId: string, orderId: string) {
  const state = await loadCourseAccessState(userId);
  const order = state.orders.find(item => item.id === orderId);
  return order ? { order, state } : undefined;
}

function canCreateAfterSalesRequest(order: Order) {
  return order.status === "paid" || order.status === "refunding";
}

export async function listOrderAfterSalesRequestsForOrder(
  orderId: string,
  store: OrderAfterSalesStore = getOrderAfterSalesStore()
) {
  return sortAfterSalesRequests(await store.listByOrderId(orderId));
}

export async function listOrderAfterSalesSummariesForOrder(
  orderId: string,
  store: OrderAfterSalesStore = getOrderAfterSalesStore()
) {
  return (await listOrderAfterSalesRequestsForOrder(orderId, store)).map(
    summarizeOrderAfterSalesRequest
  );
}

export async function listOrderAfterSalesSummariesByOrderIds(
  orderIds: string[],
  store: OrderAfterSalesStore = getOrderAfterSalesStore()
) {
  const orderIdSet = new Set(orderIds);
  const requests = (await store.listAll()).filter(request =>
    orderIdSet.has(request.orderId)
  );
  const summariesByOrderId = new Map<string, OrderAfterSalesSummary[]>();
  for (const request of sortAfterSalesRequests(requests)) {
    const current = summariesByOrderId.get(request.orderId) ?? [];
    summariesByOrderId.set(request.orderId, [
      ...current,
      summarizeOrderAfterSalesRequest(request),
    ]);
  }
  return summariesByOrderId;
}

export async function getOrderAfterSalesRequestsPayload(
  orderId: string,
  userId: string,
  now = new Date().toISOString(),
  store: OrderAfterSalesStore = getOrderAfterSalesStore()
) {
  const source = await findUserOrder(userId, orderId);
  if (!source) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "订单不存在或不属于当前账号"),
    } as const;
  }

  return {
    status: 200,
    body: OrderAfterSalesListResponseSchema.parse({
      ok: true,
      data: resultFromRequests(await store.listByOrderId(orderId), now),
    }),
  } as const;
}

export async function createOrderAfterSalesRequestPayload(
  orderId: string,
  body: unknown,
  userId: string,
  now = new Date().toISOString(),
  store: OrderAfterSalesStore = getOrderAfterSalesStore()
) {
  const parsed = OrderAfterSalesCreateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "售后申请参数不合法"),
    } as const;
  }

  const source = await findUserOrder(userId, orderId);
  if (!source) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "订单不存在或不属于当前账号"),
    } as const;
  }

  if (!canCreateAfterSalesRequest(source.order)) {
    return {
      status: 409,
      body: errorPayload(
        "CONFLICT",
        "仅已支付或退款中的订单可以提交售后申请"
      ),
    } as const;
  }

  const existing = await store.listByOrderId(orderId);
  if (existing.some(isActiveAfterSalesRequest)) {
    return {
      status: 409,
      body: errorPayload("CONFLICT", "该订单已有处理中售后申请"),
    } as const;
  }

  const request = await store.append(
    OrderAfterSalesRequestSchema.parse({
      id: `order_after_sales_${randomUUID()}`,
      orderId,
      userId,
      requestType: parsed.data.requestType,
      status: "submitted",
      description: parsed.data.description,
      contact: parsed.data.contact,
      createdAt: now,
      updatedAt: now,
    })
  );
  const requests = await store.listByOrderId(orderId);

  return {
    status: 200,
    body: OrderAfterSalesMutationResponseSchema.parse({
      ok: true,
      data: {
        ...resultFromRequests(requests, now),
        request,
      } satisfies OrderAfterSalesMutationResult,
    }),
  } as const;
}

export function registerOrderAfterSalesApi(app: Express) {
  app.get(
    "/api/orders/me/orders/:orderId/after-sales",
    async (req: Request, res: Response) => {
      const auth = await authorizeRequest(req, "course:purchase");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await getOrderAfterSalesRequestsPayload(
        req.params.orderId,
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.post(
    "/api/orders/me/orders/:orderId/after-sales",
    async (req: Request, res: Response) => {
      const auth = await authorizeRequest(req, "course:purchase");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await createOrderAfterSalesRequestPayload(
        req.params.orderId,
        req.body,
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    }
  );
}

export function handleOrderAfterSalesApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  if (!req.url || !req.url.startsWith("/api/orders/me")) return false;

  const url = new URL(req.url, "http://localhost");
  const match = url.pathname.match(
    /^\/api\/orders\/me\/orders\/([^/]+)\/after-sales$/
  );
  if (!match?.[1]) return false;

  if (req.method === "GET") {
    void (async () => {
      const auth = await authorizeRequest(req, "course:purchase");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await getOrderAfterSalesRequestsPayload(
        decodeURIComponent(match[1]),
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "售后申请读取失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "售后申请读取失败"));
    });
    return true;
  }

  if (req.method === "POST") {
    void (async () => {
      const [auth, body] = await Promise.all([
        authorizeRequest(req, "course:purchase"),
        readRequestBody(req),
      ]);
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await createOrderAfterSalesRequestPayload(
        decodeURIComponent(match[1]),
        body,
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "售后申请提交失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "售后申请提交失败"));
    });
    return true;
  }

  sendJson(res, 404, errorPayload("NOT_FOUND", "售后申请接口不存在"));
  return true;
}
