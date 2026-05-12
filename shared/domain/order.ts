import { z } from "zod";
import {
  DateTimeLikeSchema,
  EntityIdSchema,
  MoneyAmountSchema,
  PageMetaSchema,
  PaginationQuerySchema,
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

export const RefundSchema = z.object({
  id: EntityIdSchema,
  orderId: EntityIdSchema,
  channel: PaymentChannelSchema,
  amount: MoneyAmountSchema,
  transactionId: z.string().min(1),
  refundedAt: DateTimeLikeSchema,
});

export const PaymentSucceededWebhookEventSchema = z.object({
  id: EntityIdSchema,
  type: z.literal("payment.succeeded"),
  orderId: EntityIdSchema,
  channel: PaymentChannelSchema,
  amount: MoneyAmountSchema,
  transactionId: z.string().min(1),
  occurredAt: DateTimeLikeSchema,
});

export const RefundSucceededWebhookEventSchema = z.object({
  id: EntityIdSchema,
  type: z.literal("refund.succeeded"),
  orderId: EntityIdSchema,
  channel: PaymentChannelSchema,
  amount: MoneyAmountSchema,
  transactionId: z.string().min(1),
  occurredAt: DateTimeLikeSchema,
});

export const PaymentWebhookEventSchema = z.discriminatedUnion("type", [
  PaymentSucceededWebhookEventSchema,
  RefundSucceededWebhookEventSchema,
]);

export const PaymentWebhookReceiptStatusSchema = z.enum([
  "processing",
  "processed",
  "failed",
]);

export const PaymentBusinessDomainSchema = z.enum(["counseling"]);

export const PaymentReconciliationSeveritySchema = z.enum([
  "ok",
  "warning",
  "critical",
]);

export const PaymentReconciliationIssueCodeSchema = z.enum([
  "webhook_processing",
  "webhook_failed",
  "business_order_missing",
  "order_amount_mismatch",
  "payment_order_not_settled",
  "refund_order_not_completed",
  "refund_appointment_not_completed",
]);

export const PaymentReconciliationIssueSchema = z.object({
  code: PaymentReconciliationIssueCodeSchema,
  severity: PaymentReconciliationSeveritySchema.exclude(["ok"]),
  message: z.string().min(1),
});

export const PaymentWebhookReceiptSnapshotSchema = z.object({
  id: EntityIdSchema,
  type: z.enum(["payment.succeeded", "refund.succeeded"]),
  orderId: EntityIdSchema,
  channel: PaymentChannelSchema,
  status: PaymentWebhookReceiptStatusSchema,
  amount: MoneyAmountSchema,
  transactionId: z.string().min(1),
  occurredAt: DateTimeLikeSchema,
  receivedAt: DateTimeLikeSchema,
  processedAt: DateTimeLikeSchema.optional(),
  responseStatus: z.number().int().positive().optional(),
  errorMessage: z.string().min(1).optional(),
});

export const PaymentBusinessOrderSnapshotSchema = z.object({
  domain: PaymentBusinessDomainSchema,
  orderId: EntityIdSchema,
  userId: EntityIdSchema,
  orderStatus: OrderStatusSchema.optional(),
  appointmentId: EntityIdSchema.optional(),
  appointmentStatus: z.string().min(1).optional(),
  counselorId: EntityIdSchema.optional(),
  payableAmount: MoneyAmountSchema.optional(),
  paidAt: DateTimeLikeSchema.optional(),
});

export const PaymentReconciliationEntrySchema = z.object({
  id: EntityIdSchema,
  webhook: PaymentWebhookReceiptSnapshotSchema,
  business: PaymentBusinessOrderSnapshotSchema.optional(),
  severity: PaymentReconciliationSeveritySchema,
  issues: z.array(PaymentReconciliationIssueSchema),
  checkedAt: DateTimeLikeSchema,
});

export const PaymentReconciliationSummarySchema = z.object({
  receiptCount: z.number().int().nonnegative(),
  processedCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  processingCount: z.number().int().nonnegative(),
  okCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
  criticalCount: z.number().int().nonnegative(),
});

export const PaymentReconciliationConsoleSchema = z.object({
  entries: z.array(PaymentReconciliationEntrySchema),
  summary: PaymentReconciliationSummarySchema,
  serverTime: DateTimeLikeSchema,
});

export const ORDER_ADMIN_PAGE_SIZE = 12;
export const ALL_ORDER_ADMIN_STATUS = "all";
export const ALL_ORDER_ADMIN_ITEM_TYPE = "all";

export const OrderAdminStatusFilterSchema = z.union([
  OrderStatusSchema,
  z.literal(ALL_ORDER_ADMIN_STATUS),
]);

export const OrderAdminItemTypeFilterSchema = z.union([
  PurchasableTypeSchema,
  z.literal(ALL_ORDER_ADMIN_ITEM_TYPE),
]);

export const OrderAdminSortSchema = z.enum([
  "created_desc",
  "paid_desc",
  "amount_desc",
]);

export const OrderAdminListQuerySchema = PaginationQuerySchema.extend({
  keyword: z.string().trim().max(80).default(""),
  status: OrderAdminStatusFilterSchema.default(ALL_ORDER_ADMIN_STATUS),
  itemType: OrderAdminItemTypeFilterSchema.default(ALL_ORDER_ADMIN_ITEM_TYPE),
  sort: OrderAdminSortSchema.default("created_desc"),
  pageSize: z.number().int().min(1).max(50).default(ORDER_ADMIN_PAGE_SIZE),
});

export const OrderAdminUserSummarySchema = z.object({
  id: EntityIdSchema,
  displayName: z.string().min(1),
  phoneMasked: z.string().optional(),
});

export const OrderAdminTimelineEventTypeSchema = z.enum([
  "order_created",
  "payment_succeeded",
  "refund_succeeded",
  "appointment_status",
  "order_status",
]);

export const OrderAdminTimelineEventSchema = z.object({
  type: OrderAdminTimelineEventTypeSchema,
  label: z.string().min(1),
  occurredAt: DateTimeLikeSchema,
  detail: z.string().min(1).optional(),
});

export const OrderAdminRelatedObjectSchema = z.object({
  type: PurchasableTypeSchema,
  targetId: z.string().min(1),
  title: z.string().min(1),
  status: z.string().min(1).optional(),
  counselorName: z.string().min(1).optional(),
});

export const OrderAdminPaymentReceiptSummarySchema = z.object({
  id: EntityIdSchema,
  type: z.enum(["payment.succeeded", "refund.succeeded"]),
  channel: PaymentChannelSchema,
  status: PaymentWebhookReceiptStatusSchema,
  amount: MoneyAmountSchema,
  transactionId: z.string().min(1),
  occurredAt: DateTimeLikeSchema,
  receivedAt: DateTimeLikeSchema,
  processedAt: DateTimeLikeSchema.optional(),
  responseStatus: z.number().int().positive().optional(),
  errorMessage: z.string().min(1).optional(),
});

export const OrderAdminListItemSchema = z.object({
  id: EntityIdSchema,
  user: OrderAdminUserSummarySchema,
  status: OrderStatusSchema,
  itemTypes: z.array(PurchasableTypeSchema).min(1),
  primaryTitle: z.string().min(1),
  itemCount: z.number().int().positive(),
  payableAmount: MoneyAmountSchema,
  createdAt: DateTimeLikeSchema,
  paidAt: DateTimeLikeSchema.optional(),
  latestReceiptStatus: PaymentWebhookReceiptStatusSchema.optional(),
  relatedObjectStatus: z.string().min(1).optional(),
});

export const OrderAdminSummarySchema = z.object({
  totalCount: z.number().int().nonnegative(),
  pendingPaymentCount: z.number().int().nonnegative(),
  paidCount: z.number().int().nonnegative(),
  refundingCount: z.number().int().nonnegative(),
  refundedCount: z.number().int().nonnegative(),
  payableAmount: MoneyAmountSchema,
  paidAmount: MoneyAmountSchema,
});

export const OrderAdminFilterOptionsSchema = z.object({
  statuses: z.array(OrderStatusSchema),
  itemTypes: z.array(PurchasableTypeSchema),
});

export const OrderAdminListResultSchema = z.object({
  items: z.array(OrderAdminListItemSchema),
  meta: PageMetaSchema,
  summary: OrderAdminSummarySchema,
  filters: OrderAdminFilterOptionsSchema,
  query: OrderAdminListQuerySchema,
  serverTime: DateTimeLikeSchema,
});

export const OrderAdminDetailSchema = z.object({
  order: OrderAdminListItemSchema,
  items: z.array(OrderItemSchema).min(1),
  subtotal: MoneyAmountSchema,
  discountAmount: MoneyAmountSchema,
  payableAmount: MoneyAmountSchema,
  paymentReceipts: z.array(OrderAdminPaymentReceiptSummarySchema),
  relatedObjects: z.array(OrderAdminRelatedObjectSchema),
  timeline: z.array(OrderAdminTimelineEventSchema),
  privacyNotice: z.string().min(1),
  generatedAt: DateTimeLikeSchema,
});

export const PaymentWebhookProcessingResultSchema = z.object({
  event: PaymentSucceededWebhookEventSchema,
  payment: PaymentSchema,
  order: OrderSchema,
});

export const RefundWebhookProcessingResultSchema = z.object({
  event: RefundSucceededWebhookEventSchema,
  refund: RefundSchema,
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
}): PaymentSucceededWebhookEvent {
  const normalized = OrderSchema.parse(order);

  return PaymentSucceededWebhookEventSchema.parse({
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

export function createSimulatedRefundSucceededEvent({
  order,
  channel = "manual",
  transactionId,
  now = new Date().toISOString(),
}: {
  order: Order;
  channel?: PaymentChannel;
  transactionId?: string;
  now?: string;
}): RefundSucceededWebhookEvent {
  const normalized = OrderSchema.parse(order);

  return RefundSucceededWebhookEventSchema.parse({
    id: `evt_refund_${normalized.id}_${Date.parse(now)}`,
    type: "refund.succeeded",
    orderId: normalized.id,
    channel,
    amount: normalized.payableAmount,
    transactionId:
      transactionId ?? `refund_${normalized.id}_${Date.parse(now)}`,
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
  event: PaymentSucceededWebhookEvent
) {
  const normalizedOrder = OrderSchema.parse(order);
  const normalizedEvent = PaymentSucceededWebhookEventSchema.parse(event);

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

export function applyRefundSucceededWebhookToOrder(
  order: Order,
  event: RefundSucceededWebhookEvent
) {
  const normalizedOrder = OrderSchema.parse(order);
  const normalizedEvent = RefundSucceededWebhookEventSchema.parse(event);

  if (normalizedOrder.id !== normalizedEvent.orderId) {
    throw new Error("REFUND_WEBHOOK_ORDER_MISMATCH");
  }

  if (normalizedOrder.payableAmount !== normalizedEvent.amount) {
    throw new Error("REFUND_WEBHOOK_AMOUNT_MISMATCH");
  }

  const refund = RefundSchema.parse({
    id: `refund_${normalizedEvent.id}`,
    orderId: normalizedEvent.orderId,
    channel: normalizedEvent.channel,
    amount: normalizedEvent.amount,
    transactionId: normalizedEvent.transactionId,
    refundedAt: normalizedEvent.occurredAt,
  });

  return RefundWebhookProcessingResultSchema.parse({
    event: normalizedEvent,
    refund,
    order: markOrderRefunded(normalizedOrder),
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

export function requestOrderRefund(order: Order): Order {
  const normalized = OrderSchema.parse(order);

  if (normalized.status === "refunding") {
    return normalized;
  }

  if (normalized.status !== "paid") {
    throw new Error("INVALID_ORDER_REFUND_REQUEST_TRANSITION");
  }

  return OrderSchema.parse({
    ...normalized,
    status: "refunding",
  });
}

export function markOrderRefunded(order: Order): Order {
  const normalized = OrderSchema.parse(order);

  if (normalized.status === "refunded") {
    return normalized;
  }

  if (!["paid", "refunding"].includes(normalized.status)) {
    throw new Error("INVALID_ORDER_REFUND_TRANSITION");
  }

  return OrderSchema.parse({
    ...normalized,
    status: "refunded",
  });
}

export type PurchasableType = z.infer<typeof PurchasableTypeSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type PaymentChannel = z.infer<typeof PaymentChannelSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type Refund = z.infer<typeof RefundSchema>;
export type PaymentSucceededWebhookEvent = z.infer<
  typeof PaymentSucceededWebhookEventSchema
>;
export type RefundSucceededWebhookEvent = z.infer<
  typeof RefundSucceededWebhookEventSchema
>;
export type PaymentWebhookEvent = z.infer<typeof PaymentWebhookEventSchema>;
export type PaymentWebhookReceiptStatus = z.infer<
  typeof PaymentWebhookReceiptStatusSchema
>;
export type PaymentBusinessDomain = z.infer<typeof PaymentBusinessDomainSchema>;
export type PaymentReconciliationSeverity = z.infer<
  typeof PaymentReconciliationSeveritySchema
>;
export type PaymentReconciliationIssueCode = z.infer<
  typeof PaymentReconciliationIssueCodeSchema
>;
export type PaymentReconciliationIssue = z.infer<
  typeof PaymentReconciliationIssueSchema
>;
export type PaymentWebhookReceiptSnapshot = z.infer<
  typeof PaymentWebhookReceiptSnapshotSchema
>;
export type PaymentBusinessOrderSnapshot = z.infer<
  typeof PaymentBusinessOrderSnapshotSchema
>;
export type PaymentReconciliationEntry = z.infer<
  typeof PaymentReconciliationEntrySchema
>;
export type PaymentReconciliationSummary = z.infer<
  typeof PaymentReconciliationSummarySchema
>;
export type PaymentReconciliationConsole = z.infer<
  typeof PaymentReconciliationConsoleSchema
>;
export type OrderAdminStatusFilter = z.infer<
  typeof OrderAdminStatusFilterSchema
>;
export type OrderAdminItemTypeFilter = z.infer<
  typeof OrderAdminItemTypeFilterSchema
>;
export type OrderAdminListQuery = z.infer<typeof OrderAdminListQuerySchema>;
export type OrderAdminUserSummary = z.infer<typeof OrderAdminUserSummarySchema>;
export type OrderAdminTimelineEvent = z.infer<
  typeof OrderAdminTimelineEventSchema
>;
export type OrderAdminRelatedObject = z.infer<
  typeof OrderAdminRelatedObjectSchema
>;
export type OrderAdminPaymentReceiptSummary = z.infer<
  typeof OrderAdminPaymentReceiptSummarySchema
>;
export type OrderAdminListItem = z.infer<typeof OrderAdminListItemSchema>;
export type OrderAdminSummary = z.infer<typeof OrderAdminSummarySchema>;
export type OrderAdminListResult = z.infer<typeof OrderAdminListResultSchema>;
export type OrderAdminDetail = z.infer<typeof OrderAdminDetailSchema>;
export type PaymentWebhookProcessingResult = z.infer<
  typeof PaymentWebhookProcessingResultSchema
>;
export type RefundWebhookProcessingResult = z.infer<
  typeof RefundWebhookProcessingResultSchema
>;
