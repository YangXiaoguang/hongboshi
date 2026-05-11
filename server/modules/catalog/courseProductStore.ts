import {
  ALL_COURSE_PRODUCT_CATEGORY,
  ALL_COURSE_PRODUCT_STATUS,
  COURSE_PRODUCT_PAGE_SIZE,
  CourseProductAuditEventSchema,
  CourseProductListItemSchema,
  CourseProductMutationResultSchema,
  courseProductFilterOptions,
  type Course,
  type CourseProductAuditEvent,
  type CourseProductListItem,
  type CourseProductListQuery,
  type CourseProductListResult,
  type CourseProductListSummary,
  type CourseProductMutationResult,
  type CourseProductPriceUpdateRequest,
  type CourseProductStatusUpdateRequest,
} from "../../../shared/domain";
import { courses as seedCourses } from "../../../shared/data/mockCourses";

export interface CourseProductStore {
  listProducts(): Promise<CourseProductListItem[]>;
  getProduct(productId: string): Promise<CourseProductListItem | undefined>;
  saveProduct(product: CourseProductListItem): Promise<CourseProductListItem>;
  listAuditEvents(productId?: string): Promise<CourseProductAuditEvent[]>;
  appendAuditEvent(
    event: CourseProductAuditEvent
  ): Promise<CourseProductAuditEvent>;
}

export class InMemoryCourseProductStore implements CourseProductStore {
  private products = new Map<string, CourseProductListItem>();
  private auditEvents: CourseProductAuditEvent[] = [];

  constructor(products: CourseProductListItem[] = seedProducts()) {
    products.forEach(product => {
      this.products.set(product.id, CourseProductListItemSchema.parse(product));
    });
  }

  async listProducts() {
    return Array.from(this.products.values());
  }

  async getProduct(productId: string) {
    return this.products.get(productId);
  }

  async saveProduct(product: CourseProductListItem) {
    const parsed = CourseProductListItemSchema.parse(product);
    this.products.set(parsed.id, parsed);
    return parsed;
  }

  async listAuditEvents(productId?: string) {
    const events = productId
      ? this.auditEvents.filter(event => event.productId === productId)
      : this.auditEvents;
    return [...events].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    );
  }

  async appendAuditEvent(event: CourseProductAuditEvent) {
    const parsed = CourseProductAuditEventSchema.parse(event);
    this.auditEvents.unshift(parsed);
    return parsed;
  }
}

export class SeedCourseProductStore extends InMemoryCourseProductStore {}

let defaultStore: CourseProductStore | undefined;

export function getCourseProductStore() {
  defaultStore ??= new SeedCourseProductStore();
  return defaultStore;
}

export function seedProducts() {
  return seedCourses.map(course => courseProductFromCourse(course));
}

export function courseProductFromCourse(course: Course): CourseProductListItem {
  const createdAt = dateToDateTime(course.createdAt, 9);
  const updatedAt = dateToDateTime(course.createdAt, 18);

  return CourseProductListItemSchema.parse({
    id: `course_product_${course.id}`,
    courseId: course.id,
    title: course.title,
    coverUrl: course.coverUrl,
    category: course.category,
    type: course.type,
    instructorName: course.teacher,
    learners: course.learners,
    price: {
      amount: course.price,
      originalAmount: course.originalPrice,
      isFree: course.isFree,
      memberIncluded: course.isVip,
    },
    status: "published",
    reviewStatus: "approved",
    source: "seed",
    createdAt,
    updatedAt,
    publishedAt: createdAt,
  });
}

export function listCourseProductsByQuery(
  products: CourseProductListItem[],
  query: CourseProductListQuery,
  auditEvents: CourseProductAuditEvent[] = []
): CourseProductListResult {
  const filtered = sortCourseProducts(
    filterCourseProducts(products, query),
    query.sort
  );
  const pageSize = query.pageSize || COURSE_PRODUCT_PAGE_SIZE;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(query.page, totalPages);
  const start = (page - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    meta: {
      page,
      pageSize,
      total,
      totalPages,
    },
    summary: summarizeCourseProducts(products),
    filters: courseProductFilterOptions,
    auditEvents,
    query: {
      ...query,
      page,
      pageSize,
    },
  };
}

export async function updateCourseProductStatus({
  productId,
  request,
  actorId,
  store = getCourseProductStore(),
  now = new Date().toISOString(),
}: {
  productId: string;
  request: CourseProductStatusUpdateRequest;
  actorId: string;
  store?: CourseProductStore;
  now?: string;
}): Promise<CourseProductMutationResult> {
  const current = await store.getProduct(productId);
  if (!current) throw new Error("COURSE_PRODUCT_NOT_FOUND");

  assertStatusTransitionAllowed(current, request.status);

  const next = CourseProductListItemSchema.parse({
    ...current,
    status: request.status,
    updatedAt: now,
    publishedAt:
      request.status === "published" ? now : (current.publishedAt ?? undefined),
  });
  const auditEvent = CourseProductAuditEventSchema.parse({
    id: createAuditEventId("status", productId, now),
    productId,
    productTitle: current.title,
    actorId,
    action: "status_update",
    reason: request.reason,
    before: {
      status: current.status,
      publishedAt: current.publishedAt,
    },
    after: {
      status: next.status,
      publishedAt: next.publishedAt,
    },
    createdAt: now,
  });

  const saved = await store.saveProduct(next);
  const savedEvent = await store.appendAuditEvent(auditEvent);

  return CourseProductMutationResultSchema.parse({
    product: saved,
    auditEvent: savedEvent,
    auditEvents: await store.listAuditEvents(productId),
  });
}

