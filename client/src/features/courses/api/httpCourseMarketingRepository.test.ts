import { describe, expect, it } from "vitest";
import {
  parseCourseMarketingRuleConsoleResponse,
  parseCourseMarketingRuleSnapshotResponse,
} from "./httpCourseMarketingRepository";

const rule = {
  id: "rule-1",
  version: "course-marketing-v1",
  type: "course_coupon",
  status: "active",
  source: "course_product",
  name: "新人课程券",
  description: "购买指定课程自动抵扣。",
  badgeLabel: "券",
  priority: 100,
  stackable: true,
  scope: {
    courseIds: [2],
    categories: [],
    courseTypes: [],
    pathIds: [],
  },
  discount: {
    kind: "fixed_amount",
    amount: 50,
  },
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-17T10:00:00.000Z",
};

describe("http course marketing repository parsers", () => {
  it("parses public rule snapshots", () => {
    const snapshot = parseCourseMarketingRuleSnapshotResponse({
      ok: true,
      data: {
        serverTime: "2026-05-17T10:00:00.000Z",
        rules: [rule],
      },
    });

    expect(snapshot.rules[0]).toMatchObject({
      type: "course_coupon",
      discount: {
        kind: "fixed_amount",
        amount: 50,
      },
    });
  });

  it("parses admin consoles with summary", () => {
    const console = parseCourseMarketingRuleConsoleResponse({
      ok: true,
      data: {
        serverTime: "2026-05-17T10:00:00.000Z",
        rules: [rule],
        summary: {
          totalCount: 1,
          activeCount: 1,
          pausedCount: 0,
          expiredCount: 0,
          courseCouponCount: 1,
          membershipDiscountCount: 0,
          pathBundleCount: 0,
        },
      },
    });

    expect(console.summary.activeCount).toBe(1);
  });
});
