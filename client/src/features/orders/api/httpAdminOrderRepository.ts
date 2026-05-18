import {
  ApiResponseSchema,
  OrderAfterSalesAdminActionRequestSchema,
  OrderAfterSalesAdminMutationResultSchema,
  OrderAdminActionRequestSchema,
  OrderAdminDetailSchema,
  OrderAdminListQuerySchema,
  OrderAdminListResultSchema,
  OrderAdminMutationResultSchema,
  type OrderAfterSalesAdminActionRequest,
  type OrderAfterSalesAdminMutationResult,
  type OrderAdminActionRequest,
  type OrderAdminDetail,
  type OrderAdminListQuery,
  type OrderAdminListResult,
  type OrderAdminMutationResult,
} from "@shared/domain";

const OrderAdminListResponseSchema = ApiResponseSchema(
  OrderAdminListResultSchema
);
const OrderAdminDetailResponseSchema = ApiResponseSchema(
  OrderAdminDetailSchema
);
const OrderAdminMutationResponseSchema = ApiResponseSchema(
  OrderAdminMutationResultSchema
);
const OrderAfterSalesAdminMutationResponseSchema = ApiResponseSchema(
  OrderAfterSalesAdminMutationResultSchema
);
const API_BASE = "/api/orders/admin";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("订单后台服务返回了无法解析的数据");
  }
}

export function parseAdminOrderListResponse(
  payload: unknown
): OrderAdminListResult {
  const parsed = OrderAdminListResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseAdminOrderDetailResponse(
  payload: unknown
): OrderAdminDetail {
  const parsed = OrderAdminDetailResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseAdminOrderMutationResponse(
  payload: unknown
): OrderAdminMutationResult {
  const parsed = OrderAdminMutationResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseOrderAfterSalesAdminMutationResponse(
  payload: unknown
): OrderAfterSalesAdminMutationResult {
  const parsed = OrderAfterSalesAdminMutationResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

function extractErrorMessage(payload: unknown, fallback: string) {
  const listParsed = OrderAdminListResponseSchema.safeParse(payload);
  if (listParsed.success && !listParsed.data.ok) {
    return listParsed.data.error.message;
  }

  const detailParsed = OrderAdminDetailResponseSchema.safeParse(payload);
  if (detailParsed.success && !detailParsed.data.ok) {
    return detailParsed.data.error.message;
  }

  const mutationParsed = OrderAdminMutationResponseSchema.safeParse(payload);
  if (mutationParsed.success && !mutationParsed.data.ok) {
    return mutationParsed.data.error.message;
  }

  const afterSalesMutationParsed =
    OrderAfterSalesAdminMutationResponseSchema.safeParse(payload);
  if (afterSalesMutationParsed.success && !afterSalesMutationParsed.data.ok) {
    return afterSalesMutationParsed.data.error.message;
  }

  return fallback;
}

function queryStringFromAdminOrderQuery(query: Partial<OrderAdminListQuery>) {
  const params = new URLSearchParams();
  const normalized = OrderAdminListQuerySchema.partial().parse(query);
  Object.entries(normalized).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export const httpAdminOrderRepository = {
  async loadOrders(
    query: Partial<OrderAdminListQuery> = {}
  ): Promise<OrderAdminListResult> {
    const response = await fetch(
      `${API_BASE}/orders${queryStringFromAdminOrderQuery(query)}`,
      {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
        credentials: "same-origin",
      }
    );
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "订单列表暂时不可用"));
    }
    return parseAdminOrderListResponse(payload);
  },

  async loadOrderDetail(orderId: string): Promise<OrderAdminDetail> {
    const response = await fetch(
      `${API_BASE}/orders/${encodeURIComponent(orderId)}`,
      {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
        credentials: "same-origin",
      }
    );
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "订单详情暂时不可用"));
    }
    return parseAdminOrderDetailResponse(payload);
  },

  async updateOrder(
    orderId: string,
    request: OrderAdminActionRequest
  ): Promise<OrderAdminMutationResult> {
    const normalized = OrderAdminActionRequestSchema.parse(request);
    const response = await fetch(
      `${API_BASE}/orders/${encodeURIComponent(orderId)}/actions`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify(normalized),
      }
    );
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "订单操作暂时不可用"));
    }
    return parseAdminOrderMutationResponse(payload);
  },

  async updateAfterSalesRequest(
    requestId: string,
    request: OrderAfterSalesAdminActionRequest
  ): Promise<OrderAfterSalesAdminMutationResult> {
    const normalized = OrderAfterSalesAdminActionRequestSchema.parse(request);
    const response = await fetch(
      `${API_BASE}/after-sales/${encodeURIComponent(requestId)}/actions`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify(normalized),
      }
    );
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "售后处理暂时不可用"));
    }
    return parseOrderAfterSalesAdminMutationResponse(payload);
  },
};
