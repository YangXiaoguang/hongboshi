import {
  ApiResponseSchema,
  CourseMembershipProductAdminConsoleSchema,
  CourseMembershipProductAdminMutationResultSchema,
  type CourseMembershipPlanStatusUpdateRequest,
  type CourseMembershipPlanUpdateRequest,
  type CourseMembershipProductAdminConsole,
  type CourseMembershipProductAdminMutationResult,
  type CourseMembershipProductUpdateRequest,
} from "@shared/domain";

const CourseMembershipProductConsoleResponseSchema = ApiResponseSchema(
  CourseMembershipProductAdminConsoleSchema
);
const CourseMembershipProductMutationResponseSchema = ApiResponseSchema(
  CourseMembershipProductAdminMutationResultSchema
);

const API_BASE = "/api/memberships/admin";

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
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCourseMembershipProductMutationResponse(
  payload: unknown
): CourseMembershipProductAdminMutationResult {
  const parsed = CourseMembershipProductMutationResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

function extractErrorMessage(payload: unknown, fallback: string) {
  const consoleParsed =
    CourseMembershipProductConsoleResponseSchema.safeParse(payload);
  if (consoleParsed.success && !consoleParsed.data.ok) {
    return consoleParsed.data.error.message;
  }

  const mutationParsed =
    CourseMembershipProductMutationResponseSchema.safeParse(payload);
  if (mutationParsed.success && !mutationParsed.data.ok) {
    return mutationParsed.data.error.message;
  }

  return fallback;
}

export const httpCourseMembershipProductRepository = {
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
      throw new Error(extractErrorMessage(payload, "会员商品后台暂时不可用"));
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
    throw new Error(extractErrorMessage(payload, fallback));
  }
  return parseCourseMembershipProductMutationResponse(payload);
}
