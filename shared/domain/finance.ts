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
export const FINANCE_ADMIN_EXPORT_POLICY_VERSION = "finance-admin-csv-v1";
export const FINANCE_ADMIN_RULE_POLICY_VERSION = "finance-admin-rules-v1";

export const FinanceAdminEntryTypeSchema = z.enum([
  "payment",
  "refund",
  "pending_refund",
  "exception",
]);

export const FinanceAdminSeveritySchema = z.enum(["ok", "warning", "critical"]);

export const FinanceAdminChannelFilterSchema = z.union([
  PaymentChannelSchema,
  z.literal(ALL_FINANCE_ADMIN_CHANNEL),
]);

export const FinanceAdminItemTypeFilterSchema = z.union([
  PurchasableTypeSchema,
  z.literal(ALL_FINANCE_ADMIN_ITEM_TYPE),
]);

export const FinanceAdminSortSchema = z.enum(["occurred_desc", "amount_desc"]);

export const FinanceAdminQuerySchema = PaginationQuerySchema.extend({
  keyword: z.string().trim().max(80).default(""),
  channel: FinanceAdminChannelFilterSchema.default(ALL_FINANCE_ADMIN_CHANNEL),
  itemType: FinanceAdminItemTypeFilterSchema.default(
    ALL_FINANCE_ADMIN_ITEM_TYPE
  ),
  fromDate: ISODateSchema.optional(),
  toDate: ISODateSchema.optional(),
  sort: FinanceAdminSortSchema.default("occurred_desc"),
  pageSize: z.number().int().min(1).max(50).default(FINANCE_ADMIN_PAGE_SIZE),
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

export const FinanceAdminExportFormatSchema = z.literal("csv");

export const FinanceAdminExportQuerySchema = FinanceAdminQuerySchema.omit({
  page: true,
  pageSize: true,
}).extend({
  format: FinanceAdminExportFormatSchema.default("csv"),
});

export const FinanceAdminExportFieldKeySchema = z.enum([
  "occurredAt",
  "entryType",
  "orderId",
  "userId",
  "userDisplayName",
  "userPhoneMasked",
  "itemTypes",
  "primaryTitle",
  "channel",
  "amount",
  "sourceStatus",
  "severity",
  "transactionId",
  "receiptId",
  "reason",
  "accountingPeriod",
  "feeAmount",
  "settlementBatchId",
  "invoiceStatus",
]);

export const FINANCE_ADMIN_EXPORT_FIELDS = [
  {
    key: "occurredAt",
    label: "发生时间",
    description: "财务事项对应的支付、退款或异常发生时间。",
  },
  {
    key: "entryType",
    label: "事项类型",
    description: "收入、退款、退款中或异常。",
  },
  {
    key: "orderId",
    label: "订单ID",
    description: "关联业务订单 ID。",
  },
  {
    key: "userId",
    label: "用户ID",
    description: "脱敏财务核查所需用户 ID。",
  },
  {
    key: "userDisplayName",
    label: "用户名称",
    description: "用户展示名。",
  },
  {
    key: "userPhoneMasked",
    label: "脱敏手机号",
    description: "仅输出脱敏手机号。",
  },
  {
    key: "itemTypes",
    label: "业务类型",
    description: "课程、会员、咨询或测评。",
  },
  {
    key: "primaryTitle",
    label: "商品标题",
    description: "订单主商品标题。",
  },
  {
    key: "channel",
    label: "支付渠道",
    description: "支付或退款渠道。",
  },
  {
    key: "amount",
    label: "金额",
    description: "当前财务事项金额。",
  },
  {
    key: "sourceStatus",
    label: "来源状态",
    description: "支付回调、订单或工单来源状态。",
  },
  {
    key: "severity",
    label: "异常等级",
    description: "正常、提醒或严重。",
  },
  {
    key: "transactionId",
    label: "交易号",
    description: "渠道或模拟交易号。",
  },
  {
    key: "receiptId",
    label: "回调收据ID",
    description: "支付回调收据 ID。",
  },
  {
    key: "reason",
    label: "财务备注",
    description: "财务口径或异常说明。",
  },
  {
    key: "accountingPeriod",
    label: "账期",
    description: "按发生时间预留的 YYYY-MM 账期。",
    reserved: true,
  },
  {
    key: "feeAmount",
    label: "手续费",
    description: "渠道手续费预留字段，当前默认为 0。",
    reserved: true,
  },
  {
    key: "settlementBatchId",
    label: "结算批次",
    description: "渠道结算批次预留字段。",
    reserved: true,
  },
  {
    key: "invoiceStatus",
    label: "发票状态",
    description: "发票流转预留字段。",
    reserved: true,
  },
] as const;

export const FinanceAdminExportFieldSchema = z.object({
  key: FinanceAdminExportFieldKeySchema,
  label: z.string().min(1),
  description: z.string().min(1),
  reserved: z.boolean().default(false),
});

export const FinanceAdminInvoiceStatusSchema = z.enum([
  "not_requested",
  "pending",
  "issued",
  "voided",
]);

export const FinanceAdminExportRowSchema = z.object({
  occurredAt: DateTimeLikeSchema,
  entryType: FinanceAdminEntryTypeSchema,
  orderId: EntityIdSchema,
  userId: EntityIdSchema,
  userDisplayName: z.string().min(1),
  userPhoneMasked: z.string().optional(),
  itemTypes: z.array(PurchasableTypeSchema).min(1),
  primaryTitle: z.string().min(1),
  channel: PaymentChannelSchema.optional(),
  amount: MoneyAmountSchema,
  sourceStatus: z.string().min(1),
  severity: FinanceAdminSeveritySchema,
  transactionId: z.string().min(1).optional(),
  receiptId: EntityIdSchema.optional(),
  reason: z.string().min(1).optional(),
  accountingPeriod: z.string().regex(/^\d{4}-\d{2}$/),
  feeAmount: MoneyAmountSchema.default(0),
  settlementBatchId: z.string().default(""),
  invoiceStatus: FinanceAdminInvoiceStatusSchema.default("not_requested"),
});

export const FinanceAdminExportMetadataSchema = z.object({
  exportId: EntityIdSchema,
  format: FinanceAdminExportFormatSchema,
  filename: z.string().min(1),
  generatedAt: DateTimeLikeSchema,
  generatedBy: z.object({
    id: EntityIdSchema,
    roles: z.array(z.string().min(1)).min(1),
  }),
  query: FinanceAdminExportQuerySchema,
  summary: FinanceAdminSummarySchema,
  rowCount: z.number().int().nonnegative(),
  policyVersion: z.literal(FINANCE_ADMIN_EXPORT_POLICY_VERSION),
  fields: z.array(FinanceAdminExportFieldSchema).min(1),
});

export const FinanceAdminExportSchema = z.object({
  metadata: FinanceAdminExportMetadataSchema,
  rows: z.array(FinanceAdminExportRowSchema),
  csv: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.literal("text/csv; charset=utf-8"),
});

export const FinanceAdminAccountingPeriodStrategySchema =
  z.literal("natural_month");

export const FinanceAdminAccountingPeriodSchema = z.object({
  periodId: z.string().regex(/^\d{4}-\d{2}$/),
  label: z.string().min(1).max(32),
  startsAt: DateTimeLikeSchema,
  endsAt: DateTimeLikeSchema,
  strategy: FinanceAdminAccountingPeriodStrategySchema.default("natural_month"),
});

export const FinanceAdminChannelFeeRuleSchema = z.object({
  channel: PaymentChannelSchema,
  rate: z.number().min(0).max(0.2),
  fixedFeeAmount: MoneyAmountSchema.default(0),
  minimumFeeAmount: MoneyAmountSchema.default(0),
  effectiveFrom: DateTimeLikeSchema,
  effectiveTo: DateTimeLikeSchema.optional(),
  description: z.string().trim().min(1).max(120),
});

export const FinanceAdminRuleConfigSchema = z.object({
  version: z.string().min(1),
  policyVersion: z.literal(FINANCE_ADMIN_RULE_POLICY_VERSION),
  accountingPeriodStrategy:
    FinanceAdminAccountingPeriodStrategySchema.default("natural_month"),
  activePeriod: FinanceAdminAccountingPeriodSchema,
  channelFeeRules: z.array(FinanceAdminChannelFeeRuleSchema).min(1),
  updatedAt: DateTimeLikeSchema,
  updatedBy: EntityIdSchema.optional(),
  notes: z.string().trim().max(240).optional(),
});

export const FinanceAdminRuleUpdateRequestSchema = z.object({
  channelFeeRules: z.array(FinanceAdminChannelFeeRuleSchema).min(1),
  notes: z.string().trim().max(240).optional(),
});

export const FinanceAdminSettlementChannelPreviewSchema = z.object({
  channel: PaymentChannelSchema,
  label: z.string().min(1),
  rate: z.number().min(0).max(0.2),
  fixedFeeAmount: MoneyAmountSchema,
  minimumFeeAmount: MoneyAmountSchema,
  grossRevenueAmount: MoneyAmountSchema,
  refundAmount: MoneyAmountSchema,
  netRevenueAmount: z.number().finite(),
  estimatedFeeAmount: MoneyAmountSchema,
  estimatedSettlementAmount: z.number().finite(),
  entryCount: z.number().int().nonnegative(),
});

export const FinanceAdminSettlementPreviewSchema = z.object({
  period: FinanceAdminAccountingPeriodSchema,
  generatedAt: DateTimeLikeSchema,
  policyVersion: z.literal(FINANCE_ADMIN_RULE_POLICY_VERSION),
  entryCount: z.number().int().nonnegative(),
  paymentCount: z.number().int().nonnegative(),
  refundCount: z.number().int().nonnegative(),
  grossRevenueAmount: MoneyAmountSchema,
  refundAmount: MoneyAmountSchema,
  netRevenueAmount: z.number().finite(),
  estimatedFeeAmount: MoneyAmountSchema,
  estimatedSettlementAmount: z.number().finite(),
  pendingRefundAmount: MoneyAmountSchema,
  exceptionUnsettledAmount: MoneyAmountSchema,
  channelPreviews: z.array(FinanceAdminSettlementChannelPreviewSchema),
});

export const FinanceAdminRuleConsoleSchema = z.object({
  rules: FinanceAdminRuleConfigSchema,
  preview: FinanceAdminSettlementPreviewSchema,
  canManage: z.boolean(),
  serverTime: DateTimeLikeSchema,
});

export const FinanceAdminRuleMutationResultSchema = z.object({
  rules: FinanceAdminRuleConfigSchema,
  preview: FinanceAdminSettlementPreviewSchema,
});

export type FinanceAdminEntryType = z.infer<typeof FinanceAdminEntryTypeSchema>;
export type FinanceAdminSeverity = z.infer<typeof FinanceAdminSeveritySchema>;
export type FinanceAdminQuery = z.infer<typeof FinanceAdminQuerySchema>;
export type FinanceAdminEntry = z.infer<typeof FinanceAdminEntrySchema>;
export type FinanceAdminSummary = z.infer<typeof FinanceAdminSummarySchema>;
export type FinanceAdminOverview = z.infer<typeof FinanceAdminOverviewSchema>;
export type FinanceAdminExportQuery = z.infer<
  typeof FinanceAdminExportQuerySchema
>;
export type FinanceAdminExportRow = z.infer<typeof FinanceAdminExportRowSchema>;
export type FinanceAdminExportMetadata = z.infer<
  typeof FinanceAdminExportMetadataSchema
>;
export type FinanceAdminExport = z.infer<typeof FinanceAdminExportSchema>;
export type FinanceAdminAccountingPeriod = z.infer<
  typeof FinanceAdminAccountingPeriodSchema
>;
export type FinanceAdminChannelFeeRule = z.infer<
  typeof FinanceAdminChannelFeeRuleSchema
>;
export type FinanceAdminRuleConfig = z.infer<
  typeof FinanceAdminRuleConfigSchema
>;
export type FinanceAdminRuleUpdateRequest = z.infer<
  typeof FinanceAdminRuleUpdateRequestSchema
>;
export type FinanceAdminSettlementChannelPreview = z.infer<
  typeof FinanceAdminSettlementChannelPreviewSchema
>;
export type FinanceAdminSettlementPreview = z.infer<
  typeof FinanceAdminSettlementPreviewSchema
>;
export type FinanceAdminRuleConsole = z.infer<
  typeof FinanceAdminRuleConsoleSchema
>;
export type FinanceAdminRuleMutationResult = z.infer<
  typeof FinanceAdminRuleMutationResultSchema
>;
