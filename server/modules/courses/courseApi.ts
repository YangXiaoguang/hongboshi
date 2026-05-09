import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { courses as seedCourses } from "../../../shared/data/mockCourses";
import {
  ApiResponseSchema,
  CourseCatalogResultSchema,
  CourseListQuerySchema,
  CourseSchema,
  LegacyNumericIdSchema,
  listCoursesByQuery,
  type CourseCatalogQuery,
} from "../../../shared/domain";

const CourseListResponseSchema = ApiResponseSchema(CourseCatalogResultSchema);
const CourseResponseSchema = ApiResponseSchema(CourseSchema);

function validatedCourses() {
  return seedCourses.map((course) => CourseSchema.parse(course));
}

function sendJson(res: Response | ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function getCoursePayload(courseId: number) {
  const course = validatedCourses().find((item) => item.id === courseId);
  if (!course) {
    return {
      status: 404,
      body: {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "课程不存在",
        },
      },
    } as const;
  }

  return {
    status: 200,
    body: CourseResponseSchema.parse({
      ok: true,
      data: course,
    }),
  } as const;
}

function queryFromSearchParams(searchParams: URLSearchParams): unknown {
  const rawPage = searchParams.get("page");
  const rawPageSize = searchParams.get("pageSize");
  const rawVipOnly = searchParams.get("vipOnly");

  return {
    category: searchParams.get("category") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    keyword: searchParams.get("keyword") ?? undefined,
    vipOnly: rawVipOnly === "true",
    page: rawPage ? Number(rawPage) : undefined,
    pageSize: rawPageSize ? Number(rawPageSize) : undefined,
  };
}

function sendBadRequest(res: Response | ServerResponse, message: string) {
  sendJson(res, 400, {
    ok: false,
    error: {
      code: "BAD_REQUEST",
      message,
    },
  });
}

export function listCoursesPayload(query: CourseCatalogQuery) {
  return CourseListResponseSchema.parse({
    ok: true,
    data: listCoursesByQuery(validatedCourses(), query),
  });
}

export function registerCourseApi(app: Express) {
  app.get("/api/courses", (req: Request, res: Response) => {
    const parsedQuery = CourseListQuerySchema.safeParse({
      category: req.query.category,
      type: req.query.type,
      sort: req.query.sort,
      keyword: req.query.keyword,
      vipOnly: req.query.vipOnly === "true",
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });

    if (!parsedQuery.success) {
      sendBadRequest(res, "课程查询参数不合法");
      return;
    }

    sendJson(res, 200, listCoursesPayload(parsedQuery.data));
  });

  app.get("/api/courses/:courseId", (req: Request, res: Response) => {
    const parsedCourseId = LegacyNumericIdSchema.safeParse(Number(req.params.courseId));
    if (!parsedCourseId.success) {
      sendBadRequest(res, "课程 ID 不合法");
      return;
    }

    const payload = getCoursePayload(parsedCourseId.data);
    sendJson(res, payload.status, payload.body);
  });
}

export function handleCourseApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  if (!req.url || !req.url.startsWith("/api/courses")) return false;

  const url = new URL(req.url, "http://localhost");

  if (req.method !== "GET") {
    sendJson(res, 405, {
      ok: false,
      error: {
        code: "BAD_REQUEST",
        message: "不支持的请求方法",
      },
    });
    return true;
  }

  if (url.pathname === "/api/courses") {
    const parsedQuery = CourseListQuerySchema.safeParse(
      queryFromSearchParams(url.searchParams)
    );
    if (!parsedQuery.success) {
      sendBadRequest(res, "课程查询参数不合法");
      return true;
    }

    sendJson(res, 200, listCoursesPayload(parsedQuery.data));
    return true;
  }

  const match = url.pathname.match(/^\/api\/courses\/(\d+)$/);
  if (!match) return false;

  const parsedCourseId = LegacyNumericIdSchema.safeParse(Number(match[1]));
  if (!parsedCourseId.success) {
    sendBadRequest(res, "课程 ID 不合法");
    return true;
  }

  const payload = getCoursePayload(parsedCourseId.data);
  sendJson(res, payload.status, payload.body);
  return true;
}
