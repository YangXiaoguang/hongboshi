import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { z } from "zod";
import {
  ApiResponseSchema,
  CourseMembershipPlanStatusUpdateRequestSchema,
  CourseMembershipPlanUpdateRequestSchema,
  CourseMembershipProductAdminConsoleSchema,
  CourseMembershipProductAdminMutationResultSchema,
  CourseMembershipProductSnapshotSchema,
  CourseMembershipProductUpdateRequestSchema,
  MEMBERSHIP_PRODUCT_ADMIN_PERMISSIONS,
  createCourseMembershipProductSnapshot,
  userCan,
  type AuthPermission,
  type LoginSession,
} from "../../../shared/domain";
import { getLoginSessionFromRequest } from "../auth/authSessionApi";
import {
  getCourseMembershipProductStore,
  updateCourseMembershipPlan,
  updateCourseMembershipPlanStatus,
  updateCourseMembershipProduct,
  type CourseMembershipProductStore,
} from "./courseMembershipProductStore";

const CourseMembershipProductConsoleResponseSchema = ApiResponseSchema(
  CourseMembershipProductAdminConsoleSchema
);
const CourseMembershipProductSnapshotResponseSchema = ApiResponseSchema(
  CourseMembershipProductSnapshotSchema
);
const CourseMembershipProductMutationResponseSchema = ApiResponseSchema(
  CourseMembershipProductAdminMutationResultSchema
);

type CourseMembershipProductActor = Pick<LoginSession["user"], "id" | "roles">;
type CourseMembershipProductApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";
type CourseMembershipProductApiBody =
  | z.infer<typeof CourseMembershipProductConsoleResponseSchema>
  | z.infer<typeof CourseMembershipProductSnapshotResponseSchema>
  | z.infer<typeof CourseMembershipProductMutationResponseSchema>;
type CourseMembershipProductApiPayload = {
  status: number;
  body: CourseMembershipProductApiBody;
};

export const courseMembershipProductOperationPermissions = {
  read: MEMBERSHIP_PRODUCT_ADMIN_PERMISSIONS.read,
  manage: MEMBERSHIP_PRODUCT_ADMIN_PERMISSIONS.manage,
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

function errorPayload(
  code: CourseMembershipProductApiErrorCode,
  message: string
) {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  } as const;
}

function denyUnauthorizedActor(
  actor: CourseMembershipProductActor | null | undefined,
  permission: AuthPermission,
  unauthorizedMessage = "请先登录后查看会员商品"
): CourseMembershipProductApiPayload | undefined {
  if (!actor) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", unauthorizedMessage),
    };
  }

  if (!userCan(actor, permission)) {
    return {
      status: 403,
      body: errorPayload("FORBIDDEN", "当前账号暂无会员商品运营权限"),
    };
  }

  return undefined;
}

export async function getCourseMembershipProductAdminConsolePayload(
  actor: CourseMembershipProductActor | null | undefined,
  store: CourseMembershipProductStore = getCourseMembershipProductStore(),
  now = new Date().toISOString()
): Promise<CourseMembershipProductApiPayload> {
  const denied = denyUnauthorizedActor(
    actor,
    courseMembershipProductOperationPermissions.read
  );
  if (denied) return denied;

  return {
    status: 200,
    body: CourseMembershipProductConsoleResponseSchema.parse({
      ok: true,
      data: {
        serverTime: now,
        product: await store.getProduct(),
        auditEvents: await store.listAuditEvents(),
      },
    }),
  };
}

export async function getCourseMembershipProductSnapshotPayload(
  store: CourseMembershipProductStore = getCourseMembershipProductStore(),
  now = new Date().toISOString()
): Promise<CourseMembershipProductApiPayload> {
  try {
    return {
      status: 200,
      body: CourseMembershipProductSnapshotResponseSchema.parse({
        ok: true,
        data: createCourseMembershipProductSnapshot(
          await store.getProduct(),
          now
        ),
      }),
    };
  } catch (err) {
    return courseMembershipProductSnapshotFailure(err);
  }
}

export async function updateCourseMembershipProductPayload(
  actor: CourseMembershipProductActor | null | undefined,
  body: unknown,
  store: CourseMembershipProductStore = getCourseMembershipProductStore(),
  now = new Date().toISOString()
): Promise<CourseMembershipProductApiPayload> {
  const denied = denyUnauthorizedActor(
    actor,
    courseMembershipProductOperationPermissions.manage,
    "请先登录后管理会员商品"
  );
  if (denied) return denied;

  const parsed = CourseMembershipProductUpdateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "会员商品基础信息参数不合法"),
    };
  }

  try {
    return {
      status: 200,
      body: CourseMembershipProductMutationResponseSchema.parse({
        ok: true,
        data: await updateCourseMembershipProduct({
          request: parsed.data,
          actorId: actor!.id,
          actorRoles: actor!.roles,
          store,
          now,
        }),
      }),
    };
  } catch (err) {
    return courseMembershipProductActionFailure(
      err,
      "会员商品基础信息更新失败"
    );
  }
}

