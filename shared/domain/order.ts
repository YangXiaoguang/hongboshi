import { z } from "zod";
import {
  DateTimeLikeSchema,
  EntityIdSchema,
  ISODateSchema,
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

export const OrderAdminActionReasonSchema = z.string().trim().min(2).max(240);

export const OrderAdminExceptionSeveritySchema = z.enum([
  "warning",
  "critical",
]);

export const OrderAdminExceptionFlagSchema = z.object({
  orderId: EntityIdSchema,
  status: z.enum(["open", "cleared"]),
  severity: OrderAdminExceptionSeveritySchema,
  reason: OrderAdminActionReasonSchema,
  markedBy: EntityIdSchema,
  markedAt: DateTimeLikeSchema,
  clearedBy: EntityIdSchema.optional(),
  clearedAt: DateTimeLikeSchema.optional(),
});

export const TRANSACTION_ADMIN_PAGE_SIZE = 12;
export const ALL_TRANSACTION_ADMIN_TYPE = "all";
export const ALL_TRANSACTION_ADMIN_CHANNEL = "all";
export const ALL_TRANSACTION_ADMIN_STATUS = "all";
export const ALL_TRANSACTION_ADMIN_ITEM_TYPE = "all";

export const TransactionAdminFlowTypeSchema = z.enum(["payment", "refund"]);

export const TransactionAdminFlowTypeFilterSchema = z.union([
  TransactionAdminFlowTypeSchema,
  z.literal(ALL_TRANSACTION_ADMIN_TYPE),
]);

export const TransactionAdminChannelFilterSchema = z.union([
  PaymentChannelSchema,
  z.literal(ALL_TRANSACTION_ADMIN_CHANNEL),
]);

export const TransactionAdminStatusFilterSchema = z.union([
  PaymentWebhookReceiptStatusSchema,
  z.literal(ALL_TRANSACTION_ADMIN_STATUS),
]);

export const TransactionAdminItemTypeFilterSchema = z.union([
  PurchasableTypeSchema,
  z.literal(ALL_TRANSACTION_ADMIN_ITEM_TYPE),
]);

export const TransactionAdminSortSchema = z.enum([
  "occurred_desc",
  "received_desc",
  "amount_desc",
]);

export const TransactionAdminListQuerySchema = PaginationQuerySchema.extend({
  keyword: z.string().trim().max(80).default(""),
  type: TransactionAdminFlowTypeFilterSchema.default(
    ALL_TRANSACTION_ADMIN_TYPE
  ),
  channel: TransactionAdminChannelFilterSchema.default(
    ALL_TRANSACTION_ADMIN_CHANNEL
  ),
  status: TransactionAdminStatusFilterSchema.default(
    ALL_TRANSACTION_ADMIN_STATUS
  ),
  itemType: TransactionAdminItemTypeFilterSchema.default(
    ALL_TRANSACTION_ADMIN_ITEM_TYPE
  ),
  fromDate: ISODateSchema.optional(),
  toDate: ISODateSchema.optional(),
  sort: TransactionAdminSortSchema.default("occurred_desc"),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(TRANSACTION_ADMIN_PAGE_SIZE),
});

export const TransactionAdminBusinessDomainSchema = z.enum([
  "course_access",
  "counseling",
]);

export const TransactionAdminBusinessObjectSchema = z.object({
  domain: TransactionAdminBusinessDomainSchema,
  type: PurchasableTypeSchema,
  targetId: z.string().min(1),
  title: z.string().min(1),
  status: z.string().min(1).optional(),
  counselorName: z.string().min(1).optional(),
});

export const TransactionAdminRelatedOrderSchema = z.object({
  id: EntityIdSchema,
  status: OrderStatusSchema,
  user: OrderAdminUserSummarySchema,
  itemTypes: z.array(PurchasableTypeSchema).min(1),
  primaryTitle: z.string().min(1),
  payableAmount: MoneyAmountSchema,
  paidAt: DateTimeLikeSchema.optional(),
  exception: OrderAdminExceptionFlagSchema.optional(),
});

export const TransactionAdminSeveritySchema = z.enum([
  "ok",
  "warning",
  "critical",
]);

export const TransactionAdminIssueCodeSchema = z.enum([
  "webhook_processing",
  "webhook_failed",
  "order_missing",
  "order_amount_mismatch",
  "order_status_not_settled",
  "refund_order_not_completed",
  "refund_business_not_completed",
  "order_exception_open",
  "transaction_work_order_open",
]);

export const TransactionAdminIssueSchema = z.object({
  code: TransactionAdminIssueCodeSchema,
  severity: TransactionAdminSeveritySchema.exclude(["ok"]),
  message: z.string().min(1),
});

export const TransactionAdminActionReasonSchema = z
  .string()
  .trim()
  .min(4)
  .max(240);

export const TransactionAdminWorkOrderStatusSchema = z.enum([
  "open",
  "resolved",
]);

export const TransactionAdminActionSchema = z.enum([
  "request_refund",
  "mark_exception",
  "resolve_exception",
]);

export const TransactionAdminActionRequestSchema = z.discriminatedUnion(
  "action",
  [
    z.object({
      action: z.literal("request_refund"),
      reason: TransactionAdminActionReasonSchema,
    }),
    z.object({
      action: z.literal("mark_exception"),
      severity: OrderAdminExceptionSeveritySchema.default("warning"),
      reason: TransactionAdminActionReasonSchema,
    }),
    z.object({
      action: z.literal("resolve_exception"),
      reason: TransactionAdminActionReasonSchema,
    }),
  ]
);

export const TransactionAdminWorkOrderSchema = z.object({
  id: EntityIdSchema,
  transactionId: EntityIdSchema,
  orderId: EntityIdSchema,
  status: TransactionAdminWorkOrderStatusSchema,
  severity: OrderAdminExceptionSeveritySchema,
  reason: TransactionAdminActionReasonSchema,
  markedBy: EntityIdSchema,
  markedAt: DateTimeLikeSchema,
  resolvedBy: EntityIdSchema.optional(),
  resolvedAt: DateTimeLikeSchema.optional(),
  resolution: TransactionAdminActionReasonSchema.optional(),
});

export const TransactionAdminAuditSnapshotSchema = z.object({
  orderStatus: OrderStatusSchema.optional(),
  workOrder: TransactionAdminWorkOrderSchema.optional(),
});

export const TransactionAdminAuditEventSchema = z.object({
  id: EntityIdSchema,
  transactionId: EntityIdSchema,
  orderId: EntityIdSchema,
  userId: EntityIdSchema,
  actorId: EntityIdSchema,
  actorRoles: z.array(z.string().min(1)).min(1),
  action: TransactionAdminActionSchema,
  reason: TransactionAdminActionReasonSchema,
  before: TransactionAdminAuditSnapshotSchema,
  after: TransactionAdminAuditSnapshotSchema,
  createdAt: DateTimeLikeSchema,
});

export const TransactionAdminListItemSchema = z.object({
  id: EntityIdSchema,
  type: TransactionAdminFlowTypeSchema,
  eventType: z.enum(["payment.succeeded", "refund.succeeded"]),
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
  user: OrderAdminUserSummarySchema.optional(),
  relatedOrder: TransactionAdminRelatedOrderSchema.optional(),
  businessObjects: z.array(TransactionAdminBusinessObjectSchema).default([]),
  itemTypes: z.array(PurchasableTypeSchema).default([]),
  primaryTitle: z.string().min(1),
  workOrder: TransactionAdminWorkOrderSchema.optional(),
  severity: TransactionAdminSeveritySchema,
  issues: z.array(TransactionAdminIssueSchema),
});

export const TransactionAdminSummarySchema = z.object({
  totalCount: z.number().int().nonnegative(),
  paymentCount: z.number().int().nonnegative(),
  refundCount: z.number().int().nonnegative(),
  processedCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  processingCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
  criticalCount: z.number().int().nonnegative(),
  grossPaymentAmount: MoneyAmountSchema,
  refundAmount: MoneyAmountSchema,
  netAmount: z.number().finite(),
});

export const TransactionAdminFilterOptionsSchema = z.object({
  types: z.array(TransactionAdminFlowTypeSchema),
  channels: z.array(PaymentChannelSchema),
  statuses: z.array(PaymentWebhookReceiptStatusSchema),
  itemTypes: z.array(PurchasableTypeSchema),
});

export const TransactionAdminListResultSchema = z.object({
  items: z.array(TransactionAdminListItemSchema),
  meta: PageMetaSchema,
  summary: TransactionAdminSummarySchema,
  filters: TransactionAdminFilterOptionsSchema,
  query: TransactionAdminListQuerySchema,
  serverTime: DateTimeLikeSchema,
});

export const TransactionAdminTimelineEventTypeSchema = z.enum([
  "webhook_received",
  "webhook_processed",
  "webhook_failed",
  "order_status",
  "business_status",
  "order_exception",
  "transaction_work_order",
]);

export const TransactionAdminTimelineEventSchema = z.object({
  type: TransactionAdminTimelineEventTypeSchema,
  label: z.string().min(1),
  occurredAt: DateTimeLikeSchema,
  detail: z.string().min(1).optional(),
});

export const TransactionAdminDetailSchema = z.object({
  transaction: TransactionAdminListItemSchema,
  relatedOrder: TransactionAdminRelatedOrderSchema.optional(),
  businessObjects: z.array(TransactionAdminBusinessObjectSchema),
  timeline: z.array(TransactionAdminTimelineEventSchema),
  receipt: PaymentWebhookReceiptSnapshotSchema,
  auditEvents: z.array(TransactionAdminAuditEventSchema).default([]),
  privacyNotice: z.string().min(1),
  generatedAt: DateTimeLikeSchema,
});

export const TransactionAdminMutationResultSchema = z.object({
  detail: TransactionAdminDetailSchema,
  auditEvent: TransactionAdminAuditEventSchema,
  auditEvents: z.array(TransactionAdminAuditEventSchema),
  serverTime: DateTimeLikeSchema,
});

export const OrderAdminActionSchema = z.enum([
  "close_pending",
  "mark_exception",
  "clear_exception",
]);

export const OrderAdminActionRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("close_pending"),
    reason: OrderAdminActionReasonSchema,
  }),
  z.object({
    action: z.literal("mark_exception"),
    severity: OrderAdminExceptionSeveritySchema.default("warning"),
    reason: OrderAdminActionReasonSchema,
  }),
  z.object({
    action: z.literal("clear_exception"),
    reason: OrderAdminActionReasonSchema,
  }),
]);

