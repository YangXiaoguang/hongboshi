import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import {
  ApiResponseSchema,
  CourseLearningCompletionSubmitRequestSchema,
  CourseLearningPracticeSyncRequestSchema,
  CourseLearningProgressSyncRequestSchema,
  CourseLearningRecordListResultSchema,
  CourseLearningRecordResultSchema,
  LegacyNumericIdSchema,
  createEmptyCourseLearningRecord,
  resolveCourseAccess,
  submitCourseLearningCompletion,
  upsertCourseLearningPracticeRecord,
  upsertCourseLearningProgress,
  type Course,
  type CourseLearningRecord,
} from "../../../shared/domain";
import { authorizeRequest } from "../auth/authorization";
import {
  courseFromCourseProduct,
  getCourseProductStore,
  type CourseProductStore,
} from "../catalog/courseProductStore";
import {
  getCourseProductContentForProduct,
  getCourseProductContentStore,
  type CourseProductContentStore,
} from "../catalog/courseProductContentStore";
import { loadCourseAccessState } from "./courseAccessApi";
import {
  createDefaultCourseLearningRecordStore,
  type CourseLearningRecordStore,
} from "./courseLearningRecordStore";

const CourseLearningRecordResponseSchema = ApiResponseSchema(
  CourseLearningRecordResultSchema
);
const CourseLearningRecordListResponseSchema = ApiResponseSchema(
  CourseLearningRecordListResultSchema
);

let courseLearningRecordStore = createDefaultCourseLearningRecordStore();

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
  code:
    | "BAD_REQUEST"
    | "NOT_FOUND"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "CONFLICT"
    | "INTERNAL_ERROR",
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

function recordPayload(record: CourseLearningRecord, generatedAt: string) {
  return CourseLearningRecordResponseSchema.parse({
    ok: true,
    data: {
      record,
      generatedAt,
    },
  });
}

function recordListPayload(
  records: CourseLearningRecord[],
  generatedAt: string
) {
  return CourseLearningRecordListResponseSchema.parse({
    ok: true,
    data: {
      records,
      generatedAt,
    },
  });
}

function actionFailure(err: unknown, fallbackMessage: string) {
  const message = err instanceof Error ? err.message : fallbackMessage;
  if (
    [
      "COURSE_LEARNING_CHAPTER_NOT_FOUND",
      "COURSE_LEARNING_NOT_COMPLETED",
    ].includes(message)
  ) {
    return {
      status: 409,
      body: errorPayload(
        "CONFLICT",
        message === "COURSE_LEARNING_CHAPTER_NOT_FOUND"
          ? "章节不存在或已调整，请刷新课程后再试"
          : "课程尚未完成，暂不能生成阶段证明预览"
      ),
    } as const;
  }

  return {
    status: 500,
    body: errorPayload("INTERNAL_ERROR", fallbackMessage),
  } as const;
}

function fallbackChapterIds(courseId: number, count: number) {
  return Array.from(
    { length: count },
    (_, index) => `${courseId}-chapter-${index + 1}`
  );
}

async function courseLearningContext({
  userId,
  courseId,
  productStore = getCourseProductStore(),
  contentStore = getCourseProductContentStore(),
}: {
  userId: string;
  courseId: number;
  productStore?: CourseProductStore;
  contentStore?: CourseProductContentStore;
}) {
  const product = (await productStore.listProducts()).find(
    item =>
      item.courseId === courseId &&
      item.status === "published" &&
      item.reviewStatus === "approved"
  );
  if (!product) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "课程不存在或暂未上架"),
    } as const;
  }

  const course = courseFromCourseProduct(product);
  const accessState = await loadCourseAccessState(userId);
  const access = resolveCourseAccess(accessState, course);
  if (!access.canStart) {
    return {
      status: 403,
      body: errorPayload("FORBIDDEN", "请先解锁课程后再同步学习记录"),
    } as const;
  }

  const content = await getCourseProductContentForProduct({
    productId: product.id,
    productStore,
    contentStore,
  });
  const remoteChapterIds = content.chapters.map(chapter => chapter.id);
  const chapterIds = Array.from(
    new Set([
      ...remoteChapterIds,
      ...fallbackChapterIds(course.id, remoteChapterIds.length),
    ])
  );

  return {
    status: 200,
    course,
    chapterIds,
    totalChapters: remoteChapterIds.length,
  } as const;
}

async function loadOrCreateRecord(
  userId: string,
  courseId: number,
  now: string
) {
  return (
    (await courseLearningRecordStore.load(userId, courseId)) ??
    createEmptyCourseLearningRecord({
      userId,
      courseId,
      now,
    })
  );
}

