import { describe, expect, it } from "vitest";
import {
  PAYMENT_WEBHOOK_SIGNATURE_HEADER,
  PAYMENT_WEBHOOK_TIMESTAMP_HEADER,
  createPaymentWebhookSignature,
  verifyPaymentWebhookSignature,
} from "./paymentWebhookSecurity";

describe("payment webhook signature verification", () => {
  it("accepts a current HMAC signature over timestamp and raw body", () => {
    const rawBody = JSON.stringify({ id: "evt_1", amount: 399 });
    const secret = "test_secret";
    const timestamp = "2026-05-10T00:00:00.000Z";

    const result = verifyPaymentWebhookSignature({
      rawBody,
      secret,
      now: new Date("2026-05-10T00:01:00.000Z"),
      headers: {
        [PAYMENT_WEBHOOK_TIMESTAMP_HEADER]: timestamp,
        [PAYMENT_WEBHOOK_SIGNATURE_HEADER]: createPaymentWebhookSignature({
          rawBody,
          secret,
          timestamp,
        }),
      },
    });

    expect(result.ok).toBe(true);
  });

  it("rejects stale or mismatched signatures", () => {
    const rawBody = JSON.stringify({ id: "evt_1", amount: 399 });
    const secret = "test_secret";
    const timestamp = "2026-05-10T00:00:00.000Z";

    const stale = verifyPaymentWebhookSignature({
      rawBody,
      secret,
      now: new Date("2026-05-10T00:10:01.000Z"),
      headers: {
        [PAYMENT_WEBHOOK_TIMESTAMP_HEADER]: timestamp,
        [PAYMENT_WEBHOOK_SIGNATURE_HEADER]: createPaymentWebhookSignature({
          rawBody,
          secret,
          timestamp,
        }),
      },
    });
    const mismatched = verifyPaymentWebhookSignature({
      rawBody,
      secret,
      now: new Date(timestamp),
      headers: {
        [PAYMENT_WEBHOOK_TIMESTAMP_HEADER]: timestamp,
        [PAYMENT_WEBHOOK_SIGNATURE_HEADER]: "sha256=bad",
      },
    });

    expect(stale.ok).toBe(false);
    expect(mismatched.ok).toBe(false);
  });
});
