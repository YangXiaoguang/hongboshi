export {
  mockCourseRepository,
  type CourseRepository,
} from "./api/mockCourseRepository";
export { useCourseCatalog } from "./hooks/useCourseCatalog";
export { useCourseAccess } from "./hooks/useCourseAccess";
export { useCourseEngagement } from "./hooks/useCourseEngagement";
export {
  localCourseAccessRepository,
  type CourseAccessRepository,
} from "./api/localCourseAccessRepository";
export {
  localCourseEngagementRepository,
  type CourseEngagementRepository,
} from "./api/localCourseEngagementRepository";
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
export {
  LOCAL_COURSE_USER_ID,
  completeCourseChapter,
  createEmptyCourseEngagementState,
  getCourseProgress,
  getCourseProgressPercent,
  isCourseFavorited,
  normalizeCourseEngagementState,
  startCourseProgress,
  toggleCourseFavorite,
  type CourseEngagementState,
} from "./model/courseEngagement";
export {
  activateCourseMembership,
  createEmptyCourseAccessState,
  grantPurchasedCourseAccess,
  hasActiveCourseMembership,
  normalizeCourseAccessState,
  resolveCourseAccess,
  type CourseAccessResult,
  type CourseAccessState,
  type CourseMembership,
} from "./model/courseAccess";
export { buildCourseDetail, getRelatedCourses } from "./model/courseDetail";
export type {
  Course,
  CourseAccessStatus,
  CourseAudience,
  CourseCategory,
  CourseChapter,
  CourseDetail,
  CourseProgress,
  CourseProgressStatus,
  CourseSort,
  CourseType,
} from "@shared/domain";
