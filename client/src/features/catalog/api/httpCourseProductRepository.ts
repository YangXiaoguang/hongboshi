import {
  ApiResponseSchema,
  CourseProductListResultSchema,
  type CourseProductListQuery,
  type CourseProductListResult,
} from "@shared/domain";

const CourseProductListResponseSchema = ApiResponseSchema(
  CourseProductListResultSchema
);

const API_BASE = "/api/catalog/admin";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("课程商品服务返回了无法解析的数据");
  }
}

export function parseCourseProductListResponse(
  payload: unknown
): CourseProductListResult {
  const parsed = CourseProductListResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

function extractErrorMessage(payload: unknown, fallback: string) {
  const parsed = CourseProductListResponseSchema.safeParse(payload);
  if (parsed.success && !parsed.data.ok) return parsed.data.error.message;
  return fallback;
}

function queryStringFromCourseProductQuery(
  query: Partial<CourseProductListQuery>
) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export const httpCourseProductRepository = {
  async loadCourseProducts(
    query: Partial<CourseProductListQuery> = {}
  ): Promise<CourseProductListResult> {
    const response = await fetch(
      `${API_BASE}/course-products${queryStringFromCourseProductQuery(query)}`,
      {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
        credentials: "same-origin",
      }
    );
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "课程商品列表暂时不可用"));
    }
    return parseCourseProductListResponse(payload);
  },
};
