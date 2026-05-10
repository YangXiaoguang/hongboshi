import {
  ApiResponseSchema,
  AssessmentFlowSchema,
  AssessmentResultSchema,
  AssessmentSubmitRequestSchema,
  type AssessmentAnswer,
  type AssessmentFlow,
  type AssessmentResult,
} from "@shared/domain";

const AssessmentFlowResponseSchema = ApiResponseSchema(AssessmentFlowSchema);
const AssessmentResultResponseSchema = ApiResponseSchema(
  AssessmentResultSchema
);

const API_BASE = "/api/assessments";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("测评服务返回了无法解析的数据");
  }
}

export function parseAssessmentFlowResponse(payload: unknown): AssessmentFlow {
  const parsed = AssessmentFlowResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseAssessmentResultResponse(
  payload: unknown
): AssessmentResult {
  const parsed = AssessmentResultResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export const httpAssessmentRepository = {
  async loadQuickAssessmentFlow(): Promise<AssessmentFlow> {
    const response = await fetch(`${API_BASE}/quick`, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const payload = await readJson(response);
    if (!response.ok) throw new Error("测评服务暂时不可用");
    return parseAssessmentFlowResponse(payload);
  },

  async submitQuickAssessment(
    answers: AssessmentAnswer[]
  ): Promise<AssessmentResult> {
    const body = AssessmentSubmitRequestSchema.parse({ answers });
    const response = await fetch(`${API_BASE}/quick/report`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = await readJson(response);
    if (!response.ok) {
      const parsed = AssessmentResultResponseSchema.safeParse(payload);
      if (parsed.success && !parsed.data.ok) {
        throw new Error(parsed.data.error.message);
      }
      throw new Error("测评服务暂时不可用");
    }
    return parseAssessmentResultResponse(payload);
  },
};
