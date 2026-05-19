import type { Order } from "@shared/domain";

export interface PersonalOrderAmountRow {
  label: string;
  amount: number;
  tone: "normal" | "discount" | "payable";
}

export interface PersonalOrderTimelineItem {
  key: string;
  label: string;
  at: string;
  tone: "normal" | "success" | "warning" | "muted";
}

export function createPersonalOrderAmountRows(
  order: Order
): PersonalOrderAmountRow[] {
  return [
    {
      label: "商品小计",
      amount: order.subtotal,
      tone: "normal",
    },
    ...(order.discountAmount > 0
      ? [
          {
            label: "优惠抵扣",
            amount: -order.discountAmount,
            tone: "discount" as const,
          },
        ]
      : []),
    {
      label: "实付金额",
      amount: order.payableAmount,
      tone: "payable",
    },
  ];
}

export function createPersonalOrderTimeline(
  order: Order
): PersonalOrderTimelineItem[] {
  const timeline: PersonalOrderTimelineItem[] = [
    {
      key: "created",
      label: "订单创建",
      at: order.createdAt,
      tone: "normal",
    },
  ];

  if (order.expiresAt && order.status === "pending_payment") {
    timeline.push({
      key: "expires",
      label: "支付保留至",
      at: order.expiresAt,
      tone: "warning",
    });
  }

  if (order.paidAt) {
    timeline.push({
      key: "paid",
      label: "支付成功",
      at: order.paidAt,
      tone: "success",
    });
  }

  if (order.entitlementDeliveredAt) {
    timeline.push({
      key: "delivered",
      label: "权益交付",
      at: order.entitlementDeliveredAt,
      tone: "success",
    });
  }

  if (order.closedAt) {
    timeline.push({
      key: "closed",
      label: "订单关闭",
      at: order.closedAt,
      tone: "muted",
    });
  }

  return timeline;
}

export function createPersonalOrderServiceNotes(order: Order): string[] {
  const firstItemType = order.items[0]?.type;

  if (order.status === "pending_payment") {
    if (firstItemType === "membership") {
      return [
        "待支付会员订单可继续支付或取消，取消后不会开通会员权益。",
        "支付保留时间以订单记录为准，超时后需要重新开通。",
      ];
    }

    return [
      "待支付订单可继续支付或取消，取消后不会发放课程权益。",
      "支付保留时间以订单记录为准，超时后需要重新下单。",
    ];
  }

  if (order.status === "paid") {
    if (firstItemType === "membership") {
      return [
        "会员权益已交付，可从课程中心查看会员课程，也可在成长空间继续学习。",
        "如遇权益未生效、重复扣款或其他售后问题，请携带订单号联系人工处理；退款不会在用户端直接完成。",
      ];
    }

    return [
      "课程权益已交付，可从课程详情或成长空间继续学习。",
      "如遇无法学习、重复扣款或其他售后问题，请携带订单号联系人工处理；退款不会在用户端直接完成。",
    ];
  }

  if (order.status === "refunding") {
    if (firstItemType === "membership") {
      return [
        "退款已进入处理中，最终状态以支付渠道回调和后台审核记录为准。",
        "退款期间会员权益会根据当前权益来源和最终退款结果调整。",
      ];
    }

    return [
      "退款已进入处理中，最终状态以支付渠道回调和后台审核记录为准。",
      "退款期间课程权益可能会根据后台处理结果调整。",
    ];
  }

  if (order.status === "refunded") {
    if (firstItemType === "membership") {
      return [
        "订单已完成退款，会员权益已根据来源记录处理；如需继续学习会员课程可重新开通。",
      ];
    }

    return ["订单已完成退款，相关课程权益已停止；如需继续学习可重新购买。"];
  }

  if (order.status === "closed") {
    if (firstItemType === "membership") {
      return ["订单已关闭，未开通会员权益。如仍需学习会员课程，可重新开通。"];
    }

    return ["订单已关闭，未发放课程权益。如仍需学习，可重新下单。"];
  }

  return ["订单已创建，后续状态以支付结果和权益交付记录为准。"];
}
