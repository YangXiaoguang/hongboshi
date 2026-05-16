import type {
  CourseAccessResult,
  CourseChapter,
  CourseDetail,
  CourseProgress,
} from "@shared/domain";

export interface CourseLearningChapterItem {
  chapter: CourseChapter;
  stepNumber: number;
  isCompleted: boolean;
  isCurrent: boolean;
}

export interface CourseLearningSession {
  totalChapters: number;
  completedCount: number;
  progressPercent: number;
  isCompleted: boolean;
  currentChapter: CourseChapter;
  nextIncompleteChapter?: CourseChapter;
  chapterItems: CourseLearningChapterItem[];
}

export function canEnterCourseLearning(access: CourseAccessResult): boolean {
  return access.canStart;
}

function getValidCompletedChapterIds(
  course: CourseDetail,
  progress: CourseProgress | undefined
) {
  const chapterIds = new Set(course.chapters.map(chapter => chapter.id));

  return new Set(
    (progress?.completedChapterIds ?? []).filter(chapterId =>
      chapterIds.has(chapterId)
    )
  );
}

export function createCourseLearningSession(
  course: CourseDetail,
  progress: CourseProgress | undefined
): CourseLearningSession {
  const completedChapterIds = getValidCompletedChapterIds(course, progress);
  const totalChapters = course.chapters.length;
  const completedCount = completedChapterIds.size;
  const nextIncompleteChapter = course.chapters.find(
    chapter => !completedChapterIds.has(chapter.id)
  );
  const currentChapter = nextIncompleteChapter ?? course.chapters[0];

  if (!currentChapter) {
    throw new Error("Course learning session requires at least one chapter.");
  }

  const isCompleted = totalChapters > 0 && completedCount >= totalChapters;
  const progressPercent =
    totalChapters === 0
      ? 0
      : Math.min(100, Math.round((completedCount / totalChapters) * 100));

  return {
    totalChapters,
    completedCount,
    progressPercent,
    isCompleted,
    currentChapter,
    nextIncompleteChapter,
    chapterItems: course.chapters.map((chapter, index) => ({
      chapter,
      stepNumber: index + 1,
      isCompleted: completedChapterIds.has(chapter.id),
      isCurrent: chapter.id === currentChapter.id,
    })),
  };
}
