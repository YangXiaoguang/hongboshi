import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { quickAssessmentFlow } from "../../../shared/data/assessmentQuestions";
import {
  ApiResponseSchema,
  AssessmentFlowSchema,
  AssessmentResultSchema,
  AssessmentSubmitRequestSchema,
  generateAssessmentResult,
} from "../../../shared/domain";
import { getLoginSessionFromRequest } from "../auth/authSessionApi";
import {
  createDefaultAssessmentResultStore,
  type AssessmentResultStore,
} from "./assessmentResultStore";
import { resetRiskEventStore, saveRiskEvent } from "../risk/riskEventStore";

const AssessmentFlowResponseSchema = ApiResponseSchema(AssessmentFlowSchema);
const AssessmentResultResponseSchema = ApiResponseSchema(
  AssessmentResultSchema
);
let assessmentResultStore = createDefaultAssessmentResultStore();

function reportStoreError(err: unknown) {
  console.error(err instanceof Error ? err.message : "测评结果持久化失败");
}

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
  code: "BAD_REQUEST" | "NOT_FOUND" | "INTERNAL_ERROR",
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

export function getQuickAssessmentFlowPayload() {
  return AssessmentFlowResponseSchema.parse({
    ok: true,
    data: quickAssessmentFlow,
  });
}

export function setAssessmentResultStore(store: AssessmentResultStore) {
  assessmentResultStore = store;
}

export function resetAssessmentResultStore() {
  return Promise.all([
    Promise.resolve(assessmentResultStore.clear()),
    resetRiskEventStore(),
  ]).then(() => undefined);
}

export function getLatestAssessmentResult(userId?: string) {
  if (!userId) return Promise.resolve(undefined);
  return Promise.resolve(assessmentResultStore.latest(userId));
}

export async function submitQuickAssessmentPayload(
  body: unknown,
  userId?: string
) {
  const parsed = AssessmentSubmitRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "测评答案不完整或格式不合法"),
    } as const;
  }

  try {
    const result = generateAssessmentResult({
      flow: quickAssessmentFlow,
      answers: parsed.data.answers,
      userId,
    });

    if (userId) {
      if (result.riskEvent) {
        await saveRiskEvent(result.riskEvent);
      }
      await assessmentResultStore.save(userId, result);
    }

    return {
      status: 200,
      body: AssessmentResultResponseSchema.parse({
        ok: true,
        data: result,
      }),
    } as const;
  } catch (err) {
    return {
      status: 400,
      body: errorPayload(
        "BAD_REQUEST",
        err instanceof Error ? err.message : "测评答案不完整或格式不合法"
      ),
    } as const;
  }
}

export function registerAssessmentApi(app: Express) {
  app.get("/api/assessments/quick", (_req: Request, res: Response) => {
    sendJson(res, 200, getQuickAssessmentFlowPayload());
  });

  app.post(
    "/api/assessments/quick/report",
    async (req: Request, res: Response) => {
      const session = getLoginSessionFromRequest(req);
      const payload = await submitQuickAssessmentPayload(
        req.body,
        session?.user.id
      );
      sendJson(res, payload.status, payload.body);
    }
  );
}

export function handleAssessmentApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  if (!req.url || !req.url.startsWith("/api/assessments")) return false;

  const url = new URL(req.url, "http://localhost");

  if (req.method === "GET" && url.pathname === "/api/assessments/quick") {
    sendJson(res, 200, getQuickAssessmentFlowPayload());
    return true;
  }

  if (
    req.method === "POST" &&
    url.pathname === "/api/assessments/quick/report"
  ) {
    void readRequestBody(req)
      .then(async body => {
        const session = getLoginSessionFromRequest(req);
        const payload = await submitQuickAssessmentPayload(
          body,
          session?.user.id
        );
        sendJson(res, payload.status, payload.body);
      })
      .catch(err => {
        reportStoreError(err);
        sendJson(res, 500, errorPayload("INTERNAL_ERROR", "测评报告生成失败"));
      });
    return true;
  }

  sendJson(res, 404, errorPayload("NOT_FOUND", "测评接口不存在"));
  return true;
}
