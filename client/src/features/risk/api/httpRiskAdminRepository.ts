import {
  ApiResponseSchema,
  RiskAdminActionRequestSchema,
  RiskAdminDetailSchema,
  RiskAdminListQuerySchema,
  RiskAdminListResultSchema,
  RiskAdminMutationResultSchema,
  type RiskAdminActionRequest,
  type RiskAdminDetail,
  type RiskAdminListQuery,
  type RiskAdminListResult,
  type RiskAdminMutationResult,
} from "@shared/domain";

const RiskAdminListResponseSchema = ApiResponseSchema(
  RiskAdminListResultSchema
);
const RiskAdminDetailResponseSchema = ApiResponseSchema(RiskAdminDetailSchema);
const RiskAdminMutationResponseSchema = ApiResponseSchema(
  RiskAdminMutationResultSchema
);
const API_BASE = "/api/risk/admin";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("风险复核服务返回了无法解析的数据");
  }
}

export function parseRiskAdminListResponse(
  payload: unknown
): RiskAdminListResult {
  const parsed = RiskAdminListResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseRiskAdminDetailResponse(
  payload: unknown
): RiskAdminDetail {
  const parsed = RiskAdminDetailResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseRiskAdminMutationResponse(
  payload: unknown
): RiskAdminMutationResult {
  const parsed = RiskAdminMutationResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

function extractErrorMessage(payload: unknown, fallback: string) {
  const listParsed = RiskAdminListResponseSchema.safeParse(payload);
  if (listParsed.success && !listParsed.data.ok) {
    return listParsed.data.error.message;
  }

  const detailParsed = RiskAdminDetailResponseSchema.safeParse(payload);
  if (detailParsed.success && !detailParsed.data.ok) {
    return detailParsed.data.error.message;
  }

  const mutationParsed = RiskAdminMutationResponseSchema.safeParse(payload);
  if (mutationParsed.success && !mutationParsed.data.ok) {
    return mutationParsed.data.error.message;
  }

  return fallback;
}

function queryStringFromRiskAdminQuery(query: Partial<RiskAdminListQuery>) {
  const params = new URLSearchParams();
  const normalized = RiskAdminListQuerySchema.partial().parse(query);
  Object.entries(normalized).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export const httpRiskAdminRepository = {
  async loadEvents(
    query: Partial<RiskAdminListQuery> = {}
  ): Promise<RiskAdminListResult> {
    const response = await fetch(
      `${API_BASE}/events${queryStringFromRiskAdminQuery(query)}`,
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
      throw new Error(extractErrorMessage(payload, "风险复核列表暂时不可用"));
    }
    return parseRiskAdminListResponse(payload);
  },

  async loadEventDetail(riskEventId: string): Promise<RiskAdminDetail> {
    const response = await fetch(
      `${API_BASE}/events/${encodeURIComponent(riskEventId)}`,
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
      throw new Error(extractErrorMessage(payload, "风险复核详情暂时不可用"));
    }
    return parseRiskAdminDetailResponse(payload);
  },

  async updateEvent(
    riskEventId: string,
    request: RiskAdminActionRequest
  ): Promise<RiskAdminMutationResult> {
    const response = await fetch(
      `${API_BASE}/events/${encodeURIComponent(riskEventId)}/actions`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify(RiskAdminActionRequestSchema.parse(request)),
      }
    );
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "风险复核处理暂时不可用"));
    }
    return parseRiskAdminMutationResponse(payload);
  },
};
