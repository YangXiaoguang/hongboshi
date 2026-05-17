import { describe, expect, it } from "vitest";
import { courses } from "../../../shared/data/mockCourses";
import {
  InMemoryCourseProductStore,
  courseProductFromCourse,
} from "../catalog/courseProductStore";
import {
  getCourseMarketingRuleConsolePayload,
  getCourseMarketingRuleSnapshotPayload,
} from "./courseMarketingApi";
import { DerivedCourseMarketingRuleStore } from "./courseMarketingRuleStore";

function createStore() {
  return new DerivedCourseMarketingRuleStore(
    new InMemoryCourseProductStore(
      courses.slice(0, 4).map(courseProductFromCourse)
    )
  );
}

describe("course marketing api payloads", () => {
  it("returns active public rules for the course storefront", async () => {
    const payload = await getCourseMarketingRuleSnapshotPayload(
      createStore(),
      "2026-05-17T10:00:00.000Z"
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (payload.body.ok) {
      expect(payload.body.data.rules.length).toBeGreaterThan(0);
      expect(
        payload.body.data.rules.every(rule => rule.status === "active")
      ).toBe(true);
      expect(
        payload.body.data.rules.some(rule => rule.type === "path_bundle")
      ).toBe(true);
    }
  });

  it("requires catalog read permission for the admin console", async () => {
    const anonymous = await getCourseMarketingRuleConsolePayload(
      null,
      createStore(),
      "2026-05-17T10:00:00.000Z"
    );
    expect(anonymous.status).toBe(401);

    const forbidden = await getCourseMarketingRuleConsolePayload(
      { id: "member_1", roles: ["member"] },
      createStore(),
      "2026-05-17T10:00:00.000Z"
    );
    expect(forbidden.status).toBe(403);

    const allowed = await getCourseMarketingRuleConsolePayload(
      { id: "catalog_viewer_1", roles: ["catalog_viewer"] },
      createStore(),
      "2026-05-17T10:00:00.000Z"
    );
    expect(allowed.status).toBe(200);
    expect(allowed.body.ok).toBe(true);
    if (allowed.body.ok) {
      expect(allowed.body.data.summary.totalCount).toBe(
        allowed.body.data.rules.length
      );
    }
  });
});
