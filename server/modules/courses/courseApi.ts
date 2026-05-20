import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import {
  ApiResponseSchema,
  CourseCatalogResultSchema,
  CourseProductDetailContentSchema,
  CourseAccessStateSchema,
  CourseListQuerySchema,
  CourseSchema,
  LegacyNumericIdSchema,
  listCoursesByQuery,
  resolveCourseAccess,
  type CourseAccessState,
  type CourseCatalogQuery,
} from "../../../shared/domain";
import { authorizeRequest } from "../auth/authorization";
import {
  coursesFromPublishedProducts,
  courseFromCourseProduct,
  getCourseProductStore,
  type CourseProductStore,
} from "../catalog/courseProductStore";
import {
  getCourseProductAssetDownloadFile,
  getCourseProductAssetFileStorage,
  getCourseProductAssetPublicViewFile,
  getCourseProductAssetStore,
  type CourseProductAssetFileStorage,
  type CourseProductAssetStore,
} from "../catalog/courseProductAssetStore";
import {
  getCourseProductContentForProduct,
  getCourseProductContentStore,
  type CourseProductContentStore,
} from "../catalog/courseProductContentStore";
import { loadCourseAccessState } from "./courseAccessApi";

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

function sendCourseAssetFile(
  res: Response | ServerResponse,
  file: {
    bytes: Buffer;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  },
  disposition: "inline" | "attachment"
) {
  res.statusCode = 200;
  res.setHeader("Content-Type", file.mimeType);
  res.setHeader("Content-Length", String(file.sizeBytes));
  res.setHeader(
    "Content-Disposition",
    `${disposition}; filename="${encodeURIComponent(file.fileName)}"`
  );
  res.end(file.bytes);
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

async function findPublishedProductByCourseId(
  courseId: number,
  productStore: CourseProductStore
) {
  return (await productStore.listProducts()).find(
    item =>
      item.courseId === courseId &&
      item.status === "published" &&
      item.reviewStatus === "approved"
  );
}

function courseAssetErrorPayload(
  status: 400 | 401 | 403 | 404 | 500,
  code:
    | "BAD_REQUEST"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "INTERNAL_ERROR",
  message: string
) {
  return {
    status,
    body: {
      ok: false,
      error: {
        code,
        message,
      },
    },
  } as const;
}

function courseAssetFailure(err: unknown, fallbackMessage: string) {
  if (
    err instanceof Error &&
    err.message === "COURSE_PRODUCT_ASSET_NOT_FOUND"
  ) {
    return courseAssetErrorPayload(404, "NOT_FOUND", "课程素材不存在");
  }
  if (
    err instanceof Error &&
    err.message === "COURSE_PRODUCT_ASSET_FILE_NOT_FOUND"
  ) {
    return courseAssetErrorPayload(404, "NOT_FOUND", "课程素材文件不存在");
  }
  if (
    err instanceof Error &&
    err.message === "COURSE_PRODUCT_ASSET_NOT_APPROVED"
  ) {
    return courseAssetErrorPayload(404, "NOT_FOUND", "课程素材暂不可用");
  }
  if (
    err instanceof Error &&
    err.message === "COURSE_PRODUCT_ASSET_DOWNLOAD_DISABLED"
  ) {
    return courseAssetErrorPayload(403, "FORBIDDEN", "课程素材暂未开启下载");
  }

  return courseAssetErrorPayload(500, "INTERNAL_ERROR", fallbackMessage);
}

export async function getCourseAssetViewPayload(
  courseId: number,
  assetId: string,
  productStore: CourseProductStore = getCourseProductStore(),
  assetStore: CourseProductAssetStore = getCourseProductAssetStore(),
  fileStorage: CourseProductAssetFileStorage = getCourseProductAssetFileStorage()
) {
  const product = await findPublishedProductByCourseId(courseId, productStore);
  if (!product) {
    return courseAssetErrorPayload(404, "NOT_FOUND", "课程素材不存在");
  }

  try {
    const result = await getCourseProductAssetPublicViewFile({
      productId: product.id,
      assetId,
      assetStore,
      fileStorage,
    });
    return {
      status: 200,
      file: result.file,
    } as const;
  } catch (err) {
    return courseAssetFailure(err, "课程素材读取失败");
  }
}

export async function getCourseAssetDownloadPayload(
  courseId: number,
  assetId: string,
  userId: string,
  productStore: CourseProductStore = getCourseProductStore(),
  assetStore: CourseProductAssetStore = getCourseProductAssetStore(),
  fileStorage: CourseProductAssetFileStorage = getCourseProductAssetFileStorage(),
  loadAccessStateForUser: (
    userId: string
  ) => Promise<CourseAccessState> = loadCourseAccessState
) {
  const product = await findPublishedProductByCourseId(courseId, productStore);
  if (!product) {
    return courseAssetErrorPayload(404, "NOT_FOUND", "课程素材不存在");
  }

  const course = CourseSchema.parse(courseFromCourseProduct(product));
  const accessState = CourseAccessStateSchema.parse(
    await loadAccessStateForUser(userId)
  );
  if (!resolveCourseAccess(accessState, course).canStart) {
    return courseAssetErrorPayload(
      403,
      "FORBIDDEN",
      "请先解锁课程后再下载资料"
    );
  }

  try {
    const result = await getCourseProductAssetDownloadFile({
      productId: product.id,
      assetId,
      assetStore,
      fileStorage,
    });
    return {
      status: 200,
      file: result.file,
    } as const;
  } catch (err) {
    return courseAssetFailure(err, "课程素材下载失败");
  }
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

  app.get(
    "/api/courses/:courseId/assets/:assetId/view",
    async (req: Request, res: Response) => {
      const parsedCourseId = LegacyNumericIdSchema.safeParse(
        Number(req.params.courseId)
      );
      if (!parsedCourseId.success) {
        sendBadRequest(res, "课程 ID 不合法");
        return;
      }

      try {
        const payload = await getCourseAssetViewPayload(
          parsedCourseId.data,
          req.params.assetId
        );
        if ("file" in payload) {
          sendCourseAssetFile(res, payload.file, "inline");
          return;
        }
        sendJson(res, payload.status, payload.body);
      } catch {
        sendJson(res, 500, {
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "课程素材读取失败",
          },
        });
      }
    }
  );

  app.get(
    "/api/courses/:courseId/assets/:assetId/download",
    async (req: Request, res: Response) => {
      const parsedCourseId = LegacyNumericIdSchema.safeParse(
        Number(req.params.courseId)
      );
      if (!parsedCourseId.success) {
        sendBadRequest(res, "课程 ID 不合法");
        return;
      }

      try {
        const auth = await authorizeRequest(req, "course_access:read");
        if (!auth.ok) {
          sendJson(res, auth.status, auth.body);
          return;
        }
        const payload = await getCourseAssetDownloadPayload(
          parsedCourseId.data,
          req.params.assetId,
          auth.session.user.id
        );
        if ("file" in payload) {
          sendCourseAssetFile(res, payload.file, "attachment");
          return;
        }
        sendJson(res, payload.status, payload.body);
      } catch {
        sendJson(res, 500, {
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "课程素材下载失败",
          },
        });
      }
    }
  );

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

  const assetViewMatch = url.pathname.match(
    /^\/api\/courses\/(\d+)\/assets\/([^/]+)\/view$/
  );
  if (assetViewMatch?.[1] && assetViewMatch[2]) {
    const parsedCourseId = LegacyNumericIdSchema.safeParse(
      Number(assetViewMatch[1])
    );
    if (!parsedCourseId.success) {
      sendBadRequest(res, "课程 ID 不合法");
      return true;
    }

    void getCourseAssetViewPayload(
      parsedCourseId.data,
      decodeURIComponent(assetViewMatch[2])
    )
      .then(payload => {
        if ("file" in payload) {
          sendCourseAssetFile(res, payload.file, "inline");
          return;
        }
        sendJson(res, payload.status, payload.body);
      })
      .catch(() =>
        sendJson(res, 500, {
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "课程素材读取失败",
          },
        })
      );
    return true;
  }

  const assetDownloadMatch = url.pathname.match(
    /^\/api\/courses\/(\d+)\/assets\/([^/]+)\/download$/
  );
  if (assetDownloadMatch?.[1] && assetDownloadMatch[2]) {
    const parsedCourseId = LegacyNumericIdSchema.safeParse(
      Number(assetDownloadMatch[1])
    );
    if (!parsedCourseId.success) {
      sendBadRequest(res, "课程 ID 不合法");
      return true;
    }

    void (async () => {
      const auth = await authorizeRequest(req, "course_access:read");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }
      const payload = await getCourseAssetDownloadPayload(
        parsedCourseId.data,
        decodeURIComponent(assetDownloadMatch[2]),
        auth.session.user.id
      );
      if ("file" in payload) {
        sendCourseAssetFile(res, payload.file, "attachment");
        return;
      }
      sendJson(res, payload.status, payload.body);
    })().catch(() =>
      sendJson(res, 500, {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "课程素材下载失败",
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
