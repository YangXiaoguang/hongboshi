import { beforeEach, describe, expect, it } from "vitest";
import { createAfterSalesProgressNotification } from "../../../shared/domain";
import {
  getUserNotificationsPayload,
  markUserNotificationsReadPayload,
} from "./userNotificationApi";
import {
  InMemoryUserNotificationStore,
  type UserNotificationStore,
} from "./userNotificationStore";

const userId = "u_notify_1";
const otherUserId = "u_notify_2";
const now = "2026-05-18T12:00:00.000Z";

let store: UserNotificationStore;

beforeEach(() => {
  store = new InMemoryUserNotificationStore();
});

describe("user notification api payloads", () => {
  it("lists only current user notifications with unread count", async () => {
    const notification = await store.append(
      createAfterSalesProgressNotification({
        userId,
        orderId: "order_1",
        requestId: "after_sales_1",
        action: "start_review",
        operatorNote: "开始核查用户售后诉求",
        now,
      })
    );
    await store.append(
      createAfterSalesProgressNotification({
        userId: otherUserId,
        orderId: "order_2",
        requestId: "after_sales_2",
        action: "resolve",
        operatorNote: "已完成处理",
        now: "2026-05-18T12:01:00.000Z",
      })
    );

    const payload = await getUserNotificationsPayload(userId, now, store);

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (payload.body.ok) {
      expect(payload.body.data.unreadCount).toBe(1);
      expect(payload.body.data.notifications).toEqual([notification]);
      expect(payload.body.data.privacyNotice).toContain("支付敏感原文");
    }
  });

  it("marks selected notifications as read", async () => {
    const first = await store.append(
      createAfterSalesProgressNotification({
        userId,
        orderId: "order_1",
        requestId: "after_sales_1",
        action: "start_review",
        operatorNote: "开始核查用户售后诉求",
        now,
      })
    );
    const second = await store.append(
      createAfterSalesProgressNotification({
        userId,
        orderId: "order_1",
        requestId: "after_sales_1",
        action: "resolve",
        operatorNote: "已完成处理",
        now: "2026-05-18T12:05:00.000Z",
      })
    );

    const payload = await markUserNotificationsReadPayload(
      userId,
      { notificationIds: [first.id] },
      "2026-05-18T12:10:00.000Z",
      store
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (payload.body.ok) {
      expect(payload.body.data.unreadCount).toBe(1);
      expect(
        payload.body.data.notifications.find(item => item.id === first.id)
      ).toMatchObject({ status: "read" });
      expect(
        payload.body.data.notifications.find(item => item.id === second.id)
      ).toMatchObject({ status: "unread" });
    }
  });

  it("rejects empty mark read requests", async () => {
    const payload = await markUserNotificationsReadPayload(
      userId,
      {},
      now,
      store
    );

    expect(payload.status).toBe(400);
    expect(payload.body.ok).toBe(false);
  });
});
