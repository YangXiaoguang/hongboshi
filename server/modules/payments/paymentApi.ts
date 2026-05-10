import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import {
  ApiResponseSchema,
  PaymentWebhookEventSchema,
} from "../../../shared/domain";
import {
  CounselingPaymentWebhookResultSchema,
  processCounselingPaymentWebhookEvent,
} from "../counseling/counselingApi";

const PaymentWebhookResponseSchema = ApiResponseSchema(
  CounselingPaymentWebhookResultSchema
);

function sendJson(
  res: Response | ServerResponse,
  status: number,
  payload: unknown
) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function errorPayload(
  code: "BAD_REQUEST" | "NOT_FOUND" | "CONFLICT" | "INTERNAL_ERROR",
  message: string
) {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  };
}

function readRequestBody(req: IncomingMessage): Promise<unknown> {
  return new Promise(resolve => {
    let body = "";
    req.on("data", chunk => {
      body += chunk.toString();
    });
    req.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        resolve(undefined);
      }
    });
  });
}

export async function processPaymentWebhookPayload(body: unknown) {
  const parsed = PaymentWebhookEventSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "支付回调参数不合法"),
    } as const;
  }

  if (parsed.data.orderId.startsWith("order_counseling_")) {
    return processCounselingPaymentWebhookEvent(parsed.data);
  }

  return {
    status: 404,
    body: errorPayload("NOT_FOUND", "支付回调关联的业务订单不存在"),
  } as const;
}

export function registerPaymentApi(app: Express) {
  app.post(
    "/api/payments/webhooks/simulated",
    async (req: Request, res: Response) => {
      const payload = await processPaymentWebhookPayload(req.body);
      if (payload.body.ok) {
        sendJson(
          res,
          payload.status,
          PaymentWebhookResponseSchema.parse(payload.body)
        );
        return;
      }
      sendJson(res, payload.status, payload.body);
    }
  );
}

export function handlePaymentApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  if (!req.url || !req.url.startsWith("/api/payments")) return false;

  const url = new URL(req.url, "http://localhost");
  if (
    req.method === "POST" &&
    url.pathname === "/api/payments/webhooks/simulated"
  ) {
    void readRequestBody(req)
      .then(async body => {
        const payload = await processPaymentWebhookPayload(body);
        if (payload.body.ok) {
          sendJson(
            res,
            payload.status,
            PaymentWebhookResponseSchema.parse(payload.body)
          );
          return;
        }
        sendJson(res, payload.status, payload.body);
      })
      .catch(err => {
        console.error(err instanceof Error ? err.message : "支付回调处理失败");
        sendJson(res, 500, errorPayload("INTERNAL_ERROR", "支付回调处理失败"));
      });
    return true;
  }

  sendJson(res, 404, errorPayload("NOT_FOUND", "支付接口不存在"));
  return true;
}
