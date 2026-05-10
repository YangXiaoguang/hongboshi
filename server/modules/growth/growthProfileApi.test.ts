import { beforeEach, describe, expect, it } from "vitest";
import { quickAssessmentFlow } from "../../../shared/data/assessmentQuestions";
import {
  resetAssessmentResultStore,
  submitQuickAssessmentPayload,
} from "../assessments/assessmentApi";
import {
  createCounselingAppointmentPayload,
  getCounselingAvailabilityPayload,
  resetCounselingAppointmentStore,
} from "../counseling/counselingApi";
import {
  purchaseCoursePayload,
  resetCourseAccessStore,
} from "../courses/courseAccessApi";
import { getGrowthProfilePayload } from "./growthProfileApi";

const userId = "u_growth_1";
const fixedNow = "2026-05-10T00:00:00.000Z";

describe("growth profile api payloads", () => {
  beforeEach(async () => {
    await resetAssessmentResultStore();
    resetCourseAccessStore();
    resetCounselingAppointmentStore(new Date(fixedNow));
  });

  it("requires login before reading the growth profile", async () => {
    const payload = await getGrowthProfilePayload(undefined, fixedNow);

    expect(payload.status).toBe(401);
    expect(payload.body.ok).toBe(false);
  });

  it("aggregates course access, assessment and counseling records", async () => {
    purchaseCoursePayload(16, userId);

    await submitQuickAssessmentPayload(
      {
        answers: quickAssessmentFlow.questions.map(question => ({
          questionId: question.id,
          value: question.dimension === "workplace" ? 4 : 1,
        })),
      },
      userId
    );

    const availability = getCounselingAvailabilityPayload(fixedNow);
    if (!availability.ok) throw new Error("expected availability");
    const slot = availability.data.slots[0];

    createCounselingAppointmentPayload(
      {
        counselorId: slot.counselorId,
        slotId: slot.id,
        channel: slot.channel,
        concernTags: ["emotion"],
        urgency: "this_week",
      },
      userId,
      fixedNow
    );

    const payload = await getGrowthProfilePayload(userId, fixedNow);

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (!payload.body.ok) return;

    expect(payload.body.data.summary).toMatchObject({
      ownedCourseCount: 1,
      orderCount: 1,
      counselingAppointmentCount: 1,
      upcomingCounselingCount: 1,
      latestAssessmentRiskLevel: "high",
    });
    expect(payload.body.data.courseAccess.ownedCourseIds).toContain(16);
    expect(payload.body.data.latestAssessment?.report.userId).toBe(userId);
    expect(payload.body.data.counseling.appointments).toHaveLength(1);
    expect(payload.body.data.timeline.map(item => item.type)).toEqual(
      expect.arrayContaining(["assessment", "counseling", "course_order"])
    );
  });
});
