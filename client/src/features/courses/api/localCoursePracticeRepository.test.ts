import { afterEach, describe, expect, it, vi } from "vitest";
import { saveCoursePracticeDraft } from "../model/coursePractice";
import { localCoursePracticeRepository } from "./localCoursePracticeRepository";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("local course practice repository", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists normalized practice records in localStorage", () => {
    vi.stubGlobal("window", {
      localStorage: new MemoryStorage(),
    });

    const state = saveCoursePracticeDraft(
      { records: {} },
      3,
      "3-chapter-1",
      "  今日练习记录  ",
      "2026-05-16T10:00:00.000Z"
    );

    localCoursePracticeRepository.save(state);

    expect(
      localCoursePracticeRepository.load().records["3:3-chapter-1"]
    ).toMatchObject({
      note: "今日练习记录",
      syncStatus: "local_only",
    });
  });

  it("falls back to an empty state when persisted data is invalid", () => {
    const storage = new MemoryStorage();
    storage.setItem("hongboshi.coursePractice.v1", "{bad json");
    vi.stubGlobal("window", {
      localStorage: storage,
    });

    expect(localCoursePracticeRepository.load()).toEqual({ records: {} });
  });
});
