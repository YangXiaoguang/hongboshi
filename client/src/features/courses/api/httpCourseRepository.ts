import { z } from "zod";
import {
  ApiResponseSchema,
  CourseSchema,
  type Course,
} from "@shared/domain";

const CourseListResponseSchema = ApiResponseSchema(z.array(CourseSchema));
const CourseResponseSchema = ApiResponseSchema(CourseSchema);

const API_BASE = "/api/courses";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("课程服务返回了无法解析的数据");
  }
}

export function parseCourseListResponse(payload: unknown): Course[] {
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
    const response = await fetch(API_BASE, {
      headers: {
        Accept: "application/json",
      },
    });
    const payload = await readJson(response);
    if (!response.ok) {
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
