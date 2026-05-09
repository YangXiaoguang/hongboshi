import {
  LOCAL_COURSE_ACCESS_USER_ID,
  createEmptyCourseAccessState,
  normalizeCourseAccessState,
  type CourseAccessState,
} from "../model/courseAccess";

const STORAGE_KEY = "hongboshi.courseAccess.v1";

export interface CourseAccessRepository {
  load(userId?: string): CourseAccessState;
  save(state: CourseAccessState, userId?: string): void;
}

function storageKeyForUser(userId = LOCAL_COURSE_ACCESS_USER_ID) {
  return `${STORAGE_KEY}.${userId}`;
}

export const localCourseAccessRepository: CourseAccessRepository = {
  load(userId = LOCAL_COURSE_ACCESS_USER_ID) {
    if (typeof window === "undefined") return createEmptyCourseAccessState();

    try {
      const raw =
        window.localStorage.getItem(storageKeyForUser(userId)) ??
        (userId === LOCAL_COURSE_ACCESS_USER_ID
          ? window.localStorage.getItem(STORAGE_KEY)
          : null);
      if (!raw) return createEmptyCourseAccessState();
      return normalizeCourseAccessState(JSON.parse(raw));
    } catch {
      return createEmptyCourseAccessState();
    }
  },

  save(state, userId = LOCAL_COURSE_ACCESS_USER_ID) {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        storageKeyForUser(userId),
        JSON.stringify(normalizeCourseAccessState(state))
      );
    } catch {
      // localStorage may be unavailable in private mode; the in-memory state still works.
    }
  },
};
