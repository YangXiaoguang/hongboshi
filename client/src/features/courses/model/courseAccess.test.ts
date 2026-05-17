import { describe, expect, it } from "vitest";
import type { Course } from "@shared/domain";
import {
  activateCourseMembership,
  cancelCourseCheckoutOrder,
  createEmptyCourseAccessState,
  createCourseCheckoutOrder,
  findPendingCourseCheckoutOrder,
  grantPurchasedCourseAccess,
  hasActiveCourseMembership,
  payCourseCheckoutOrder,
  resolveCourseAccess,
} from "./courseAccess";

const baseCourse: Course = {
  id: 11,
  title: "个人成长心理学",
  coverUrl: "https://example.com/course.jpg",
  category: "个人成长",
  type: "录播",
  teacher: "黄强博士",
  learners: 1200,
  price: 399,
  originalPrice: 699,
  isFree: false,
  isVip: false,
  createdAt: "2026-02-03",
};

describe("course access model", () => {
  it("allows free courses without creating an order", () => {
    const course = {
      ...baseCourse,
      id: 3,
      price: 0,
      originalPrice: 0,
      isFree: true,
    };
    const state = createEmptyCourseAccessState();

    expect(resolveCourseAccess(state, course).status).toBe("free");
    expect(resolveCourseAccess(state, course).canStart).toBe(true);
  });

  it("grants owned access through a paid course order", () => {
    const course = {
      ...baseCourse,
      coupon: {
        label: "新人减50",
        amount: 50,
      },
    };
    const state = grantPurchasedCourseAccess(
      createEmptyCourseAccessState(),
      course,
      "2026-05-09T10:00:00.000Z"
    );

    expect(state.ownedCourseIds).toEqual([11]);
    expect(state.orders[0]).toMatchObject({
      status: "paid",
      payableAmount: 349,
      discountAmount: 50,
      items: [{ type: "course", targetId: "11" }],
    });
    expect(resolveCourseAccess(state, course).status).toBe("owned");
  });

  it("creates a pending checkout order without granting access", () => {
    const checkout = createCourseCheckoutOrder(
      createEmptyCourseAccessState(),
      baseCourse,
      "course",
      "2026-05-09T10:00:00.000Z",
      "u_10001"
    );

    expect(checkout.order).toMatchObject({
      status: "pending_payment",
      payableAmount: 399,
      items: [{ type: "course", targetId: "11" }],
    });
    expect(checkout.accessState.ownedCourseIds).toEqual([]);
    expect(resolveCourseAccess(checkout.accessState, baseCourse).status).toBe(
      "requires_purchase"
    );
  });

  it("finds reusable pending checkout orders for purchase recall", () => {
    const checkout = createCourseCheckoutOrder(
      createEmptyCourseAccessState(),
      baseCourse,
      "course",
      "2026-05-09T10:00:00.000Z",
      "u_10001"
    );

    const pending = findPendingCourseCheckoutOrder(
      checkout.accessState,
      baseCourse,
      "course"
    );

    expect(pending?.order.id).toBe(checkout.order.id);
    expect(pending?.order.status).toBe("pending_payment");
    expect(pending?.payment.payableAmount).toBe(399);
  });

  it("delivers course access only after checkout payment succeeds", () => {
    const pending = createCourseCheckoutOrder(
      createEmptyCourseAccessState(),
      baseCourse,
      "course",
      "2026-05-09T10:00:00.000Z",
      "u_10001"
    );
    const paid = payCourseCheckoutOrder(
      pending.accessState,
      pending.order.id,
      "wechat_pay",
      "2026-05-09T10:02:00.000Z"
    );
    const duplicate = payCourseCheckoutOrder(
      paid.accessState,
      pending.order.id,
      "wechat_pay",
      "2026-05-09T10:03:00.000Z"
    );

    expect(paid.order.status).toBe("paid");
    expect(paid.order.paymentChannel).toBe("wechat_pay");
    expect(paid.entitlement.status).toBe("delivered");
    expect(paid.accessState.ownedCourseIds).toEqual([11]);
    expect(duplicate.accessState.ownedCourseIds).toEqual([11]);
    expect(duplicate.order.paidAt).toBe("2026-05-09T10:02:00.000Z");
  });

  it("closes pending checkout orders without delivering access", () => {
    const pending = createCourseCheckoutOrder(
      createEmptyCourseAccessState(),
      baseCourse,
      "course",
      "2026-05-09T10:00:00.000Z",
      "u_10001"
    );
    const closed = cancelCourseCheckoutOrder(
      pending.accessState,
      pending.order.id,
      "2026-05-09T10:05:00.000Z"
    );

    expect(closed.order.status).toBe("closed");
    expect(closed.entitlement.status).toBe("not_delivered");
    expect(closed.accessState.ownedCourseIds).toEqual([]);
    expect(() =>
      payCourseCheckoutOrder(closed.accessState, pending.order.id)
    ).toThrow("CHECKOUT_ORDER_NOT_PAYABLE");
  });

  it("unlocks vip courses for active members", () => {
    const vipCourse = { ...baseCourse, id: 17, isVip: true };
    const emptyState = createEmptyCourseAccessState();

    expect(resolveCourseAccess(emptyState, vipCourse).status).toBe(
      "requires_membership"
    );

    const memberState = activateCourseMembership(
      emptyState,
      "2026-05-09T10:00:00.000Z"
    );

    expect(
      resolveCourseAccess(memberState, vipCourse, "2026-06-09T10:00:00.000Z")
    ).toMatchObject({
      status: "member_included",
      canStart: true,
    });
  });

  it("treats expired memberships as inactive", () => {
    expect(
      hasActiveCourseMembership(
        {
          status: "active",
          planName: "成长会员",
          activatedAt: "2026-01-01T00:00:00.000Z",
          expiresAt: "2026-02-01T00:00:00.000Z",
        },
        "2026-05-09T10:00:00.000Z"
      )
    ).toBe(false);
  });
});
