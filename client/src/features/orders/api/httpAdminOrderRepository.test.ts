import { afterEach, describe, expect, it, vi } from "vitest";
import {
  httpAdminOrderRepository,
  parseAdminOrderDetailResponse,
  parseAdminOrderListResponse,
} from "./httpAdminOrderRepository";

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

const listData = {
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
};

const detailData = {
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
  ],
  privacyNotice: "订单后台仅展示履约和对账所需信息。",
  generatedAt: "2026-05-12T10:00:00+08:00",
};

describe("http admin order repository", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses admin order list responses", () => {
    const parsed = parseAdminOrderListResponse({
      ok: true,
      data: listData,
    });

    expect(parsed.items[0]?.status).toBe("paid");
    expect(parsed.query.pageSize).toBe(12);
  });

  it("throws API error messages", () => {
    expect(() =>
      parseAdminOrderListResponse({
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "当前账号暂无订单后台读取权限",
        },
      })
    ).toThrow("当前账号暂无订单后台读取权限");
  });

  it("parses admin order detail responses", () => {
    const parsed = parseAdminOrderDetailResponse({
      ok: true,
      data: detailData,
    });

    expect(parsed.paymentReceipts[0]?.status).toBe("processed");
  });

  it("loads orders from the admin endpoint with filters", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true, data: listData }))
      );

    const result = await httpAdminOrderRepository.loadOrders({
      keyword: "测试",
      status: "paid",
      itemType: "course",
      page: 2,
    });

    expect(result.items[0]?.id).toBe("order_1");
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/api/orders/admin/orders?");
    expect(String(url)).toContain("keyword=%E6%B5%8B%E8%AF%95");
    expect(String(url)).toContain("status=paid");
    expect(String(url)).toContain("itemType=course");
    expect(String(url)).toContain("page=2");
    expect(init).toEqual(
      expect.objectContaining({
        credentials: "same-origin",
      })
    );
  });

  it("loads an order detail from the admin endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: detailData,
        })
      )
    );

    const detail = await httpAdminOrderRepository.loadOrderDetail("order_1");

    expect(detail.order.id).toBe("order_1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/orders/admin/orders/order_1",
      expect.objectContaining({
        cache: "no-store",
      })
    );
  });
});
