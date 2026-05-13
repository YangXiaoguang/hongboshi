import { describe, expect, it } from "vitest";
import {
  ALL_FINANCE_ADMIN_CHANNEL,
  ALL_FINANCE_ADMIN_ITEM_TYPE,
  FinanceAdminOverviewSchema,
  FinanceAdminQuerySchema,
} from "./finance";

describe("finance admin domain contract", () => {
  it("normalizes finance admin query defaults", () => {
    expect(FinanceAdminQuerySchema.parse({})).toMatchObject({
      keyword: "",
      channel: ALL_FINANCE_ADMIN_CHANNEL,
      itemType: ALL_FINANCE_ADMIN_ITEM_TYPE,
      sort: "occurred_desc",
      page: 1,
      pageSize: 12,
    });
  });

  it("validates finance overview entries and metric policies", () => {
    const parsed = FinanceAdminOverviewSchema.parse({
      items: [
        {
          id: "finance_payment_1",
          type: "payment",
          orderId: "order_1",
          user: {
            id: "user_1",
            displayName: "测试用户",
            phoneMasked: "138****2049",
          },
          primaryTitle: "成长会员年卡",
          itemTypes: ["membership"],
          channel: "manual",
          amount: 399,
          occurredAt: "2026-05-12T10:00:00.000Z",
          sourceStatus: "processed",
          transactionId: "manual_order_1",
          receiptId: "evt_payment_order_1",
          reason: "支付成功回调已处理",
          severity: "ok",
        },
      ],
      meta: {
        page: 1,
        pageSize: 12,
        total: 1,
        totalPages: 1,
      },
      summary: {
        entryCount: 1,
        paymentCount: 1,
        refundCount: 0,
        pendingRefundCount: 0,
        exceptionCount: 0,
        grossRevenueAmount: 399,
        refundAmount: 0,
        netRevenueAmount: 399,
        pendingRefundAmount: 0,
        exceptionAmount: 0,
      },
      channelBreakdown: [
        {
          channel: "manual",
          label: "人工模拟",
          amount: 399,
          count: 1,
        },
      ],
      itemTypeBreakdown: [
        {
          itemType: "membership",
          label: "会员",
          amount: 399,
          count: 1,
        },
      ],
      policies: [
        {
          key: "gross_revenue",
          label: "收入",
          description: "已处理的 payment.succeeded 按回调金额计入收入。",
        },
      ],
      filters: {
        channels: ["manual"],
        itemTypes: ["membership"],
      },
      query: {},
      serverTime: "2026-05-12T10:00:00.000Z",
    });

    expect(parsed.summary.netRevenueAmount).toBe(399);
    expect(parsed.items[0]?.user.phoneMasked).toContain("****");
  });
});
