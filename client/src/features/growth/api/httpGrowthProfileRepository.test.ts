import { describe, expect, it } from "vitest";
import {
  GrowthProfileRequestError,
  parseGrowthProfileResponse,
} from "./httpGrowthProfileRepository";

describe("http growth profile repository parsing", () => {
  it("parses a successful growth profile response", () => {
    const profile = parseGrowthProfileResponse({
      ok: true,
      data: {
        userId: "user_1",
        courseAccess: {
          ownedCourseIds: [16],
          membership: { status: "none" },
          orders: [],
        },
        counseling: {
          appointments: [],
          serverTime: "2026-05-10T00:00:00.000Z",
        },
        summary: {
          ownedCourseCount: 1,
          orderCount: 0,
          counselingAppointmentCount: 0,
          upcomingCounselingCount: 0,
          hasActiveMembership: false,
        },
        timeline: [],
        generatedAt: "2026-05-10T00:00:00.000Z",
      },
    });

    expect(profile.userId).toBe("user_1");
    expect(profile.summary.ownedCourseCount).toBe(1);
  });

  it("raises typed errors from API error payloads", () => {
    expect(() =>
      parseGrowthProfileResponse({
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "请先登录后查看成长档案",
        },
      })
    ).toThrow(GrowthProfileRequestError);
  });
});
