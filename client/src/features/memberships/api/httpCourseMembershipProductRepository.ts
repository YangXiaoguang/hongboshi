import {
  type ApiError,
  ApiResponseSchema,
  CourseMembershipProductAdminConsoleSchema,
  CourseMembershipProductAdminMutationResultSchema,
  CourseMembershipProductSnapshotSchema,
  type CourseMembershipPlanStatusUpdateRequest,
  type CourseMembershipPlanUpdateRequest,
  type CourseMembershipProductAdminConsole,
  type CourseMembershipProductAdminMutationResult,
  type CourseMembershipProductSnapshot,
  type CourseMembershipProductUpdateRequest,
} from "@shared/domain";

const CourseMembershipProductConsoleResponseSchema = ApiResponseSchema(
  CourseMembershipProductAdminConsoleSchema
);
const CourseMembershipProductSnapshotResponseSchema = ApiResponseSchema(
  CourseMembershipProductSnapshotSchema
);
const CourseMembershipProductMutationResponseSchema = ApiResponseSchema(
  CourseMembershipProductAdminMutationResultSchema
);

const API_BASE = "/api/memberships/admin";
const PUBLIC_API_BASE = "/api/memberships";

export class CourseMembershipProductRequestError extends Error {
  constructor(
    message: string,
    readonly code?: ApiError["code"],
    readonly status?: number,
    readonly details?: ApiError["details"]
  ) {
    super(message);
    this.name = "CourseMembershipProductRequestError";
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("会员商品服务返回了无法解析的数据");
  }
}

export function parseCourseMembershipProductConsoleResponse(
  payload: unknown
): CourseMembershipProductAdminConsole {
  const parsed = CourseMembershipProductConsoleResponseSchema.parse(payload);
  if (!parsed.ok) {
    throw new CourseMembershipProductRequestError(
      parsed.error.message,
      parsed.error.code,
      undefined,
      parsed.error.details
    );
  }
  return parsed.data;
}

export function parseCourseMembershipProductSnapshotResponse(
  payload: unknown
): CourseMembershipProductSnapshot {
  const parsed = CourseMembershipProductSnapshotResponseSchema.parse(payload);
  if (!parsed.ok) {
    throw new CourseMembershipProductRequestError(
      parsed.error.message,
      parsed.error.code,
      undefined,
      parsed.error.details
    );
  }
  return parsed.data;
}

export function parseCourseMembershipProductMutationResponse(
  payload: unknown
): CourseMembershipProductAdminMutationResult {
  const parsed = CourseMembershipProductMutationResponseSchema.parse(payload);
  if (!parsed.ok) {
    throw new CourseMembershipProductRequestError(
      parsed.error.message,
      parsed.error.code,
      undefined,
      parsed.error.details
    );
  }
  return parsed.data;
}

function extractApiError(payload: unknown): ApiError | undefined {
  const snapshotParsed =
    CourseMembershipProductSnapshotResponseSchema.safeParse(payload);
  if (snapshotParsed.success && !snapshotParsed.data.ok) {
    return snapshotParsed.data.error;
  }

  const consoleParsed =
    CourseMembershipProductConsoleResponseSchema.safeParse(payload);
  if (consoleParsed.success && !consoleParsed.data.ok) {
    return consoleParsed.data.error;
  }

  const mutationParsed =
    CourseMembershipProductMutationResponseSchema.safeParse(payload);
  if (mutationParsed.success && !mutationParsed.data.ok) {
    return mutationParsed.data.error;
  }

  return undefined;
}

function requestErrorFromPayload(
  payload: unknown,
  fallback: string,
  status: number
) {
  const apiError = extractApiError(payload);
  return new CourseMembershipProductRequestError(
    apiError?.message ?? fallback,
    apiError?.code,
    status,
    apiError?.details
  );
}

export const httpCourseMembershipProductRepository = {
  async loadPublicSnapshot(): Promise<CourseMembershipProductSnapshot> {
    const response = await fetch(`${PUBLIC_API_BASE}/product`, {
      headers: {
        Accept: "application/json",
      },
      credentials: "same-origin",
      cache: "no-store",
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw requestErrorFromPayload(payload, "会员商品暂时不可用", response.status);
    }
    return parseCourseMembershipProductSnapshotResponse(payload);
  },

  async loadAdminConsole(): Promise<CourseMembershipProductAdminConsole> {
    const response = await fetch(`${API_BASE}/product`, {
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
      cache: "no-store",
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw requestErrorFromPayload(
        payload,
        "会员商品后台暂时不可用",
        response.status
      );
    }
    return parseCourseMembershipProductConsoleResponse(payload);
  },

  async updateProduct(
    request: CourseMembershipProductUpdateRequest
  ): Promise<CourseMembershipProductAdminMutationResult> {
    return requestMembershipProductMutation(
      `${API_BASE}/product`,
      request,
      "会员商品基础信息更新失败"
    );
  },

  async updatePlan(
    planId: string,
    request: CourseMembershipPlanUpdateRequest
  ): Promise<CourseMembershipProductAdminMutationResult> {
    return requestMembershipProductMutation(
      `${API_BASE}/plans/${encodeURIComponent(planId)}`,
      request,
      "会员套餐更新失败"
    );
  },

  async updatePlanStatus(
    planId: string,
    request: CourseMembershipPlanStatusUpdateRequest
  ): Promise<CourseMembershipProductAdminMutationResult> {
    return requestMembershipProductMutation(
      `${API_BASE}/plans/${encodeURIComponent(planId)}/status`,
      request,
      "会员套餐状态更新失败"
    );
  },
};

async function requestMembershipProductMutation(
  url: string,
  body: unknown,
  fallback: string
): Promise<CourseMembershipProductAdminMutationResult> {
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify(body),
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw requestErrorFromPayload(payload, fallback, response.status);
  }
  return parseCourseMembershipProductMutationResponse(payload);
}
