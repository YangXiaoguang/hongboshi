import { z } from "zod";
import { DateTimeLikeSchema, EntityIdSchema } from "./common";

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
export type AuditAction = z.infer<typeof AuditActionSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
