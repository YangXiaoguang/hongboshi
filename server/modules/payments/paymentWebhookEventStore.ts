import { z } from "zod";
import {
  PaymentWebhookEventSchema,
  type PaymentWebhookEvent,
} from "../../../shared/domain";
import { getDatabaseUrl, getSharedPostgresPool } from "../../db/postgres";
import { PostgresPaymentWebhookEventStore } from "./postgresPaymentWebhookEventStore";

type MaybePromise<T> = T | Promise<T>;

export const PaymentWebhookReceiptStatusSchema = z.enum([
  "processing",
  "processed",
  "failed",
]);

export const PaymentWebhookReceiptSchema = z.object({
  id: z.string().min(1),
  eventType: z.string().min(1),
  orderId: z.string().min(1),
  channel: z.string().min(1),
  status: PaymentWebhookReceiptStatusSchema,
  eventPayload: PaymentWebhookEventSchema,
  responseStatus: z.number().int().positive().optional(),
  responseBody: z.unknown().optional(),
  errorMessage: z.string().min(1).optional(),
  receivedAt: z.string().min(1),
  processedAt: z.string().min(1).optional(),
});

export type PaymentWebhookReceipt = z.infer<typeof PaymentWebhookReceiptSchema>;

export type PaymentWebhookBeginResult =
  | {
      accepted: true;
      receipt: PaymentWebhookReceipt;
    }
  | {
      accepted: false;
      receipt: PaymentWebhookReceipt;
    };

export interface PaymentWebhookEventStore {
  get(eventId: string): MaybePromise<PaymentWebhookReceipt | undefined>;
  begin(
    event: PaymentWebhookEvent,
    receivedAt: string
  ): MaybePromise<PaymentWebhookBeginResult>;
  markProcessed(
    eventId: string,
    responseStatus: number,
    responseBody: unknown,
    processedAt: string
  ): MaybePromise<PaymentWebhookReceipt>;
  markFailed(
    eventId: string,
    responseStatus: number,
    responseBody: unknown,
    errorMessage: string,
    processedAt: string
  ): MaybePromise<PaymentWebhookReceipt>;
  clear(): MaybePromise<void>;
}

function cloneReceipt(receipt: PaymentWebhookReceipt): PaymentWebhookReceipt {
  return PaymentWebhookReceiptSchema.parse(JSON.parse(JSON.stringify(receipt)));
}

function createProcessingReceipt(
  event: PaymentWebhookEvent,
  receivedAt: string
) {
  const normalized = PaymentWebhookEventSchema.parse(event);
  return PaymentWebhookReceiptSchema.parse({
    id: normalized.id,
    eventType: normalized.type,
    orderId: normalized.orderId,
    channel: normalized.channel,
    status: "processing",
    eventPayload: normalized,
    receivedAt,
  });
}

function updateReceipt(
  receipt: PaymentWebhookReceipt,
  patch: Partial<PaymentWebhookReceipt>
) {
  return PaymentWebhookReceiptSchema.parse({
    ...receipt,
    ...patch,
  });
}

export class InMemoryPaymentWebhookEventStore implements PaymentWebhookEventStore {
  private receipts = new Map<string, PaymentWebhookReceipt>();

  get(eventId: string) {
    const receipt = this.receipts.get(eventId);
    return receipt ? cloneReceipt(receipt) : undefined;
  }

  begin(
    event: PaymentWebhookEvent,
    receivedAt: string
  ): PaymentWebhookBeginResult {
    const existing = this.receipts.get(event.id);
    if (existing) {
      return {
        accepted: false,
        receipt: cloneReceipt(existing),
      };
    }

    const receipt = createProcessingReceipt(event, receivedAt);
    this.receipts.set(receipt.id, cloneReceipt(receipt));
    return {
      accepted: true,
      receipt,
    };
  }

  markProcessed(
    eventId: string,
    responseStatus: number,
    responseBody: unknown,
    processedAt: string
  ) {
    const current = this.receipts.get(eventId);
    if (!current) throw new Error("PAYMENT_WEBHOOK_RECEIPT_NOT_FOUND");

    const receipt = updateReceipt(current, {
      status: "processed",
      responseStatus,
      responseBody,
      processedAt,
    });
    this.receipts.set(eventId, cloneReceipt(receipt));
    return receipt;
  }

  markFailed(
    eventId: string,
    responseStatus: number,
    responseBody: unknown,
    errorMessage: string,
    processedAt: string
  ) {
    const current = this.receipts.get(eventId);
    if (!current) throw new Error("PAYMENT_WEBHOOK_RECEIPT_NOT_FOUND");

    const receipt = updateReceipt(current, {
      status: "failed",
      responseStatus,
      responseBody,
      errorMessage,
      processedAt,
    });
    this.receipts.set(eventId, cloneReceipt(receipt));
    return receipt;
  }

  clear() {
    this.receipts.clear();
  }
}

let paymentWebhookEventStore: PaymentWebhookEventStore =
  createDefaultPaymentWebhookEventStore();

export function createDefaultPaymentWebhookEventStore(): PaymentWebhookEventStore {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST ||
    process.env.HONGBOSHI_PAYMENT_WEBHOOK_STORE === "memory"
  ) {
    return new InMemoryPaymentWebhookEventStore();
  }

  if (
    process.env.HONGBOSHI_PAYMENT_WEBHOOK_STORE === "postgres" ||
    (process.env.HONGBOSHI_PAYMENT_WEBHOOK_STORE !== "memory" &&
      getDatabaseUrl())
  ) {
    return new PostgresPaymentWebhookEventStore(getSharedPostgresPool());
  }

  return new InMemoryPaymentWebhookEventStore();
}

export function getPaymentWebhookEventStore() {
  return paymentWebhookEventStore;
}

export function setPaymentWebhookEventStore(store: PaymentWebhookEventStore) {
  paymentWebhookEventStore = store;
}

export async function resetPaymentWebhookEventStore(
  store: PaymentWebhookEventStore = createDefaultPaymentWebhookEventStore()
) {
  paymentWebhookEventStore = store;
  await paymentWebhookEventStore.clear();
}
