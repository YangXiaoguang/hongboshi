import { describe, expect, it } from "vitest";
import {
  createEmptyCourseLearningRecord,
  submitCourseLearningCompletion,
  upsertCourseLearningPracticeRecord,
  upsertCourseLearningProgress,
} from "./courseLearningRecord";

const chapterIds = ["3-chapter-1", "3-chapter-2", "3-chapter-3"];

describe("course learning record domain", () => {
  it("syncs progress and marks completion only when all chapters are done", () => {
    const record = createEmptyCourseLearningRecord({
      userId: "u_10001",
      courseId: 3,
      now: "2026-05-16T10:00:00.000Z",
    });

    const inProgress = upsertCourseLearningProgress({
      record,
      allowedChapterIds: chapterIds,
      request: {
        status: "completed",
        completedChapterIds: ["3-chapter-1"],
        updatedAt: "2026-05-16T10:05:00.000Z",
      },
    });
    const completed = upsertCourseLearningProgress({
      record: inProgress,
      allowedChapterIds: chapterIds,
      request: {
        status: "in_progress",
        completedChapterIds: chapterIds,
        updatedAt: "2026-05-16T10:30:00.000Z",
      },
    });

    expect(inProgress.progress?.status).toBe("in_progress");
    expect(completed.progress).toMatchObject({
      userId: "u_10001",
      courseId: 3,
      status: "completed",
      completedChapterIds: chapterIds,
    });
  });

  it("saves remote practice records with trimmed notes", () => {
    const record = createEmptyCourseLearningRecord({
      userId: "u_10001",
      courseId: 3,
      now: "2026-05-16T10:00:00.000Z",
    });

    const nextRecord = upsertCourseLearningPracticeRecord({
      record,
      chapterId: "3-chapter-1",
      allowedChapterIds: chapterIds,
      request: {
        note: "  今天观察到焦虑触发点  ",
        isPracticeCompleted: true,
        updatedAt: "2026-05-16T10:10:00.000Z",
      },
    });

    expect(nextRecord.practiceRecords[0]).toMatchObject({
      courseId: 3,
      chapterId: "3-chapter-1",
      note: "今天观察到焦虑触发点",
      isPracticeCompleted: true,
      source: "remote",
      syncStatus: "synced",
    });
  });

  it("creates a preview certificate after completion", () => {
    const record = upsertCourseLearningProgress({
      record: createEmptyCourseLearningRecord({
        userId: "u_10001",
        courseId: 3,
        now: "2026-05-16T10:00:00.000Z",
      }),
      allowedChapterIds: chapterIds,
      request: {
        completedChapterIds: chapterIds,
        updatedAt: "2026-05-16T10:30:00.000Z",
      },
    });

    const completed = submitCourseLearningCompletion({
      record,
      courseTitle: "认识抑郁",
      learningPathTitle: "7 天情绪稳定入门",
      learningPathLabel: "情绪稳定",
      totalChapters: chapterIds.length,
      practiceDraftedCount: 2,
      practiceCompletedCount: 1,
      submittedAt: "2026-05-16T10:35:00.000Z",
    });

    expect(completed.completion).toMatchObject({
      completedAt: "2026-05-16T10:30:00.000Z",
      learningPathTitle: "7 天情绪稳定入门",
      practiceDraftedCount: 2,
    });
    expect(completed.certificatePreview).toMatchObject({
      courseId: 3,
      courseTitle: "认识抑郁",
      issueStatus: "preview",
      issuerStatus: "preview",
      syncStatus: "synced",
    });
    expect(completed.certificatePreview?.certificateId).toBeUndefined();
  });

  it("rejects unknown chapter ids", () => {
    const record = createEmptyCourseLearningRecord({
      userId: "u_10001",
      courseId: 3,
    });

    expect(() =>
      upsertCourseLearningProgress({
        record,
        allowedChapterIds: chapterIds,
        request: {
          completedChapterIds: ["missing"],
        },
      })
    ).toThrow("COURSE_LEARNING_CHAPTER_NOT_FOUND");
  });
});
