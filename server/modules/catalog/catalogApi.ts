import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { z } from "zod";
import {
  ApiResponseSchema,
  COURSE_CATALOG_PERMISSIONS,
  CourseProductAssetComplianceUpdateRequestSchema,
  CourseProductAssetFileUploadRequestSchema,
  CourseProductAssetListResultSchema,
  CourseProductAssetMutationResultSchema,
  CourseProductAssetUploadRequestSchema,
  CourseProductBasicInfoUpdateRequestSchema,
  CourseProductContentMutationResultSchema,
  CourseProductContentQualityBatchResultSchema,
  CourseProductContentUpdateRequestSchema,
  CourseProductDetailContentSchema,
  CourseProductMutationResultSchema,
  CourseProductPriceUpdateRequestSchema,
  CourseProductListQuerySchema,
  CourseProductListResultSchema,
  CourseProductReviewActionRequestSchema,
  CourseProductStatusUpdateRequestSchema,
  evaluateCourseProductContentQuality,
  userCan,
  type AuthPermission,
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
import {
  getCourseProductContentForProduct,
  getCourseProductContentStore,
  listCourseProductContentQuality,
  updateCourseProductContent,
  type CourseProductContentStore,
} from "./courseProductContentStore";
import {
  getCourseProductAssetStore,
  getCourseProductAssetFileStorage,
  getCourseProductAssetStoredFile,
  listCourseProductAssets,
  updateCourseProductAssetCompliance,
  uploadCourseProductAssetFile,
  uploadCourseProductAsset,
  type CourseProductAssetFileStorage,
  type CourseProductAssetStore,
} from "./courseProductAssetStore";

const CourseProductAdminListResponseSchema = ApiResponseSchema(
  CourseProductListResultSchema
);
const CourseProductMutationResponseSchema = ApiResponseSchema(
  CourseProductMutationResultSchema
);
const CourseProductContentResponseSchema = ApiResponseSchema(
  CourseProductDetailContentSchema
);
const CourseProductContentQualityResponseSchema = ApiResponseSchema(
  CourseProductContentQualityBatchResultSchema
);
const CourseProductContentMutationResponseSchema = ApiResponseSchema(
  CourseProductContentMutationResultSchema
);
const CourseProductAssetListResponseSchema = ApiResponseSchema(
  CourseProductAssetListResultSchema
);
const CourseProductAssetMutationResponseSchema = ApiResponseSchema(
  CourseProductAssetMutationResultSchema
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
  | z.infer<typeof CourseProductMutationResponseSchema>
  | z.infer<typeof CourseProductContentResponseSchema>
  | z.infer<typeof CourseProductContentQualityResponseSchema>
  | z.infer<typeof CourseProductContentMutationResponseSchema>
  | z.infer<typeof CourseProductAssetListResponseSchema>
  | z.infer<typeof CourseProductAssetMutationResponseSchema>;
type CatalogApiPayload = {
  status: number;
  body: CatalogApiBody;
};
type CatalogAssetFilePayload =
  | {
      status: number;
      body: CatalogApiBody;
    }
  | {
      status: 200;
      file: {
        bytes: Buffer;
        fileName: string;
        mimeType: string;
        sizeBytes: number;
      };
    };

export const catalogOperationPermissions = {
  list: COURSE_CATALOG_PERMISSIONS.read,
  contentRead: COURSE_CATALOG_PERMISSIONS.read,
  contentQualityRead: COURSE_CATALOG_PERMISSIONS.read,
  assetRead: COURSE_CATALOG_PERMISSIONS.read,
  assetUpload: COURSE_CATALOG_PERMISSIONS.edit,
  assetReview: COURSE_CATALOG_PERMISSIONS.review,
  basicInfoUpdate: COURSE_CATALOG_PERMISSIONS.edit,
  contentUpdate: COURSE_CATALOG_PERMISSIONS.edit,
  reviewUpdate: COURSE_CATALOG_PERMISSIONS.review,
  statusUpdate: COURSE_CATALOG_PERMISSIONS.publish,
  priceUpdate: COURSE_CATALOG_PERMISSIONS.price,
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

function sendAssetFile(
  res: Response | ServerResponse,
  payload: Extract<CatalogAssetFilePayload, { status: 200; file: unknown }>
) {
  res.statusCode = 200;
  res.setHeader("Content-Type", payload.file.mimeType);
  res.setHeader("Content-Length", String(payload.file.sizeBytes));
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(payload.file.fileName)}"`
  );
  res.end(payload.file.bytes);
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
  const denied = denyUnauthorizedActor(
    actor,
    catalogOperationPermissions.list,
    "请先登录后查看课程商品"
  );
  if (denied) return denied;

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
  const denied = denyUnauthorizedActor(
    actor,
    catalogOperationPermissions.statusUpdate
  );
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
  const denied = denyUnauthorizedActor(
    actor,
    catalogOperationPermissions.priceUpdate
  );
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
  const denied = denyUnauthorizedActor(
    actor,
    catalogOperationPermissions.basicInfoUpdate
  );
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
  now = new Date().toISOString(),
  contentStore: CourseProductContentStore = getCourseProductContentStore()
): Promise<CatalogApiPayload> {
  const denied = denyUnauthorizedActor(
    actor,
    catalogOperationPermissions.reviewUpdate
  );
  if (denied) return denied;

  const parsed = CourseProductReviewActionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "课程商品审核参数不合法"),
    };
  }

  try {
    if (parsed.data.action === "submit") {
      const content = await getCourseProductContentForProduct({
        productId,
        productStore: store,
        contentStore,
        now,
      });
      const quality = evaluateCourseProductContentQuality(content);
      if (!quality.ready) {
        throw new Error("COURSE_PRODUCT_CONTENT_QUALITY_BLOCKED");
      }
    }

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

export async function getCourseProductContentPayload(
  actor: CatalogOperationsActor | null | undefined,
  productId: string,
  productStore: CourseProductStore = getCourseProductStore(),
  contentStore: CourseProductContentStore = getCourseProductContentStore()
): Promise<CatalogApiPayload> {
  const denied = denyUnauthorizedActor(
    actor,
    catalogOperationPermissions.contentRead
  );
  if (denied) return denied;

  try {
    return {
      status: 200,
      body: CourseProductContentResponseSchema.parse({
        ok: true,
        data: await getCourseProductContentForProduct({
          productId,
          productStore,
          contentStore,
        }),
      }),
    };
  } catch (err) {
    return courseProductActionFailure(err, "课程商品详情内容读取失败");
  }
}

export async function getCourseProductContentQualityPayload(
  actor: CatalogOperationsActor | null | undefined,
  productStore: CourseProductStore = getCourseProductStore(),
  contentStore: CourseProductContentStore = getCourseProductContentStore()
): Promise<CatalogApiPayload> {
  const denied = denyUnauthorizedActor(
    actor,
    catalogOperationPermissions.contentQualityRead
  );
  if (denied) return denied;

  try {
    return {
      status: 200,
      body: CourseProductContentQualityResponseSchema.parse({
        ok: true,
        data: await listCourseProductContentQuality({
          productStore,
          contentStore,
        }),
      }),
    };
  } catch (err) {
    return courseProductActionFailure(err, "课程商品内容校验失败");
  }
}

export async function getCourseProductAssetsPayload(
  actor: CatalogOperationsActor | null | undefined,
  productId: string,
  productStore: CourseProductStore = getCourseProductStore(),
  assetStore: CourseProductAssetStore = getCourseProductAssetStore()
): Promise<CatalogApiPayload> {
  const denied = denyUnauthorizedActor(
    actor,
    catalogOperationPermissions.assetRead
  );
  if (denied) return denied;

  try {
    return {
      status: 200,
      body: CourseProductAssetListResponseSchema.parse({
        ok: true,
        data: await listCourseProductAssets({
          productId,
          productStore,
          assetStore,
        }),
      }),
    };
  } catch (err) {
    return courseProductActionFailure(err, "课程素材资产读取失败");
  }
}

export async function uploadCourseProductAssetPayload(
  actor: CatalogOperationsActor | null | undefined,
  productId: string,
  body: unknown,
  productStore: CourseProductStore = getCourseProductStore(),
  assetStore: CourseProductAssetStore = getCourseProductAssetStore(),
  now = new Date().toISOString()
): Promise<CatalogApiPayload> {
  const denied = denyUnauthorizedActor(
    actor,
    catalogOperationPermissions.assetUpload
  );
  if (denied) return denied;

  const parsed = CourseProductAssetUploadRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "课程素材上传参数不合法"),
    };
  }

  try {
    return {
      status: 200,
      body: CourseProductAssetMutationResponseSchema.parse({
        ok: true,
        data: await uploadCourseProductAsset({
          productId,
          request: parsed.data,
          actorId: actor!.id,
          productStore,
          assetStore,
          now,
        }),
      }),
    };
  } catch (err) {
    return courseProductActionFailure(err, "课程素材上传失败");
  }
}

