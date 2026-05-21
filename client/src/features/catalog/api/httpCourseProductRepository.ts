import {
  ApiResponseSchema,
  CourseProductAssetBackfillMutationResultSchema,
  CourseProductAssetGovernanceActionResultSchema,
  CourseProductAssetGovernanceBatchDraftResultSchema,
  CourseProductAssetGovernanceBatchTaskListResultSchema,
  CourseProductAssetGovernanceBatchTaskMutationResultSchema,
  CourseProductAssetGovernanceHistoryResultSchema,
  CourseProductAssetGovernanceResultSchema,
  CourseProductAssetListResultSchema,
  CourseProductAssetMutationResultSchema,
  CourseProductContentMutationResultSchema,
  CourseProductContentQualityBatchResultSchema,
  CourseProductDetailContentSchema,
  CourseProductListResultSchema,
  CourseProductMutationResultSchema,
  type CourseProductContentMutationResult,
  type CourseProductContentQualityBatchResult,
  type CourseProductAssetBackfillMutationResult,
  type CourseProductAssetBackfillRequest,
  type CourseProductAssetComplianceUpdateRequest,
  type CourseProductAssetFileUploadRequest,
  type CourseProductAssetGovernanceActionRequest,
  type CourseProductAssetGovernanceActionResult,
  type CourseProductAssetGovernanceBatchDraftQuery,
  type CourseProductAssetGovernanceBatchDraftResult,
  type CourseProductAssetGovernanceBatchTaskCancelRequest,
  type CourseProductAssetGovernanceBatchTaskCreateRequest,
  type CourseProductAssetGovernanceBatchTaskListQuery,
  type CourseProductAssetGovernanceBatchTaskListResult,
  type CourseProductAssetGovernanceBatchTaskMutationResult,
  type CourseProductAssetGovernanceBatchTaskReviewRequest,
  type CourseProductAssetGovernanceHistoryQuery,
  type CourseProductAssetGovernanceHistoryResult,
  type CourseProductAssetGovernanceResult,
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
const CourseProductAssetBackfillResponseSchema = ApiResponseSchema(
  CourseProductAssetBackfillMutationResultSchema
);
const CourseProductAssetGovernanceResponseSchema = ApiResponseSchema(
  CourseProductAssetGovernanceResultSchema
);
const CourseProductAssetGovernanceActionResponseSchema = ApiResponseSchema(
  CourseProductAssetGovernanceActionResultSchema
);
const CourseProductAssetGovernanceHistoryResponseSchema = ApiResponseSchema(
  CourseProductAssetGovernanceHistoryResultSchema
);
const CourseProductAssetGovernanceBatchDraftResponseSchema = ApiResponseSchema(
  CourseProductAssetGovernanceBatchDraftResultSchema
);
const CourseProductAssetGovernanceBatchTaskListResponseSchema =
  ApiResponseSchema(CourseProductAssetGovernanceBatchTaskListResultSchema);
const CourseProductAssetGovernanceBatchTaskMutationResponseSchema =
  ApiResponseSchema(CourseProductAssetGovernanceBatchTaskMutationResultSchema);

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

export function parseCourseProductAssetBackfillResponse(
  payload: unknown
): CourseProductAssetBackfillMutationResult {
  const parsed = CourseProductAssetBackfillResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCourseProductAssetGovernanceResponse(
  payload: unknown
): CourseProductAssetGovernanceResult {
  const parsed = CourseProductAssetGovernanceResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCourseProductAssetGovernanceActionResponse(
  payload: unknown
): CourseProductAssetGovernanceActionResult {
  const parsed =
    CourseProductAssetGovernanceActionResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCourseProductAssetGovernanceHistoryResponse(
  payload: unknown
): CourseProductAssetGovernanceHistoryResult {
  const parsed =
    CourseProductAssetGovernanceHistoryResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCourseProductAssetGovernanceBatchDraftResponse(
  payload: unknown
): CourseProductAssetGovernanceBatchDraftResult {
  const parsed =
    CourseProductAssetGovernanceBatchDraftResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCourseProductAssetGovernanceBatchTaskListResponse(
  payload: unknown
): CourseProductAssetGovernanceBatchTaskListResult {
  const parsed =
    CourseProductAssetGovernanceBatchTaskListResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCourseProductAssetGovernanceBatchTaskMutationResponse(
  payload: unknown
): CourseProductAssetGovernanceBatchTaskMutationResult {
  const parsed =
    CourseProductAssetGovernanceBatchTaskMutationResponseSchema.parse(payload);
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

  const assetBackfillParsed =
    CourseProductAssetBackfillResponseSchema.safeParse(payload);
  if (assetBackfillParsed.success && !assetBackfillParsed.data.ok) {
    return assetBackfillParsed.data.error.message;
  }

  const assetGovernanceParsed =
    CourseProductAssetGovernanceResponseSchema.safeParse(payload);
  if (assetGovernanceParsed.success && !assetGovernanceParsed.data.ok) {
    return assetGovernanceParsed.data.error.message;
  }

  const assetGovernanceActionParsed =
    CourseProductAssetGovernanceActionResponseSchema.safeParse(payload);
  if (
    assetGovernanceActionParsed.success &&
    !assetGovernanceActionParsed.data.ok
  ) {
    return assetGovernanceActionParsed.data.error.message;
  }

  const assetGovernanceHistoryParsed =
    CourseProductAssetGovernanceHistoryResponseSchema.safeParse(payload);
  if (
    assetGovernanceHistoryParsed.success &&
    !assetGovernanceHistoryParsed.data.ok
  ) {
    return assetGovernanceHistoryParsed.data.error.message;
  }

  const assetGovernanceBatchDraftParsed =
    CourseProductAssetGovernanceBatchDraftResponseSchema.safeParse(payload);
  if (
    assetGovernanceBatchDraftParsed.success &&
    !assetGovernanceBatchDraftParsed.data.ok
  ) {
    return assetGovernanceBatchDraftParsed.data.error.message;
  }

  const assetGovernanceBatchTaskListParsed =
    CourseProductAssetGovernanceBatchTaskListResponseSchema.safeParse(payload);
  if (
    assetGovernanceBatchTaskListParsed.success &&
    !assetGovernanceBatchTaskListParsed.data.ok
  ) {
    return assetGovernanceBatchTaskListParsed.data.error.message;
  }

  const assetGovernanceBatchTaskMutationParsed =
    CourseProductAssetGovernanceBatchTaskMutationResponseSchema.safeParse(
      payload
    );
  if (
    assetGovernanceBatchTaskMutationParsed.success &&
    !assetGovernanceBatchTaskMutationParsed.data.ok
  ) {
    return assetGovernanceBatchTaskMutationParsed.data.error.message;
  }

  return fallback;
}

function queryStringFromRecord(query: Record<string, unknown>) {
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
      `${API_BASE}/course-products${queryStringFromRecord(query)}`,
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

  async loadCourseProductAssetBackfill(): Promise<CourseProductAssetBackfillMutationResult> {
    const response = await fetch(
      `${API_BASE}/course-products/assets/backfill`,
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
      throw new Error(extractErrorMessage(payload, "课程素材回填预检失败"));
    }
    return parseCourseProductAssetBackfillResponse(payload);
  },

  async loadCourseProductAssetGovernance(): Promise<CourseProductAssetGovernanceResult> {
    const response = await fetch(
      `${API_BASE}/course-products/assets/governance`,
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
      throw new Error(extractErrorMessage(payload, "课程素材治理读取失败"));
    }
    return parseCourseProductAssetGovernanceResponse(payload);
  },

  async loadCourseProductAssetGovernanceHistory(
    query: Partial<CourseProductAssetGovernanceHistoryQuery> = {}
  ): Promise<CourseProductAssetGovernanceHistoryResult> {
    const response = await fetch(
      `${API_BASE}/course-products/assets/governance/history${queryStringFromRecord(query)}`,
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
      throw new Error(extractErrorMessage(payload, "课程素材治理历史读取失败"));
    }
    return parseCourseProductAssetGovernanceHistoryResponse(payload);
  },

  async loadCourseProductAssetGovernanceBatchDraft(
    query: Partial<CourseProductAssetGovernanceBatchDraftQuery> = {}
  ): Promise<CourseProductAssetGovernanceBatchDraftResult> {
    const response = await fetch(
      `${API_BASE}/course-products/assets/governance/batch-draft${queryStringFromRecord(query)}`,
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
      throw new Error(
        extractErrorMessage(payload, "课程素材批量治理草稿读取失败")
      );
    }
    return parseCourseProductAssetGovernanceBatchDraftResponse(payload);
  },

  async loadCourseProductAssetGovernanceBatchTasks(
    query: Partial<CourseProductAssetGovernanceBatchTaskListQuery> = {}
  ): Promise<CourseProductAssetGovernanceBatchTaskListResult> {
    const response = await fetch(
      `${API_BASE}/course-products/assets/governance/batch-tasks${queryStringFromRecord(query)}`,
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
      throw new Error(
        extractErrorMessage(payload, "课程素材批量治理任务读取失败")
      );
    }
    return parseCourseProductAssetGovernanceBatchTaskListResponse(payload);
  },

  async createCourseProductAssetGovernanceBatchTask(
    request: CourseProductAssetGovernanceBatchTaskCreateRequest
  ): Promise<CourseProductAssetGovernanceBatchTaskMutationResult> {
    const response = await fetch(
      `${API_BASE}/course-products/assets/governance/batch-tasks`,
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
      throw new Error(
        extractErrorMessage(payload, "课程素材批量治理任务创建失败")
      );
    }
    return parseCourseProductAssetGovernanceBatchTaskMutationResponse(payload);
  },

  async cancelCourseProductAssetGovernanceBatchTask(
    taskId: string,
    request: CourseProductAssetGovernanceBatchTaskCancelRequest
  ): Promise<CourseProductAssetGovernanceBatchTaskMutationResult> {
    const response = await fetch(
      `${API_BASE}/course-products/assets/governance/batch-tasks/${encodeURIComponent(taskId)}/cancel`,
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
      throw new Error(
        extractErrorMessage(payload, "课程素材批量治理任务取消失败")
      );
    }
    return parseCourseProductAssetGovernanceBatchTaskMutationResponse(payload);
  },

  async reviewCourseProductAssetGovernanceBatchTask(
    taskId: string,
    request: CourseProductAssetGovernanceBatchTaskReviewRequest
  ): Promise<CourseProductAssetGovernanceBatchTaskMutationResult> {
    const response = await fetch(
      `${API_BASE}/course-products/assets/governance/batch-tasks/${encodeURIComponent(taskId)}/review`,
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
      throw new Error(
        extractErrorMessage(payload, "课程素材批量治理任务审批失败")
      );
    }
    return parseCourseProductAssetGovernanceBatchTaskMutationResponse(payload);
  },

  async runCourseProductAssetBackfill(
    request: CourseProductAssetBackfillRequest
  ): Promise<CourseProductAssetBackfillMutationResult> {
    const response = await fetch(
      `${API_BASE}/course-products/assets/backfill`,
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
      throw new Error(extractErrorMessage(payload, "课程素材回填写入失败"));
    }
    return parseCourseProductAssetBackfillResponse(payload);
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

  async applyCourseProductAssetGovernanceAction(
    productId: string,
    assetId: string,
    request: CourseProductAssetGovernanceActionRequest
  ): Promise<CourseProductAssetGovernanceActionResult> {
    const response = await fetch(
      `${API_BASE}/course-products/${encodeURIComponent(productId)}/assets/${encodeURIComponent(assetId)}/governance-actions`,
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
      throw new Error(extractErrorMessage(payload, "课程素材治理动作失败"));
    }
    return parseCourseProductAssetGovernanceActionResponse(payload);
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
