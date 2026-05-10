import { z } from "zod";
import {
  DateTimeLikeSchema,
  EntityIdSchema,
  MoneyAmountSchema,
} from "./common";
import { AssessmentRiskLevelSchema } from "./assessment";
import { RiskEventSchema } from "./risk";

export const CounselorSpecialtySchema = z.enum([
  "emotion",
  "relationship",
  "family",
  "adolescent",
  "workplace",
  "trauma",
  "personal_growth",
]);

export const CounselingConcernTagSchema = z.enum([
  "emotion",
  "sleep",
  "relationship",
  "family",
  "adolescent",
  "workplace",
  "self_growth",
  "crisis",
]);

export const CounselorSchema = z.object({
  id: EntityIdSchema,
  name: z.string().min(1),
  avatarUrl: z.string().url().optional(),
  title: z.string().min(1),
  introduction: z.string().min(1),
  specialties: z.array(CounselorSpecialtySchema).min(1),
  licenseSummary: z.string().min(1),
  yearsOfPractice: z.number().int().nonnegative(),
  sessionPrice: MoneyAmountSchema,
  rating: z.number().min(0).max(5).optional(),
});

export const CounselingChannelSchema = z.enum(["video", "voice", "offline"]);

export const AppointmentStatusSchema = z.enum([
  "pending_payment",
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
  "refunded",
]);

export const CounselingSlotSchema = z.object({
  id: EntityIdSchema,
  counselorId: EntityIdSchema,
  startsAt: DateTimeLikeSchema,
  endsAt: DateTimeLikeSchema,
  channel: CounselingChannelSchema,
  available: z.boolean(),
});

export const CounselingUrgencySchema = z.enum([
  "flexible",
  "this_week",
  "within_24h",
  "immediate",
]);

export const CounselingAppointmentSchema = z.object({
  id: EntityIdSchema,
  userId: EntityIdSchema,
  counselorId: EntityIdSchema,
  slotId: EntityIdSchema,
  channel: CounselingChannelSchema,
  status: AppointmentStatusSchema,
  concernTags: z.array(CounselingConcernTagSchema).default([]),
  noteForCounselor: z.string().max(500).optional(),
  createdAt: DateTimeLikeSchema,
  updatedAt: DateTimeLikeSchema,
});

export const CounselingAvailabilitySchema = z.object({
  counselors: z.array(CounselorSchema),
  slots: z.array(CounselingSlotSchema),
  serverTime: DateTimeLikeSchema,
});

export const CounselingAppointmentCreateRequestSchema = z.object({
  counselorId: EntityIdSchema,
  slotId: EntityIdSchema,
  channel: CounselingChannelSchema,
  concernTags: z.array(CounselingConcernTagSchema).min(1).max(5),
  urgency: CounselingUrgencySchema.default("this_week"),
  assessmentReportId: EntityIdSchema.optional(),
  assessmentRiskLevel: AssessmentRiskLevelSchema.optional(),
  noteForCounselor: z.string().max(500).optional(),
});

export const CounselingAppointmentCreateResultSchema = z.object({
  appointment: CounselingAppointmentSchema,
  counselor: CounselorSchema,
  slot: CounselingSlotSchema,
  riskEvent: RiskEventSchema.optional(),
  nextSteps: z.array(z.string().min(1)).min(1),
});

export type CounselorSpecialty = z.infer<typeof CounselorSpecialtySchema>;
export type CounselingConcernTag = z.infer<typeof CounselingConcernTagSchema>;
export type Counselor = z.infer<typeof CounselorSchema>;
export type CounselingChannel = z.infer<typeof CounselingChannelSchema>;
export type CounselingSlot = z.infer<typeof CounselingSlotSchema>;
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;
export type CounselingUrgency = z.infer<typeof CounselingUrgencySchema>;
export type CounselingAppointment = z.infer<typeof CounselingAppointmentSchema>;
export type CounselingAvailability = z.infer<
  typeof CounselingAvailabilitySchema
>;
export type CounselingAppointmentCreateRequest = z.infer<
  typeof CounselingAppointmentCreateRequestSchema
>;
export type CounselingAppointmentCreateResult = z.infer<
  typeof CounselingAppointmentCreateResultSchema
>;