export async function uploadCourseProductAssetFilePayload(
  actor: CatalogOperationsActor | null | undefined,
  productId: string,
  body: unknown,
  productStore: CourseProductStore = getCourseProductStore(),
  assetStore: CourseProductAssetStore = getCourseProductAssetStore(),
  fileStorage: CourseProductAssetFileStorage = getCourseProductAssetFileStorage(),
  now = new Date().toISOString()
): Promise<CatalogApiPayload> {
  const denied = denyUnauthorizedActor(
    actor,
    catalogOperationPermissions.assetUpload
  );
  if (denied) return denied;

  const parsed = CourseProductAssetFileUploadRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "课程素材文件上传参数不合法"),
    };
  }

  try {
    return {
      status: 200,
      body: CourseProductAssetMutationResponseSchema.parse({
        ok: true,
        data: await uploadCourseProductAssetFile({
          productId,
          request: parsed.data,
          actorId: actor!.id,
          productStore,
          assetStore,
          fileStorage,
          now,
        }),
      }),
    };
  } catch (err) {
    return courseProductActionFailure(err, "课程素材文件上传失败");
  }
}

export async function getCourseProductAssetDownloadPayload(
  actor: CatalogOperationsActor | null | undefined,
  productId: string,
  assetId: string,
  productStore: CourseProductStore = getCourseProductStore(),
  assetStore: CourseProductAssetStore = getCourseProductAssetStore(),
  fileStorage: CourseProductAssetFileStorage = getCourseProductAssetFileStorage()
): Promise<CatalogAssetFilePayload> {
  const denied = denyUnauthorizedActor(
    actor,
    catalogOperationPermissions.assetRead
  );
  if (denied) return denied;

  const product = await productStore.getProduct(productId);
  if (!product) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "课程商品不存在"),
    };
  }

  try {
    const result = await getCourseProductAssetStoredFile({
      productId,
      assetId,
      assetStore,
      fileStorage,
    });
    return {
      status: 200,
      file: result.file,
    };
  } catch (err) {
    return courseProductActionFailure(err, "课程素材文件读取失败");
  }
}

