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
  InMemoryPaymentWebhookEventStore,
  type PaymentWebhookEventStore,
  setPaymentWebhookEventStore,
} from "../payments/paymentWebhookEventStore";
import {
  InMemoryTransactionOperationStore,
  setTransactionOperationStore,
  type TransactionOperationStore,
} from "../transactions/transactionOperationStore";
import {
  getFinanceAdminExportPayload,
  getFinanceAdminOverviewPayload,
} from "./financeAdminApi";

const operator = { id: "operator_1", roles: ["operator" as const] };
const member = { id: "member_1", roles: ["member" as const] };
const now = "2026-05-12T10:00:00.000Z";

let authStore: AuthSessionStore;
let courseAccessStore: CourseAccessStore;
let paymentStore: PaymentWebhookEventStore;
let transactionOperationStore: TransactionOperationStore;

beforeEach(() => {
  authStore = new InMemoryAuthSessionStore();
  courseAccessStore = new InMemoryCourseAccessStore();
  paymentStore = new InMemoryPaymentWebhookEventStore();
  transactionOperationStore = new InMemoryTransactionOperationStore();

  setAuthSessionStore(authStore);
  setCourseAccessStore(courseAccessStore);
  setPaymentWebhookEventStore(paymentStore);
  setTransactionOperationStore(transactionOperationStore);
});

function order({
  id,
  status,
  amount,
  title,
  type = "course",
}: {
  id: string;
  status: Order["status"];
  amount: number;
  title: string;
  type?: Order["items"][number]["type"];
}): Order {
  return {
    id,
    userId: "finance_user_1",
    status,
    items: [
      {
        type,
        targetId: `${type}_1`,
        title,
        unitPrice: amount,
        quantity: 1,
      },
    ],
    subtotal: amount,
    discountAmount: 0,
    payableAmount: amount,
    createdAt: "2026-05-12T09:00:00.000Z",
    paidAt:
      status === "paid" || status === "refunded" || status === "refunding"
        ? "2026-05-12T09:01:00.000Z"
        : undefined,
  };
}

