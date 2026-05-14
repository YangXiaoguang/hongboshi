import {
  ApiResponseSchema,
  FinanceAdminExportQuerySchema,
  FinanceAdminOverviewSchema,
  FinanceAdminQuerySchema,
  FinanceAdminRuleConsoleSchema,
  FinanceAdminRuleMutationResultSchema,
  FinanceAdminRuleUpdateRequestSchema,
  type FinanceAdminOverview,
  type FinanceAdminQuery,
  type FinanceAdminRuleConsole,
  type FinanceAdminRuleMutationResult,
  type FinanceAdminRuleUpdateRequest,
} from "@shared/domain";

const FinanceAdminOverviewResponseSchema = ApiResponseSchema(
  FinanceAdminOverviewSchema
);
const FinanceAdminRuleConsoleResponseSchema = ApiResponseSchema(
  FinanceAdminRuleConsoleSchema
);
const FinanceAdminRuleMutationResponseSchema = ApiResponseSchema(
  FinanceAdminRuleMutationResultSchema
);
const API_BASE = "/api/finance/admin";

export type FinanceAdminCsvDownload = {
  filename: string;
  content: string;
  contentType: string;
  exportId?: string;
};

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

export function parseFinanceAdminRuleConsoleResponse(
  payload: unknown
): FinanceAdminRuleConsole {
  const parsed = FinanceAdminRuleConsoleResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseFinanceAdminRuleMutationResponse(
  payload: unknown
): FinanceAdminRuleMutationResult {
  const parsed = FinanceAdminRuleMutationResponseSchema.parse(payload);
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

function queryStringFromFinanceAdminQuery(query: Partial<FinanceAdminQuery>) {
  const params = new URLSearchParams();
  const normalized = FinanceAdminQuerySchema.partial().parse(query);
  Object.entries(normalized).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

function queryStringFromFinanceAdminExportQuery(
  query: Partial<FinanceAdminQuery>
) {
  const params = new URLSearchParams();
  const normalized = FinanceAdminExportQuerySchema.partial().parse(query);
  Object.entries(normalized).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

function filenameFromContentDisposition(value: string | null) {
  if (!value) return undefined;
  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) return decodeURIComponent(encoded);
  return value.match(/filename="?([^";]+)"?/i)?.[1];
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

  async loadRules(): Promise<FinanceAdminRuleConsole> {
    const response = await fetch(`${API_BASE}/rules`, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      credentials: "same-origin",
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "财务规则暂时不可用"));
    }
    return parseFinanceAdminRuleConsoleResponse(payload);
  },

  async updateRules(
    request: FinanceAdminRuleUpdateRequest
  ): Promise<FinanceAdminRuleMutationResult> {
    const response = await fetch(`${API_BASE}/rules`, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      cache: "no-store",
      credentials: "same-origin",
      body: JSON.stringify(FinanceAdminRuleUpdateRequestSchema.parse(request)),
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "财务规则保存失败"));
    }
    return parseFinanceAdminRuleMutationResponse(payload);
  },

  async exportCsv(
    query: Partial<FinanceAdminQuery> = {}
  ): Promise<FinanceAdminCsvDownload> {
    const response = await fetch(
      `${API_BASE}/export${queryStringFromFinanceAdminExportQuery(query)}`,
      {
        headers: {
          Accept: "text/csv",
        },
        cache: "no-store",
        credentials: "same-origin",
      }
    );
    if (!response.ok) {
      const payload = await readJson(response);
      throw new Error(extractErrorMessage(payload, "财务导出暂时不可用"));
    }

    const content = await response.text();
    return {
      filename:
        filenameFromContentDisposition(
          response.headers.get("Content-Disposition")
        ) ?? "hongboshi-finance-export.csv",
      content,
      contentType:
        response.headers.get("Content-Type") ?? "text/csv; charset=utf-8",
      exportId:
        response.headers.get("X-Hongboshi-Finance-Export-Id") ?? undefined,
    };
  },
};
