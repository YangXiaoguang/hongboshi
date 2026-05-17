import {
  COURSE_CONVERSION_EVENT_VERSION,
  CourseConversionEventSchema,
  calculateCoursePricing,
  type Course,
  type CourseAccessStatus,
  type CourseCheckoutMode,
  type CourseConversionEvent,
  type CourseConversionEventName,
  type CourseConversionMetadata,
  type CourseConversionSource,
  type PaymentChannel,
} from "@shared/domain";

export type CourseConversionEventDraft = Omit<
  CourseConversionEvent,
  "eventVersion" | "id" | "occurredAt" | "sessionId" | "metadata"
> &
  Partial<
    Pick<CourseConversionEvent, "id" | "occurredAt" | "sessionId" | "metadata">
  >;

export interface CourseConversionEventContext {
  sessionId: string;
  websiteId?: string;
  pagePath?: string;
  now?: () => string;
  createId?: () => string;
}

export interface CourseConversionCoursePayloadInput {
  name: CourseConversionEventName;
  source: CourseConversionSource;
  course: Course;
  accessStatus?: CourseAccessStatus;
  checkoutMode?: CourseCheckoutMode;
  orderId?: string;
  paymentChannel?: PaymentChannel;
  position?: number;
  pathId?: string;
  pathLabel?: string;
  pagePath?: string;
  listPrice?: number;
  originalPrice?: number;
  discountAmount?: number;
  payableAmount?: number;
  metadata?: CourseConversionMetadata;
}

function createFallbackEventId(): string {
  return `cc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createCourseConversionEvent(
  draft: CourseConversionEventDraft,
  context: CourseConversionEventContext
): CourseConversionEvent {
  return CourseConversionEventSchema.parse({
    ...draft,
    eventVersion: COURSE_CONVERSION_EVENT_VERSION,
    id: draft.id ?? context.createId?.() ?? createFallbackEventId(),
    occurredAt: draft.occurredAt ?? context.now?.() ?? new Date().toISOString(),
    sessionId: draft.sessionId ?? context.sessionId,
    websiteId: draft.websiteId ?? context.websiteId,
    pagePath: draft.pagePath ?? context.pagePath,
    metadata: draft.metadata ?? {},
  });
}

export function createCourseConversionCoursePayload({
  accessStatus,
  checkoutMode,
  course,
  discountAmount,
  listPrice,
  metadata,
  name,
  orderId,
  originalPrice,
  pathId,
  pathLabel,
  payableAmount,
  paymentChannel,
  position,
  source,
  pagePath,
}: CourseConversionCoursePayloadInput): CourseConversionEventDraft {
  const pricing = calculateCoursePricing(course);

  return {
    name,
    source,
    courseId: course.id,
    courseTitle: course.title,
    courseCategory: course.category,
    courseType: course.type,
    accessStatus,
    checkoutMode,
    orderId,
    paymentChannel,
    position,
    pathId,
    pathLabel,
    pagePath,
    listPrice: listPrice ?? pricing.listPrice,
    originalPrice: originalPrice ?? pricing.originalPrice,
    discountAmount: discountAmount ?? pricing.discountAmount,
    payableAmount: payableAmount ?? pricing.payableAmount,
    metadata: {
      isFree: course.isFree,
      isVip: course.isVip,
      teacher: course.teacher,
      learners: course.learners,
      ...metadata,
    },
  };
}
