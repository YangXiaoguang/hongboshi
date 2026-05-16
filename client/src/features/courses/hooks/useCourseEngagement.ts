import { useCallback, useEffect, useMemo, useState } from "react";
import type { CourseLearningRecord } from "@shared/domain";
import { localCourseEngagementRepository } from "../api/localCourseEngagementRepository";
import { httpCourseLearningRecordRepository } from "../api/httpCourseLearningRecordRepository";
import {
  LOCAL_COURSE_USER_ID,
  completeCourseChapter,
  getCourseProgress,
  getCourseProgressPercent,
  isCourseFavorited,
  startCourseProgress,
  toggleCourseFavorite,
  type CourseEngagementState,
} from "../model/courseEngagement";

export interface UseCourseEngagementOptions {
  userId?: string;
  enableRemoteSync?: boolean;
}

function mergeRemoteProgressRecords(
  state: CourseEngagementState,
  records: CourseLearningRecord[]
): CourseEngagementState {
  const progresses = records.reduce<CourseEngagementState["progresses"]>(
    (nextProgresses, record) => {
      if (record.progress) {
        nextProgresses[String(record.courseId)] = record.progress;
      }
      return nextProgresses;
    },
    { ...state.progresses }
  );

  return {
    ...state,
    progresses,
  };
}

export function useCourseEngagement(options: UseCourseEngagementOptions = {}) {
  const [state, setState] = useState(() =>
    localCourseEngagementRepository.load()
  );
  const [syncError, setSyncError] = useState<string | undefined>();
  const remoteUserId =
    options.enableRemoteSync && options.userId ? options.userId : undefined;

  const persist = useCallback((nextState: typeof state) => {
    localCourseEngagementRepository.save(nextState);
    return nextState;
  }, []);

  const mergeRemoteRecords = useCallback(
    (records: CourseLearningRecord[]) => {
      setState(prev => persist(mergeRemoteProgressRecords(prev, records)));
    },
    [persist]
  );

  useEffect(() => {
    if (!remoteUserId) return;

    let mounted = true;
    httpCourseLearningRecordRepository
      .listRecords(remoteUserId)
      .then(records => {
        if (!mounted) return;
        mergeRemoteRecords(records);
        setSyncError(undefined);
      })
      .catch(err => {
        if (!mounted) return;
        setSyncError(
          err instanceof Error ? err.message : "学习进度同步暂时不可用"
        );
      });

    return () => {
      mounted = false;
    };
  }, [mergeRemoteRecords, remoteUserId]);

  const syncProgress = useCallback(
    (nextState: CourseEngagementState, courseId: number) => {
      if (!remoteUserId) return;

      const progress = getCourseProgress(nextState, courseId);
      if (!progress) return;

      void httpCourseLearningRecordRepository
        .syncProgress(
          courseId,
          {
            status: progress.status,
            completedChapterIds: progress.completedChapterIds,
            lastViewedAt: progress.lastViewedAt,
            updatedAt: progress.updatedAt,
          },
          remoteUserId
        )
        .then(record => {
          mergeRemoteRecords([record]);
          setSyncError(undefined);
        })
        .catch(err => {
          setSyncError(
            err instanceof Error ? err.message : "学习进度同步暂时不可用"
          );
        });
    },
    [mergeRemoteRecords, remoteUserId]
  );

  const favoriteCourseIds = useMemo(
    () => new Set(state.favoriteCourseIds),
    [state.favoriteCourseIds]
  );

  const toggleFavorite = useCallback(
    (courseId: number) => {
      setState(prev => persist(toggleCourseFavorite(prev, courseId)));
    },
    [persist]
  );

  const startCourse = useCallback(
    (courseId: number) => {
      setState(prev => {
        const nextState = persist(
          startCourseProgress(
            prev,
            courseId,
            new Date().toISOString(),
            remoteUserId ?? LOCAL_COURSE_USER_ID
          )
        );
        syncProgress(nextState, courseId);
        return nextState;
      });
    },
    [persist, remoteUserId, syncProgress]
  );

  const completeChapter = useCallback(
    (courseId: number, chapterId: string, totalChapterCount: number) => {
      setState(prev => {
        const nextState = persist(
          completeCourseChapter(
            prev,
            courseId,
            chapterId,
            totalChapterCount,
            new Date().toISOString(),
            remoteUserId ?? LOCAL_COURSE_USER_ID
          )
        );
        syncProgress(nextState, courseId);
        return nextState;
      });
    },
    [persist, remoteUserId, syncProgress]
  );

  const getProgress = useCallback(
    (courseId: number) => getCourseProgress(state, courseId),
    [state]
  );

  const getProgressPercent = useCallback(
    (courseId: number, totalChapterCount: number) =>
      getCourseProgressPercent(
        getCourseProgress(state, courseId),
        totalChapterCount
      ),
    [state]
  );

  return {
    engagementState: state,
    engagementSyncError: syncError,
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