export async function updateCourseMembershipPlanPayload(
  actor: CourseMembershipProductActor | null | undefined,
  planId: string,
  body: unknown,
  store: CourseMembershipProductStore = getCourseMembershipProductStore(),
  now = new Date().toISOString()
): Promise<CourseMembershipProductApiPayload> {
  const denied = denyUnauthorizedActor(
    actor,
    courseMembershipProductOperationPermissions.manage,
    "请先登录后管理会员套餐"
  );
  if (denied) return denied;

  const parsed = CourseMembershipPlanUpdateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "会员套餐参数不合法"),
    };
  }

  try {
    return {
      status: 200,
      body: CourseMembershipProductMutationResponseSchema.parse({
        ok: true,
        data: await updateCourseMembershipPlan({
          planId,
          request: parsed.data,
          actorId: actor!.id,
          actorRoles: actor!.roles,
          store,
          now,
        }),
      }),
    };
  } catch (err) {
    return courseMembershipProductActionFailure(err, "会员套餐更新失败");
  }
}

export async function updateCourseMembershipPlanStatusPayload(
  actor: CourseMembershipProductActor | null | undefined,
  planId: string,
  body: unknown,
  store: CourseMembershipProductStore = getCourseMembershipProductStore(),
  now = new Date().toISOString()
): Promise<CourseMembershipProductApiPayload> {
  const denied = denyUnauthorizedActor(
    actor,
    courseMembershipProductOperationPermissions.manage,
    "请先登录后管理会员套餐"
  );
  if (denied) return denied;

  const parsed = CourseMembershipPlanStatusUpdateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "会员套餐状态参数不合法"),
    };
  }

  try {
    return {
      status: 200,
      body: CourseMembershipProductMutationResponseSchema.parse({
        ok: true,
        data: await updateCourseMembershipPlanStatus({
          planId,
          request: parsed.data,
          actorId: actor!.id,
          actorRoles: actor!.roles,
          store,
          now,
        }),
      }),
    };
  } catch (err) {
    return courseMembershipProductActionFailure(err, "会员套餐状态更新失败");
  }
}

export function registerCourseMembershipProductApi(app: Express) {
  app.get("/api/memberships/product", async (_req: Request, res: Response) => {
    try {
      const payload = await getCourseMembershipProductSnapshotPayload();
      sendJson(res, payload.status, payload.body);
    } catch {
      sendJson(
        res,
        500,
        errorPayload("INTERNAL_ERROR", "会员商品暂时不可用")
      );
    }
  });

  app.get(
    "/api/memberships/admin/product",
    async (req: Request, res: Response) => {
      try {
        const session = await getLoginSessionFromRequest(req);
        const payload = await getCourseMembershipProductAdminConsolePayload(
          session?.user
        );
        sendJson(res, payload.status, payload.body);
      } catch {
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "会员商品后台暂时不可用")
        );
      }
    }
  );

  app.patch(
    "/api/memberships/admin/product",
    async (req: Request, res: Response) => {
      try {
        const session = await getLoginSessionFromRequest(req);
        const payload = await updateCourseMembershipProductPayload(
          session?.user,
          req.body
        );
        sendJson(res, payload.status, payload.body);
      } catch {
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "会员商品基础信息更新失败")
        );
      }
    }
  );

  app.patch(
    "/api/memberships/admin/plans/:planId",
    async (req: Request, res: Response) => {
      try {
        const session = await getLoginSessionFromRequest(req);
        const payload = await updateCourseMembershipPlanPayload(
          session?.user,
          req.params.planId,
          req.body
        );
        sendJson(res, payload.status, payload.body);
      } catch {
        sendJson(res, 500, errorPayload("INTERNAL_ERROR", "会员套餐更新失败"));
      }
    }
  );

  app.patch(
    "/api/memberships/admin/plans/:planId/status",
    async (req: Request, res: Response) => {
      try {
        const session = await getLoginSessionFromRequest(req);
        const payload = await updateCourseMembershipPlanStatusPayload(
          session?.user,
          req.params.planId,
          req.body
        );
        sendJson(res, payload.status, payload.body);
      } catch {
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "会员套餐状态更新失败")
        );
      }
    }
  );
}

