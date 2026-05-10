import { describe, expect, it } from "vitest";
import { createSimulatedPaymentSucceededEvent } from "../../../shared/domain";
import { InMemoryPaymentWebhookEventStore } from "./paymentWebhookEventStore";

const order = {
  id: "order_counseling_appointment_1",
  userId: "user_1",
  status: "pending_payment" as const,
  items: [
    {
      type: "counseling_session" as const,
      targetId: "appointment_1",
      title: "咨询服务",
      unitPrice: 399,
      quantity: 1,
    },
  ],
  subtotal: 399,
  discountAmount: 0,
  payableAmount: 399,
  createdAt: "2026-05-10T00:00:00.000Z",
};

describe("payment webhook event store", () => {
  it("deduplicates events and stores processing results", async () => {
    const store = new InMemoryPaymentWebhookEventStore();
    const event = createSimulatedPaymentSucceededEvent({
      order,
      now: "2026-05-10T00:01:00.000Z",
    });

    const first = await store.begin(event, "2026-05-10T00:01:01.000Z");
    const duplicate = await store.begin(event, "2026-05-10T00:01:02.000Z");

    expect(first.accepted).toBe(true);
    expect(duplicate.accepted).toBe(false);
    expect(duplicate.receipt.status).toBe("processing");

    await store.markProcessed(
      event.id,
      200,
      { ok: true, data: { orderId: order.id } },
      "2026-05-10T00:01:03.000Z"
    );

    const stored = await store.get(event.id);
    expect(stored).toMatchObject({
      id: event.id,
      status: "processed",
      responseStatus: 200,
      responseBody: { ok: true, data: { orderId: order.id } },
    });

    await store.begin(
      {
        ...event,
        id: "evt_payment_newer",
        occurredAt: "2026-05-10T00:02:00.000Z",
      },
      "2026-05-10T00:02:01.000Z"
    );

    const recent = await store.listRecent(1);
    expect(recent).toHaveLength(1);
    expect(recent[0]?.id).toBe("evt_payment_newer");
  });
});
