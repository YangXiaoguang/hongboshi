import { z } from "zod";
import {
  DateTimeLikeSchema,
  EntityIdSchema,
  PageMetaSchema,
  PaginationQuerySchema,
} from "./common";

export const ALL_AUDIT_CENTER_MODULE = "all";
export const AUDIT_CENTER_PAGE_SIZE = 20;

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

export type AuditCenterModule = z.infer<typeof AuditCenterModuleSchema>;
export type AuditCenterQuery = z.infer<typeof AuditCenterQuerySchema>;
export type AuditCenterEvent = z.infer<typeof AuditCenterEventSchema>;
export type AuditCenterListResult = z.infer<typeof AuditCenterListResultSchema>;
