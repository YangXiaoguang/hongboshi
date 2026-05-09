import { z } from "zod";
import { DateTimeLikeSchema, EntityIdSchema } from "./common";

export const AssessmentDimensionSchema = z.enum([
  "emotion",
  "sleep",
  "relationship",
  "parent_child",
  "workplace",
  "self_growth",
  "risk",
]);

export const AssessmentQuestionTypeSchema = z.enum([
  "single_choice",
  "multiple_choice",
  "scale",
  "text",
]);

export const AssessmentScaleSchema = z.object({
  min: z.number().int(),
  max: z.number().int(),
  minLabel: z.string().optional(),
  maxLabel: z.string().optional(),
});

export const AssessmentQuestionSchema = z.object({
  id: EntityIdSchema,
  dimension: AssessmentDimensionSchema,
  type: AssessmentQuestionTypeSchema,
  title: z.string().min(1),
  options: z.array(z.string().min(1)).default([]),
  scale: AssessmentScaleSchema.optional(),
  required: z.boolean().default(true),
  riskSensitive: z.boolean().default(false),
});

export const AssessmentAnswerSchema = z.object({
  questionId: EntityIdSchema,
  value: z.union([
    z.string(),
    z.number(),
    z.array(z.string()),
  ]),
});

export const RecommendationTargetSchema = z.enum([
  "course",
  "assessment",
  "counseling",
  "emergency_resource",
]);

export const RecommendationSchema = z.object({
  target: RecommendationTargetSchema,
  targetId: z.string().min(1).optional(),
  title: z.string().min(1),
  reason: z.string().min(1),
  priority: z.number().int().min(1).max(100),
});

export const AssessmentRiskLevelSchema = z.enum([
  "low",
  "medium",
  "high",
  "urgent",
]);

export const AssessmentReportSchema = z.object({
  id: EntityIdSchema,
  userId: EntityIdSchema.optional(),
  dimensions: z.record(AssessmentDimensionSchema, z.number().min(0).max(100)),
  riskLevel: AssessmentRiskLevelSchema,
  summary: z.string().min(1),
  recommendations: z.array(RecommendationSchema),
  createdAt: DateTimeLikeSchema,
});

export type AssessmentDimension = z.infer<typeof AssessmentDimensionSchema>;
export type AssessmentQuestion = z.infer<typeof AssessmentQuestionSchema>;
export type AssessmentAnswer = z.infer<typeof AssessmentAnswerSchema>;
export type AssessmentReport = z.infer<typeof AssessmentReportSchema>;
export type AssessmentRiskLevel = z.infer<typeof AssessmentRiskLevelSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
