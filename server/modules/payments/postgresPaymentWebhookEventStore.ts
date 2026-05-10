import {
  PaymentWebhookEventSchema,
  type PaymentWebhookEvent,
} from "../../../shared/domain";
import type { DatabaseQueryExecutor } from "../../db/postgres";
import type {
  PaymentWebhookBeginResult,
  PaymentWebhookEventStore,
  PaymentWebhookReceipt,
} from "./paymentWebhookEventStore";

type PaymentWebhookEventRow = {
  id: string;
  event_type: string;
  order_id: string;
  channel: string;
  status: PaymentWebhookReceipt["status"];
  event_payload: unknown;
  response_status: number | null;
  response_body: unknown | null;
  error_message: string | null;
  received_at: string | Date;
  processed_at: string | Date | null;
};

function toDateTimeLike(value: string | Date | null | undefined) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function rowToReceipt(row: PaymentWebhookEventRow): PaymentWebhookReceipt {
  return {
    id: row.id,
    eventType: row.event_type,
    orderId: row.order_id,
    channel: row.channel,
    status: row.status,
    eventPayload: PaymentWebhookEventSchema.parse(row.event_payload),
    responseStatus: row.response_status ?? undefined,
    responseBody: row.response_body ?? undefined,
    errorMessage: row.error_message ?? undefined,
    receivedAt: toDateTimeLike(row.received_at) ?? new Date(0).toISOString(),
    processedAt: toDateTimeLike(row.processed_at),
  };
}

export class PostgresPaymentWebhookEventStore implements PaymentWebhookEventStore {
  constructor(private readonly db: DatabaseQueryExecutor) {}

  async get(eventId: string) {
    const result = await this.db.query<PaymentWebhookEventRow>(
      `
        SELECT
          id,
          event_type,
          order_id,
          channel,
          status,
          event_payload,
          response_status,
          response_body,
          error_message,
          received_at,
          processed_at
        FROM payment_webhook_events
        WHERE id = $1
        LIMIT 1
      `,
      [eventId]
    );

    return result.rows[0] ? rowToReceipt(result.rows[0]) : undefined;
  }

  async begin(
    event: PaymentWebhookEvent,
    receivedAt: string
  ): Promise<PaymentWebhookBeginResult> {
    const normalized = PaymentWebhookEventSchema.parse(event);
    const result = await this.db.query<PaymentWebhookEventRow>(
      `
        INSERT INTO payment_webhook_events (
          id,
          event_type,
          order_id,
          channel,
          status,
          event_payload,
          received_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, 'processing', $5, $6, NOW())
        ON CONFLICT (id) DO NOTHING
        RETURNING
          id,
          event_type,
          order_id,
          channel,
          status,
          event_payload,
          response_status,
          response_body,
          error_message,
          received_at,
          processed_at
      `,
      [
        normalized.id,
        normalized.type,
        normalized.orderId,
        normalized.channel,
        normalized,
        receivedAt,
      ]
    );

    if (result.rows[0]) {
      return {
        accepted: true,
        receipt: rowToReceipt(result.rows[0]),
      };
    }

    const receipt = await this.get(normalized.id);
    if (!receipt) throw new Error("PAYMENT_WEBHOOK_RECEIPT_NOT_FOUND");

    return {
      accepted: false,
      receipt,
    };
  }

  async markProcessed(
    eventId: string,
    responseStatus: number,
    responseBody: unknown,
    processedAt: string
  ) {
    return this.updateStatus(
      eventId,
      "processed",
      responseStatus,
      responseBody,
      undefined,
      processedAt
    );
  }

  async markFailed(
    eventId: string,
    responseStatus: number,
    responseBody: unknown,
    errorMessage: string,
    processedAt: string
  ) {
    return this.updateStatus(
      eventId,
      "failed",
      responseStatus,
      responseBody,
      errorMessage,
      processedAt
    );
  }

  async clear() {
    await this.db.query("DELETE FROM payment_webhook_events");
  }

  private async updateStatus(
    eventId: string,
    status: PaymentWebhookReceipt["status"],
    responseStatus: number,
    responseBody: unknown,
    errorMessage: string | undefined,
    processedAt: string
  ) {
    const result = await this.db.query<PaymentWebhookEventRow>(
      `
        UPDATE payment_webhook_events
        SET
          status = $2,
          response_status = $3,
          response_body = $4,
          error_message = $5,
          processed_at = $6,
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          event_type,
          order_id,
          channel,
          status,
          event_payload,
          response_status,
          response_body,
          error_message,
          received_at,
          processed_at
      `,
      [
        eventId,
        status,
        responseStatus,
        responseBody,
        errorMessage ?? null,
        processedAt,
      ]
    );

    if (!result.rows[0]) throw new Error("PAYMENT_WEBHOOK_RECEIPT_NOT_FOUND");
    return rowToReceipt(result.rows[0]);
  }
}
