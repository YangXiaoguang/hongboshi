import fs from "fs";
import path from "path";
import { z } from "zod";
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
  type CourseProductBasicInfoUpdateRequest,
  type CourseProductPriceUpdateRequest,
  type CourseProductReviewActionRequest,
  type CourseProductReviewStatus,
  type CourseProductStatusUpdateRequest,
} from "../../../shared/domain";
import { courses as seedCourses } from "../../../shared/data/mockCourses";
import { getDatabaseUrl, getSharedPostgresPool } from "../../db/postgres";
import { PostgresCourseProductStore } from "./postgresCourseProductStore";

const CourseProductStoreFileSchema = z.object({
  version: z.literal(1),
  products: z.array(CourseProductListItemSchema),
  auditEvents: z.array(CourseProductAuditEventSchema).default([]),
});

type CourseProductStoreFile = z.infer<typeof CourseProductStoreFileSchema>;

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
    return Array.from(this.products.values()).map(cloneProduct);
  }

  async getProduct(productId: string) {
    const product = this.products.get(productId);
    return product ? cloneProduct(product) : undefined;
  }

  async saveProduct(product: CourseProductListItem) {
    const parsed = CourseProductListItemSchema.parse(product);
    this.products.set(parsed.id, cloneProduct(parsed));
    return cloneProduct(parsed);
  }

  async listAuditEvents(productId?: string) {
    const events = productId
      ? this.auditEvents.filter(event => event.productId === productId)
      : this.auditEvents;
    return events
      .map(cloneAuditEvent)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async appendAuditEvent(event: CourseProductAuditEvent) {
    const parsed = CourseProductAuditEventSchema.parse(event);
    this.auditEvents.unshift(cloneAuditEvent(parsed));
    return cloneAuditEvent(parsed);
  }
}

export class SeedCourseProductStore extends InMemoryCourseProductStore {}

export class JsonFileCourseProductStore implements CourseProductStore {
  constructor(private readonly filePath = resolveCourseProductStorePath()) {}

  async listProducts() {
    return this.readFile().products.map(cloneProduct);
  }

  async getProduct(productId: string) {
    const product = this.readFile().products.find(
      item => item.id === productId
    );
    return product ? cloneProduct(product) : undefined;
  }

  async saveProduct(product: CourseProductListItem) {
    const parsed = CourseProductListItemSchema.parse(product);
    const file = this.readFile();
    const existingIndex = file.products.findIndex(
      item => item.id === parsed.id
    );

    if (existingIndex >= 0) {
      file.products[existingIndex] = parsed;
    } else {
      file.products.push(parsed);
    }

    this.writeFile(file);
    return cloneProduct(parsed);
  }

  async listAuditEvents(productId?: string) {
    const events = productId
      ? this.readFile().auditEvents.filter(
          event => event.productId === productId
        )
      : this.readFile().auditEvents;

    return events
      .map(cloneAuditEvent)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async appendAuditEvent(event: CourseProductAuditEvent) {
    const parsed = CourseProductAuditEventSchema.parse(event);
    const file = this.readFile();
    file.auditEvents.unshift(parsed);
    this.writeFile(file);
    return cloneAuditEvent(parsed);
  }

  clear() {
    this.writeFile(emptyCourseProductStoreFile());
  }

  private readFile(): CourseProductStoreFile {
    if (!fs.existsSync(this.filePath)) return emptyCourseProductStoreFile();

    try {
      return normalizeCourseProductStoreFile(
        JSON.parse(fs.readFileSync(this.filePath, "utf8"))
      );
    } catch {
      return emptyCourseProductStoreFile();
    }
  }

  private writeFile(file: CourseProductStoreFile) {
    const normalized = normalizeCourseProductStoreFile(file);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(normalized, null, 2), "utf8");
    fs.renameSync(tmpPath, this.filePath);
  }
}

let defaultStore: CourseProductStore | undefined;

export function getCourseProductStore() {
  defaultStore ??= createDefaultCourseProductStore();
  return defaultStore;
}

export function setCourseProductStore(store: CourseProductStore) {
  defaultStore = store;
}

export function createDefaultCourseProductStore(): CourseProductStore {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST ||
    process.env.HONGBOSHI_COURSE_PRODUCT_STORE === "memory"
  ) {
    return new InMemoryCourseProductStore();
  }

  if (
    process.env.HONGBOSHI_COURSE_PRODUCT_STORE === "postgres" ||
    (process.env.HONGBOSHI_COURSE_PRODUCT_STORE !== "file" && getDatabaseUrl())
  ) {
    return new PostgresCourseProductStore(
      getSharedPostgresPool(),
      seedProducts
    );
  }

  return new JsonFileCourseProductStore();
}

export function resolveCourseProductStorePath() {
  return path.resolve(
    process.cwd(),
    process.env.HONGBOSHI_COURSE_PRODUCT_FILE ??
      ".hongboshi-data/course-products.json"
  );
}

export function seedProducts() {
  return seedCourses.map(course => courseProductFromCourse(course));
}

export function courseFromCourseProduct(
  product: CourseProductListItem,
  baseCourses: Course[] = seedCourses
): Course {
  const baseCourse = baseCourses.find(course => course.id === product.courseId);
  return {
    ...(baseCourse ?? courseFallbackFromProduct(product)),
    id: product.courseId,
    title: product.title,
    coverUrl: product.coverUrl,
    category: product.category,
    type: product.type,
    teacher: product.instructorName,
    learners: product.learners,
    price: product.price.amount,
    originalPrice: product.price.originalAmount,
    isFree: product.price.isFree,
    isVip: product.price.memberIncluded,
  };
}

