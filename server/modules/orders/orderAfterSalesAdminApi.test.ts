import { beforeEach, describe, expect, it } from "vitest";
import {
  CourseAccessStateSchema,
  createSimulatedPaymentSucceededEvent,
  type Order,
} from "../../../shared/domain";
import {
  InMemoryCourseAccessStore,
  type CourseAccessStore,
} from "../courses/courseAccessStore";
import { setCourseAccessStore } from "../courses/courseAccessApi";
import {
  InMemoryPaymentWebhookEventStore,
  setPaymentWebhookEventStore,
  type PaymentWebhookEventStore,
} from "../payments/paymentWebhookEventStore";
import {
  InMemoryTransactionOperationStore,
  setTransactionOperationStore,
  type TransactionOperationStore,
} from "../transactions/transactionOperationStore";
import type { TransactionRefundProvider } from "../transactions/transactionRefundProvider";
import { getAdminTransactionDetailPayload } from "../transactions/transactionAdminApi";
import {
  InMemoryUserNotificationStore,
  setUserNotificationStore,
  type UserNotificationStore,
} from "../users/userNotificationStore";
import { createOrderAfterSalesRequestPayload } from "./orderAfterSalesApi";
import {
  InMemoryOrderAfterSalesStore,
  setOrderAfterSalesStore,
  type OrderAfterSalesStore,
} from "./orderAfterSalesStore";
import { updateOrderAfterSalesAdminActionPayload } from "./orderAfterSalesAdminApi";

const operator = { id: "operator_1", roles: ["operator" as const] };
const member = { id: "member_1", roles: ["member" as const] };
const now = "2026-05-18T10:00:00.000Z";
const userId = "u_after_sales_admin_1";
const paidOrder: Order = {
  id: "order_after_sales_admin_1",
  userId,
  status: "paid",
  items: [
    {
      type: "course",
      targetId: "16",
      title: "情绪急救手册",
      unitPrice: 149,
      quantity: 1,
    },
  ],
  subtotal: 149,
  discountAmount: 20,
  payableAmount: 129,
  createdAt: "2026-05-18T09:00:00.000Z",
  paidAt: "2026-05-18T09:02:00.000Z",
  entitlementDeliveredAt: "2026-05-18T09:02:00.000Z",
};

let courseAccessStore: CourseAccessStore;
let afterSalesStore: OrderAfterSalesStore;
let paymentStore: PaymentWebhookEventStore;
let transactionOperationStore: TransactionOperationStore;
let notificationStore: UserNotificationStore;

beforeEach(async () => {
  courseAccessStore = new InMemoryCourseAccessStore();
  afterSalesStore = new InMemoryOrderAfterSalesStore();
  paymentStore = new InMemoryPaymentWebhookEventStore();
  transactionOperationStore = new InMemoryTransactionOperationStore();
  notificationStore = new InMemoryUserNotificationStore();

  setCourseAccessStore(courseAccessStore);
  setOrderAfterSalesStore(afterSalesStore);
  setPaymentWebhookEventStore(paymentStore);
  setTransactionOperationStore(transactionOperationStore);
  setUserNotificationStore(notificationStore);

  await courseAccessStore.save(
    userId,
    CourseAccessStateSchema.parse({
      ownedCourseIds: [16],
      membership: { status: "none" },
      orders: [paidOrder],
    })
  );
});

async function createAfterSalesRequest() {
  const payload = await createOrderAfterSalesRequestPayload(
    paidOrder.id,
    {
      requestType: "refund_consultation",
      description: "课程权益异常，用户希望客服协助退款处理。",
      contact: "13800139019",
    },
    userId,
    now,
    afterSalesStore
  );

  expect(payload.status).toBe(200);
  expect(payload.body.ok).toBe(true);
  if (!payload.body.ok) throw new Error("expected after-sales request");
  return payload.body.data.request;
}