export function handleCourseMembershipProductApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (!url.pathname.startsWith("/api/memberships")) return false;

  if (url.pathname === "/api/memberships/product") {
    if (req.method !== "GET") {
      sendJson(res, 405, errorPayload("BAD_REQUEST", "接口仅支持 GET 请求"));
      return true;
    }

    void getCourseMembershipProductSnapshotPayload()
      .then(payload => sendJson(res, payload.status, payload.body))
      .catch(() =>
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "会员商品暂时不可用")
        )
      );
    return true;
  }

  if (url.pathname === "/api/memberships/admin/product") {
    if (req.method !== "GET" && req.method !== "PATCH") {
      sendJson(
        res,
        405,
        errorPayload("BAD_REQUEST", "接口仅支持 GET/PATCH 请求")
      );
      return true;
    }

    if (req.method === "GET") {
      void getLoginSessionFromRequest(req)
        .then(session =>
          getCourseMembershipProductAdminConsolePayload(session?.user)
        )
        .then(payload => sendJson(res, payload.status, payload.body))
        .catch(() =>
          sendJson(
            res,
            500,
            errorPayload("INTERNAL_ERROR", "会员商品后台暂时不可用")
          )
        );
      return true;
    }

    void readRequestBody(req)
      .then(async body => {
        const session = await getLoginSessionFromRequest(req);
        const payload = await updateCourseMembershipProductPayload(
          session?.user,
          body
        );
        sendJson(res, payload.status, payload.body);
      })
      .catch(() =>
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "会员商品基础信息更新失败")
        )
      );
    return true;
  }

  const planStatusMatch = url.pathname.match(
    /^\/api\/memberships\/admin\/plans\/([^/]+)\/status$/
  );
  if (planStatusMatch?.[1]) {
    if (req.method !== "PATCH") {
      sendJson(res, 405, errorPayload("BAD_REQUEST", "接口仅支持 PATCH 请求"));
      return true;
    }

    void readRequestBody(req)
      .then(async body => {
        const session = await getLoginSessionFromRequest(req);
        const payload = await updateCourseMembershipPlanStatusPayload(
          session?.user,
          decodeURIComponent(planStatusMatch[1]),
          body
        );
        sendJson(res, payload.status, payload.body);
      })
      .catch(() =>
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "会员套餐状态更新失败")
        )
      );
    return true;
  }

  const planMatch = url.pathname.match(
    /^\/api\/memberships\/admin\/plans\/([^/]+)$/
  );
  if (planMatch?.[1]) {
    if (req.method !== "PATCH") {
      sendJson(res, 405, errorPayload("BAD_REQUEST", "接口仅支持 PATCH 请求"));
      return true;
    }

    void readRequestBody(req)
      .then(async body => {
        const session = await getLoginSessionFromRequest(req);
        const payload = await updateCourseMembershipPlanPayload(
          session?.user,
          decodeURIComponent(planMatch[1]),
          body
        );
        sendJson(res, payload.status, payload.body);
      })
      .catch(() =>
        sendJson(res, 500, errorPayload("INTERNAL_ERROR", "会员套餐更新失败"))
      );
    return true;
  }

  sendJson(res, 404, errorPayload("NOT_FOUND", "会员商品接口不存在"));
  return true;
}

function courseMembershipProductSnapshotFailure(
  err: unknown
): CourseMembershipProductApiPayload {
  const message = err instanceof Error ? err.message : "";

  if (
    message === "MEMBERSHIP_PRODUCT_NOT_AVAILABLE" ||
    message === "MEMBERSHIP_PLAN_NOT_AVAILABLE"
  ) {
    return {
      status: 409,
      body: errorPayload("CONFLICT", "会员商品暂不可用"),
    };
  }

  return {
    status: 500,
    body: errorPayload("INTERNAL_ERROR", "会员商品暂时不可用"),
  };
}

function courseMembershipProductActionFailure(
  err: unknown,
  fallback: string
): CourseMembershipProductApiPayload {
  if (!(err instanceof Error)) {
    return {
      status: 500,
      body: errorPayload("INTERNAL_ERROR", fallback),
    };
  }

  if (err.message.includes("_NOT_FOUND")) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "会员商品或套餐不存在"),
    };
  }

  if (
    err.message.includes("_UNCHANGED") ||
    err.message.includes("_NOT_AVAILABLE")
  ) {
    return {
      status: 409,
      body: errorPayload("CONFLICT", "会员商品状态无需重复更新"),
    };
  }

  return {
    status: 500,
    body: errorPayload("INTERNAL_ERROR", fallback),
  };
}

function readRequestBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk.toString();
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}
