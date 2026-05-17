import {
  ApiResponseSchema,
  UserPreferenceResultSchema,
  type ApiError,
  type UserFavoriteCourseSource,
  type UserPreference,
  type UserPreferenceResult,
} from "@shared/domain";

const UserPreferenceResponseSchema = ApiResponseSchema(
  UserPreferenceResultSchema
);
const API_BASE = "/api/user-preferences";

export class UserPreferenceRequestError extends Error {
  constructor(
    message: string,
    readonly code?: ApiError["code"],
    readonly status?: number
  ) {
    super(message);
    this.name = "UserPreferenceRequestError";
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("用户偏好服务返回了无法解析的数据");
  }
}

function withStatus(err: unknown, status: number): Error {
  if (err instanceof UserPreferenceRequestError) {
    return new UserPreferenceRequestError(err.message, err.code, status);
  }

  return err instanceof Error ? err : new Error("用户偏好服务暂时不可用");
}

export function parseUserPreferenceResponse(
  payload: unknown
): UserPreferenceResult {
  const parsed = UserPreferenceResponseSchema.parse(payload);
  if (!parsed.ok) {
    throw new UserPreferenceRequestError(
      parsed.error.message,
      parsed.error.code
    );
  }
  return parsed.data;
}

async function requestPreference(
  path: string,
  init?: RequestInit
): Promise<UserPreferenceResult> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
    credentials: "same-origin",
    ...init,
  });
  const payload = await readJson(response);
  try {
    const result = parseUserPreferenceResponse(payload);
    if (!response.ok) {
      throw new UserPreferenceRequestError(
        "用户偏好服务暂时不可用",
        undefined,
        response.status
      );
    }
    return result;
  } catch (err) {
    throw withStatus(err, response.status);
  }
}

export const httpUserPreferenceRepository = {
  async getMyPreference(): Promise<UserPreference> {
    const result = await requestPreference("/me");
    return result.preference;
  },

  async updateFavoriteCourseIds(
    favoriteCourseIds: number[],
    source: UserFavoriteCourseSource = "unknown"
  ): Promise<UserPreference> {
    const result = await requestPreference("/me/favorites", {
      method: "PUT",
      body: JSON.stringify({ favoriteCourseIds, source }),
    });
    return result.preference;
  },
};
