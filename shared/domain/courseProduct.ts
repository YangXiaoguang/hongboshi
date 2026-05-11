import { z } from "zod";
import {
  DateTimeLikeSchema,
  EntityIdSchema,
  LegacyNumericIdSchema,
  MoneyAmountSchema,
  PageMetaSchema,
  PaginationQuerySchema,
} from "./common";
import {
  COURSE_CATEGORIES,
  COURSE_TYPES,
  CourseCategorySchema,
  CourseTypeSchema,
} from "./course";

export const ALL_COURSE_PRODUCT_CATEGORY = "全部";
export const ALL_COURSE_PRODUCT_STATUS = "all";
export const COURSE_PRODUCT_PAGE_SIZE = 10;

export const COURSE_PRODUCT_STATUSES = [
  "draft",
  "published",
  "unpublished",
  "archived",
] as const;

export const COURSE_PRODUCT_REVIEW_STATUSES = [
  "not_submitted",
  "pending",
  "approved",
  "rejected",
] as const;

export const COURSE_PRODUCT_SORTS = [
  "updated_desc",
  "created_desc",
  "learners_desc",
  "price_asc",
  "price_desc",
] as const;

export const COURSE_PRODUCT_AUDIT_ACTIONS = [
  "status_update",
  "price_update",
  "info_update",
  "review_update",
  "content_update",
] as const;

export const COURSE_PRODUCT_REVIEW_ACTIONS = [
  "submit",
  "approve",
  "reject",
  "withdraw",
] as const;

export const COURSE_PRODUCT_CONTENT_MATERIAL_TYPES = [
  "video",
  "audio",
  "document",
  "exercise",
  "live_replay",
  "other",
] as const;

export const COURSE_PRODUCT_CONTENT_MATERIAL_STATUSES = [
  "pending",
  "ready",
] as const;

export const CourseProductStatusSchema = z.enum(COURSE_PRODUCT_STATUSES);

export const CourseProductReviewStatusSchema = z.enum(
  COURSE_PRODUCT_REVIEW_STATUSES
);

export const CourseProductSortSchema = z.enum(COURSE_PRODUCT_SORTS);

export const CourseProductAuditActionSchema = z.enum(
  COURSE_PRODUCT_AUDIT_ACTIONS
);

export const CourseProductReviewActionSchema = z.enum(
  COURSE_PRODUCT_REVIEW_ACTIONS
);

export const CourseProductSourceSchema = z.enum(["seed", "manual", "imported"]);

export const CourseProductContentMaterialTypeSchema = z.enum(
  COURSE_PRODUCT_CONTENT_MATERIAL_TYPES
);

export const CourseProductContentMaterialStatusSchema = z.enum(
  COURSE_PRODUCT_CONTENT_MATERIAL_STATUSES
);

export const CourseProductPriceSchema = z.object({
  currency: z.literal("CNY").default("CNY"),
  amount: MoneyAmountSchema,
  originalAmount: MoneyAmountSchema,
  isFree: z.boolean(),
  memberIncluded: z.boolean(),
});

export const CourseProductListItemSchema = z.object({
  id: EntityIdSchema,
  courseId: LegacyNumericIdSchema,
  title: z.string().min(2),
  coverUrl: z.string().url(),
  category: CourseCategorySchema,
  type: CourseTypeSchema,
  instructorName: z.string().min(1),
  learners: z.number().int().nonnegative(),
  price: CourseProductPriceSchema,
  status: CourseProductStatusSchema,
  reviewStatus: CourseProductReviewStatusSchema,
  source: CourseProductSourceSchema,
  createdAt: DateTimeLikeSchema,
  updatedAt: DateTimeLikeSchema,
  publishedAt: DateTimeLikeSchema.optional(),
});

