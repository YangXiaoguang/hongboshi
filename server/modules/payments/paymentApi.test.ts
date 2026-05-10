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
import { resetPaymentWebhookEventStore } from "./paymentWebhookEventStore";
import {
  PAYMENT_WEBHOOK_SIGNATURE_HEADER,
  PAYMENT_WEBHOOK_TIMESTAMP_HEADER,
  createPaymentWebhookSignature,
} from "./paymentWebhookSecurity";

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
    await resetPaymentWebhookEventStore();
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

  it("returns the stored result when the same webhook event is retried", async () => {
    const created = await createPendingCounselingOrder();
    const event = createSimulatedPaymentSucceededEvent({
      order: created.order,
      now: "2026-05-10T00:10:00.000Z",
    });

    const first = await processPaymentWebhookPayload(event);
    const second = await processPaymentWebhookPayload(event);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
  });

  it("requires valid signatures when signature verification is enabled", async () => {
    const created = await createPendingCounselingOrder();
    const event = createSimulatedPaymentSucceededEvent({
      order: created.order,
      now: "2026-05-10T00:10:00.000Z",
    });
    const rawBody = JSON.stringify(event);
    const timestamp = "2026-05-10T00:10:10.000Z";
    const secret = "payment_webhook_test_secret";

    const missing = await processPaymentWebhookPayload(event, {
      rawBody,
      secret,
      requireSignature: true,
      now: new Date(timestamp),
    });

    expect(missing.status).toBe(401);

    const signed = await processPaymentWebhookPayload(event, {
      rawBody,
      secret,
      requireSignature: true,
      now: new Date(timestamp),
      headers: {
        [PAYMENT_WEBHOOK_TIMESTAMP_HEADER]: timestamp,
        [PAYMENT_WEBHOOK_SIGNATURE_HEADER]: createPaymentWebhookSignature({
          rawBody,
          secret,
          timestamp,
        }),
      },
    });

    expect(signed.status).toBe(200);
    if (signed.body.ok) {
      expect(signed.body.data.order.status).toBe("paid");
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
