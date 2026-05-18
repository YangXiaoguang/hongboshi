import { describe, expect, it } from "vitest";
import { parseUserPreferenceResponse } from "./httpUserPreferenceRepository";

describe("http user preference repository parsing", () => {
  it("parses a successful preference response", () => {
    const result = parseUserPreferenceResponse({
      ok: true,
      data: {
        preference: {
          userId: "u_phone_8000",
          favoriteCourses: [
            {
              courseId: 2,
              source: "course_detail",
              favoritedAt: "2026-05-18T08:00:00.000Z",
              updatedAt: "2026-05-18T08:00:00.000Z",
            },
          ],
          couponClaims: [
            {
              id: "coupon_u_phone_8000_course_1_coupon_20",
              marketingRuleId: "course_1_coupon_20",
              status: "claimed",
              claimedAt: "2026-05-18T08:30:00.000Z",
              expiresAt: "2026-06-01T00:00:00.000Z",
              updatedAt: "2026-05-18T08:30:00.000Z",
            },
          ],
          updatedAt: "2026-05-18T08:00:00.000Z",
        },
        generatedAt: "2026-05-18T08:00:00.000Z",
      },
    });

    expect(result.preference.favoriteCourses[0]?.courseId).toBe(2);
    expect(result.preference.couponClaims[0]?.status).toBe("claimed");
  });

  it("throws on failed preference responses", () => {
    expect(() =>
      parseUserPreferenceResponse({
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "请先登录后继续操作",
        },
      })
    ).toThrow("请先登录后继续操作");
  });
});
