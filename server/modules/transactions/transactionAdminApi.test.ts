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
  updateAdminTransactionActionPayload,
} from "./transactionAdminApi";
import {
  InMemoryTransactionOperationStore,
  setTransactionOperationStore,
  type TransactionOperationStore,
} from "./transactionOperationStore";
import type { TransactionRefundProvider } from "./transactionRefundProvider";

const operator = { id: "operator_1", roles: ["operator" as const] };
const member = { id: "member_1", roles: ["member" as const] };
const now = "2026-05-12T10:00:00.000Z";

let authStore: AuthSessionStore;
let courseAccessStore: CourseAccessStore;
let counselingStore: CounselingAppointmentStore;
let paymentStore: PaymentWebhookEventStore;
let transactionOperationStore: TransactionOperationStore;

beforeEach(() => {
  authStore = new InMemoryAuthSessionStore();
  courseAccessStore = new InMemoryCourseAccessStore();
  counselingStore = new InMemoryCounselingAppointmentStore(new Date(now));
  paymentStore = new InMemoryPaymentWebhookEventStore();
  transactionOperationStore = new InMemoryTransactionOperationStore();

  setAuthSessionStore(authStore);
  setCourseAccessStore(courseAccessStore);
  setCounselingAppointmentStore(counselingStore);
  setPaymentWebhookEventStore(paymentStore);
  setTransactionOperationStore(transactionOperationStore);
});

