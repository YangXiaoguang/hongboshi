import { z } from "zod";
import {
  DateTimeLikeSchema,
  ISODateSchema,
  LegacyNumericIdSchema,
  MoneyAmountSchema,
  PaginationQuerySchema,
} from "./common";

export const COURSE_CATEGORIES = [
  "个人成长",
  "情绪管理",
  "职场心理",
  "家庭教育",
  "心理科普",
  "婚姻关系",
  "青少年心理",
  "心理咨询师",
  "正念冥想",
  "认知行为",
  "催眠治疗",
  "沙盘疗法",
  "绘画疗法",
  "团体辅导",
] as const;

export const COURSE_TYPES = ["直播", "录播", "专栏"] as const;

export const COURSE_SORTS = [
  "comprehensive",
  "newest",
  "hottest",
  "price",
] as const;

export const CourseCategorySchema = z.enum(COURSE_CATEGORIES);

export const CourseTypeSchema = z.enum(COURSE_TYPES);

export const CourseSortSchema = z.enum(COURSE_SORTS);

export const CourseCouponSchema = z.object({
  label: z.string().min(1),
  amount: MoneyAmountSchema,
});

export const CourseDiscountSchema = z.object({
  label: z.string().min(1),
  endsAt: DateTimeLikeSchema,
  percent: z.number().int().min(1).max(100).optional(),
});

export const CourseSchema = z.object({
  id: LegacyNumericIdSchema,
  title: z.string().min(2),
  coverUrl: z.string().url(),
  category: CourseCategorySchema,
  type: CourseTypeSchema,
  teacher: z.string().min(1),
  learners: z.number().int().nonnegative(),
  price: MoneyAmountSchema,
  originalPrice: MoneyAmountSchema,
  isFree: z.boolean(),
  isVip: z.boolean(),
  createdAt: ISODateSchema,
  coupon: CourseCouponSchema.optional(),
  discount: CourseDiscountSchema.optional(),
});

export const CourseAudienceSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

export const CourseChapterSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  lessonCount: z.number().int().positive(),
});

export const CourseDetailSchema = CourseSchema.extend({
  subtitle: z.string().min(1),
  summary: z.string().min(1),
  suitableFor: z.array(CourseAudienceSchema).min(1),
  outcomes: z.array(z.string().min(1)).min(1),
  chapters: z.array(CourseChapterSchema).min(1),
  supportPath: z.string().min(1),
});

export const CourseListQuerySchema = PaginationQuerySchema.extend({
  category: z.union([CourseCategorySchema, z.literal("全部")]).default("全部"),
  type: z.union([CourseTypeSchema, z.literal("全部")]).default("全部"),
  sort: CourseSortSchema.default("comprehensive"),
  keyword: z.string().trim().max(80).default(""),
  vipOnly: z.boolean().default(false),
});

export const CourseProgressStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "completed",
]);

export const CourseProgressSchema = z.object({
  userId: z.string().min(1),
  courseId: LegacyNumericIdSchema,
  status: CourseProgressStatusSchema,
  completedChapterIds: z.array(z.string().min(1)).default([]),
  lastViewedAt: DateTimeLikeSchema.optional(),
  updatedAt: DateTimeLikeSchema,
});

export type CourseCategory = z.infer<typeof CourseCategorySchema>;
export type CourseType = z.infer<typeof CourseTypeSchema>;
export type CourseSort = z.infer<typeof CourseSortSchema>;
export type Course = z.infer<typeof CourseSchema>;
export type CourseAudience = z.infer<typeof CourseAudienceSchema>;
export type CourseChapter = z.infer<typeof CourseChapterSchema>;
export type CourseDetail = z.infer<typeof CourseDetailSchema>;
export type CourseListQuery = z.infer<typeof CourseListQuerySchema>;
export type CourseProgressStatus = z.infer<typeof CourseProgressStatusSchema>;
export type CourseProgress = z.infer<typeof CourseProgressSchema>;
