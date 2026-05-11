import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { z } from "zod";
import {
  ApiResponseSchema,
  CourseProductBasicInfoUpdateRequestSchema,
  CourseProductMutationResultSchema,
  CourseProductPriceUpdateRequestSchema,
  CourseProductListQuerySchema,
  CourseProductListResultSchema,
  CourseProductReviewActionRequestSchema,
  CourseProductStatusUpdateRequestSchema,
  userCan,
  type LoginSession,
} from "../../../shared/domain";
import { getLoginSessionFromRequest } from "../auth/authSessionApi";
import {
  getCourseProductStore,
  listCourseProductsByQuery,
  updateCourseProductBasicInfo,
  updateCourseProductPrice,
  updateCourseProductReview,
  updateCourseProductStatus,
  type CourseProductStore,
} from "./courseProductStore";

const CourseProductAdminListResponseSchema = ApiResponseSchema(
  CourseProductListResultSchema
);
const CourseProductMutationResponseSchema = ApiResponseSchema(
  CourseProductMutationResultSchema
);

type CatalogApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";
type CatalogOperationsActor = Pick<LoginSession["user"], "id" | "roles">;
type CatalogApiBody =
  | z.infer<typeof CourseProductAdminListResponseSchema>
  | z.infer<typeof CourseProductMutationResponseSchema>;
type CatalogApiPayload = {
  status: number;
  body: CatalogApiBody;
};

function sendJson(
  res: Response | ServerResponse,
  status: number,
  payload: unknown
) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function errorPayload(code: CatalogApiErrorCode, message: string) {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  } as const;
}

export async function getCourseProductAdminListPayload(
  actor: CatalogOperationsActor | null | undefined,
  rawQuery: Record<string, unknown>,
  store: CourseProductStore = getCourseProductStore()
): Promise<CatalogApiPayload> {
  if (!actor) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", "请先登录后查看课程商品"),
    };
  }

  if (!userCan(actor, "admin:manage")) {
    return {
      status: 403,
      body: errorPayload("FORBIDDEN", "当前账号暂无课程商品管理权限"),
    };
  }

  const queryResult = CourseProductListQuerySchema.safeParse(rawQuery);
  if (!queryResult.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "课程商品查询参数不合法"),
    };
  }

  const products = await store.listProducts();
  const result = listCourseProductsByQuery(
    products,
    queryResult.data,
    await store.listAuditEvents()
  );

  return {
    status: 200,
    body: CourseProductAdminListResponseSchema.parse({
      ok: true,
      data: result,
    }),
  };
}

export async function updateCourseProductStatusPayload(
  actor: CatalogOperationsActor | null | undefined,
  productId: string,
  body: unknown,
  store: CourseProductStore = getCourseProductStore(),
  now = new Date().toISOString()
): Promise<CatalogApiPayload> {
  const denied = denyUnauthorizedActor(actor);
  if (denied) return denied;

  const parsed = CourseProductStatusUpdateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "课程商品状态更新参数不合法"),
    };
  }

  try {
    return {
      status: 200,
      body: CourseProductMutationResponseSchema.parse({
        ok: true,
        data: await updateCourseProductStatus({
          productId,
          request: parsed.data,
          actorId: actor!.id,
          store,
          now,
        }),
      }),
    };
  } catch (err) {
    return courseProductActionFailure(err, "课程商品状态更新失败");
  }
}

export async function updateCourseProductPricePayload(
  actor: CatalogOperationsActor | null | undefined,
  productId: string,
  body: unknown,
  store: CourseProductStore = getCourseProductStore(),
  now = new Date().toISOString()
): Promise<CatalogApiPayload> {
  const denied = denyUnauthorizedActor(actor);
  if (denied) return denied;

  const parsed = CourseProductPriceUpdateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "课程商品价格更新参数不合法"),
    };
  }

  try {
    return {
      status: 200,
      body: CourseProductMutationResponseSchema.parse({
        ok: true,
        data: await updateCourseProductPrice({
          productId,
          request: parsed.data,
          actorId: actor!.id,
          store,
          now,
        }),
      }),
    };
  } catch (err) {
    return courseProductActionFailure(err, "课程商品价格更新失败");
  }
}

export async function updateCourseProductBasicInfoPayload(
  actor: CatalogOperationsActor | null | undefined,
  productId: string,
  body: unknown,
  store: CourseProductStore = getCourseProductStore(),
  now = new Date().toISOString()
): Promise<CatalogApiPayload> {
  const denied = denyUnauthorizedActor(actor);
  if (denied) return denied;

  const parsed = CourseProductBasicInfoUpdateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "课程商品基础信息参数不合法"),
    };
  }

  try {
    return {
      status: 200,
      body: CourseProductMutationResponseSchema.parse({
        ok: true,
        data: await updateCourseProductBasicInfo({
          productId,
          request: parsed.data,
          actorId: actor!.id,
          store,
          now,
        }),
      }),
    };
  } catch (err) {
    return courseProductActionFailure(err, "课程商品基础信息更新失败");
  }
}

