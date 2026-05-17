import {
  ApiResponseSchema,
  CourseMarketingRuleConsoleSchema,
  CourseMarketingRuleMutationResultSchema,
  CourseMarketingRuleSnapshotSchema,
  type CourseMarketingRuleMutationResult,
  type CourseMarketingRuleStatusUpdateRequest,
  type CourseMarketingRuleConsole,
  type CourseMarketingRuleSnapshot,
} from "@shared/domain";

const CourseMarketingRuleSnapshotResponseSchema = ApiResponseSchema(
  CourseMarketingRuleSnapshotSchema
);
const CourseMarketingRuleConsoleResponseSchema = ApiResponseSchema(
  CourseMarketingRuleConsoleSchema
);
const CourseMarketingRuleMutationResponseSchema = ApiResponseSchema(
  CourseMarketingRuleMutationResultSchema
);

const API_BASE = "/api/course-marketing";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("课程营销服务返回了无法解析的数据");
  }
}

export function parseCourseMarketingRuleSnapshotResponse(
  payload: unknown
): CourseMarketingRuleSnapshot {
  const parsed = CourseMarketingRuleSnapshotResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCourseMarketingRuleConsoleResponse(
  payload: unknown
): CourseMarketingRuleConsole {
  const parsed = CourseMarketingRuleConsoleResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCourseMarketingRuleMutationResponse(
  payload: unknown
): CourseMarketingRuleMutationResult {
  const parsed = CourseMarketingRuleMutationResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

function extractErrorMessage(payload: unknown, fallback: string) {
  const consoleParsed =
    CourseMarketingRuleConsoleResponseSchema.safeParse(payload);
  if (consoleParsed.success && !consoleParsed.data.ok) {
    return consoleParsed.data.error.message;
  }

  const mutationParsed =
    CourseMarketingRuleMutationResponseSchema.safeParse(payload);
  if (mutationParsed.success && !mutationParsed.data.ok) {
    return mutationParsed.data.error.message;
  }

  return fallback;
}

export const httpCourseMarketingRepository = {
  async loadActiveRules(): Promise<CourseMarketingRuleSnapshot> {
    const response = await fetch(`${API_BASE}/rules`, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const payload = await readJson(response);
    if (!response.ok) throw new Error("课程营销服务暂时不可用");
    return parseCourseMarketingRuleSnapshotResponse(payload);
  },

  async loadAdminConsole(): Promise<CourseMarketingRuleConsole> {
    const response = await fetch(`${API_BASE}/admin/rules`, {
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
      cache: "no-store",
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(
        extractErrorMessage(payload, "课程营销规则后台暂时不可用")
      );
    }
    return parseCourseMarketingRuleConsoleResponse(payload);
  },

  async updateRuleStatus(
    ruleId: string,
    request: CourseMarketingRuleStatusUpdateRequest
  ): Promise<CourseMarketingRuleMutationResult> {
    const response = await fetch(
      `${API_BASE}/admin/rules/${encodeURIComponent(ruleId)}/status`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify(request),
      }
    );
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "营销规则状态更新失败"));
    }
    return parseCourseMarketingRuleMutationResponse(payload);
  },
};
