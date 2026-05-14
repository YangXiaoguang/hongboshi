import {
  ApiResponseSchema,
  AuditCenterListResultSchema,
  AuditCenterQuerySchema,
  type AuditCenterListResult,
  type AuditCenterQuery,
} from "@shared/domain";

const AuditCenterListResponseSchema = ApiResponseSchema(
  AuditCenterListResultSchema
);
const API_BASE = "/api/audit/admin";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("审计中心服务返回了无法解析的数据");
  }
}

export function parseAuditCenterListResponse(
  payload: unknown
): AuditCenterListResult {
  const parsed = AuditCenterListResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

function extractErrorMessage(payload: unknown, fallback: string) {
  const parsed = AuditCenterListResponseSchema.safeParse(payload);
  if (parsed.success && !parsed.data.ok) {
    return parsed.data.error.message;
  }

  return fallback;
}

function queryStringFromAuditCenterQuery(
  query: Partial<AuditCenterQuery> = {}
) {
  const params = new URLSearchParams();
  const normalized = AuditCenterQuerySchema.partial().parse(query);
  Object.entries(normalized).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export const httpAuditCenterRepository = {
  async loadEvents(
    query: Partial<AuditCenterQuery> = {}
  ): Promise<AuditCenterListResult> {
    const response = await fetch(
      `${API_BASE}/events${queryStringFromAuditCenterQuery(query)}`,
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
      throw new Error(extractErrorMessage(payload, "审计中心暂时不可用"));
    }
    return parseAuditCenterListResponse(payload);
  },
};
