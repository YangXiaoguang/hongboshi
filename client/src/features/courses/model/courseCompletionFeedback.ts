import { z } from "zod";
import type { Course, CourseDetail, CourseProgress } from "@shared/domain";
import type { CourseLearningPath } from "./coursePath";
import type { CourseLearningSession } from "./courseLearningSession";
import type { CoursePracticeSummary } from "./coursePractice";

export const CourseCompletionCertificatePreviewSchema = z.object({
  courseId: z.number().int().positive(),
  courseTitle: z.string().min(1),
  learningPathTitle: z.string().min(1),
  completedAt: z.string().min(1),
  totalChapters: z.number().int().nonnegative(),
  completedChapters: z.number().int().nonnegative(),
  practiceDraftedCount: z.number().int().nonnegative(),
  practiceCompletedCount: z.number().int().nonnegative(),
  source: z.enum(["local", "remote"]).default("local"),
  syncStatus: z
    .enum(["local_only", "sync_pending", "synced"])
    .default("local_only"),
  issueStatus: z.enum(["preview", "issued"]).default("preview"),
  certificateId: z.string().min(1).optional(),
  issuedAt: z.string().min(1).optional(),
});

export type CourseCompletionCertificatePreview = z.infer<
  typeof CourseCompletionCertificatePreviewSchema
>;

export type CourseCompletionPracticeTone = "empty" | "partial" | "complete";

export interface CourseCompletionMetric {
  label: string;
  value: string;
  description: string;
}

export interface CourseCompletionPracticeInsight {
  tone: CourseCompletionPracticeTone;
  title: string;
  description: string;
}

export interface CourseCompletionNextStep {
  kind: "next_course" | "growth_space";
  title: string;
  description: string;
  actionLabel: string;
  course?: Course;
}

export interface CourseCompletionFeedback {
  title: string;
  description: string;
  completedAt: string;
  learningPathTitle: string;
  metrics: CourseCompletionMetric[];
  practiceInsight: CourseCompletionPracticeInsight;
  nextStep: CourseCompletionNextStep;
  certificatePreview: CourseCompletionCertificatePreview;
}

export interface CourseCompletionFeedbackInput {
  course: CourseDetail;
  session: CourseLearningSession;
  practiceSummary: CoursePracticeSummary;
  learningPath: CourseLearningPath;
  progress?: CourseProgress;
  nextCourse?: Course;
  now?: string;
}

function getCompletionTime({
  progress,
  now,
}: Pick<CourseCompletionFeedbackInput, "progress" | "now">): string {
  return progress?.updatedAt ?? now ?? new Date().toISOString();
}

function createPracticeInsight(
  practiceSummary: CoursePracticeSummary
): CourseCompletionPracticeInsight {
  if (
    practiceSummary.completedCount === 0 &&
    practiceSummary.draftedCount === 0
  ) {
    return {
      tone: "empty",
      title: "练习记录还没有沉淀",
      description:
        "课程已经完成，可以先回到任一章节补一条练习记录，再把这门课变成可复盘的成长资料。",
    };
  }

  if (practiceSummary.completedCount >= practiceSummary.totalChapters) {
    return {
      tone: "complete",
      title: "练习记录已经完整",
      description:
        "每个章节都留下了练习完成状态，后续生成学习报告时可以直接使用这些本地沉淀。",
    };
  }

  return {
    tone: "partial",
    title: "练习记录已开始沉淀",
    description: `已保存 ${practiceSummary.draftedCount} 章草稿，完成 ${practiceSummary.completedCount} 章练习，可以继续补齐余下章节。`,
  };
}

function createNextStep(nextCourse?: Course): CourseCompletionNextStep {
  if (nextCourse) {
    return {
      kind: "next_course",
      title: nextCourse.title,
      description: `继续同一学习路径，下一门建议从「${nextCourse.title}」开始。`,
      actionLabel: "学习下一门",
      course: nextCourse,
    };
  }

  return {
    kind: "growth_space",
    title: "回到成长空间整理记录",
    description:
      "当前路径暂时没有下一门自动建议，可以先回到成长空间查看已完成课程和练习记录。",
    actionLabel: "查看成长空间",
  };
}

export function createCourseCompletionFeedback({
  course,
  session,
  practiceSummary,
  learningPath,
  progress,
  nextCourse,
  now,
}: CourseCompletionFeedbackInput): CourseCompletionFeedback | undefined {
  if (!session.isCompleted) return undefined;

  const completedAt = getCompletionTime({ progress, now });
  const certificatePreview = CourseCompletionCertificatePreviewSchema.parse({
    courseId: course.id,
    courseTitle: course.title,
    learningPathTitle: learningPath.title,
    completedAt,
    totalChapters: session.totalChapters,
    completedChapters: session.completedCount,
    practiceDraftedCount: practiceSummary.draftedCount,
    practiceCompletedCount: practiceSummary.completedCount,
    source: "local",
    syncStatus: "local_only",
    issueStatus: "preview",
  });

  return {
    title: "这门课程已经完成",
    description:
      "章节进度、练习记录和路径建议已经整理好，可以继续复习，也可以进入下一门课程。",
    completedAt,
    learningPathTitle: learningPath.title,
    metrics: [
      {
        label: "章节完成",
        value: `${session.completedCount}/${session.totalChapters}`,
        description: "已完成当前课程全部章节",
      },
      {
        label: "练习完成",
        value: `${practiceSummary.completedCount}/${practiceSummary.totalChapters}`,
        description: "独立于章节进度保存",
      },
      {
        label: "学习路径",
        value: learningPath.label,
        description: learningPath.paceLabel,
      },
    ],
    practiceInsight: createPracticeInsight(practiceSummary),
    nextStep: createNextStep(nextCourse),
    certificatePreview,
  };
}
