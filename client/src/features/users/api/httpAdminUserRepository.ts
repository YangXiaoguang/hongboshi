import {
  ApiResponseSchema,
  UserAdminDetailSchema,
  UserAdminMembershipActionRequestSchema,
  UserAdminListQuerySchema,
  UserAdminListResultSchema,
  UserAdminMembershipMutationResultSchema,
  type UserAdminDetail,
  type UserAdminMembershipActionRequest,
  type UserAdminListQuery,
  type UserAdminListResult,
  type UserAdminMembershipMutationResult,
} from "@shared/domain";

const UserAdminListResponseSchema = ApiResponseSchema(
  UserAdminListResultSchema
);
const UserAdminDetailResponseSchema = ApiResponseSchema(UserAdminDetailSchema);
const UserAdminMembershipMutationResponseSchema = ApiResponseSchema(
  UserAdminMembershipMutationResultSchema
);
const API_BASE = "/api/users/admin";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("用户会员服务返回了无法解析的数据");
  }
}

export function parseAdminUserListResponse(
  payload: unknown
): UserAdminListResult {
  const parsed = UserAdminListResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseAdminUserDetailResponse(
  payload: unknown
): UserAdminDetail {
  const parsed = UserAdminDetailResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseAdminUserMembershipMutationResponse(
  payload: unknown
): UserAdminMembershipMutationResult {
  const parsed = UserAdminMembershipMutationResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

function extractErrorMessage(payload: unknown, fallback: string) {
  const listParsed = UserAdminListResponseSchema.safeParse(payload);
  if (listParsed.success && !listParsed.data.ok) {
    return listParsed.data.error.message;
  }

  const detailParsed = UserAdminDetailResponseSchema.safeParse(payload);
  if (detailParsed.success && !detailParsed.data.ok) {
    return detailParsed.data.error.message;
  }

  const mutationParsed =
    UserAdminMembershipMutationResponseSchema.safeParse(payload);
  if (mutationParsed.success && !mutationParsed.data.ok) {
    return mutationParsed.data.error.message;
  }

  return fallback;
}

function queryStringFromAdminUserQuery(query: Partial<UserAdminListQuery>) {
  const params = new URLSearchParams();
  const normalized = UserAdminListQuerySchema.partial().parse(query);
  Object.entries(normalized).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export const httpAdminUserRepository = {
  async loadUsers(
    query: Partial<UserAdminListQuery> = {}
  ): Promise<UserAdminListResult> {
    const response = await fetch(
      `${API_BASE}/users${queryStringFromAdminUserQuery(query)}`,
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
      throw new Error(extractErrorMessage(payload, "用户会员列表暂时不可用"));
    }
    return parseAdminUserListResponse(payload);
  },

  async loadUserDetail(userId: string): Promise<UserAdminDetail> {
    const response = await fetch(
      `${API_BASE}/users/${encodeURIComponent(userId)}`,
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
      throw new Error(extractErrorMessage(payload, "用户会员详情暂时不可用"));
    }
    return parseAdminUserDetailResponse(payload);
  },

  async updateUserMembership(
    userId: string,
    request: UserAdminMembershipActionRequest
  ): Promise<UserAdminMembershipMutationResult> {
    const response = await fetch(
      `${API_BASE}/users/${encodeURIComponent(userId)}/membership`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify(
          UserAdminMembershipActionRequestSchema.parse(request)
        ),
      }
    );
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "用户会员操作暂时不可用"));
    }
    return parseAdminUserMembershipMutationResponse(payload);
  },
};
