import { createHash } from "crypto";
import {
  TransactionRefundProviderResultSchema,
  type PaymentChannel,
  type TransactionRefundProviderResult,
} from "../../../shared/domain";

export type TransactionRefundRequest = {
  transactionId: string;
  orderId: string;
  userId: string;
  channel: PaymentChannel;
  amount: number;
  reason: string;
  requestedBy: string;
  requestedAt: string;
};

export interface TransactionRefundProvider {
  readonly providerName?: "manual" | "simulated";
  requestRefund(
    request: TransactionRefundRequest
  ): Promise<TransactionRefundProviderResult> | TransactionRefundProviderResult;
}

function refundRequestId(prefix: string, request: TransactionRefundRequest) {
  const hash = createHash("sha1")
    .update(
      [
        request.transactionId,
        request.orderId,
        request.userId,
        request.channel,
        request.amount,
        request.requestedAt,
      ].join(":")
    )
    .digest("hex")
    .slice(0, 16);

  return `${prefix}_${hash}`;
}

export class ManualTransactionRefundProvider
  implements TransactionRefundProvider
{
  constructor(readonly providerName: "manual" | "simulated" = "manual") {}

  requestRefund(request: TransactionRefundRequest) {
    const simulated = this.providerName === "simulated";

    return TransactionRefundProviderResultSchema.parse({
      provider: this.providerName,
      status: "accepted",
      requestId: refundRequestId(`${this.providerName}_refund`, request),
      message: simulated
        ? "模拟退款通道已受理申请，等待退款成功回调完成。"
        : "人工退款通道已受理申请，等待财务确认并由退款成功回调完成。",
      handledAt: request.requestedAt,
      retryable: false,
    });
  }
}

export function createDefaultTransactionRefundProvider(
  env: NodeJS.ProcessEnv = process.env
) {
  const configured = env.HONGBOSHI_TRANSACTION_REFUND_PROVIDER?.trim()
    .toLowerCase()
    .replace(/-/g, "_");

  return new ManualTransactionRefundProvider(
    configured === "simulated" ? "simulated" : "manual"
  );
}

let transactionRefundProvider: TransactionRefundProvider =
  createDefaultTransactionRefundProvider();

export function getTransactionRefundProvider() {
  return transactionRefundProvider;
}

export function setTransactionRefundProvider(
  provider: TransactionRefundProvider
) {
  transactionRefundProvider = provider;
}

export function resetTransactionRefundProvider() {
  transactionRefundProvider = createDefaultTransactionRefundProvider();
}