export function coursesFromPublishedProducts(
  products: CourseProductListItem[],
  baseCourses: Course[] = seedCourses
) {
  return products
    .filter(
      product =>
        product.status === "published" && product.reviewStatus === "approved"
    )
    .map(product => CourseProductListItemSchema.parse(product))
    .map(product => courseFromCourseProduct(product, baseCourses));
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

export async function updateCourseProductBasicInfo({
  productId,
  request,
  actorId,
  store = getCourseProductStore(),
  now = new Date().toISOString(),
}: {
  productId: string;
  request: CourseProductBasicInfoUpdateRequest;
  actorId: string;
  store?: CourseProductStore;
  now?: string;
}): Promise<CourseProductMutationResult> {
  const current = await store.getProduct(productId);
  if (!current) throw new Error("COURSE_PRODUCT_NOT_FOUND");

  const next = CourseProductListItemSchema.parse({
    ...current,
    title: request.title,
    coverUrl: request.coverUrl,
    category: request.category,
    type: request.type,
    instructorName: request.instructorName,
    learners: request.learners,
    updatedAt: now,
  });
  const before = pickBasicInfoAuditFields(current);
  const after = pickBasicInfoAuditFields(next);

  if (JSON.stringify(before) === JSON.stringify(after)) {
    throw new Error("COURSE_PRODUCT_INFO_UNCHANGED");
  }

  const auditEvent = CourseProductAuditEventSchema.parse({
    id: createAuditEventId("info", productId, now),
    productId,
    productTitle: next.title,
    actorId,
    action: "info_update",
    reason: request.reason,
    before,
    after,
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

export async function updateCourseProductReview({
  productId,
  request,
  actorId,
  store = getCourseProductStore(),
  now = new Date().toISOString(),
}: {
  productId: string;
  request: CourseProductReviewActionRequest;
  actorId: string;
  store?: CourseProductStore;
  now?: string;
}): Promise<CourseProductMutationResult> {
  const current = await store.getProduct(productId);
  if (!current) throw new Error("COURSE_PRODUCT_NOT_FOUND");

  const nextReviewStatus = assertReviewTransitionAllowed(
    current,
    request.action
  );
  const next = CourseProductListItemSchema.parse({
    ...current,
    reviewStatus: nextReviewStatus,
    updatedAt: now,
  });
  const auditEvent = CourseProductAuditEventSchema.parse({
    id: createAuditEventId("review", productId, now),
    productId,
    productTitle: current.title,
    actorId,
    action: "review_update",
    reason: request.reason,
    before: {
      reviewStatus: current.reviewStatus,
      status: current.status,
    },
    after: {
      reviewStatus: next.reviewStatus,
      status: next.status,
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

function assertReviewTransitionAllowed(
  product: CourseProductListItem,
  action: CourseProductReviewActionRequest["action"]
): CourseProductReviewStatus {
  if (product.status === "archived") {
    throw new Error("COURSE_PRODUCT_REVIEW_TRANSITION_FORBIDDEN");
  }

  if (action === "submit") {
    if (
      product.reviewStatus === "not_submitted" ||
      product.reviewStatus === "rejected"
    ) {
      return "pending";
    }
    throw new Error("COURSE_PRODUCT_REVIEW_TRANSITION_FORBIDDEN");
  }

  if (product.reviewStatus !== "pending") {
    throw new Error("COURSE_PRODUCT_REVIEW_TRANSITION_FORBIDDEN");
  }

  if (action === "approve") return "approved";
  if (action === "reject") return "rejected";
  return "not_submitted";
}

function createAuditEventId(
  action: "info" | "price" | "review" | "status",
  productId: string,
  now: string
) {
  return `audit_${action}_${productId}_${Date.parse(now) || Date.now()}`;
}

function pickBasicInfoAuditFields(product: CourseProductListItem) {
  return {
    title: product.title,
    coverUrl: product.coverUrl,
    category: product.category,
    type: product.type,
    instructorName: product.instructorName,
    learners: product.learners,
  };
}

function emptyCourseProductStoreFile(): CourseProductStoreFile {
  return {
    version: 1,
    products: seedProducts(),
    auditEvents: [],
  };
}

function normalizeCourseProductStoreFile(
  payload: unknown
): CourseProductStoreFile {
  const parsed = CourseProductStoreFileSchema.safeParse(payload);
  if (!parsed.success) return emptyCourseProductStoreFile();

  return {
    version: 1,
    products: parsed.data.products.map(product =>
      CourseProductListItemSchema.parse(product)
    ),
    auditEvents: parsed.data.auditEvents.map(event =>
      CourseProductAuditEventSchema.parse(event)
    ),
  };
}

function cloneProduct(product: CourseProductListItem) {
  return CourseProductListItemSchema.parse(JSON.parse(JSON.stringify(product)));
}

function cloneAuditEvent(event: CourseProductAuditEvent) {
  return CourseProductAuditEventSchema.parse(JSON.parse(JSON.stringify(event)));
}

function courseFallbackFromProduct(product: CourseProductListItem): Course {
  return {
    id: product.courseId,
    title: product.title,
    coverUrl: product.coverUrl,
    category: product.category,
    type: product.type,
    teacher: product.instructorName,
    learners: product.learners,
    price: product.price.amount,
    originalPrice: product.price.originalAmount,
    isFree: product.price.isFree,
    isVip: product.price.memberIncluded,
    createdAt: product.createdAt.slice(0, 10),
  };
}

function dateToDateTime(date: string, hour: number) {
  return `${date}T${String(hour).padStart(2, "0")}:00:00+08:00`;
}
