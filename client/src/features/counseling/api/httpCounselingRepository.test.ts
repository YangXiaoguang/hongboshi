import { describe, expect, it } from "vitest";
import {
  parseCounselingAppointmentActionResponse,
  parseCounselingAppointmentCreateResponse,
  parseCounselingAppointmentListResponse,
  parseCounselingAvailabilityResponse,
} from "./httpCounselingRepository";

const counselor = {
  id: "counselor_lin",
  name: "林若安",
  title: "国家二级心理咨询师",
  introduction: "擅长情绪与自我成长议题。",
  specialties: ["emotion", "personal_growth"],
  licenseSummary: "执业 9 年",
  yearsOfPractice: 9,
  sessionPrice: 399,
  rating: 4.9,
};

const slot = {
  id: "slot_1",
  counselorId: "counselor_lin",
  startsAt: "2026-05-11T10:00:00.000Z",
  endsAt: "2026-05-11T10:50:00.000Z",
  channel: "video",
  available: true,
};

describe("http counseling repository parsing", () => {
  it("parses availability response", () => {
    expect(
      parseCounselingAvailabilityResponse({
        ok: true,
        data: {
          counselors: [counselor],
          slots: [slot],
          serverTime: "2026-05-10T00:00:00.000Z",
        },
      })
    ).toMatchObject({
      counselors: [counselor],
      slots: [slot],
    });
  });

  it("parses appointment creation response", () => {
    const appointment = {
      id: "appointment_1",
      userId: "user_1",
      counselorId: counselor.id,
      slotId: slot.id,
      channel: "video",
      status: "pending_payment",
      concernTags: ["emotion"],
      assessmentReportId: "report_1",
      createdAt: "2026-05-10T00:00:00.000Z",
      updatedAt: "2026-05-10T00:00:00.000Z",
    };

    expect(
      parseCounselingAppointmentCreateResponse({
        ok: true,
        data: {
          appointment,
          counselor,
          slot,
          nextSteps: ["请在 30 分钟内完成支付以保留时段。"],
        },
      })
    ).toMatchObject({
      appointment,
      counselor,
    });
  });

  it("parses appointment list response", () => {
    const appointment = {
      id: "appointment_1",
      userId: "user_1",
      counselorId: counselor.id,
      slotId: slot.id,
      channel: "video",
      status: "pending_payment",
      concernTags: ["emotion"],
      assessmentReportId: "report_1",
      createdAt: "2026-05-10T00:00:00.000Z",
      updatedAt: "2026-05-10T00:00:00.000Z",
    };

    expect(
      parseCounselingAppointmentListResponse({
        ok: true,
        data: {
          appointments: [{ appointment, counselor, slot }],
          serverTime: "2026-05-10T00:00:00.000Z",
        },
      }).appointments
    ).toHaveLength(1);
  });

  it("parses appointment action response", () => {
    const appointment = {
      id: "appointment_1",
      userId: "user_1",
      counselorId: counselor.id,
      slotId: slot.id,
      channel: "video",
      status: "scheduled",
      concernTags: ["emotion"],
      createdAt: "2026-05-10T00:00:00.000Z",
      updatedAt: "2026-05-10T00:10:00.000Z",
    };

    expect(
      parseCounselingAppointmentActionResponse({
        ok: true,
        data: {
          appointment,
          counselor,
          slot: {
            ...slot,
            available: false,
          },
          nextSteps: ["预约已确认。"],
        },
      }).appointment.status
    ).toBe("scheduled");
  });

  it("throws on error response", () => {
    expect(() =>
      parseCounselingAvailabilityResponse({
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "咨询服务暂时不可用",
        },
      })
    ).toThrow("咨询服务暂时不可用");
  });
});
