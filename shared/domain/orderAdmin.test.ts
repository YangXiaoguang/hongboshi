import { describe, expect, it } from "vitest";
import {
  ALL_ORDER_ADMIN_ITEM_TYPE,
  ALL_ORDER_ADMIN_STATUS,
  OrderAdminDetailSchema,
  OrderAdminListQuerySchema,
  OrderAdminListResultSchema,
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
    expect(parsed.timeline.map(event => event.type)).toContain(
      "payment_succeeded"
    );
  });
});
