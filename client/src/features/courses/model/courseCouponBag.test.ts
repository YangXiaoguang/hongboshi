import { describe, expect, it } from "vitest";
import { CourseMarketingRuleSchema, type Course } from "@shared/domain";
import {
  countClaimableCourseCoupons,
  createCourseCheckoutCouponOptions,
  resolveDefaultCheckoutCouponClaimId,
} from "./courseCouponBag";

const course: Course = {
  id: 16,
  title: "情绪急救手册",
  coverUrl: "https://example.com/course.jpg",
  category: "情绪管理",
  type: "录播",
  teacher: "李静博士",
  learners: 2100,
  price: 149,
  originalPrice: 299,
  isFree: false,
  isVip: false,
  createdAt: "2026-01-20",
};

const couponRule = CourseMarketingRuleSchema.parse({
  id: "course_16_coupon_20",
  type: "course_coupon",
  status: "active",
  source: "course_product",
  name: "新人专享减20",
  description: "购买本课程时抵扣 20 元。",
  badgeLabel: "券",
  priority: 300,
  stackable: true,
  scope: { courseIds: [16] },
  discount: { kind: "fixed_amount", amount: 20 },
  startsAt: "2026-01-01T00:00:00.000Z",
  endsAt: "2026-06-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-05-18T08:00:00.000Z",
});

describe("course coupon bag model", () => {
  it("lists claimed coupons that apply to checkout course", () => {
    const options = createCourseCheckoutCouponOptions({
      course,
      marketingRules: [couponRule],
      couponClaims: [
        {
          id: "coupon_u_10001_course_16_coupon_20",
          marketingRuleId: couponRule.id,
          status: "claimed",
          claimedAt: "2026-05-18T08:10:00.000Z",
          expiresAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-05-18T08:10:00.000Z",
        },
      ],
      now: "2026-05-18T09:00:00.000Z",
    });

    expect(options).toEqual([
      expect.objectContaining({
        claimId: "coupon_u_10001_course_16_coupon_20",
        marketingRuleId: couponRule.id,
        status: "available",
        value: "-¥20",
      }),
    ]);
  });

  it("counts active course coupons that have not been claimed", () => {
    expect(
      countClaimableCourseCoupons({
        course,
        marketingRules: [couponRule],
        couponClaims: [],
        now: "2026-05-18T09:00:00.000Z",
      })
    ).toBe(1);
  });

  it("shows unclaimed active coupons as claimable checkout options", () => {
    const options = createCourseCheckoutCouponOptions({
      course,
      marketingRules: [couponRule],
      couponClaims: [],
      now: "2026-05-18T09:00:00.000Z",
    });

    expect(options).toEqual([
      expect.objectContaining({
        marketingRuleId: couponRule.id,
        status: "claimable",
        value: "-¥20",
      }),
    ]);
    expect(options[0]).not.toHaveProperty("claimId");
    expect(resolveDefaultCheckoutCouponClaimId({ options })).toBeUndefined();
  });

  it("prefers order coupon application over default available coupon", () => {
    const selected = resolveDefaultCheckoutCouponClaimId({
      options: [
        {
          claimId: "coupon_first",
          marketingRuleId: couponRule.id,
          label: couponRule.name,
          description: couponRule.description,
          value: "-¥20",
          status: "available",
        },
        {
          claimId: "coupon_order",
          marketingRuleId: "course_16_coupon_30",
          label: "老客减30",
          description: "购买本课程时抵扣 30 元。",
          value: "-¥30",
          status: "available",
        },
      ],
      order: {
        id: "order_course_16_u_10001",
        userId: "u_10001",
        status: "pending_payment",
        items: [
          {
            type: "course",
            targetId: "16",
            title: course.title,
            unitPrice: 149,
            quantity: 1,
          },
        ],
        subtotal: 149,
        discountAmount: 20,
        payableAmount: 129,
        couponApplication: {
          claimId: "coupon_order",
          marketingRuleId: "course_16_coupon_30",
          status: "reserved",
          appliedAt: "2026-05-18T09:00:00.000Z",
        },
        createdAt: "2026-05-18T09:00:00.000Z",
      },
    });

    expect(selected).toBe("coupon_order");
  });
});
