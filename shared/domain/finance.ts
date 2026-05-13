import { z } from "zod";
import {
  DateTimeLikeSchema,
  EntityIdSchema,
  ISODateSchema,
  MoneyAmountSchema,
  PageMetaSchema,
  PaginationQuerySchema,
} from "./common";
import {
  ALL_TRANSACTION_ADMIN_CHANNEL,
  ALL_TRANSACTION_ADMIN_ITEM_TYPE,
  OrderAdminUserSummarySchema,
  PaymentChannelSchema,
  PurchasableTypeSchema,
} from "./order";

export const FINANCE_ADMIN_PAGE_SIZE = 12;
export const ALL_FINANCE_ADMIN_CHANNEL = ALL_TRANSACTION_ADMIN_CHANNEL;
export const ALL_FINANCE_ADMIN_ITEM_TYPE = ALL_TRANSACTION_ADMIN_ITEM_TYPE;

export const FinanceAdminEntryTypeSchema = z.enum([
  "payment",
  "refund",
  "pending_refund",
  "exception",
]);

export const FinanceAdminSeveritySchema = z.enum([
  "ok",
  "warning",
  "critical",
]);

export const FinanceAdminChannelFilterSchema = z.union([
  PaymentChannelSchema,
  z.literal(ALL_FINANCE_ADMIN_CHANNEL),
]);

export const FinanceAdminItemTypeFilterSchema = z.union([
  PurchasableTypeSchema,
  z.literal(ALL_FINANCE_ADMIN_ITEM_TYPE),
]);

export const FinanceAdminSortSchema = z.enum([
  "occurred_desc",
  "amount_desc",
]);

export const FinanceAdminQuerySchema = PaginationQuerySchema.extend({
  keyword: z.string().trim().max(80).default(""),
  channel: FinanceAdminChannelFilterSchema.default(
    ALL_FINANCE_ADMIN_CHANNEL
  ),
  itemType: FinanceAdminItemTypeFilterSchema.default(
    ALL_FINANCE_ADMIN_ITEM_TYPE
  ),
  fromDate: ISODateSchema.optional(),
  toDate: ISODateSchema.optional(),
  sort: FinanceAdminSortSchema.default("occurred_desc"),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(FINANCE_ADMIN_PAGE_SIZE),
});

export const FinanceAdminEntrySchema = z.object({
  id: EntityIdSchema,
  type: FinanceAdminEntryTypeSchema,
  orderId: EntityIdSchema,
  user: OrderAdminUserSummarySchema,
  primaryTitle: z.string().min(1),
  itemTypes: z.array(PurchasableTypeSchema).min(1),
  channel: PaymentChannelSchema.optional(),
  amount: MoneyAmountSchema,
  occurredAt: DateTimeLikeSchema,
  sourceStatus: z.string().min(1),
  transactionId: z.string().min(1).optional(),
  receiptId: EntityIdSchema.optional(),
  reason: z.string().min(1).optional(),
  severity: FinanceAdminSeveritySchema,
});

export const FinanceAdminSummarySchema = z.object({
  entryCount: z.number().int().nonnegative(),
  paymentCount: z.number().int().nonnegative(),
  refundCount: z.number().int().nonnegative(),
  pendingRefundCount: z.number().int().nonnegative(),
  exceptionCount: z.number().int().nonnegative(),
  grossRevenueAmount: MoneyAmountSchema,
  refundAmount: MoneyAmountSchema,
  netRevenueAmount: z.number().finite(),
  pendingRefundAmount: MoneyAmountSchema,
  exceptionAmount: MoneyAmountSchema,
});

export const FinanceAdminChannelBreakdownSchema = z.object({
  channel: PaymentChannelSchema,
  label: z.string().min(1),
  amount: z.number().finite(),
  count: z.number().int().nonnegative(),
});

export const FinanceAdminItemTypeBreakdownSchema = z.object({
  itemType: PurchasableTypeSchema,
  label: z.string().min(1),
  amount: z.number().finite(),
  count: z.number().int().nonnegative(),
});

export const FinanceAdminMetricPolicySchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
});

export const FinanceAdminFilterOptionsSchema = z.object({
  channels: z.array(PaymentChannelSchema),
  itemTypes: z.array(PurchasableTypeSchema),
});

export const FinanceAdminOverviewSchema = z.object({
  items: z.array(FinanceAdminEntrySchema),
  meta: PageMetaSchema,
  summary: FinanceAdminSummarySchema,
  channelBreakdown: z.array(FinanceAdminChannelBreakdownSchema),
  itemTypeBreakdown: z.array(FinanceAdminItemTypeBreakdownSchema),
  policies: z.array(FinanceAdminMetricPolicySchema),
  filters: FinanceAdminFilterOptionsSchema,
  query: FinanceAdminQuerySchema,
  serverTime: DateTimeLikeSchema,
});

export type FinanceAdminEntryType = z.infer<
  typeof FinanceAdminEntryTypeSchema
>;
export type FinanceAdminSeverity = z.infer<typeof FinanceAdminSeveritySchema>;
export type FinanceAdminQuery = z.infer<typeof FinanceAdminQuerySchema>;
export type FinanceAdminEntry = z.infer<typeof FinanceAdminEntrySchema>;
export type FinanceAdminSummary = z.infer<typeof FinanceAdminSummarySchema>;
export type FinanceAdminOverview = z.infer<typeof FinanceAdminOverviewSchema>;
