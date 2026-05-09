export {
  LOCAL_COURSE_ACCESS_USER_ID,
  CourseAccessStateSchema,
  CourseMembershipSchema,
  activateCourseMembership,
  createEmptyCourseAccessState,
  grantPurchasedCourseAccess,
  hasActiveCourseMembership,
  normalizeCourseAccessState,
  resolveCourseAccess,
  type CourseAccessResult,
  type CourseAccessState,
  type CourseMembership,
} from "@shared/domain/courseAccess";
