import {
  ApiResponseSchema,
  COURSE_ACCESS_USER_ID_HEADER,
  CourseLearningRecordListResultSchema,
  CourseLearningRecordResultSchema,
  LOCAL_COURSE_ACCESS_USER_ID,
  type ApiError,
  type CourseLearningCompletionSubmitRequest,
  type CourseLearningPracticeSyncRequest,
  type CourseLearningProgressSyncRequest,
  type CourseLearningRecord,
  type CourseLearningRecordListResult,
  type CourseLearningRecordResult,
} from "@shared/domain";

const CourseLearningRecordResponseSchema = ApiResponseSchema(
  CourseLearningRecordResultSchema
);
const CourseLearningRecordListResponseSchema = ApiResponseSchema(
  CourseLearningRecordListResultSchema
);

const API_BASE = "/api/course-learning";

export class CourseLearningRecordRequestError extends Error {
  constructor(
    message: string,
    readonly code?: ApiError["code"],
    readonly status?: number
  ) {
    super(message);
    this.name = "CourseLearningRecordRequestError";
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("学习记录服务返回了无法解析的数据");
  }
}

function withStatus(err: unknown, status: number): Error {
  if (err instanceof CourseLearningRecordRequestError) {
    return new CourseLearningRecordRequestError(err.message, err.code, status);
  }

  return err instanceof Error ? err : new Error("学习记录服务暂时不可用");
}

export function parseCourseLearningRecordResponse(
  payload: unknown
): CourseLearningRecordResult {
  const parsed = CourseLearningRecordResponseSchema.parse(payload);
  if (!parsed.ok) {
    throw new CourseLearningRecordRequestError(
      parsed.error.message,
      parsed.error.code
    );
  }
  return parsed.data;
}

export function parseCourseLearningRecordListResponse(
  payload: unknown
): CourseLearningRecordListResult {
  const parsed = CourseLearningRecordListResponseSchema.parse(payload);
  if (!parsed.ok) {
    throw new CourseLearningRecordRequestError(
      parsed.error.message,
      parsed.error.code
    );
  }
  return parsed.data;
}

async function requestRecord(
  path: string,
  init?: RequestInit,
  userId = LOCAL_COURSE_ACCESS_USER_ID
): Promise<CourseLearningRecordResult> {
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
    const result = parseCourseLearningRecordResponse(payload);
    if (!response.ok) {
      throw new CourseLearningRecordRequestError(
        "学习记录服务暂时不可用",
        undefined,
        response.status
      );
    }
    return result;
  } catch (err) {
    throw withStatus(err, response.status);
  }
}

async function requestRecordList(
  path: string,
  init?: RequestInit,
  userId = LOCAL_COURSE_ACCESS_USER_ID
): Promise<CourseLearningRecordListResult> {
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
    const result = parseCourseLearningRecordListResponse(payload);
    if (!response.ok) {
      throw new CourseLearningRecordRequestError(
        "学习记录服务暂时不可用",
        undefined,
        response.status
      );
    }
    return result;
  } catch (err) {
    throw withStatus(err, response.status);
  }
}

export const httpCourseLearningRecordRepository = {
  async listRecords(
    userId = LOCAL_COURSE_ACCESS_USER_ID
  ): Promise<CourseLearningRecord[]> {
    const result = await requestRecordList("/records", undefined, userId);
    return result.records;
  },

  async getRecord(
    courseId: number,
    userId = LOCAL_COURSE_ACCESS_USER_ID
  ): Promise<CourseLearningRecord> {
    const result = await requestRecord(
      `/records/${courseId}`,
      undefined,
      userId
    );
    return result.record;
  },

  async syncProgress(
    courseId: number,
    request: CourseLearningProgressSyncRequest,
    userId = LOCAL_COURSE_ACCESS_USER_ID
  ): Promise<CourseLearningRecord> {
    const result = await requestRecord(
      `/records/${courseId}/progress`,
      {
        method: "PUT",
        body: JSON.stringify(request),
      },
      userId
    );
    return result.record;
  },

  async syncPractice(
    courseId: number,
    chapterId: string,
    request: CourseLearningPracticeSyncRequest,
    userId = LOCAL_COURSE_ACCESS_USER_ID
  ): Promise<CourseLearningRecord> {
    const result = await requestRecord(
      `/records/${courseId}/practice/${encodeURIComponent(chapterId)}`,
      {
        method: "PUT",
        body: JSON.stringify(request),
      },
      userId
    );
    return result.record;
  },

  async submitCompletion(
    courseId: number,
    request: CourseLearningCompletionSubmitRequest,
    userId = LOCAL_COURSE_ACCESS_USER_ID
  ): Promise<CourseLearningRecord> {
    const result = await requestRecord(
      `/records/${courseId}/completion`,
      {
        method: "POST",
        body: JSON.stringify(request),
      },
      userId
    );
    return result.record;
  },
};
