import { describe, expect, it } from "vitest";
import type { Order } from "@shared/domain";
import {
  createPersonalOrderAmountRows,
  createPersonalOrderServiceNotes,
  createPersonalOrderTimeline,
} from "./personalOrderDetail";

const paidOrder: Order = {
  id: "order_course_16_u_10001",
  userId: "u_10001",
  status: "paid",
  items: [
    {
      type: "course",
      targetId: "16",
      title: "情绪急救手册",
      unitPrice: 149,
      quantity: 1,
    },
  ],
  subtotal: 149,
  discountAmount: 20,
  payableAmount: 129,
  couponApplication: {
    claimId: "coupon_u_10001_course_16_coupon_20",
    marketingRuleId: "course_16_coupon_20",
    status: "used",
    appliedAt: "2026-05-18T09:00:00.000Z",
    usedAt: "2026-05-18T09:01:00.000Z",
  },
  createdAt: "2026-05-18T09:00:00.000Z",
  paymentChannel: "wechat_pay",
  paidAt: "2026-05-18T09:01:00.000Z",
  entitlementDeliveredAt: "2026-05-18T09:01:00.000Z",
};

describe("personal order detail model", () => {
  it("builds amount rows with discount and payable emphasis", () => {
    expect(createPersonalOrderAmountRows(paidOrder)).toEqual([
      { label: "商品小计", amount: 149, tone: "normal" },
      { label: "优惠抵扣", amount: -20, tone: "discount" },
      { label: "实付金额", amount: 129, tone: "payable" },
    ]);
  });

  it("builds timeline from order lifecycle fields", () => {
    expect(createPersonalOrderTimeline(paidOrder)).toEqual([
      {
        key: "created",
        label: "订单创建",
        at: "2026-05-18T09:00:00.000Z",
        tone: "normal",
      },
      {
        key: "paid",
        label: "支付成功",
        at: "2026-05-18T09:01:00.000Z",
        tone: "success",
      },
      {
        key: "delivered",
        label: "权益交付",
        at: "2026-05-18T09:01:00.000Z",
        tone: "success",
      },
    ]);
  });

  it("keeps refund as a service note instead of a user-side state change", () => {
    expect(createPersonalOrderServiceNotes(paidOrder).join(" ")).toContain(
      "退款不会在用户端直接完成"
    );
  });

  it("explains that refunded course access has stopped", () => {
    expect(
      createPersonalOrderServiceNotes({
        ...paidOrder,
        status: "refunded",
      }).join(" ")
    ).toContain("相关课程权益已停止");
  });

  it("explains refunded membership source handling separately", () => {
    expect(
      createPersonalOrderServiceNotes({
        ...paidOrder,
        status: "refunded",
        items: [
          {
            type: "membership",
            targetId: "course_membership_yearly",
            title: "成长会员",
            unitPrice: 999,
            quantity: 1,
          },
        ],
      }).join(" ")
    ).toContain("会员权益已根据来源记录处理");
  });
});
