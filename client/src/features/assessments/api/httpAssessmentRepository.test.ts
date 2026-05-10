import { describe, expect, it } from "vitest";
import {
  parseAssessmentFlowResponse,
  parseAssessmentResultResponse,
  parseLatestAssessmentResultResponse,
} from "./httpAssessmentRepository";

describe("http assessment repository parsing", () => {
  it("parses a successful assessment flow response", () => {
    const flow = parseAssessmentFlowResponse({
      ok: true,
      data: {
        id: "quick_state_check",
        title: "心理状态快速评估",
        description: "快速理解状态",
        estimatedMinutes: 4,
        questions: [
          {
            id: "emotion_low",
            dimension: "emotion",
            type: "scale",
            title: "最近低落程度",
            scale: { min: 0, max: 4 },
            required: true,
          },
        ],
      },
    });

    expect(flow.questions[0].dimension).toBe("emotion");
  });

  it("parses a successful assessment result response", () => {
    const result = parseAssessmentResultResponse({
      ok: true,
      data: {
        report: {
          id: "report_1",
          dimensions: {
            emotion: 40,
            sleep: 20,
            relationship: 10,
            parent_child: 0,
            workplace: 60,
            self_growth: 30,
            risk: 0,
          },
          riskLevel: "medium",
          summary: "当前以职场压力为主。",
          recommendations: [
            {
              target: "course",
              targetId: "5",
              title: "职场压力管理",
              reason: "匹配职场压力",
              priority: 86,
            },
          ],
          createdAt: "2026-05-10T10:00:00+08:00",
        },
      },
    });

    expect(result.report.recommendations[0].targetId).toBe("5");
  });

  it("parses an empty latest assessment response", () => {
    expect(
      parseLatestAssessmentResultResponse({
        ok: true,
        data: null,
      })
    ).toBeNull();
  });

  it("throws on API error payloads", () => {
    expect(() =>
      parseAssessmentFlowResponse({
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: "测评不存在",
        },
      })
    ).toThrow("测评不存在");
  });
});
