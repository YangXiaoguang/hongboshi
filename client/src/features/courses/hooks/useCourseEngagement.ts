import { useCallback, useMemo, useState } from "react";
import { localCourseEngagementRepository } from "../api/localCourseEngagementRepository";
import {
  completeCourseChapter,
  getCourseProgress,
  getCourseProgressPercent,
  isCourseFavorited,
  startCourseProgress,
  toggleCourseFavorite,
} from "../model/courseEngagement";

export function useCourseEngagement() {
  const [state, setState] = useState(() => localCourseEngagementRepository.load());

  const persist = useCallback((nextState: typeof state) => {
    localCourseEngagementRepository.save(nextState);
    return nextState;
  }, []);

  const favoriteCourseIds = useMemo(
    () => new Set(state.favoriteCourseIds),
    [state.favoriteCourseIds]
  );

  const toggleFavorite = useCallback(
    (courseId: number) => {
      setState((prev) => persist(toggleCourseFavorite(prev, courseId)));
    },
    [persist]
  );

  const startCourse = useCallback(
    (courseId: number) => {
      setState((prev) => persist(startCourseProgress(prev, courseId)));
    },
    [persist]
  );

  const completeChapter = useCallback(
    (courseId: number, chapterId: string, totalChapterCount: number) => {
      setState((prev) =>
        persist(completeCourseChapter(prev, courseId, chapterId, totalChapterCount))
      );
    },
    [persist]
  );

  const getProgress = useCallback(
    (courseId: number) => getCourseProgress(state, courseId),
    [state]
  );

  const getProgressPercent = useCallback(
    (courseId: number, totalChapterCount: number) =>
      getCourseProgressPercent(getCourseProgress(state, courseId), totalChapterCount),
    [state]
  );

  return {
    engagementState: state,
    favoriteCourseIds,
    favoriteCount: state.favoriteCourseIds.length,
    isFavorited: (courseId: number) => isCourseFavorited(state, courseId),
    toggleFavorite,
    startCourse,
    completeChapter,
    getProgress,
    getProgressPercent,
  };
}
