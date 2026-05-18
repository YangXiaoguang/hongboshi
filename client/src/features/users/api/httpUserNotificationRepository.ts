import {
  ApiResponseSchema,
  UserNotificationListResultSchema,
  UserNotificationMutationResultSchema,
  type UserNotification,
  type UserNotificationListResult,
  type UserNotificationMutationResult,
} from "@shared/domain";

const UserNotificationListResponseSchema = ApiResponseSchema(
  UserNotificationListResultSchema
);
const UserNotificationMutationResponseSchema = ApiResponseSchema(
  UserNotificationMutationResultSchema
);
const API_BASE = "/api/user-notifications";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("站内消息服务返回了无法解析的数据");
  }
}

export function parseUserNotificationListResponse(
  payload: unknown
): UserNotificationListResult {
  const parsed = UserNotificationListResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseUserNotificationMutationResponse(
  payload: unknown
): UserNotificationMutationResult {
  const parsed = UserNotificationMutationResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

function extractErrorMessage(payload: unknown, fallback: string) {
  const listParsed = UserNotificationListResponseSchema.safeParse(payload);
  if (listParsed.success && !listParsed.data.ok) {
    return listParsed.data.error.message;
  }

  const mutationParsed =
    UserNotificationMutationResponseSchema.safeParse(payload);
  if (mutationParsed.success && !mutationParsed.data.ok) {
    return mutationParsed.data.error.message;
  }

  return fallback;
}

export const httpUserNotificationRepository = {
  async getMyNotifications(): Promise<UserNotificationListResult> {
    const response = await fetch(`${API_BASE}/me`, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      credentials: "same-origin",
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "站内消息暂时不可用"));
    }
    return parseUserNotificationListResponse(payload);
  },

  async markRead(notificationIds?: string[]): Promise<UserNotification[]> {
    const response = await fetch(`${API_BASE}/me/read`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        notificationIds?.length ? { notificationIds } : { scope: "all" }
      ),
      cache: "no-store",
      credentials: "same-origin",
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "消息读取状态更新失败"));
    }
    return parseUserNotificationMutationResponse(payload).notifications;
  },
};
