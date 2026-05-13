import {
  ApiResponseSchema,
  FinanceAdminOverviewSchema,
  FinanceAdminQuerySchema,
  type FinanceAdminOverview,
  type FinanceAdminQuery,
} from "@shared/domain";

const FinanceAdminOverviewResponseSchema = ApiResponseSchema(
  FinanceAdminOverviewSchema
);
const API_BASE = "/api/finance/admin";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("财务管理服务返回了无法解析的数据");
  }
}

export function parseFinanceAdminOverviewResponse(
  payload: unknown
): FinanceAdminOverview {
  const parsed = FinanceAdminOverviewResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

function extractErrorMessage(payload: unknown, fallback: string) {
  const parsed = FinanceAdminOverviewResponseSchema.safeParse(payload);
  if (parsed.success && !parsed.data.ok) {
    return parsed.data.error.message;
  }

  return fallback;
}

function queryStringFromFinanceAdminQuery(
  query: Partial<FinanceAdminQuery>
) {
  const params = new URLSearchParams();
  const normalized = FinanceAdminQuerySchema.partial().parse(query);
  Object.entries(normalized).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export const httpFinanceAdminRepository = {
  async loadOverview(
    query: Partial<FinanceAdminQuery> = {}
  ): Promise<FinanceAdminOverview> {
    const response = await fetch(
      `${API_BASE}/overview${queryStringFromFinanceAdminQuery(query)}`,
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
      throw new Error(extractErrorMessage(payload, "财务管理暂时不可用"));
    }
    return parseFinanceAdminOverviewResponse(payload);
  },
};
