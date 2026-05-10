import { beforeEach, describe, expect, it } from "vitest";
import { createSimulatedPaymentSucceededEvent } from "../../../shared/domain";
import {
  createCounselingAppointmentPayload,
  getCounselingAvailabilityPayload,
  resetCounselingAppointmentStore,
} from "../counseling/counselingApi";
import {
  getCourseAccessPayload,
  resetCourseAccessStore,
} from "../courses/courseAccessApi";
import { processPaymentWebhookPayload } from "./paymentApi";

const fixedNow = new Date("2026-05-10T00:00:00.000Z");

async function createPendingCounselingOrder(userId = "user_1") {
  const availability = await getCounselingAvailabilityPayload(
    fixedNow.toISOString()
  );
  if (!availability.ok) throw new Error("expected availability");

  const slot = availability.data.slots[0];
  const created = await createCounselingAppointmentPayload(
    {
      counselorId: slot.counselorId,
      slotId: slot.id,
      channel: slot.channel,
      concernTags: ["emotion"],
      urgency: "this_week",
    },
    userId,
    fixedNow.toISOString()
  );
  if (!created.body.ok) throw new Error("expected created appointment");

  return created.body.data;
}

describe("payment webhook api payloads", () => {
  beforeEach(async () => {
    await resetCourseAccessStore();
    await resetCounselingAppointmentStore(fixedNow);
  });

  it("routes simulated payment success to the counseling appointment flow", async () => {
    const created = await createPendingCounselingOrder();
    const event = createSimulatedPaymentSucceededEvent({
      order: created.order,
      now: "2026-05-10T00:10:00.000Z",
    });

    const payload = await processPaymentWebhookPayload(event);

    expect(payload.status).toBe(200);
    if (payload.body.ok) {
      expect(payload.body.data.payment).toMatchObject({
        orderId: created.order.id,
        amount: created.order.payableAmount,
      });
      expect(payload.body.data.appointment.status).toBe("scheduled");
      expect(payload.body.data.order.status).toBe("paid");
    }

    const access = await getCourseAccessPayload("user_1");
    expect(access.ok).toBe(true);
    if (access.ok) {
      expect(access.data.orders[0]?.status).toBe("paid");
    }
  });

  it("rejects payment webhooks with mismatched amounts", async () => {
    const created = await createPendingCounselingOrder();
    const event = {
      ...createSimulatedPaymentSucceededEvent({
        order: created.order,
        now: "2026-05-10T00:10:00.000Z",
      }),
      amount: created.order.payableAmount + 1,
    };

    const payload = await processPaymentWebhookPayload(event);

    expect(payload.status).toBe(409);
    expect(payload.body.ok).toBe(false);

    const access = await getCourseAccessPayload("user_1");
    expect(access.ok).toBe(true);
    if (access.ok) {
      expect(access.data.orders[0]?.status).toBe("pending_payment");
    }
  });

  it("rejects unsupported business order ids", async () => {
    const payload = await processPaymentWebhookPayload({
      id: "evt_1",
      type: "payment.succeeded",
      orderId: "order_course_16",
      channel: "manual",
      amount: 399,
      transactionId: "tx_1",
      occurredAt: "2026-05-10T00:10:00.000Z",
    });

    expect(payload.status).toBe(404);
  });
});
