import { describe, expect, it } from "vitest";
import {
  applyCounselingAppointmentAction,
  applyCounselingAppointmentReschedule,
  evaluateCounselingCancellation,
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

  it("evaluates cancellation policy for unpaid and confirmed appointments", () => {
    const slot = {
      id: "slot_1",
      counselorId: "counselor_1",
      startsAt: "2026-05-11T10:00:00.000Z",
      endsAt: "2026-05-11T11:00:00.000Z",
      channel: "video" as const,
      available: false,
    };

    expect(
      evaluateCounselingCancellation({
        appointment,
        slot,
        now: "2026-05-10T10:00:00.000Z",
      })
    ).toMatchObject({
      canCancel: true,
      orderTransition: "close_unpaid",
    });

    expect(
      evaluateCounselingCancellation({
        appointment: { ...appointment, status: "scheduled" },
        slot,
        now: "2026-05-11T09:30:00.000Z",
        policy: {
          scheduledRefundCutoffMinutesBeforeStart: 60,
          allowPendingPaymentCancellation: true,
        },
      })
    ).toMatchObject({
      canCancel: false,
      orderTransition: "none",
    });

    expect(
      evaluateCounselingCancellation({
        appointment: { ...appointment, status: "scheduled" },
        slot,
        now: "2026-05-11T08:30:00.000Z",
        policy: {
          scheduledRefundCutoffMinutesBeforeStart: 60,
          allowPendingPaymentCancellation: true,
        },
      })
    ).toMatchObject({
      canCancel: true,
      orderTransition: "request_refund",
    });
  });

  it("reschedules confirmed appointments to an available slot", () => {
    const next = applyCounselingAppointmentReschedule({
      appointment: {
        ...appointment,
        status: "scheduled",
      },
      nextSlot: {
        id: "slot_2",
        counselorId: "counselor_2",
        startsAt: "2026-05-11T10:00:00.000Z",
        endsAt: "2026-05-11T11:00:00.000Z",
        channel: "voice",
        available: true,
      },
      now: "2026-05-10T10:20:00.000Z",
    });

    expect(next).toMatchObject({
      status: "scheduled",
      counselorId: "counselor_2",
      slotId: "slot_2",
      channel: "voice",
      updatedAt: "2026-05-10T10:20:00.000Z",
    });
  });

  it("marks cancelled appointments as refunded", () => {
    expect(
      getNextCounselingAppointmentStatus("cancelled", "complete_refund")
    ).toBe("refunded");
    expect(
      getNextCounselingAppointmentStatus("scheduled", "complete_refund")
    ).toBe(undefined);
  });

  it("tracks counselor fulfillment outcomes", () => {
    expect(
      applyCounselingAppointmentAction({
        appointment: {
          ...appointment,
          status: "scheduled",
        },
        action: "complete_session",
        now: "2026-05-10T11:00:00.000Z",
      })
    ).toMatchObject({
      status: "completed",
      updatedAt: "2026-05-10T11:00:00.000Z",
    });

    expect(
      applyCounselingAppointmentAction({
        appointment: {
          ...appointment,
          status: "scheduled",
        },
        action: "mark_no_show",
        now: "2026-05-10T11:00:00.000Z",
      })
    ).toMatchObject({
      status: "no_show",
      updatedAt: "2026-05-10T11:00:00.000Z",
    });
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
