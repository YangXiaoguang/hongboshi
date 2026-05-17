import {
  ApiResponseSchema,
  CourseMarketingRuleConsoleSchema,
  CourseMarketingRuleSnapshotSchema,
  type CourseMarketingRuleConsole,
  type CourseMarketingRuleSnapshot,
} from "@shared/domain";

const CourseMarketingRuleSnapshotResponseSchema = ApiResponseSchema(
  CourseMarketingRuleSnapshotSchema
);
const CourseMarketingRuleConsoleResponseSchema = ApiResponseSchema(
  CourseMarketingRuleConsoleSchema
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
      const parsed =
        CourseMarketingRuleConsoleResponseSchema.safeParse(payload);
      if (parsed.success && !parsed.data.ok) {
        throw new Error(parsed.data.error.message);
      }
      throw new Error("课程营销规则后台暂时不可用");
    }
    return parseCourseMarketingRuleConsoleResponse(payload);
  },
};
