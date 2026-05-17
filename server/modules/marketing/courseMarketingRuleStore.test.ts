import { describe, expect, it } from "vitest";
import type { Course } from "../../../shared/domain";
import { buildCourseMarketingRulesFromCourses } from "./courseMarketingRuleStore";

const course: Course = {
  id: 12,
  title: "亲子沟通训练",
  coverUrl: "https://example.com/course.jpg",
  category: "家庭教育",
  type: "直播",
  teacher: "周老师",
  learners: 6200,
  price: 399,
  originalPrice: 599,
  isFree: false,
  isVip: true,
  coupon: {
    label: "家庭成长券",
    amount: 80,
  },
  discount: {
    label: "周末限时",
    endsAt: "2026-05-18T00:00:00.000Z",
  },
  createdAt: "2026-03-01",
};

describe("course marketing rule store", () => {
  it("builds system and course-derived marketing rules", () => {
    const rules = buildCourseMarketingRulesFromCourses(
      [course],
      "2026-05-17T10:00:00.000Z"
    );

    expect(rules.map(rule => rule.type)).toEqual([
      "membership_discount",
      "path_bundle",
      "course_coupon",
      "limited_discount",
    ]);
    expect(rules.find(rule => rule.type === "course_coupon")).toMatchObject({
      name: "家庭成长券",
      discount: {
        kind: "fixed_amount",
        amount: 80,
      },
      scope: {
        courseIds: [12],
      },
    });
  });

  it("marks expired limited discounts without removing the rule", () => {
    const rules = buildCourseMarketingRulesFromCourses(
      [course],
      "2026-05-19T10:00:00.000Z"
    );

    expect(rules.find(rule => rule.type === "limited_discount")).toMatchObject({
      status: "expired",
    });
  });
});
