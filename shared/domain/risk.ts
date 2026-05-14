import { z } from "zod";
import {
  DateTimeLikeSchema,
  EntityIdSchema,
  PageMetaSchema,
  PaginationQuerySchema,
} from "./common";

export const RiskEventSourceSchema = z.enum([
  "assessment",
  "counseling_intake",
  "chat",
  "operator",
]);

export const RiskEventStatusSchema = z.enum([
  "open",
  "reviewing",
  "resolved",
  "escalated",
]);

export const RiskLevelSchema = z.enum(["medium", "high", "urgent"]);

export const RiskEventSchema = z.object({
  id: EntityIdSchema,
  userId: EntityIdSchema.optional(),
  source: RiskEventSourceSchema,
  riskLevel: RiskLevelSchema,
  signal: z.string().min(1),
  status: RiskEventStatusSchema,
  reviewerId: EntityIdSchema.optional(),
  createdAt: DateTimeLikeSchema,
  resolvedAt: DateTimeLikeSchema.optional(),
});

export const ALL_RISK_ADMIN_LEVEL = "all";
export const ALL_RISK_ADMIN_STATUS = "all";
export const ALL_RISK_ADMIN_SOURCE = "all";
export const RISK_ADMIN_PAGE_SIZE = 12;

export const RiskAdminLevelFilterSchema = z.union([
  RiskLevelSchema,
  z.literal(ALL_RISK_ADMIN_LEVEL),
]);

export const RiskAdminStatusFilterSchema = z.union([
  RiskEventStatusSchema,
  z.literal(ALL_RISK_ADMIN_STATUS),
]);

export const RiskAdminSourceFilterSchema = z.union([
  RiskEventSourceSchema,
  z.literal(ALL_RISK_ADMIN_SOURCE),
]);

export const RiskAdminSortSchema = z.enum([
  "created_desc",
  "risk_level_desc",
  "status_priority_desc",
]);

export const RiskAdminActionSchema = z.enum([
  "start_review",
  "mark_contacted",
  "recommend_counseling",
  "escalate",
  "resolve",
]);

export const RiskAdminUserSummarySchema = z.object({
  id: EntityIdSchema.optional(),
  displayName: z.string().min(1).max(80).optional(),
  phoneMasked: z.string().optional(),
});

export const RiskAdminRelatedObjectSchema = z.object({
  type: z.enum(["assessment_report", "counseling_appointment"]),
  id: EntityIdSchema,
  status: z.string().min(1).optional(),
  occurredAt: DateTimeLikeSchema.optional(),
  summary: z.string().min(1).max(160).optional(),
});

export const RiskAdminReviewRecordSchema = z.object({
  id: EntityIdSchema,
  riskEventId: EntityIdSchema,
  userId: EntityIdSchema.optional(),
  action: RiskAdminActionSchema,
  actorId: EntityIdSchema,
  actorRoles: z.array(z.string().min(1)).min(1),
  previousStatus: RiskEventStatusSchema,
  nextStatus: RiskEventStatusSchema,
  note: z.string().trim().min(2).max(300),
  createdAt: DateTimeLikeSchema,
});

export const RiskAdminListItemSchema = z.object({
  id: EntityIdSchema,
  user: RiskAdminUserSummarySchema,
  source: RiskEventSourceSchema,
  riskLevel: RiskLevelSchema,
  status: RiskEventStatusSchema,
  reviewerId: EntityIdSchema.optional(),
  createdAt: DateTimeLikeSchema,
  resolvedAt: DateTimeLikeSchema.optional(),
  signalSummary: z.string().min(1).max(160),
  relatedObject: RiskAdminRelatedObjectSchema.optional(),
  latestRecord: RiskAdminReviewRecordSchema.optional(),
  recordCount: z.number().int().nonnegative(),
});

export const RiskAdminSummarySchema = z.object({
  totalCount: z.number().int().nonnegative(),
  openCount: z.number().int().nonnegative(),
  reviewingCount: z.number().int().nonnegative(),
  escalatedCount: z.number().int().nonnegative(),
  resolvedCount: z.number().int().nonnegative(),
  urgentCount: z.number().int().nonnegative(),
  highCount: z.number().int().nonnegative(),
  needsActionCount: z.number().int().nonnegative(),
});

export const RiskAdminListQuerySchema = PaginationQuerySchema.extend({
  pageSize: z.number().int().min(1).max(100).default(RISK_ADMIN_PAGE_SIZE),
  riskLevel: RiskAdminLevelFilterSchema.default(ALL_RISK_ADMIN_LEVEL),
  status: RiskAdminStatusFilterSchema.default(ALL_RISK_ADMIN_STATUS),
  source: RiskAdminSourceFilterSchema.default(ALL_RISK_ADMIN_SOURCE),
  keyword: z.string().trim().max(80).default(""),
  sort: RiskAdminSortSchema.default("status_priority_desc"),
});

export const RiskAdminListResultSchema = z.object({
  items: z.array(RiskAdminListItemSchema),
  summary: RiskAdminSummarySchema,
  meta: PageMetaSchema,
  query: RiskAdminListQuerySchema,
  privacyNotice: z.string().min(1),
  generatedAt: DateTimeLikeSchema,
});

export const RiskAdminDetailSchema = z.object({
  event: RiskAdminListItemSchema,
  records: z.array(RiskAdminReviewRecordSchema),
  sopHints: z.array(z.string().min(1)).min(1),
  privacyNotice: z.string().min(1),
  generatedAt: DateTimeLikeSchema,
});

export const RiskAdminActionRequestSchema = z.object({
  action: RiskAdminActionSchema,
  note: z.string().trim().min(2).max(300),
});

export const RiskAdminMutationResultSchema = z.object({
  detail: RiskAdminDetailSchema,
  record: RiskAdminReviewRecordSchema,
  serverTime: DateTimeLikeSchema,
});

export const AuditActionSchema = z.enum([
  "create",
  "read",
  "update",
  "delete",
  "export",
  "login",
  "logout",
  "risk_review",
]);

export const AuditLogSchema = z.object({
  id: EntityIdSchema,
  actorId: EntityIdSchema.optional(),
  action: AuditActionSchema,
  resourceType: z.string().min(1),
  resourceId: z.string().min(1).optional(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: DateTimeLikeSchema,
});

export type RiskEventSource = z.infer<typeof RiskEventSourceSchema>;
export type RiskEventStatus = z.infer<typeof RiskEventStatusSchema>;
export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type RiskEvent = z.infer<typeof RiskEventSchema>;
export type RiskAdminAction = z.infer<typeof RiskAdminActionSchema>;
export type RiskAdminUserSummary = z.infer<typeof RiskAdminUserSummarySchema>;
export type RiskAdminRelatedObject = z.infer<
  typeof RiskAdminRelatedObjectSchema
>;
export type RiskAdminReviewRecord = z.infer<typeof RiskAdminReviewRecordSchema>;
export type RiskAdminListItem = z.infer<typeof RiskAdminListItemSchema>;
export type RiskAdminSummary = z.infer<typeof RiskAdminSummarySchema>;
export type RiskAdminListQuery = z.infer<typeof RiskAdminListQuerySchema>;
export type RiskAdminListResult = z.infer<typeof RiskAdminListResultSchema>;
export type RiskAdminDetail = z.infer<typeof RiskAdminDetailSchema>;
export type RiskAdminActionRequest = z.infer<
  typeof RiskAdminActionRequestSchema
>;
export type RiskAdminMutationResult = z.infer<
  typeof RiskAdminMutationResultSchema
>;
export type AuditAction = z.infer<typeof AuditActionSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