describe("finance admin api payloads", () => {
  it("requires finance read permission", async () => {
    expect((await getFinanceAdminOverviewPayload(null, {})).status).toBe(401);
    expect((await getFinanceAdminOverviewPayload(member, {})).status).toBe(403);
    expect(
      (await getFinanceAdminOverviewPayload(operator, {}, now)).status
    ).toBe(200);
  });

  it("aggregates processed payments, refunds, pending refunds and exceptions", async () => {
    await authStore.saveSession(
      "session_finance_user",
      LoginSessionSchema.parse({
        provider: "phone",
        accessTokenExpiresAt: "2026-05-19T10:00:00.000Z",
        user: {
          id: "finance_user_1",
          displayName: "财务测试用户",
          phoneMasked: "138****2049",
          roles: ["member"],
          isMinor: false,
          createdAt: "2026-05-10T09:00:00.000Z",
          updatedAt: "2026-05-12T09:00:00.000Z",
        },
        consents: [],
      })
    );

    const paidOrder = order({
      id: "order_finance_paid",
      status: "paid",
      amount: 399,
      title: "成长会员年卡",
      type: "membership",
    });
    const refundedOrder = order({
      id: "order_finance_refunded",
      status: "refunded",
      amount: 299,
      title: "睡眠修复训练营",
    });
    const refundingOrder = order({
      id: "order_finance_refunding",
      status: "refunding",
      amount: 199,
      title: "亲密关系沟通课",
    });
    await courseAccessStore.save(
      "finance_user_1",
      CourseAccessStateSchema.parse({
        ownedCourseIds: [1, 2],
        membership: { status: "active", planName: "成长会员" },
        orders: [paidOrder, refundedOrder, refundingOrder],
      })
    );

    const paidEvent = createSimulatedPaymentSucceededEvent({
      order: paidOrder,
      now: "2026-05-12T09:02:00.000Z",
    });
    await paymentStore.begin(paidEvent, "2026-05-12T09:02:01.000Z");
    await paymentStore.markProcessed(
      paidEvent.id,
      200,
      { ok: true },
      "2026-05-12T09:02:02.000Z"
    );

    const refundEvent = createSimulatedRefundSucceededEvent({
      order: refundedOrder,
      now: "2026-05-12T09:03:00.000Z",
    });
    await paymentStore.begin(refundEvent, "2026-05-12T09:03:01.000Z");
    await paymentStore.markProcessed(
      refundEvent.id,
      200,
      { ok: true },
      "2026-05-12T09:03:02.000Z"
    );

    const failedOrder = order({
      id: "order_finance_failed",
      status: "paid",
      amount: 88,
      title: "失败流水课程",
    });
    const failedEvent = createSimulatedPaymentSucceededEvent({
      order: failedOrder,
      now: "2026-05-12T09:04:00.000Z",
    });
    await paymentStore.begin(failedEvent, "2026-05-12T09:04:01.000Z");
    await paymentStore.markFailed(
      failedEvent.id,
      500,
      { ok: false },
      "测试失败回调",
      "2026-05-12T09:04:02.000Z"
    );

    const payload = await getFinanceAdminOverviewPayload(
      operator,
      {},
      now,
      paymentStore,
      transactionOperationStore
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (!payload.body.ok) throw new Error("expected finance payload");

    expect(payload.body.data.summary).toMatchObject({
      paymentCount: 1,
      refundCount: 1,
      pendingRefundCount: 1,
      exceptionCount: 1,
      grossRevenueAmount: 399,
      refundAmount: 299,
      netRevenueAmount: 100,
      pendingRefundAmount: 199,
      exceptionAmount: 88,
    });
    expect(payload.body.data.items.map(item => item.type)).toEqual(
      expect.arrayContaining([
        "payment",
        "refund",
        "pending_refund",
        "exception",
      ])
    );
  });

  it("filters finance entries by business type and keyword", async () => {
    const membershipOrder = order({
      id: "order_finance_membership",
      status: "paid",
      amount: 399,
      title: "成长会员年卡",
      type: "membership",
    });
    await courseAccessStore.save(
      "finance_user_1",
      CourseAccessStateSchema.parse({
        ownedCourseIds: [],
        membership: { status: "active", planName: "成长会员" },
        orders: [membershipOrder],
      })
    );
    const event = createSimulatedPaymentSucceededEvent({
      order: membershipOrder,
      now: "2026-05-12T09:02:00.000Z",
    });
    await paymentStore.begin(event, "2026-05-12T09:02:01.000Z");
    await paymentStore.markProcessed(
      event.id,
      200,
      { ok: true },
      "2026-05-12T09:02:02.000Z"
    );

    const payload = await getFinanceAdminOverviewPayload(
      operator,
      {
        itemType: "membership",
        keyword: "会员",
      },
      now,
      paymentStore,
      transactionOperationStore
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (payload.body.ok) {
      expect(payload.body.data.items).toHaveLength(1);
      expect(payload.body.data.items[0]).toMatchObject({
        orderId: "order_finance_membership",
        itemTypes: ["membership"],
      });
    }
  });

  it("exports filtered finance entries as CSV with metadata", async () => {
    const membershipOrder = order({
      id: "order_finance_export_membership",
      status: "paid",
      amount: 399,
      title: "成长会员年卡",
      type: "membership",
    });
    await courseAccessStore.save(
      "finance_user_1",
      CourseAccessStateSchema.parse({
        ownedCourseIds: [],
        membership: { status: "active", planName: "成长会员" },
        orders: [membershipOrder],
      })
    );
    const event = createSimulatedPaymentSucceededEvent({
      order: membershipOrder,
      now: "2026-05-12T09:02:00.000Z",
    });
    await paymentStore.begin(event, "2026-05-12T09:02:01.000Z");
    await paymentStore.markProcessed(
      event.id,
      200,
      { ok: true },
      "2026-05-12T09:02:02.000Z"
    );

    const payload = await getFinanceAdminExportPayload(
      operator,
      {
        keyword: "会员",
        itemType: "membership",
        page: 9,
      },
      now,
      paymentStore,
      transactionOperationStore
    );

    expect(payload.status).toBe(200);
    expect("csv" in payload.body).toBe(true);
    if (!("csv" in payload.body)) throw new Error("expected CSV export");

    expect(payload.body.filename).toBe("hongboshi-finance-20260512100000.csv");
    expect(payload.body.contentType).toBe("text/csv; charset=utf-8");
    expect(payload.body.metadata).toMatchObject({
      generatedAt: now,
      generatedBy: {
        id: "operator_1",
        roles: ["operator"],
      },
      rowCount: 1,
      policyVersion: "finance-admin-csv-v1",
    });
    expect(payload.body.metadata.query).toMatchObject({
      keyword: "会员",
      itemType: "membership",
      format: "csv",
    });
    expect(payload.body.metadata.query).not.toHaveProperty("page");
    expect(payload.body.metadata.summary.netRevenueAmount).toBe(399);
    expect(payload.body.rows[0]).toMatchObject({
      orderId: "order_finance_export_membership",
      accountingPeriod: "2026-05",
      feeAmount: 0,
      settlementBatchId: "",
      invoiceStatus: "not_requested",
    });
    expect(payload.body.csv).toContain("metadata_key,metadata_value");
    expect(payload.body.csv).toContain("policyVersion,finance-admin-csv-v1");
    expect(payload.body.csv).toContain("发生时间,事项类型,订单ID");
    expect(payload.body.csv).toContain("成长会员年卡");
  });

  it("requires finance read permission for CSV export", async () => {
    expect((await getFinanceAdminExportPayload(null, {})).status).toBe(401);
    expect((await getFinanceAdminExportPayload(member, {})).status).toBe(403);
  });
});
