import { describe, expect, it } from "vitest";
import { createCourseCheckoutOrder } from "./courseAccess";
import {
  createPendingCheckoutPromptForCourse,
  createPendingCourseCheckoutPrompts,
  findMembershipCheckoutAnchorCourse,
} from "./coursePendingCheckout";
import type { Course } from "@shared/domain";

const baseCourse: Course = {
  id: 2,
  title: "正念减压疗法八周系统训练营",
  coverUrl: "https://example.com/mindfulness.jpg",
  category: "正念冥想",
  type: "直播",
  teacher: "王宇教授",
  learners: 7562,
  price: 998,
  originalPrice: 1299,
  isFree: false,
  isVip: false,
  createdAt: "2026-02-28",
};

const vipCourse: Course = {
  ...baseCourse,
  id: 4,
  title: "儿童积极心理学",
  category: "家庭教育",
  teacher: "孙悦博士",
  isVip: true,
};

describe("course pending checkout prompts", () => {
  it("creates newest first course pending checkout prompts", () => {
    const first = createCourseCheckoutOrder(
      { ownedCourseIds: [], membership: { status: "none" }, orders: [] },
      baseCourse,
      "course",
      "2026-05-17T08:00:00.000Z",
      "u_1"
    );
    const second = createCourseCheckoutOrder(
      first.accessState,
      vipCourse,
      "course",
      "2026-05-17T09:00:00.000Z",
      "u_1"
    );

    const prompts = createPendingCourseCheckoutPrompts({
      accessState: second.accessState,
      courses: [baseCourse, vipCourse],
    });

    expect(prompts.map(prompt => prompt.course.id)).toEqual([4, 2]);
    expect(prompts[0]).toMatchObject({
      mode: "course",
      title: "儿童积极心理学",
      subtitle: "孙悦博士 · 家庭教育",
    });
  });

  it("builds a single course prompt for detail page recall", () => {
    const result = createCourseCheckoutOrder(
      { ownedCourseIds: [], membership: { status: "none" }, orders: [] },
      vipCourse,
      "membership",
      "2026-05-17T10:00:00.000Z",
      "u_2"
    );

    const prompt = createPendingCheckoutPromptForCourse(
      result.accessState,
      vipCourse,
      "membership"
    );

    expect(prompt).toMatchObject({
      course: vipCourse,
      mode: "membership",
      title: "成长会员年卡",
      subtitle: "开通后会员课程可直接学习",
    });
  });

  it("selects a membership checkout anchor course from locked VIP courses first", () => {
    const fallbackPaidCourse: Course = {
      ...baseCourse,
      id: 8,
      title: "非会员单课",
      isVip: false,
      isFree: false,
    };

    const anchor = findMembershipCheckoutAnchorCourse(
      [fallbackPaidCourse, vipCourse],
      course => ({
        status: course.isVip ? "requires_membership" : "requires_purchase",
        canStart: false,
        canPurchase: !course.isVip,
        canActivateMembership: course.isVip,
      })
    );

    expect(anchor?.id).toBe(vipCourse.id);
  });

  it("falls back to a paid course when no VIP course exists", () => {
    const freeCourse: Course = {
      ...baseCourse,
      id: 9,
      title: "免费体验课",
      isFree: true,
      isVip: false,
    };
    const paidCourse: Course = {
      ...baseCourse,
      id: 10,
      title: "付费单课",
      isFree: false,
      isVip: false,
    };

    expect(
      findMembershipCheckoutAnchorCourse([freeCourse, paidCourse])?.id
    ).toBe(paidCourse.id);
  });
});
