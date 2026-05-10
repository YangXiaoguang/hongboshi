import { describe, expect, it } from "vitest";
import {
  applyCounselingAppointmentAction,
  getNextCounselingAppointmentStatus,
  type CounselingAppointment,
} from "./counseling";

const appointment: CounselingAppointment = {
  id: "appointment_1",
  userId: "user_1",
  counselorId: "counselor_1",
  slotId: "slot_1",
  channel: "video",
  status: "pending_payment",
  concernTags: ["emotion"],
  createdAt: "2026-05-10T10:00:00.000Z",
  updatedAt: "2026-05-10T10:00:00.000Z",
};

describe("counseling appointment status machine", () => {
  it("confirms payment from pending to scheduled", () => {
    const next = applyCounselingAppointmentAction({
      appointment,
      action: "confirm_payment",
      now: "2026-05-10T10:15:00.000Z",
    });

    expect(next).toMatchObject({
      status: "scheduled",
      updatedAt: "2026-05-10T10:15:00.000Z",
    });
  });

  it("cancels active appointments only", () => {
    expect(getNextCounselingAppointmentStatus("scheduled", "cancel")).toBe(
      "cancelled"
    );
    expect(getNextCounselingAppointmentStatus("completed", "cancel")).toBe(
      undefined
    );
  });
});
