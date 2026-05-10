import { z } from "zod";
import {
  AssessmentResultSchema,
  AssessmentRiskLevelSchema,
} from "./assessment";
import { CounselingAppointmentListSchema } from "./counseling";
import { CourseAccessStateSchema } from "./courseAccess";
import { DateTimeLikeSchema, EntityIdSchema } from "./common";

export const GrowthTimelineItemTypeSchema = z.enum([
  "assessment",
  "counseling",
  "course_order",
  "membership",
]);

export const GrowthTimelineItemSchema = z.object({
  id: EntityIdSchema,
  type: GrowthTimelineItemTypeSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  occurredAt: DateTimeLikeSchema,
  status: z.string().min(1).optional(),
  targetUrl: z.string().min(1).optional(),
});

export const GrowthProfileSummarySchema = z.object({
  ownedCourseCount: z.number().int().nonnegative(),
  orderCount: z.number().int().nonnegative(),
  counselingAppointmentCount: z.number().int().nonnegative(),
  upcomingCounselingCount: z.number().int().nonnegative(),
  hasActiveMembership: z.boolean(),
  latestAssessmentRiskLevel: AssessmentRiskLevelSchema.optional(),
  lastActivityAt: DateTimeLikeSchema.optional(),
});

export const GrowthProfileSchema = z.object({
  userId: EntityIdSchema,
  courseAccess: CourseAccessStateSchema,
  latestAssessment: AssessmentResultSchema.optional(),
  counseling: CounselingAppointmentListSchema,
  summary: GrowthProfileSummarySchema,
  timeline: z.array(GrowthTimelineItemSchema),
  generatedAt: DateTimeLikeSchema,
});

export type GrowthTimelineItemType = z.infer<
  typeof GrowthTimelineItemTypeSchema
>;
export type GrowthTimelineItem = z.infer<typeof GrowthTimelineItemSchema>;
export type GrowthProfileSummary = z.infer<typeof GrowthProfileSummarySchema>;
export type GrowthProfile = z.infer<typeof GrowthProfileSchema>;
