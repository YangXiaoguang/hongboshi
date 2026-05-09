import { describe, expect, it } from "vitest";
import {
  completeCourseChapter,
  createEmptyCourseEngagementState,
  getCourseProgress,
  getCourseProgressPercent,
  isCourseFavorited,
  normalizeCourseEngagementState,
  startCourseProgress,
  toggleCourseFavorite,
} from "./courseEngagement";

describe("course engagement model", () => {
  it("toggles favorite course ids without duplicates", () => {
    let state = createEmptyCourseEngagementState();

    state = toggleCourseFavorite(state, 1);
    state = toggleCourseFavorite(state, 1);
    state = toggleCourseFavorite(state, 2);

    expect(isCourseFavorited(state, 1)).toBe(false);
    expect(isCourseFavorited(state, 2)).toBe(true);
    expect(state.favoriteCourseIds).toEqual([2]);
  });

  it("starts course progress with stable in-progress status", () => {
    const state = startCourseProgress(
      createEmptyCourseEngagementState(),
      3,
      "2026-05-09T10:00:00.000Z"
    );

    expect(getCourseProgress(state, 3)).toMatchObject({
      courseId: 3,
      status: "in_progress",
      completedChapterIds: [],
      lastViewedAt: "2026-05-09T10:00:00.000Z",
    });
  });

  it("marks a course completed when all chapters are complete", () => {
    let state = startCourseProgress(createEmptyCourseEngagementState(), 5);
    state = completeCourseChapter(state, 5, "chapter-1", 2);
    state = completeCourseChapter(state, 5, "chapter-2", 2);

    const progress = getCourseProgress(state, 5);
    expect(progress?.status).toBe("completed");
    expect(getCourseProgressPercent(progress, 2)).toBe(100);
  });

  it("normalizes invalid persisted state to a safe empty state", () => {
    expect(normalizeCourseEngagementState({ favoriteCourseIds: ["bad"] })).toEqual({
      favoriteCourseIds: [],
      progresses: {},
    });
  });
});
