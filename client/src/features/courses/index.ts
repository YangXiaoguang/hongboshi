export {
  mockCourseRepository,
  type CourseRepository,
} from "./api/mockCourseRepository";
export { useCourseCatalog } from "./hooks/useCourseCatalog";
export {
  ALL_COURSE_CATEGORY,
  ALL_COURSE_TYPE,
  COURSE_PAGE_SIZE,
  categories,
  courseTypes,
  filterCourses,
  getPageNumbers,
  getRecommendedCourses,
  listCoursesByQuery,
  paginateCourses,
  searchCourses,
  sortOptions,
  type CourseCatalogQuery,
  type CourseCatalogResult,
  type CourseCategoryFilter,
  type CourseSortOption,
  type CourseTypeFilter,
} from "./model/courseCatalog";
export type { Course, CourseCategory, CourseSort, CourseType } from "@shared/domain";
