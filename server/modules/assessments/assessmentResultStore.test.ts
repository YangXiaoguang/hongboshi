import { describe, expect, it } from "vitest";
import type { AssessmentResult } from "../../../shared/domain";
import { InMemoryAssessmentResultStore } from "./assessmentResultStore";

function createResult(id: string, createdAt: string): AssessmentResult {
  return {
    report: {
      id,
      userId: "user_1",
      dimensions: {
        emotion: 80,
        sleep: 20,
        relationship: 10,
        parent_child: 0,
        workplace: 0,
        self_growth: 30,
        risk: 0,
      },
      riskLevel: "high",
      summary: "当前状态建议获得专业支持。",
      recommendations: [
        {
          target: "counseling",
          title: "预约咨询",
          reason: "需要专业支持",
          priority: 100,
        },
      ],
      createdAt,
    },
  };
}

describe("assessment result store", () => {
  it("keeps the latest result at the front per user", () => {
    const store = new InMemoryAssessmentResultStore();

    store.save("user_1", createResult("report_1", "2026-05-10T08:00:00.000Z"));
    store.save("user_1", createResult("report_2", "2026-05-10T09:00:00.000Z"));

    expect(store.latest("user_1")?.report.id).toBe("report_2");
    expect(store.listByUser("user_1").map(result => result.report.id)).toEqual([
      "report_2",
      "report_1",
    ]);
  });

  it("returns cloned results so callers cannot mutate store state", () => {
    const store = new InMemoryAssessmentResultStore();
    const result = store.save(
      "user_1",
      createResult("report_1", "2026-05-10T08:00:00.000Z")
    );

    result.report.summary = "mutated";

    expect(store.latest("user_1")?.report.summary).toBe(
      "当前状态建议获得专业支持。"
    );
  });
});
