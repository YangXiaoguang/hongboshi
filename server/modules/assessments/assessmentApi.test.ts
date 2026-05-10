import { beforeEach, describe, expect, it } from "vitest";
import {
  getLatestAssessmentResult,
  getLatestAssessmentResultPayload,
  getQuickAssessmentFlowPayload,
  resetAssessmentResultStore,
  submitQuickAssessmentPayload,
} from "./assessmentApi";

describe("assessment api payloads", () => {
  beforeEach(async () => {
    await resetAssessmentResultStore();
  });

  it("returns the quick assessment flow", () => {
    const payload = getQuickAssessmentFlowPayload();

    expect(payload.ok).toBe(true);
    if (payload.ok) {
      expect(payload.data.questions.length).toBeGreaterThan(3);
      expect(
        payload.data.questions.some(question => question.riskSensitive)
      ).toBe(true);
    }
  });

  it("generates a report from submitted answers", async () => {
    const flowPayload = getQuickAssessmentFlowPayload();
    if (!flowPayload.ok) throw new Error("expected flow");

    const payload = await submitQuickAssessmentPayload(
      {
        answers: flowPayload.data.questions.map(question => ({
          questionId: question.id,
          value: question.dimension === "workplace" ? 4 : 1,
        })),
      },
      "user_1"
    );

    expect(payload.status).toBe(200);
    if (payload.body.ok) {
      expect(payload.body.data.report.userId).toBe("user_1");
      expect(payload.body.data.report.dimensions.workplace).toBe(100);
      expect(payload.body.data.report.recommendations[0].target).toBe(
        "counseling"
      );
      await expect(getLatestAssessmentResult("user_1")).resolves.toMatchObject({
        report: {
          id: payload.body.data.report.id,
        },
      });

      const latestPayload = await getLatestAssessmentResultPayload("user_1");
      expect(latestPayload.status).toBe(200);
      if (latestPayload.body.ok) {
        expect(latestPayload.body.data?.report.id).toBe(
          payload.body.data.report.id
        );
      }
    }
  });

  it("rejects incomplete answers", async () => {
    const payload = await submitQuickAssessmentPayload({ answers: [] });

    expect(payload.status).toBe(400);
    expect(payload.body.ok).toBe(false);
  });

  it("requires login before reading the latest report", async () => {
    const payload = await getLatestAssessmentResultPayload();

    expect(payload.status).toBe(401);
    expect(payload.body.ok).toBe(false);
  });
});
