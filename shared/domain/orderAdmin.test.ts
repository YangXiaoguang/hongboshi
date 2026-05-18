import { describe, expect, it } from "vitest";
import {
  ALL_ORDER_ADMIN_ITEM_TYPE,
  ALL_ORDER_ADMIN_STATUS,
  OrderAfterSalesCreateRequestSchema,
  OrderAfterSalesMutationResultSchema,
  OrderAdminActionRequestSchema,
  OrderAdminAuditEventSchema,
  OrderAdminDetailSchema,
  OrderAdminExceptionFlagSchema,
  OrderAdminListQuerySchema,
  OrderAdminListResultSchema,
  OrderAdminMutationResultSchema,
} from "./order";

const listItem = {
  id: "order_1",
  user: {
    id: "u_member_1",
    displayName: "测试会员",
    phoneMasked: "138****2049",
  },
  status: "paid",
  itemTypes: ["course"],
  primaryTitle: "情绪管理入门",
  itemCount: 1,
  payableAmount: 199,
  createdAt: "2026-05-11T10:00:00+08:00",
  paidAt: "2026-05-11T10:01:00+08:00",
  latestReceiptStatus: "processed",
};

describe("order admin domain contract", () => {
  it("normalizes order admin list query defaults", () => {
    expect(OrderAdminListQuerySchema.parse({})).toMatchObject({
      keyword: "",
      status: ALL_ORDER_ADMIN_STATUS,
      itemType: ALL_ORDER_ADMIN_ITEM_TYPE,
      sort: "created_desc",
      page: 1,
      pageSize: 12,
    });
  });

  it("validates order admin list results", () => {
    const parsed = OrderAdminListResultSchema.parse({
      items: [listItem],
      meta: {
        page: 1,
        pageSize: 12,
        total: 1,
        totalPages: 1,
      },
      summary: {
        totalCount: 1,
        pendingPaymentCount: 0,
        paidCount: 1,
        refundingCount: 0,
        refundedCount: 0,
        payableAmount: 199,
        paidAmount: 199,
      },
      filters: {
        statuses: ["paid"],
        itemTypes: ["course"],
      },
      query: {},
      serverTime: "2026-05-12T10:00:00+08:00",
    });

    expect(parsed.items[0]?.user.phoneMasked).toContain("****");
    expect(parsed.query.pageSize).toBe(12);
  });

  it("validates order detail with receipts and timeline", () => {
    const parsed = OrderAdminDetailSchema.parse({
      order: listItem,
      items: [
        {
          type: "course",
          targetId: "1",
          title: "情绪管理入门",
          unitPrice: 199,
          quantity: 1,
        },
      ],
      subtotal: 199,
      discountAmount: 0,
      payableAmount: 199,
      paymentReceipts: [
        {
          id: "evt_payment_1",
          type: "payment.succeeded",
          channel: "manual",
          status: "processed",
          amount: 199,
          transactionId: "tx_1",
          occurredAt: "2026-05-11T10:01:00+08:00",
          receivedAt: "2026-05-11T10:01:01+08:00",
          processedAt: "2026-05-11T10:01:02+08:00",
          responseStatus: 200,
        },
      ],
      relatedObjects: [
        {
          type: "course",
          targetId: "1",
          title: "情绪管理入门",
        },
      ],
      timeline: [
        {
          type: "order_created",
          label: "订单创建",
          occurredAt: "2026-05-11T10:00:00+08:00",
        },
        {
          type: "payment_succeeded",
          label: "支付回调成功",
          occurredAt: "2026-05-11T10:01:00+08:00",
          detail: "manual · processed",
        },
      ],
      privacyNotice: "订单后台仅展示履约和对账所需信息。",
      generatedAt: "2026-05-12T10:00:00+08:00",
    });

    expect(parsed.paymentReceipts[0]?.status).toBe("processed");
    expect(parsed.auditEvents).toEqual([]);
    expect(parsed.timeline.map(event => event.type)).toContain(
      "payment_succeeded"
    );
  });

  it("validates user order after-sales requests", () => {
    expect(
      OrderAfterSalesCreateRequestSchema.parse({
        requestType: "learning_access_issue",
        description: "课程无法进入学习页，请协助确认权益。",
        contact: "13800139019",
      })
    ).toMatchObject({
      requestType: "learning_access_issue",
    });

    const parsed = OrderAfterSalesMutationResultSchema.parse({
      request: {
        id: "after_sales_1",
        orderId: "order_1",
        userId: "u_member_1",
        requestType: "refund_consultation",
        status: "submitted",
        description: "想了解退款流程。",
        contact: "13800139019",
        createdAt: "2026-05-12T10:00:00+08:00",
        updatedAt: "2026-05-12T10:00:00+08:00",
      },
      requests: [
        {
          id: "after_sales_1",
          orderId: "order_1",
          userId: "u_member_1",
          requestType: "refund_consultation",
          status: "submitted",
          description: "想了解退款流程。",
          contact: "13800139019",
          createdAt: "2026-05-12T10:00:00+08:00",
          updatedAt: "2026-05-12T10:00:00+08:00",
        },
      ],
      summaries: [
        {
          id: "after_sales_1",
          orderId: "order_1",
          userId: "u_member_1",
          requestType: "refund_consultation",
          status: "submitted",
          descriptionPreview: "想了解退款流程。",
          contactMasked: "138****9019",
          createdAt: "2026-05-12T10:00:00+08:00",
          updatedAt: "2026-05-12T10:00:00+08:00",
        },
      ],
      activeRequest: {
        id: "after_sales_1",
        orderId: "order_1",
        userId: "u_member_1",
        requestType: "refund_consultation",
        status: "submitted",
        description: "想了解退款流程。",
        contact: "13800139019",
        createdAt: "2026-05-12T10:00:00+08:00",
        updatedAt: "2026-05-12T10:00:00+08:00",
      },
      privacyNotice: "售后申请只用于订单核查。",
      generatedAt: "2026-05-12T10:00:00+08:00",
    });

    expect(parsed.activeRequest?.status).toBe("submitted");
  });

  it("validates order admin action and audit contracts", () => {
    const exception = OrderAdminExceptionFlagSchema.parse({
      orderId: "order_1",
      status: "open",
      severity: "critical",
      reason: "支付回调失败需人工核查",
      markedBy: "operator_1",
      markedAt: "2026-05-12T10:00:00+08:00",
    });
    const auditEvent = OrderAdminAuditEventSchema.parse({
      id: "order_audit_1",
      orderId: "order_1",
      userId: "u_member_1",
      actorId: "operator_1",
      actorRoles: ["operator"],
      action: "mark_exception",
      reason: "支付回调失败需人工核查",
      before: { status: "paid" },
      after: { status: "paid", exception },
      createdAt: "2026-05-12T10:00:00+08:00",
    });

    expect(
      OrderAdminActionRequestSchema.parse({
        action: "mark_exception",
        reason: "支付回调失败需人工核查",
      }).severity
    ).toBe("warning");
    expect(
      OrderAdminMutationResultSchema.parse({
        detail: {
          order: { ...listItem, exception },
          items: [
            {
              type: "course",
              targetId: "1",
              title: "情绪管理入门",
              unitPrice: 199,
              quantity: 1,
            },
          ],
          subtotal: 199,
          discountAmount: 0,
          payableAmount: 199,
          paymentReceipts: [],
          relatedObjects: [
            {
              type: "course",
              targetId: "1",
              title: "情绪管理入门",
            },
          ],
          timeline: [],
          auditEvents: [auditEvent],
          privacyNotice: "订单后台仅展示履约和对账所需信息。",
          generatedAt: "2026-05-12T10:00:00+08:00",
        },
        auditEvent,
        serverTime: "2026-05-12T10:00:00+08:00",
      }).auditEvent.action
    ).toBe("mark_exception");
  });
});
