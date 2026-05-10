import { describe, expect, it } from "vitest";
import { InMemoryCounselingAppointmentStore } from "./counselingAppointmentStore";

const fixedNow = new Date("2026-05-10T00:00:00.000Z");

describe("counseling appointment store", () => {
  it("resets slots from the counseling schedule seed", () => {
    const store = new InMemoryCounselingAppointmentStore(fixedNow);

    expect(store.listSlots().length).toBeGreaterThan(4);
    expect(store.listSlots().every(slot => slot.available)).toBe(true);
  });

  it("stores appointments, slots and linked risk events by user", () => {
    const store = new InMemoryCounselingAppointmentStore(fixedNow);
    const slot = store.listSlots()[0];
    if (!slot) throw new Error("expected slot");

    const reservedSlot = store.saveSlot({ ...slot, available: false });
    const appointment = store.saveAppointment(
      {
        id: "appointment_1",
        userId: "user_1",
        counselorId: reservedSlot.counselorId,
        slotId: reservedSlot.id,
        channel: reservedSlot.channel,
        status: "pending_payment",
        concernTags: ["emotion"],
        createdAt: "2026-05-10T08:00:00.000Z",
        updatedAt: "2026-05-10T08:00:00.000Z",
      },
      {
        id: "risk_1",
        userId: "user_1",
        source: "counseling_intake",
        riskLevel: "medium",
        signal: "咨询前信息提示 within_24h 风险",
        status: "open",
        createdAt: "2026-05-10T08:00:00.000Z",
      }
    );

    appointment.concernTags.push("sleep");

    expect(store.getSlot(slot.id)?.available).toBe(false);
    expect(store.listAppointmentsByUser("user_1")[0]?.concernTags).toEqual([
      "emotion",
    ]);
    expect(store.getAppointment("appointment_1")?.status).toBe(
      "pending_payment"
    );
    expect(store.getRiskEventForAppointment("appointment_1")?.riskLevel).toBe(
      "medium"
    );
    expect(store.listAppointmentsByUser("user_2")).toEqual([]);
  });
});
