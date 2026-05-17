import { z } from "zod";
import {
  DateTimeLikeSchema,
  EntityIdSchema,
  LegacyNumericIdSchema,
  MoneyAmountSchema,
} from "./common";
import { CourseCategorySchema, CourseTypeSchema, type Course } from "./course";

export const COURSE_MARKETING_RULE_VERSION = "course-marketing-v1";

export const CourseMarketingRuleTypeSchema = z.enum([
  "course_coupon",
  "limited_discount",
  "membership_discount",
  "path_bundle",
]);

export const CourseMarketingRuleStatusSchema = z.enum([
  "active",
  "paused",
  "expired",
]);

export const CourseMarketingRuleSourceSchema = z.enum([
  "course_product",
  "system",
  "manual",
]);

export const COURSE_MARKETING_AUDIT_ACTIONS = ["rule_status_update"] as const;

export const CourseMarketingAuditActionSchema = z.enum(
  COURSE_MARKETING_AUDIT_ACTIONS
);

export const CourseMarketingRuleScopeSchema = z
  .object({
    courseIds: z.array(LegacyNumericIdSchema).default([]),
    categories: z.array(CourseCategorySchema).default([]),
    courseTypes: z.array(CourseTypeSchema).default([]),
    vipOnly: z.boolean().optional(),
    pathIds: z.array(EntityIdSchema).default([]),
  })
  .default({
    courseIds: [],
    categories: [],
    courseTypes: [],
    pathIds: [],
  });

export const CourseMarketingFixedAmountDiscountSchema = z.object({
  kind: z.literal("fixed_amount"),
  amount: MoneyAmountSchema,
});

export const CourseMarketingFixedPriceDiscountSchema = z.object({
  kind: z.literal("fixed_price"),
  originalAmount: MoneyAmountSchema,
  payableAmount: MoneyAmountSchema,
});

export const CourseMarketingBundlePercentageDiscountSchema = z.object({
  kind: z.literal("bundle_percentage"),
  rate: z.number().min(0).max(1),
  minCourses: z.number().int().min(2).default(2),
  maxCourses: z.number().int().min(2).max(12).default(4),
});

export const CourseMarketingDiscountSchema = z.discriminatedUnion("kind", [
  CourseMarketingFixedAmountDiscountSchema,
  CourseMarketingFixedPriceDiscountSchema,
  CourseMarketingBundlePercentageDiscountSchema,
]);

export const CourseMarketingRuleSchema = z.object({
  id: EntityIdSchema,
  version: z
    .literal(COURSE_MARKETING_RULE_VERSION)
    .default(COURSE_MARKETING_RULE_VERSION),
  type: CourseMarketingRuleTypeSchema,
  status: CourseMarketingRuleStatusSchema,
  source: CourseMarketingRuleSourceSchema,
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(2).max(240),
  badgeLabel: z.string().trim().min(1).max(20),
  priority: z.number().int().min(0).max(1000).default(100),
  stackable: z.boolean().default(false),
  scope: CourseMarketingRuleScopeSchema,
  discount: CourseMarketingDiscountSchema,
  startsAt: DateTimeLikeSchema.optional(),
  endsAt: DateTimeLikeSchema.optional(),
  createdAt: DateTimeLikeSchema,
  updatedAt: DateTimeLikeSchema,
});

export const CourseMarketingRuleSnapshotSchema = z.object({
  version: z
    .literal(COURSE_MARKETING_RULE_VERSION)
    .default(COURSE_MARKETING_RULE_VERSION),
  serverTime: DateTimeLikeSchema,
  rules: z.array(CourseMarketingRuleSchema),
});

export const CourseMarketingRuleConsoleSummarySchema = z.object({
  totalCount: z.number().int().nonnegative(),
  activeCount: z.number().int().nonnegative(),
  pausedCount: z.number().int().nonnegative(),
  expiredCount: z.number().int().nonnegative(),
  courseCouponCount: z.number().int().nonnegative(),
  membershipDiscountCount: z.number().int().nonnegative(),
  pathBundleCount: z.number().int().nonnegative(),
});

export const CourseMarketingAuditEventSchema = z.object({
  id: EntityIdSchema,
  ruleId: EntityIdSchema,
  ruleName: z.string().trim().min(2).max(80),
  actorId: EntityIdSchema,
  actorRoles: z.array(z.string().min(1)).default([]),
  action: CourseMarketingAuditActionSchema,
  reason: z.string().trim().min(4).max(240),
  before: z.record(z.string(), z.unknown()),
  after: z.record(z.string(), z.unknown()),
  createdAt: DateTimeLikeSchema,
});

