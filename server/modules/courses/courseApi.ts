import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { z } from "zod";
import { courses as seedCourses } from "../../../shared/data/mockCourses";
import {
  ApiResponseSchema,
  CourseSchema,
  LegacyNumericIdSchema,
} from "../../../shared/domain";

const CourseListResponseSchema = ApiResponseSchema(z.array(CourseSchema));
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

export function listCoursesPayload() {
  return CourseListResponseSchema.parse({
    ok: true,
    data: validatedCourses(),
  });
}

export function registerCourseApi(app: Express) {
  app.get("/api/courses", (_req: Request, res: Response) => {
    sendJson(res, 200, listCoursesPayload());
  });

  app.get("/api/courses/:courseId", (req: Request, res: Response) => {
    const parsedCourseId = LegacyNumericIdSchema.safeParse(Number(req.params.courseId));
    if (!parsedCourseId.success) {
      sendJson(res, 400, {
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: "课程 ID 不合法",
        },
      });
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
    sendJson(res, 200, listCoursesPayload());
    return true;
  }

  const match = url.pathname.match(/^\/api\/courses\/(\d+)$/);
  if (!match) return false;

  const parsedCourseId = LegacyNumericIdSchema.safeParse(Number(match[1]));
  if (!parsedCourseId.success) {
    sendJson(res, 400, {
      ok: false,
      error: {
        code: "BAD_REQUEST",
        message: "课程 ID 不合法",
      },
    });
    return true;
  }

  const payload = getCoursePayload(parsedCourseId.data);
  sendJson(res, payload.status, payload.body);
  return true;
}
