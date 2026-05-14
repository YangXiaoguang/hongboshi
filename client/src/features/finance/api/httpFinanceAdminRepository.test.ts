import { afterEach, describe, expect, it, vi } from "vitest";
import {
  httpFinanceAdminRepository,
  parseFinanceAdminOverviewResponse,
  parseFinanceAdminRuleConsoleResponse,
} from "./httpFinanceAdminRepository";

const overviewData = {
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
      occurredAt: "2026-05-12T10:00:00+08:00",
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
  serverTime: "2026-05-12T10:00:00+08:00",
};

const ruleConsoleData = {
  rules: {
    version: "finance_rules_20260512100000000",
    policyVersion: "finance-admin-rules-v1",
    accountingPeriodStrategy: "natural_month",
    activePeriod: {
      periodId: "2026-05",
      label: "2026年05月",
      startsAt: "2026-04-30T16:00:00.000Z",
      endsAt: "2026-05-31T15:59:59.999Z",
      strategy: "natural_month",
    },
    channelFeeRules: [
      {
        channel: "manual",
        rate: 0.01,
        fixedFeeAmount: 0.5,
        minimumFeeAmount: 0,
        effectiveFrom: "2026-05-01T00:00:00.000+08:00",
        description: "人工模拟渠道试算费率",
      },
    ],
    updatedAt: "2026-05-12T10:00:00.000Z",
    updatedBy: "admin_1",
  },
  preview: {
    period: {
      periodId: "2026-05",
      label: "2026年05月",
      startsAt: "2026-04-30T16:00:00.000Z",
      endsAt: "2026-05-31T15:59:59.999Z",
      strategy: "natural_month",
    },
    generatedAt: "2026-05-12T10:00:00.000Z",
    policyVersion: "finance-admin-rules-v1",
    entryCount: 1,
    paymentCount: 1,
    refundCount: 0,
    grossRevenueAmount: 399,
    refundAmount: 0,
    netRevenueAmount: 399,
    estimatedFeeAmount: 4.49,
    estimatedSettlementAmount: 394.51,
    pendingRefundAmount: 0,
    exceptionUnsettledAmount: 0,
    channelPreviews: [
      {
        channel: "manual",
        label: "人工模拟",
        rate: 0.01,
        fixedFeeAmount: 0.5,
        minimumFeeAmount: 0,
        grossRevenueAmount: 399,
        refundAmount: 0,
        netRevenueAmount: 399,
        estimatedFeeAmount: 4.49,
        estimatedSettlementAmount: 394.51,
        entryCount: 1,
      },
    ],
  },
  canManage: true,
  serverTime: "2026-05-12T10:00:00.000Z",
};

describe("http finance admin repository", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses finance overview responses", () => {
    const parsed = parseFinanceAdminOverviewResponse({
      ok: true,
      data: overviewData,
    });

    expect(parsed.summary.netRevenueAmount).toBe(399);
    expect(parsed.items[0]?.type).toBe("payment");
  });

  it("throws API error messages", () => {
    expect(() =>
      parseFinanceAdminOverviewResponse({
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "当前账号暂无财务管理读取权限",
        },
      })
    ).toThrow("当前账号暂无财务管理读取权限");
  });

  it("parses finance rule console responses", () => {
    const parsed = parseFinanceAdminRuleConsoleResponse({
      ok: true,
      data: ruleConsoleData,
    });

    expect(parsed.rules.activePeriod.periodId).toBe("2026-05");
    expect(parsed.preview.estimatedFeeAmount).toBe(4.49);
  });

  it("loads finance overview with filters", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: overviewData,
        })
      )
    );

    const result = await httpFinanceAdminRepository.loadOverview({
      keyword: "会员",
      channel: "manual",
      itemType: "membership",
      fromDate: "2026-05-01",
      toDate: "2026-05-12",
      page: 2,
    });

    expect(result.items[0]?.id).toBe("finance_payment_1");
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/api/finance/admin/overview?");
    expect(String(url)).toContain("keyword=%E4%BC%9A%E5%91%98");
    expect(String(url)).toContain("channel=manual");
    expect(String(url)).toContain("itemType=membership");
    expect(String(url)).toContain("fromDate=2026-05-01");
    expect(String(url)).toContain("toDate=2026-05-12");
    expect(String(url)).toContain("page=2");
    expect(init).toEqual(
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
      })
    );
  });

  it("exports finance CSV with current filters", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("metadata_key,metadata_value\nrowCount,1", {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="hongboshi-finance-20260512100000.csv"',
          "X-Hongboshi-Finance-Export-Id": "finance_export_20260512100000000",
        },
      })
    );

    const result = await httpFinanceAdminRepository.exportCsv({
      keyword: "会员",
      channel: "manual",
      itemType: "membership",
      page: 2,
    });

    expect(result).toMatchObject({
      filename: "hongboshi-finance-20260512100000.csv",
      contentType: "text/csv; charset=utf-8",
      exportId: "finance_export_20260512100000000",
    });
    expect(result.content).toContain("metadata_key");
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/api/finance/admin/export?");
    expect(String(url)).toContain("keyword=%E4%BC%9A%E5%91%98");
    expect(String(url)).toContain("channel=manual");
    expect(String(url)).toContain("itemType=membership");
    expect(String(url)).not.toContain("page=2");
    expect(init).toEqual(
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          Accept: "text/csv",
        },
      })
    );
  });

  it("loads finance rules", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: ruleConsoleData,
        })
      )
    );

    const result = await httpFinanceAdminRepository.loadRules();

    expect(result.canManage).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe("/api/finance/admin/rules");
    expect(init).toEqual(
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
      })
    );
  });

  it("updates finance rules", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            rules: ruleConsoleData.rules,
            preview: ruleConsoleData.preview,
          },
        })
      )
    );

    const result = await httpFinanceAdminRepository.updateRules({
      channelFeeRules: ruleConsoleData.rules.channelFeeRules,
      notes: "财务后台保存手续费规则",
    });

    expect(result.rules.version).toBe("finance_rules_20260512100000000");
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe("/api/finance/admin/rules");
    expect(init).toEqual(
      expect.objectContaining({
        method: "PUT",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })
    );
    expect(String(init?.body)).toContain("财务后台保存手续费规则");
  });

  it("throws finance CSV export API errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "FORBIDDEN",
            message: "当前账号暂无财务管理导出权限",
          },
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    await expect(httpFinanceAdminRepository.exportCsv()).rejects.toThrow(
      "当前账号暂无财务管理导出权限"
    );
  });
});
