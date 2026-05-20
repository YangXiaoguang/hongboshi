import {
  ApiResponseSchema,
  CourseProductAssetListResultSchema,
  CourseProductAssetMutationResultSchema,
  CourseProductContentMutationResultSchema,
  CourseProductContentQualityBatchResultSchema,
  CourseProductDetailContentSchema,
  CourseProductListResultSchema,
  CourseProductMutationResultSchema,
  type CourseProductContentMutationResult,
  type CourseProductContentQualityBatchResult,
  type CourseProductAssetComplianceUpdateRequest,
  type CourseProductAssetFileUploadRequest,
  type CourseProductAssetListResult,
  type CourseProductAssetMutationResult,
  type CourseProductAssetUploadRequest,
  type CourseProductContentUpdateRequest,
  type CourseProductDetailContent,
  type CourseProductMutationResult,
  type CourseProductBasicInfoUpdateRequest,
  type CourseProductPriceUpdateRequest,
  type CourseProductListQuery,
  type CourseProductListResult,
  type CourseProductReviewActionRequest,
  type CourseProductStatusUpdateRequest,
} from "@shared/domain";

const CourseProductListResponseSchema = ApiResponseSchema(
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

const API_BASE = "/api/catalog/admin";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("课程商品服务返回了无法解析的数据");
  }
}