describe("transaction admin api payloads", () => {
  it("requires transaction read permission", async () => {
    expect((await getAdminTransactionListPayload(null, {})).status).toBe(401);
    expect((await getAdminTransactionListPayload(member, {})).status).toBe(403);
    expect((await getAdminTransactionListPayload(operator, {})).status).toBe(
      200
    );
  });

  it("requires transaction operate permission for admin actions", async () => {
    expect(
      (
        await updateAdminTransactionActionPayload(
          null,
          "evt_payment_order_demo_membership_1",
          {
            action: "request_refund",
            reason: "用户提交退款申请",
          },
          now
        )
      ).status
    ).toBe(401);
    expect(
      (
        await updateAdminTransactionActionPayload(
          member,
          "evt_payment_order_demo_membership_1",
          {
            action: "request_refund",
            reason: "用户提交退款申请",
          },
          now
        )
      ).status
    ).toBe(403);
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

  it("requests refunds through the order state machine and writes transaction audit", async () => {
    const payload = await updateAdminTransactionActionPayload(
      operator,
      "evt_payment_order_demo_membership_1",
      {
        action: "request_refund",
        reason: "用户提交退款申请并确认权益回收",
      },
      "2026-05-12T10:00:00.000Z"
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (payload.body.ok) {
      expect(payload.body.data.detail.relatedOrder).toMatchObject({
        id: "order_demo_membership_1",
        status: "refunding",
      });
      expect(payload.body.data.auditEvent).toMatchObject({
        action: "request_refund",
        before: { orderStatus: "paid" },
        after: { orderStatus: "refunding" },
        refundProviderResult: {
          provider: "manual",
          status: "accepted",
        },
      });
      expect(payload.body.data.auditEvents[0]).toMatchObject({
        action: "request_refund",
        refundProviderResult: {
          status: "accepted",
        },
      });
    }

    const stored = await courseAccessStore.load("u_demo_active_member");
    expect(stored.orders[0]).toMatchObject({
      id: "order_demo_membership_1",
      status: "refunding",
    });
  });

  it("keeps orders paid when the refund provider rejects acceptance", async () => {
    const rejectingRefundProvider: TransactionRefundProvider = {
      providerName: "manual",
      requestRefund: request => ({
        provider: "manual",
        status: "rejected",
        message: "退款渠道拒绝受理：缺少财务复核单号",
        handledAt: request.requestedAt,
        retryable: false,
      }),
    };

    const payload = await updateAdminTransactionActionPayload(
      operator,
      "evt_payment_order_demo_membership_1",
      {
        action: "request_refund",
        reason: "用户提交退款申请并确认权益回收",
      },
      "2026-05-12T10:00:00.000Z",
      paymentStore,
      transactionOperationStore,
      rejectingRefundProvider
    );

    expect(payload.status).toBe(409);
    expect(payload.body.ok).toBe(false);
    if (!payload.body.ok) {
      expect(payload.body.error.message).toBe(
        "退款渠道拒绝受理：缺少财务复核单号"
      );
    }

    const detail = await getAdminTransactionDetailPayload(
      operator,
      "evt_payment_order_demo_membership_1",
      now,
      paymentStore,
      transactionOperationStore
    );

    expect(detail.status).toBe(200);
    expect(detail.body.ok).toBe(true);
    if (detail.body.ok) {
      expect(detail.body.data.relatedOrder).toMatchObject({
        id: "order_demo_membership_1",
        status: "paid",
      });
      expect(detail.body.data.auditEvents[0]).toMatchObject({
        action: "request_refund",
        before: { orderStatus: "paid" },
        after: { orderStatus: "paid" },
        refundProviderResult: {
          provider: "manual",
          status: "rejected",
          message: "退款渠道拒绝受理：缺少财务复核单号",
        },
      });
    }

    const stored = await courseAccessStore.load("u_demo_active_member");
    expect(stored.orders).toEqual([]);
  });

  it("rejects refund requests for unsafe transaction states", async () => {
    const failed = await updateAdminTransactionActionPayload(
      operator,
      "evt_payment_order_demo_course_3_failed",
      {
        action: "request_refund",
        reason: "测试失败流水申请退款",
      },
      now
    );
    expect(failed.status).toBe(409);

    const processing = await updateAdminTransactionActionPayload(
      operator,
      "evt_payment_order_counseling_demo_pending",
      {
        action: "request_refund",
        reason: "测试处理中流水申请退款",
      },
      now
    );
    expect(processing.status).toBe(409);

    const refundFlow = await updateAdminTransactionActionPayload(
      operator,
      "evt_refund_order_demo_refund_course_2",
      {
        action: "request_refund",
        reason: "测试退款流水重复申请",
      },
      now
    );
    expect(refundFlow.status).toBe(409);

    const userId = "u_mismatch_transaction";
    const order: Order = {
      id: "order_mismatch_payment_1",
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
      discountAmount: 0,
      payableAmount: 199,
      createdAt: "2026-05-12T09:00:00.000Z",
      paidAt: "2026-05-12T09:02:00.000Z",
    };
    await courseAccessStore.save(
      userId,
      CourseAccessStateSchema.parse({
        ownedCourseIds: [3],
        membership: { status: "none" },
        orders: [order],
      })
    );
    const mismatchEvent = {
      ...createSimulatedPaymentSucceededEvent({
        order,
        channel: "manual",
        now: "2026-05-12T09:02:00.000Z",
      }),
      amount: 188,
    };
    await paymentStore.begin(mismatchEvent, "2026-05-12T09:02:01.000Z");
    await paymentStore.markProcessed(
      mismatchEvent.id,
      200,
      { ok: true },
      "2026-05-12T09:02:02.000Z"
    );

    const mismatch = await updateAdminTransactionActionPayload(
      operator,
      mismatchEvent.id,
      {
        action: "request_refund",
        reason: "测试金额不一致流水申请退款",
      },
      now
    );
    expect(mismatch.status).toBe(409);
  });

  it("marks and resolves transaction exception work orders with audit", async () => {
    const marked = await updateAdminTransactionActionPayload(
      operator,
      "evt_payment_order_demo_course_3_failed",
      {
        action: "mark_exception",
        severity: "critical",
        reason: "课程回调失败后需要人工核查权益发放",
      },
      "2026-05-12T10:00:00.000Z"
    );

    expect(marked.status).toBe(200);
    expect(marked.body.ok).toBe(true);
    if (marked.body.ok) {
      expect(marked.body.data.detail.transaction.workOrder).toMatchObject({
        status: "open",
        severity: "critical",
      });
      expect(marked.body.data.detail.transaction.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "transaction_work_order_open" }),
        ])
      );
      expect(marked.body.data.auditEvent.after.workOrder).toMatchObject({
        status: "open",
      });
    }

    const resolved = await updateAdminTransactionActionPayload(
      operator,
      "evt_payment_order_demo_course_3_failed",
      {
        action: "resolve_exception",
        reason: "人工复核后确认权益已补发完成",
      },
      "2026-05-12T10:05:00.000Z"
    );

    expect(resolved.status).toBe(200);
    expect(resolved.body.ok).toBe(true);
    if (resolved.body.ok) {
      expect(resolved.body.data.detail.transaction.workOrder).toMatchObject({
        status: "resolved",
        resolution: "人工复核后确认权益已补发完成",
      });
      expect(
        resolved.body.data.detail.auditEvents.map(event => event.action)
      ).toEqual(["resolve_exception", "mark_exception"]);
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
