export {
  mockCourseRepository,
  type CourseRepository,
} from "./api/mockCourseRepository";
export { httpCourseAccessRepository } from "./api/httpCourseAccessRepository";
export { httpCourseLearningRecordRepository } from "./api/httpCourseLearningRecordRepository";
export { httpCourseMarketingRepository } from "./api/httpCourseMarketingRepository";
export { httpCourseRepository } from "./api/httpCourseRepository";
export {
  COURSE_CONVERSION_SESSION_KEY,
  COURSE_CONVERSION_STORAGE_KEY,
  createCourseConversionAnalyticsRepository,
  trackCourseConversionEvent,
  type CourseConversionAnalyticsRepository,
  type CourseConversionStoredEvent,
  type CourseConversionStoredEventStatus,
} from "./api/courseConversionAnalyticsRepository";
export { useCourseCatalog } from "./hooks/useCourseCatalog";
export { useCourseDetail } from "./hooks/useCourseDetail";
export { useCourseMarketingRules } from "./hooks/useCourseMarketingRules";
export { useCourseAccess } from "./hooks/useCourseAccess";
export { useCourseEngagement } from "./hooks/useCourseEngagement";
export { useCoursePractice } from "./hooks/useCoursePractice";
export { useUserPreference } from "./hooks/useUserPreference";
export {
  localCourseAccessRepository,
  type CourseAccessRepository,
} from "./api/localCourseAccessRepository";
export {
  localCourseEngagementRepository,
  type CourseEngagementRepository,
} from "./api/localCourseEngagementRepository";
export {
  localCoursePracticeRepository,
  type CoursePracticeRepository,
} from "./api/localCoursePracticeRepository";
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
  buildCourseTrustProfile,
  createCourseTrustSummary,
  type CourseTrustFaq,
  type CourseTrustFeedback,
  type CourseTrustHighlight,
  type CourseTrustMetric,
  type CourseTrustPolicy,
  type CourseTrustProfile,
} from "./model/courseTrust";
export {
  createPendingCheckoutPromptForCourse,
  createPendingCourseCheckoutPrompts,
  type CoursePendingCheckoutPrompt,
} from "./model/coursePendingCheckout";
export {
  createCoursePromotionSummary,
  type CoursePathBundlePromotion,
  type CoursePromotionLine,
  type CoursePromotionOffer,
  type CoursePromotionSummary,
} from "./model/coursePromotion";
export {
  createCourseConversionCoursePayload,
  createCourseConversionEvent,
  type CourseConversionCoursePayloadInput,
  type CourseConversionEventContext,
  type CourseConversionEventDraft,
} from "./model/courseConversion";
export {
  COURSE_MEMBERSHIP_CHECKOUT_ORIGINAL_PRICE,
  COURSE_MEMBERSHIP_CHECKOUT_PRICE,
  coursePaymentMethods,
  createCourseCheckoutSummary,
  formatCheckoutMoney,
  type CourseCheckoutMode,
  type CourseCheckoutPaymentChannel,
  type CourseCheckoutPromotionItem,
  type CourseCheckoutSummary,
  type CoursePaymentMethod,
} from "./model/courseCheckout";
export {
  countClaimableCourseCoupons,
  createCourseCheckoutCouponOptions,
  resolveDefaultCheckoutCouponClaimId,
  type CourseCheckoutCouponOption,
  type CourseCheckoutCouponOptionStatus,
} from "./model/courseCouponBag";
export {
  createLearningPlanWorkspace,
  type LearningPlanBucket,
  type LearningPlanCourseItem,
  type LearningPlanWorkspace,
  type LearningPlanWorkspaceSummary,
} from "./model/courseLearningPlan";
export {
  createLearningArchiveWorkspace,
  type LearningArchiveItem,
  type LearningArchiveSummary,
  type LearningArchiveWorkspace,
} from "./model/courseLearningArchive";
export {
  canEnterCourseLearning,
  createCourseLearningSession,
  type CourseLearningChapterItem,
  type CourseLearningSession,
} from "./model/courseLearningSession";
export {
  CourseCompletionCertificatePreviewSchema,
  createCourseCompletionFeedback,
  type CourseCompletionCertificatePreview,
  type CourseCompletionFeedback,
  type CourseCompletionMetric,
  type CourseCompletionNextStep,
  type CourseCompletionPracticeInsight,
  type CourseCompletionPracticeTone,
} from "./model/courseCompletionFeedback";
export {
  CoursePracticeRecordSchema,
  CoursePracticeStateSchema,
  createCourseChapterMaterial,
  createEmptyCoursePracticeState,
  getCoursePracticeKey,
  getCoursePracticeRecord,
  getCoursePracticeSummary,
  normalizeCoursePracticeRecord,
  normalizeCoursePracticeRecords,
  normalizeCoursePracticeState,
  saveCoursePracticeDraft,
  setCoursePracticeCompleted,
  type CourseChapterMaterial,
  type CoursePracticeRecord,
  type CoursePracticeState,
  type CoursePracticeSummary,
} from "./model/coursePractice";
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
  COURSE_CHECKOUT_PAYMENT_HOLD_MINUTES,
  COURSE_MEMBERSHIP_ORDER_ORIGINAL_PRICE,
  COURSE_MEMBERSHIP_ORDER_PAYABLE_PRICE,
  activateCourseMembership,
  cancelCourseCheckoutOrder,
  createEmptyCourseAccessState,
  createCourseCheckoutOrder,
  createCourseCheckoutOrderResult,
  findPendingCourseCheckoutOrder,
  grantPurchasedCourseAccess,
  hasActiveCourseMembership,
  normalizeCourseAccessState,
  payCourseCheckoutOrder,
  resolveCourseAccess,
  type CourseAccessResult,
  type CourseAccessState,
  type CourseCheckoutMode as CourseAccessCheckoutMode,
  type CourseCheckoutOrderResult,
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
  CourseLearningCertificateIssuerStatus,
  CourseLearningCertificatePreview as RemoteCourseLearningCertificatePreview,
  CourseLearningCompletionSnapshot,
  CourseLearningPracticeRecord as RemoteCourseLearningPracticeRecord,
  CourseLearningRecord,
  CourseLearningRecordListResult,
  CourseLearningRecordResult,
  CourseLearningRecordSource,
  CourseLearningSyncStatus,
  CourseConversionEvent,
  CourseConversionEventBatch,
  CourseConversionEventName,
  CourseConversionMetadata,
  CourseConversionMetadataValue,
  CourseConversionSource,
  CourseMarketingRule,
  CourseMarketingRuleConsole,
  CourseMarketingRuleSnapshot,
} from "@shared/domain";
