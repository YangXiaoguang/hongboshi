import { beforeEach, describe, expect, it } from "vitest";
import {
  CourseAccessStateSchema,
  LoginSessionSchema,
  createSimulatedPaymentSucceededEvent,
} from "../../../shared/domain";
import {
  InMemoryAuthSessionStore,
  type AuthSessionStore,
} from "../auth/authSessionStore";
import { setAuthSessionStore } from "../auth/authSessionApi";
import {
  InMemoryCourseAccessStore,
  type CourseAccessStore,
} from "../courses/courseAccessStore";
import { setCourseAccessStore } from "../courses/courseAccessApi";
import {
  InMemoryCounselingAppointmentStore,
  type CounselingAppointmentStore,
} from "../counseling/counselingAppointmentStore";
import { setCounselingAppointmentStore } from "../counseling/counselingApi";
import {
  InMemoryPaymentWebhookEventStore,
  type PaymentWebhookEventStore,
  setPaymentWebhookEventStore,
} from "../payments/paymentWebhookEventStore";
import {
  createOrderAfterSalesRequestPayload,
} from "./orderAfterSalesApi";
import {
  InMemoryOrderAfterSalesStore,
  setOrderAfterSalesStore,
  type OrderAfterSalesStore,
} from "./orderAfterSalesStore";
import {
  getAdminOrderDetailPayload,
  getAdminOrderListPayload,
  updateAdminOrderActionPayload,
} from "./orderAdminApi";

const operator = { id: "operator_1", roles: ["operator" as const] };
const member = { id: "member_1", roles: ["member" as const] };

let authStore: AuthSessionStore;
let courseAccessStore: CourseAccessStore;
let counselingStore: CounselingAppointmentStore;
let paymentStore: PaymentWebhookEventStore;
let afterSalesStore: OrderAfterSalesStore;

beforeEach(() => {
  authStore = new InMemoryAuthSessionStore();
  courseAccessStore = new InMemoryCourseAccessStore();
  counselingStore = new InMemoryCounselingAppointmentStore(
    new Date("2026-05-12T00:00:00.000Z")
  );
  paymentStore = new InMemoryPaymentWebhookEventStore();
  afterSalesStore = new InMemoryOrderAfterSalesStore();

  setAuthSessionStore(authStore);
  setCourseAccessStore(courseAccessStore);
  setCounselingAppointmentStore(counselingStore);
  setPaymentWebhookEventStore(paymentStore);
  setOrderAfterSalesStore(afterSalesStore);
});

