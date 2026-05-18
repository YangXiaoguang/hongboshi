import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import {
  ApiResponseSchema,
  UserNotificationListResultSchema,
  UserNotificationMarkReadRequestSchema,
  UserNotificationMutationResultSchema,
  type UserNotification,
} from "../../../shared/domain";
import { authorizeRequest } from "../auth/authorization";
import {
  getUserNotificationStore,
  type UserNotificationStore,
} from "./userNotificationStore";

const USER_NOTIFICATION_PRIVACY_NOTICE =
  "站内消息仅展示订单号、课程名、售后状态、时间和处理摘要，不包含支付敏感原文或咨询隐私内容。";

const UserNotificationListResponseSchema = ApiResponseSchema(
  UserNotificationListResultSchema
);
const UserNotificationMutationResponseSchema = ApiResponseSchema(
  UserNotificationMutationResultSchema
);

function sendJson(
  res: Response | ServerResponse,
  status: number,
  payload: unknown
) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function errorPayload(
  code: "BAD_REQUEST" | "UNAUTHORIZED" | "FORBIDDEN" | "INTERNAL_ERROR",
  message: string
) {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  };
}

function readRequestBody(req: IncomingMessage): Promise<unknown> {
  return new Promise(resolve => {
    let body = "";
    req.on("data", chunk => {
      body += chunk.toString();
    });
    req.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        resolve(undefined);
      }
    });
  });
}

function unreadCount(notifications: UserNotification[]) {
  return notifications.filter(notification => notification.status === "unread")
    .length;
}

function listPayload(notifications: UserNotification[], generatedAt: string) {
  return UserNotificationListResponseSchema.parse({
    ok: true,
    data: {
      notifications,
      unreadCount: unreadCount(notifications),
      privacyNotice: USER_NOTIFICATION_PRIVACY_NOTICE,
      generatedAt,
    },
  });
}

function mutationPayload(notifications: UserNotification[], updatedAt: string) {
  return UserNotificationMutationResponseSchema.parse({
    ok: true,
    data: {
      notifications,
      unreadCount: unreadCount(notifications),
      updatedAt,
    },
  });
}

export async function getUserNotificationsPayload(
  userId: string,
  now = new Date().toISOString(),
  store: UserNotificationStore = getUserNotificationStore()
) {
  const notifications = await store.listByUserId(userId);
  return {
    status: 200,
    body: listPayload(notifications, now),
  } as const;
}

export async function markUserNotificationsReadPayload(
  userId: string,
  body: unknown,
  now = new Date().toISOString(),
  store: UserNotificationStore = getUserNotificationStore()
) {
  const parsed = UserNotificationMarkReadRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "消息读取状态参数不合法"),
    } as const;
  }

  if (
    parsed.data.scope !== "all" &&
    (!parsed.data.notificationIds || parsed.data.notificationIds.length === 0)
  ) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "请指定要标记的消息"),
    } as const;
  }

  const notifications = await store.markRead(
    userId,
    parsed.data.scope === "all" ? undefined : parsed.data.notificationIds,
    now
  );

  return {
    status: 200,
    body: mutationPayload(notifications, now),
  } as const;
}

export function registerUserNotificationApi(app: Express) {
  app.get("/api/user-notifications/me", async (req: Request, res: Response) => {
    const auth = await authorizeRequest(req, "course_access:read");
    if (!auth.ok) {
      sendJson(res, auth.status, auth.body);
      return;
    }

    const payload = await getUserNotificationsPayload(auth.session.user.id);
    sendJson(res, payload.status, payload.body);
  });

  app.patch(
    "/api/user-notifications/me/read",
    async (req: Request, res: Response) => {
      const auth = await authorizeRequest(req, "course_access:read");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await markUserNotificationsReadPayload(
        auth.session.user.id,
        req.body
      );
      sendJson(res, payload.status, payload.body);
    }
  );
}

export function handleUserNotificationApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  if (!req.url || !req.url.startsWith("/api/user-notifications")) {
    return false;
  }

  const url = new URL(req.url, "http://localhost");
  if (req.method === "GET" && url.pathname === "/api/user-notifications/me") {
    void (async () => {
      const auth = await authorizeRequest(req, "course_access:read");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await getUserNotificationsPayload(auth.session.user.id);
      sendJson(res, payload.status, payload.body);
    })().catch(() =>
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "站内消息读取失败"))
    );
    return true;
  }

  if (
    req.method === "PATCH" &&
    url.pathname === "/api/user-notifications/me/read"
  ) {
    void (async () => {
      const auth = await authorizeRequest(req, "course_access:read");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const body = await readRequestBody(req);
      const payload = await markUserNotificationsReadPayload(
        auth.session.user.id,
        body
      );
      sendJson(res, payload.status, payload.body);
    })().catch(() =>
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "消息读取状态更新失败"))
    );
    return true;
  }

  sendJson(res, 405, errorPayload("BAD_REQUEST", "不支持的站内消息请求方法"));
  return true;
}
