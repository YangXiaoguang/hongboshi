import { describe, expect, it } from "vitest";
import type { Course } from "./course";
import {
  CourseMarketingRuleSchema,
  courseMatchesMarketingRule,
  isCourseMarketingRuleActiveAt,
  listActiveCourseMarketingRulesForCourse,
  summarizeCourseMarketingRules,
} from "./courseMarketing";

const course: Course = {
  id: 2,
  title: "情绪管理入门",
  coverUrl: "https://example.com/course.jpg",
  category: "情绪管理",
  type: "录播",
  teacher: "李老师",
  learners: 3200,
  price: 299,
  originalPrice: 399,
  isFree: false,
  isVip: false,
  createdAt: "2026-03-01",
};

function createRule(
  overrides: Partial<Parameters<typeof CourseMarketingRuleSchema.parse>[0]> = {}
) {
  return CourseMarketingRuleSchema.parse({
    id: "rule-1",
    type: "course_coupon",
    status: "active",
    source: "manual",
    name: "新人课程券",
    description: "购买指定课程自动抵扣。",
    badgeLabel: "券",
    priority: 100,
    stackable: true,
    scope: {
      courseIds: [2],
    },
    discount: {
      kind: "fixed_amount",
      amount: 50,
    },
    startsAt: "2026-05-01T00:00:00.000Z",
    endsAt: "2026-06-01T00:00:00.000Z",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  });
}

describe("course marketing rules", () => {
  it("validates active scoped course coupon rules", () => {
    const rule = createRule();

    expect(
      isCourseMarketingRuleActiveAt(rule, "2026-05-17T10:00:00.000Z")
    ).toBe(true);
    expect(courseMatchesMarketingRule(course, rule)).toBe(true);
  });

  it("filters inactive, expired and unmatched rules for a course", () => {
    const rules = [
      createRule({ id: "active-rule", priority: 100 }),
      createRule({ id: "paused-rule", status: "paused", priority: 300 }),
      createRule({ id: "expired-rule", endsAt: "2026-05-01T00:00:00.000Z" }),
      createRule({
        id: "other-course-rule",
        scope: {
          courseIds: [9],
        },
      }),
    ];

    expect(
      listActiveCourseMarketingRulesForCourse({
        course,
        rules,
        type: "course_coupon",
        now: "2026-05-17T10:00:00.000Z",
      }).map(rule => rule.id)
    ).toEqual(["active-rule"]);
  });

  it("summarizes rule status and type counts", () => {
    const summary = summarizeCourseMarketingRules([
      createRule({ id: "coupon" }),
      createRule({
        id: "membership",
        type: "membership_discount",
        discount: {
          kind: "fixed_price",
          originalAmount: 699,
          payableAmount: 399,
        },
      }),
      createRule({
        id: "path-bundle",
        status: "expired",
        type: "path_bundle",
        discount: {
          kind: "bundle_percentage",
          rate: 0.12,
          minCourses: 2,
          maxCourses: 4,
        },
      }),
    ]);

    expect(summary).toMatchObject({
      totalCount: 3,
      activeCount: 2,
      expiredCount: 1,
      courseCouponCount: 1,
      membershipDiscountCount: 1,
      pathBundleCount: 1,
    });
  });
});
