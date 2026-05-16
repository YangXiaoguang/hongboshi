import { describe, expect, it } from "vitest";
import {
  CourseLearningRecordRequestError,
  parseCourseLearningRecordListResponse,
  parseCourseLearningRecordResponse,
} from "./httpCourseLearningRecordRepository";

describe("http course learning record repository parsing", () => {
  it("parses a learning record response", () => {
    const result = parseCourseLearningRecordResponse({
      ok: true,
      data: {
        generatedAt: "2026-05-16T10:20:00.000Z",
        record: {
          userId: "u_10001",
          courseId: 3,
          progress: {
            userId: "u_10001",
            courseId: 3,
            status: "in_progress",
            completedChapterIds: ["course_product_3_chapter_1"],
            lastViewedAt: "2026-05-16T10:10:00.000Z",
            updatedAt: "2026-05-16T10:10:00.000Z",
          },
          practiceRecords: [
            {
              id: "practice_3_course_product_3_chapter_1",
              userId: "u_10001",
              courseId: 3,
              chapterId: "course_product_3_chapter_1",
              note: "完成观察",
              isPracticeCompleted: true,
              source: "remote",
              syncStatus: "synced",
              createdAt: "2026-05-16T10:11:00.000Z",
              updatedAt: "2026-05-16T10:12:00.000Z",
            },
          ],
          updatedAt: "2026-05-16T10:12:00.000Z",
        },
      },
    });

    expect(result.record.progress?.completedChapterIds).toEqual([
      "course_product_3_chapter_1",
    ]);
    expect(result.record.practiceRecords[0]?.syncStatus).toBe("synced");
  });

  it("parses list responses", () => {
    const result = parseCourseLearningRecordListResponse({
      ok: true,
      data: {
        records: [],
        generatedAt: "2026-05-16T10:20:00.000Z",
      },
    });

    expect(result.records).toEqual([]);
  });

  it("preserves authorization errors", () => {
    try {
      parseCourseLearningRecordResponse({
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "请先解锁课程后再同步学习记录",
        },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(CourseLearningRecordRequestError);
      expect((err as CourseLearningRecordRequestError).code).toBe("FORBIDDEN");
    }
  });
});
