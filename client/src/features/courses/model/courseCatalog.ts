import {
  COURSE_CATEGORIES,
  COURSE_TYPES,
  type Course,
  type CourseCategory,
  type CourseSort,
  type CourseType,
} from "@shared/domain";

export const ALL_COURSE_CATEGORY = "全部";
export const ALL_COURSE_TYPE = "全部";
export const COURSE_PAGE_SIZE = 12;

export type CourseCategoryFilter = CourseCategory | typeof ALL_COURSE_CATEGORY;
export type CourseTypeFilter = CourseType | typeof ALL_COURSE_TYPE;

export interface CourseSortOption {
  label: string;
  value: CourseSort;
}

export interface CourseCatalogQuery {
  category: CourseCategoryFilter;
  type: CourseTypeFilter;
  sort: CourseSort;
  keyword: string;
  vipOnly: boolean;
  page: number;
  pageSize: number;
}

export interface CourseCatalogResult {
  items: Course[];
  paginatedItems: Course[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export const categories = [ALL_COURSE_CATEGORY, ...COURSE_CATEGORIES] as const;

export const courseTypes = [ALL_COURSE_TYPE, ...COURSE_TYPES] as const;

export const sortOptions: CourseSortOption[] = [
  { label: "综合", value: "comprehensive" },
  { label: "最新", value: "newest" },
  { label: "最热", value: "hottest" },
  { label: "价格", value: "price" },
];

export function searchCourses(courses: Course[], keyword: string): Course[] {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return courses;

  return courses.filter((course) =>
    [course.title, course.teacher, course.category]
      .join(" ")
      .toLowerCase()
      .includes(normalizedKeyword)
  );
}

export function filterCourses(courses: Course[], query: CourseCatalogQuery): Course[] {
  let result = [...courses];

  if (query.category !== ALL_COURSE_CATEGORY) {
    result = result.filter((course) => course.category === query.category);
  }

  if (query.type !== ALL_COURSE_TYPE) {
    result = result.filter((course) => course.type === query.type);
  }

  if (query.vipOnly) {
    result = result.filter((course) => course.isVip);
  }

  result = searchCourses(result, query.keyword);

  switch (query.sort) {
    case "newest":
      return result.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case "hottest":
      return result.sort((a, b) => b.learners - a.learners);
    case "price":
      return result.sort((a, b) => a.price - b.price);
    case "comprehensive":
    default:
      return result;
  }
}

export function paginateCourses(
  courses: Course[],
  page: number,
  pageSize: number
): Pick<CourseCatalogResult, "paginatedItems" | "totalPages" | "page" | "pageSize"> {
  const totalPages = Math.max(1, Math.ceil(courses.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    paginatedItems: courses.slice(start, start + pageSize),
    totalPages,
    page: safePage,
    pageSize,
  };
}

export function listCoursesByQuery(
  courses: Course[],
  query: CourseCatalogQuery
): CourseCatalogResult {
  const items = filterCourses(courses, query);
  const pageResult = paginateCourses(items, query.page, query.pageSize);

  return {
    items,
    totalCount: items.length,
    ...pageResult,
  };
}

export function getRecommendedCourses(
  courses: Course[],
  category: CourseCategoryFilter,
  limit = 3
): Course[] {
  const matched =
    category === ALL_COURSE_CATEGORY
      ? courses
      : courses.filter((course) => course.category === category);

  return (matched.length ? matched : courses).slice(0, limit);
}

export function getPageNumbers(totalPages: number, currentPage: number): (number | string)[] {
  const pages: (number | string)[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i += 1) pages.push(i);
    return pages;
  }

  pages.push(1);
  if (currentPage > 3) pages.push("...");

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let i = start; i <= end; i += 1) pages.push(i);

  if (currentPage < totalPages - 2) pages.push("...");
  pages.push(totalPages);

  return pages;
}
