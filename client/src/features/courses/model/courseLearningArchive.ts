import type { Course, CourseProgress } from "@shared/domain";
import {
  createCourseCompletionFeedback,
  type CourseCompletionCertificatePreview,
  type CourseCompletionFeedback,
} from "./courseCompletionFeedback";
import { buildCourseDetail } from "./courseDetail";
import {
  createCourseLearningSession,
  type CourseLearningSession,
} from "./courseLearningSession";
import type {
  LearningPlanCourseItem,
  LearningPlanWorkspace,
} from "./courseLearningPlan";
import {
  getCoursePracticeSummary,
  type CoursePracticeState,
  type CoursePracticeSummary,
} from "./coursePractice";

export interface LearningArchiveItem {
  course: Course;
  learningPlanItem: LearningPlanCourseItem;
  session: CourseLearningSession;
  feedback: CourseCompletionFeedback;
  certificatePreview: CourseCompletionCertificatePreview;
  practiceSummary: CoursePracticeSummary;
  completedAt: string;
  needsPracticeFollowUp: boolean;
  nextCourse?: Course;
}

export interface LearningArchiveSummary {
  completedCourseCount: number;
  certificatePreviewCount: number;
  practiceDraftedCount: number;
  practiceCompletedCount: number;
  needsPracticeCount: number;
  latestCompletedAt?: string;
}

export interface LearningArchiveWorkspace {
  items: LearningArchiveItem[];
  summary: LearningArchiveSummary;
}

export interface CreateLearningArchiveWorkspaceInput {
  learningPlan: LearningPlanWorkspace;
  practiceState: CoursePracticeState;
}

function getTime(value: string | undefined): number {
  if (!value) return 0;
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

function createArchiveItem(
  item: LearningPlanCourseItem,
  practiceState: CoursePracticeState
): LearningArchiveItem | undefined {
  if (item.bucket !== "completed" || !item.progress) return undefined;

  const courseDetail = buildCourseDetail(item.course);
  const sessionProgress = normalizeCompletedProgressForArchive(
    item.progress,
    courseDetail.chapters.map(chapter => chapter.id)
  );
  const session = createCourseLearningSession(courseDetail, sessionProgress);
  const practiceSummary = getCoursePracticeSummary(practiceState, courseDetail);
  const feedback = createCourseCompletionFeedback({
    course: courseDetail,
    session,
    practiceSummary,
    learningPath: item.learningPath,
    progress: sessionProgress,
    nextCourse: item.nextCourse,
  });

  if (!feedback) return undefined;

  const needsPracticeFollowUp =
    practiceSummary.completedCount < practiceSummary.totalChapters;

  return {
    course: item.course,
    learningPlanItem: item,
    session,
    feedback,
    certificatePreview: feedback.certificatePreview,
    practiceSummary,
    completedAt: feedback.completedAt,
    needsPracticeFollowUp,
    ...(item.nextCourse ? { nextCourse: item.nextCourse } : {}),
  };
}

function normalizeCompletedProgressForArchive(
  progress: CourseProgress,
  currentChapterIds: string[]
): CourseProgress {
  if (progress.status !== "completed") return progress;

  const currentChapterIdSet = new Set(currentChapterIds);
  const validCompletedCount = progress.completedChapterIds.filter(chapterId =>
    currentChapterIdSet.has(chapterId)
  ).length;
  if (validCompletedCount >= currentChapterIds.length) return progress;

  return {
    ...progress,
    completedChapterIds: currentChapterIds,
  };
}

export function createLearningArchiveWorkspace({
  learningPlan,
  practiceState,
}: CreateLearningArchiveWorkspaceInput): LearningArchiveWorkspace {
  const items = learningPlan.completed
    .map(item => createArchiveItem(item, practiceState))
    .filter((item): item is LearningArchiveItem => Boolean(item))
    .sort((a, b) => getTime(b.completedAt) - getTime(a.completedAt));
  const latestCompletedAt = items[0]?.completedAt;

  return {
    items,
    summary: {
      completedCourseCount: items.length,
      certificatePreviewCount: items.filter(
        item => item.certificatePreview.issueStatus === "preview"
      ).length,
      practiceDraftedCount: items.reduce(
        (sum, item) => sum + item.practiceSummary.draftedCount,
        0
      ),
      practiceCompletedCount: items.reduce(
        (sum, item) => sum + item.practiceSummary.completedCount,
        0
      ),
      needsPracticeCount: items.filter(item => item.needsPracticeFollowUp)
        .length,
      ...(latestCompletedAt ? { latestCompletedAt } : {}),
    },
  };
}
