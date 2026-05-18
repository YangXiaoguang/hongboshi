import { describe, expect, it, vi } from "vitest";
import {
  createAfterSalesProgressNotification,
  createAfterSalesRefundRejectedNotification,
} from "@shared/domain";
import {
  httpUserNotificationRepository,
  parseUserNotificationListResponse,
  parseUserNotificationMutationResponse,
} from "./httpUserNotificationRepository";

const notification = createAfterSalesProgressNotification({
  userId: "u_phone_9019",
  orderId: "order_1",
  requestId: "after_sales_1",
  orderTitle: "情绪急救手册",
  action: "start_review",
  operatorNote: "开始核查用户诉求",
  now: "2026-05-18T12:00:00.000Z",
});

describe("httpUserNotificationRepository", () => {
  it("parses notification list responses", () => {
    const result = parseUserNotificationListResponse({
      ok: true,
      data: {
        notifications: [notification],
        unreadCount: 1,
        privacyNotice: "仅展示站内消息摘要。",
        generatedAt: "2026-05-18T12:01:00.000Z",
      },
    });

    expect(result.notifications[0]).toMatchObject({
      type: "after_sales_reviewing",
      resource: { orderTitle: "情绪急救手册" },
    });
    expect(result.unreadCount).toBe(1);
  });

  it("parses mark-read mutation responses", () => {
    const readNotification = {
      ...notification,
      status: "read" as const,
      readAt: "2026-05-18T12:05:00.000Z",
    };
    const result = parseUserNotificationMutationResponse({
      ok: true,
      data: {
        notifications: [readNotification],
        unreadCount: 0,
        updatedAt: "2026-05-18T12:05:00.000Z",
      },
    });

    expect(result.notifications[0]?.status).toBe("read");
    expect(result.unreadCount).toBe(0);
  });

  it("loads my notifications through the API", async () => {
    const rejection = createAfterSalesRefundRejectedNotification({
      userId: "u_phone_9019",
      orderId: "order_1",
      requestId: "after_sales_1",
      operatorNote: "准备转入退款受理",
      rejectionMessage: "需要财务复核",
      now: "2026-05-18T12:04:00.000Z",
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          data: {
            notifications: [rejection],
            unreadCount: 1,
            privacyNotice: "仅展示站内消息摘要。",
            generatedAt: "2026-05-18T12:05:00.000Z",
          },
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      httpUserNotificationRepository.getMyNotifications()
    ).resolves.toMatchObject({
      unreadCount: 1,
      notifications: [{ type: "refund_request_rejected" }],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/user-notifications/me",
      expect.objectContaining({ credentials: "same-origin" })
    );
    vi.unstubAllGlobals();
  });

  it("marks all notifications as read through the API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          data: {
            notifications: [{ ...notification, status: "read" }],
            unreadCount: 0,
            updatedAt: "2026-05-18T12:06:00.000Z",
          },
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(httpUserNotificationRepository.markRead()).resolves.toEqual([
      expect.objectContaining({ status: "read" }),
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/user-notifications/me/read",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ scope: "all" }),
      })
    );
    vi.unstubAllGlobals();
  });
});
