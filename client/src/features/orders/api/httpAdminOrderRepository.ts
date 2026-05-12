import {
  ApiResponseSchema,
  OrderAdminDetailSchema,
  OrderAdminListQuerySchema,
  OrderAdminListResultSchema,
  type OrderAdminDetail,
  type OrderAdminListQuery,
  type OrderAdminListResult,
} from "@shared/domain";

const OrderAdminListResponseSchema = ApiResponseSchema(
  OrderAdminListResultSchema
);
const OrderAdminDetailResponseSchema = ApiResponseSchema(
  OrderAdminDetailSchema
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

function extractErrorMessage(payload: unknown, fallback: string) {
  const listParsed = OrderAdminListResponseSchema.safeParse(payload);
  if (listParsed.success && !listParsed.data.ok) {
    return listParsed.data.error.message;
  }

  const detailParsed = OrderAdminDetailResponseSchema.safeParse(payload);
  if (detailParsed.success && !detailParsed.data.ok) {
    return detailParsed.data.error.message;
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
};
