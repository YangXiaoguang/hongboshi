import { createHmac, timingSafeEqual } from "crypto";
import type { IncomingHttpHeaders } from "http";

export const PAYMENT_WEBHOOK_SIGNATURE_HEADER = "x-hongboshi-payment-signature";
export const PAYMENT_WEBHOOK_TIMESTAMP_HEADER = "x-hongboshi-payment-timestamp";
export const DEFAULT_PAYMENT_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

type HeaderMap =
  | IncomingHttpHeaders
  | Record<string, string | string[] | number | undefined>;

export type PaymentWebhookSignatureInput = {
  rawBody: string;
  secret: string;
  timestamp: string;
};

export type PaymentWebhookVerificationInput = {
  rawBody: string;
  headers?: HeaderMap;
  secret?: string;
  now?: Date;
  toleranceSeconds?: number;
};

function headerValue(headers: HeaderMap | undefined, name: string) {
  if (!headers) return undefined;
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  if (typeof value === "number") return String(value);
  return value;
}

function normalizeSignature(signature: string) {
  return signature.startsWith("sha256=")
    ? signature.slice("sha256=".length)
    : signature;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function resolvePaymentWebhookSecret(env = process.env) {
  const secret = env.HONGBOSHI_PAYMENT_WEBHOOK_SECRET?.trim();
  return secret ? secret : undefined;
}

export function shouldRequirePaymentWebhookSignature(env = process.env) {
  return (
    Boolean(resolvePaymentWebhookSecret(env)) || env.NODE_ENV === "production"
  );
}

export function createPaymentWebhookSignature({
  rawBody,
  secret,
  timestamp,
}: PaymentWebhookSignatureInput) {
  const digest = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  return `sha256=${digest}`;
}

export function verifyPaymentWebhookSignature({
  rawBody,
  headers,
  secret,
  now = new Date(),
  toleranceSeconds = DEFAULT_PAYMENT_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS,
}: PaymentWebhookVerificationInput) {
  if (!secret) {
    return {
      ok: false,
      message: "支付回调签名密钥未配置",
    } as const;
  }

  const timestamp = headerValue(headers, PAYMENT_WEBHOOK_TIMESTAMP_HEADER);
  const signature = headerValue(headers, PAYMENT_WEBHOOK_SIGNATURE_HEADER);
  if (!timestamp || !signature) {
    return {
      ok: false,
      message: "支付回调缺少签名头",
    } as const;
  }

  const timestampMs = Date.parse(timestamp);
  if (!Number.isFinite(timestampMs)) {
    return {
      ok: false,
      message: "支付回调签名时间不合法",
    } as const;
  }

  const driftSeconds = Math.abs(now.getTime() - timestampMs) / 1000;
  if (driftSeconds > toleranceSeconds) {
    return {
      ok: false,
      message: "支付回调签名已过期",
    } as const;
  }

  const expected = normalizeSignature(
    createPaymentWebhookSignature({ rawBody, secret, timestamp })
  );
  const received = normalizeSignature(signature);
  if (!safeEqual(expected, received)) {
    return {
      ok: false,
      message: "支付回调签名校验失败",
    } as const;
  }

  return { ok: true } as const;
}
