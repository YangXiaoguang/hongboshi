import { z } from "zod";
import { DateTimeLikeSchema, EntityIdSchema, MoneyAmountSchema } from "./common";

export const CounselorSpecialtySchema = z.enum([
  "emotion",
  "relationship",
  "family",
  "adolescent",
  "workplace",
  "trauma",
  "personal_growth",
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

export const CounselingAppointmentSchema = z.object({
  id: EntityIdSchema,
  userId: EntityIdSchema,
  counselorId: EntityIdSchema,
  slotId: EntityIdSchema,
  channel: CounselingChannelSchema,
  status: AppointmentStatusSchema,
  concernTags: z.array(z.string().min(1)).default([]),
  noteForCounselor: z.string().max(500).optional(),
  createdAt: DateTimeLikeSchema,
  updatedAt: DateTimeLikeSchema,
});

export type CounselorSpecialty = z.infer<typeof CounselorSpecialtySchema>;
export type Counselor = z.infer<typeof CounselorSchema>;
export type CounselingChannel = z.infer<typeof CounselingChannelSchema>;
export type CounselingSlot = z.infer<typeof CounselingSlotSchema>;
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;
export type CounselingAppointment = z.infer<typeof CounselingAppointmentSchema>;
