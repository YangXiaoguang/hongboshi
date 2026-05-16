import { describe, expect, it } from "vitest";
import type { Course, CourseAccessResult } from "@shared/domain";
import {
  completeCourseChapter,
  createEmptyCourseEngagementState,
  startCourseProgress,
} from "./courseEngagement";
import { createLearningArchiveWorkspace } from "./courseLearningArchive";
import { createLearningPlanWorkspace } from "./courseLearningPlan";
import {
  createEmptyCoursePracticeState,
  saveCoursePracticeDraft,
  setCoursePracticeCompleted,
} from "./coursePractice";

const courses: Course[] = [
  {
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
  },
  {
    id: 3,
    title: "认识抑郁",
    coverUrl: "https://example.com/course.jpg",
    category: "心理科普",
    type: "录播",
    teacher: "赵老师",
    learners: 10000,
    price: 0,
    originalPrice: 0,
    isFree: true,
    isVip: false,
    createdAt: "2026-02-25",
  },
  {
    id: 5,
    title: "职场压力管理",
    coverUrl: "https://example.com/workplace.jpg",
    category: "职场心理",
    type: "直播",
    teacher: "陈老师",
    learners: 12000,
    price: 599,
    originalPrice: 899,
    isFree: false,
    isVip: false,
    createdAt: "2026-01-01",
  },
];

function resolveAccess(course: Course): CourseAccessResult {
  return {
    status: course.isFree ? "free" : "requires_purchase",
    canStart: course.isFree,
    canPurchase: !course.isFree,
    canActivateMembership: course.isVip,
  };
}

function completeCourse(
  state: ReturnType<typeof createEmptyCourseEngagementState>,
  courseId: number,
  now: string
) {
  let nextState = startCourseProgress(state, courseId, now);
  nextState = completeCourseChapter(
    nextState,
    courseId,
    `${courseId}-chapter-1`,
    3,
    now
  );
  nextState = completeCourseChapter(
    nextState,
    courseId,
    `${courseId}-chapter-2`,
    3,
    now
  );
  return completeCourseChapter(
    nextState,
    courseId,
    `${courseId}-chapter-3`,
    3,
    now
  );
}

describe("course learning archive workspace", () => {
  it("creates archive items only for completed courses", () => {
    let engagementState = createEmptyCourseEngagementState();
    engagementState = startCourseProgress(
      engagementState,
      1,
      "2026-05-14T10:00:00.000Z"
    );
    engagementState = completeCourse(
      engagementState,
      3,
      "2026-05-16T10:30:00.000Z"
    );
    let practiceState = createEmptyCoursePracticeState();
    practiceState = saveCoursePracticeDraft(
      practiceState,
      3,
      "3-chapter-1",
      "完成课后观察",
      "2026-05-16T10:35:00.000Z"
    );
    practiceState = setCoursePracticeCompleted(
      practiceState,
      3,
      "3-chapter-1",
      true,
      "2026-05-16T10:36:00.000Z"
    );

    const learningPlan = createLearningPlanWorkspace({
      courses,
      engagementState,
      resolveAccess,
    });
    const archive = createLearningArchiveWorkspace({
      learningPlan,
      practiceState,
    });

    expect(archive.items.map(item => item.course.id)).toEqual([3]);
    expect(archive.items[0]?.certificatePreview).toMatchObject({
      courseId: 3,
      issueStatus: "preview",
    });
    expect(archive.items[0]?.certificatePreview.certificateId).toBeUndefined();
    expect(archive.items[0]?.certificatePreview.issuedAt).toBeUndefined();
    expect(archive.items[0]?.needsPracticeFollowUp).toBe(true);
    expect(archive.summary).toMatchObject({
      completedCourseCount: 1,
      certificatePreviewCount: 1,
      practiceDraftedCount: 1,
      practiceCompletedCount: 1,
      needsPracticeCount: 1,
      latestCompletedAt: "2026-05-16T10:30:00.000Z",
    });
  });

  it("sorts completed archive items by completion time", () => {
    let engagementState = createEmptyCourseEngagementState();
    engagementState = completeCourse(
      engagementState,
      3,
      "2026-05-15T10:00:00.000Z"
    );
    engagementState = completeCourse(
      engagementState,
      5,
      "2026-05-16T11:00:00.000Z"
    );

    const archive = createLearningArchiveWorkspace({
      learningPlan: createLearningPlanWorkspace({
        courses,
        engagementState,
        resolveAccess,
      }),
      practiceState: createEmptyCoursePracticeState(),
    });

    expect(archive.items.map(item => item.course.id)).toEqual([5, 3]);
    expect(archive.summary.needsPracticeCount).toBe(2);
  });

  it("keeps completed archives when stored chapter ids come from older content", () => {
    let engagementState = createEmptyCourseEngagementState();
    engagementState = startCourseProgress(
      engagementState,
      3,
      "2026-05-16T12:00:00.000Z"
    );
    engagementState = {
      ...engagementState,
      progresses: {
        ...engagementState.progresses,
        "3": {
          ...engagementState.progresses["3"]!,
          status: "completed",
          completedChapterIds: ["legacy-a", "legacy-b", "legacy-c"],
          updatedAt: "2026-05-16T12:00:00.000Z",
        },
      },
    };

    const archive = createLearningArchiveWorkspace({
      learningPlan: createLearningPlanWorkspace({
        courses,
        engagementState,
        resolveAccess,
      }),
      practiceState: createEmptyCoursePracticeState(),
    });

    expect(archive.items).toHaveLength(1);
    expect(archive.items[0]?.session).toMatchObject({
      isCompleted: true,
      completedCount: 3,
      progressPercent: 100,
    });
    expect(archive.items[0]?.certificatePreview.completedChapters).toBe(3);
  });

  it("keeps an empty archive stable when no course is completed", () => {
    const archive = createLearningArchiveWorkspace({
      learningPlan: createLearningPlanWorkspace({
        courses,
        engagementState: startCourseProgress(
          createEmptyCourseEngagementState(),
          3
        ),
        resolveAccess,
      }),
      practiceState: createEmptyCoursePracticeState(),
    });

    expect(archive.items).toEqual([]);
    expect(archive.summary).toMatchObject({
      completedCourseCount: 0,
      certificatePreviewCount: 0,
      practiceCompletedCount: 0,
      needsPracticeCount: 0,
    });
  });
});
