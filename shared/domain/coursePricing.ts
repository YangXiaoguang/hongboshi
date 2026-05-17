import type { Course } from "./course";

export const COURSE_MEMBERSHIP_ORDER_TARGET_ID = "growth_membership_yearly";
export const COURSE_MEMBERSHIP_ORDER_TITLE = "成长会员年卡";
export const COURSE_MEMBERSHIP_ORDER_ORIGINAL_PRICE = 699;
export const COURSE_MEMBERSHIP_ORDER_PAYABLE_PRICE = 399;

export interface CoursePricingBreakdown {
  listPrice: number;
  originalPrice: number;
  couponAmount: number;
  priceMarkdownAmount: number;
  discountAmount: number;
  payableAmount: number;
  savingsAmount: number;
}

export function calculateCoursePricing(course: Course): CoursePricingBreakdown {
  const listPrice = Math.max(0, course.price);
  const originalPrice = Math.max(course.originalPrice, listPrice);
  const couponAmount = Math.min(course.coupon?.amount ?? 0, listPrice);
  const payableAmount = Math.max(0, listPrice - couponAmount);
  const priceMarkdownAmount = Math.max(0, originalPrice - listPrice);
  const savingsAmount = Math.max(0, originalPrice - payableAmount);

  return {
    listPrice,
    originalPrice,
    couponAmount,
    priceMarkdownAmount,
    discountAmount: couponAmount,
    payableAmount,
    savingsAmount,
  };
}

export function calculateMembershipPricing(): CoursePricingBreakdown {
  const discountAmount =
    COURSE_MEMBERSHIP_ORDER_ORIGINAL_PRICE -
    COURSE_MEMBERSHIP_ORDER_PAYABLE_PRICE;

  return {
    listPrice: COURSE_MEMBERSHIP_ORDER_ORIGINAL_PRICE,
    originalPrice: COURSE_MEMBERSHIP_ORDER_ORIGINAL_PRICE,
    couponAmount: 0,
    priceMarkdownAmount: 0,
    discountAmount,
    payableAmount: COURSE_MEMBERSHIP_ORDER_PAYABLE_PRICE,
    savingsAmount: discountAmount,
  };
}
