import { describe, expect, it } from "vitest";
import type { Course } from "./course";
import {
  COURSE_MEMBERSHIP_ORDER_ORIGINAL_PRICE,
  COURSE_MEMBERSHIP_ORDER_PAYABLE_PRICE,
  calculateCoursePricing,
  calculateMembershipPricing,
} from "./coursePricing";

const course: Course = {
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
  isVip: true,
  coupon: {
    label: "新人券",
    amount: 50,
  },
  createdAt: "2026-03-01",
};

describe("course pricing", () => {
  it("calculates list price, coupon and original price savings", () => {
    expect(calculateCoursePricing(course)).toMatchObject({
      listPrice: 199,
      originalPrice: 399,
      couponAmount: 50,
      priceMarkdownAmount: 200,
      discountAmount: 50,
      payableAmount: 149,
      savingsAmount: 250,
    });
  });

  it("caps coupon amount at the course list price", () => {
    expect(
      calculateCoursePricing({
        ...course,
        price: 20,
        originalPrice: 20,
        coupon: {
          label: "满减券",
          amount: 99,
        },
      }).payableAmount
    ).toBe(0);
  });

  it("calculates membership activity pricing from shared constants", () => {
    expect(calculateMembershipPricing()).toMatchObject({
      listPrice: COURSE_MEMBERSHIP_ORDER_ORIGINAL_PRICE,
      originalPrice: COURSE_MEMBERSHIP_ORDER_ORIGINAL_PRICE,
      discountAmount:
        COURSE_MEMBERSHIP_ORDER_ORIGINAL_PRICE -
        COURSE_MEMBERSHIP_ORDER_PAYABLE_PRICE,
      payableAmount: COURSE_MEMBERSHIP_ORDER_PAYABLE_PRICE,
    });
  });
});
