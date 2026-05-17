import { describe, expect, it } from "vitest";
import type { Course } from "@shared/domain";
import { createCoursePromotionSummary } from "./coursePromotion";

const baseCourse: Course = {
  id: 1,
  title: "情绪管理入门",
  coverUrl: "https://example.com/course.jpg",
  category: "情绪管理",
  type: "录播",
  teacher: "李老师",
  learners: 3000,
  price: 199,
  originalPrice: 399,
  isFree: false,
  isVip: false,
  coupon: {
    label: "新人券",
    amount: 50,
  },
  createdAt: "2026-03-01",
};

function makeCourse(id: number, price: number): Course {
  return {
    ...baseCourse,
    id,
    title: `路径课程 ${id}`,
    price,
    originalPrice: price + 200,
    coupon: undefined,
  };
}

describe("course promotion summary", () => {
  it("builds checkout promotion lines from markdown and coupon", () => {
    const summary = createCoursePromotionSummary(baseCourse);

    expect(summary.coursePayableAmount).toBe(149);
    expect(summary.bestOffer.kind).toBe("course");
    expect(summary.checkoutPromotionLines.map(line => line.kind)).toEqual([
      "price_markdown",
      "coupon",
    ]);
  });

  it("recommends membership when a vip course costs more than the year card", () => {
    const summary = createCoursePromotionSummary({
      ...baseCourse,
      isVip: true,
      price: 998,
      originalPrice: 1299,
      coupon: {
        label: "咨询师推荐券",
        amount: 50,
      },
    });

    expect(summary.bestOffer.kind).toBe("membership");
    expect(
      summary.offers.find(offer => offer.kind === "membership")
    ).toMatchObject({
      isRecommended: true,
      payableAmount: 399,
    });
  });

  it("keeps expired limited discounts out of applied promotion lines", () => {
    const summary = createCoursePromotionSummary(
      {
        ...baseCourse,
        discount: {
          label: "限时 5 折",
          endsAt: "2026-03-01T23:59:59",
        },
      },
      { now: "2026-05-17T10:00:00.000Z" }
    );

    expect(summary.lines.some(line => line.kind === "limited_discount")).toBe(
      false
    );
  });

  it("keeps free courses out of checkout-ready offers", () => {
    const summary = createCoursePromotionSummary({
      ...baseCourse,
      price: 0,
      originalPrice: 0,
      isFree: true,
      coupon: undefined,
    });

    expect(summary.bestOffer).toMatchObject({
      title: "免费学习本课",
      payableAmount: 0,
      isCheckoutReady: false,
    });
  });

  it("creates a path bundle preview without marking it as checkout ready", () => {
    const summary = createCoursePromotionSummary(baseCourse, {
      pathCourses: [makeCourse(2, 399), makeCourse(3, 499)],
    });
    const bundleOffer = summary.offers.find(
      offer => offer.kind === "path_bundle"
    );

    expect(summary.pathBundle).toMatchObject({
      courseCount: 3,
      bundleDiscountAmount: expect.any(Number),
    });
    expect(bundleOffer).toMatchObject({
      isCheckoutReady: false,
      badge: "组合购",
    });
  });
});
