import { useCallback, useEffect, useMemo, useState } from "react";
import type { CourseDetail, CourseLearningRecord } from "@shared/domain";
import { localCoursePracticeRepository } from "../api/localCoursePracticeRepository";
import { httpCourseLearningRecordRepository } from "../api/httpCourseLearningRecordRepository";
import {
  CoursePracticeRecordSchema,
  createCourseChapterMaterial,
  getCoursePracticeRecord,
  getCoursePracticeKey,
  getCoursePracticeSummary,
  saveCoursePracticeDraft,
  setCoursePracticeCompleted,
  type CoursePracticeState,
} from "../model/coursePractice";

export interface UseCoursePracticeOptions {
  userId?: string;
  enableRemoteSync?: boolean;
}

function mergeRemotePracticeRecords(
  state: CoursePracticeState,
  records: CourseLearningRecord[]
): CoursePracticeState {
  const practiceRecords = records.flatMap(record => record.practiceRecords);
  const nextRecords = practiceRecords.reduce<CoursePracticeState["records"]>(
    (recordsByKey, record) => {
      const key = getCoursePracticeKey(record.courseId, record.chapterId);
      recordsByKey[key] = CoursePracticeRecordSchema.parse({
        courseId: record.courseId,
        chapterId: record.chapterId,
        note: record.note,
        isPracticeCompleted: record.isPracticeCompleted,
        source: "remote",
        syncStatus: "synced",
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        serverRecordId: record.id,
      });
      return recordsByKey;
    },
    { ...state.records }
  );

  return {
    ...state,
    records: nextRecords,
  };
}

export function useCoursePractice(options: UseCoursePracticeOptions = {}) {
  const [state, setState] = useState(() =>
    localCoursePracticeRepository.load()
  );
  const [syncError, setSyncError] = useState<string | undefined>();
  const remoteUserId =
    options.enableRemoteSync && options.userId ? options.userId : undefined;

  const persist = useCallback((nextState: typeof state) => {
    localCoursePracticeRepository.save(nextState);
    return nextState;
  }, []);

  const mergeRemoteRecords = useCallback(
    (records: CourseLearningRecord[]) => {
      setState(prev => persist(mergeRemotePracticeRecords(prev, records)));
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
          err instanceof Error ? err.message : "练习记录同步暂时不可用"
        );
      });

    return () => {
      mounted = false;
    };
  }, [mergeRemoteRecords, remoteUserId]);

  const markSyncPending = useCallback(
    (courseId: number, chapterId: string) => {
      const key = getCoursePracticeKey(courseId, chapterId);
      setState(prev => {
        const record = prev.records[key];
        if (!record) return prev;
        return persist({
          ...prev,
          records: {
            ...prev.records,
            [key]: {
              ...record,
              syncStatus: "sync_pending",
            },
          },
        });
      });
    },
    [persist]
  );

  const syncPractice = useCallback(
    (nextState: CoursePracticeState, courseId: number, chapterId: string) => {
      if (!remoteUserId) return;

      const record = getCoursePracticeRecord(nextState, courseId, chapterId);
      if (!record) return;

      void httpCourseLearningRecordRepository
        .syncPractice(
          courseId,
          chapterId,
          {
            note: record.note,
            isPracticeCompleted: record.isPracticeCompleted,
            updatedAt: record.updatedAt,
          },
          remoteUserId
        )
        .then(remoteRecord => {
          mergeRemoteRecords([remoteRecord]);
          setSyncError(undefined);
        })
        .catch(err => {
          markSyncPending(courseId, chapterId);
          setSyncError(
            err instanceof Error ? err.message : "练习记录同步暂时不可用"
          );
        });
    },
    [markSyncPending, mergeRemoteRecords, remoteUserId]
  );

  const saveDraft = useCallback(
    (courseId: number, chapterId: string, note: string) => {
      setState(prev => {
        const nextState = persist(
          saveCoursePracticeDraft(
            prev,
            courseId,
            chapterId,
            note,
            new Date().toISOString()
          )
        );
        syncPractice(nextState, courseId, chapterId);
        return nextState;
      });
    },
    [persist, syncPractice]
  );

  const setPracticeCompleted = useCallback(
    (courseId: number, chapterId: string, isPracticeCompleted: boolean) => {
      setState(prev => {
        const nextState = persist(
          setCoursePracticeCompleted(
            prev,
            courseId,
            chapterId,
            isPracticeCompleted,
            new Date().toISOString()
          )
        );
        syncPractice(nextState, courseId, chapterId);
        return nextState;
      });
    },
    [persist, syncPractice]
  );

  const getRecord = useCallback(
    (courseId: number, chapterId: string) =>
      getCoursePracticeRecord(state, courseId, chapterId),
    [state]
  );

  const getSummary = useCallback(
    (course: CourseDetail) => getCoursePracticeSummary(state, course),
    [state]
  );

  const materialForChapter = useCallback(createCourseChapterMaterial, []);

  const recordCount = useMemo(() => Object.keys(state.records).length, [state]);

  return {
    practiceState: state,
    practiceSyncError: syncError,
    recordCount,
    getRecord,
    getSummary,
    materialForChapter,
    saveDraft,
    setPracticeCompleted,
  };
}
