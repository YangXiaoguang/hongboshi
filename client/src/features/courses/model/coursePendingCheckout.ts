import {
  findPendingCourseCheckoutOrder,
  findPendingMembershipCheckoutOrder,
  type CourseAccessResult,
  type CourseAccessState,
  type CourseCheckoutMode,
  type CourseCheckoutOrderResult,
} from "./courseAccess";
import type { Course } from "@shared/domain";

export interface CoursePendingCheckoutPrompt {
  id: string;
  course: Course;
  mode: CourseCheckoutMode;
  checkout: CourseCheckoutOrderResult;
  title: string;
  subtitle: string;
}

export interface CreatePendingCourseCheckoutPromptOptions {
  accessState: CourseAccessState;
  courses: Course[];
  limit?: number;
  resolveAccess?: (course: Course) => CourseAccessResult;
}

function sortPendingOrdersNewestFirst(accessState: CourseAccessState) {
  return accessState.orders
    .filter(order => order.status === "pending_payment")
    .slice()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function findMembershipCheckoutAnchorCourse(
  courses: Course[],
  resolveAccess?: (course: Course) => CourseAccessResult
): Course | undefined {
  return (
    courses.find(course => {
      const access = resolveAccess?.(course);
      return (
        access?.status === "requires_membership" && access.canActivateMembership
      );
    }) ??
    courses.find(
      course => course.isVip && !(resolveAccess?.(course).canStart ?? false)
    ) ??
    courses.find(course => course.isVip) ??
    courses.find(course => !course.isFree) ??
    courses[0]
  );
}

export function createPendingCourseCheckoutPrompts({
  accessState,
  courses,
  limit = 3,
  resolveAccess,
}: CreatePendingCourseCheckoutPromptOptions): CoursePendingCheckoutPrompt[] {
  const membershipAnchorCourse = findMembershipCheckoutAnchorCourse(
    courses,
    resolveAccess
  );
  const prompts: CoursePendingCheckoutPrompt[] = [];

  sortPendingOrdersNewestFirst(accessState).forEach(order => {
    const item = order.items[0];
    if (!item) return;

    if (item.type === "course") {
      const course = courses.find(
        candidate => String(candidate.id) === item.targetId
      );
      if (!course) return;

      const checkout = findPendingCourseCheckoutOrder(
        accessState,
        course,
        "course"
      );
      if (!checkout) return;

      prompts.push({
        id: order.id,
        course,
        mode: "course",
        checkout,
        title: item.title,
        subtitle: `${course.teacher} · ${course.category}`,
      });
      return;
    }

    if (item.type === "membership" && membershipAnchorCourse) {
      const checkout = findPendingMembershipCheckoutOrder(
        accessState,
        item.targetId
      );
      if (!checkout) return;

      prompts.push({
        id: order.id,
        course: membershipAnchorCourse,
        mode: "membership",
        checkout,
        title: item.title,
        subtitle: "历史待支付会员订单，按订单金额继续支付",
      });
    }
  });

  return prompts.slice(0, limit);
}

export function createPendingCheckoutPromptForCourse(
  accessState: CourseAccessState,
  course: Course,
  mode: CourseCheckoutMode
): CoursePendingCheckoutPrompt | undefined {
  const checkout = findPendingCourseCheckoutOrder(accessState, course, mode);
  if (!checkout) return undefined;

  const item = checkout.order.items[0];

  return {
    id: checkout.order.id,
    course,
    mode,
    checkout,
    title: item?.title ?? course.title,
    subtitle:
      mode === "membership"
        ? "历史待支付会员订单，按订单金额继续支付"
        : `${course.teacher} · ${course.category}`,
  };
}
