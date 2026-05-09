import {
  ApiResponseSchema,
  CourseCatalogResultSchema,
  CourseSchema,
  type CourseCatalogQuery,
  type CourseCatalogResult,
  type Course,
} from "@shared/domain";

const CourseListResponseSchema = ApiResponseSchema(CourseCatalogResultSchema);
const CourseResponseSchema = ApiResponseSchema(CourseSchema);

const API_BASE = "/api/courses";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("课程服务返回了无法解析的数据");
  }
}

export function parseCourseListResponse(payload: unknown): CourseCatalogResult {
  const parsed = CourseListResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCourseResponse(payload: unknown): Course | undefined {
  const parsed = CourseResponseSchema.parse(payload);
  if (!parsed.ok) {
    if (parsed.error.code === "NOT_FOUND") return undefined;
    throw new Error(parsed.error.message);
  }
  return parsed.data;
}

export const httpCourseRepository = {
  async listAllCourses(): Promise<Course[]> {
    const result = await this.listCourses({
      category: "全部",
      type: "全部",
      sort: "comprehensive",
      keyword: "",
      vipOnly: false,
      page: 1,
      pageSize: 100,
    });
    return result.items;
  },

  async listCourses(query: CourseCatalogQuery): Promise<CourseCatalogResult> {
    const params = new URLSearchParams({
      category: query.category,
      type: query.type,
      sort: query.sort,
      keyword: query.keyword,
      vipOnly: String(query.vipOnly),
      page: String(query.page),
      pageSize: String(query.pageSize),
    });

    const url = `${API_BASE}?${params.toString()}`;
    const queriedResponse = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const payload = await readJson(queriedResponse);
    if (!queriedResponse.ok) {
      throw new Error("课程服务暂时不可用");
    }
    return parseCourseListResponse(payload);
  },

  async getCourseById(courseId: number): Promise<Course | undefined> {
    const response = await fetch(`${API_BASE}/${courseId}`, {
      headers: {
        Accept: "application/json",
      },
    });
    const payload = await readJson(response);
    if (!response.ok && response.status !== 404) {
      throw new Error("课程服务暂时不可用");
    }
    return parseCourseResponse(payload);
  },
};
