import {
  ALL_COURSE_PRODUCT_CATEGORY,
  ALL_COURSE_PRODUCT_STATUS,
  COURSE_PRODUCT_PAGE_SIZE,
  CourseProductListItemSchema,
  courseProductFilterOptions,
  type Course,
  type CourseProductListItem,
  type CourseProductListQuery,
  type CourseProductListResult,
  type CourseProductListSummary,
} from "../../../shared/domain";
import { courses as seedCourses } from "../../../shared/data/mockCourses";

export interface CourseProductStore {
  listProducts(): Promise<CourseProductListItem[]>;
}

export class SeedCourseProductStore implements CourseProductStore {
  async listProducts() {
    return seedCourses.map(course => courseProductFromCourse(course));
  }
}

let defaultStore: CourseProductStore | undefined;

export function getCourseProductStore() {
  defaultStore ??= new SeedCourseProductStore();
  return defaultStore;
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
  query: CourseProductListQuery
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
    query: {
      ...query,
      page,
      pageSize,
    },
  };
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

function dateToDateTime(date: string, hour: number) {
  return `${date}T${String(hour).padStart(2, "0")}:00:00+08:00`;
}
