import { z } from "zod";
import {
  DateTimeLikeSchema,
  EntityIdSchema,
  LegacyNumericIdSchema,
  MoneyAmountSchema,
} from "./common";
import {
  CourseAccessStatusSchema,
  CourseCategorySchema,
  CourseTypeSchema,
} from "./course";
import { CourseCheckoutModeSchema } from "./courseAccess";
import { PaymentChannelSchema } from "./order";

export const COURSE_CONVERSION_EVENT_VERSION = "course-commerce-v1";

export const CourseConversionEventNameSchema = z.enum([
  "course_impression",
  "course_detail_click",
  "course_detail_view",
  "course_primary_action_click",
  "course_checkout_opened",
  "course_checkout_created",
  "course_payment_success",
  "course_learning_started",
]);

export const CourseConversionSourceSchema = z.enum([
  "courses_hero",
  "courses_discovery",
  "course_path",
  "course_starter",
  "course_detail",
  "course_detail_panel",
  "course_detail_promotion",
  "course_detail_trust",
  "course_detail_catalog",
  "course_detail_recommendation",
  "pending_checkout",
  "checkout_drawer",
  "mobile_purchase_bar",
  "url_checkout_intent",
  "unknown",
]);

export const CourseConversionMetadataValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const CourseConversionMetadataSchema = z
  .record(z.string(), CourseConversionMetadataValueSchema)
  .default({});

export const CourseConversionEventSchema = z.object({
  id: EntityIdSchema,
  eventVersion: z
    .literal(COURSE_CONVERSION_EVENT_VERSION)
    .default(COURSE_CONVERSION_EVENT_VERSION),
  name: CourseConversionEventNameSchema,
  occurredAt: DateTimeLikeSchema,
  sessionId: EntityIdSchema,
  websiteId: EntityIdSchema.optional(),
  pagePath: z.string().min(1).optional(),
  source: CourseConversionSourceSchema.default("unknown"),
  courseId: LegacyNumericIdSchema.optional(),
  courseTitle: z.string().min(1).optional(),
  courseCategory: CourseCategorySchema.optional(),
  courseType: CourseTypeSchema.optional(),
  pathId: z.string().min(1).optional(),
  pathLabel: z.string().min(1).optional(),
  accessStatus: CourseAccessStatusSchema.optional(),
  checkoutMode: CourseCheckoutModeSchema.optional(),
  orderId: EntityIdSchema.optional(),
  paymentChannel: PaymentChannelSchema.optional(),
  position: z.number().int().nonnegative().optional(),
  listPrice: MoneyAmountSchema.optional(),
  originalPrice: MoneyAmountSchema.optional(),
  discountAmount: MoneyAmountSchema.optional(),
  payableAmount: MoneyAmountSchema.optional(),
  metadata: CourseConversionMetadataSchema,
});

export const CourseConversionEventBatchSchema = z.object({
  websiteId: EntityIdSchema.optional(),
  events: z.array(CourseConversionEventSchema).min(1),
});

export type CourseConversionEventName = z.infer<
  typeof CourseConversionEventNameSchema
>;
export type CourseConversionSource = z.infer<
  typeof CourseConversionSourceSchema
>;
export type CourseConversionMetadataValue = z.infer<
  typeof CourseConversionMetadataValueSchema
>;
export type CourseConversionMetadata = z.infer<
  typeof CourseConversionMetadataSchema
>;
export type CourseConversionEvent = z.infer<typeof CourseConversionEventSchema>;
export type CourseConversionEventBatch = z.infer<
  typeof CourseConversionEventBatchSchema
>;
