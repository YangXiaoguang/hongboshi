import { beforeEach, describe, expect, it } from "vitest";
import {
  createCounselingAppointmentPayload,
  getCounselingAvailabilityPayload,
  listCounselingAppointmentsPayload,
  resetCounselingAppointmentStore,
} from "./counselingApi";

const fixedNow = new Date("2026-05-10T00:00:00.000Z");

describe("counseling api payloads", () => {
  beforeEach(() => {
    resetCounselingAppointmentStore(fixedNow);
  });

  it("returns counselors and available slots", () => {
    const payload = getCounselingAvailabilityPayload(fixedNow.toISOString());

    expect(payload.ok).toBe(true);
    if (!payload.ok) return;

    expect(payload.data.counselors.length).toBeGreaterThan(1);
    expect(payload.data.slots.length).toBeGreaterThan(4);
    expect(payload.data.slots.every(slot => slot.available)).toBe(true);
  });

  it("creates a pending payment appointment and reserves the slot", () => {
    const availability = getCounselingAvailabilityPayload(
      fixedNow.toISOString()
    );
    if (!availability.ok) throw new Error("expected availability");

    const slot = availability.data.slots[0];
    const payload = createCounselingAppointmentPayload(
      {
        counselorId: slot.counselorId,
        slotId: slot.id,
        channel: slot.channel,
        concernTags: ["emotion", "sleep"],
        urgency: "this_week",
        noteForCounselor: "最近睡眠和情绪波动比较明显。",
      },
      "user_1",
      fixedNow.toISOString()
    );

    expect(payload.status).toBe(200);
    if (payload.body.ok) {
      expect(payload.body.data.appointment.userId).toBe("user_1");
      expect(payload.body.data.appointment.status).toBe("pending_payment");
      expect(payload.body.data.slot.available).toBe(false);
    }

    const duplicate = createCounselingAppointmentPayload(
      {
        counselorId: slot.counselorId,
        slotId: slot.id,
        channel: slot.channel,
        concernTags: ["emotion"],
        urgency: "this_week",
      },
      "user_2",
      fixedNow.toISOString()
    );
    expect(duplicate.status).toBe(409);

    const listPayload = listCounselingAppointmentsPayload(
      "user_1",
      fixedNow.toISOString()
    );
    expect(listPayload.status).toBe(200);
    if (listPayload.body.ok) {
      expect(listPayload.body.data.appointments).toHaveLength(1);
      expect(listPayload.body.data.appointments[0].slot.available).toBe(false);
    }
  });

  it("creates a risk event for urgent intake", () => {
    const availability = getCounselingAvailabilityPayload(
      fixedNow.toISOString()
    );
    if (!availability.ok) throw new Error("expected availability");

    const slot = availability.data.slots[1];
    const payload = createCounselingAppointmentPayload(
      {
        counselorId: slot.counselorId,
        slotId: slot.id,
        channel: slot.channel,
        concernTags: ["crisis"],
        urgency: "immediate",
        assessmentRiskLevel: "urgent",
      },
      "user_1",
      fixedNow.toISOString()
    );

    expect(payload.status).toBe(200);
    if (payload.body.ok) {
      expect(payload.body.data.riskEvent?.riskLevel).toBe("urgent");
      expect(payload.body.data.nextSteps[0]).toContain("危险正在发生");
    }
  });

  it("requires login before creating an appointment", () => {
    const payload = createCounselingAppointmentPayload({
      counselorId: "counselor_lin",
      slotId: "slot_missing",
      channel: "video",
      concernTags: ["emotion"],
      urgency: "this_week",
    });

    expect(payload.status).toBe(401);
    expect(payload.body.ok).toBe(false);

    const listPayload = listCounselingAppointmentsPayload();
    expect(listPayload.status).toBe(401);
    expect(listPayload.body.ok).toBe(false);
  });
});
