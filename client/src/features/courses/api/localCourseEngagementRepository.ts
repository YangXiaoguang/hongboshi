import {
  createEmptyCourseEngagementState,
  normalizeCourseEngagementState,
  type CourseEngagementState,
} from "../model/courseEngagement";

const STORAGE_KEY = "hongboshi.courseEngagement.v1";

export interface CourseEngagementRepository {
  load(): CourseEngagementState;
  save(state: CourseEngagementState): void;
}

export const localCourseEngagementRepository: CourseEngagementRepository = {
  load() {
    if (typeof window === "undefined") return createEmptyCourseEngagementState();

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return createEmptyCourseEngagementState();
      return normalizeCourseEngagementState(JSON.parse(raw));
    } catch {
      return createEmptyCourseEngagementState();
    }
  },

  save(state) {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(normalizeCourseEngagementState(state))
      );
    } catch {
      // localStorage may be unavailable in private mode; the in-memory state still works.
    }
  },
};
