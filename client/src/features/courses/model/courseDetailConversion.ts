import type { CourseAccessResult, CourseAccessStatus } from "@shared/domain";

export interface CourseDetailPrimaryActionCopy {
  label: string;
  description: string;
  icon: "play" | "crown" | "shoppingBag";
}

const lockedDescription: Record<CourseAccessStatus, string> = {
  free: "免费课程可直接加入学习计划。",
  owned: "你已拥有本课程，可继续学习并记录进度。",
  member_included: "当前会员权益已覆盖本课程，可直接学习。",
  requires_purchase: "购买后会同步到你的课程权益，并保留在学习计划里。",
  requires_membership: "开通会员可学习本课，也可以单独购买。",
};

export function getCourseDetailPrimaryActionCopy(
  access: CourseAccessResult,
  hasStarted: boolean
): CourseDetailPrimaryActionCopy {
  if (access.canStart) {
    return {
      label: hasStarted ? "继续学习" : "加入学习计划",
      description: hasStarted
        ? "已为你保留当前课程进度，可以从上次状态继续。"
        : "加入后会记录章节进度，并把这门课放入你的成长空间。",
      icon: "play",
    };
  }

  if (access.status === "requires_membership") {
    return {
      label: "开通会员学习",
      description: lockedDescription.requires_membership,
      icon: "crown",
    };
  }

  return {
    label: "购买并解锁",
    description: lockedDescription.requires_purchase,
    icon: "shoppingBag",
  };
}

export function getCourseAccessDescription(status: CourseAccessStatus): string {
  return lockedDescription[status];
}
