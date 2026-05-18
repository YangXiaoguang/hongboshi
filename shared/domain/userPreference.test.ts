import { describe, expect, it } from "vitest";
import {
  claimUserCoupon,
  createEmptyUserPreference,
  normalizeUserPreference,
  updateUserFavoriteCourses,
  useUserCouponClaim,
} from "./userPreference";

describe("user preference domain", () => {
  it("updates favorite courses without duplicates", () => {
    const preference = createEmptyUserPreference({
      userId: "u_phone_8000",
      now: "2026-05-18T08:00:00.000Z",
    });

    const updated = updateUserFavoriteCourses({
      preference,
      favoriteCourseIds: [3, 2, 3],
      source: "course_detail",
      now: "2026-05-18T09:00:00.000Z",
    });

    expect(updated.favoriteCourses).toEqual([
      expect.objectContaining({
        courseId: 3,
        source: "course_detail",
        favoritedAt: "2026-05-18T09:00:00.000Z",
      }),
      expect.objectContaining({
        courseId: 2,
        source: "course_detail",
      }),
    ]);
    expect(updated.updatedAt).toBe("2026-05-18T09:00:00.000Z");
  });

  it("preserves original favorited time for existing courses", () => {
    const preference = updateUserFavoriteCourses({
      preference: createEmptyUserPreference({
        userId: "u_phone_8000",
        now: "2026-05-18T08:00:00.000Z",
      }),
      favoriteCourseIds: [1],
      source: "home",
      now: "2026-05-18T09:00:00.000Z",
    });

    const updated = updateUserFavoriteCourses({
      preference,
      favoriteCourseIds: [1, 4],
      source: "course_list",
      now: "2026-05-18T10:00:00.000Z",
    });

    expect(updated.favoriteCourses[0]).toMatchObject({
      courseId: 1,
      source: "home",
      favoritedAt: "2026-05-18T09:00:00.000Z",
      updatedAt: "2026-05-18T10:00:00.000Z",
    });
    expect(updated.favoriteCourses[1]).toMatchObject({
      courseId: 4,
      source: "course_list",
      favoritedAt: "2026-05-18T10:00:00.000Z",
    });
  });

  it("normalizes invalid preference payloads safely", () => {
    expect(normalizeUserPreference({ userId: "", favoriteCourses: [] })).toBe(
      undefined
    );
  });

  it("claims coupon rules idempotently", () => {
    const preference = createEmptyUserPreference({
      userId: "u_phone_8000",
      now: "2026-05-18T08:00:00.000Z",
    });

    const claimed = claimUserCoupon({
      preference,
      marketingRuleId: "course_1_coupon_立减20",
      expiresAt: "2026-06-01T00:00:00.000Z",
      now: "2026-05-18T09:00:00.000Z",
    });
    const claimedAgain = claimUserCoupon({
      preference: claimed,
      marketingRuleId: "course_1_coupon_立减20",
      now: "2026-05-18T10:00:00.000Z",
    });

    expect(claimedAgain.couponClaims).toHaveLength(1);
    expect(claimedAgain.couponClaims[0]).toMatchObject({
      marketingRuleId: "course_1_coupon_立减20",
      status: "claimed",
      claimedAt: "2026-05-18T09:00:00.000Z",
      expiresAt: "2026-06-01T00:00:00.000Z",
    });
  });

  it("marks claimed coupons as used by order idempotently", () => {
    const preference = claimUserCoupon({
      preference: createEmptyUserPreference({
        userId: "u_phone_8000",
        now: "2026-05-18T08:00:00.000Z",
      }),
      marketingRuleId: "course_1_coupon_20",
      now: "2026-05-18T09:00:00.000Z",
    });

    const used = useUserCouponClaim({
      preference,
      couponClaimId: preference.couponClaims[0].id,
      orderId: "order_course_1_u_phone_8000",
      now: "2026-05-18T09:05:00.000Z",
    });
    const duplicate = useUserCouponClaim({
      preference: used,
      couponClaimId: preference.couponClaims[0].id,
      orderId: "order_course_1_u_phone_8000",
      now: "2026-05-18T09:06:00.000Z",
    });

    expect(used.couponClaims[0]).toMatchObject({
      status: "used",
      usedAt: "2026-05-18T09:05:00.000Z",
      usedOrderId: "order_course_1_u_phone_8000",
    });
    expect(duplicate.couponClaims[0].usedAt).toBe(
      "2026-05-18T09:05:00.000Z"
    );
  });
});