export const CourseProductListQuerySchema = PaginationQuerySchema.extend({
  keyword: z.string().trim().max(80).default(""),
  category: z
    .union([CourseCategorySchema, z.literal(ALL_COURSE_PRODUCT_CATEGORY)])
    .default(ALL_COURSE_PRODUCT_CATEGORY),
  status: z
    .union([CourseProductStatusSchema, z.literal(ALL_COURSE_PRODUCT_STATUS)])
    .default(ALL_COURSE_PRODUCT_STATUS),
  sort: CourseProductSortSchema.default("updated_desc"),
  pageSize: z.number().int().min(1).max(50).default(COURSE_PRODUCT_PAGE_SIZE),
});

export const CourseProductListSummarySchema = z.object({
  totalCount: z.number().int().nonnegative(),
  publishedCount: z.number().int().nonnegative(),
  unpublishedCount: z.number().int().nonnegative(),
  draftCount: z.number().int().nonnegative(),
  archivedCount: z.number().int().nonnegative(),
  freeCount: z.number().int().nonnegative(),
  memberIncludedCount: z.number().int().nonnegative(),
});

export const CourseProductAuditEventSchema = z.object({
  id: EntityIdSchema,
  productId: EntityIdSchema,
  productTitle: z.string().min(2),
  actorId: EntityIdSchema,
  action: CourseProductAuditActionSchema,
  reason: z.string().trim().min(4).max(240),
  before: z.record(z.string(), z.unknown()),
  after: z.record(z.string(), z.unknown()),
  createdAt: DateTimeLikeSchema,
});

export const CourseProductFilterOptionsSchema = z.object({
  categories: z.array(CourseCategorySchema),
  types: z.array(CourseTypeSchema),
  statuses: z.array(CourseProductStatusSchema),
});

export const CourseProductListResultSchema = z.object({
  items: z.array(CourseProductListItemSchema),
  meta: PageMetaSchema,
  summary: CourseProductListSummarySchema,
  filters: CourseProductFilterOptionsSchema,
  auditEvents: z.array(CourseProductAuditEventSchema),
  query: CourseProductListQuerySchema,
});

export const CourseProductStatusUpdateRequestSchema = z.object({
  status: CourseProductStatusSchema,
  reason: z.string().trim().min(4).max(240),
});

export const CourseProductPriceUpdateRequestSchema = z
  .object({
    amount: MoneyAmountSchema,
    originalAmount: MoneyAmountSchema.optional(),
    isFree: z.boolean(),
    memberIncluded: z.boolean().optional(),
    reason: z.string().trim().min(4).max(240),
  })
  .superRefine((value, ctx) => {
    if (value.isFree && value.amount !== 0) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "免费课程价格必须为 0",
      });
    }

    if (!value.isFree && value.amount <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "非免费课程价格必须大于 0",
      });
    }

    if (
      typeof value.originalAmount === "number" &&
      value.originalAmount < value.amount
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["originalAmount"],
        message: "原价不能小于售价",
      });
    }
  });

export const CourseProductBasicInfoUpdateRequestSchema = z.object({
  title: z.string().trim().min(2).max(80),
  coverUrl: z.string().trim().url(),
  category: CourseCategorySchema,
  type: CourseTypeSchema,
  instructorName: z.string().trim().min(1).max(40),
  learners: z.number().int().nonnegative().max(999999),
  reason: z.string().trim().min(4).max(240),
});

export const CourseProductReviewActionRequestSchema = z.object({
  action: CourseProductReviewActionSchema,
  reason: z.string().trim().min(4).max(240),
});

export const CourseProductContentMaterialSchema = z.object({
  id: EntityIdSchema,
  title: z.string().trim().min(2).max(80),
  type: CourseProductContentMaterialTypeSchema,
  status: CourseProductContentMaterialStatusSchema.default("pending"),
  note: z.string().trim().max(200).optional(),
});

export const CourseProductContentChapterSchema = z.object({
  id: EntityIdSchema,
  title: z.string().trim().min(2).max(80),
  durationMinutes: z.number().int().min(1).max(600),
  materialPlaceholders: z
    .array(CourseProductContentMaterialSchema)
    .max(20)
    .default([]),
});

