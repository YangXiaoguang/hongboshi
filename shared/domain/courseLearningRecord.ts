import { z } from "zod";
import {
  DateTimeLikeSchema,
  LegacyNumericIdSchema,
  PageMetaSchema,
} from "./common";
import {
  CourseProgressSchema,
  CourseProgressStatusSchema,
  type CourseProgress,
} from "./course";

export const COURSE_LEARNING_RECORD_PAGE_SIZE = 20;

export const CourseLearningRecordSourceSchema = z.enum(["local", "remote"]);
export const CourseLearningSyncStatusSchema = z.enum([
  "local_only",
  "sync_pending",
  "synced",
]);
export const CourseLearningCertificateIssuerStatusSchema = z.enum([
  "preview",
  "pending_review",
  "issued",
]);

export const CourseLearningPracticeRecordSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  courseId: LegacyNumericIdSchema,
  chapterId: z.string().min(1),
  note: z.string().default(""),
  isPracticeCompleted: z.boolean().default(false),
  source: CourseLearningRecordSourceSchema.default("remote"),
  syncStatus: CourseLearningSyncStatusSchema.default("synced"),
  createdAt: DateTimeLikeSchema,
  updatedAt: DateTimeLikeSchema,
});

export const CourseLearningCompletionSnapshotSchema = z.object({
  submittedAt: DateTimeLikeSchema,
  completedAt: DateTimeLikeSchema,
  learningPathTitle: z.string().min(1),
  learningPathLabel: z.string().min(1).optional(),
  totalChapters: z.number().int().nonnegative(),
  completedChapters: z.number().int().nonnegative(),
  practiceDraftedCount: z.number().int().nonnegative(),
  practiceCompletedCount: z.number().int().nonnegative(),
});

export const CourseLearningCertificatePreviewSchema = z.object({
  courseId: LegacyNumericIdSchema,
  courseTitle: z.string().min(1),
  learningPathTitle: z.string().min(1),
  completedAt: DateTimeLikeSchema,
  totalChapters: z.number().int().nonnegative(),
  completedChapters: z.number().int().nonnegative(),
  practiceDraftedCount: z.number().int().nonnegative(),
  practiceCompletedCount: z.number().int().nonnegative(),
  source: CourseLearningRecordSourceSchema.default("remote"),
  syncStatus: CourseLearningSyncStatusSchema.default("synced"),
  issueStatus: z.enum(["preview", "issued"]).default("preview"),
  issuerStatus: CourseLearningCertificateIssuerStatusSchema.default("preview"),
  certificateId: z.string().min(1).optional(),
  issuedAt: DateTimeLikeSchema.optional(),
});

export const CourseLearningRecordSchema = z.object({
  userId: z.string().min(1),
  courseId: LegacyNumericIdSchema,
  progress: CourseProgressSchema.optional(),
  practiceRecords: z.array(CourseLearningPracticeRecordSchema).default([]),
  completion: CourseLearningCompletionSnapshotSchema.optional(),
  certificatePreview: CourseLearningCertificatePreviewSchema.optional(),
  updatedAt: DateTimeLikeSchema,
});

export const CourseLearningRecordResultSchema = z.object({
  record: CourseLearningRecordSchema,
  generatedAt: DateTimeLikeSchema,
});

export const CourseLearningRecordListResultSchema = z.object({
  records: z.array(CourseLearningRecordSchema),
  generatedAt: DateTimeLikeSchema,
  meta: PageMetaSchema.optional(),
});

export const CourseLearningProgressSyncRequestSchema = z.object({
  status: CourseProgressStatusSchema.default("in_progress"),
  completedChapterIds: z.array(z.string().min(1)).default([]),
  lastViewedAt: DateTimeLikeSchema.optional(),
  updatedAt: DateTimeLikeSchema.optional(),
});

export const CourseLearningPracticeSyncRequestSchema = z.object({
  note: z.string().max(5000).default(""),
  isPracticeCompleted: z.boolean().default(false),
  updatedAt: DateTimeLikeSchema.optional(),
});

export const CourseLearningCompletionSubmitRequestSchema = z.object({
  learningPathTitle: z.string().trim().min(1).max(120),
  learningPathLabel: z.string().trim().min(1).max(40).optional(),
  practiceDraftedCount: z.number().int().nonnegative().default(0),
  practiceCompletedCount: z.number().int().nonnegative().default(0),
  submittedAt: DateTimeLikeSchema.optional(),
});

export type CourseLearningRecordSource = z.infer<
  typeof CourseLearningRecordSourceSchema
>;
export type CourseLearningSyncStatus = z.infer<
  typeof CourseLearningSyncStatusSchema
>;
export type CourseLearningCertificateIssuerStatus = z.infer<
  typeof CourseLearningCertificateIssuerStatusSchema
>;
export type CourseLearningPracticeRecord = z.infer<
  typeof CourseLearningPracticeRecordSchema
>;
export type CourseLearningCompletionSnapshot = z.infer<
  typeof CourseLearningCompletionSnapshotSchema
>;
export type CourseLearningCertificatePreview = z.infer<
  typeof CourseLearningCertificatePreviewSchema
>;
export type CourseLearningRecord = z.infer<typeof CourseLearningRecordSchema>;
export type CourseLearningRecordResult = z.infer<
  typeof CourseLearningRecordResultSchema
>;
export type CourseLearningRecordListResult = z.infer<
  typeof CourseLearningRecordListResultSchema
>;
export type CourseLearningProgressSyncRequest = z.infer<
  typeof CourseLearningProgressSyncRequestSchema
>;
export type CourseLearningPracticeSyncRequest = z.infer<
  typeof CourseLearningPracticeSyncRequestSchema
