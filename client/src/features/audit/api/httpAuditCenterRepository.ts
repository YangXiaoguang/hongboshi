import {
  ApiResponseSchema,
  AuditCenterArchiveRequestSchema,
  AuditCenterArchiveResultSchema,
  AuditCenterArchiveSearchQuerySchema,
  AuditCenterArchiveSearchResultSchema,
  AuditCenterArchiveVerificationResultSchema,
  AuditCenterDetailResultSchema,
  AuditCenterExportQuerySchema,
  AuditCenterListResultSchema,
  AuditCenterQuerySchema,
  type AuditCenterArchiveRequest,
  type AuditCenterArchiveResult,
  type AuditCenterArchiveSearchQuery,
  type AuditCenterArchiveSearchResult,
  type AuditCenterArchiveVerificationResult,
  type AuditCenterDetailResult,
  type AuditCenterListResult,
  type AuditCenterQuery,
} from "@shared/domain";

const AuditCenterListResponseSchema = ApiResponseSchema(
  AuditCenterListResultSchema
);
const AuditCenterDetailResponseSchema = ApiResponseSchema(
  AuditCenterDetailResultSchema
);
const AuditCenterArchiveResponseSchema = ApiResponseSchema(
  AuditCenterArchiveResultSchema
);
const AuditCenterArchiveVerificationResponseSchema = ApiResponseSchema(
  AuditCenterArchiveVerificationResultSchema
);
const AuditCenterArchiveSearchResponseSchema = ApiResponseSchema(
  AuditCenterArchiveSearchResultSchema
);
const API_BASE = "/api/audit/admin";

export type AuditCenterCsvDownload = {
  filename: string;
  content: string;
  contentType: string;
  exportId?: string;
  policyVersion?: string;
};

type AuditCenterArchiveRequestInput = Partial<AuditCenterArchiveRequest> &
  Partial<Pick<AuditCenterQuery, "page" | "pageSize">>;

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

export function parseAuditCenterDetailResponse(
  payload: unknown
): AuditCenterDetailResult {
  const parsed = AuditCenterDetailResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseAuditCenterArchiveResponse(
  payload: unknown
): AuditCenterArchiveResult {
  const parsed = AuditCenterArchiveResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseAuditCenterArchiveVerificationResponse(
  payload: unknown
): AuditCenterArchiveVerificationResult {
  const parsed = AuditCenterArchiveVerificationResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseAuditCenterArchiveSearchResponse(
  payload: unknown
): AuditCenterArchiveSearchResult {
  const parsed = AuditCenterArchiveSearchResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

function extractErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === "object" && payload !== null) {
    const error = (payload as { error?: { message?: unknown } }).error;
    if (typeof error?.message === "string" && error.message.length > 0) {
      return error.message;
    }
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

function queryStringFromAuditCenterExportQuery(
  query: Partial<AuditCenterQuery> = {}
) {
  const params = new URLSearchParams();
  const normalized = AuditCenterExportQuerySchema.partial().parse(query);
  Object.entries(normalized).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

function queryStringFromAuditCenterArchiveSearchQuery(
  query: Partial<AuditCenterArchiveSearchQuery> = {}
) {
  const params = new URLSearchParams();
  const normalized = AuditCenterArchiveSearchQuerySchema.partial().parse(query);
  Object.entries(normalized).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

function auditCenterArchiveRequestBody(
  query: AuditCenterArchiveRequestInput = {}
) {
  const normalized = AuditCenterArchiveRequestSchema.partial().parse(query);
  return Object.fromEntries(
    Object.entries(normalized).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
}

function filenameFromContentDisposition(value: string | null) {
  if (!value) return undefined;
  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) return decodeURIComponent(encoded);
  return value.match(/filename="?([^";]+)"?/i)?.[1];
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

  async loadEventDetail(eventId: string): Promise<AuditCenterDetailResult> {
    const response = await fetch(
      `${API_BASE}/events/${encodeURIComponent(eventId)}`,
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
      throw new Error(extractErrorMessage(payload, "审计事件详情暂时不可用"));
    }
    return parseAuditCenterDetailResponse(payload);
  },

  async exportCsv(
    query: Partial<AuditCenterQuery> = {}
  ): Promise<AuditCenterCsvDownload> {
    const response = await fetch(
      `${API_BASE}/export${queryStringFromAuditCenterExportQuery(query)}`,
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
      throw new Error(extractErrorMessage(payload, "审计中心导出暂时不可用"));
    }

    const content = await response.text();
    return {
      filename:
        filenameFromContentDisposition(
          response.headers.get("Content-Disposition")
        ) ?? "hongboshi-audit-export.csv",
      content,
      contentType:
        response.headers.get("Content-Type") ?? "text/csv; charset=utf-8",
      exportId:
        response.headers.get("X-Hongboshi-Audit-Export-Id") ?? undefined,
      policyVersion:
        response.headers.get("X-Hongboshi-Audit-Policy-Version") ?? undefined,
    };
  },

  async archiveEvents(
    query: AuditCenterArchiveRequestInput = {}
  ): Promise<AuditCenterArchiveResult> {
    const response = await fetch(`${API_BASE}/archive`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(auditCenterArchiveRequestBody(query)),
      cache: "no-store",
      credentials: "same-origin",
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "审计归档暂时不可用"));
    }
    return parseAuditCenterArchiveResponse(payload);
  },

  async loadArchiveVerification(): Promise<AuditCenterArchiveVerificationResult> {
    const response = await fetch(`${API_BASE}/archive/verification`, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      credentials: "same-origin",
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "审计归档校验暂时不可用"));
    }
    return parseAuditCenterArchiveVerificationResponse(payload);
  },

  async loadArchiveEvents(
    query: Partial<AuditCenterArchiveSearchQuery> = {}
  ): Promise<AuditCenterArchiveSearchResult> {
    const response = await fetch(
      `${API_BASE}/archive/events${queryStringFromAuditCenterArchiveSearchQuery(
        query
      )}`,
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
      throw new Error(extractErrorMessage(payload, "审计归档检索暂时不可用"));
    }
    return parseAuditCenterArchiveSearchResponse(payload);
  },
};
