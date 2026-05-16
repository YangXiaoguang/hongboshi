import { describe, expect, it } from "vitest";
import type { Course, CourseDetail, CourseProgress } from "@shared/domain";
import { getLearningPathForCourse } from "./coursePath";
import { createCourseLearningSession } from "./courseLearningSession";
import { createCourseCompletionFeedback } from "./courseCompletionFeedback";
import type { CoursePracticeSummary } from "./coursePractice";

const course: CourseDetail = {
  id: 3,
  title: "认识抑郁：科学走出情绪阴霾的第一课",
  coverUrl: "https://example.com/course.jpg",
  category: "心理科普",
  type: "录播",
  teacher: "赵磊咨询师",
  learners: 35241,
  price: 0,
  originalPrice: 0,
  isFree: true,
  isVip: false,
  createdAt: "2026-02-25",
  subtitle: "理解情绪低落背后的信号",
  summary: "用科学方式看待抑郁与情绪阴霾。",
  suitableFor: [
    {
      title: "想理解抑郁的人",
      description: "希望先建立基础认知，再选择合适的支持方式。",
    },
  ],
  outcomes: ["区分情绪低落和抑郁信号", "形成一份自我观察清单"],
  supportPath: "学习中如出现明显风险信号，应优先寻求咨询或线下支持。",
  chapters: [
    {
      id: "3-chapter-1",
      title: "看见当下困扰",
      description: "包含课前自评表等素材。",
      durationMinutes: 38,
      lessonCount: 1,
    },
    {
      id: "3-chapter-2",
      title: "建立理解框架",
      description: "包含章节讲义等素材。",
      durationMinutes: 52,
      lessonCount: 1,
    },
    {
      id: "3-chapter-3",
      title: "进入日常练习",
      description: "包含课后行动清单等素材。",
      durationMinutes: 46,
      lessonCount: 1,
    },
  ],
};

const nextCourse: Course = {
  id: 1,
  title: "情绪管理入门课",
  coverUrl: "https://example.com/next-course.jpg",
  category: "情绪管理",
  type: "录播",
  teacher: "李老师",
  learners: 42000,
  price: 199,
  originalPrice: 399,
  isFree: false,
  isVip: true,
  createdAt: "2026-03-01",
};

const completedProgress: CourseProgress = {
  userId: "local-user",
  courseId: course.id,
  status: "completed",
  completedChapterIds: ["3-chapter-1", "3-chapter-2", "3-chapter-3"],
  lastViewedAt: "2026-05-16T08:00:00.000Z",
  updatedAt: "2026-05-16T10:30:00.000Z",
};

const partialProgress: CourseProgress = {
  ...completedProgress,
  status: "in_progress",
  completedChapterIds: ["3-chapter-1"],
};

function practiceSummary(
  completedCount: number,
  draftedCount = completedCount
): CoursePracticeSummary {
  return {
    totalChapters: course.chapters.length,
    draftedCount,
    completedCount,
    completedPercent: Math.round(
      (completedCount / course.chapters.length) * 100
    ),
  };
}

describe("course completion feedback", () => {
  it("does not create completion feedback before the course is completed", () => {
    const feedback = createCourseCompletionFeedback({
      course,
      session: createCourseLearningSession(course, partialProgress),
      practiceSummary: practiceSummary(0),
      learningPath: getLearningPathForCourse(course),
      progress: partialProgress,
    });

    expect(feedback).toBeUndefined();
  });

  it("derives certificate preview fields without issuing a real certificate", () => {
    const feedback = createCourseCompletionFeedback({
      course,
      session: createCourseLearningSession(course, completedProgress),
      practiceSummary: practiceSummary(2, 3),
      learningPath: getLearningPathForCourse(course),
      progress: completedProgress,
      nextCourse,
    });

    expect(feedback?.certificatePreview).toMatchObject({
      courseId: 3,
      courseTitle: course.title,
      completedAt: "2026-05-16T10:30:00.000Z",
      totalChapters: 3,
      completedChapters: 3,
      practiceDraftedCount: 3,
      practiceCompletedCount: 2,
      source: "local",
      syncStatus: "local_only",
      issueStatus: "preview",
    });
    expect(feedback?.certificatePreview.certificateId).toBeUndefined();
    expect(feedback?.certificatePreview.issuedAt).toBeUndefined();
  });

  it("recommends the next course when the current path has one", () => {
    const feedback = createCourseCompletionFeedback({
      course,
      session: createCourseLearningSession(course, completedProgress),
      practiceSummary: practiceSummary(1),
      learningPath: getLearningPathForCourse(course),
      progress: completedProgress,
      nextCourse,
    });

    expect(feedback?.nextStep).toMatchObject({
      kind: "next_course",
      title: "情绪管理入门课",
      actionLabel: "学习下一门",
    });
  });

  it("uses a growth-space fallback when there is no next course", () => {
    const feedback = createCourseCompletionFeedback({
      course,
      session: createCourseLearningSession(course, completedProgress),
      practiceSummary: practiceSummary(0),
      learningPath: getLearningPathForCourse(course),
      progress: completedProgress,
    });

    expect(feedback?.nextStep).toMatchObject({
      kind: "growth_space",
      actionLabel: "查看成长空间",
    });
    expect(feedback?.practiceInsight.tone).toBe("empty");
  });

  it("marks complete practice records as a complete insight", () => {
    const feedback = createCourseCompletionFeedback({
      course,
      session: createCourseLearningSession(course, completedProgress),
      practiceSummary: practiceSummary(3, 3),
      learningPath: getLearningPathForCourse(course),
      progress: completedProgress,
      nextCourse,
    });

    expect(feedback?.practiceInsight).toMatchObject({
      tone: "complete",
      title: "练习记录已经完整",
    });
  });
});
