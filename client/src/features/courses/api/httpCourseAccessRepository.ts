import {
  ApiResponseSchema,
  CourseAccessStateSchema,
  COURSE_ACCESS_USER_ID_HEADER,
  LOCAL_COURSE_ACCESS_USER_ID,
  type CourseAccessState,
} from "@shared/domain";

const CourseAccessResponseSchema = ApiResponseSchema(CourseAccessStateSchema);

const API_BASE = "/api/course-access";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("课程权益服务返回了无法解析的数据");
  }
}

export function parseCourseAccessResponse(payload: unknown): CourseAccessState {
  const parsed = CourseAccessResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

async function requestAccessState(
  path = "",
  init?: RequestInit,
  userId = LOCAL_COURSE_ACCESS_USER_ID
): Promise<CourseAccessState> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      [COURSE_ACCESS_USER_ID_HEADER]: userId,
      ...init?.headers,
    },
    cache: "no-store",
    ...init,
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error("课程权益服务暂时不可用");
  return parseCourseAccessResponse(payload);
}

export const httpCourseAccessRepository = {
  load(userId = LOCAL_COURSE_ACCESS_USER_ID): Promise<CourseAccessState> {
    return requestAccessState("", undefined, userId);
  },

  purchaseCourse(
    courseId: number,
    userId = LOCAL_COURSE_ACCESS_USER_ID
  ): Promise<CourseAccessState> {
    return requestAccessState(
      "/purchases",
      {
        method: "POST",
        body: JSON.stringify({ courseId }),
      },
      userId
    );
  },

  activateMembership(userId = LOCAL_COURSE_ACCESS_USER_ID): Promise<CourseAccessState> {
    return requestAccessState(
      "/membership",
      {
        method: "POST",
      },
      userId
    );
  },
};
