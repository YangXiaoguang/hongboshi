import { z } from "zod";
import {
  DateTimeLikeSchema,
  EntityIdSchema,
  PageMetaSchema,
  PaginationQuerySchema,
} from "./common";

export const ALL_AUDIT_CENTER_MODULE = "all";
export const AUDIT_CENTER_PAGE_SIZE = 20;
export const AUDIT_CENTER_EXPORT_POLICY_VERSION = "audit-center-csv-v1";
export const AUDIT_CENTER_CSV_CONTENT_TYPE = "text/csv; charset=utf-8";

export const AuditCenterModuleSchema = z.enum([
  "catalog",
  "user",
  "order",
  "transaction",
  "counseling",
  "risk",
]);

export const AuditCenterModuleFilterSchema = z.union([
  AuditCenterModuleSchema,
  z.literal(ALL_AUDIT_CENTER_MODULE),
]);

export const AuditCenterQuerySchema = PaginationQuerySchema.extend({
  module: AuditCenterModuleFilterSchema.default(ALL_AUDIT_CENTER_MODULE),
  action: z.string().trim().min(1).max(80).optional(),
  actorId: EntityIdSchema.optional(),
  resourceKeyword: z.string().trim().min(1).max(120).optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  pageSize: z.number().int().min(1).max(100).default(AUDIT_CENTER_PAGE_SIZE),
});

export const AuditCenterActorSchema = z.object({
  id: EntityIdSchema.optional(),
  roles: z.array(z.string().min(1)).default([]),
});

export const AuditCenterResourceSchema = z.object({
  type: z.string().min(1).max(80),
  id: EntityIdSchema.optional(),
  label: z.string().min(1).max(160).optional(),
});

export const AuditCenterEventSchema = z.object({
  id: EntityIdSchema,
  sourceEventId: EntityIdSchema,
  module: AuditCenterModuleSchema,
  action: z.string().min(1).max(80),
  resource: AuditCenterResourceSchema,
  actor: AuditCenterActorSchema,
  reason: z.string().min(1).max(500).optional(),
  summary: z.string().min(1).max(300),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  occurredAt: DateTimeLikeSchema,
});

export const AuditCenterModuleCountSchema = z.object({
  module: AuditCenterModuleSchema,
  count: z.number().int().nonnegative(),
});

export const AuditCenterSummarySchema = z.object({
  totalCount: z.number().int().nonnegative(),
  moduleCounts: z.array(AuditCenterModuleCountSchema),
});

export const AuditCenterFilterOptionsSchema = z.object({
  modules: z.array(AuditCenterModuleSchema),
  actions: z.array(z.string().min(1).max(80)),
});

export const AuditCenterListResultSchema = z.object({
  items: z.array(AuditCenterEventSchema),
  meta: PageMetaSchema,
  summary: AuditCenterSummarySchema,
  filters: AuditCenterFilterOptionsSchema,
  query: AuditCenterQuerySchema,
  privacyNotice: z.string().min(1),
  generatedAt: DateTimeLikeSchema,
});

export const AuditCenterExportFormatSchema = z.literal("csv");

export const AuditCenterExportQuerySchema = AuditCenterQuerySchema.omit({
  page: true,
  pageSize: true,
}).extend({
  format: AuditCenterExportFormatSchema.default("csv"),
});

export const AuditCenterExportFieldKeySchema = z.enum([
  "occurredAt",
  "module",
  "action",
  "resourceType",
  "resourceId",
  "resourceLabel",
  "actorId",
  "actorRoles",
  "reason",
  "summary",
  "sourceEventId",
  "auditEventId",
  "beforeSummary",
  "afterSummary",
]);

