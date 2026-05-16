import { z } from "zod";
import type { CourseChapter, CourseDetail } from "@shared/domain";

export const CoursePracticeRecordSchema = z.object({
  courseId: z.number().int().positive(),
  chapterId: z.string().min(1),
  note: z.string().default(""),
  isPracticeCompleted: z.boolean().default(false),
  source: z.enum(["local", "remote"]).default("local"),
  syncStatus: z
    .enum(["local_only", "sync_pending", "synced"])
    .default("local_only"),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  serverRecordId: z.string().min(1).optional(),
});

export const CoursePracticeStateSchema = z.object({
  records: z.record(z.string(), CoursePracticeRecordSchema).default({}),
});

export type CoursePracticeRecord = z.infer<typeof CoursePracticeRecordSchema>;
export type CoursePracticeState = z.infer<typeof CoursePracticeStateSchema>;

export interface CourseChapterMaterial {
  title: string;
  summary: string;
  keyPoints: string[];
  sourceLabel: string;
  materialStatus: "ready" | "placeholder";
}

export interface CoursePracticeSummary {
  totalChapters: number;
  draftedCount: number;
  completedCount: number;
  completedPercent: number;
  lastUpdatedAt?: string;
}

export function createEmptyCoursePracticeState(): CoursePracticeState {
  return {
    records: {},
  };
}

export function getCoursePracticeKey(
  courseId: number,
  chapterId: string
): string {
  return `${courseId}:${chapterId}`;
}

export function normalizeCoursePracticeState(
  state: unknown
): CoursePracticeState {
  const rawRecords =
    state &&
    typeof state === "object" &&
    "records" in state &&
    state.records &&
    typeof state.records === "object"
      ? state.records
      : undefined;
  if (!rawRecords) return createEmptyCoursePracticeState();

  const records = Object.values(rawRecords).reduce<
    CoursePracticeState["records"]
  >((nextRecords, rawRecord) => {
    const parsedRecord = CoursePracticeRecordSchema.safeParse(rawRecord);
    if (!parsedRecord.success) return nextRecords;

    const record = parsedRecord.data;
    const normalizedKey = getCoursePracticeKey(
      record.courseId,
      record.chapterId
    );
    nextRecords[normalizedKey] = {
      ...record,
      note: record.note.trim(),
    };
    return nextRecords;
  }, {});

  return { records };
}

export function normalizeCoursePracticeRecord(
  record: unknown
): CoursePracticeRecord | undefined {
  const parsed = CoursePracticeRecordSchema.safeParse(record);
  if (!parsed.success) return undefined;

  return {
    ...parsed.data,
    note: parsed.data.note.trim(),
  };
}

export function normalizeCoursePracticeRecords(
  records: unknown[]
): CoursePracticeState {
  const normalizedRecords = records.reduce<CoursePracticeState["records"]>(
    (nextRecords, rawRecord) => {
      const record = normalizeCoursePracticeRecord(rawRecord);
      if (!record) return nextRecords;

      const normalizedKey = getCoursePracticeKey(
        record.courseId,
        record.chapterId
      );
      nextRecords[normalizedKey] = {
        ...record,
        note: record.note.trim(),
      };
      return nextRecords;
    },
    {}
  );

  return { records: normalizedRecords };
}

export function getCoursePracticeRecord(
  state: CoursePracticeState,
  courseId: number,
  chapterId: string
): CoursePracticeRecord | undefined {
  return state.records[getCoursePracticeKey(courseId, chapterId)];
}

function createPracticeRecord(
  courseId: number,
  chapterId: string,
  now: string
): CoursePracticeRecord {
  return {
    courseId,
    chapterId,
    note: "",
    isPracticeCompleted: false,
    source: "local",
    syncStatus: "local_only",
    createdAt: now,
    updatedAt: now,
  };
}

export function saveCoursePracticeDraft(
  state: CoursePracticeState,
  courseId: number,
  chapterId: string,
  note: string,
  now = new Date().toISOString()
): CoursePracticeState {
  const key = getCoursePracticeKey(courseId, chapterId);
  const existing =
    state.records[key] ?? createPracticeRecord(courseId, chapterId, now);

  return {
    ...state,
    records: {
      ...state.records,
      [key]: CoursePracticeRecordSchema.parse({
        ...existing,
        note: note.trim(),
        syncStatus:
          existing.syncStatus === "synced" ? "sync_pending" : "local_only",
        updatedAt: now,
      }),
    },
  };
}

export function setCoursePracticeCompleted(
  state: CoursePracticeState,
  courseId: number,
  chapterId: string,
  isPracticeCompleted: boolean,
  now = new Date().toISOString()
): CoursePracticeState {
  const key = getCoursePracticeKey(courseId, chapterId);
  const existing =
    state.records[key] ?? createPracticeRecord(courseId, chapterId, now);

  return {
    ...state,
    records: {
      ...state.records,
      [key]: CoursePracticeRecordSchema.parse({
        ...existing,
        isPracticeCompleted,
        syncStatus:
          existing.syncStatus === "synced" ? "sync_pending" : "local_only",
        updatedAt: now,
      }),
    },
  };
}

export function createCourseChapterMaterial(
  course: CourseDetail,
  chapter: CourseChapter
): CourseChapterMaterial {
  const keyPoints = [
    chapter.description,
    course.outcomes[0] ?? course.summary,
    course.supportPath,
  ].filter((item, index, items) => item && items.indexOf(item) === index);

  return {
    title: `${chapter.title}讲义`,
    summary: chapter.description,
    keyPoints: keyPoints.slice(0, 3),
    sourceLabel: "课程详情内容",
    materialStatus: "placeholder",
  };
}

export function getCoursePracticeSummary(
  state: CoursePracticeState,
  course: CourseDetail
): CoursePracticeSummary {
  const chapterIds = new Set(course.chapters.map(chapter => chapter.id));
  const records = Object.values(state.records).filter(
    record => record.courseId === course.id && chapterIds.has(record.chapterId)
  );
  const draftedCount = records.filter(
    record => record.note.trim().length > 0
  ).length;
  const completedCount = records.filter(
    record => record.isPracticeCompleted
  ).length;
  const lastUpdatedAt = records
    .map(record => record.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    totalChapters: course.chapters.length,
    draftedCount,
    completedCount,
    completedPercent:
      course.chapters.length === 0
        ? 0
        : Math.round((completedCount / course.chapters.length) * 100),
    ...(lastUpdatedAt ? { lastUpdatedAt } : {}),
  };
}
