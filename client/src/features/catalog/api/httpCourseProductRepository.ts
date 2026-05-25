import {
  ApiResponseSchema,
  CourseProductAssetBackfillMutationResultSchema,
  CourseProductAssetGovernanceActionResultSchema,
  CourseProductAssetGovernanceBatchActionPlanResultSchema,
  CourseProductAssetGovernanceBatchDraftResultSchema,
  CourseProductAssetGovernanceBatchTaskExecutionDetailResultSchema,
  CourseProductAssetGovernanceBatchTaskExecutionResultSchema,
  CourseProductAssetGovernanceBatchTaskExecutionPlanResultSchema,
  CourseProductAssetGovernanceBatchTaskListResultSchema,
  CourseProductAssetGovernanceBatchTaskMutationResultSchema,
  CourseProductAssetGovernanceBatchTaskQueueObservationResultSchema,
  CourseProductAssetGovernanceHistoryResultSchema,
  CourseProductAssetGovernanceResultSchema,
  CourseProductAssetListResultSchema,
  CourseProductAssetMutationResultSchema,
  CourseProductContentMutationResultSchema,
  CourseProductContentQualityBatchResultSchema,
  CourseProductDetailTemplateListResultSchema,
  CourseProductDetailTemplateMutationResultSchema,
  CourseProductDetailContentSchema,
  CourseProductLearningMaterialOperationsReportSchema,
  CourseProductListResultSchema,
  CourseProductMutationResultSchema,
  CourseProductPublishQueueBatchTaskListResultSchema,
  CourseProductPublishQueueBatchTaskMutationResultSchema,
  CourseProductPublishQueueBatchTaskPreflightResultSchema,
  CourseProductPublishQueueResultSchema,
  type CourseProductContentMutationResult,
  type CourseProductContentQualityBatchResult,
  type CourseProductAssetBackfillMutationResult,
  type CourseProductAssetBackfillRequest,
  type CourseProductAssetComplianceUpdateRequest,
  type CourseProductAssetFileUploadRequest,
  type CourseProductAssetGovernanceActionRequest,
  type CourseProductAssetGovernanceActionResult,
  type CourseProductAssetGovernanceBatchActionPlanQuery,
  type CourseProductAssetGovernanceBatchActionPlanResult,
  type CourseProductAssetGovernanceBatchDraftQuery,
  type CourseProductAssetGovernanceBatchDraftResult,
  type CourseProductAssetGovernanceBatchTaskCancelRequest,
  type CourseProductAssetGovernanceBatchTaskCreateRequest,
  type CourseProductAssetGovernanceBatchTaskExecuteRequest,
  type CourseProductAssetGovernanceBatchTaskExecutionDetailResult,
  type CourseProductAssetGovernanceBatchTaskExecutionResult,
  type CourseProductAssetGovernanceBatchTaskExecutionPlanResult,
  type CourseProductAssetGovernanceBatchTaskListQuery,
  type CourseProductAssetGovernanceBatchTaskListResult,
  type CourseProductAssetGovernanceBatchTaskMutationResult,
  type CourseProductAssetGovernanceBatchTaskQueueObservationQuery,
  type CourseProductAssetGovernanceBatchTaskQueueObservationResult,
  type CourseProductAssetGovernanceBatchTaskReviewRequest,
  type CourseProductAssetGovernanceHistoryQuery,
  type CourseProductAssetGovernanceHistoryResult,
  type CourseProductAssetGovernanceResult,
  type CourseProductAssetListResult,
  type CourseProductAssetMutationResult,
  type CourseProductAssetUploadRequest,
  type CourseProductContentUpdateRequest,
  type CourseProductCreateRequest,
  type CourseProductDetailTemplateApplyRequest,
  type CourseProductDetailTemplateCreateRequest,
  type CourseProductDetailTemplateDeleteRequest,
  type CourseProductDetailTemplateListResult,
  type CourseProductDetailTemplateMutationResult,
  type CourseProductDetailTemplateShareRequest,
  type CourseProductDetailContent,
  type CourseProductLearningMaterialOperationsReport,
  type CourseProductMutationResult,
  type CourseProductBasicInfoUpdateRequest,
  type CourseProductPriceUpdateRequest,
  type CourseProductListQuery,
  type CourseProductListResult,
  type CourseProductPublishQueueBatchTaskCreateRequest,
  type CourseProductPublishQueueBatchTaskCancelRequest,
  type CourseProductPublishQueueBatchTaskListQuery,
  type CourseProductPublishQueueBatchTaskListResult,
  type CourseProductPublishQueueBatchTaskMutationResult,
  type CourseProductPublishQueueBatchTaskPreflightResult,
  type CourseProductPublishQueueBatchTaskReviewRequest,
  type CourseProductPublishQueueBatchTaskSubmitRequest,
  type CourseProductPublishQueueResult,
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
const CourseProductPublishQueueResponseSchema = ApiResponseSchema(
  CourseProductPublishQueueResultSchema
);
const CourseProductPublishQueueBatchTaskListResponseSchema = ApiResponseSchema(
  CourseProductPublishQueueBatchTaskListResultSchema
);
const CourseProductPublishQueueBatchTaskMutationResponseSchema =
  ApiResponseSchema(CourseProductPublishQueueBatchTaskMutationResultSchema);
const CourseProductPublishQueueBatchTaskPreflightResponseSchema =
  ApiResponseSchema(CourseProductPublishQueueBatchTaskPreflightResultSchema);
const CourseProductContentMutationResponseSchema = ApiResponseSchema(
  CourseProductContentMutationResultSchema
);
const CourseProductDetailTemplateListResponseSchema = ApiResponseSchema(
  CourseProductDetailTemplateListResultSchema
);
const CourseProductDetailTemplateMutationResponseSchema = ApiResponseSchema(
  CourseProductDetailTemplateMutationResultSchema
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
const CourseProductAssetGovernanceBatchTaskExecutionPlanResponseSchema =
  ApiResponseSchema(
    CourseProductAssetGovernanceBatchTaskExecutionPlanResultSchema
  );
const CourseProductAssetGovernanceBatchTaskExecutionDetailResponseSchema =
  ApiResponseSchema(
    CourseProductAssetGovernanceBatchTaskExecutionDetailResultSchema
  );
const CourseProductAssetGovernanceBatchTaskExecutionResponseSchema =
  ApiResponseSchema(CourseProductAssetGovernanceBatchTaskExecutionResultSchema);
const CourseProductAssetGovernanceBatchTaskQueueObservationResponseSchema =
  ApiResponseSchema(
    CourseProductAssetGovernanceBatchTaskQueueObservationResultSchema
  );
const CourseProductAssetGovernanceBatchActionPlanResponseSchema =
  ApiResponseSchema(CourseProductAssetGovernanceBatchActionPlanResultSchema);
const CourseProductLearningMaterialOperationsReportResponseSchema =
  ApiResponseSchema(CourseProductLearningMaterialOperationsReportSchema);

const API_BASE = "/api/catalog/admin";

export class CourseProductRepositoryError extends Error {
  readonly code?: string;
  readonly details?: unknown;
  readonly status: number;

  constructor(
    message: string,
    {
      code,
      details,
      status,
    }: {
      code?: string;
      details?: unknown;
      status: number;
    }
  ) {
    super(message);
    this.name = "CourseProductRepositoryError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

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

export function parseCourseProductPublishQueueResponse(
  payload: unknown
): CourseProductPublishQueueResult {
  const parsed = CourseProductPublishQueueResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCourseProductPublishQueueBatchTaskListResponse(
  payload: unknown
): CourseProductPublishQueueBatchTaskListResult {
  const parsed =
    CourseProductPublishQueueBatchTaskListResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCourseProductPublishQueueBatchTaskMutationResponse(
  payload: unknown
): CourseProductPublishQueueBatchTaskMutationResult {
  const parsed =
    CourseProductPublishQueueBatchTaskMutationResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCourseProductPublishQueueBatchTaskPreflightResponse(
  payload: unknown
): CourseProductPublishQueueBatchTaskPreflightResult {
  const parsed =
    CourseProductPublishQueueBatchTaskPreflightResponseSchema.parse(payload);
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

export function parseCourseProductDetailTemplateListResponse(
  payload: unknown
): CourseProductDetailTemplateListResult {
  const parsed = CourseProductDetailTemplateListResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCourseProductDetailTemplateMutationResponse(
  payload: unknown
): CourseProductDetailTemplateMutationResult {
  const parsed =
    CourseProductDetailTemplateMutationResponseSchema.parse(payload);
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

export function parseCourseProductAssetGovernanceBatchTaskExecutionPlanResponse(
  payload: unknown
): CourseProductAssetGovernanceBatchTaskExecutionPlanResult {
  const parsed =
    CourseProductAssetGovernanceBatchTaskExecutionPlanResponseSchema.parse(
      payload
    );
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCourseProductAssetGovernanceBatchTaskExecutionDetailResponse(
  payload: unknown
): CourseProductAssetGovernanceBatchTaskExecutionDetailResult {
  const parsed =
    CourseProductAssetGovernanceBatchTaskExecutionDetailResponseSchema.parse(
      payload
    );
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCourseProductAssetGovernanceBatchTaskExecutionResponse(
  payload: unknown
): CourseProductAssetGovernanceBatchTaskExecutionResult {
  const parsed =
    CourseProductAssetGovernanceBatchTaskExecutionResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCourseProductAssetGovernanceBatchTaskQueueObservationResponse(
  payload: unknown
): CourseProductAssetGovernanceBatchTaskQueueObservationResult {
  const parsed =
    CourseProductAssetGovernanceBatchTaskQueueObservationResponseSchema.parse(
      payload
    );
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCourseProductAssetGovernanceBatchActionPlanResponse(
  payload: unknown
): CourseProductAssetGovernanceBatchActionPlanResult {
  const parsed =
    CourseProductAssetGovernanceBatchActionPlanResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCourseProductLearningMaterialOperationsReportResponse(
  payload: unknown
): CourseProductLearningMaterialOperationsReport {
  const parsed =
    CourseProductLearningMaterialOperationsReportResponseSchema.parse(payload);
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

  const publishQueueParsed =
    CourseProductPublishQueueResponseSchema.safeParse(payload);
  if (publishQueueParsed.success && !publishQueueParsed.data.ok) {
    return publishQueueParsed.data.error.message;
  }

  const publishQueueBatchTaskListParsed =
    CourseProductPublishQueueBatchTaskListResponseSchema.safeParse(payload);
  if (
    publishQueueBatchTaskListParsed.success &&
    !publishQueueBatchTaskListParsed.data.ok
  ) {
    return publishQueueBatchTaskListParsed.data.error.message;
  }

  const publishQueueBatchTaskMutationParsed =
    CourseProductPublishQueueBatchTaskMutationResponseSchema.safeParse(payload);
  if (
    publishQueueBatchTaskMutationParsed.success &&
    !publishQueueBatchTaskMutationParsed.data.ok
  ) {
    return publishQueueBatchTaskMutationParsed.data.error.message;
  }

  const publishQueueBatchTaskPreflightParsed =
    CourseProductPublishQueueBatchTaskPreflightResponseSchema.safeParse(
      payload
    );
  if (
    publishQueueBatchTaskPreflightParsed.success &&
    !publishQueueBatchTaskPreflightParsed.data.ok
  ) {
    return publishQueueBatchTaskPreflightParsed.data.error.message;
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

  const assetGovernanceBatchTaskExecutionPlanParsed =
    CourseProductAssetGovernanceBatchTaskExecutionPlanResponseSchema.safeParse(
      payload
    );
  if (
    assetGovernanceBatchTaskExecutionPlanParsed.success &&
    !assetGovernanceBatchTaskExecutionPlanParsed.data.ok
  ) {
    return assetGovernanceBatchTaskExecutionPlanParsed.data.error.message;
  }

  const assetGovernanceBatchTaskExecutionParsed =
    CourseProductAssetGovernanceBatchTaskExecutionResponseSchema.safeParse(
      payload
    );
  if (
    assetGovernanceBatchTaskExecutionParsed.success &&
    !assetGovernanceBatchTaskExecutionParsed.data.ok
  ) {
    return assetGovernanceBatchTaskExecutionParsed.data.error.message;
  }

  const assetGovernanceBatchTaskExecutionDetailParsed =
    CourseProductAssetGovernanceBatchTaskExecutionDetailResponseSchema.safeParse(
      payload
    );
  if (
    assetGovernanceBatchTaskExecutionDetailParsed.success &&
    !assetGovernanceBatchTaskExecutionDetailParsed.data.ok
  ) {
    return assetGovernanceBatchTaskExecutionDetailParsed.data.error.message;
  }

  const assetGovernanceBatchTaskQueueObservationParsed =
    CourseProductAssetGovernanceBatchTaskQueueObservationResponseSchema.safeParse(
      payload
    );
  if (
    assetGovernanceBatchTaskQueueObservationParsed.success &&
    !assetGovernanceBatchTaskQueueObservationParsed.data.ok
  ) {
    return assetGovernanceBatchTaskQueueObservationParsed.data.error.message;
  }

  const assetGovernanceBatchActionPlanParsed =
    CourseProductAssetGovernanceBatchActionPlanResponseSchema.safeParse(
      payload
    );
  if (
    assetGovernanceBatchActionPlanParsed.success &&
    !assetGovernanceBatchActionPlanParsed.data.ok
  ) {
    return assetGovernanceBatchActionPlanParsed.data.error.message;
  }

  const learningMaterialReportParsed =
    CourseProductLearningMaterialOperationsReportResponseSchema.safeParse(
      payload
    );
  if (
    learningMaterialReportParsed.success &&
    !learningMaterialReportParsed.data.ok
  ) {
    return learningMaterialReportParsed.data.error.message;
  }

  return fallback;
}

function extractApiError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "ok" in payload) {
    const error = (payload as { ok?: unknown; error?: unknown }).error;
    if (
      (payload as { ok?: unknown }).ok === false &&
      error &&
      typeof error === "object"
    ) {
      const apiError = error as {
        code?: unknown;
        message?: unknown;
        details?: unknown;
      };
      return {
        code: typeof apiError.code === "string" ? apiError.code : undefined,
        details: apiError.details,
        message:
          typeof apiError.message === "string"
            ? apiError.message
            : extractErrorMessage(payload, fallback),
      };
    }
  }

  return {
    code: undefined,
    details: undefined,
    message: extractErrorMessage(payload, fallback),
  };
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

  async createCourseProduct(
    request: CourseProductCreateRequest
  ): Promise<CourseProductMutationResult> {
    return requestCourseProductMutation(
      `${API_BASE}/course-products`,
      request,
      "课程商品创建失败",
      "POST"
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

  async loadCourseProductDetailTemplates(): Promise<CourseProductDetailTemplateListResult> {
    const response = await fetch(
      `${API_BASE}/course-products/detail-templates`,
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
      const apiError = extractApiError(payload, "课程详情模板读取失败");
      throw new CourseProductRepositoryError(apiError.message, {
        code: apiError.code,
        details: apiError.details,
        status: response.status,
      });
    }
    return parseCourseProductDetailTemplateListResponse(payload);
  },

  async createCourseProductDetailTemplate(
    request: CourseProductDetailTemplateCreateRequest
  ): Promise<CourseProductDetailTemplateMutationResult> {
    return requestCourseProductDetailTemplateMutation(
      `${API_BASE}/course-products/detail-templates`,
      request,
      "课程详情模板保存失败",
      "POST"
    );
  },

  async deleteCourseProductDetailTemplate(
    templateId: string,
    request: CourseProductDetailTemplateDeleteRequest
  ): Promise<CourseProductDetailTemplateMutationResult> {
    return requestCourseProductDetailTemplateMutation(
      `${API_BASE}/course-products/detail-templates/${encodeURIComponent(templateId)}`,
      request,
      "课程详情模板删除失败",
      "DELETE"
    );
  },

  async applyCourseProductDetailTemplate(
    templateId: string,
    request: CourseProductDetailTemplateApplyRequest
  ): Promise<CourseProductDetailTemplateMutationResult> {
    return requestCourseProductDetailTemplateMutation(
      `${API_BASE}/course-products/detail-templates/${encodeURIComponent(templateId)}/apply`,
      request,
      "课程详情模板套用失败",
      "POST"
    );
  },

  async requestCourseProductDetailTemplateTeamShare(
    templateId: string,
    request: CourseProductDetailTemplateShareRequest
  ): Promise<CourseProductDetailTemplateMutationResult> {
    return requestCourseProductDetailTemplateMutation(
      `${API_BASE}/course-products/detail-templates/${encodeURIComponent(templateId)}/share-request`,
      request,
      "课程详情模板共享申请失败",
      "POST"
    );
  },

  async loadCourseProductPublishQueue(
    query: Partial<CourseProductListQuery> = {}
  ): Promise<CourseProductPublishQueueResult> {
    const response = await fetch(
      `${API_BASE}/course-products/publish-queue${queryStringFromRecord(query)}`,
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
      throw new Error(extractErrorMessage(payload, "课程发布队列读取失败"));
    }
    return parseCourseProductPublishQueueResponse(payload);
  },

  async loadCourseProductPublishQueueBatchTasks(
    query: Partial<CourseProductPublishQueueBatchTaskListQuery> = {}
  ): Promise<CourseProductPublishQueueBatchTaskListResult> {
    const response = await fetch(
      `${API_BASE}/course-products/publish-queue/batch-tasks${queryStringFromRecord(query)}`,
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
      throw new Error(extractErrorMessage(payload, "课程发布队列草案读取失败"));
    }
    return parseCourseProductPublishQueueBatchTaskListResponse(payload);
  },

  async createCourseProductPublishQueueBatchTask(
    request: CourseProductPublishQueueBatchTaskCreateRequest
  ): Promise<CourseProductPublishQueueBatchTaskMutationResult> {
    const response = await fetch(
      `${API_BASE}/course-products/publish-queue/batch-tasks`,
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
      throw new Error(extractErrorMessage(payload, "课程发布队列草案创建失败"));
    }
    return parseCourseProductPublishQueueBatchTaskMutationResponse(payload);
  },

  async loadCourseProductPublishQueueBatchTaskPreflight(
    taskId: string
  ): Promise<CourseProductPublishQueueBatchTaskPreflightResult> {
    const response = await fetch(
      `${API_BASE}/course-products/publish-queue/batch-tasks/${encodeURIComponent(taskId)}/preflight`,
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
      const apiError = extractApiError(payload, "课程发布队列草案预检失败");
      throw new CourseProductRepositoryError(apiError.message, {
        code: apiError.code,
        details: apiError.details,
        status: response.status,
      });
    }
    return parseCourseProductPublishQueueBatchTaskPreflightResponse(payload);
  },

  async submitCourseProductPublishQueueBatchTask(
    taskId: string,
    request: CourseProductPublishQueueBatchTaskSubmitRequest
  ): Promise<CourseProductPublishQueueBatchTaskMutationResult> {
    return requestCourseProductPublishQueueBatchTaskMutation(
      taskId,
      "submit",
      request,
      "课程发布队列草案提交失败"
    );
  },

  async cancelCourseProductPublishQueueBatchTask(
    taskId: string,
    request: CourseProductPublishQueueBatchTaskCancelRequest
  ): Promise<CourseProductPublishQueueBatchTaskMutationResult> {
    return requestCourseProductPublishQueueBatchTaskMutation(
      taskId,
      "cancel",
      request,
      "课程发布队列草案取消失败"
    );
  },

  async reviewCourseProductPublishQueueBatchTask(
    taskId: string,
    request: CourseProductPublishQueueBatchTaskReviewRequest
  ): Promise<CourseProductPublishQueueBatchTaskMutationResult> {
    return requestCourseProductPublishQueueBatchTaskMutation(
      taskId,
      "review",
      request,
      "课程发布队列草案审批失败"
    );
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

  async loadCourseProductLearningMaterialOperationsReport(): Promise<CourseProductLearningMaterialOperationsReport> {
    const response = await fetch(
      `${API_BASE}/course-products/assets/learning-material-report`,
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
        extractErrorMessage(payload, "课程学习资料运营报表读取失败")
      );
    }
    return parseCourseProductLearningMaterialOperationsReportResponse(payload);
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

  async loadCourseProductAssetGovernanceBatchTaskQueueObservation(
    query: Partial<CourseProductAssetGovernanceBatchTaskQueueObservationQuery> = {}
  ): Promise<CourseProductAssetGovernanceBatchTaskQueueObservationResult> {
    const response = await fetch(
      `${API_BASE}/course-products/assets/governance/batch-tasks/queue-observation${queryStringFromRecord(query)}`,
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
        extractErrorMessage(payload, "课程素材批量治理队列观测读取失败")
      );
    }
    return parseCourseProductAssetGovernanceBatchTaskQueueObservationResponse(
      payload
    );
  },

  async loadCourseProductAssetGovernanceBatchActionPlan(
    query: Partial<CourseProductAssetGovernanceBatchActionPlanQuery> = {}
  ): Promise<CourseProductAssetGovernanceBatchActionPlanResult> {
    const response = await fetch(
      `${API_BASE}/course-products/assets/governance/batch-action-plan${queryStringFromRecord(query)}`,
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
        extractErrorMessage(payload, "课程素材批量高风险预案读取失败")
      );
    }
    return parseCourseProductAssetGovernanceBatchActionPlanResponse(payload);
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

  async loadCourseProductAssetGovernanceBatchTaskExecutionPlan(
    taskId: string
  ): Promise<CourseProductAssetGovernanceBatchTaskExecutionPlanResult> {
    const response = await fetch(
      `${API_BASE}/course-products/assets/governance/batch-tasks/${encodeURIComponent(taskId)}/execution-plan`,
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
        extractErrorMessage(payload, "课程素材批量治理执行预案读取失败")
      );
    }
    return parseCourseProductAssetGovernanceBatchTaskExecutionPlanResponse(
      payload
    );
  },

  async loadCourseProductAssetGovernanceBatchTaskExecutionDetail(
    taskId: string
  ): Promise<CourseProductAssetGovernanceBatchTaskExecutionDetailResult> {
    const response = await fetch(
      `${API_BASE}/course-products/assets/governance/batch-tasks/${encodeURIComponent(taskId)}/execution-detail`,
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
        extractErrorMessage(payload, "课程素材批量治理执行记录读取失败")
      );
    }
    return parseCourseProductAssetGovernanceBatchTaskExecutionDetailResponse(
      payload
    );
  },

  async executeCourseProductAssetGovernanceBatchTask(
    taskId: string,
    request: CourseProductAssetGovernanceBatchTaskExecuteRequest
  ): Promise<CourseProductAssetGovernanceBatchTaskExecutionResult> {
    const response = await fetch(
      `${API_BASE}/course-products/assets/governance/batch-tasks/${encodeURIComponent(taskId)}/execute`,
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
      throw new Error(extractErrorMessage(payload, "课程素材批量治理执行失败"));
    }
    return parseCourseProductAssetGovernanceBatchTaskExecutionResponse(payload);
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
  fallback: string,
  method = "PATCH"
) {
  const response = await fetch(url, {
    method,
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
    const apiError = extractApiError(payload, fallback);
    throw new CourseProductRepositoryError(apiError.message, {
      code: apiError.code,
      details: apiError.details,
      status: response.status,
    });
  }
  return parseCourseProductMutationResponse(payload);
}

async function requestCourseProductDetailTemplateMutation(
  url: string,
  body: unknown,
  fallback: string,
  method: "POST" | "DELETE"
) {
  const response = await fetch(url, {
    method,
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
    const apiError = extractApiError(payload, fallback);
    throw new CourseProductRepositoryError(apiError.message, {
      code: apiError.code,
      details: apiError.details,
      status: response.status,
    });
  }
  return parseCourseProductDetailTemplateMutationResponse(payload);
}

async function requestCourseProductPublishQueueBatchTaskMutation(
  taskId: string,
  action: "submit" | "cancel" | "review",
  body: unknown,
  fallback: string
) {
  const response = await fetch(
    `${API_BASE}/course-products/publish-queue/batch-tasks/${encodeURIComponent(taskId)}/${action}`,
    {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      cache: "no-store",
      credentials: "same-origin",
      body: JSON.stringify(body),
    }
  );
  const payload = await readJson(response);
  if (!response.ok) {
    const apiError = extractApiError(payload, fallback);
    throw new CourseProductRepositoryError(apiError.message, {
      code: apiError.code,
      details: apiError.details,
      status: response.status,
    });
  }
  return parseCourseProductPublishQueueBatchTaskMutationResponse(payload);
}