export const AUDIT_CENTER_EXPORT_FIELDS = [
  {
    key: "occurredAt",
    label: "发生时间",
    description: "审计事件发生时间。",
  },
  {
    key: "module",
    label: "模块",
    description: "事件来源业务模块。",
  },
  {
    key: "action",
    label: "动作",
    description: "后台操作动作稳定值。",
  },
  {
    key: "resourceType",
    label: "资源类型",
    description: "被操作资源类型。",
  },
  {
    key: "resourceId",
    label: "资源ID",
    description: "被操作资源 ID。",
  },
  {
    key: "resourceLabel",
    label: "资源名称",
    description: "便于运营识别的资源名称或摘要。",
  },
  {
    key: "actorId",
    label: "操作者ID",
    description: "执行后台操作的账号 ID。",
  },
  {
    key: "actorRoles",
    label: "操作者角色",
    description: "执行后台操作时记录的角色集合。",
  },
  {
    key: "reason",
    label: "操作原因",
    description: "后台动作提交时记录的原因或备注摘要。",
  },
  {
    key: "summary",
    label: "事件摘要",
    description: "审计中心归一化后的事件说明。",
  },
  {
    key: "sourceEventId",
    label: "源事件ID",
    description: "来源业务模块中的原始审计事件 ID。",
  },
  {
    key: "auditEventId",
    label: "审计中心事件ID",
    description: "审计中心归一化后的稳定事件 ID。",
  },
  {
    key: "beforeSummary",
    label: "变更前摘要",
    description: "隐私最小化后的变更前状态摘要。",
  },
  {
    key: "afterSummary",
    label: "变更后摘要",
    description: "隐私最小化后的变更后状态摘要。",
  },
] as const;

export const AuditCenterExportFieldSchema = z.object({
  key: AuditCenterExportFieldKeySchema,
  label: z.string().min(1),
  description: z.string().min(1),
});

export const AuditCenterExportRowSchema = z.object({
  occurredAt: DateTimeLikeSchema,
  module: AuditCenterModuleSchema,
  action: z.string().min(1).max(80),
  resourceType: z.string().min(1).max(80),
  resourceId: z.string().default(""),
  resourceLabel: z.string().default(""),
  actorId: z.string().default(""),
  actorRoles: z.array(z.string().min(1)).default([]),
  reason: z.string().default(""),
  summary: z.string().min(1).max(300),
  sourceEventId: EntityIdSchema,
  auditEventId: EntityIdSchema,
  beforeSummary: z.string().max(1200).default(""),
  afterSummary: z.string().max(1200).default(""),
});

export const AuditCenterExportMetadataSchema = z.object({
  exportId: EntityIdSchema,
  format: AuditCenterExportFormatSchema,
  filename: z.string().min(1),
  generatedAt: DateTimeLikeSchema,
  generatedBy: z.object({
    id: EntityIdSchema,
    roles: z.array(z.string().min(1)).min(1),
  }),
  query: AuditCenterExportQuerySchema,
  summary: AuditCenterSummarySchema,
  rowCount: z.number().int().nonnegative(),
  policyVersion: z.literal(AUDIT_CENTER_EXPORT_POLICY_VERSION),
  fields: z.array(AuditCenterExportFieldSchema).min(1),
  privacyNotice: z.string().min(1),
});

export const AuditCenterExportSchema = z.object({
  metadata: AuditCenterExportMetadataSchema,
  rows: z.array(AuditCenterExportRowSchema),
  csv: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.literal(AUDIT_CENTER_CSV_CONTENT_TYPE),
});

export const AuditCenterSourceTraceSchema = z.object({
  module: AuditCenterModuleSchema,
  sourceEventId: EntityIdSchema,
  resourceType: z.string().min(1).max(80),
  resourceId: EntityIdSchema.optional(),
  resourceLabel: z.string().min(1).max(160).optional(),
  traceHint: z.string().min(1),
});

export const AuditCenterDetailResultSchema = z.object({
  event: AuditCenterEventSchema,
  source: AuditCenterSourceTraceSchema,
  privacyNotice: z.string().min(1),
  generatedAt: DateTimeLikeSchema,
});

export type AuditCenterModule = z.infer<typeof AuditCenterModuleSchema>;
export type AuditCenterQuery = z.infer<typeof AuditCenterQuerySchema>;
export type AuditCenterEvent = z.infer<typeof AuditCenterEventSchema>;
export type AuditCenterListResult = z.infer<typeof AuditCenterListResultSchema>;
export type AuditCenterExportQuery = z.infer<
  typeof AuditCenterExportQuerySchema
>;
export type AuditCenterExportRow = z.infer<typeof AuditCenterExportRowSchema>;
export type AuditCenterExport = z.infer<typeof AuditCenterExportSchema>;
export type AuditCenterDetailResult = z.infer<
  typeof AuditCenterDetailResultSchema
>;
