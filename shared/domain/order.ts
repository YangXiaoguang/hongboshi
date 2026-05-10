import { z } from "zod";
import {
  DateTimeLikeSchema,
  EntityIdSchema,
  MoneyAmountSchema,
} from "./common";

export const PurchasableTypeSchema = z.enum([
  "course",
  "membership",
  "counseling_session",
  "assessment_report",
]);

export const OrderStatusSchema = z.enum([
  "created",
  "pending_payment",
  "paid",
  "closed",
  "refunding",
  "refunded",
]);

export const PaymentChannelSchema = z.enum(["wechat_pay", "alipay", "manual"]);

export const OrderItemSchema = z.object({
  type: PurchasableTypeSchema,
  targetId: z.string().min(1),
  title: z.string().min(1),
  unitPrice: MoneyAmountSchema,
  quantity: z.number().int().positive(),
});

export const OrderSchema = z.object({
  id: EntityIdSchema,
  userId: EntityIdSchema,
  status: OrderStatusSchema,
  items: z.array(OrderItemSchema).min(1),
  subtotal: MoneyAmountSchema,
  discountAmount: MoneyAmountSchema.default(0),
  payableAmount: MoneyAmountSchema,
  createdAt: DateTimeLikeSchema,
  paidAt: DateTimeLikeSchema.optional(),
});

export const PaymentSchema = z.object({
  id: EntityIdSchema,
  orderId: EntityIdSchema,
  channel: PaymentChannelSchema,
  amount: MoneyAmountSchema,
  transactionId: z.string().min(1).optional(),
  paidAt: DateTimeLikeSchema.optional(),
});

export function createCounselingSessionOrder({
  appointmentId,
  userId,
  counselorName,
  sessionPrice,
  now = new Date().toISOString(),
}: {
  appointmentId: string;
  userId: string;
  counselorName: string;
  sessionPrice: number;
  now?: string;
}): Order {
  return OrderSchema.parse({
    id: `order_counseling_${appointmentId}`,
    userId,
    status: "pending_payment",
    items: [
      {
        type: "counseling_session",
        targetId: appointmentId,
        title: `${counselorName} 咨询服务`,
        unitPrice: sessionPrice,
        quantity: 1,
      },
    ],
    subtotal: sessionPrice,
    discountAmount: 0,
    payableAmount: sessionPrice,
    createdAt: now,
  });
}

export function markOrderPaid(
  order: Order,
  now = new Date().toISOString()
): Order {
  const normalized = OrderSchema.parse(order);

  if (normalized.status === "paid") {
    return normalized;
  }

  if (!["created", "pending_payment"].includes(normalized.status)) {
    throw new Error("INVALID_ORDER_PAYMENT_TRANSITION");
  }

  return OrderSchema.parse({
    ...normalized,
    status: "paid",
    paidAt: now,
  });
}

export function closeUnpaidOrder(order: Order): Order {
  const normalized = OrderSchema.parse(order);

  if (normalized.status === "closed") {
    return normalized;
  }

  if (!["created", "pending_payment"].includes(normalized.status)) {
    throw new Error("INVALID_ORDER_CLOSE_TRANSITION");
  }

  return OrderSchema.parse({
    ...normalized,
    status: "closed",
  });
}

export type PurchasableType = z.infer<typeof PurchasableTypeSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type PaymentChannel = z.infer<typeof PaymentChannelSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
