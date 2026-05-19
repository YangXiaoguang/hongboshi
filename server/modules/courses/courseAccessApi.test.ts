import { describe, expect, it, beforeEach } from "vitest";
import {
  activateMembershipPayload,
  cancelCourseCheckoutOrderPayload,
  createCourseCheckoutOrderPayload,
  getCourseAccessPayload,
  payCourseCheckoutOrderPayload,
  purchaseCoursePayload,
  resetCourseAccessStore,
} from "./courseAccessApi";
import {
  InMemoryCourseProductStore,
  seedProducts,
} from "../catalog/courseProductStore";
import { CourseMarketingRuleSchema } from "../../../shared/domain";
import {
  claimUserCouponPayload,
  getUserPreferencePayload,
  resetUserPreferenceStore,
} from "../users/userPreferenceApi";

const activeCourseCouponRule = CourseMarketingRuleSchema.parse({
  id: "course_16_coupon_20",
  type: "course_coupon",
  status: "active",
  source: "course_product",
  name: "新人专享减20",
  description: "购买课程时抵扣 20 元。",
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

const fakeMarketingRuleStore = {
  getRule: async (ruleId: string) =>
    ruleId === activeCourseCouponRule.id ? activeCourseCouponRule : undefined,
};

describe("course access API payloads", () => {
  beforeEach(async () => {
    await resetCourseAccessStore();
    await resetUserPreferenceStore();
  });

  it("returns the current empty access state", async () => {
    const payload = await getCourseAccessPayload();

    expect(payload.ok).toBe(true);
    if (!payload.ok) return;
    expect(payload.data.ownedCourseIds).toEqual([]);
    expect(payload.data.membership.status).toBe("none");
  });

  it("purchases a paid course and creates a paid order", async () => {
    const payload = await purchaseCoursePayload(16);

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (!payload.body.ok) return;
    expect(payload.body.data.ownedCourseIds).toContain(16);
    expect(payload.body.data.orders[0]).toMatchObject({
      status: "paid",
      items: [{ type: "course", targetId: "16" }],
    });
  });

  it("creates a pending course checkout order before payment", async () => {
    const payload = await createCourseCheckoutOrderPayload(
      { mode: "course", courseId: 16 },
      "u_10001",
      "2026-05-09T10:00:00.000Z"
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (!payload.body.ok) return;
    expect(payload.body.data.order).toMatchObject({
      status: "pending_payment",
      userId: "u_10001",
      items: [{ type: "course", targetId: "16" }],
    });
    expect(payload.body.data.accessState.ownedCourseIds).toEqual([]);
  });

  it("marks checkout order paid and delivers access idempotently", async () => {
    const created = await createCourseCheckoutOrderPayload(
      { mode: "course", courseId: 16 },
      "u_10001",
      "2026-05-09T10:00:00.000Z"
    );
    if (!created.body.ok) throw new Error("expected created checkout");

    const paid = await payCourseCheckoutOrderPayload(
      created.body.data.order.id,
      { paymentChannel: "alipay" },
      "u_10001",
      "2026-05-09T10:02:00.000Z"
    );
    const duplicate = await payCourseCheckoutOrderPayload(
      created.body.data.order.id,
      { paymentChannel: "alipay" },
      "u_10001",
      "2026-05-09T10:03:00.000Z"
    );

    expect(paid.status).toBe(200);
    expect(duplicate.status).toBe(200);
    expect(paid.body.ok).toBe(true);
    expect(duplicate.body.ok).toBe(true);
    if (!paid.body.ok || !duplicate.body.ok) return;
    expect(paid.body.data.order.status).toBe("paid");
    expect(paid.body.data.order.paymentChannel).toBe("alipay");
    expect(paid.body.data.accessState.ownedCourseIds).toEqual([16]);
    expect(duplicate.body.data.accessState.ownedCourseIds).toEqual([16]);
    expect(duplicate.body.data.order.paidAt).toBe("2026-05-09T10:02:00.000Z");
  });

  it("records claimed coupon on checkout and marks it used after payment", async () => {
    const productStore = new InMemoryCourseProductStore(seedProducts());
    const claimed = await claimUserCouponPayload(
      "u_10001",
      { marketingRuleId: activeCourseCouponRule.id },
      "2026-05-09T09:58:00.000Z",
      fakeMarketingRuleStore
    );
    if (!claimed.body.ok) throw new Error("expected claimed coupon");
    const couponClaimId = claimed.body.data.preference.couponClaims[0].id;

    const created = await createCourseCheckoutOrderPayload(
      { mode: "course", courseId: 16, couponClaimId },
      "u_10001",
      "2026-05-09T10:00:00.000Z",
      productStore,
      fakeMarketingRuleStore
    );
    if (!created.body.ok) throw new Error("expected created checkout");
    const paid = await payCourseCheckoutOrderPayload(
      created.body.data.order.id,
      { paymentChannel: "alipay" },
      "u_10001",
      "2026-05-09T10:02:00.000Z"
    );
    const preference = await getUserPreferencePayload(
      "u_10001",
      "2026-05-09T10:03:00.000Z"
    );

    expect(created.body.data.order.couponApplication).toMatchObject({
      claimId: couponClaimId,
      marketingRuleId: activeCourseCouponRule.id,
      status: "reserved",
    });
    expect(paid.status).toBe(200);
    expect(paid.body.ok).toBe(true);
    if (!paid.body.ok || !preference.body.ok) return;
    expect(paid.body.data.order.couponApplication).toMatchObject({
      claimId: couponClaimId,
      status: "used",
      usedAt: "2026-05-09T10:02:00.000Z",
    });
    expect(preference.body.data.preference.couponClaims[0]).toMatchObject({
      id: couponClaimId,
      status: "used",
      usedOrderId: created.body.data.order.id,
      usedAt: "2026-05-09T10:02:00.000Z",
    });
  });

  it("cancels pending checkout orders without delivering access", async () => {
    const created = await createCourseCheckoutOrderPayload(
      { mode: "course", courseId: 16 },
      "u_10001",
      "2026-05-09T10:00:00.000Z"
    );
    if (!created.body.ok) throw new Error("expected created checkout");

    const cancelled = await cancelCourseCheckoutOrderPayload(
      created.body.data.order.id,
      "u_10001",
      "2026-05-09T10:05:00.000Z"
    );
    const paid = await payCourseCheckoutOrderPayload(
      created.body.data.order.id,
      { paymentChannel: "manual" },
      "u_10001",
      "2026-05-09T10:06:00.000Z"
    );

    expect(cancelled.status).toBe(200);
    expect(cancelled.body.ok).toBe(true);
    if (!cancelled.body.ok) return;
    expect(cancelled.body.data.order.status).toBe("closed");
    expect(cancelled.body.data.accessState.ownedCourseIds).toEqual([]);
    expect(paid.status).toBe(409);
  });

  it("keeps checkout order pending when simulated payment fails", async () => {
    const created = await createCourseCheckoutOrderPayload(
      { mode: "course", courseId: 16 },
      "u_10001",
      "2026-05-09T10:00:00.000Z"
    );
    if (!created.body.ok) throw new Error("expected created checkout");

    const failed = await payCourseCheckoutOrderPayload(
      created.body.data.order.id,
      { paymentChannel: "wechat_pay", simulateResult: "failed" },
      "u_10001",
      "2026-05-09T10:02:00.000Z"
    );
    const state = await getCourseAccessPayload("u_10001");

    expect(failed.status).toBe(409);
    expect(state.ok).toBe(true);
    if (!state.ok) return;
    expect(state.data.orders[0]?.status).toBe("pending_payment");
    expect(state.data.ownedCourseIds).toEqual([]);
  });

  it("rejects checkout creation for unpublished course products", async () => {
    const store = new InMemoryCourseProductStore(
      seedProducts().map(product =>
        product.courseId === 16
          ? { ...product, status: "unpublished" as const }
          : product
      )
    );

    const payload = await createCourseCheckoutOrderPayload(
      { mode: "course", courseId: 16 },
      "u_10001",
      "2026-05-09T10:00:00.000Z",
      store
    );

    expect(payload.status).toBe(409);
    expect(payload.body.ok).toBe(false);
  });

  it("activates membership access", async () => {
    const payload = await activateMembershipPayload();

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (!payload.body.ok) return;
    expect(payload.body.data.membership).toMatchObject({
      status: "active",
      sourceType: "direct_activation",
      sourceActorId: "local-user",
    });
    expect(payload.body.data.membership.expiresAt).toBeTruthy();
  });

  it("keeps course access isolated by user id", async () => {
    const firstUser = await purchaseCoursePayload(16, "u_10001");
    const secondUser = await getCourseAccessPayload("u_20001");

    expect(firstUser.status).toBe(200);
    expect(secondUser.ok).toBe(true);
    if (!secondUser.ok) return;
    expect(secondUser.data.ownedCourseIds).toEqual([]);
  });
});
