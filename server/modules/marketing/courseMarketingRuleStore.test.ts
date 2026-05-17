import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import type { Course } from "../../../shared/domain";
import { InMemoryCourseProductStore } from "../catalog/courseProductStore";
import {
  buildCourseMarketingRulesFromCourses,
  InMemoryCourseMarketingRuleStore,
  JsonFileCourseMarketingRuleStore,
  updateCourseMarketingRuleStatus,
} from "./courseMarketingRuleStore";

const course: Course = {
  id: 12,
  title: "亲子沟通训练",
  coverUrl: "https://example.com/course.jpg",
  category: "家庭教育",
  type: "直播",
  teacher: "周老师",
  learners: 6200,
  price: 399,
  originalPrice: 599,
  isFree: false,
  isVip: true,
  coupon: {
    label: "家庭成长券",
    amount: 80,
  },
  discount: {
    label: "周末限时",
    endsAt: "2026-05-18T00:00:00.000Z",
  },
  createdAt: "2026-03-01",
};

describe("course marketing rule store", () => {
  it("builds system and course-derived marketing rules", () => {
    const rules = buildCourseMarketingRulesFromCourses(
      [course],
      "2026-05-17T10:00:00.000Z"
    );

    expect(rules.map(rule => rule.type)).toEqual([
      "membership_discount",
      "path_bundle",
      "course_coupon",
      "limited_discount",
    ]);
    expect(rules.find(rule => rule.type === "course_coupon")).toMatchObject({
      name: "家庭成长券",
      discount: {
        kind: "fixed_amount",
        amount: 80,
      },
      scope: {
        courseIds: [12],
      },
    });
  });

  it("marks expired limited discounts without removing the rule", () => {
    const rules = buildCourseMarketingRulesFromCourses(
      [course],
      "2026-05-19T10:00:00.000Z"
    );

    expect(rules.find(rule => rule.type === "limited_discount")).toMatchObject({
      status: "expired",
    });
  });

  it("applies in-memory status overrides and writes audit events", async () => {
    const store = new InMemoryCourseMarketingRuleStore(
      new InMemoryCourseProductStore([])
    );

    const result = await updateCourseMarketingRuleStatus({
      ruleId: "system_path_bundle_preview",
      request: {
        status: "paused",
        reason: "节奏调整暂停活动",
      },
      actorId: "operator_1",
      actorRoles: ["operator"],
      store,
      now: "2026-05-17T11:00:00.000Z",
    });

    expect(result.rule).toMatchObject({
      id: "system_path_bundle_preview",
      status: "paused",
    });
    expect(result.auditEvent).toMatchObject({
      action: "rule_status_update",
      actorRoles: ["operator"],
      reason: "节奏调整暂停活动",
    });

    const rules = await store.listRules("2026-05-17T11:05:00.000Z");
    expect(
      rules.find(rule => rule.id === "system_path_bundle_preview")
    ).toMatchObject({
      status: "paused",
      updatedAt: "2026-05-17T11:00:00.000Z",
    });
  });

  it("persists status overrides and audit events in the JSON store", async () => {
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "hongboshi-marketing-")
    );
    const filePath = path.join(tempDir, "course-marketing-rules.json");
    const productStore = new InMemoryCourseProductStore([]);

    try {
      const store = new JsonFileCourseMarketingRuleStore(
        productStore,
        filePath
      );
      await updateCourseMarketingRuleStatus({
        ruleId: "system_growth_membership_yearly_discount",
        request: {
          status: "paused",
          reason: "会员活动临时暂停",
        },
        actorId: "operator_1",
        store,
        now: "2026-05-17T12:00:00.000Z",
      });

      const reloaded = new JsonFileCourseMarketingRuleStore(
        productStore,
        filePath
      );

      expect(
        (
          await reloaded.getRule(
            "system_growth_membership_yearly_discount",
            "2026-05-17T12:05:00.000Z"
          )
        )?.status
      ).toBe("paused");
      expect(
        (
          await reloaded.listAuditEvents(
            "system_growth_membership_yearly_discount"
          )
        )[0]
      ).toMatchObject({
        action: "rule_status_update",
        reason: "会员活动临时暂停",
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