export async function updateCourseProductReviewPayload(
  actor: CatalogOperationsActor | null | undefined,
  productId: string,
  body: unknown,
  store: CourseProductStore = getCourseProductStore(),
  now = new Date().toISOString()
): Promise<CatalogApiPayload> {
  const denied = denyUnauthorizedActor(actor);
  if (denied) return denied;

  const parsed = CourseProductReviewActionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "课程商品审核参数不合法"),
    };
  }

  try {
    return {
      status: 200,
      body: CourseProductMutationResponseSchema.parse({
        ok: true,
        data: await updateCourseProductReview({
          productId,
          request: parsed.data,
          actorId: actor!.id,
          store,
          now,
        }),
      }),
    };
  } catch (err) {
    return courseProductActionFailure(err, "课程商品审核状态更新失败");
  }
}

export function registerCatalogApi(app: Express) {
  app.get("/api/catalog/admin/course-products", async (req, res) => {
    try {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getCourseProductAdminListPayload(
        session?.user,
        queryFromExpress(req)
      );
      sendJson(res, payload.status, payload.body);
    } catch {
      sendJson(
        res,
        500,
        errorPayload("INTERNAL_ERROR", "课程商品列表暂时不可用")
      );
    }
  });

  app.patch(
    "/api/catalog/admin/course-products/:productId/status",
    async (req, res) => {
      try {
        const session = await getLoginSessionFromRequest(req);
        const payload = await updateCourseProductStatusPayload(
          session?.user,
          req.params.productId,
          req.body
        );
        sendJson(res, payload.status, payload.body);
      } catch {
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "课程商品状态更新失败")
        );
      }
    }
  );

  app.patch(
    "/api/catalog/admin/course-products/:productId/price",
    async (req, res) => {
      try {
        const session = await getLoginSessionFromRequest(req);
        const payload = await updateCourseProductPricePayload(
          session?.user,
          req.params.productId,
          req.body
        );
        sendJson(res, payload.status, payload.body);
      } catch {
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "课程商品价格更新失败")
        );
      }
    }
  );

  app.patch(
    "/api/catalog/admin/course-products/:productId/info",
    async (req, res) => {
      try {
        const session = await getLoginSessionFromRequest(req);
        const payload = await updateCourseProductBasicInfoPayload(
          session?.user,
          req.params.productId,
          req.body
        );
        sendJson(res, payload.status, payload.body);
      } catch {
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "课程商品基础信息更新失败")
        );
      }
    }
  );

  app.patch(
    "/api/catalog/admin/course-products/:productId/review",
    async (req, res) => {
      try {
        const session = await getLoginSessionFromRequest(req);
        const payload = await updateCourseProductReviewPayload(
          session?.user,
          req.params.productId,
          req.body
        );
        sendJson(res, payload.status, payload.body);
      } catch {
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "课程商品审核状态更新失败")
        );
      }
    }
  );
}

