import { beforeEach, describe, expect, it } from "vitest";
import {
  getCourseLearningRecordPayload,
  listCourseLearningRecordsPayload,
  resetCourseLearningRecordStore,
  submitCourseLearningCompletionPayload,
  syncCourseLearningPracticePayload,
  syncCourseLearningProgressPayload,
} from "./courseLearningRecordApi";
import {
  purchaseCoursePayload,
  resetCourseAccessStore,
} from "./courseAccessApi";

describe("course learning record API payloads", () => {
  beforeEach(async () => {
    await resetCourseAccessStore();
    await resetCourseLearningRecordStore();
  });

  it("creates a readable record for an unlocked free course", async () => {
    const payload = await getCourseLearningRecordPayload(
      3,
      "u_10001",
      "2026-05-16T10:00:00.000Z"
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (!payload.body.ok) return;
    expect(payload.body.data.record).toMatchObject({
      userId: "u_10001",
      courseId: 3,
      practiceRecords: [],
    });
  });

  it("syncs chapter progress and practice records", async () => {
    const progress = await syncCourseLearningProgressPayload(
      3,
      {
        completedChapterIds: ["course_product_3_chapter_1"],
        updatedAt: "2026-05-16T10:05:00.000Z",
      },
      "u_10001",
      "2026-05-16T10:05:00.000Z"
    );
    const practice = await syncCourseLearningPracticePayload(
      3,
      "course_product_3_chapter_1",
      {
        note: "  记录一个低压力行动  ",
        isPracticeCompleted: true,
        updatedAt: "2026-05-16T10:08:00.000Z",
      },
      "u_10001",
      "2026-05-16T10:08:00.000Z"
    );

    expect(progress.status).toBe(200);
    expect(practice.status).toBe(200);
    expect(progress.body.ok).toBe(true);
    expect(practice.body.ok).toBe(true);
    if (!progress.body.ok || !practice.body.ok) return;
    expect(progress.body.data.record.progress).toMatchObject({
      status: "in_progress",
      completedChapterIds: ["course_product_3_chapter_1"],
    });
    expect(practice.body.data.record.practiceRecords[0]).toMatchObject({
      note: "记录一个低压力行动",
      isPracticeCompleted: true,
      source: "remote",
      syncStatus: "synced",
    });
  });

  it("submits completion and creates a preview certificate", async () => {
    const completedChapterIds = [
      "course_product_3_chapter_1",
      "course_product_3_chapter_2",
      "course_product_3_chapter_3",
    ];
    await syncCourseLearningProgressPayload(
      3,
      {
        completedChapterIds,
        updatedAt: "2026-05-16T10:30:00.000Z",
      },
      "u_10001",
      "2026-05-16T10:30:00.000Z"
    );

    const payload = await submitCourseLearningCompletionPayload(
      3,
      {
        learningPathTitle: "7 天情绪稳定入门",
        learningPathLabel: "情绪稳定",
        practiceDraftedCount: 2,
        practiceCompletedCount: 1,
      },
      "u_10001",
      "2026-05-16T10:35:00.000Z"
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (!payload.body.ok) return;
    expect(payload.body.data.record.completion).toMatchObject({
      completedAt: "2026-05-16T10:30:00.000Z",
      totalChapters: 3,
      completedChapters: 3,
    });
    expect(payload.body.data.record.certificatePreview).toMatchObject({
      courseId: 3,
      issueStatus: "preview",
      issuerStatus: "preview",
    });
    expect(
      payload.body.data.record.certificatePreview?.certificateId
    ).toBeUndefined();
  });

  it("rejects writes for paid courses that the user has not unlocked", async () => {
    const payload = await syncCourseLearningProgressPayload(
      16,
      {
        completedChapterIds: [],
      },
      "u_10001"
    );

    expect(payload.status).toBe(403);
    expect(payload.body.ok).toBe(false);
  });

  it("allows writes for paid courses after purchase", async () => {
    const purchase = await purchaseCoursePayload(16, "u_10001");
    const payload = await syncCourseLearningProgressPayload(
      16,
      {
        completedChapterIds: ["course_product_16_chapter_1"],
        updatedAt: "2026-05-16T10:05:00.000Z",
      },
      "u_10001"
    );

    expect(purchase.status).toBe(200);
    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (!payload.body.ok) return;
    expect(payload.body.data.record.progress?.completedChapterIds).toEqual([
      "course_product_16_chapter_1",
    ]);
  });

  it("keeps learning records isolated by user", async () => {
    await syncCourseLearningProgressPayload(
      3,
      {
        completedChapterIds: ["course_product_3_chapter_1"],
      },
      "u_10001"
    );

    const first = await listCourseLearningRecordsPayload("u_10001");
    const second = await listCourseLearningRecordsPayload("u_20001");

    expect(first.body.ok).toBe(true);
    expect(second.body.ok).toBe(true);
    if (!first.body.ok || !second.body.ok) return;
    expect(first.body.data.records).toHaveLength(1);
    expect(second.body.data.records).toHaveLength(0);
  });

  it("rejects unknown chapter ids", async () => {
    const payload = await syncCourseLearningProgressPayload(
      3,
      {
        completedChapterIds: ["missing_chapter"],
      },
      "u_10001"
    );

    expect(payload.status).toBe(409);
    expect(payload.body.ok).toBe(false);
  });
});
