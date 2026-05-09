import { z } from "zod";
import {
  CourseAccessStatusSchema,
  DateTimeLikeSchema,
  LegacyNumericIdSchema,
  OrderSchema,
  type Course,
  type CourseAccessStatus,
  type Order,
} from "@shared/domain";
import { LOCAL_COURSE_USER_ID } from "./courseEngagement";

const MembershipStatusSchema = z.enum(["none", "active", "expired"]);

export const CourseMembershipSchema = z.object({
  status: MembershipStatusSchema.default("none"),
  planName: z.string().min(1).optional(),
  activatedAt: DateTimeLikeSchema.optional(),
  expiresAt: DateTimeLikeSchema.optional(),
});

export const CourseAccessStateSchema = z.object({
  ownedCourseIds: z.array(LegacyNumericIdSchema).default([]),
  membership: CourseMembershipSchema.default({ status: "none" }),
  orders: z.array(OrderSchema).default([]),
});

export type CourseMembership = z.infer<typeof CourseMembershipSchema>;
export type CourseAccessState = z.infer<typeof CourseAccessStateSchema>;

export interface CourseAccessResult {
  status: CourseAccessStatus;
  canStart: boolean;
  canPurchase: boolean;
  canActivateMembership: boolean;
}

export function createEmptyCourseAccessState(): CourseAccessState {
  return {
    ownedCourseIds: [],
    membership: {
      status: "none",
    },
    orders: [],
  };
}

export function normalizeCourseAccessState(state: unknown): CourseAccessState {
  const parsed = CourseAccessStateSchema.safeParse(state);
  if (!parsed.success) return createEmptyCourseAccessState();

  return {
    ownedCourseIds: Array.from(new Set(parsed.data.ownedCourseIds)),
    membership: parsed.data.membership,
    orders: parsed.data.orders,
  };
}

export function hasActiveCourseMembership(
  membership: CourseMembership,
  now = new Date().toISOString()
): boolean {
  if (membership.status !== "active") return false;
  if (!membership.expiresAt) return true;
  return Date.parse(membership.expiresAt) > Date.parse(now);
}

export function resolveCourseAccess(
  state: CourseAccessState,
  course: Course,
  now = new Date().toISOString()
): CourseAccessResult {
  const owned = state.ownedCourseIds.includes(course.id);
  const membershipActive = hasActiveCourseMembership(state.membership, now);
  let status: CourseAccessStatus;

  if (course.isFree) {
    status = "free";
  } else if (owned) {
    status = "owned";
  } else if (course.isVip && membershipActive) {
    status = "member_included";
  } else if (course.isVip) {
    status = "requires_membership";
  } else {
    status = "requires_purchase";
  }

  const parsedStatus = CourseAccessStatusSchema.parse(status);
  const canStart = ["free", "owned", "member_included"].includes(parsedStatus);

  return {
    status: parsedStatus,
    canStart,
    canPurchase: !course.isFree && !owned,
    canActivateMembership: course.isVip && !membershipActive,
  };
}

export function grantPurchasedCourseAccess(
  state: CourseAccessState,
  course: Course,
  now = new Date().toISOString(),
  userId = LOCAL_COURSE_USER_ID
): CourseAccessState {
  if (course.isFree || state.ownedCourseIds.includes(course.id)) {
    return normalizeCourseAccessState(state);
  }

  const discountAmount = Math.min(course.coupon?.amount ?? 0, course.price);
  const order: Order = {
    id: `order_course_${course.id}_${Date.parse(now)}`,
    userId,
    status: "paid",
    items: [
      {
        type: "course",
        targetId: String(course.id),
        title: course.title,
        unitPrice: course.price,
        quantity: 1,
      },
    ],
    subtotal: course.price,
    discountAmount,
    payableAmount: Math.max(0, course.price - discountAmount),
    createdAt: now,
    paidAt: now,
  };

  return normalizeCourseAccessState({
    ...state,
    ownedCourseIds: [...state.ownedCourseIds, course.id],
    orders: [OrderSchema.parse(order), ...state.orders],
  });
}

export function activateCourseMembership(
  state: CourseAccessState,
  now = new Date().toISOString(),
  planName = "成长会员"
): CourseAccessState {
  const startedAt = Date.parse(now);
  const expiresAt = new Date(startedAt + 365 * 24 * 60 * 60 * 1000).toISOString();

  return normalizeCourseAccessState({
    ...state,
    membership: {
      status: "active",
      planName,
      activatedAt: now,
      expiresAt,
    },
  });
}
