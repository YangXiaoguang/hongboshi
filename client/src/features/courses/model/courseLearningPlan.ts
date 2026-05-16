import type {
  Course,
  CourseAccessResult,
  CourseProgress,
} from "@shared/domain";
import { buildCourseDetail } from "./courseDetail";
import {
  getCourseProgress,
  getCourseProgressPercent,
  type CourseEngagementState,
} from "./courseEngagement";
import {
  getLearningPathForCourse,
  getNextCoursesInLearningPath,
  type CourseLearningPath,
} from "./coursePath";

export type LearningPlanBucket = "active" | "saved" | "completed";

export interface LearningPlanCourseItem {
  course: Course;
  access: CourseAccessResult;
  bucket: LearningPlanBucket;
  totalChapters: number;
  progress?: CourseProgress;
  progressPercent: number;
  isFavorited: boolean;
  learningPath: CourseLearningPath;
  nextCourse?: Course;
  lastActivityAt?: string;
}

export interface LearningPlanWorkspaceSummary {
  activeCount: number;
  savedCount: number;
  completedCount: number;
  totalPlanCount: number;
  availableToStartCount: number;
  averageProgressPercent: number;
}

export interface LearningPlanWorkspace {
  active: LearningPlanCourseItem[];
  saved: LearningPlanCourseItem[];
  completed: LearningPlanCourseItem[];
  focusItem?: LearningPlanCourseItem;
  nextCourse?: Course;
  summary: LearningPlanWorkspaceSummary;
}

export interface CreateLearningPlanWorkspaceInput {
  courses: Course[];
  engagementState: CourseEngagementState;
  resolveAccess: (course: Course) => CourseAccessResult;
}

function getActivityTime(item: LearningPlanCourseItem): number {
  const value = item.lastActivityAt ?? item.progress?.updatedAt;
  if (!value) return 0;
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

function getFavoriteOrder(state: CourseEngagementState) {
  return new Map(
    state.favoriteCourseIds.map((courseId, index) => [courseId, index])
  );
}

function getEngagedCourseIds(state: CourseEngagementState) {
  return new Set([
    ...state.favoriteCourseIds,
    ...Object.keys(state.progresses)
      .map(Number)
      .filter(courseId => Number.isFinite(courseId)),
  ]);
}

function getBucket(progress: CourseProgress | undefined): LearningPlanBucket {
  if (!progress) return "saved";
  return progress.status === "completed" ? "completed" : "active";
}

export function createLearningPlanWorkspace({
  courses,
  engagementState,
  resolveAccess,
}: CreateLearningPlanWorkspaceInput): LearningPlanWorkspace {
  const favoriteIds = new Set(engagementState.favoriteCourseIds);
  const favoriteOrder = getFavoriteOrder(engagementState);
  const engagedCourseIds = getEngagedCourseIds(engagementState);
  const items: LearningPlanCourseItem[] = [];

  courses.forEach(course => {
    const progress = getCourseProgress(engagementState, course.id);
    const isFavorited = favoriteIds.has(course.id);
    if (!progress && !isFavorited) return;

    const detail = buildCourseDetail(course);
    const totalChapters = detail.chapters.length;
    const nextPathCourses = getNextCoursesInLearningPath(courses, course, 4);
    const nextCourse =
      nextPathCourses.find(next => !engagedCourseIds.has(next.id)) ??
      nextPathCourses[0];
    const lastActivityAt = progress?.lastViewedAt ?? progress?.updatedAt;
    const item: LearningPlanCourseItem = {
      course,
      access: resolveAccess(course),
      bucket: getBucket(progress),
      totalChapters,
      progressPercent: getCourseProgressPercent(progress, totalChapters),
      isFavorited,
      learningPath: getLearningPathForCourse(course),
    };

    if (progress) item.progress = progress;
    if (nextCourse) item.nextCourse = nextCourse;
    if (lastActivityAt) item.lastActivityAt = lastActivityAt;

    items.push(item);
  });

  const active = items
    .filter(item => item.bucket === "active")
    .sort((a, b) => getActivityTime(b) - getActivityTime(a));
  const saved = items
    .filter(item => item.bucket === "saved")
    .sort((a, b) => {
      const aOrder = favoriteOrder.get(a.course.id) ?? -1;
      const bOrder = favoriteOrder.get(b.course.id) ?? -1;
      if (aOrder !== bOrder) return bOrder - aOrder;
      return b.course.learners - a.course.learners;
    });
  const completed = items
    .filter(item => item.bucket === "completed")
    .sort((a, b) => getActivityTime(b) - getActivityTime(a));
  const focusItem = active[0] ?? saved[0] ?? completed[0];
  const progressItems = [...active, ...completed];
  const averageProgressPercent =
    progressItems.length === 0
      ? 0
      : Math.round(
          progressItems.reduce((sum, item) => sum + item.progressPercent, 0) /
            progressItems.length
        );

  return {
    active,
    saved,
    completed,
    focusItem,
    nextCourse: focusItem?.nextCourse,
    summary: {
      activeCount: active.length,
      savedCount: saved.length,
      completedCount: completed.length,
      totalPlanCount: items.length,
      availableToStartCount: saved.filter(item => item.access.canStart).length,
      averageProgressPercent,
    },
  };
}