export async function updateCourseProductAssetCompliancePayload(
  actor: CatalogOperationsActor | null | undefined,
  productId: string,
  assetId: string,
  body: unknown,
  productStore: CourseProductStore = getCourseProductStore(),
  assetStore: CourseProductAssetStore = getCourseProductAssetStore(),
  now = new Date().toISOString()
): Promise<CatalogApiPayload> {
  const denied = denyUnauthorizedActor(
    actor,
    catalogOperationPermissions.assetReview
  );
  if (denied) return denied;

  const parsed =
    CourseProductAssetComplianceUpdateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "课程素材合规处理参数不合法"),
    };
  }

  try {
    return {
      status: 200,
      body: CourseProductAssetMutationResponseSchema.parse({
        ok: true,
        data: await updateCourseProductAssetCompliance({
          productId,
          assetId,
          request: parsed.data,
          actorId: actor!.id,
          productStore,
          assetStore,
          now,
        }),
      }),
    };
  } catch (err) {
    return courseProductActionFailure(err, "课程素材合规处理失败");
  }
}

export async function updateCourseProductContentPayload(
  actor: CatalogOperationsActor | null | undefined,
  productId: string,
  body: unknown,
  productStore: CourseProductStore = getCourseProductStore(),
  contentStore: CourseProductContentStore = getCourseProductContentStore(),
  now = new Date().toISOString()
): Promise<CatalogApiPayload> {
  const denied = denyUnauthorizedActor(
    actor,
    catalogOperationPermissions.contentUpdate
  );
  if (denied) return denied;

  const parsed = CourseProductContentUpdateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "课程商品详情内容参数不合法"),
    };
  }

  try {
    return {
      status: 200,
      body: CourseProductContentMutationResponseSchema.parse({
        ok: true,
        data: await updateCourseProductContent({
          productId,
          request: parsed.data,
          actorId: actor!.id,
          productStore,
          contentStore,
          now,
        }),
      }),
    };
  } catch (err) {
    return courseProductActionFailure(err, "课程商品详情内容更新失败");
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

  app.get(
    "/api/catalog/admin/course-products/:productId/content",
    async (req, res) => {
      try {
        const session = await getLoginSessionFromRequest(req);
        const payload = await getCourseProductContentPayload(
          session?.user,
          req.params.productId
        );
        sendJson(res, payload.status, payload.body);
      } catch {
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "课程商品详情内容读取失败")
        );
      }
    }
  );

  app.patch(
    "/api/catalog/admin/course-products/:productId/content",
    async (req, res) => {
      try {
        const session = await getLoginSessionFromRequest(req);
        const payload = await updateCourseProductContentPayload(
          session?.user,
          req.params.productId,
          req.body
        );
        sendJson(res, payload.status, payload.body);
      } catch {
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "课程商品详情内容更新失败")
        );
      }
    }
  );

  app.get(
    "/api/catalog/admin/course-products/content-quality",
    async (req, res) => {
      try {
        const session = await getLoginSessionFromRequest(req);
        const payload = await getCourseProductContentQualityPayload(
          session?.user
        );
        sendJson(res, payload.status, payload.body);
      } catch {
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "课程商品内容校验失败")
        );
      }
    }
  );

  app.get(
    "/api/catalog/admin/course-products/:productId/assets",
    async (req, res) => {
      try {
        const session = await getLoginSessionFromRequest(req);
        const payload = await getCourseProductAssetsPayload(
          session?.user,
          req.params.productId
        );
        sendJson(res, payload.status, payload.body);
      } catch {
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "课程素材资产读取失败")
        );
      }
    }
  );

  app.post(
    "/api/catalog/admin/course-products/:productId/assets",
    async (req, res) => {
      try {
        const session = await getLoginSessionFromRequest(req);
        const payload = await uploadCourseProductAssetPayload(
          session?.user,
          req.params.productId,
          req.body
        );
        sendJson(res, payload.status, payload.body);
      } catch {
        sendJson(res, 500, errorPayload("INTERNAL_ERROR", "课程素材上传失败"));
      }
    }
  );

  app.post(
    "/api/catalog/admin/course-products/:productId/assets/files",
    async (req, res) => {
      try {
        const session = await getLoginSessionFromRequest(req);
        const payload = await uploadCourseProductAssetFilePayload(
          session?.user,
          req.params.productId,
          req.body
        );
        sendJson(res, payload.status, payload.body);
      } catch {
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "课程素材文件上传失败")
        );
      }
    }
  );

  app.get(
    "/api/catalog/admin/course-products/:productId/assets/:assetId/download",
    async (req, res) => {
      try {
        const session = await getLoginSessionFromRequest(req);
        const payload = await getCourseProductAssetDownloadPayload(
          session?.user,
          req.params.productId,
          req.params.assetId
        );
        if ("file" in payload) {
          sendAssetFile(res, payload);
          return;
        }
        sendJson(res, payload.status, payload.body);
      } catch {
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "课程素材文件读取失败")
        );
      }
    }
  );

  app.patch(
    "/api/catalog/admin/course-products/:productId/assets/:assetId/compliance",
    async (req, res) => {
      try {
        const session = await getLoginSessionFromRequest(req);
        const payload = await updateCourseProductAssetCompliancePayload(
          session?.user,
          req.params.productId,
          req.params.assetId,
          req.body
        );
        sendJson(res, payload.status, payload.body);
      } catch {
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "课程素材合规处理失败")
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

  if (url.pathname === "/api/catalog/admin/course-products/content-quality") {
    if (req.method !== "GET") {
      sendJson(res, 405, errorPayload("BAD_REQUEST", "接口仅支持 GET 请求"));
      return true;
    }

    void getLoginSessionFromRequest(req)
      .then(session => getCourseProductContentQualityPayload(session?.user))
      .then(payload => sendJson(res, payload.status, payload.body))
      .catch(() =>
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "课程商品内容校验失败")
        )
      );

    return true;
  }

  const assetListMatch = url.pathname.match(
    /^\/api\/catalog\/admin\/course-products\/([^/]+)\/assets$/
  );
  if (assetListMatch?.[1]) {
    if (req.method !== "GET" && req.method !== "POST") {
      sendJson(
        res,
        405,
        errorPayload("BAD_REQUEST", "接口仅支持 GET/POST 请求")
      );
      return true;
    }

    if (req.method === "GET") {
      void getLoginSessionFromRequest(req)
        .then(session =>
          getCourseProductAssetsPayload(
            session?.user,
            decodeURIComponent(assetListMatch[1])
          )
        )
        .then(payload => sendJson(res, payload.status, payload.body))
        .catch(() =>
          sendJson(
            res,
            500,
            errorPayload("INTERNAL_ERROR", "课程素材资产读取失败")
          )
        );
      return true;
    }

    void readRequestBody(req)
      .then(async body => {
        const session = await getLoginSessionFromRequest(req);
        const payload = await uploadCourseProductAssetPayload(
          session?.user,
          decodeURIComponent(assetListMatch[1]),
          body
        );
        sendJson(res, payload.status, payload.body);
      })
      .catch(() =>
        sendJson(res, 500, errorPayload("INTERNAL_ERROR", "课程素材上传失败"))
      );
    return true;
  }

  const assetComplianceMatch = url.pathname.match(
    /^\/api\/catalog\/admin\/course-products\/([^/]+)\/assets\/([^/]+)\/compliance$/
  );
  const assetFileUploadMatch = url.pathname.match(
    /^\/api\/catalog\/admin\/course-products\/([^/]+)\/assets\/files$/
  );
  if (assetFileUploadMatch?.[1]) {
    if (req.method !== "POST") {
      sendJson(res, 405, errorPayload("BAD_REQUEST", "接口仅支持 POST 请求"));
      return true;
    }

    void readRequestBody(req)
      .then(async body => {
        const session = await getLoginSessionFromRequest(req);
        const payload = await uploadCourseProductAssetFilePayload(
          session?.user,
          decodeURIComponent(assetFileUploadMatch[1]),
          body
        );
        sendJson(res, payload.status, payload.body);
      })
      .catch(() =>
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "课程素材文件上传失败")
        )
      );
    return true;
  }

  const assetDownloadMatch = url.pathname.match(
    /^\/api\/catalog\/admin\/course-products\/([^/]+)\/assets\/([^/]+)\/download$/
  );
  if (assetDownloadMatch?.[1] && assetDownloadMatch[2]) {
    if (req.method !== "GET") {
      sendJson(res, 405, errorPayload("BAD_REQUEST", "接口仅支持 GET 请求"));
      return true;
    }

    void getLoginSessionFromRequest(req)
      .then(session =>
        getCourseProductAssetDownloadPayload(
          session?.user,
          decodeURIComponent(assetDownloadMatch[1]),
          decodeURIComponent(assetDownloadMatch[2])
        )
      )
      .then(payload => {
        if ("file" in payload) {
          sendAssetFile(res, payload);
          return;
        }
        sendJson(res, payload.status, payload.body);
      })
      .catch(() =>
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "课程素材文件读取失败")
        )
      );
    return true;
  }

  if (assetComplianceMatch?.[1] && assetComplianceMatch[2]) {
    if (req.method !== "PATCH") {
      sendJson(res, 405, errorPayload("BAD_REQUEST", "接口仅支持 PATCH 请求"));
      return true;
    }

    void readRequestBody(req)
      .then(async body => {
        const session = await getLoginSessionFromRequest(req);
        const payload = await updateCourseProductAssetCompliancePayload(
          session?.user,
          decodeURIComponent(assetComplianceMatch[1]),
          decodeURIComponent(assetComplianceMatch[2]),
          body
        );
        sendJson(res, payload.status, payload.body);
      })
      .catch(() =>
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "课程素材合规处理失败")
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

  const contentMatch = url.pathname.match(
    /^\/api\/catalog\/admin\/course-products\/([^/]+)\/content$/
  );
  if (contentMatch?.[1]) {
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
          getCourseProductContentPayload(
            session?.user,
            decodeURIComponent(contentMatch[1])
          )
        )
        .then(payload => sendJson(res, payload.status, payload.body))
        .catch(() =>
          sendJson(
            res,
            500,
            errorPayload("INTERNAL_ERROR", "课程商品详情内容读取失败")
          )
        );
      return true;
    }

    void readRequestBody(req)
      .then(async body => {
        const session = await getLoginSessionFromRequest(req);
        const payload = await updateCourseProductContentPayload(
          session?.user,
          decodeURIComponent(contentMatch[1]),
          body
        );
        sendJson(res, payload.status, payload.body);
      })
      .catch(() =>
        sendJson(
          res,
          500,
          errorPayload("INTERNAL_ERROR", "课程商品详情内容更新失败")
        )
      );
    return true;
  }

  sendJson(res, 404, errorPayload("NOT_FOUND", "课程商品接口不存在"));
  return true;
}

