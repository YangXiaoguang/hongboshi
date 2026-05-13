import { afterEach, describe, expect, it, vi } from "vitest";
import {
  httpTransactionAdminRepository,
  parseTransactionAdminDetailResponse,
  parseTransactionAdminListResponse,
  parseTransactionAdminMutationResponse,
} from "./httpTransactionAdminRepository";

const transaction = {
  id: "evt_payment_1",
  type: "payment",
  eventType: "payment.succeeded",
  orderId: "order_1",
  channel: "manual",
  status: "processed",
  amount: 199,
  transactionId: "tx_1",
  occurredAt: "2026-05-12T09:01:00+08:00",
  receivedAt: "2026-05-12T09:01:01+08:00",
  processedAt: "2026-05-12T09:01:02+08:00",
  responseStatus: 200,
  user: {
    id: "u_member_1",
    displayName: "测试会员",
    phoneMasked: "138****2049",
  },
  relatedOrder: {
    id: "order_1",
    status: "paid",
    user: {
      id: "u_member_1",
      displayName: "测试会员",
      phoneMasked: "138****2049",
    },
    itemTypes: ["course"],
    primaryTitle: "情绪管理入门",
    payableAmount: 199,
    paidAt: "2026-05-12T09:01:00+08:00",
  },
  businessObjects: [
    {
      domain: "course_access",
      type: "course",
      targetId: "1",
      title: "情绪管理入门",
      status: "已开课",
    },
  ],
  itemTypes: ["course"],
  primaryTitle: "情绪管理入门",
  severity: "ok",
  issues: [],
};

const listData = {
  items: [transaction],
  meta: {
    page: 1,
    pageSize: 12,
    total: 1,
    totalPages: 1,
  },
  summary: {
    totalCount: 1,
    paymentCount: 1,
    refundCount: 0,
    processedCount: 1,
    failedCount: 0,
    processingCount: 0,
    warningCount: 0,
    criticalCount: 0,
    grossPaymentAmount: 199,
    refundAmount: 0,
    netAmount: 199,
  },
  filters: {
    types: ["payment"],
    channels: ["manual"],
    statuses: ["processed"],
    itemTypes: ["course"],
  },
  query: {},
  serverTime: "2026-05-12T10:00:00+08:00",
};

const detailData = {
  transaction,
  relatedOrder: transaction.relatedOrder,
  businessObjects: transaction.businessObjects,
  timeline: [
    {
      type: "webhook_received",
      label: "回调收据进入系统",
      occurredAt: "2026-05-12T09:01:01+08:00",
      detail: "manual · processed",
    },
  ],
  receipt: {
    id: "evt_payment_1",
    type: "payment.succeeded",
    orderId: "order_1",
    channel: "manual",
    status: "processed",
    amount: 199,
    transactionId: "tx_1",
    occurredAt: "2026-05-12T09:01:00+08:00",
    receivedAt: "2026-05-12T09:01:01+08:00",
    processedAt: "2026-05-12T09:01:02+08:00",
    responseStatus: 200,
  },
  privacyNotice: "交易后台仅展示对账和履约排障必要信息。",
  generatedAt: "2026-05-12T10:00:00+08:00",
};

const auditEvent = {
  id: "transaction_audit_1",
  transactionId: "evt_payment_1",
  orderId: "order_1",
  userId: "u_member_1",
  actorId: "operator_1",
  actorRoles: ["operator"],
  action: "request_refund",
  reason: "用户提交退款申请",
  before: {
    orderStatus: "paid",
  },
  after: {
    orderStatus: "refunding",
  },
  refundProviderResult: {
    provider: "manual",
    status: "accepted",
    requestId: "manual_refund_1",
    message: "人工退款通道已受理申请，等待退款成功回调。",
    handledAt: "2026-05-12T10:01:00+08:00",
    retryable: false,
  },
  createdAt: "2026-05-12T10:01:00+08:00",
};

const mutationData = {
  detail: {
    ...detailData,
    transaction: {
      ...transaction,
      relatedOrder: {
        ...transaction.relatedOrder,
        status: "refunding",
      },
    },
    relatedOrder: {
      ...transaction.relatedOrder,
      status: "refunding",
    },
    auditEvents: [auditEvent],
  },
  auditEvent,
  auditEvents: [auditEvent],
  serverTime: "2026-05-12T10:01:00+08:00",
};

describe("http transaction admin repository", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses transaction list responses", () => {
    const parsed = parseTransactionAdminListResponse({
      ok: true,
      data: listData,
    });

    expect(parsed.items[0]?.type).toBe("payment");
    expect(parsed.summary.netAmount).toBe(199);
  });

  it("throws API error messages", () => {
    expect(() =>
      parseTransactionAdminListResponse({
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "当前账号暂无交易后台读取权限",
        },
      })
    ).toThrow("当前账号暂无交易后台读取权限");
  });

  it("parses transaction detail responses", () => {
    const parsed = parseTransactionAdminDetailResponse({
      ok: true,
      data: detailData,
    });

    expect(parsed.receipt.transactionId).toBe("tx_1");
    expect(parsed.businessObjects[0]?.status).toBe("已开课");
  });

  it("parses transaction mutation responses", () => {
    const parsed = parseTransactionAdminMutationResponse({
      ok: true,
      data: mutationData,
    });

    expect(parsed.auditEvent.action).toBe("request_refund");
    expect(parsed.auditEvent.refundProviderResult?.status).toBe("accepted");
    expect(parsed.detail.relatedOrder?.status).toBe("refunding");
  });

  it("loads transaction list from the admin endpoint with filters", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true, data: listData }))
      );

    const result = await httpTransactionAdminRepository.loadTransactions({
      keyword: "测试",
      type: "payment",
      channel: "manual",
      status: "processed",
      itemType: "course",
      fromDate: "2026-05-01",
      toDate: "2026-05-12",
      page: 2,
    });

    expect(result.items[0]?.id).toBe("evt_payment_1");
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/api/transactions/admin/transactions?");
    expect(String(url)).toContain("keyword=%E6%B5%8B%E8%AF%95");
    expect(String(url)).toContain("type=payment");
    expect(String(url)).toContain("channel=manual");
    expect(String(url)).toContain("status=processed");
    expect(String(url)).toContain("itemType=course");
    expect(String(url)).toContain("fromDate=2026-05-01");
    expect(String(url)).toContain("toDate=2026-05-12");
    expect(String(url)).toContain("page=2");
    expect(init).toEqual(
      expect.objectContaining({
        credentials: "same-origin",
      })
    );
  });

  it("loads transaction detail from the admin endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: detailData,
        })
      )
    );

    const detail =
      await httpTransactionAdminRepository.loadTransactionDetail(
        "evt_payment_1"
      );

    expect(detail.transaction.id).toBe("evt_payment_1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/transactions/admin/transactions/evt_payment_1",
      expect.objectContaining({
        cache: "no-store",
      })
    );
  });

  it("updates transaction actions through the admin endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: mutationData,
        })
      )
    );

    const result = await httpTransactionAdminRepository.updateTransaction(
      "evt_payment_1",
      {
        action: "request_refund",
        reason: "用户提交退款申请",
      }
    );

    expect(result.auditEvent.action).toBe("request_refund");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/transactions/admin/transactions/evt_payment_1/actions",
      expect.objectContaining({
        method: "PATCH",
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify({
          action: "request_refund",
          reason: "用户提交退款申请",
        }),
      })
    );
  });
});
