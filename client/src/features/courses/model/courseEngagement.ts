import { z } from "zod";
import {
  CourseProgressSchema,
  LegacyNumericIdSchema,
  type CourseProgress,
} from "@shared/domain";

export const LOCAL_COURSE_USER_ID = "local-user";

export const CourseEngagementStateSchema = z.object({
  favoriteCourseIds: z.array(LegacyNumericIdSchema).default([]),
  progresses: z.record(z.string(), CourseProgressSchema).default({}),
});

export type CourseEngagementState = z.infer<typeof CourseEngagementStateSchema>;

export function createEmptyCourseEngagementState(): CourseEngagementState {
  return {
    favoriteCourseIds: [],
    progresses: {},
  };
}

export function normalizeCourseEngagementState(
  state: unknown
): CourseEngagementState {
  const parsed = CourseEngagementStateSchema.safeParse(state);
  if (!parsed.success) return createEmptyCourseEngagementState();

  return {
    favoriteCourseIds: Array.from(new Set(parsed.data.favoriteCourseIds)),
    progresses: parsed.data.progresses,
  };
}

export function isCourseFavorited(
  state: CourseEngagementState,
  courseId: number
): boolean {
  return state.favoriteCourseIds.includes(courseId);
}

export function toggleCourseFavorite(
  state: CourseEngagementState,
  courseId: number
): CourseEngagementState {
  const favorites = new Set(state.favoriteCourseIds);
  if (favorites.has(courseId)) {
    favorites.delete(courseId);
  } else {
    favorites.add(courseId);
  }

  return {
    ...state,
    favoriteCourseIds: Array.from(favorites),
  };
}

export function getCourseProgress(
  state: CourseEngagementState,
  courseId: number
): CourseProgress | undefined {
  return state.progresses[String(courseId)];
}

export function startCourseProgress(
  state: CourseEngagementState,
  courseId: number,
  now = new Date().toISOString(),
  userId = LOCAL_COURSE_USER_ID
): CourseEngagementState {
  const existing = getCourseProgress(state, courseId);
  const nextProgress: CourseProgress = {
    userId,
    courseId,
    status: existing?.status === "completed" ? "completed" : "in_progress",
    completedChapterIds: existing?.completedChapterIds ?? [],
    lastViewedAt: now,
    updatedAt: now,
  };

  return {
    ...state,
    progresses: {
      ...state.progresses,
      [courseId]: CourseProgressSchema.parse(nextProgress),
    },
  };
}

export function completeCourseChapter(
  state: CourseEngagementState,
  courseId: number,
  chapterId: string,
  totalChapterCount: number,
  now = new Date().toISOString(),
  userId = LOCAL_COURSE_USER_ID
): CourseEngagementState {
  const existing = getCourseProgress(state, courseId);
  const completedChapterIds = Array.from(
    new Set([...(existing?.completedChapterIds ?? []), chapterId])
  );

  const nextProgress: CourseProgress = {
    userId: existing?.userId ?? userId,
    courseId,
    status:
      completedChapterIds.length >= totalChapterCount ? "completed" : "in_progress",
    completedChapterIds,
    lastViewedAt: now,
    updatedAt: now,
  };

  return {
    ...state,
    progresses: {
      ...state.progresses,
      [courseId]: CourseProgressSchema.parse(nextProgress),
    },
  };
}

export function getCourseProgressPercent(
  progress: CourseProgress | undefined,
  totalChapterCount: number
): number {
  if (!progress || totalChapterCount <= 0) return 0;
  return Math.min(
    100,
    Math.round((progress.completedChapterIds.length / totalChapterCount) * 100)
  );
}