export const CourseMarketingRuleStatusUpdateRequestSchema = z.object({
  status: z.enum(["active", "paused"]),
  reason: z.string().trim().min(4).max(240),
});

export const CourseMarketingRuleMutationResultSchema = z.object({
  rule: CourseMarketingRuleSchema,
  auditEvent: CourseMarketingAuditEventSchema,
  auditEvents: z.array(CourseMarketingAuditEventSchema),
});

export const CourseMarketingRuleConsoleSchema =
  CourseMarketingRuleSnapshotSchema.extend({
    summary: CourseMarketingRuleConsoleSummarySchema,
    auditEvents: z.array(CourseMarketingAuditEventSchema).default([]),
  });

export type CourseMarketingRuleType = z.infer<
  typeof CourseMarketingRuleTypeSchema
>;
export type CourseMarketingRuleStatus = z.infer<
  typeof CourseMarketingRuleStatusSchema
>;
export type CourseMarketingRuleSource = z.infer<
  typeof CourseMarketingRuleSourceSchema
>;
export type CourseMarketingAuditAction = z.infer<
  typeof CourseMarketingAuditActionSchema
>;
export type CourseMarketingRuleScope = z.infer<
  typeof CourseMarketingRuleScopeSchema
>;
export type CourseMarketingDiscount = z.infer<
  typeof CourseMarketingDiscountSchema
>;
export type CourseMarketingRule = z.infer<typeof CourseMarketingRuleSchema>;
export type CourseMarketingRuleSnapshot = z.infer<
  typeof CourseMarketingRuleSnapshotSchema
>;
export type CourseMarketingRuleConsole = z.infer<
  typeof CourseMarketingRuleConsoleSchema
>;
export type CourseMarketingAuditEvent = z.infer<
  typeof CourseMarketingAuditEventSchema
>;
export type CourseMarketingRuleStatusUpdateRequest = z.infer<
  typeof CourseMarketingRuleStatusUpdateRequestSchema
>;
export type CourseMarketingRuleMutationResult = z.infer<
  typeof CourseMarketingRuleMutationResultSchema
>;

function timeValue(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function isCourseMarketingRuleActiveAt(
  rule: CourseMarketingRule,
  now: string
): boolean {
  if (rule.status !== "active") return false;
  const nowTime = timeValue(now);
  if (nowTime === undefined) return false;

  const startsAt = timeValue(rule.startsAt);
  if (startsAt !== undefined && startsAt > nowTime) return false;

  const endsAt = timeValue(rule.endsAt);
  if (endsAt !== undefined && endsAt <= nowTime) return false;

  return true;
}

export function courseMatchesMarketingRule(
  course: Course,
  rule: CourseMarketingRule
): boolean {
  const { scope } = rule;

  if (scope.courseIds.length > 0 && !scope.courseIds.includes(course.id)) {
    return false;
  }

  if (
    scope.categories.length > 0 &&
    !scope.categories.includes(course.category)
  ) {
    return false;
  }

  if (
    scope.courseTypes.length > 0 &&
    !scope.courseTypes.includes(course.type)
  ) {
    return false;
  }

  if (typeof scope.vipOnly === "boolean" && scope.vipOnly !== course.isVip) {
    return false;
  }

  return true;
}

export function listActiveCourseMarketingRulesForCourse({
  course,
  now,
  rules,
  type,
}: {
  course: Course;
  now: string;
  rules: CourseMarketingRule[];
  type?: CourseMarketingRuleType;
}): CourseMarketingRule[] {
  return rules
    .filter(rule => (type ? rule.type === type : true))
    .filter(rule => isCourseMarketingRuleActiveAt(rule, now))
    .filter(rule => courseMatchesMarketingRule(course, rule))
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}

export function summarizeCourseMarketingRules(
  rules: CourseMarketingRule[]
): z.infer<typeof CourseMarketingRuleConsoleSummarySchema> {
  return {
    totalCount: rules.length,
    activeCount: rules.filter(rule => rule.status === "active").length,
    pausedCount: rules.filter(rule => rule.status === "paused").length,
    expiredCount: rules.filter(rule => rule.status === "expired").length,
    courseCouponCount: rules.filter(rule => rule.type === "course_coupon")
      .length,
    membershipDiscountCount: rules.filter(
      rule => rule.type === "membership_discount"
    ).length,
    pathBundleCount: rules.filter(rule => rule.type === "path_bundle").length,
  };
}
