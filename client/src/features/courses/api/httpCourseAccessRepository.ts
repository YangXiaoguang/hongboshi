import {
  type ApiError,
  ApiResponseSchema,
  CourseAccessStateSchema,
  COURSE_ACCESS_USER_ID_HEADER,
  LOCAL_COURSE_ACCESS_USER_ID,
  type CourseAccessState,
} from "@shared/domain";

const CourseAccessResponseSchema = ApiResponseSchema(CourseAccessStateSchema);

const API_BASE = "/api/course-access";

export class CourseAccessRequestError extends Error {
  constructor(
    message: string,
    readonly code?: ApiError["code"],
    readonly status?: number
  ) {
    super(message);
    this.name = "CourseAccessRequestError";
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("课程权益服务返回了无法解析的数据");
  }
}

export function parseCourseAccessResponse(payload: unknown): CourseAccessState {
  const parsed = CourseAccessResponseSchema.parse(payload);
  if (!parsed.ok) {
    throw new CourseAccessRequestError(parsed.error.message, parsed.error.code);
  }
  return parsed.data;
}

function withStatus(err: unknown, status: number): Error {
  if (err instanceof CourseAccessRequestError) {
    return new CourseAccessRequestError(err.message, err.code, status);
  }

  return err instanceof Error ? err : new Error("课程权益服务暂时不可用");
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
    credentials: "same-origin",
    ...init,
  });
  const payload = await readJson(response);
  try {
    const accessState = parseCourseAccessResponse(payload);
    if (!response.ok) throw new CourseAccessRequestError(
      "课程权益服务暂时不可用",
      undefined,
      response.status
    );
    return accessState;
  } catch (err) {
    throw withStatus(err, response.status);
  }
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