function denyUnauthorizedActor(
  actor: CatalogOperationsActor | null | undefined,
  permission: AuthPermission,
  unauthorizedMessage = "请先登录后管理课程商品"
): CatalogApiPayload | undefined {
  if (!actor) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", unauthorizedMessage),
    };
  }

  if (!userCan(actor, permission)) {
    return {
      status: 403,
      body: errorPayload("FORBIDDEN", "当前账号暂无课程商品操作权限"),
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
    err.message === "COURSE_PRODUCT_ASSET_NOT_FOUND"
  ) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "课程素材不存在"),
    };
  }

  if (
    err instanceof Error &&
    err.message === "COURSE_PRODUCT_ASSET_FILE_NOT_FOUND"
  ) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "课程素材文件不存在"),
    };
  }

  if (
    err instanceof Error &&
    err.message === "COURSE_PRODUCT_ASSET_NOT_APPROVED"
  ) {
    return {
      status: 403,
      body: errorPayload("FORBIDDEN", "课程素材尚未通过合规确认"),
    };
  }

  if (
    err instanceof Error &&
    err.message === "COURSE_PRODUCT_ASSET_DOWNLOAD_DISABLED"
  ) {
    return {
      status: 403,
      body: errorPayload("FORBIDDEN", "课程素材暂未开启下载"),
    };
  }

  if (
    err instanceof Error &&
    (err.message === "COURSE_PRODUCT_ASSET_FILE_TOO_LARGE" ||
      err.message === "COURSE_PRODUCT_ASSET_SIZE_MISMATCH" ||
      err.message === "COURSE_PRODUCT_ASSET_FILE_INVALID")
  ) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "课程素材文件参数不合法"),
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
    err.message === "COURSE_PRODUCT_CONTENT_UNCHANGED"
  ) {
    return {
      status: 409,
      body: errorPayload("CONFLICT", "课程商品详情内容没有变化"),
    };
  }

  if (
    err instanceof Error &&
    err.message === "COURSE_PRODUCT_CONTENT_QUALITY_BLOCKED"
  ) {
    return {
      status: 409,
      body: errorPayload("CONFLICT", "课程详情内容校验未通过，暂不能提交审核"),
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