export async function updateCourseProductPrice({
  productId,
  request,
  actorId,
  store = getCourseProductStore(),
  now = new Date().toISOString(),
}: {
  productId: string;
  request: CourseProductPriceUpdateRequest;
  actorId: string;
  store?: CourseProductStore;
  now?: string;
}): Promise<CourseProductMutationResult> {
  const current = await store.getProduct(productId);
  if (!current) throw new Error("COURSE_PRODUCT_NOT_FOUND");

  const originalAmount =
    request.originalAmount ??
    Math.max(request.amount, current.price.originalAmount);
  const nextPrice = {
    currency: "CNY" as const,
    amount: request.amount,
    originalAmount,
    isFree: request.isFree,
    memberIncluded: request.memberIncluded ?? current.price.memberIncluded,
  };
  const next = CourseProductListItemSchema.parse({
    ...current,
    price: nextPrice,
    updatedAt: now,
  });
  const auditEvent = CourseProductAuditEventSchema.parse({
    id: createAuditEventId("price", productId, now),
    productId,
    productTitle: current.title,
    actorId,
    action: "price_update",
    reason: request.reason,
    before: {
      price: current.price,
    },
    after: {
      price: next.price,
    },
    createdAt: now,
  });

  const saved = await store.saveProduct(next);
  const savedEvent = await store.appendAuditEvent(auditEvent);

  return CourseProductMutationResultSchema.parse({
    product: saved,
    auditEvent: savedEvent,
    auditEvents: await store.listAuditEvents(productId),
  });
}

export function summarizeCourseProducts(
  products: CourseProductListItem[]
): CourseProductListSummary {
  return {
    totalCount: products.length,
    publishedCount: products.filter(item => item.status === "published").length,
    unpublishedCount: products.filter(item => item.status === "unpublished")
      .length,
    draftCount: products.filter(item => item.status === "draft").length,
    archivedCount: products.filter(item => item.status === "archived").length,
    freeCount: products.filter(item => item.price.isFree).length,
    memberIncludedCount: products.filter(item => item.price.memberIncluded)
      .length,
  };
}

function filterCourseProducts(
  products: CourseProductListItem[],
  query: CourseProductListQuery
) {
  const keyword = query.keyword.trim().toLowerCase();

  return products.filter(item => {
    if (
      query.category !== ALL_COURSE_PRODUCT_CATEGORY &&
      item.category !== query.category
    ) {
      return false;
    }

    if (
      query.status !== ALL_COURSE_PRODUCT_STATUS &&
      item.status !== query.status
    ) {
      return false;
    }

    if (!keyword) return true;

    return [
      item.title,
      item.instructorName,
      item.category,
      item.type,
      String(item.courseId),
    ]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  });
}

function sortCourseProducts(
  products: CourseProductListItem[],
  sort: CourseProductListQuery["sort"]
) {
  const next = [...products];

  next.sort((left, right) => {
    if (sort === "price_asc") {
      return left.price.amount - right.price.amount;
    }
    if (sort === "price_desc") {
      return right.price.amount - left.price.amount;
    }
    if (sort === "learners_desc") {
      return right.learners - left.learners;
    }
    if (sort === "created_desc") {
      return right.createdAt.localeCompare(left.createdAt);
    }
    return right.updatedAt.localeCompare(left.updatedAt);
  });

  return next;
}

function assertStatusTransitionAllowed(
  product: CourseProductListItem,
  targetStatus: CourseProductStatusUpdateRequest["status"]
) {
  if (product.status === targetStatus) {
    throw new Error("COURSE_PRODUCT_STATUS_UNCHANGED");
  }

  if (targetStatus === "published") {
    if (product.status === "archived") {
      throw new Error("COURSE_PRODUCT_STATUS_TRANSITION_FORBIDDEN");
    }
    if (product.reviewStatus !== "approved") {
      throw new Error("COURSE_PRODUCT_REVIEW_NOT_APPROVED");
    }
    return;
  }

  if (targetStatus === "unpublished" && product.status === "published") {
    return;
  }

  throw new Error("COURSE_PRODUCT_STATUS_TRANSITION_FORBIDDEN");
}

function createAuditEventId(
  action: "price" | "status",
  productId: string,
  now: string
) {
  return `audit_${action}_${productId}_${Date.parse(now) || Date.now()}`;
}

function dateToDateTime(date: string, hour: number) {
  return `${date}T${String(hour).padStart(2, "0")}:00:00+08:00`;
}