export const CourseProductDetailContentSchema = z.object({
  productId: EntityIdSchema,
  summary: z.string().trim().min(20).max(500),
  targetAudience: z.array(z.string().trim().min(2).max(80)).min(1).max(8),
  chapters: z.array(CourseProductContentChapterSchema).min(1).max(60),
  updatedAt: DateTimeLikeSchema,
});

export const CourseProductContentUpdateRequestSchema =
  CourseProductDetailContentSchema.omit({
    productId: true,
    updatedAt: true,
  }).extend({
    reason: z.string().trim().min(4).max(240),
  });

export const CourseProductContentMutationResultSchema = z.object({
  product: CourseProductListItemSchema,
  content: CourseProductDetailContentSchema,
  auditEvent: CourseProductAuditEventSchema,
  auditEvents: z.array(CourseProductAuditEventSchema),
});

export const CourseProductMutationResultSchema = z.object({
  product: CourseProductListItemSchema,
  auditEvent: CourseProductAuditEventSchema,
  auditEvents: z.array(CourseProductAuditEventSchema),
});

export const courseProductFilterOptions = {
  categories: [...COURSE_CATEGORIES],
  types: [...COURSE_TYPES],
  statuses: [...COURSE_PRODUCT_STATUSES],
} satisfies z.infer<typeof CourseProductFilterOptionsSchema>;

export type CourseProductStatus = z.infer<typeof CourseProductStatusSchema>;
export type CourseProductReviewStatus = z.infer<
  typeof CourseProductReviewStatusSchema
>;
export type CourseProductSort = z.infer<typeof CourseProductSortSchema>;
export type CourseProductAuditAction = z.infer<
  typeof CourseProductAuditActionSchema
>;
export type CourseProductReviewAction = z.infer<
  typeof CourseProductReviewActionSchema
>;
export type CourseProductPrice = z.infer<typeof CourseProductPriceSchema>;
export type CourseProductListItem = z.infer<typeof CourseProductListItemSchema>;
export type CourseProductListQuery = z.infer<
  typeof CourseProductListQuerySchema
>;
export type CourseProductListSummary = z.infer<
  typeof CourseProductListSummarySchema
>;
export type CourseProductAuditEvent = z.infer<
  typeof CourseProductAuditEventSchema
>;
export type CourseProductFilterOptions = z.infer<
  typeof CourseProductFilterOptionsSchema
>;
export type CourseProductListResult = z.infer<
  typeof CourseProductListResultSchema
>;
export type CourseProductStatusUpdateRequest = z.infer<
  typeof CourseProductStatusUpdateRequestSchema
>;
export type CourseProductPriceUpdateRequest = z.infer<
  typeof CourseProductPriceUpdateRequestSchema
>;
export type CourseProductBasicInfoUpdateRequest = z.infer<
  typeof CourseProductBasicInfoUpdateRequestSchema
>;
export type CourseProductReviewActionRequest = z.infer<
  typeof CourseProductReviewActionRequestSchema
>;
export type CourseProductContentMaterialType = z.infer<
  typeof CourseProductContentMaterialTypeSchema
>;
export type CourseProductContentMaterialStatus = z.infer<
  typeof CourseProductContentMaterialStatusSchema
>;
export type CourseProductContentMaterial = z.infer<
  typeof CourseProductContentMaterialSchema
>;
export type CourseProductContentChapter = z.infer<
  typeof CourseProductContentChapterSchema
>;
export type CourseProductDetailContent = z.infer<
  typeof CourseProductDetailContentSchema
>;
export type CourseProductContentUpdateRequest = z.infer<
  typeof CourseProductContentUpdateRequestSchema
>;
export type CourseProductContentMutationResult = z.infer<
  typeof CourseProductContentMutationResultSchema
>;
export type CourseProductMutationResult = z.infer<
  typeof CourseProductMutationResultSchema
>;
