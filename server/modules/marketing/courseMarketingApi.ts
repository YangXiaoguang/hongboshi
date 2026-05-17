import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import {
  ApiResponseSchema,
  COURSE_CATALOG_PERMISSIONS,
  CourseMarketingRuleConsoleSchema,
  CourseMarketingRuleSnapshotSchema,
  isCourseMarketingRuleActiveAt,
  summarizeCourseMarketingRules,
  userCan,
  type AuthPermission,
  type LoginSession,
} from "../../../shared/domain";
import { getLoginSessionFromRequest } from "../auth/authSessionApi";
import {
  getCourseMarketingRuleStore,
  type CourseMarketingRuleStore,
} from "./courseMarketingRuleStore";

const CourseMarketingRuleSnapshotResponseSchema = ApiResponseSchema(
  CourseMarketingRuleSnapshotSchema
);
const CourseMarketingRuleConsoleResponseSchema = ApiResponseSchema(
  CourseMarketingRuleConsoleSchema
);

type CourseMarketingActor = Pick<LoginSession["user"], "id" | "roles">;
type CourseMarketingApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INTERNAL_ERROR";
type CourseMarketingApiPayload = {
  status: number;
  body:
    | ReturnType<typeof CourseMarketingRuleSnapshotResponseSchema.parse>
    | ReturnType<typeof CourseMarketingRuleConsoleResponseSchema.parse>;
};

export const courseMarketingOperationPermissions = {
  read: COURSE_CATALOG_PERMISSIONS.read,
  manage: COURSE_CATALOG_PERMISSIONS.price,
} satisfies Record<string, AuthPermission>;

function sendJson(
  res: Response | ServerResponse,
  status: number,
  payload: unknown
) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function errorPayload(code: CourseMarketingApiErrorCode, message: string) {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  } as const;
}

function denyUnauthorizedActor(
  actor: CourseMarketingActor | null | undefined,
  permission: AuthPermission
): CourseMarketingApiPayload | undefined {
  if (!actor) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", "请先登录后查看营销规则"),
    };
  }

  if (!userCan(actor, permission)) {
    return {
      status: 403,
      body: errorPayload("FORBIDDEN", "当前账号无营销规则权限"),
    };
  }

  return undefined;
}

export async function getCourseMarketingRuleSnapshotPayload(
  store: CourseMarketingRuleStore = getCourseMarketingRuleStore(),
  now = new Date().toISOString()
): Promise<CourseMarketingApiPayload> {
  const rules = (await store.listRules(now)).filter(rule =>
    isCourseMarketingRuleActiveAt(rule, now)
  );

  return {
    status: 200,
    body: CourseMarketingRuleSnapshotResponseSchema.parse({
      ok: true,
      data: {
        serverTime: now,
        rules,
      },
    }),
  };
}

export async function getCourseMarketingRuleConsolePayload(
  actor: CourseMarketingActor | null | undefined,
  store: CourseMarketingRuleStore = getCourseMarketingRuleStore(),
  now = new Date().toISOString()
): Promise<CourseMarketingApiPayload> {
  const denied = denyUnauthorizedActor(
    actor,
    courseMarketingOperationPermissions.read
  );
  if (denied) return denied;

  const rules = await store.listRules(now);

  return {
    status: 200,
    body: CourseMarketingRuleConsoleResponseSchema.parse({
      ok: true,
      data: {
        serverTime: now,
        rules,
        summary: summarizeCourseMarketingRules(rules),
      },
    }),
  };
}

export function registerCourseMarketingApi(app: Express) {
  app.get(
    "/api/course-marketing/rules",
    async (_req: Request, res: Response) => {
      try {
        const payload = await getCourseMarketingRuleSnapshotPayload();
        sendJson(res, payload.status, payload.body);
      } catch {
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "课程营销规则暂时不可用")
        );
      }
    }
  );

  app.get(
    "/api/course-marketing/admin/rules",
    async (req: Request, res: Response) => {
      try {
        const session = await getLoginSessionFromRequest(req);
        const payload = await getCourseMarketingRuleConsolePayload(
          session?.user
        );
        sendJson(res, payload.status, payload.body);
      } catch {
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "课程营销规则后台暂时不可用")
        );
      }
    }
  );
}

export function handleCourseMarketingApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (!url.pathname.startsWith("/api/course-marketing")) return false;

  if (req.method !== "GET") {
    sendJson(res, 405, errorPayload("BAD_REQUEST", "接口仅支持 GET 请求"));
    return true;
  }

  if (url.pathname === "/api/course-marketing/rules") {
    void getCourseMarketingRuleSnapshotPayload()
      .then(payload => sendJson(res, payload.status, payload.body))
      .catch(() =>
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "课程营销规则暂时不可用")
        )
      );
    return true;
  }

  if (url.pathname === "/api/course-marketing/admin/rules") {
    void getLoginSessionFromRequest(req)
      .then(session => getCourseMarketingRuleConsolePayload(session?.user))
      .then(payload => sendJson(res, payload.status, payload.body))
      .catch(() =>
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "课程营销规则后台暂时不可用")
        )
      );
    return true;
  }

  return false;
}