export function parseCourseProductListResponse(
  payload: unknown
): CourseProductListResult {
  const parsed = CourseProductListResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCourseProductMutationResponse(
  payload: unknown
): CourseProductMutationResult {
  const parsed = CourseProductMutationResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCourseProductContentResponse(
  payload: unknown
): CourseProductDetailContent {
  const parsed = CourseProductContentResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCourseProductContentQualityResponse(
  payload: unknown
): CourseProductContentQualityBatchResult {
  const parsed = CourseProductContentQualityResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCourseProductContentMutationResponse(
  payload: unknown
): CourseProductContentMutationResult {
  const parsed = CourseProductContentMutationResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCourseProductAssetListResponse(
  payload: unknown
): CourseProductAssetListResult {
  const parsed = CourseProductAssetListResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCourseProductAssetMutationResponse(
  payload: unknown
): CourseProductAssetMutationResult {
  const parsed = CourseProductAssetMutationResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

function extractErrorMessage(payload: unknown, fallback: string) {
  const listParsed = CourseProductListResponseSchema.safeParse(payload);
  if (listParsed.success && !listParsed.data.ok) {
    return listParsed.data.error.message;
  }

  const mutationParsed = CourseProductMutationResponseSchema.safeParse(payload);
  if (mutationParsed.success && !mutationParsed.data.ok) {
    return mutationParsed.data.error.message;
  }

  const contentParsed = CourseProductContentResponseSchema.safeParse(payload);
  if (contentParsed.success && !contentParsed.data.ok) {
    return contentParsed.data.error.message;
  }

  const contentQualityParsed =
    CourseProductContentQualityResponseSchema.safeParse(payload);
  if (contentQualityParsed.success && !contentQualityParsed.data.ok) {
    return contentQualityParsed.data.error.message;
  }

  const contentMutationParsed =
    CourseProductContentMutationResponseSchema.safeParse(payload);
  if (contentMutationParsed.success && !contentMutationParsed.data.ok) {
    return contentMutationParsed.data.error.message;
  }

  const assetListParsed =
    CourseProductAssetListResponseSchema.safeParse(payload);
  if (assetListParsed.success && !assetListParsed.data.ok) {
    return assetListParsed.data.error.message;
  }

  const assetMutationParsed =
    CourseProductAssetMutationResponseSchema.safeParse(payload);
  if (assetMutationParsed.success && !assetMutationParsed.data.ok) {
    return assetMutationParsed.data.error.message;
  }

  return fallback;
}

function queryStringFromCourseProductQuery(
  query: Partial<CourseProductListQuery>
) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export const httpCourseProductRepository = {
  async loadCourseProducts(
    query: Partial<CourseProductListQuery> = {}
  ): Promise<CourseProductListResult> {
    const response = await fetch(
      `${API_BASE}/course-products${queryStringFromCourseProductQuery(query)}`,
      {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
        credentials: "same-origin",
      }
    );
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "课程商品列表暂时不可用"));
    }
    return parseCourseProductListResponse(payload);
  },

  async updateCourseProductStatus(
    productId: string,
    request: CourseProductStatusUpdateRequest
  ): Promise<CourseProductMutationResult> {
    return requestCourseProductMutation(
      `${API_BASE}/course-products/${encodeURIComponent(productId)}/status`,
      request,
      "课程商品状态更新失败"
    );
  },

  async updateCourseProductPrice(
    productId: string,
    request: CourseProductPriceUpdateRequest
  ): Promise<CourseProductMutationResult> {
    return requestCourseProductMutation(
      `${API_BASE}/course-products/${encodeURIComponent(productId)}/price`,
      request,
      "课程商品价格更新失败"
    );
  },

  async updateCourseProductBasicInfo(
    productId: string,
    request: CourseProductBasicInfoUpdateRequest
  ): Promise<CourseProductMutationResult> {
    return requestCourseProductMutation(
      `${API_BASE}/course-products/${encodeURIComponent(productId)}/info`,
      request,
      "课程商品基础信息更新失败"
    );
  },

  async updateCourseProductReview(
    productId: string,
    request: CourseProductReviewActionRequest
  ): Promise<CourseProductMutationResult> {
    return requestCourseProductMutation(
      `${API_BASE}/course-products/${encodeURIComponent(productId)}/review`,
      request,
      "课程商品审核状态更新失败"
    );
  },

  async loadCourseProductContent(
    productId: string
  ): Promise<CourseProductDetailContent> {
    const response = await fetch(
      `${API_BASE}/course-products/${encodeURIComponent(productId)}/content`,
      {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
        credentials: "same-origin",
      }
    );
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "课程商品详情内容读取失败"));
    }
    return parseCourseProductContentResponse(payload);
  },

  async loadCourseProductContentQuality(): Promise<CourseProductContentQualityBatchResult> {
    const response = await fetch(
      `${API_BASE}/course-products/content-quality`,
      {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
        credentials: "same-origin",
      }
    );
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "课程商品内容校验失败"));
    }
    return parseCourseProductContentQualityResponse(payload);
  },

  async updateCourseProductContent(
    productId: string,
    request: CourseProductContentUpdateRequest
  ): Promise<CourseProductContentMutationResult> {
    const response = await fetch(
      `${API_BASE}/course-products/${encodeURIComponent(productId)}/content`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify(request),
      }
    );
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "课程商品详情内容更新失败"));
    }
    return parseCourseProductContentMutationResponse(payload);
  },

  async loadCourseProductAssets(
    productId: string
  ): Promise<CourseProductAssetListResult> {
    const response = await fetch(
      `${API_BASE}/course-products/${encodeURIComponent(productId)}/assets`,
      {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
        credentials: "same-origin",
      }
    );
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "课程素材资产读取失败"));
    }
    return parseCourseProductAssetListResponse(payload);
  },

  async uploadCourseProductAsset(
    productId: string,
    request: CourseProductAssetUploadRequest
  ): Promise<CourseProductAssetMutationResult> {
    const response = await fetch(
      `${API_BASE}/course-products/${encodeURIComponent(productId)}/assets`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify(request),
      }
    );
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "课程素材上传失败"));
    }
    return parseCourseProductAssetMutationResponse(payload);
  },

  async uploadCourseProductAssetFile(
    productId: string,
    request: Omit<CourseProductAssetFileUploadRequest, "fileBase64"> & {
      file: File;
    }
  ): Promise<CourseProductAssetMutationResult> {
    const fileBase64 = await fileToBase64(request.file);
    const response = await fetch(
      `${API_BASE}/course-products/${encodeURIComponent(productId)}/assets/files`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify({
          kind: request.kind,
          title: request.title,
          fileName: request.fileName,
          mimeType: request.mimeType,
          sizeBytes: request.sizeBytes,
          fileBase64,
          usage: request.usage,
          chapterId: request.chapterId,
          altText: request.altText,
          note: request.note,
          reason: request.reason,
        } satisfies CourseProductAssetFileUploadRequest),
      }
    );
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "课程素材文件上传失败"));
    }
    return parseCourseProductAssetMutationResponse(payload);
  },

  async updateCourseProductAssetCompliance(
    productId: string,
    assetId: string,
    request: CourseProductAssetComplianceUpdateRequest
  ): Promise<CourseProductAssetMutationResult> {
    const response = await fetch(
      `${API_BASE}/course-products/${encodeURIComponent(productId)}/assets/${encodeURIComponent(assetId)}/compliance`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify(request),
      }
    );
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "课程素材合规处理失败"));
    }
    return parseCourseProductAssetMutationResponse(payload);
  },
};

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("素材文件读取失败"));
        return;
      }
      const encoded = reader.result.split(",", 2)[1] ?? "";
      resolve(encoded);
    };
    reader.onerror = () => reject(new Error("素材文件读取失败"));
    reader.readAsDataURL(file);
  });
}

async function requestCourseProductMutation(
  url: string,
  body: unknown,
  fallback: string
) {
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    cache: "no-store",
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, fallback));
  }
  return parseCourseProductMutationResponse(payload);
}
