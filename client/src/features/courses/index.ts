export {
  mockCourseRepository,
  type CourseRepository,
} from "./api/mockCourseRepository";
export { httpCourseAccessRepository } from "./api/httpCourseAccessRepository";
export { httpCourseRepository } from "./api/httpCourseRepository";
export { useCourseCatalog } from "./hooks/useCourseCatalog";
export { useCourseDetail } from "./hooks/useCourseDetail";
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
  DEFAULT_COURSE_LEARNING_PATH_ID,
  courseLearningPaths,
  getCourseLearningPath,
  getCoursesForLearningPath,
  getLearningPathForCourse,
  getNextCoursesInLearningPath,
  type CourseLearningPath,
  type CourseLearningPathId,
} from "./model/coursePath";
export {
  getCourseAccessDescription,
  getCourseDetailPrimaryActionCopy,
  type CourseDetailPrimaryActionCopy,
} from "./model/courseDetailConversion";
export {
  createLearningPlanWorkspace,
  type LearningPlanBucket,
  type LearningPlanCourseItem,
  type LearningPlanWorkspace,
  type LearningPlanWorkspaceSummary,
} from "./model/courseLearningPlan";
export {
  canEnterCourseLearning,
  createCourseLearningSession,
  type CourseLearningChapterItem,
  type CourseLearningSession,
} from "./model/courseLearningSession";
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
