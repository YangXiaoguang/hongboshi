import { beforeEach, describe, expect, it } from "vitest";
import { CourseMarketingRuleSchema } from "../../../shared/domain";
import {
  claimUserCouponPayload,
  getUserPreferencePayload,
  resetUserPreferenceStore,
  updateUserFavoriteCoursesPayload,
} from "./userPreferenceApi";

const activeCouponRule = CourseMarketingRuleSchema.parse({
  id: "course_1_coupon_20",
  type: "course_coupon",
  status: "active",
  source: "course_product",
  name: "新人立减券",
  description: "购买课程时自动抵扣 20 元。",
  badgeLabel: "券",
  priority: 300,
  stackable: true,
  scope: { courseIds: [1] },
  discount: { kind: "fixed_amount", amount: 20 },
  startsAt: "2026-01-01T00:00:00.000Z",
  endsAt: "2026-06-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-05-18T08:00:00.000Z",
});

const fakeMarketingRuleStore = {
  getRule: async (ruleId: string) =>
    ruleId === activeCouponRule.id ? activeCouponRule : undefined,
};

describe("user preference API payloads", () => {
  beforeEach(async () => {
    await resetUserPreferenceStore();
  });

  it("returns an empty preference for a new user", async () => {
    const payload = await getUserPreferencePayload(
      "u_phone_8000",
      "2026-05-18T08:00:00.000Z"
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (!payload.body.ok) return;
    expect(payload.body.data.preference).toMatchObject({
      userId: "u_phone_8000",
      favoriteCourses: [],
      updatedAt: "2026-05-18T08:00:00.000Z",
    });
  });

  it("saves favorite course ids by user", async () => {
    const payload = await updateUserFavoriteCoursesPayload(
      "u_phone_8000",
      {
        favoriteCourseIds: [5, 2, 5],
        source: "course_list",
      },
      "2026-05-18T09:00:00.000Z"
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (!payload.body.ok) return;
    expect(
      payload.body.data.preference.favoriteCourses.map(item => item.courseId)
    ).toEqual([5, 2]);

    const nextPayload = await getUserPreferencePayload(
      "u_phone_8000",
      "2026-05-18T10:00:00.000Z"
    );
    expect(nextPayload.body.ok).toBe(true);
    if (!nextPayload.body.ok) return;
    expect(
      nextPayload.body.data.preference.favoriteCourses.map(
        item => item.courseId
      )
    ).toEqual([5, 2]);
  });

  it("rejects invalid favorite updates", async () => {
    const payload = await updateUserFavoriteCoursesPayload("u_phone_8000", {
      favoriteCourseIds: [-1],
      source: "course_detail",
    });

    expect(payload.status).toBe(400);
    expect(payload.body.ok).toBe(false);
  });

  it("claims an active course coupon", async () => {
    const payload = await claimUserCouponPayload(
      "u_phone_8000",
      { marketingRuleId: activeCouponRule.id },
      "2026-05-18T09:00:00.000Z",
      fakeMarketingRuleStore
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (!payload.body.ok) return;
    expect(payload.body.data.preference.couponClaims).toEqual([
      expect.objectContaining({
        marketingRuleId: activeCouponRule.id,
        status: "claimed",
        claimedAt: "2026-05-18T09:00:00.000Z",
        expiresAt: "2026-06-01T00:00:00.000Z",
      }),
    ]);
  });

  it("rejects missing coupon rules", async () => {
    const payload = await claimUserCouponPayload(
      "u_phone_8000",
      { marketingRuleId: "missing_rule" },
      "2026-05-18T09:00:00.000Z",
      fakeMarketingRuleStore
    );

    expect(payload.status).toBe(404);
    expect(payload.body.ok).toBe(false);
  });
});
