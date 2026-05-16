import { useCallback, useMemo, useState } from "react";
import type { CourseDetail } from "@shared/domain";
import { localCoursePracticeRepository } from "../api/localCoursePracticeRepository";
import {
  createCourseChapterMaterial,
  getCoursePracticeRecord,
  getCoursePracticeSummary,
  saveCoursePracticeDraft,
  setCoursePracticeCompleted,
} from "../model/coursePractice";

export function useCoursePractice() {
  const [state, setState] = useState(() =>
    localCoursePracticeRepository.load()
  );

  const persist = useCallback((nextState: typeof state) => {
    localCoursePracticeRepository.save(nextState);
    return nextState;
  }, []);

  const saveDraft = useCallback(
    (courseId: number, chapterId: string, note: string) => {
      setState(prev =>
        persist(saveCoursePracticeDraft(prev, courseId, chapterId, note))
      );
    },
    [persist]
  );

  const setPracticeCompleted = useCallback(
    (courseId: number, chapterId: string, isPracticeCompleted: boolean) => {
      setState(prev =>
        persist(
          setCoursePracticeCompleted(
            prev,
            courseId,
            chapterId,
            isPracticeCompleted
          )
        )
      );
    },
    [persist]
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
    recordCount,
    getRecord,
    getSummary,
    materialForChapter,
    saveDraft,
    setPracticeCompleted,
  };
}
