import { describe, expect, it } from "vitest";
import { parsePaymentReconciliationConsoleResponse } from "./httpPaymentRepository";

describe("http payment repository parsing", () => {
  it("parses payment reconciliation console responses", () => {
    const parsed = parsePaymentReconciliationConsoleResponse({
      ok: true,
      data: {
        entries: [
          {
            id: "evt_payment_1",
            webhook: {
              id: "evt_payment_1",
              type: "payment.succeeded",
              orderId: "order_counseling_appointment_1",
              channel: "manual",
              status: "processed",
              amount: 399,
              transactionId: "tx_1",
              occurredAt: "2026-05-10T00:10:00.000Z",
              receivedAt: "2026-05-10T00:10:01.000Z",
              processedAt: "2026-05-10T00:10:02.000Z",
              responseStatus: 200,
            },
            business: {
              domain: "counseling",
              orderId: "order_counseling_appointment_1",
              userId: "user_1",
              orderStatus: "paid",
              appointmentId: "appointment_1",
              appointmentStatus: "scheduled",
              counselorId: "counselor_lin",
              payableAmount: 399,
              paidAt: "2026-05-10T00:10:00.000Z",
            },
            severity: "ok",
            issues: [],
            checkedAt: "2026-05-10T00:11:00.000Z",
          },
        ],
        summary: {
          receiptCount: 1,
          processedCount: 1,
          failedCount: 0,
          processingCount: 0,
          okCount: 1,
          warningCount: 0,
          criticalCount: 0,
        },
        serverTime: "2026-05-10T00:11:00.000Z",
      },
    });

    expect(parsed.summary.okCount).toBe(1);
    expect(parsed.entries[0]?.business?.orderStatus).toBe("paid");
  });

  it("throws with API error messages", () => {
    expect(() =>
      parsePaymentReconciliationConsoleResponse({
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "当前账号暂无支付对账权限",
        },
      })
    ).toThrow("当前账号暂无支付对账权限");
  });
});
