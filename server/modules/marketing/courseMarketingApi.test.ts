import { describe, expect, it } from "vitest";
import { courses } from "../../../shared/data/mockCourses";
import {
  InMemoryCourseProductStore,
  courseProductFromCourse,
} from "../catalog/courseProductStore";
import {
  getCourseMarketingRuleConsolePayload,
  getCourseMarketingRuleSnapshotPayload,
  updateCourseMarketingRuleStatusPayload,
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
    if (payload.body.ok && "rules" in payload.body.data) {
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
    if (allowed.body.ok && "summary" in allowed.body.data) {
      expect(allowed.body.data.summary.totalCount).toBe(
        allowed.body.data.rules.length
      );
    }
  });

  it("updates rule status with catalog price permission and returns audit", async () => {
    const store = createStore();

    const forbidden = await updateCourseMarketingRuleStatusPayload(
      { id: "catalog_viewer_1", roles: ["catalog_viewer"] },
      "system_path_bundle_preview",
      {
        status: "paused",
        reason: "活动节奏调整",
      },
      store,
      "2026-05-17T11:00:00.000Z"
    );
    expect(forbidden.status).toBe(403);

    const allowed = await updateCourseMarketingRuleStatusPayload(
      { id: "catalog_operator_1", roles: ["catalog_operator"] },
      "system_path_bundle_preview",
      {
        status: "paused",
        reason: "活动节奏调整",
      },
      store,
      "2026-05-17T11:00:00.000Z"
    );

    expect(allowed.status).toBe(200);
    expect(allowed.body.ok).toBe(true);
    if (allowed.body.ok && "rule" in allowed.body.data) {
      expect(allowed.body.data.rule.status).toBe("paused");
      expect(allowed.body.data.auditEvent).toMatchObject({
        action: "rule_status_update",
        actorRoles: ["catalog_operator"],
      });
    }

    const snapshot = await getCourseMarketingRuleSnapshotPayload(
      store,
      "2026-05-17T11:05:00.000Z"
    );
    expect(snapshot.body.ok).toBe(true);
    if (snapshot.body.ok && "rules" in snapshot.body.data) {
      expect(
        snapshot.body.data.rules.some(
          rule => rule.id === "system_path_bundle_preview"
        )
      ).toBe(false);
    }

    const conflict = await updateCourseMarketingRuleStatusPayload(
      { id: "catalog_operator_1", roles: ["catalog_operator"] },
      "system_path_bundle_preview",
      {
        status: "paused",
        reason: "重复暂停规则",
      },
      store,
      "2026-05-17T11:10:00.000Z"
    );
    expect(conflict.status).toBe(409);
  });
});