function parseCourseId(value: unknown) {
  return LegacyNumericIdSchema.safeParse(Number(value));
}

async function readRequestBody(req: IncomingMessage): Promise<unknown> {
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

export function setCourseLearningRecordStore(store: CourseLearningRecordStore) {
  courseLearningRecordStore = store;
}

export function resetCourseLearningRecordStore(record?: CourseLearningRecord) {
  return Promise.resolve(courseLearningRecordStore.reset(record));
}

export async function listCourseLearningRecordsPayload(
  userId: string,
  now = new Date().toISOString()
) {
  const records = await courseLearningRecordStore.listByUser(userId);
  return {
    status: 200,
    body: recordListPayload(records, now),
  } as const;
}

export async function getCourseLearningRecordPayload(
  courseId: number,
  userId: string,
  now = new Date().toISOString()
) {
  const context = await courseLearningContext({ userId, courseId });
  if (context.status !== 200) return context;

  const record = await loadOrCreateRecord(userId, courseId, now);
  await courseLearningRecordStore.save(record);
  return {
    status: 200,
    body: recordPayload(record, now),
  } as const;
}

export async function syncCourseLearningProgressPayload(
  courseId: number,
  body: unknown,
  userId: string,
  now = new Date().toISOString()
) {
  const parsed = CourseLearningProgressSyncRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "课程进度同步参数不合法"),
    } as const;
  }

  const context = await courseLearningContext({ userId, courseId });
  if (context.status !== 200) return context;

  try {
    const record = await loadOrCreateRecord(userId, courseId, now);
    const nextRecord = upsertCourseLearningProgress({
      record,
      request: parsed.data,
      allowedChapterIds: context.chapterIds,
      totalChapterCount: context.totalChapters,
      now,
    });
    await courseLearningRecordStore.save(nextRecord);
    return {
      status: 200,
      body: recordPayload(nextRecord, now),
    } as const;
  } catch (err) {
    return actionFailure(err, "课程进度同步失败");
  }
}

export async function syncCourseLearningPracticePayload(
  courseId: number,
  chapterId: string,
  body: unknown,
  userId: string,
  now = new Date().toISOString()
) {
  const parsed = CourseLearningPracticeSyncRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "课程练习同步参数不合法"),
    } as const;
  }

  const context = await courseLearningContext({ userId, courseId });
  if (context.status !== 200) return context;

  try {
    const record = await loadOrCreateRecord(userId, courseId, now);
    const nextRecord = upsertCourseLearningPracticeRecord({
      record,
      chapterId,
      request: parsed.data,
      allowedChapterIds: context.chapterIds,
      now,
    });
    await courseLearningRecordStore.save(nextRecord);
    return {
      status: 200,
      body: recordPayload(nextRecord, now),
    } as const;
  } catch (err) {
    return actionFailure(err, "课程练习同步失败");
  }
}

export async function submitCourseLearningCompletionPayload(
  courseId: number,
  body: unknown,
  userId: string,
  now = new Date().toISOString()
) {
  const parsed = CourseLearningCompletionSubmitRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "课程完成反馈参数不合法"),
    } as const;
  }

  const context = await courseLearningContext({ userId, courseId });
  if (context.status !== 200) return context;

  try {
    const record = await loadOrCreateRecord(userId, courseId, now);
    const nextRecord = submitCourseLearningCompletion({
      record,
      courseTitle: (context.course as Course).title,
      learningPathTitle: parsed.data.learningPathTitle,
      learningPathLabel: parsed.data.learningPathLabel,
      totalChapters: context.totalChapters,
      practiceDraftedCount: parsed.data.practiceDraftedCount,
      practiceCompletedCount: parsed.data.practiceCompletedCount,
      submittedAt: parsed.data.submittedAt ?? now,
    });
    await courseLearningRecordStore.save(nextRecord);
    return {
      status: 200,
      body: recordPayload(nextRecord, now),
    } as const;
  } catch (err) {
    return actionFailure(err, "课程完成反馈提交失败");
  }
}

