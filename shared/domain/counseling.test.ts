import { describe, expect, it } from "vitest";
import {
  applyCounselingAppointmentAction,
  expireOverdueCounselingAppointmentPayment,
  getCounselingPaymentDeadline,
  getNextCounselingAppointmentStatus,
  isCounselingPaymentExpired,
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

  it("expires unpaid appointments after the payment hold window", () => {
    expect(getCounselingPaymentDeadline(appointment)).toBe(
      "2026-05-10T10:30:00.000Z"
    );
    expect(
      isCounselingPaymentExpired({
        appointment,
        now: "2026-05-10T10:29:59.000Z",
      })
    ).toBe(false);
    expect(
      isCounselingPaymentExpired({
        appointment,
        now: "2026-05-10T10:30:00.000Z",
      })
    ).toBe(true);

    expect(
      expireOverdueCounselingAppointmentPayment({
        appointment,
        now: "2026-05-10T10:31:00.000Z",
      })
    ).toMatchObject({
      status: "cancelled",
      updatedAt: "2026-05-10T10:31:00.000Z",
    });
  });

  it("does not expire confirmed appointments", () => {
    expect(
      expireOverdueCounselingAppointmentPayment({
        appointment: {
          ...appointment,
          status: "scheduled",
        },
        now: "2026-05-10T09:00:00.000Z",
      })
    ).toBeUndefined();
  });
});
