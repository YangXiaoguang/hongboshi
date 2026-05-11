import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import {
  ApiResponseSchema,
  CourseCatalogResultSchema,
  CourseProductDetailContentSchema,
  CourseListQuerySchema,
  CourseSchema,
  LegacyNumericIdSchema,
  listCoursesByQuery,
  type CourseCatalogQuery,
} from "../../../shared/domain";
import {
  coursesFromPublishedProducts,
  getCourseProductStore,
  type CourseProductStore,
} from "../catalog/courseProductStore";
import {
  getCourseProductContentForProduct,
  getCourseProductContentStore,
  type CourseProductContentStore,
} from "../catalog/courseProductContentStore";

const CourseListResponseSchema = ApiResponseSchema(CourseCatalogResultSchema);
const CourseResponseSchema = ApiResponseSchema(CourseSchema);
const CourseProductContentResponseSchema = ApiResponseSchema(
  CourseProductDetailContentSchema
);

function sendJson(
  res: Response | ServerResponse,
  status: number,
  payload: unknown
) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function publishedCourses(
  store: CourseProductStore = getCourseProductStore()
) {
  return coursesFromPublishedProducts(await store.listProducts()).map(course =>
    CourseSchema.parse(course)
  );
}

export async function getCoursePayload(
  courseId: number,
  store: CourseProductStore = getCourseProductStore()
) {
  const course = (await publishedCourses(store)).find(
    item => item.id === courseId
  );
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

export async function getCourseDetailContentPayload(
  courseId: number,
  productStore: CourseProductStore = getCourseProductStore(),
  contentStore: CourseProductContentStore = getCourseProductContentStore()
) {
  const product = (await productStore.listProducts()).find(
    item =>
      item.courseId === courseId &&
      item.status === "published" &&
      item.reviewStatus === "approved"
  );
  if (!product) {
    return {
      status: 404,
      body: {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "课程详情内容不存在",
        },
      },
    } as const;
  }

  return {
    status: 200,
    body: CourseProductContentResponseSchema.parse({
      ok: true,
      data: await getCourseProductContentForProduct({
        productId: product.id,
        productStore,
        contentStore,
      }),
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

export async function listCoursesPayload(
  query: CourseCatalogQuery,
  store: CourseProductStore = getCourseProductStore()
) {
  return CourseListResponseSchema.parse({
    ok: true,
    data: listCoursesByQuery(await publishedCourses(store), query),
  });
}

export function registerCourseApi(app: Express) {
  app.get("/api/courses", async (req: Request, res: Response) => {
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

    try {
      sendJson(res, 200, await listCoursesPayload(parsedQuery.data));
    } catch {
      sendJson(res, 500, {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "课程列表读取失败",
        },
      });
    }
  });

  app.get("/api/courses/:courseId", async (req: Request, res: Response) => {
    const parsedCourseId = LegacyNumericIdSchema.safeParse(
      Number(req.params.courseId)
    );
    if (!parsedCourseId.success) {
      sendBadRequest(res, "课程 ID 不合法");
      return;
    }

    try {
      const payload = await getCoursePayload(parsedCourseId.data);
      sendJson(res, payload.status, payload.body);
    } catch {
      sendJson(res, 500, {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "课程详情读取失败",
        },
      });
    }
  });

  app.get(
    "/api/courses/:courseId/content",
    async (req: Request, res: Response) => {
      const parsedCourseId = LegacyNumericIdSchema.safeParse(
        Number(req.params.courseId)
      );
      if (!parsedCourseId.success) {
        sendBadRequest(res, "课程 ID 不合法");
        return;
      }

      try {
        const payload = await getCourseDetailContentPayload(
          parsedCourseId.data
        );
        sendJson(res, payload.status, payload.body);
      } catch {
        sendJson(res, 500, {
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "课程详情内容读取失败",
          },
        });
      }
    }
  );
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

    void listCoursesPayload(parsedQuery.data)
      .then(payload => sendJson(res, 200, payload))
      .catch(() =>
        sendJson(res, 500, {
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "课程列表读取失败",
          },
        })
      );
    return true;
  }

  const contentMatch = url.pathname.match(/^\/api\/courses\/(\d+)\/content$/);
  if (contentMatch?.[1]) {
    const parsedCourseId = LegacyNumericIdSchema.safeParse(
      Number(contentMatch[1])
    );
    if (!parsedCourseId.success) {
      sendBadRequest(res, "课程 ID 不合法");
      return true;
    }

    void getCourseDetailContentPayload(parsedCourseId.data)
      .then(payload => sendJson(res, payload.status, payload.body))
      .catch(() =>
        sendJson(res, 500, {
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "课程详情内容读取失败",
          },
        })
      );
    return true;
  }

  const match = url.pathname.match(/^\/api\/courses\/(\d+)$/);
  if (!match) return false;

  const parsedCourseId = LegacyNumericIdSchema.safeParse(Number(match[1]));
  if (!parsedCourseId.success) {
    sendBadRequest(res, "课程 ID 不合法");
    return true;
  }

  void getCoursePayload(parsedCourseId.data)
    .then(payload => sendJson(res, payload.status, payload.body))
    .catch(() =>
      sendJson(res, 500, {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "课程详情读取失败",
        },
      })
    );
  return true;
}
