import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import {
  ApiResponseSchema,
  COURSE_CATALOG_PERMISSIONS,
  CourseMarketingRuleMutationResultSchema,
  CourseMarketingRuleConsoleSchema,
  CourseMarketingRuleSnapshotSchema,
  CourseMarketingRuleStatusUpdateRequestSchema,
  isCourseMarketingRuleActiveAt,
  summarizeCourseMarketingRules,
  userCan,
  type AuthPermission,
  type LoginSession,
} from "../../../shared/domain";
import { getLoginSessionFromRequest } from "../auth/authSessionApi";
import {
  getCourseMarketingRuleStore,
  updateCourseMarketingRuleStatus,
  type CourseMarketingRuleStore,
} from "./courseMarketingRuleStore";

const CourseMarketingRuleSnapshotResponseSchema = ApiResponseSchema(
  CourseMarketingRuleSnapshotSchema
);
const CourseMarketingRuleConsoleResponseSchema = ApiResponseSchema(
  CourseMarketingRuleConsoleSchema
);
const CourseMarketingRuleMutationResponseSchema = ApiResponseSchema(
  CourseMarketingRuleMutationResultSchema
);

type CourseMarketingActor = Pick<LoginSession["user"], "id" | "roles">;
type CourseMarketingApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";
type CourseMarketingApiPayload = {
  status: number;
  body:
    | ReturnType<typeof CourseMarketingRuleSnapshotResponseSchema.parse>
    | ReturnType<typeof CourseMarketingRuleConsoleResponseSchema.parse>
    | ReturnType<typeof CourseMarketingRuleMutationResponseSchema.parse>;
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
        auditEvents: await store.listAuditEvents(),
      },
    }),
  };
}

export async function updateCourseMarketingRuleStatusPayload(
  actor: CourseMarketingActor | null | undefined,
  ruleId: string,
  body: unknown,
  store: CourseMarketingRuleStore = getCourseMarketingRuleStore(),
  now = new Date().toISOString()
): Promise<CourseMarketingApiPayload> {
  const denied = denyUnauthorizedActor(
    actor,
    courseMarketingOperationPermissions.manage
  );
  if (denied) return denied;

  const parsed = CourseMarketingRuleStatusUpdateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "营销规则状态更新参数不合法"),
    };
  }

  try {
    return {
      status: 200,
      body: CourseMarketingRuleMutationResponseSchema.parse({
        ok: true,
        data: await updateCourseMarketingRuleStatus({
          ruleId,
          request: parsed.data,
          actorId: actor!.id,
          actorRoles: actor!.roles,
          store,
          now,
        }),
      }),
    };
  } catch (err) {
    return courseMarketingActionFailure(err, "营销规则状态更新失败");
  }
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

  app.patch(
    "/api/course-marketing/admin/rules/:ruleId/status",
    async (req: Request, res: Response) => {
      try {
        const session = await getLoginSessionFromRequest(req);
        const payload = await updateCourseMarketingRuleStatusPayload(
          session?.user,
          req.params.ruleId,
          req.body
        );
        sendJson(res, payload.status, payload.body);
      } catch {
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "营销规则状态更新失败")
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

  if (url.pathname === "/api/course-marketing/rules") {
    if (req.method !== "GET") {
      sendJson(res, 405, errorPayload("BAD_REQUEST", "接口仅支持 GET 请求"));
      return true;
    }

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
    if (req.method !== "GET") {
      sendJson(res, 405, errorPayload("BAD_REQUEST", "接口仅支持 GET 请求"));
      return true;
    }

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

  const statusMatch = url.pathname.match(
    /^\/api\/course-marketing\/admin\/rules\/([^/]+)\/status$/
  );
  if (statusMatch?.[1]) {
    if (req.method !== "PATCH") {
      sendJson(res, 405, errorPayload("BAD_REQUEST", "接口仅支持 PATCH 请求"));
      return true;
    }

    void readRequestBody(req)
      .then(async body => {
        const session = await getLoginSessionFromRequest(req);
        const payload = await updateCourseMarketingRuleStatusPayload(
          session?.user,
          decodeURIComponent(statusMatch[1]),
          body
        );
        sendJson(res, payload.status, payload.body);
      })
      .catch(() =>
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "营销规则状态更新失败")
        )
      );
    return true;
  }

  return false;
}

function courseMarketingActionFailure(
  err: unknown,
  fallbackMessage: string
): CourseMarketingApiPayload {
  if (
    err instanceof Error &&
    err.message === "COURSE_MARKETING_RULE_NOT_FOUND"
  ) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "营销规则不存在"),
    };
  }

  if (
    err instanceof Error &&
    err.message === "COURSE_MARKETING_RULE_STATUS_UNCHANGED"
  ) {
    return {
      status: 409,
      body: errorPayload("CONFLICT", "营销规则已经处于目标状态"),
    };
  }

  if (err instanceof Error && err.message === "COURSE_MARKETING_RULE_EXPIRED") {
    return {
      status: 409,
      body: errorPayload("CONFLICT", "已过期营销规则不能恢复或暂停"),
    };
  }

  return {
    status: 500,
    body: errorPayload("INTERNAL_ERROR", fallbackMessage),
  };
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
