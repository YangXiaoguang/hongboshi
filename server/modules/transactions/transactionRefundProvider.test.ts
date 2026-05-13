import { describe, expect, it } from "vitest";
import {
  ManualTransactionRefundProvider,
  createDefaultTransactionRefundProvider,
} from "./transactionRefundProvider";

const request = {
  transactionId: "evt_payment_1",
  orderId: "order_1",
  userId: "user_1",
  channel: "manual" as const,
  amount: 399,
  reason: "用户提交退款申请",
  requestedBy: "operator_1",
  requestedAt: "2026-05-12T10:00:00.000Z",
};

describe("transaction refund provider", () => {
  it("returns a refund acceptance summary without marking refunds successful", () => {
    const provider = new ManualTransactionRefundProvider("manual");

    const result = provider.requestRefund(request);

    expect(result).toMatchObject({
      provider: "manual",
      status: "accepted",
      handledAt: request.requestedAt,
      retryable: false,
    });
    expect(result.requestId).toMatch(/^manual_refund_/);
    expect(result.message).toContain("等待财务确认");
  });

  it("can use the simulated adapter for local verification", () => {
    const provider = createDefaultTransactionRefundProvider({
      HONGBOSHI_TRANSACTION_REFUND_PROVIDER: "simulated",
    } as NodeJS.ProcessEnv);

    const result = provider.requestRefund(request);

    expect(result).toMatchObject({
      provider: "simulated",
      status: "accepted",
    });
    expect(result.message).toContain("模拟退款通道");
  });
});