describe("order after-sales admin api payloads", () => {
  it("requires order operate permission for handling after-sales requests", async () => {
    const request = await createAfterSalesRequest();

    expect(
      (
        await updateOrderAfterSalesAdminActionPayload(
          null,
          request.id,
          {
            action: "start_review",
            reason: "开始核查用户售后诉求",
          },
          now,
          afterSalesStore
        )
      ).status
    ).toBe(401);
    expect(
      (
        await updateOrderAfterSalesAdminActionPayload(
          member,
          request.id,
          {
            action: "start_review",
            reason: "开始核查用户售后诉求",
          },
          now,
          afterSalesStore
        )
      ).status
    ).toBe(403);
  });

  it("moves after-sales requests through review and resolution with audit", async () => {
    const request = await createAfterSalesRequest();

    const reviewing = await updateOrderAfterSalesAdminActionPayload(
      operator,
      request.id,
      {
        action: "start_review",
        reason: "已认领售后申请并开始核查权益记录",
      },
      "2026-05-18T10:03:00.000Z",
      afterSalesStore
    );

    expect(reviewing.status).toBe(200);
    expect(reviewing.body.ok).toBe(true);
    if (!reviewing.body.ok) throw new Error("expected reviewing payload");
    expect(reviewing.body.data.summary).toMatchObject({
      id: request.id,
      status: "reviewing",
      operatorNote: "已认领售后申请并开始核查权益记录",
    });
    expect(reviewing.body.data.auditEvent).toMatchObject({
      action: "start_review",
      before: { status: "submitted" },
      after: { status: "reviewing" },
    });

    const resolved = await updateOrderAfterSalesAdminActionPayload(
      operator,
      request.id,
      {
        action: "resolve",
        reason: "已补发课程权益并通知用户继续学习",
      },
      "2026-05-18T10:08:00.000Z",
      afterSalesStore
    );

    expect(resolved.status).toBe(200);
    expect(resolved.body.ok).toBe(true);
    if (resolved.body.ok) {
      expect(resolved.body.data.summary.status).toBe("resolved");
      expect(resolved.body.data.auditEvents.map(event => event.action)).toEqual([
        "resolve",
        "start_review",
      ]);
    }

    const notifications = await notificationStore.listByUserId(userId);
    expect(notifications.map(notification => notification.type)).toEqual([
      "after_sales_resolved",
      "after_sales_reviewing",
    ]);
    expect(notifications[0]).toMatchObject({
      title: "售后申请已解决",
      resource: {
        orderId: paidOrder.id,
        orderTitle: "情绪急救手册",
        requestId: request.id,
      },
    });
  });

  it("links after-sales requests to refund acceptance without direct refund completion", async () => {
    const request = await createAfterSalesRequest();
    const paymentEvent = createSimulatedPaymentSucceededEvent({
      order: paidOrder,
      channel: "wechat_pay",
      now: "2026-05-18T09:02:00.000Z",
    });
    await paymentStore.begin(paymentEvent, "2026-05-18T09:02:01.000Z");
    await paymentStore.markProcessed(
      paymentEvent.id,
      200,
      { ok: true },
      "2026-05-18T09:02:02.000Z"
    );

    const provider: TransactionRefundProvider = {
      providerName: "manual",
      requestRefund: refundRequest => ({
        provider: "manual",
        status: "accepted",
        requestId: `manual_refund_${refundRequest.orderId}`,
        message: "人工退款通道已受理申请，等待退款成功回调完成。",
        handledAt: refundRequest.requestedAt,
        retryable: false,
      }),
    };

    const linked = await updateOrderAfterSalesAdminActionPayload(
      operator,
      request.id,
      {
        action: "link_refund",
        transactionId: paymentEvent.id,
        reason: "用户申请退款，已核实课程权益可回收",
      },
      "2026-05-18T10:10:00.000Z",
      afterSalesStore,
      paymentStore,
      transactionOperationStore,
      provider,
      notificationStore
    );

    expect(linked.status).toBe(200);
    expect(linked.body.ok).toBe(true);
    if (!linked.body.ok) throw new Error("expected linked refund payload");
    expect(linked.body.data.summary).toMatchObject({
      status: "linked_to_refund",
      linkedTransactionId: paymentEvent.id,
      linkedRefundRequestId: `manual_refund_${paidOrder.id}`,
    });
    expect(linked.body.data.auditEvent).toMatchObject({
      action: "link_refund",
      before: { status: "submitted" },
      after: {
        status: "linked_to_refund",
        linkedTransactionId: paymentEvent.id,
      },
    });

    const state = await courseAccessStore.load(userId);
    expect(state.orders[0]).toMatchObject({
      id: paidOrder.id,
      status: "refunding",
    });

    const detail = await getAdminTransactionDetailPayload(
      operator,
      paymentEvent.id,
      "2026-05-18T10:11:00.000Z",
      paymentStore,
      transactionOperationStore
    );
    expect(detail.status).toBe(200);
    expect(detail.body.ok).toBe(true);
    if (detail.body.ok) {
      expect(detail.body.data.relatedOrder?.status).toBe("refunding");
      expect(detail.body.data.auditEvents[0]).toMatchObject({
        action: "request_refund",
        refundProviderResult: {
          status: "accepted",
          requestId: `manual_refund_${paidOrder.id}`,
        },
      });
      expect(detail.body.data.afterSalesRequests[0]).toMatchObject({
        status: "linked_to_refund",
      });
    }

    const notifications = await notificationStore.listByUserId(userId);
    expect(notifications[0]).toMatchObject({
      type: "refund_request_accepted",
      title: "退款申请已受理",
      resource: {
        orderId: paidOrder.id,
        refundRequestId: `manual_refund_${paidOrder.id}`,
      },
    });
  });

  it("keeps after-sales requests open when refund acceptance fails", async () => {
    const request = await createAfterSalesRequest();
    const paymentEvent = createSimulatedPaymentSucceededEvent({
      order: paidOrder,
      channel: "manual",
      now: "2026-05-18T09:02:00.000Z",
    });
    await paymentStore.begin(paymentEvent, "2026-05-18T09:02:01.000Z");
    await paymentStore.markProcessed(
      paymentEvent.id,
      200,
      { ok: true },
      "2026-05-18T09:02:02.000Z"
    );

    const rejectingProvider: TransactionRefundProvider = {
      providerName: "manual",
      requestRefund: refundRequest => ({
        provider: "manual",
        status: "rejected",
        message: "退款渠道拒绝受理：需要财务复核",
        handledAt: refundRequest.requestedAt,
        retryable: false,
      }),
    };

    const failed = await updateOrderAfterSalesAdminActionPayload(
      operator,
      request.id,
      {
        action: "link_refund",
        transactionId: paymentEvent.id,
        reason: "用户申请退款，准备转入退款受理",
      },
      "2026-05-18T10:10:00.000Z",
      afterSalesStore,
      paymentStore,
      transactionOperationStore,
      rejectingProvider,
      notificationStore
    );

    expect(failed.status).toBe(409);
    const stored = await afterSalesStore.getById(request.id);
    expect(stored?.status).toBe("submitted");
    expect(stored?.linkedTransactionId).toBeUndefined();

    const state = await courseAccessStore.load(userId);
    expect(state.orders[0]?.status).toBe("paid");

    const notifications = await notificationStore.listByUserId(userId);
    expect(notifications[0]).toMatchObject({
      type: "refund_request_rejected",
      title: "退款申请暂未受理",
      resource: {
        orderId: paidOrder.id,
        transactionId: paymentEvent.id,
      },
    });
    expect(notifications[0]?.content).toContain("需要财务复核");
  });
});
