import {
  createEmptyCoursePracticeState,
  normalizeCoursePracticeState,
  type CoursePracticeState,
} from "../model/coursePractice";

const STORAGE_KEY = "hongboshi.coursePractice.v1";

export interface CoursePracticeRepository {
  load(): CoursePracticeState;
  save(state: CoursePracticeState): void;
}

export const localCoursePracticeRepository: CoursePracticeRepository = {
  load() {
    if (typeof window === "undefined") return createEmptyCoursePracticeState();

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return createEmptyCoursePracticeState();
      return normalizeCoursePracticeState(JSON.parse(raw));
    } catch {
      return createEmptyCoursePracticeState();
    }
  },

  save(state) {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(normalizeCoursePracticeState(state))
      );
    } catch {
      // localStorage may be unavailable in private mode; the in-memory state still works.
    }
  },
};
