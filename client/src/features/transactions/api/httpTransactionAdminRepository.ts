import {
  ApiResponseSchema,
  TransactionAdminDetailSchema,
  TransactionAdminListQuerySchema,
  TransactionAdminListResultSchema,
  type TransactionAdminDetail,
  type TransactionAdminListQuery,
  type TransactionAdminListResult,
} from "@shared/domain";

const TransactionAdminListResponseSchema = ApiResponseSchema(
  TransactionAdminListResultSchema
);
const TransactionAdminDetailResponseSchema = ApiResponseSchema(
  TransactionAdminDetailSchema
);
const API_BASE = "/api/transactions/admin";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("交易后台服务返回了无法解析的数据");
  }
}

export function parseTransactionAdminListResponse(
  payload: unknown
): TransactionAdminListResult {
  const parsed = TransactionAdminListResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseTransactionAdminDetailResponse(
  payload: unknown
): TransactionAdminDetail {
  const parsed = TransactionAdminDetailResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

function extractErrorMessage(payload: unknown, fallback: string) {
  const listParsed = TransactionAdminListResponseSchema.safeParse(payload);
  if (listParsed.success && !listParsed.data.ok) {
    return listParsed.data.error.message;
  }

  const detailParsed = TransactionAdminDetailResponseSchema.safeParse(payload);
  if (detailParsed.success && !detailParsed.data.ok) {
    return detailParsed.data.error.message;
  }

  return fallback;
}

function queryStringFromTransactionAdminQuery(
  query: Partial<TransactionAdminListQuery>
) {
  const params = new URLSearchParams();
  const normalized = TransactionAdminListQuerySchema.partial().parse(query);
  Object.entries(normalized).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export const httpTransactionAdminRepository = {
  async loadTransactions(
    query: Partial<TransactionAdminListQuery> = {}
  ): Promise<TransactionAdminListResult> {
    const response = await fetch(
      `${API_BASE}/transactions${queryStringFromTransactionAdminQuery(query)}`,
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
      throw new Error(extractErrorMessage(payload, "交易流水暂时不可用"));
    }
    return parseTransactionAdminListResponse(payload);
  },

  async loadTransactionDetail(
    transactionId: string
  ): Promise<TransactionAdminDetail> {
    const response = await fetch(
      `${API_BASE}/transactions/${encodeURIComponent(transactionId)}`,
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
      throw new Error(extractErrorMessage(payload, "交易详情暂时不可用"));
    }
    return parseTransactionAdminDetailResponse(payload);
  },
};
