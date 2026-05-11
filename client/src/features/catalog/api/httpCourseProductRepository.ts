import {
  ApiResponseSchema,
  CourseProductListResultSchema,
  CourseProductMutationResultSchema,
  type CourseProductMutationResult,
  type CourseProductPriceUpdateRequest,
  type CourseProductListQuery,
  type CourseProductListResult,
  type CourseProductStatusUpdateRequest,
} from "@shared/domain";

const CourseProductListResponseSchema = ApiResponseSchema(
  CourseProductListResultSchema
);
const CourseProductMutationResponseSchema = ApiResponseSchema(
  CourseProductMutationResultSchema
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

function extractErrorMessage(payload: unknown, fallback: string) {
  const listParsed = CourseProductListResponseSchema.safeParse(payload);
  if (listParsed.success && !listParsed.data.ok) {
    return listParsed.data.error.message;
  }

  const mutationParsed = CourseProductMutationResponseSchema.safeParse(payload);
  if (mutationParsed.success && !mutationParsed.data.ok) {
    return mutationParsed.data.error.message;
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
};

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
