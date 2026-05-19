import { beforeEach, describe, expect, it } from "vitest";
import {
  CourseAccessStateSchema,
  OrderAfterSalesRequestSchema,
  createSimulatedPaymentSucceededEvent,
  createSimulatedRefundSucceededEvent,
  type Order,
} from "../../../shared/domain";
import {
  createCounselingAppointmentPayload,
  getCounselingAvailabilityPayload,
  resetCounselingAppointmentStore,
  updateCounselingAppointmentPayload,
} from "../counseling/counselingApi";
import {
  getCourseAccessPayload,
  resetCourseAccessStore,
  setCourseAccessStore,
} from "../courses/courseAccessApi";
import { InMemoryCourseAccessStore } from "../courses/courseAccessStore";
import {
  InMemoryOrderAfterSalesStore,
  setOrderAfterSalesStore,
  type OrderAfterSalesStore,
} from "../orders/orderAfterSalesStore";
import {
  InMemoryUserNotificationStore,
  setUserNotificationStore,
  type UserNotificationStore,
} from "../users/userNotificationStore";
import {
  getPaymentReconciliationConsolePayload,
  processPaymentWebhookPayload,
} from "./paymentApi";
import { resetPaymentWebhookEventStore } from "./paymentWebhookEventStore";
import {
  PAYMENT_WEBHOOK_SIGNATURE_HEADER,
  PAYMENT_WEBHOOK_TIMESTAMP_HEADER,
  createPaymentWebhookSignature,
} from "./paymentWebhookSecurity";

const fixedNow = new Date("2026-05-10T00:00:00.000Z");
const courseRefundUserId = "u_course_refund_1";
const membershipRefundUserId = "u_membership_refund_1";
const courseRefundingOrder: Order = {
  id: "order_course_refund_webhook_1",
  userId: courseRefundUserId,
  status: "refunding",
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
  createdAt: "2026-05-10T00:00:00.000Z",
  paidAt: "2026-05-10T00:02:00.000Z",
  entitlementDeliveredAt: "2026-05-10T00:02:00.000Z",
  paymentChannel: "wechat_pay",
};
const membershipRefundingOrder: Order = {
  id: "order_membership_refund_webhook_1",
  userId: membershipRefundUserId,
  status: "refunding",
  items: [
    {
      type: "membership",
      targetId: "course_membership_yearly",
      title: "成长会员",
      unitPrice: 999,
      quantity: 1,
    },
  ],
  subtotal: 999,
  discountAmount: 500,
  payableAmount: 499,
  createdAt: "2026-05-10T00:00:00.000Z",
  paidAt: "2026-05-10T00:02:00.000Z",
  entitlementDeliveredAt: "2026-05-10T00:02:00.000Z",
  paymentChannel: "wechat_pay",
};

let afterSalesStore: OrderAfterSalesStore;
let notificationStore: UserNotificationStore;

async function createPendingCounselingOrder(userId = "user_1") {
  const availability = await getCounselingAvailabilityPayload(
    fixedNow.toISOString()
  );
  if (!availability.ok) throw new Error("expected availability");

  const slot = availability.data.slots[0];
  const created = await createCounselingAppointmentPayload(
    {
      counselorId: slot.counselorId,
      slotId: slot.id,
      channel: slot.channel,
      concernTags: ["emotion"],
      urgency: "this_week",
    },
    userId,
    fixedNow.toISOString()
  );
  if (!created.body.ok) throw new Error("expected created appointment");

  return created.body.data;
}

