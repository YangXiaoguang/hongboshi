import { beforeEach, describe, expect, it } from "vitest";
import {
  createCounselingAppointmentPayload,
  expireOverdueCounselingPayments,
  getCounselingAvailabilityPayload,
  listCounselingAppointmentsPayload,
  resetCounselingAppointmentStore,
  updateCounselingAppointmentPayload,
} from "./counselingApi";
import {
  getCourseAccessPayload,
  resetCourseAccessStore,
} from "../courses/courseAccessApi";

const fixedNow = new Date("2026-05-10T00:00:00.000Z");

describe("counseling api payloads", () => {
  beforeEach(async () => {
    await resetCourseAccessStore();
    await resetCounselingAppointmentStore(fixedNow);
  });

  it("returns counselors and available slots", async () => {
    const payload = await getCounselingAvailabilityPayload(
      fixedNow.toISOString()
    );

    expect(payload.ok).toBe(true);
    if (!payload.ok) return;

    expect(payload.data.counselors.length).toBeGreaterThan(1);
    expect(payload.data.slots.length).toBeGreaterThan(4);
    expect(payload.data.slots.every(slot => slot.available)).toBe(true);
  });

  it("creates a pending payment appointment and reserves the slot", async () => {
    const availability = await getCounselingAvailabilityPayload(
      fixedNow.toISOString()
    );
    if (!availability.ok) throw new Error("expected availability");

    const slot = availability.data.slots[0];
    const payload = await createCounselingAppointmentPayload(
      {
        counselorId: slot.counselorId,
        slotId: slot.id,
        channel: slot.channel,
        concernTags: ["emotion", "sleep"],
        urgency: "this_week",
        assessmentReportId: "report_quick_state_check_1",
        noteForCounselor: "最近睡眠和情绪波动比较明显。",
      },
      "user_1",
      fixedNow.toISOString()
    );

    expect(payload.status).toBe(200);
    if (payload.body.ok) {
      expect(payload.body.data.appointment.userId).toBe("user_1");
      expect(payload.body.data.appointment.status).toBe("pending_payment");
      expect(payload.body.data.appointment.orderId).toBe(
        payload.body.data.order.id
      );
      expect(payload.body.data.order).toMatchObject({
        status: "pending_payment",
        items: [
          {
            type: "counseling_session",
            targetId: payload.body.data.appointment.id,
          },
        ],
      });
      expect(payload.body.data.appointment.assessmentReportId).toBe(
        "report_quick_state_check_1"
      );
      expect(payload.body.data.slot.available).toBe(false);
    }

    const duplicate = await createCounselingAppointmentPayload(
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

    const listPayload = await listCounselingAppointmentsPayload(
      "user_1",
      fixedNow.toISOString()
    );
    expect(listPayload.status).toBe(200);
    if (listPayload.body.ok) {
      expect(listPayload.body.data.appointments).toHaveLength(1);
      expect(listPayload.body.data.appointments[0].slot.available).toBe(false);
      expect(listPayload.body.data.appointments[0].order?.status).toBe(
        "pending_payment"
      );
    }
  });

  it("confirms payment, reschedules and refunds appointments through the status machine", async () => {
    const availability = await getCounselingAvailabilityPayload(
      fixedNow.toISOString()
    );
    if (!availability.ok) throw new Error("expected availability");

    const slot = availability.data.slots[2];
    const created = await createCounselingAppointmentPayload(
      {
        counselorId: slot.counselorId,
        slotId: slot.id,
        channel: slot.channel,
        concernTags: ["emotion"],
        urgency: "this_week",
      },
      "user_1",
      fixedNow.toISOString()
    );
    if (!created.body.ok) throw new Error("expected created appointment");

    const appointmentId = created.body.data.appointment.id;
    const confirmed = await updateCounselingAppointmentPayload(
      appointmentId,
      { action: "confirm_payment" },
      "user_1",
      "2026-05-10T00:10:00.000Z"
    );

    expect(confirmed.status).toBe(200);
    if (confirmed.body.ok) {
      expect(confirmed.body.data.appointment.status).toBe("scheduled");
      expect(confirmed.body.data.slot.available).toBe(false);
      expect(confirmed.body.data.order?.status).toBe("paid");
      expect(confirmed.body.data.order?.paidAt).toBe(
        "2026-05-10T00:10:00.000Z"
      );
    }

    const newSlot = availability.data.slots[4];
    const rescheduled = await updateCounselingAppointmentPayload(
      appointmentId,
      { action: "reschedule", slotId: newSlot.id },
      "user_1",
      "2026-05-10T00:15:00.000Z"
    );

    expect(rescheduled.status).toBe(200);
    if (rescheduled.body.ok) {
      expect(rescheduled.body.data.appointment.status).toBe("scheduled");
      expect(rescheduled.body.data.appointment.slotId).toBe(newSlot.id);
      expect(rescheduled.body.data.slot.available).toBe(false);
      expect(rescheduled.body.data.order?.status).toBe("paid");
    }

    const availabilityAfterReschedule = await getCounselingAvailabilityPayload(
      "2026-05-10T00:16:00.000Z"
    );
    if (!availabilityAfterReschedule.ok) {
      throw new Error("expected availability after reschedule");
    }
    expect(
      availabilityAfterReschedule.data.slots.find(item => item.id === slot.id)
        ?.available
    ).toBe(true);
    expect(
      availabilityAfterReschedule.data.slots.find(
        item => item.id === newSlot.id
      )?.available
    ).toBe(false);

    const cancelled = await updateCounselingAppointmentPayload(
      appointmentId,
      { action: "cancel" },
      "user_1",
      "2026-05-10T00:20:00.000Z"
    );

    expect(cancelled.status).toBe(200);
    if (cancelled.body.ok) {
      expect(cancelled.body.data.appointment.status).toBe("cancelled");
      expect(cancelled.body.data.slot.available).toBe(true);
      expect(cancelled.body.data.order?.status).toBe("refunding");
    }

    const refunded = await updateCounselingAppointmentPayload(
      appointmentId,
      { action: "complete_refund" },
      "user_1",
      "2026-05-10T00:25:00.000Z"
    );

    expect(refunded.status).toBe(200);
    if (refunded.body.ok) {
      expect(refunded.body.data.appointment.status).toBe("refunded");
      expect(refunded.body.data.slot.available).toBe(true);
      expect(refunded.body.data.order?.status).toBe("refunded");
    }

    const repeated = await updateCounselingAppointmentPayload(
      appointmentId,
      { action: "confirm_payment" },
      "user_1",
      "2026-05-10T00:30:00.000Z"
    );
    expect(repeated.status).toBe(409);
  });

  it("expires overdue payment holds and releases the reserved slot", async () => {
    const availability = await getCounselingAvailabilityPayload(
      fixedNow.toISOString()
    );
    if (!availability.ok) throw new Error("expected availability");

    const slot = availability.data.slots[3];
    const created = await createCounselingAppointmentPayload(
      {
        counselorId: slot.counselorId,
        slotId: slot.id,
        channel: slot.channel,
        concernTags: ["sleep"],
        urgency: "this_week",
      },
      "user_1",
      "2026-05-10T08:00:00.000Z"
    );
    if (!created.body.ok) throw new Error("expected created appointment");

    const beforeDeadline = await expireOverdueCounselingPayments(
      "2026-05-10T08:29:00.000Z"
    );
    expect(beforeDeadline.expiredAppointments).toHaveLength(0);

    const expired = await expireOverdueCounselingPayments(
      "2026-05-10T08:31:00.000Z"
    );

    expect(expired.releasedSlotIds).toEqual([slot.id]);
    expect(expired.expiredAppointments[0]?.appointment.status).toBe(
      "cancelled"
    );
    expect(expired.expiredAppointments[0]?.slot.available).toBe(true);
    expect(expired.expiredAppointments[0]?.order?.status).toBe("closed");

    const listPayload = await listCounselingAppointmentsPayload(
      "user_1",
      "2026-05-10T08:31:00.000Z"
    );
    expect(listPayload.status).toBe(200);
    if (listPayload.body.ok) {
      expect(listPayload.body.data.appointments[0]?.appointment.status).toBe(
        "cancelled"
      );
      expect(listPayload.body.data.appointments[0]?.slot.available).toBe(true);
      expect(listPayload.body.data.appointments[0]?.order?.status).toBe(
        "closed"
      );
    }

    const confirmAfterExpiry = await updateCounselingAppointmentPayload(
      created.body.data.appointment.id,
      { action: "confirm_payment" },
      "user_1",
      "2026-05-10T08:32:00.000Z"
    );
    expect(confirmAfterExpiry.status).toBe(409);

    const accessPayload = await getCourseAccessPayload("user_1");
    expect(accessPayload.ok).toBe(true);
    if (accessPayload.ok) {
      expect(accessPayload.data.orders[0]?.status).toBe("closed");
    }
  });

  it("creates a risk event for urgent intake", async () => {
    const availability = await getCounselingAvailabilityPayload(
      fixedNow.toISOString()
    );
    if (!availability.ok) throw new Error("expected availability");

    const slot = availability.data.slots[1];
    const payload = await createCounselingAppointmentPayload(
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

  it("requires login before creating an appointment", async () => {
    const payload = await createCounselingAppointmentPayload({
      counselorId: "counselor_lin",
      slotId: "slot_missing",
      channel: "video",
      concernTags: ["emotion"],
      urgency: "this_week",
    });

    expect(payload.status).toBe(401);
    expect(payload.body.ok).toBe(false);

    const listPayload = await listCounselingAppointmentsPayload();
    expect(listPayload.status).toBe(401);
    expect(listPayload.body.ok).toBe(false);
  });
});
