import { describe, expect, it } from "vitest";
import {
  UserNotificationListResultSchema,
  createAfterSalesProgressNotification,
  createAfterSalesRefundRejectedNotification,
} from "./userNotification";

describe("userNotification domain", () => {
  it("creates after-sales progress notifications without sensitive payloads", () => {
    const notification = createAfterSalesProgressNotification({
      userId: "u_phone_9019",
      orderId: "order_1",
      requestId: "after_sales_1",
      orderTitle: "情绪急救手册",
      action: "link_refund",
      operatorNote: "已核实退款条件",
      linkedTransactionId: "pay_1",
      linkedRefundRequestId: "refund_1",
      now: "2026-05-18T12:00:00.000Z",
    });

    expect(notification).toMatchObject({
      userId: "u_phone_9019",
      type: "refund_request_accepted",
      status: "unread",
      priority: "important",
      title: "退款申请已受理",
      resource: {
        kind: "order_after_sales",
        orderId: "order_1",
        requestId: "after_sales_1",
        orderTitle: "情绪急救手册",
        transactionId: "pay_1",
        refundRequestId: "refund_1",
      },
    });
    expect(notification.content).toContain("退款完成仍以支付回调为准");
  });

  it("creates refund rejection notifications for manual follow-up", () => {
    const notification = createAfterSalesRefundRejectedNotification({
      userId: "u_phone_9019",
      orderId: "order_1",
      requestId: "after_sales_1",
      transactionId: "pay_1",
      operatorNote: "准备转入退款受理",
      rejectionMessage: "退款渠道拒绝受理：需要财务复核",
      now: "2026-05-18T12:02:00.000Z",
    });

    expect(notification).toMatchObject({
      type: "refund_request_rejected",
      title: "退款申请暂未受理",
      priority: "important",
      resource: {
        orderId: "order_1",
        requestId: "after_sales_1",
        transactionId: "pay_1",
      },
    });
    expect(notification.content).toContain("需要财务复核");
  });

  it("validates list result summaries", () => {
    const generatedAt = "2026-05-18T12:05:00.000Z";
    const notification = createAfterSalesProgressNotification({
      userId: "u_phone_9019",
      orderId: "order_1",
      requestId: "after_sales_1",
      action: "start_review",
      operatorNote: "开始核查",
      now: generatedAt,
    });

    expect(
      UserNotificationListResultSchema.parse({
        notifications: [notification],
        unreadCount: 1,
        privacyNotice: "仅展示站内消息摘要。",
        generatedAt,
      })
    ).toMatchObject({
      unreadCount: 1,
      notifications: [{ type: "after_sales_reviewing" }],
    });
  });
});
