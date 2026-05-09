import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { z } from "zod";
import { courses as seedCourses } from "../../../shared/data/mockCourses";
import {
  ApiResponseSchema,
  CourseAccessStateSchema,
  CourseSchema,
  LegacyNumericIdSchema,
  activateCourseMembership,
  createEmptyCourseAccessState,
  grantPurchasedCourseAccess,
  type CourseAccessState,
} from "../../../shared/domain";

const CourseAccessResponseSchema = ApiResponseSchema(CourseAccessStateSchema);
const PurchaseCourseRequestSchema = z.object({
  courseId: LegacyNumericIdSchema,
});

let courseAccessState = createEmptyCourseAccessState();

function validatedCourses() {
  return seedCourses.map((course) => CourseSchema.parse(course));
}

function sendJson(res: Response | ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function statePayload(state: CourseAccessState = courseAccessState) {
  return CourseAccessResponseSchema.parse({
    ok: true,
    data: state,
  });
}

function errorPayload(code: "BAD_REQUEST" | "NOT_FOUND", message: string) {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  };
}

function findCourse(courseId: number) {
  return validatedCourses().find((course) => course.id === courseId);
}

function readRequestBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
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

export function resetCourseAccessStore(state = createEmptyCourseAccessState()) {
  courseAccessState = CourseAccessStateSchema.parse(state);
}

export function getCourseAccessPayload() {
  return statePayload();
}

export function purchaseCoursePayload(courseId: number) {
  const course = findCourse(courseId);
  if (!course) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "课程不存在"),
    } as const;
  }

  courseAccessState = grantPurchasedCourseAccess(courseAccessState, course);
  return {
    status: 200,
    body: statePayload(),
  } as const;
}

export function activateMembershipPayload() {
  courseAccessState = activateCourseMembership(courseAccessState);
  return {
    status: 200,
    body: statePayload(),
  } as const;
}

export function registerCourseAccessApi(app: Express) {
  app.get("/api/course-access", (_req: Request, res: Response) => {
    sendJson(res, 200, getCourseAccessPayload());
  });

  app.post("/api/course-access/purchases", (req: Request, res: Response) => {
    const parsed = PurchaseCourseRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      sendJson(res, 400, errorPayload("BAD_REQUEST", "课程购买参数不合法"));
      return;
    }

    const payload = purchaseCoursePayload(parsed.data.courseId);
    sendJson(res, payload.status, payload.body);
  });

  app.post("/api/course-access/membership", (_req: Request, res: Response) => {
    const payload = activateMembershipPayload();
    sendJson(res, payload.status, payload.body);
  });
}

export function handleCourseAccessApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  if (!req.url || !req.url.startsWith("/api/course-access")) return false;

  const url = new URL(req.url, "http://localhost");

  if (req.method === "GET" && url.pathname === "/api/course-access") {
    sendJson(res, 200, getCourseAccessPayload());
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/course-access/membership") {
    const payload = activateMembershipPayload();
    sendJson(res, payload.status, payload.body);
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/course-access/purchases") {
    void readRequestBody(req).then((body) => {
      const parsed = PurchaseCourseRequestSchema.safeParse(body);
      if (!parsed.success) {
        sendJson(res, 400, errorPayload("BAD_REQUEST", "课程购买参数不合法"));
        return;
      }

      const payload = purchaseCoursePayload(parsed.data.courseId);
      sendJson(res, payload.status, payload.body);
    });
    return true;
  }

  sendJson(res, 405, errorPayload("BAD_REQUEST", "不支持的请求方法"));
  return true;
}
