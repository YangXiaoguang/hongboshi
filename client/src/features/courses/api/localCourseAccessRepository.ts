import {
  createEmptyCourseAccessState,
  normalizeCourseAccessState,
  type CourseAccessState,
} from "../model/courseAccess";

const STORAGE_KEY = "hongboshi.courseAccess.v1";

export interface CourseAccessRepository {
  load(): CourseAccessState;
  save(state: CourseAccessState): void;
}

export const localCourseAccessRepository: CourseAccessRepository = {
  load() {
    if (typeof window === "undefined") return createEmptyCourseAccessState();

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return createEmptyCourseAccessState();
      return normalizeCourseAccessState(JSON.parse(raw));
    } catch {
      return createEmptyCourseAccessState();
    }
  },

  save(state) {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(normalizeCourseAccessState(state))
      );
    } catch {
      // localStorage may be unavailable in private mode; the in-memory state still works.
    }
  },
};
