import { describe, expect, it } from "vitest";
import type {
  CourseAccessResult,
  CourseDetail,
  CourseProgress,
} from "@shared/domain";
import {
  canEnterCourseLearning,
  createCourseLearningSession,
} from "./courseLearningSession";

const course: CourseDetail = {
  id: 1,
  title: "情绪管理入门",
  coverUrl: "https://example.com/emotion.jpg",
  category: "情绪管理",
  type: "录播",
  teacher: "李老师",
  learners: 3000,
  price: 199,
  originalPrice: 399,
  isFree: false,
  isVip: true,
  createdAt: "2026-03-01",
  subtitle: "用低压力方式看懂情绪",
  summary: "适合从第一章开始建立情绪观察和复盘节奏。",
  suitableFor: [
    {
      title: "情绪波动明显",
      description: "希望用更温和的方式稳定日常状态。",
    },
  ],
  outcomes: ["识别情绪信号", "完成一次复盘"],
  supportPath: "如学习中出现明显不适，可预约咨询师支持。",
  chapters: [
    {
      id: "chapter-1",
      title: "识别情绪信号",
      description: "观察身体和想法里的情绪线索。",
      durationMinutes: 12,
      lessonCount: 2,
    },
    {
      id: "chapter-2",
      title: "建立稳定动作",
      description: "把呼吸和记录放入日常。",
      durationMinutes: 16,
      lessonCount: 2,
    },
    {
      id: "chapter-3",
      title: "完成一轮复盘",
      description: "形成自己的情绪复盘清单。",
      durationMinutes: 20,
      lessonCount: 3,
    },
  ],
};

function progress(completedChapterIds: string[]): CourseProgress {
  return {
    userId: "local-user",
    courseId: course.id,
    status:
      completedChapterIds.length >= course.chapters.length
        ? "completed"
        : "in_progress",
    completedChapterIds,
    lastViewedAt: "2026-05-16T08:00:00.000Z",
    updatedAt: "2026-05-16T08:00:00.000Z",
  };
}

function access(canStart: boolean): CourseAccessResult {
  return {
    status: canStart ? "free" : "requires_purchase",
    canStart,
    canPurchase: !canStart,
    canActivateMembership: false,
  };
}

describe("course learning session", () => {
  it("selects the first incomplete chapter as the current chapter", () => {
    const session = createCourseLearningSession(
      course,
      progress(["chapter-1"])
    );

    expect(session.currentChapter.id).toBe("chapter-2");
    expect(session.completedCount).toBe(1);
    expect(session.progressPercent).toBe(33);
    expect(session.chapterItems.map(item => item.isCurrent)).toEqual([
      false,
      true,
      false,
    ]);
  });

  it("keeps completed courses stable for review", () => {
    const session = createCourseLearningSession(
      course,
      progress(["chapter-1", "chapter-2", "chapter-3"])
    );

    expect(session.isCompleted).toBe(true);
    expect(session.progressPercent).toBe(100);
    expect(session.currentChapter.id).toBe("chapter-1");
    expect(session.nextIncompleteChapter).toBeUndefined();
  });

  it("ignores stale chapter ids when content changes", () => {
    const session = createCourseLearningSession(
      course,
      progress(["chapter-1", "stale-chapter"])
    );

    expect(session.completedCount).toBe(1);
    expect(session.progressPercent).toBe(33);
    expect(session.currentChapter.id).toBe("chapter-2");
  });

  it("protects the learning page with course access", () => {
    expect(canEnterCourseLearning(access(true))).toBe(true);
    expect(canEnterCourseLearning(access(false))).toBe(false);
  });
});
