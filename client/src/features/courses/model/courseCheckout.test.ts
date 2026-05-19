import { describe, expect, it } from "vitest";
import { defaultCourseMembershipProduct, type Course } from "@shared/domain";
import {
  COURSE_MEMBERSHIP_CHECKOUT_PRICE,
  createCourseCheckoutSummary,
  createStandaloneMembershipCheckoutSummary,
  formatCheckoutMoney,
} from "./courseCheckout";

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

describe("course checkout summary", () => {
  it("calculates course payable amount with coupon and original price savings", () => {
    const summary = createCourseCheckoutSummary(course, "course");

    expect(summary).toMatchObject({
      mode: "course",
      productTitle: "情绪管理入门",
      listPrice: 199,
      originalPrice: 399,
      discountAmount: 50,
      payableAmount: 149,
      savingsAmount: 250,
      accessLabel: "购买后解锁本课",
    });
    expect(summary.deliveryItems.map(item => item.label)).toContain("学习记录");
    expect(summary.protectionItems.map(item => item.label)).toContain("隐私");
    expect(summary.promotionItems.map(item => item.label)).toEqual(
      expect.arrayContaining(["课程直降", "新人券"])
    );
  });

  it("keeps coupon discount from making payable amount negative", () => {
    const summary = createCourseCheckoutSummary(
      {
        ...course,
        price: 20,
        originalPrice: 20,
        coupon: {
          label: "满减券",
          amount: 99,
        },
      },
      "course"
    );

    expect(summary.discountAmount).toBe(20);
    expect(summary.payableAmount).toBe(0);
  });

  it("creates a membership checkout summary around the current course", () => {
    const summary = createCourseCheckoutSummary(course, "membership");

    expect(summary.mode).toBe("membership");
    expect(summary.productTitle).toBe("成长会员年卡");
    expect(summary.productSubtitle).toContain(course.title);
    expect(summary.payableAmount).toBe(COURSE_MEMBERSHIP_CHECKOUT_PRICE);
    expect(summary.promotionItems.map(item => item.label)).toContain(
      "成长会员年卡优惠"
    );
    expect(summary.deliveryItems.map(item => item.label)).toContain(
      "会员课程可学"
    );
  });

  it("can describe membership checkout as an independent product", () => {
    const summary = createStandaloneMembershipCheckoutSummary();

    expect(summary.productTitle).toBe("成长会员年卡");
    expect(summary.productSubtitle).not.toContain(course.title);
    expect(summary.productSubtitle).toContain("持续学习心理课程");
  });

  it("uses the provided membership product snapshot for membership checkout", () => {
    const product = {
      ...defaultCourseMembershipProduct,
      description: "后台实时会员商品说明",
      plans: [
        {
          ...defaultCourseMembershipProduct.plans[0]!,
          title: "家庭成长会员",
          originalPrice: 1299,
          payablePrice: 699,
        },
      ],
    };
    const summary = createStandaloneMembershipCheckoutSummary(product);

    expect(summary.productTitle).toBe("家庭成长会员");
    expect(summary.productSubtitle).toBe("后台实时会员商品说明");
    expect(summary.originalPrice).toBe(1299);
    expect(summary.payableAmount).toBe(699);
  });

  it("formats checkout money without noisy decimals", () => {
    expect(formatCheckoutMoney(199)).toBe("¥199");
    expect(formatCheckoutMoney(199.5)).toBe("¥199.5");
  });
});
