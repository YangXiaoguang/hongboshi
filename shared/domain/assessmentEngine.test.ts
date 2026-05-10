import { describe, expect, it } from "vitest";
import { quickAssessmentFlow } from "../data/assessmentQuestions";
import { generateAssessmentResult } from "./assessmentEngine";

function answerAll(value: number) {
  return quickAssessmentFlow.questions.map(question => ({
    questionId: question.id,
    value,
  }));
}

describe("assessment engine", () => {
  it("generates a low-risk report with a follow-up recommendation", () => {
    const result = generateAssessmentResult({
      flow: quickAssessmentFlow,
      answers: answerAll(0),
      now: "2026-05-10T10:00:00+08:00",
      userId: "user_1",
    });

    expect(result.report.riskLevel).toBe("low");
    expect(result.report.dimensions.emotion).toBe(0);
    expect(result.report.recommendations[0].target).toBe("assessment");
  });

  it("prioritizes real-world support when risk answers are urgent", () => {
    const answers = answerAll(1).map(answer =>
      answer.questionId === "risk_self_harm_signal"
        ? { ...answer, value: 4 }
        : answer
    );

    const result = generateAssessmentResult({
      flow: quickAssessmentFlow,
      answers,
      now: "2026-05-10T10:00:00+08:00",
    });

    expect(result.report.riskLevel).toBe("urgent");
    expect(result.riskEvent?.riskLevel).toBe("urgent");
    expect(result.report.recommendations[0]).toMatchObject({
      target: "emergency_resource",
      priority: 100,
    });
  });

  it("requires all mandatory answers", () => {
    expect(() =>
      generateAssessmentResult({
        flow: quickAssessmentFlow,
        answers: answerAll(1).slice(0, -1),
      })
    ).toThrow("缺少必要测评回答");
  });
});