export const OrderAdminAuditSnapshotSchema = z.object({
  status: OrderStatusSchema,
  exception: OrderAdminExceptionFlagSchema.optional(),
});

export const OrderAdminAuditEventSchema = z.object({
  id: EntityIdSchema,
  orderId: EntityIdSchema,
  userId: EntityIdSchema,
  actorId: EntityIdSchema,
  actorRoles: z.array(z.string().min(1)).min(1),
  action: OrderAdminActionSchema,
  reason: OrderAdminActionReasonSchema,
  before: OrderAdminAuditSnapshotSchema,
  after: OrderAdminAuditSnapshotSchema,
  createdAt: DateTimeLikeSchema,
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
  exception: OrderAdminExceptionFlagSchema.optional(),
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
  auditEvents: z.array(OrderAdminAuditEventSchema).default([]),
  privacyNotice: z.string().min(1),
  generatedAt: DateTimeLikeSchema,
});

export const OrderAdminMutationResultSchema = z.object({
  detail: OrderAdminDetailSchema,
  auditEvent: OrderAdminAuditEventSchema,
  serverTime: DateTimeLikeSchema,
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
export type OrderAdminExceptionSeverity = z.infer<
  typeof OrderAdminExceptionSeveritySchema
>;
export type OrderAdminExceptionFlag = z.infer<
  typeof OrderAdminExceptionFlagSchema
>;
export type TransactionAdminFlowType = z.infer<
  typeof TransactionAdminFlowTypeSchema
>;
export type TransactionAdminFlowTypeFilter = z.infer<
  typeof TransactionAdminFlowTypeFilterSchema
>;
export type TransactionAdminChannelFilter = z.infer<
  typeof TransactionAdminChannelFilterSchema
>;
export type TransactionAdminStatusFilter = z.infer<
  typeof TransactionAdminStatusFilterSchema
>;
export type TransactionAdminItemTypeFilter = z.infer<
  typeof TransactionAdminItemTypeFilterSchema
>;
export type TransactionAdminListQuery = z.infer<
  typeof TransactionAdminListQuerySchema
>;
export type TransactionAdminBusinessDomain = z.infer<
  typeof TransactionAdminBusinessDomainSchema
>;
export type TransactionAdminBusinessObject = z.infer<
  typeof TransactionAdminBusinessObjectSchema
>;
export type TransactionAdminRelatedOrder = z.infer<
  typeof TransactionAdminRelatedOrderSchema
>;
export type TransactionAdminSeverity = z.infer<
  typeof TransactionAdminSeveritySchema
>;
export type TransactionAdminIssueCode = z.infer<
  typeof TransactionAdminIssueCodeSchema
>;
export type TransactionAdminIssue = z.infer<typeof TransactionAdminIssueSchema>;
export type TransactionAdminActionReason = z.infer<
  typeof TransactionAdminActionReasonSchema
>;
export type TransactionAdminWorkOrderStatus = z.infer<
  typeof TransactionAdminWorkOrderStatusSchema
>;
export type TransactionAdminAction = z.infer<
  typeof TransactionAdminActionSchema
>;
export type TransactionAdminActionRequest = z.infer<
  typeof TransactionAdminActionRequestSchema
>;
export type TransactionAdminWorkOrder = z.infer<
  typeof TransactionAdminWorkOrderSchema
>;
export type TransactionAdminAuditSnapshot = z.infer<
  typeof TransactionAdminAuditSnapshotSchema
>;
export type TransactionAdminAuditEvent = z.infer<
  typeof TransactionAdminAuditEventSchema
>;
export type TransactionAdminListItem = z.infer<
  typeof TransactionAdminListItemSchema
>;
export type TransactionAdminSummary = z.infer<
  typeof TransactionAdminSummarySchema
>;
export type TransactionAdminFilterOptions = z.infer<
  typeof TransactionAdminFilterOptionsSchema
>;
export type TransactionAdminListResult = z.infer<
  typeof TransactionAdminListResultSchema
>;
export type TransactionAdminTimelineEventType = z.infer<
  typeof TransactionAdminTimelineEventTypeSchema
>;
export type TransactionAdminTimelineEvent = z.infer<
  typeof TransactionAdminTimelineEventSchema
>;
export type TransactionAdminDetail = z.infer<
  typeof TransactionAdminDetailSchema
>;
export type TransactionAdminMutationResult = z.infer<
  typeof TransactionAdminMutationResultSchema
>;
export type OrderAdminAction = z.infer<typeof OrderAdminActionSchema>;
export type OrderAdminActionRequest = z.infer<
  typeof OrderAdminActionRequestSchema
>;
export type OrderAdminAuditSnapshot = z.infer<
  typeof OrderAdminAuditSnapshotSchema
>;
export type OrderAdminAuditEvent = z.infer<typeof OrderAdminAuditEventSchema>;
export type OrderAdminListItem = z.infer<typeof OrderAdminListItemSchema>;
export type OrderAdminSummary = z.infer<typeof OrderAdminSummarySchema>;
export type OrderAdminListResult = z.infer<typeof OrderAdminListResultSchema>;
export type OrderAdminDetail = z.infer<typeof OrderAdminDetailSchema>;
export type OrderAdminMutationResult = z.infer<
  typeof OrderAdminMutationResultSchema
>;
export type PaymentWebhookProcessingResult = z.infer<
  typeof PaymentWebhookProcessingResultSchema
>;
export type RefundWebhookProcessingResult = z.infer<
  typeof RefundWebhookProcessingResultSchema
>;