describe("payment webhook api payloads", () => {
  beforeEach(async () => {
    setCourseAccessStore(new InMemoryCourseAccessStore());
    afterSalesStore = new InMemoryOrderAfterSalesStore();
    notificationStore = new InMemoryUserNotificationStore();
    setOrderAfterSalesStore(afterSalesStore);
    setUserNotificationStore(notificationStore);
    await resetCourseAccessStore();
    await resetCounselingAppointmentStore(fixedNow);
    await resetPaymentWebhookEventStore();
  });

  it("routes simulated payment success to the counseling appointment flow", async () => {
    const created = await createPendingCounselingOrder();
    const event = createSimulatedPaymentSucceededEvent({
      order: created.order,
      now: "2026-05-10T00:10:00.000Z",
    });

    const payload = await processPaymentWebhookPayload(event);

    expect(payload.status).toBe(200);
    if (payload.body.ok) {
      expect(payload.body.data.payment).toMatchObject({
        orderId: created.order.id,
        amount: created.order.payableAmount,
      });
      expect(payload.body.data.appointment.status).toBe("scheduled");
      expect(payload.body.data.order.status).toBe("paid");
    }

    const access = await getCourseAccessPayload("user_1");
    expect(access.ok).toBe(true);
    if (access.ok) {
      expect(access.data.orders[0]?.status).toBe("paid");
    }
  });

  it("rejects payment webhooks with mismatched amounts", async () => {
    const created = await createPendingCounselingOrder();
    const event = {
      ...createSimulatedPaymentSucceededEvent({
        order: created.order,
        now: "2026-05-10T00:10:00.000Z",
      }),
      amount: created.order.payableAmount + 1,
    };

    const payload = await processPaymentWebhookPayload(event);

    expect(payload.status).toBe(409);
    expect(payload.body.ok).toBe(false);

    const access = await getCourseAccessPayload("user_1");
    expect(access.ok).toBe(true);
    if (access.ok) {
      expect(access.data.orders[0]?.status).toBe("pending_payment");
    }
  });

  it("returns the stored result when the same webhook event is retried", async () => {
    const created = await createPendingCounselingOrder();
    const event = createSimulatedPaymentSucceededEvent({
      order: created.order,
      now: "2026-05-10T00:10:00.000Z",
    });

    const first = await processPaymentWebhookPayload(event);
    const second = await processPaymentWebhookPayload(event);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
  });

  it("builds an operator reconciliation view from webhook receipts and business state", async () => {
    const created = await createPendingCounselingOrder();
    const event = createSimulatedPaymentSucceededEvent({
      order: created.order,
      now: "2026-05-10T00:10:00.000Z",
    });
    await processPaymentWebhookPayload(event);

    const forbidden = await getPaymentReconciliationConsolePayload(
      { id: "user_1", roles: ["member"] },
      "2026-05-10T00:11:00.000Z"
    );
    expect(forbidden.status).toBe(403);

    const consolePayload = await getPaymentReconciliationConsolePayload(
      { id: "operator_1", roles: ["operator"] },
      "2026-05-10T00:11:00.000Z"
    );

    expect(consolePayload.status).toBe(200);
    if (consolePayload.body.ok) {
      expect(consolePayload.body.data.summary).toMatchObject({
        receiptCount: 1,
        processedCount: 1,
        okCount: 1,
        criticalCount: 0,
      });
      expect(consolePayload.body.data.entries[0]).toMatchObject({
        severity: "ok",
        webhook: {
          id: event.id,
          orderId: created.order.id,
          status: "processed",
        },
        business: {
          domain: "counseling",
          orderStatus: "paid",
          appointmentStatus: "scheduled",
        },
      });
    }
  });

  it("routes simulated refund success to the counseling refund flow", async () => {
    const created = await createPendingCounselingOrder();
    const appointmentId = created.appointment.id;
    const paymentEvent = createSimulatedPaymentSucceededEvent({
      order: created.order,
      now: "2026-05-10T00:10:00.000Z",
    });
    const paid = await processPaymentWebhookPayload(paymentEvent);
    expect(paid.status).toBe(200);

    const cancelled = await updateCounselingAppointmentPayload(
      appointmentId,
      { action: "cancel" },
      "user_1",
      "2026-05-10T00:20:00.000Z"
    );
    if (!cancelled.body.ok || !cancelled.body.data.order) {
      throw new Error("expected refunding appointment");
    }

    const refundPayload = await processPaymentWebhookPayload(
      createSimulatedRefundSucceededEvent({
        order: cancelled.body.data.order,
        now: "2026-05-10T00:25:00.000Z",
      })
    );

    expect(refundPayload.status).toBe(200);
    if (refundPayload.body.ok) {
      expect(refundPayload.body.data).toMatchObject({
        refund: {
          orderId: created.order.id,
          amount: created.order.payableAmount,
        },
        appointment: {
          status: "refunded",
        },
        order: {
          status: "refunded",
        },
      });
    }

    const access = await getCourseAccessPayload("user_1");
    expect(access.ok).toBe(true);
    if (access.ok) {
      expect(access.data.orders[0]?.status).toBe("refunded");
    }
  });

  it("routes course refund success into order refund and after-sales completion", async () => {
    await resetCourseAccessStore(
      CourseAccessStateSchema.parse({
        ownedCourseIds: [16],
        membership: { status: "none" },
        orders: [courseRefundingOrder],
      }),
      courseRefundUserId
    );
    await afterSalesStore.append(
      OrderAfterSalesRequestSchema.parse({
        id: "after_sales_refund_completion_1",
        orderId: courseRefundingOrder.id,
        userId: courseRefundUserId,
        requestType: "refund_consultation",
        status: "linked_to_refund",
        description: "用户已申请退款，等待支付渠道回调确认完成。",
        contact: "13800139019",
        linkedTransactionId: "evt_payment_course_refundable_1",
        linkedRefundRequestId: "manual_refund_course_1",
        operatorNote: "退款已受理，等待支付渠道完成",
        createdAt: "2026-05-10T00:05:00.000Z",
        updatedAt: "2026-05-10T00:06:00.000Z",
      })
    );

    const refundEvent = createSimulatedRefundSucceededEvent({
      order: courseRefundingOrder,
      channel: "wechat_pay",
      transactionId: "refund_tx_course_1",
      now: "2026-05-10T00:25:00.000Z",
    });
    const refundPayload = await processPaymentWebhookPayload(refundEvent);

    expect(refundPayload.status).toBe(200);
    expect(refundPayload.body.ok).toBe(true);
    if (refundPayload.body.ok) {
      expect(refundPayload.body.data).toMatchObject({
        refund: {
          orderId: courseRefundingOrder.id,
          transactionId: "refund_tx_course_1",
        },
        order: {
          status: "refunded",
        },
      });
    }

    const access = await getCourseAccessPayload(courseRefundUserId);
    expect(access.ok).toBe(true);
    if (access.ok) {
      expect(access.data.orders[0]).toMatchObject({
        id: courseRefundingOrder.id,
        status: "refunded",
      });
      expect(access.data.ownedCourseIds).toEqual([]);
    }

    const completedRequest = await afterSalesStore.getById(
      "after_sales_refund_completion_1"
    );
    expect(completedRequest).toMatchObject({
      status: "resolved",
      operatorNote: "退款已完成，售后工单已自动收尾",
    });

    const auditEvents = await afterSalesStore.listAuditEventsByRequestId(
      "after_sales_refund_completion_1"
    );
    expect(auditEvents[0]).toMatchObject({
      actorId: "system_payment_webhook",
      actorRoles: ["system"],
      action: "resolve",
      before: { status: "linked_to_refund" },
      after: { status: "resolved" },
    });

    const notifications =
      await notificationStore.listByUserId(courseRefundUserId);
    expect(notifications[0]).toMatchObject({
      type: "refund_completed",
      title: "退款已完成",
      resource: {
        orderId: courseRefundingOrder.id,
        requestId: "after_sales_refund_completion_1",
        transactionId: "refund_tx_course_1",
        refundRequestId: "manual_refund_course_1",
      },
    });

    const consolePayload = await getPaymentReconciliationConsolePayload(
      { id: "operator_1", roles: ["operator"] },
      "2026-05-10T00:26:00.000Z"
    );
    expect(consolePayload.status).toBe(200);
    if (consolePayload.body.ok) {
      expect(consolePayload.body.data.entries[0]).toMatchObject({
        severity: "ok",
        business: {
          domain: "course_access",
          orderStatus: "refunded",
        },
      });
    }
  });

  it("expires checkout-sourced membership when membership refund succeeds", async () => {
    await resetCourseAccessStore(
      CourseAccessStateSchema.parse({
        ownedCourseIds: [],
        membership: {
          status: "active",
          planName: "成长会员",
          activatedAt: "2026-05-10T00:02:00.000Z",
          expiresAt: "2027-05-10T00:02:00.000Z",
          sourceType: "checkout_order",
          sourceOrderId: membershipRefundingOrder.id,
          sourceUpdatedAt: "2026-05-10T00:02:00.000Z",
        },
        orders: [membershipRefundingOrder],
      }),
      membershipRefundUserId
    );

    const refundPayload = await processPaymentWebhookPayload(
      createSimulatedRefundSucceededEvent({
        order: membershipRefundingOrder,
        channel: "wechat_pay",
        transactionId: "refund_tx_membership_1",
        now: "2026-05-10T00:25:00.000Z",
      })
    );

    expect(refundPayload.status).toBe(200);
    expect(refundPayload.body.ok).toBe(true);
    if (refundPayload.body.ok) {
      expect(refundPayload.body.data.order).toMatchObject({
        id: membershipRefundingOrder.id,
        status: "refunded",
      });
    }

    const access = await getCourseAccessPayload(membershipRefundUserId);
    expect(access.ok).toBe(true);
    if (access.ok) {
      expect(access.data.orders[0]).toMatchObject({
        id: membershipRefundingOrder.id,
        status: "refunded",
      });
      expect(access.data.membership).toMatchObject({
        status: "expired",
        sourceType: "checkout_order",
        sourceOrderId: membershipRefundingOrder.id,
        sourceUpdatedAt: "2026-05-10T00:25:00.000Z",
        expiresAt: "2026-05-10T00:25:00.000Z",
      });
    }
  });

  it("requires valid signatures when signature verification is enabled", async () => {
    const created = await createPendingCounselingOrder();
    const event = createSimulatedPaymentSucceededEvent({
      order: created.order,
      now: "2026-05-10T00:10:00.000Z",
    });
    const rawBody = JSON.stringify(event);
    const timestamp = "2026-05-10T00:10:10.000Z";
    const secret = "payment_webhook_test_secret";

    const missing = await processPaymentWebhookPayload(event, {
      rawBody,
      secret,
      requireSignature: true,
      now: new Date(timestamp),
    });

    expect(missing.status).toBe(401);

    const signed = await processPaymentWebhookPayload(event, {
      rawBody,
      secret,
      requireSignature: true,
      now: new Date(timestamp),
      headers: {
        [PAYMENT_WEBHOOK_TIMESTAMP_HEADER]: timestamp,
        [PAYMENT_WEBHOOK_SIGNATURE_HEADER]: createPaymentWebhookSignature({
          rawBody,
          secret,
          timestamp,
        }),
      },
    });

    expect(signed.status).toBe(200);
    if (signed.body.ok) {
      expect(signed.body.data.order.status).toBe("paid");
    }
  });

  it("rejects unsupported business order ids", async () => {
    const payload = await processPaymentWebhookPayload({
      id: "evt_1",
      type: "payment.succeeded",
      orderId: "order_course_16",
      channel: "manual",
      amount: 399,
      transactionId: "tx_1",
      occurredAt: "2026-05-10T00:10:00.000Z",
    });

    expect(payload.status).toBe(404);
  });
});
