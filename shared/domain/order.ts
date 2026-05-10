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

export const PaymentWebhookEventSchema = z.object({
  id: EntityIdSchema,
  type: z.literal("payment.succeeded"),
  orderId: EntityIdSchema,
  channel: PaymentChannelSchema,
  amount: MoneyAmountSchema,
  transactionId: z.string().min(1),
  occurredAt: DateTimeLikeSchema,
});

export const PaymentWebhookProcessingResultSchema = z.object({
  event: PaymentWebhookEventSchema,
  payment: PaymentSchema,
  order: OrderSchema,
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

export function createSimulatedPaymentSucceededEvent({
  order,
  channel = "manual",
  transactionId,
  now = new Date().toISOString(),
}: {
  order: Order;
  channel?: PaymentChannel;
  transactionId?: string;
  now?: string;
}): PaymentWebhookEvent {
  const normalized = OrderSchema.parse(order);

  return PaymentWebhookEventSchema.parse({
    id: `evt_payment_${normalized.id}_${Date.parse(now)}`,
    type: "payment.succeeded",
    orderId: normalized.id,
    channel,
    amount: normalized.payableAmount,
    transactionId:
      transactionId ?? `manual_${normalized.id}_${Date.parse(now)}`,
    occurredAt: now,
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

export function applyPaymentSucceededWebhookToOrder(
  order: Order,
  event: PaymentWebhookEvent
) {
  const normalizedOrder = OrderSchema.parse(order);
  const normalizedEvent = PaymentWebhookEventSchema.parse(event);

  if (normalizedOrder.id !== normalizedEvent.orderId) {
    throw new Error("PAYMENT_WEBHOOK_ORDER_MISMATCH");
  }

  if (normalizedOrder.payableAmount !== normalizedEvent.amount) {
    throw new Error("PAYMENT_WEBHOOK_AMOUNT_MISMATCH");
  }

  const payment = PaymentSchema.parse({
    id: `payment_${normalizedEvent.id}`,
    orderId: normalizedEvent.orderId,
    channel: normalizedEvent.channel,
    amount: normalizedEvent.amount,
    transactionId: normalizedEvent.transactionId,
    paidAt: normalizedEvent.occurredAt,
  });

  return PaymentWebhookProcessingResultSchema.parse({
    event: normalizedEvent,
    payment,
    order: markOrderPaid(normalizedOrder, normalizedEvent.occurredAt),
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
export type PaymentWebhookEvent = z.infer<typeof PaymentWebhookEventSchema>;
export type PaymentWebhookProcessingResult = z.infer<
  typeof PaymentWebhookProcessingResultSchema
>;
