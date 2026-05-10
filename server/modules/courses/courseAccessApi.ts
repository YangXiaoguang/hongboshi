import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { z } from "zod";
import { authorizeRequest } from "../auth/authorization";
import { resolveRequestUserId } from "../auth/currentUser";
import { courses as seedCourses } from "../../../shared/data/mockCourses";
import {
  ApiResponseSchema,
  CourseAccessStateSchema,
  CourseSchema,
  LOCAL_COURSE_ACCESS_USER_ID,
  LegacyNumericIdSchema,
  activateCourseMembership,
  grantPurchasedCourseAccess,
  type CourseAccessState,
} from "../../../shared/domain";
import {
  createDefaultCourseAccessStore,
  type CourseAccessStore,
} from "./courseAccessStore";

const CourseAccessResponseSchema = ApiResponseSchema(CourseAccessStateSchema);
const PurchaseCourseRequestSchema = z.object({
  courseId: LegacyNumericIdSchema,
});

let courseAccessStore = createDefaultCourseAccessStore();

function validatedCourses() {
  return seedCourses.map((course) => CourseSchema.parse(course));
}

function sendJson(res: Response | ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function statePayload(state: CourseAccessState) {
  return CourseAccessResponseSchema.parse({
    ok: true,
    data: state,
  });
}

function errorPayload(
  code: "BAD_REQUEST" | "NOT_FOUND" | "UNAUTHORIZED" | "FORBIDDEN",
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

export function setCourseAccessStore(store: CourseAccessStore) {
  courseAccessStore = store;
}

export function resetCourseAccessStore(
  state?: CourseAccessState,
  userId = LOCAL_COURSE_ACCESS_USER_ID
) {
  if (state) {
    courseAccessStore.reset(userId, CourseAccessStateSchema.parse(state));
    return;
  }

  courseAccessStore.clear();
}

export function getCourseAccessPayload(userId = LOCAL_COURSE_ACCESS_USER_ID) {
  return statePayload(loadCourseAccessState(userId));
}

export function loadCourseAccessState(userId = LOCAL_COURSE_ACCESS_USER_ID) {
  return courseAccessStore.load(userId);
}

export function purchaseCoursePayload(
  courseId: number,
  userId = LOCAL_COURSE_ACCESS_USER_ID
) {
  const course = findCourse(courseId);
  if (!course) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "课程不存在"),
    } as const;
  }

  const currentState = courseAccessStore.load(userId);
  const nextState = grantPurchasedCourseAccess(currentState, course, undefined, userId);
  courseAccessStore.save(userId, nextState);

  return {
    status: 200,
    body: statePayload(nextState),
  } as const;
}

export function activateMembershipPayload(userId = LOCAL_COURSE_ACCESS_USER_ID) {
  const currentState = courseAccessStore.load(userId);
  const nextState = activateCourseMembership(currentState);
  courseAccessStore.save(userId, nextState);

  return {
    status: 200,
    body: statePayload(nextState),
  } as const;
}

export function registerCourseAccessApi(app: Express) {
  app.get("/api/course-access", (req: Request, res: Response) => {
    sendJson(res, 200, getCourseAccessPayload(resolveRequestUserId(req)));
  });

  app.post("/api/course-access/purchases", (req: Request, res: Response) => {
    const auth = authorizeRequest(req, "course:purchase");
    if (!auth.ok) {
      sendJson(res, auth.status, auth.body);
      return;
    }

    const parsed = PurchaseCourseRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      sendJson(res, 400, errorPayload("BAD_REQUEST", "课程购买参数不合法"));
      return;
    }

    const payload = purchaseCoursePayload(
      parsed.data.courseId,
      auth.session.user.id
    );
    sendJson(res, payload.status, payload.body);
  });

  app.post("/api/course-access/membership", (req: Request, res: Response) => {
    const auth = authorizeRequest(req, "membership:activate");
    if (!auth.ok) {
      sendJson(res, auth.status, auth.body);
      return;
    }

    const payload = activateMembershipPayload(auth.session.user.id);
    sendJson(res, payload.status, payload.body);
  });
}

export function handleCourseAccessApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  if (!req.url || !req.url.startsWith("/api/course-access")) return false;

  const url = new URL(req.url, "http://localhost");
  const userId = resolveRequestUserId(req);

  if (req.method === "GET" && url.pathname === "/api/course-access") {
    sendJson(res, 200, getCourseAccessPayload(userId));
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/course-access/membership") {
    const auth = authorizeRequest(req, "membership:activate");
    if (!auth.ok) {
      sendJson(res, auth.status, auth.body);
      return true;
    }

    const payload = activateMembershipPayload(auth.session.user.id);
    sendJson(res, payload.status, payload.body);
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/course-access/purchases") {
    const auth = authorizeRequest(req, "course:purchase");
    if (!auth.ok) {
      sendJson(res, auth.status, auth.body);
      return true;
    }

    void readRequestBody(req).then((body) => {
      const parsed = PurchaseCourseRequestSchema.safeParse(body);
      if (!parsed.success) {
        sendJson(res, 400, errorPayload("BAD_REQUEST", "课程购买参数不合法"));
        return;
      }

      const payload = purchaseCoursePayload(parsed.data.courseId, auth.session.user.id);
      sendJson(res, payload.status, payload.body);
    });
    return true;
  }

  sendJson(res, 405, errorPayload("BAD_REQUEST", "不支持的请求方法"));
  return true;
}
