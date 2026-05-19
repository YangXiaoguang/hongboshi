import { describe, expect, it } from "vitest";
import type { Course, Order } from "@shared/domain";
import {
  activateCourseMembership,
  cancelCourseCheckoutOrder,
  createEmptyCourseAccessState,
  createCourseCheckoutOrder,
  createCourseCheckoutOrderResult,
  createMembershipCheckoutOrder,
  findPendingCourseCheckoutOrder,
  findPendingMembershipCheckoutOrder,
  grantPurchasedCourseAccess,
  hasActiveCourseMembership,
  payCourseCheckoutOrder,
  resolveCourseAccess,
  settleRefundedCourseAccessOrder,
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

const refundedCourseOrder: Order = {
  id: "order_course_11_refunded",
  userId: "u_10001",
  status: "refunded",
  items: [
    {
      type: "course",
      targetId: "11",
      title: "个人成长心理学",
      unitPrice: 399,
      quantity: 1,
    },
  ],
  subtotal: 399,
  discountAmount: 0,
  payableAmount: 399,
  createdAt: "2026-05-09T10:00:00.000Z",
  paidAt: "2026-05-09T10:02:00.000Z",
  entitlementDeliveredAt: "2026-05-09T10:02:00.000Z",
  paymentChannel: "wechat_pay",
};

const refundedMembershipOrder: Order = {
  id: "order_membership_refunded",
  userId: "u_10001",
  status: "refunded",
  items: [
    {
      type: "membership",
      targetId: "growth_membership_yearly",
      title: "成长会员年卡",
      unitPrice: 999,
      quantity: 1,
    },
  ],
  subtotal: 999,
  discountAmount: 500,
  payableAmount: 499,
  createdAt: "2026-05-09T10:00:00.000Z",
  paidAt: "2026-05-09T10:02:00.000Z",
  entitlementDeliveredAt: "2026-05-09T10:02:00.000Z",
  paymentChannel: "wechat_pay",
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

  it("records coupon application on course checkout orders", () => {
    const checkout = createCourseCheckoutOrder(
      createEmptyCourseAccessState(),
      baseCourse,
      "course",
      "2026-05-09T10:00:00.000Z",
      "u_10001",
      {
        couponClaimId: "coupon_u_10001_course_11_coupon_20",
        couponMarketingRuleId: "course_11_coupon_20",
      }
    );
    const paid = payCourseCheckoutOrder(
      checkout.accessState,
      checkout.order.id,
      "wechat_pay",
      "2026-05-09T10:02:00.000Z"
    );

    expect(checkout.order.couponApplication).toMatchObject({
      claimId: "coupon_u_10001_course_11_coupon_20",
      marketingRuleId: "course_11_coupon_20",
      status: "reserved",
    });
    expect(paid.order.couponApplication).toMatchObject({
      status: "used",
      usedAt: "2026-05-09T10:02:00.000Z",
    });
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

  it("records paid membership checkout orders as membership source", () => {
    const pending = createMembershipCheckoutOrder(
      createEmptyCourseAccessState(),
      "2026-05-09T10:00:00.000Z",
      "u_10001"
    );
    const paid = payCourseCheckoutOrder(
      pending.accessState,
      pending.order.id,
      "wechat_pay",
      "2026-05-09T10:02:00.000Z"
    );

    expect(paid.accessState.membership).toMatchObject({
      status: "active",
      planName: "成长会员",
      sourceType: "checkout_order",
      sourceOrderId: pending.order.id,
      sourceUpdatedAt: "2026-05-09T10:02:00.000Z",
    });
  });

  it("creates and recalls membership checkout orders by plan id without a course anchor", () => {
    const pending = createMembershipCheckoutOrder(
      createEmptyCourseAccessState(),
      "2026-05-09T10:00:00.000Z",
      "u_10001",
      "growth_membership_yearly"
    );
    const recalled = findPendingMembershipCheckoutOrder(
      pending.accessState,
      "growth_membership_yearly"
    );

    expect(pending.order.items[0]).toMatchObject({
      type: "membership",
      targetId: "growth_membership_yearly",
      title: "成长会员年卡",
    });
    expect(recalled?.order.id).toBe(pending.order.id);
    expect(recalled?.payment.payableAmount).toBe(399);
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

  it("revokes course ownership after a refunded course order settles", () => {
    const state = settleRefundedCourseAccessOrder(
      {
        ownedCourseIds: [11],
        membership: { status: "none" },
        orders: [{ ...refundedCourseOrder, status: "refunding" }],
      },
      refundedCourseOrder
    );

    expect(state.orders[0]).toMatchObject({
      id: refundedCourseOrder.id,
      status: "refunded",
    });
    expect(state.ownedCourseIds).toEqual([]);
    expect(resolveCourseAccess(state, baseCourse).status).toBe(
      "requires_purchase"
    );
  });

  it("keeps ownership when another effective paid order exists for the same course", () => {
    const otherPaidOrder: Order = {
      ...refundedCourseOrder,
      id: "order_course_11_second_paid",
      status: "paid",
      paidAt: "2026-05-10T10:02:00.000Z",
    };

    const state = settleRefundedCourseAccessOrder(
      {
        ownedCourseIds: [11],
        membership: { status: "none" },
        orders: [otherPaidOrder, refundedCourseOrder],
      },
      refundedCourseOrder
    );

    expect(state.ownedCourseIds).toEqual([11]);
    expect(resolveCourseAccess(state, baseCourse).status).toBe("owned");
  });

  it("expires membership after its source checkout order is refunded", () => {
    const vipCourse = { ...baseCourse, id: 17, isVip: true };
    const state = settleRefundedCourseAccessOrder(
      {
        ownedCourseIds: [],
        membership: {
          status: "active",
          planName: "成长会员",
          activatedAt: "2026-05-09T10:00:00.000Z",
          expiresAt: "2027-05-09T10:00:00.000Z",
          sourceType: "checkout_order",
          sourceOrderId: refundedMembershipOrder.id,
          sourceUpdatedAt: "2026-05-09T10:02:00.000Z",
        },
        orders: [{ ...refundedMembershipOrder, status: "refunding" }],
      },
      refundedMembershipOrder,
      "2026-05-10T00:25:00.000Z"
    );

    expect(state.membership).toMatchObject({
      status: "expired",
      sourceType: "checkout_order",
      sourceOrderId: refundedMembershipOrder.id,
      sourceUpdatedAt: "2026-05-10T00:25:00.000Z",
      expiresAt: "2026-05-10T00:25:00.000Z",
    });
    expect(state.orders[0]).toMatchObject({
      id: refundedMembershipOrder.id,
      status: "refunded",
    });
    expect(
      resolveCourseAccess(state, vipCourse, "2026-05-10T00:26:00.000Z").status
    ).toBe("requires_membership");
  });

  it("does not expire manually sourced memberships when an old order refunds", () => {
    const state = settleRefundedCourseAccessOrder(
      {
        ownedCourseIds: [],
        membership: {
          status: "active",
          planName: "成长会员",
          activatedAt: "2026-05-09T10:00:00.000Z",
          expiresAt: "2027-05-09T10:00:00.000Z",
          sourceType: "admin_manual",
          sourceActorId: "operator_1",
          sourceUpdatedAt: "2026-05-09T10:05:00.000Z",
        },
        orders: [refundedMembershipOrder],
      },
      refundedMembershipOrder,
      "2026-05-10T00:25:00.000Z"
    );

    expect(state.membership).toMatchObject({
      status: "active",
      sourceType: "admin_manual",
      sourceActorId: "operator_1",
    });
  });

  it("keeps membership active when another effective membership order exists", () => {
    const otherMembershipOrder: Order = {
      ...refundedMembershipOrder,
      id: "order_membership_second_paid",
      status: "paid",
      paidAt: "2026-05-10T10:02:00.000Z",
      entitlementDeliveredAt: "2026-05-10T10:02:00.000Z",
    };

    const state = settleRefundedCourseAccessOrder(
      {
        ownedCourseIds: [],
        membership: {
          status: "active",
          planName: "成长会员",
          activatedAt: "2026-05-09T10:00:00.000Z",
          expiresAt: "2027-05-09T10:00:00.000Z",
          sourceType: "checkout_order",
          sourceOrderId: refundedMembershipOrder.id,
          sourceUpdatedAt: "2026-05-09T10:02:00.000Z",
        },
        orders: [otherMembershipOrder, refundedMembershipOrder],
      },
      refundedMembershipOrder,
      "2026-05-10T00:25:00.000Z"
    );

    expect(state.membership).toMatchObject({
      status: "active",
      sourceType: "checkout_order",
      sourceOrderId: otherMembershipOrder.id,
      sourceUpdatedAt: "2026-05-10T00:25:00.000Z",
    });
  });

  it("describes refunded checkout entitlement as stopped", () => {
    const result = createCourseCheckoutOrderResult({
      state: {
        ownedCourseIds: [],
        membership: { status: "none" },
        orders: [refundedCourseOrder],
      },
      order: refundedCourseOrder,
    });

    expect(result.entitlement).toMatchObject({
      status: "not_delivered",
      description: "订单已退款，课程权益已停止；如需继续学习可重新购买。",
    });
  });
});
