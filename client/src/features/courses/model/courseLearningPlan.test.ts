import { describe, expect, it } from "vitest";
import type { Course, CourseAccessResult } from "@shared/domain";
import {
  completeCourseChapter,
  createEmptyCourseEngagementState,
  startCourseProgress,
  toggleCourseFavorite,
} from "./courseEngagement";
import { createLearningPlanWorkspace } from "./courseLearningPlan";

const courses: Course[] = [
  {
    id: 1,
    title: "情绪管理入门",
    coverUrl: "https://example.com/emotion.jpg",
    category: "情绪管理",
    type: "录播",
    teacher: "李老师",
    learners: 3000,
    price: 199,
    originalPrice: 399,
    isFree: false,
    isVip: true,
    createdAt: "2026-03-01",
  },
  {
    id: 2,
    title: "正念睡眠练习",
    coverUrl: "https://example.com/mindfulness.jpg",
    category: "正念冥想",
    type: "直播",
    teacher: "王老师",
    learners: 9000,
    price: 0,
    originalPrice: 0,
    isFree: true,
    isVip: false,
    createdAt: "2026-02-01",
  },
  {
    id: 5,
    title: "职场压力管理",
    coverUrl: "https://example.com/workplace.jpg",
    category: "职场心理",
    type: "直播",
    teacher: "陈老师",
    learners: 12000,
    price: 599,
    originalPrice: 899,
    isFree: false,
    isVip: false,
    createdAt: "2026-01-01",
  },
  {
    id: 6,
    title: "亲密关系心理学",
    coverUrl: "https://example.com/relation.jpg",
    category: "婚姻关系",
    type: "录播",
    teacher: "刘老师",
    learners: 6000,
    price: 299,
    originalPrice: 599,
    isFree: false,
    isVip: true,
    createdAt: "2026-01-02",
  },
];

function resolveAccess(course: Course): CourseAccessResult {
  return {
    status: course.isFree ? "free" : "requires_purchase",
    canStart: course.isFree,
    canPurchase: !course.isFree,
    canActivateMembership: course.isVip,
  };
}

describe("course learning plan workspace", () => {
  it("separates active, saved, and completed courses", () => {
    let state = createEmptyCourseEngagementState();
    state = startCourseProgress(state, 1, "2026-05-10T10:00:00.000Z");
    state = toggleCourseFavorite(state, 2);
    state = startCourseProgress(state, 6, "2026-05-08T10:00:00.000Z");
    state = completeCourseChapter(state, 6, "6-chapter-1", 3);
    state = completeCourseChapter(state, 6, "6-chapter-2", 3);
    state = completeCourseChapter(state, 6, "6-chapter-3", 3);

    const workspace = createLearningPlanWorkspace({
      courses,
      engagementState: state,
      resolveAccess,
    });

    expect(workspace.active.map(item => item.course.id)).toEqual([1]);
    expect(workspace.saved.map(item => item.course.id)).toEqual([2]);
    expect(workspace.completed.map(item => item.course.id)).toEqual([6]);
    expect(workspace.summary).toMatchObject({
      activeCount: 1,
      savedCount: 1,
      completedCount: 1,
      totalPlanCount: 3,
      availableToStartCount: 1,
    });
  });

  it("prefers a same-path next course that is not already in the plan", () => {
    let state = createEmptyCourseEngagementState();
    state = startCourseProgress(state, 1, "2026-05-10T10:00:00.000Z");
    state = toggleCourseFavorite(state, 2);

    const workspace = createLearningPlanWorkspace({
      courses,
      engagementState: state,
      resolveAccess,
    });

    expect(workspace.focusItem?.course.id).toBe(1);
    expect(workspace.nextCourse?.id).toBe(5);
  });

  it("keeps an empty workspace stable when the user has no plan data", () => {
    const workspace = createLearningPlanWorkspace({
      courses,
      engagementState: createEmptyCourseEngagementState(),
      resolveAccess,
    });

    expect(workspace.active).toEqual([]);
    expect(workspace.saved).toEqual([]);
    expect(workspace.completed).toEqual([]);
    expect(workspace.summary.totalPlanCount).toBe(0);
    expect(workspace.summary.averageProgressPercent).toBe(0);
  });
});