describe("order admin api payloads", () => {
  it("requires order read permission", async () => {
    expect((await getAdminOrderListPayload(null, {})).status).toBe(401);
    expect((await getAdminOrderListPayload(member, {})).status).toBe(403);
    expect((await getAdminOrderListPayload(operator, {})).status).toBe(200);
  });

  it("requires order operate permission for admin actions", async () => {
    expect(
      (
        await updateAdminOrderActionPayload(
          null,
          "order_counseling_demo_pending",
          {
            action: "close_pending",
            reason: "用户主动放弃支付",
          },
          "2026-05-12T10:00:00.000Z"
        )
      ).status
    ).toBe(401);
    expect(
      (
        await updateAdminOrderActionPayload(
          member,
          "order_counseling_demo_pending",
          {
            action: "close_pending",
            reason: "用户主动放弃支付",
          },
          "2026-05-12T10:00:00.000Z"
        )
      ).status
    ).toBe(403);
  });

  it("returns development fallback orders", async () => {
    const payload = await getAdminOrderListPayload(
      operator,
      { itemType: "membership" },
      "2026-05-12T10:00:00.000Z"
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (payload.body.ok) {
      expect(payload.body.data.items[0]).toMatchObject({
        id: "order_demo_membership_1",
        status: "paid",
        itemTypes: ["membership"],
      });
      expect(payload.body.data.items[0]?.user.phoneMasked).toContain("****");
    }
  });

  it("closes pending orders through the order state machine and writes audit", async () => {
    const payload = await updateAdminOrderActionPayload(
      operator,
      "order_counseling_demo_pending",
      {
        action: "close_pending",
        reason: "用户主动放弃支付",
      },
      "2026-05-12T10:00:00.000Z"
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (payload.body.ok) {
      expect(payload.body.data.detail.order.status).toBe("closed");
      expect(payload.body.data.auditEvent).toMatchObject({
        action: "close_pending",
        before: { status: "pending_payment" },
        after: { status: "closed" },
      });
      expect(payload.body.data.detail.auditEvents[0]).toMatchObject({
        action: "close_pending",
      });
    }

    const stored = await courseAccessStore.load("u_demo_counseling_pending");
    expect(stored.orders[0]).toMatchObject({
      id: "order_counseling_demo_pending",
      status: "closed",
    });
  });

  it("marks and clears order exceptions with auditable snapshots", async () => {
    const marked = await updateAdminOrderActionPayload(
      operator,
      "order_demo_membership_1",
      {
        action: "mark_exception",
        severity: "critical",
        reason: "支付渠道回调与人工核账不一致",
      },
      "2026-05-12T10:00:00.000Z"
    );

    expect(marked.status).toBe(200);
    expect(marked.body.ok).toBe(true);
    if (marked.body.ok) {
      expect(marked.body.data.detail.order.exception).toMatchObject({
        status: "open",
        severity: "critical",
      });
      expect(marked.body.data.auditEvent.after.exception).toMatchObject({
        status: "open",
      });
    }

    const list = await getAdminOrderListPayload(
      operator,
      { keyword: "order_demo_membership_1" },
      "2026-05-12T10:00:01.000Z"
    );
    expect(list.body.ok).toBe(true);
    if (list.body.ok) {
      expect(list.body.data.items[0]?.exception).toMatchObject({
        severity: "critical",
      });
    }

    const cleared = await updateAdminOrderActionPayload(
      operator,
      "order_demo_membership_1",
      {
        action: "clear_exception",
        reason: "人工核账已确认无异常",
      },
      "2026-05-12T10:05:00.000Z"
    );

    expect(cleared.status).toBe(200);
    expect(cleared.body.ok).toBe(true);
    if (cleared.body.ok) {
      expect(cleared.body.data.detail.order.exception).toBeUndefined();
      expect(cleared.body.data.auditEvent.after.exception).toMatchObject({
        status: "cleared",
      });
      expect(
        cleared.body.data.detail.auditEvents.map(event => event.action)
      ).toEqual(["clear_exception", "mark_exception"]);
    }
  });

  it("rejects closing paid orders from the order admin action endpoint", async () => {
    const payload = await updateAdminOrderActionPayload(
      operator,
      "order_demo_membership_1",
      {
        action: "close_pending",
        reason: "测试关闭已支付订单",
      },
      "2026-05-12T10:00:00.000Z"
    );

    expect(payload.status).toBe(409);
    expect(payload.body.ok).toBe(false);
  });

  it("aggregates real orders with counseling relation and payment receipts", async () => {
    const now = "2026-05-12T10:00:00.000Z";
    const userId = "u_real_order";
    await authStore.saveSession(
      "session_real_order",
      LoginSessionSchema.parse({
        provider: "phone",
        accessTokenExpiresAt: "2026-05-19T10:00:00.000Z",
        user: {
          id: userId,
          displayName: "真实订单用户",
          phoneMasked: "139****8899",
          roles: ["member"],
          isMinor: false,
          createdAt: "2026-05-10T09:00:00.000Z",
          updatedAt: "2026-05-12T09:00:00.000Z",
        },
        consents: [],
      })
    );

    const slot = (await counselingStore.listSlots(new Date(now)))[0];
    if (!slot) throw new Error("missing counseling slot");
    const order = {
      id: "order_counseling_appointment_real_1",
      userId,
      status: "paid" as const,
      items: [
        {
          type: "counseling_session" as const,
          targetId: "appointment_real_1",
          title: "林若安 咨询服务",
          unitPrice: 399,
          quantity: 1,
        },
      ],
      subtotal: 399,
      discountAmount: 0,
      payableAmount: 399,
      createdAt: "2026-05-12T09:20:00.000Z",
      paidAt: "2026-05-12T09:25:00.000Z",
    };
    await courseAccessStore.save(
      userId,
      CourseAccessStateSchema.parse({
        ownedCourseIds: [],
        membership: {
          status: "none",
        },
        orders: [order],
      })
    );
    await counselingStore.saveAppointment({
      id: "appointment_real_1",
      userId,
      counselorId: slot.counselorId,
      slotId: slot.id,
      orderId: order.id,
      channel: slot.channel,
      status: "scheduled",
      concernTags: ["emotion"],
      createdAt: "2026-05-12T09:20:00.000Z",
      updatedAt: "2026-05-12T09:25:00.000Z",
    });
    const event = createSimulatedPaymentSucceededEvent({
      order,
      now: "2026-05-12T09:25:00.000Z",
    });
    await paymentStore.begin(event, "2026-05-12T09:25:01.000Z");
    await paymentStore.markProcessed(
      event.id,
      200,
      { ok: true },
      "2026-05-12T09:25:02.000Z"
    );
    await createOrderAfterSalesRequestPayload(
      order.id,
      {
        requestType: "refund_consultation",
        description: "想确认咨询预约取消后的退款处理流程。",
        contact: "13800139019",
      },
      userId,
      "2026-05-12T09:40:00.000Z",
      afterSalesStore
    );

    const list = await getAdminOrderListPayload(
      operator,
      { itemType: "counseling_session" },
      now
    );
    expect(list.status).toBe(200);
    expect(list.body.ok).toBe(true);
    if (list.body.ok) {
      expect(list.body.data.items[0]).toMatchObject({
        id: order.id,
        status: "paid",
        latestReceiptStatus: "processed",
        relatedObjectStatus: "scheduled",
      });
      expect(list.body.data.summary.paidAmount).toBe(399);
    }

    const detail = await getAdminOrderDetailPayload(operator, order.id, now);
    expect(detail.status).toBe(200);
    expect(detail.body.ok).toBe(true);
    if (detail.body.ok) {
      expect(detail.body.data.paymentReceipts[0]).toMatchObject({
        type: "payment.succeeded",
        status: "processed",
      });
      expect(detail.body.data.relatedObjects[0]).toMatchObject({
        type: "counseling_session",
        status: "scheduled",
      });
      expect(detail.body.data.timeline.map(event => event.type)).toContain(
        "payment_succeeded"
      );
      expect(detail.body.data.afterSalesRequests[0]).toMatchObject({
        requestType: "refund_consultation",
        contactMasked: "138****9019",
      });
      expect(detail.body.data.timeline.map(event => event.type)).toContain(
        "after_sales_request"
      );
    }
  });
});
