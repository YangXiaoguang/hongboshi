import { describe, expect, it } from "vitest";
import type {
  DatabaseQueryExecutor,
  DatabaseQueryResult,
} from "../../db/postgres";
import { createSimulatedPaymentSucceededEvent } from "../../../shared/domain";
import { PostgresPaymentWebhookEventStore } from "./postgresPaymentWebhookEventStore";

type CapturedQuery = {
  text: string;
  values?: readonly unknown[];
};

class FakePaymentWebhookExecutor implements DatabaseQueryExecutor {
  readonly queries: CapturedQuery[] = [];

  constructor(private readonly rows: Record<string, unknown[]> = {}) {}

  async query<Row>(
    text: string,
    values?: readonly unknown[]
  ): Promise<DatabaseQueryResult<Row>> {
    this.queries.push({ text, values });

    if (text.includes("INSERT INTO payment_webhook_events")) {
      return {
        rows: (this.rows.inserted ?? []) as Row[],
        rowCount: this.rows.inserted?.length ?? 0,
      };
    }

    if (text.includes("FROM payment_webhook_events")) {
      return {
        rows: (this.rows.existing ?? []) as Row[],
        rowCount: this.rows.existing?.length ?? 0,
      };
    }

    if (text.includes("UPDATE payment_webhook_events")) {
      return {
        rows: (this.rows.updated ?? []) as Row[],
        rowCount: this.rows.updated?.length ?? 0,
      };
    }

    return { rows: [] as Row[], rowCount: 0 };
  }
}

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

describe("postgres payment webhook event store", () => {
  it("records the webhook event before processing it", async () => {
    const event = createSimulatedPaymentSucceededEvent({
      order,
      now: "2026-05-10T00:01:00.000Z",
    });
    const db = new FakePaymentWebhookExecutor({
      inserted: [
        {
          id: event.id,
          event_type: event.type,
          order_id: event.orderId,
          channel: event.channel,
          status: "processing",
          event_payload: event,
          response_status: null,
          response_body: null,
          error_message: null,
          received_at: new Date("2026-05-10T00:01:01.000Z"),
          processed_at: null,
        },
      ],
    });
    const store = new PostgresPaymentWebhookEventStore(db);

    const result = await store.begin(event, "2026-05-10T00:01:01.000Z");

    expect(result.accepted).toBe(true);
    expect(result.receipt.status).toBe("processing");
    expect(db.queries[0]?.values).toEqual([
      event.id,
      event.type,
      event.orderId,
      event.channel,
      event,
      "2026-05-10T00:01:01.000Z",
    ]);
  });

  it("updates the stored response after processing", async () => {
    const event = createSimulatedPaymentSucceededEvent({
      order,
      now: "2026-05-10T00:01:00.000Z",
    });
    const responseBody = { ok: true, data: { orderId: event.orderId } };
    const db = new FakePaymentWebhookExecutor({
      updated: [
        {
          id: event.id,
          event_type: event.type,
          order_id: event.orderId,
          channel: event.channel,
          status: "processed",
          event_payload: event,
          response_status: 200,
          response_body: responseBody,
          error_message: null,
          received_at: new Date("2026-05-10T00:01:01.000Z"),
          processed_at: new Date("2026-05-10T00:01:02.000Z"),
        },
      ],
    });
    const store = new PostgresPaymentWebhookEventStore(db);

    const receipt = await store.markProcessed(
      event.id,
      200,
      responseBody,
      "2026-05-10T00:01:02.000Z"
    );

    expect(receipt.status).toBe("processed");
    expect(receipt.responseBody).toEqual(responseBody);
    expect(db.queries[0]?.values).toEqual([
      event.id,
      "processed",
      200,
      responseBody,
      null,
      "2026-05-10T00:01:02.000Z",
    ]);
  });

  it("lists recent webhook receipts for reconciliation", async () => {
    const event = createSimulatedPaymentSucceededEvent({
      order,
      now: "2026-05-10T00:01:00.000Z",
    });
    const db = new FakePaymentWebhookExecutor({
      existing: [
        {
          id: event.id,
          event_type: event.type,
          order_id: event.orderId,
          channel: event.channel,
          status: "processed",
          event_payload: event,
          response_status: 200,
          response_body: { ok: true },
          error_message: null,
          received_at: new Date("2026-05-10T00:01:01.000Z"),
          processed_at: new Date("2026-05-10T00:01:02.000Z"),
        },
      ],
    });
    const store = new PostgresPaymentWebhookEventStore(db);

    const recent = await store.listRecent(20);

    expect(recent).toHaveLength(1);
    expect(recent[0]).toMatchObject({
      id: event.id,
      status: "processed",
      receivedAt: "2026-05-10T00:01:01.000Z",
    });
    expect(db.queries[0]?.text).toContain("ORDER BY received_at DESC");
    expect(db.queries[0]?.values).toEqual([20]);
  });
});