>;
export type CourseLearningCompletionSubmitRequest = z.infer<
  typeof CourseLearningCompletionSubmitRequestSchema
>;

function uniqueChapterIds(chapterIds: string[]) {
  return Array.from(new Set(chapterIds.map(id => id.trim()).filter(Boolean)));
}

function assertKnownChapters(
  completedChapterIds: string[],
  allowedChapterIds: string[]
) {
  const allowed = new Set(allowedChapterIds);
  const invalidChapterIds = completedChapterIds.filter(id => !allowed.has(id));
  if (invalidChapterIds.length > 0) {
    throw new Error("COURSE_LEARNING_CHAPTER_NOT_FOUND");
  }
}

export function createEmptyCourseLearningRecord({
  userId,
  courseId,
  now = new Date().toISOString(),
}: {
  userId: string;
  courseId: number;
  now?: string;
}): CourseLearningRecord {
  return CourseLearningRecordSchema.parse({
    userId,
    courseId,
    practiceRecords: [],
    updatedAt: now,
  });
}

export function normalizeCourseLearningRecord(
  record: unknown
): CourseLearningRecord | undefined {
  const parsed = CourseLearningRecordSchema.safeParse(record);
  if (!parsed.success) return undefined;

  const practiceRecords = parsed.data.practiceRecords
    .map(item =>
      CourseLearningPracticeRecordSchema.parse({
        ...item,
        note: item.note.trim(),
      })
    )
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  return CourseLearningRecordSchema.parse({
    ...parsed.data,
    practiceRecords,
  });
}

export function upsertCourseLearningProgress({
  record,
  request,
  allowedChapterIds,
  totalChapterCount = allowedChapterIds.length,
  now = new Date().toISOString(),
}: {
  record: CourseLearningRecord;
  request: CourseLearningProgressSyncRequest;
  allowedChapterIds: string[];
  totalChapterCount?: number;
  now?: string;
}): CourseLearningRecord {
  const completedChapterIds = uniqueChapterIds(request.completedChapterIds);
  assertKnownChapters(completedChapterIds, allowedChapterIds);

  const isCompleted =
    totalChapterCount > 0 && completedChapterIds.length >= totalChapterCount;
  const updatedAt = request.updatedAt ?? now;
  const status = isCompleted
    ? "completed"
    : completedChapterIds.length > 0 || request.status === "completed"
      ? "in_progress"
      : request.status;
  const progress: CourseProgress = CourseProgressSchema.parse({
    userId: record.userId,
    courseId: record.courseId,
    status,
    completedChapterIds,
    lastViewedAt: request.lastViewedAt ?? updatedAt,
    updatedAt,
  });

  return CourseLearningRecordSchema.parse({
    ...record,
    progress,
    updatedAt,
  });
}

export function upsertCourseLearningPracticeRecord({
  record,
  chapterId,
  request,
  allowedChapterIds,
  now = new Date().toISOString(),
}: {
  record: CourseLearningRecord;
  chapterId: string;
  request: CourseLearningPracticeSyncRequest;
  allowedChapterIds: string[];
  now?: string;
}): CourseLearningRecord {
  assertKnownChapters([chapterId], allowedChapterIds);

  const updatedAt = request.updatedAt ?? now;
  const existing = record.practiceRecords.find(
    item => item.chapterId === chapterId
  );
  const practiceRecord = CourseLearningPracticeRecordSchema.parse({
    id:
      existing?.id ??
      `practice_${record.courseId}_${chapterId.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
    userId: record.userId,
    courseId: record.courseId,
    chapterId,
    note: request.note.trim(),
    isPracticeCompleted: request.isPracticeCompleted,
    source: "remote",
    syncStatus: "synced",
    createdAt: existing?.createdAt ?? updatedAt,
    updatedAt,
  });

  return CourseLearningRecordSchema.parse({
    ...record,
    practiceRecords: [
      practiceRecord,
      ...record.practiceRecords.filter(item => item.chapterId !== chapterId),
    ],
    updatedAt,
  });
}

export function submitCourseLearningCompletion({
  record,
  courseTitle,
  learningPathTitle,
  learningPathLabel,
  totalChapters,
  practiceDraftedCount,
  practiceCompletedCount,
  submittedAt = new Date().toISOString(),
}: {
  record: CourseLearningRecord;
  courseTitle: string;
  learningPathTitle: string;
  learningPathLabel?: string;
  totalChapters: number;
  practiceDraftedCount: number;
  practiceCompletedCount: number;
  submittedAt?: string;
}): CourseLearningRecord {
  if (record.progress?.status !== "completed") {
    throw new Error("COURSE_LEARNING_NOT_COMPLETED");
  }

  const completedAt = record.progress.updatedAt;
  const completedChapters = Math.min(
    totalChapters,
    record.progress.completedChapterIds.length
  );
  const completion = CourseLearningCompletionSnapshotSchema.parse({
    submittedAt,
    completedAt,
    learningPathTitle,
    learningPathLabel,
    totalChapters,
    completedChapters,
    practiceDraftedCount,
    practiceCompletedCount,
  });
  const certificatePreview = CourseLearningCertificatePreviewSchema.parse({
    courseId: record.courseId,
    courseTitle,
    learningPathTitle,
    completedAt,
    totalChapters,
    completedChapters,
    practiceDraftedCount,
    practiceCompletedCount,
    source: "remote",
    syncStatus: "synced",
    issueStatus: "preview",
    issuerStatus: "preview",
  });

  return CourseLearningRecordSchema.parse({
    ...record,
    completion,
    certificatePreview,
    updatedAt: submittedAt,
  });
}