export function handleCatalogApiRequest(
  req: IncomingMessage,
  res: ServerResponse
) {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (!url.pathname.startsWith("/api/catalog")) return false;

  if (url.pathname === "/api/catalog/admin/course-products") {
    if (req.method !== "GET") {
      sendJson(res, 405, errorPayload("BAD_REQUEST", "接口仅支持 GET 请求"));
      return true;
    }

    void getLoginSessionFromRequest(req)
      .then(session =>
        getCourseProductAdminListPayload(
          session?.user,
          queryFromSearchParams(url.searchParams)
        )
      )
      .then(payload => sendJson(res, payload.status, payload.body))
      .catch(() =>
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "课程商品列表暂时不可用")
        )
      );

    return true;
  }

  const statusMatch = url.pathname.match(
    /^\/api\/catalog\/admin\/course-products\/([^/]+)\/status$/
  );
  if (statusMatch?.[1]) {
    if (req.method !== "PATCH") {
      sendJson(res, 405, errorPayload("BAD_REQUEST", "接口仅支持 PATCH 请求"));
      return true;
    }

    void readRequestBody(req)
      .then(async body => {
        const session = await getLoginSessionFromRequest(req);
        const payload = await updateCourseProductStatusPayload(
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
          errorPayload("INTERNAL_ERROR", "课程商品状态更新失败")
        )
      );
    return true;
  }

  const priceMatch = url.pathname.match(
    /^\/api\/catalog\/admin\/course-products\/([^/]+)\/price$/
  );
  if (priceMatch?.[1]) {
    if (req.method !== "PATCH") {
      sendJson(res, 405, errorPayload("BAD_REQUEST", "接口仅支持 PATCH 请求"));
      return true;
    }

    void readRequestBody(req)
      .then(async body => {
        const session = await getLoginSessionFromRequest(req);
        const payload = await updateCourseProductPricePayload(
          session?.user,
          decodeURIComponent(priceMatch[1]),
          body
        );
        sendJson(res, payload.status, payload.body);
      })
      .catch(() =>
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "课程商品价格更新失败")
        )
      );
    return true;
  }

  const infoMatch = url.pathname.match(
    /^\/api\/catalog\/admin\/course-products\/([^/]+)\/info$/
  );
  if (infoMatch?.[1]) {
    if (req.method !== "PATCH") {
      sendJson(res, 405, errorPayload("BAD_REQUEST", "接口仅支持 PATCH 请求"));
      return true;
    }

    void readRequestBody(req)
      .then(async body => {
        const session = await getLoginSessionFromRequest(req);
        const payload = await updateCourseProductBasicInfoPayload(
          session?.user,
          decodeURIComponent(infoMatch[1]),
          body
        );
        sendJson(res, payload.status, payload.body);
      })
      .catch(() =>
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "课程商品基础信息更新失败")
        )
      );
    return true;
  }

  const reviewMatch = url.pathname.match(
    /^\/api\/catalog\/admin\/course-products\/([^/]+)\/review$/
  );
  if (reviewMatch?.[1]) {
    if (req.method !== "PATCH") {
      sendJson(res, 405, errorPayload("BAD_REQUEST", "接口仅支持 PATCH 请求"));
      return true;
    }

    void readRequestBody(req)
      .then(async body => {
        const session = await getLoginSessionFromRequest(req);
        const payload = await updateCourseProductReviewPayload(
          session?.user,
          decodeURIComponent(reviewMatch[1]),
          body
        );
        sendJson(res, payload.status, payload.body);
      })
      .catch(() =>
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "课程商品审核状态更新失败")
        )
      );
    return true;
  }

  sendJson(res, 404, errorPayload("NOT_FOUND", "课程商品接口不存在"));
  return true;
}

function denyUnauthorizedActor(
  actor: CatalogOperationsActor | null | undefined
): CatalogApiPayload | undefined {
  if (!actor) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", "请先登录后管理课程商品"),
    };
  }

  if (!userCan(actor, "admin:manage")) {
    return {
      status: 403,
      body: errorPayload("FORBIDDEN", "当前账号暂无课程商品管理权限"),
    };
  }

  return undefined;
}

function courseProductActionFailure(
  err: unknown,
  fallbackMessage: string
): CatalogApiPayload {
  if (err instanceof Error && err.message === "COURSE_PRODUCT_NOT_FOUND") {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "课程商品不存在"),
    };
  }

  if (
    err instanceof Error &&
    err.message === "COURSE_PRODUCT_STATUS_UNCHANGED"
  ) {
    return {
      status: 409,
      body: errorPayload("CONFLICT", "课程商品已经处于目标状态"),
    };
  }

  if (err instanceof Error && err.message === "COURSE_PRODUCT_INFO_UNCHANGED") {
    return {
      status: 409,
      body: errorPayload("CONFLICT", "课程商品基础信息没有变化"),
    };
  }

  if (
    err instanceof Error &&
    err.message === "COURSE_PRODUCT_REVIEW_NOT_APPROVED"
  ) {
    return {
      status: 409,
      body: errorPayload("CONFLICT", "课程内容审核通过后才能上架"),
    };
  }

  if (
    err instanceof Error &&
    err.message === "COURSE_PRODUCT_REVIEW_TRANSITION_FORBIDDEN"
  ) {
    return {
      status: 409,
      body: errorPayload("CONFLICT", "当前课程商品审核状态不支持该操作"),
    };
  }

  if (
    err instanceof Error &&
    err.message === "COURSE_PRODUCT_STATUS_TRANSITION_FORBIDDEN"
  ) {
    return {
      status: 409,
      body: errorPayload("CONFLICT", "当前课程商品状态不支持该操作"),
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

function queryFromExpress(req: Request) {
  return queryFromRecord(req.query as Record<string, unknown>);
}

function queryFromSearchParams(params: URLSearchParams) {
  return queryFromRecord(Object.fromEntries(params.entries()));
}

function queryFromRecord(record: Record<string, unknown>) {
  return {
    keyword: stringValue(record.keyword),
    category: stringValue(record.category),
    status: stringValue(record.status),
    sort: stringValue(record.sort),
    page: numberValue(record.page),
    pageSize: numberValue(record.pageSize),
  };
}

function stringValue(value: unknown) {
  if (Array.isArray(value)) return stringValue(value[0]);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown) {
  const raw = stringValue(value);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : raw;
}
