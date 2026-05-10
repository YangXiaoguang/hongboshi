import {
  ApiResponseSchema,
  PaymentReconciliationConsoleSchema,
  type PaymentReconciliationConsole,
} from "@shared/domain";

const PaymentReconciliationConsoleResponseSchema = ApiResponseSchema(
  PaymentReconciliationConsoleSchema
);

const API_BASE = "/api/payments";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("支付服务返回了无法解析的数据");
  }
}

export function parsePaymentReconciliationConsoleResponse(
  payload: unknown
): PaymentReconciliationConsole {
  const parsed = PaymentReconciliationConsoleResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

function extractErrorMessage(payload: unknown, fallback: string) {
  const parsed = PaymentReconciliationConsoleResponseSchema.safeParse(payload);
  if (parsed.success && !parsed.data.ok) return parsed.data.error.message;
  return fallback;
}

export const httpPaymentRepository = {
  async loadReconciliationConsole(): Promise<PaymentReconciliationConsole> {
    const response = await fetch(`${API_BASE}/admin/reconciliation`, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      credentials: "same-origin",
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "支付对账暂时不可用"));
    }
    return parsePaymentReconciliationConsoleResponse(payload);
  },
};
