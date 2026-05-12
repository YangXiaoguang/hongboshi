import { beforeEach, describe, expect, it } from "vitest";
import {
  CourseAccessStateSchema,
  LoginSessionSchema,
  createSimulatedPaymentSucceededEvent,
  createSimulatedRefundSucceededEvent,
  type Order,
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
  getAdminTransactionDetailPayload,
  getAdminTransactionListPayload,
} from "./transactionAdminApi";

const operator = { id: "operator_1", roles: ["operator" as const] };
const member = { id: "member_1", roles: ["member" as const] };
const now = "2026-05-12T10:00:00.000Z";

let authStore: AuthSessionStore;
let courseAccessStore: CourseAccessStore;
let counselingStore: CounselingAppointmentStore;
let paymentStore: PaymentWebhookEventStore;

beforeEach(() => {
  authStore = new InMemoryAuthSessionStore();
  courseAccessStore = new InMemoryCourseAccessStore();
  counselingStore = new InMemoryCounselingAppointmentStore(new Date(now));
  paymentStore = new InMemoryPaymentWebhookEventStore();

  setAuthSessionStore(authStore);
  setCourseAccessStore(courseAccessStore);
  setCounselingAppointmentStore(counselingStore);
  setPaymentWebhookEventStore(paymentStore);
});

describe("transaction admin api payloads", () => {
  it("requires transaction read permission", async () => {
    expect((await getAdminTransactionListPayload(null, {})).status).toBe(401);
    expect((await getAdminTransactionListPayload(member, {})).status).toBe(403);
    expect((await getAdminTransactionListPayload(operator, {})).status).toBe(
      200
    );
  });

  it("returns development fallback transactions across statuses and flow types", async () => {
    const payload = await getAdminTransactionListPayload(
      operator,
      {},
      "2026-05-12T10:00:00.000Z"
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (payload.body.ok) {
      expect(payload.body.data.summary).toMatchObject({
        totalCount: 4,
        paymentCount: 3,
        refundCount: 1,
        failedCount: 1,
        processingCount: 1,
      });
      expect(payload.body.data.items.map(item => item.status)).toEqual(
        expect.arrayContaining(["processed", "failed", "processing"])
      );
      expect(payload.body.data.items.map(item => item.type)).toEqual(
        expect.arrayContaining(["payment", "refund"])
      );
    }
  });

  it("filters fallback transactions and returns detail context", async () => {
    const list = await getAdminTransactionListPayload(
      operator,
      { type: "refund", status: "processed" },
      now
    );

    expect(list.status).toBe(200);
    expect(list.body.ok).toBe(true);
    if (!list.body.ok) throw new Error("expected list payload");

    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.items[0]).toMatchObject({
      id: "evt_refund_order_demo_refund_course_2",
      type: "refund",
      relatedOrder: {
        status: "refunded",
        itemTypes: ["course"],
      },
    });

    const detail = await getAdminTransactionDetailPayload(
      operator,
      list.body.data.items[0].id,
      now
    );
    expect(detail.status).toBe(200);
    expect(detail.body.ok).toBe(true);
    if (detail.body.ok) {
      expect(detail.body.data.businessObjects[0]).toMatchObject({
        type: "course",
        status: "已退款",
      });
      expect(detail.body.data.timeline.map(event => event.type)).toContain(
        "business_status"
      );
    }
  });

  it("aggregates stored payment, refund, failed receipts, and order exceptions", async () => {
    const userId = "u_real_transaction";
    await authStore.saveSession(
      "session_real_transaction",
      LoginSessionSchema.parse({
        provider: "phone",
        accessTokenExpiresAt: "2026-05-19T10:00:00.000Z",
        user: {
          id: userId,
          displayName: "真实交易用户",
          phoneMasked: "139****8899",
          roles: ["member"],
          isMinor: false,
          createdAt: "2026-05-10T09:00:00.000Z",
          updatedAt: "2026-05-12T09:00:00.000Z",
        },
        consents: [],
      })
    );

    const paidOrder: Order = {
      id: "order_course_real_payment_1",
      userId,
      status: "paid",
      items: [
        {
          type: "course",
          targetId: "3",
          title: "亲密关系沟通课",
          unitPrice: 199,
          quantity: 1,
        },
      ],
      subtotal: 199,
      discountAmount: 20,
      payableAmount: 179,
      createdAt: "2026-05-12T09:00:00.000Z",
      paidAt: "2026-05-12T09:02:00.000Z",
    };
    const refundedOrder: Order = {
      ...paidOrder,
      id: "order_course_real_refund_1",
      status: "refunded",
      payableAmount: 199,
      subtotal: 199,
      discountAmount: 0,
      paidAt: "2026-05-12T08:02:00.000Z",
    };
    await courseAccessStore.save(
      userId,
      CourseAccessStateSchema.parse({
        ownedCourseIds: [3],
        membership: {
          status: "none",
        },
        orders: [paidOrder, refundedOrder],
      })
    );
    await courseAccessStore.saveOrderAdminExceptionFlag({
      orderId: paidOrder.id,
      status: "open",
      severity: "warning",
      reason: "渠道回调失败后已人工发放课程，需要复核",
      markedBy: operator.id,
      markedAt: now,
    });

    const paymentEvent = createSimulatedPaymentSucceededEvent({
      order: paidOrder,
      channel: "wechat_pay",
      now: "2026-05-12T09:02:00.000Z",
    });
    await paymentStore.begin(paymentEvent, "2026-05-12T09:02:01.000Z");
    await paymentStore.markProcessed(
      paymentEvent.id,
      200,
      { ok: true },
      "2026-05-12T09:02:02.000Z"
    );

    const refundEvent = createSimulatedRefundSucceededEvent({
      order: refundedOrder,
      channel: "alipay",
      now: "2026-05-12T09:30:00.000Z",
    });
    await paymentStore.begin(refundEvent, "2026-05-12T09:30:01.000Z");
    await paymentStore.markProcessed(
      refundEvent.id,
      200,
      { ok: true },
      "2026-05-12T09:30:02.000Z"
    );

    const failedEvent = createSimulatedPaymentSucceededEvent({
      order: paidOrder,
      channel: "manual",
      transactionId: "manual_failed_real_1",
      now: "2026-05-12T09:45:00.000Z",
    });
    await paymentStore.begin(failedEvent, "2026-05-12T09:45:01.000Z");
    await paymentStore.markFailed(
      failedEvent.id,
      500,
      { ok: false },
      "人工回调处理失败",
      "2026-05-12T09:45:02.000Z"
    );

    const list = await getAdminTransactionListPayload(
      operator,
      { keyword: "真实交易用户" },
      now
    );

    expect(list.status).toBe(200);
    expect(list.body.ok).toBe(true);
    if (list.body.ok) {
      expect(list.body.data.items).toHaveLength(3);
      expect(list.body.data.summary).toMatchObject({
        totalCount: 3,
        paymentCount: 2,
        refundCount: 1,
        failedCount: 1,
      });
      expect(
        list.body.data.items.find(item => item.id === failedEvent.id)
      ).toMatchObject({
        severity: "critical",
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "webhook_failed" }),
          expect.objectContaining({ code: "order_exception_open" }),
        ]),
      });
    }
  });
});
