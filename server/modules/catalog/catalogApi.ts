import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { z } from "zod";
import {
  ApiResponseSchema,
  CourseProductListQuerySchema,
  CourseProductListResultSchema,
  userCan,
  type LoginSession,
} from "../../../shared/domain";
import { getLoginSessionFromRequest } from "../auth/authSessionApi";
import {
  getCourseProductStore,
  listCourseProductsByQuery,
  type CourseProductStore,
} from "./courseProductStore";

const CourseProductAdminListResponseSchema = ApiResponseSchema(
  CourseProductListResultSchema
);

type CatalogApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INTERNAL_ERROR";
type CatalogOperationsActor = Pick<LoginSession["user"], "id" | "roles">;
type CatalogApiPayload = {
  status: number;
  body: z.infer<typeof CourseProductAdminListResponseSchema>;
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
  const result = listCourseProductsByQuery(products, queryResult.data);

  return {
    status: 200,
    body: CourseProductAdminListResponseSchema.parse({
      ok: true,
      data: result,
    }),
  };
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
}

export function handleCatalogApiRequest(
  req: IncomingMessage,
  res: ServerResponse
) {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (url.pathname !== "/api/catalog/admin/course-products") return false;

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