export function registerCourseLearningRecordApi(app: Express) {
  app.get(
    "/api/course-learning/records",
    async (req: Request, res: Response) => {
      const auth = await authorizeRequest(req, "course_access:read");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await listCourseLearningRecordsPayload(
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.get(
    "/api/course-learning/records/:courseId",
    async (req: Request, res: Response) => {
      const parsedCourseId = parseCourseId(req.params.courseId);
      if (!parsedCourseId.success) {
        sendJson(res, 400, errorPayload("BAD_REQUEST", "课程 ID 不合法"));
        return;
      }

      const auth = await authorizeRequest(req, "course_access:read");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await getCourseLearningRecordPayload(
        parsedCourseId.data,
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.put(
    "/api/course-learning/records/:courseId/progress",
    async (req: Request, res: Response) => {
      const parsedCourseId = parseCourseId(req.params.courseId);
      if (!parsedCourseId.success) {
        sendJson(res, 400, errorPayload("BAD_REQUEST", "课程 ID 不合法"));
        return;
      }

      const auth = await authorizeRequest(req, "course_access:read");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await syncCourseLearningProgressPayload(
        parsedCourseId.data,
        req.body,
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.put(
    "/api/course-learning/records/:courseId/practice/:chapterId",
    async (req: Request, res: Response) => {
      const parsedCourseId = parseCourseId(req.params.courseId);
      if (!parsedCourseId.success) {
        sendJson(res, 400, errorPayload("BAD_REQUEST", "课程 ID 不合法"));
        return;
      }

      const auth = await authorizeRequest(req, "course_access:read");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await syncCourseLearningPracticePayload(
        parsedCourseId.data,
        req.params.chapterId,
        req.body,
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.post(
    "/api/course-learning/records/:courseId/completion",
    async (req: Request, res: Response) => {
      const parsedCourseId = parseCourseId(req.params.courseId);
      if (!parsedCourseId.success) {
        sendJson(res, 400, errorPayload("BAD_REQUEST", "课程 ID 不合法"));
        return;
      }

      const auth = await authorizeRequest(req, "course_access:read");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await submitCourseLearningCompletionPayload(
        parsedCourseId.data,
        req.body,
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    }
  );
}

export function handleCourseLearningRecordApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  if (!req.url || !req.url.startsWith("/api/course-learning")) return false;

  const url = new URL(req.url, "http://localhost");
  const listMatch = url.pathname === "/api/course-learning/records";
  if (req.method === "GET" && listMatch) {
    void (async () => {
      const auth = await authorizeRequest(req, "course_access:read");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }
      const payload = await listCourseLearningRecordsPayload(
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    })().catch(() =>
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "学习记录读取失败"))
    );
    return true;
  }

  const recordMatch = url.pathname.match(
    /^\/api\/course-learning\/records\/(\d+)$/
  );
  if (req.method === "GET" && recordMatch?.[1]) {
    void (async () => {
      const auth = await authorizeRequest(req, "course_access:read");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }
      const payload = await getCourseLearningRecordPayload(
        Number(recordMatch[1]),
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    })().catch(() =>
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "学习记录读取失败"))
    );
    return true;
  }

  const progressMatch = url.pathname.match(
    /^\/api\/course-learning\/records\/(\d+)\/progress$/
  );
  if (req.method === "PUT" && progressMatch?.[1]) {
    void (async () => {
      const auth = await authorizeRequest(req, "course_access:read");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }
      const body = await readRequestBody(req);
      const payload = await syncCourseLearningProgressPayload(
        Number(progressMatch[1]),
        body,
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    })().catch(() =>
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "课程进度同步失败"))
    );
    return true;
  }

  const practiceMatch = url.pathname.match(
    /^\/api\/course-learning\/records\/(\d+)\/practice\/([^/]+)$/
  );
  if (req.method === "PUT" && practiceMatch?.[1] && practiceMatch[2]) {
    void (async () => {
      const auth = await authorizeRequest(req, "course_access:read");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }
      const body = await readRequestBody(req);
      const payload = await syncCourseLearningPracticePayload(
        Number(practiceMatch[1]),
        decodeURIComponent(practiceMatch[2]),
        body,
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    })().catch(() =>
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "课程练习同步失败"))
    );
    return true;
  }

  const completionMatch = url.pathname.match(
    /^\/api\/course-learning\/records\/(\d+)\/completion$/
  );
  if (req.method === "POST" && completionMatch?.[1]) {
    void (async () => {
      const auth = await authorizeRequest(req, "course_access:read");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }
      const body = await readRequestBody(req);
      const payload = await submitCourseLearningCompletionPayload(
        Number(completionMatch[1]),
        body,
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    })().catch(() =>
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "课程完成反馈提交失败"))
    );
    return true;
  }

  sendJson(res, 405, errorPayload("BAD_REQUEST", "不支持的请求方法"));
  return true;
}
