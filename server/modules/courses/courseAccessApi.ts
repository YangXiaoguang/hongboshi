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
  return seedCourses.map(course => CourseSchema.parse(course));
}

function sendJson(
  res: Response | ServerResponse,
  status: number,
  payload: unknown
) {
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
  code:
    | "BAD_REQUEST"
    | "NOT_FOUND"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
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

function findCourse(courseId: number) {
  return validatedCourses().find(course => course.id === courseId);
}

function readRequestBody(req: IncomingMessage): Promise<unknown> {
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

export function setCourseAccessStore(store: CourseAccessStore) {
  courseAccessStore = store;
}

export function resetCourseAccessStore(
  state?: CourseAccessState,
  userId = LOCAL_COURSE_ACCESS_USER_ID
) {
  if (state) {
    return Promise.resolve(
      courseAccessStore.reset(userId, CourseAccessStateSchema.parse(state))
    );
  }

  return Promise.resolve(courseAccessStore.clear());
}

export async function getCourseAccessPayload(
  userId = LOCAL_COURSE_ACCESS_USER_ID
) {
  return statePayload(await loadCourseAccessState(userId));
}

export function loadCourseAccessState(userId = LOCAL_COURSE_ACCESS_USER_ID) {
  return Promise.resolve(courseAccessStore.load(userId));
}

export async function purchaseCoursePayload(
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

  const currentState = await courseAccessStore.load(userId);
  const nextState = grantPurchasedCourseAccess(
    currentState,
    course,
    undefined,
    userId
  );
  await courseAccessStore.save(userId, nextState);

  return {
    status: 200,
    body: statePayload(nextState),
  } as const;
}

export async function activateMembershipPayload(
  userId = LOCAL_COURSE_ACCESS_USER_ID
) {
  const currentState = await courseAccessStore.load(userId);
  const nextState = activateCourseMembership(currentState);
  await courseAccessStore.save(userId, nextState);

  return {
    status: 200,
    body: statePayload(nextState),
  } as const;
}

export function registerCourseAccessApi(app: Express) {
  app.get("/api/course-access", async (req: Request, res: Response) => {
    sendJson(
      res,
      200,
      await getCourseAccessPayload(await resolveRequestUserId(req))
    );
  });

  app.post(
    "/api/course-access/purchases",
    async (req: Request, res: Response) => {
      const auth = await authorizeRequest(req, "course:purchase");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const parsed = PurchaseCourseRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        sendJson(res, 400, errorPayload("BAD_REQUEST", "课程购买参数不合法"));
        return;
      }

      const payload = await purchaseCoursePayload(
        parsed.data.courseId,
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.post(
    "/api/course-access/membership",
    async (req: Request, res: Response) => {
      const auth = await authorizeRequest(req, "membership:activate");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await activateMembershipPayload(auth.session.user.id);
      sendJson(res, payload.status, payload.body);
    }
  );
}

export function handleCourseAccessApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  if (!req.url || !req.url.startsWith("/api/course-access")) return false;

  const url = new URL(req.url, "http://localhost");
  if (req.method === "GET" && url.pathname === "/api/course-access") {
    void resolveRequestUserId(req)
      .then(userId => getCourseAccessPayload(userId))
      .then(payload => sendJson(res, 200, payload))
      .catch(err => {
        console.error(err instanceof Error ? err.message : "课程权益读取失败");
        sendJson(res, 500, errorPayload("INTERNAL_ERROR", "课程权益读取失败"));
      });
    return true;
  }

  if (
    req.method === "POST" &&
    url.pathname === "/api/course-access/membership"
  ) {
    void (async () => {
      const auth = await authorizeRequest(req, "membership:activate");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await activateMembershipPayload(auth.session.user.id);
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "会员权益开通失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "会员权益开通失败"));
    });
    return true;
  }

  if (
    req.method === "POST" &&
    url.pathname === "/api/course-access/purchases"
  ) {
    void (async () => {
      const auth = await authorizeRequest(req, "course:purchase");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const body = await readRequestBody(req);
      const parsed = PurchaseCourseRequestSchema.safeParse(body);
      if (!parsed.success) {
        sendJson(res, 400, errorPayload("BAD_REQUEST", "课程购买参数不合法"));
        return;
      }

      const payload = await purchaseCoursePayload(
        parsed.data.courseId,
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "课程购买失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "课程购买失败"));
    });
    return true;
  }

  sendJson(res, 405, errorPayload("BAD_REQUEST", "不支持的请求方法"));
  return true;
}
