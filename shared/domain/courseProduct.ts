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

export const CourseProductStatusSchema = z.enum(COURSE_PRODUCT_STATUSES);

export const CourseProductReviewStatusSchema = z.enum(
  COURSE_PRODUCT_REVIEW_STATUSES
);

export const CourseProductSortSchema = z.enum(COURSE_PRODUCT_SORTS);

export const CourseProductSourceSchema = z.enum(["seed", "manual", "imported"]);

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
  query: CourseProductListQuerySchema,
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
export type CourseProductPrice = z.infer<typeof CourseProductPriceSchema>;
export type CourseProductListItem = z.infer<typeof CourseProductListItemSchema>;
export type CourseProductListQuery = z.infer<
  typeof CourseProductListQuerySchema
>;
export type CourseProductListSummary = z.infer<
  typeof CourseProductListSummarySchema
>;
export type CourseProductFilterOptions = z.infer<
  typeof CourseProductFilterOptionsSchema
>;
export type CourseProductListResult = z.infer<
  typeof CourseProductListResultSchema
>;
