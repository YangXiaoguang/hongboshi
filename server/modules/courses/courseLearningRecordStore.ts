import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  CourseLearningRecordSchema,
  normalizeCourseLearningRecord,
  type CourseLearningRecord,
} from "../../../shared/domain";

type MaybePromise<T> = T | Promise<T>;

const CourseLearningRecordStoreFileSchema = z.object({
  version: z.literal(1),
  records: z.array(CourseLearningRecordSchema).default([]),
});

type CourseLearningRecordStoreFile = z.infer<
  typeof CourseLearningRecordStoreFileSchema
>;

export interface CourseLearningRecordStore {
  load(
    userId: string,
    courseId: number
  ): MaybePromise<CourseLearningRecord | undefined>;
  listByUser(userId: string): MaybePromise<CourseLearningRecord[]>;
  save(record: CourseLearningRecord): MaybePromise<CourseLearningRecord>;
  reset(record?: CourseLearningRecord): MaybePromise<void>;
  clear(): MaybePromise<void>;
}

function emptyStoreFile(): CourseLearningRecordStoreFile {
  return {
    version: 1,
    records: [],
  };
}

function cloneRecord(record: CourseLearningRecord): CourseLearningRecord {
  return CourseLearningRecordSchema.parse(JSON.parse(JSON.stringify(record)));
}

function normalizeRecords(records: unknown[]): CourseLearningRecord[] {
  return records
    .map(normalizeCourseLearningRecord)
    .filter((record): record is CourseLearningRecord => Boolean(record))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

function normalizeStoreFile(payload: unknown): CourseLearningRecordStoreFile {
  const parsed = CourseLearningRecordStoreFileSchema.safeParse(payload);
  if (!parsed.success) return emptyStoreFile();

  return {
    version: 1,
    records: normalizeRecords(parsed.data.records),
  };
}

export class InMemoryCourseLearningRecordStore implements CourseLearningRecordStore {
  private records = new Map<string, CourseLearningRecord>();

  load(userId: string, courseId: number): CourseLearningRecord | undefined {
    const record = this.records.get(recordKey(userId, courseId));
    return record ? cloneRecord(record) : undefined;
  }

  listByUser(userId: string): CourseLearningRecord[] {
    return normalizeRecords(
      Array.from(this.records.values()).filter(
        record => record.userId === userId
      )
    ).map(cloneRecord);
  }

  save(record: CourseLearningRecord): CourseLearningRecord {
    const normalized = CourseLearningRecordSchema.parse(record);
    this.records.set(
      recordKey(normalized.userId, normalized.courseId),
      cloneRecord(normalized)
    );
    return cloneRecord(normalized);
  }

  reset(record?: CourseLearningRecord) {
    this.records.clear();
    if (record) this.save(record);
  }

  clear() {
    this.records.clear();
  }
}

export class JsonFileCourseLearningRecordStore implements CourseLearningRecordStore {
  constructor(
    private readonly filePath = resolveCourseLearningRecordStorePath()
  ) {}

  load(userId: string, courseId: number): CourseLearningRecord | undefined {
    const record = this.readFile().records.find(
      item => item.userId === userId && item.courseId === courseId
    );
    return record ? cloneRecord(record) : undefined;
  }

  listByUser(userId: string): CourseLearningRecord[] {
    return normalizeRecords(
      this.readFile().records.filter(record => record.userId === userId)
    ).map(cloneRecord);
  }

  save(record: CourseLearningRecord): CourseLearningRecord {
    const normalized = CourseLearningRecordSchema.parse(record);
    const file = this.readFile();
    file.records = [
      normalized,
      ...file.records.filter(
        item =>
          !(
            item.userId === normalized.userId &&
            item.courseId === normalized.courseId
          )
      ),
    ];
    this.writeFile(file);
    return cloneRecord(normalized);
  }

  reset(record?: CourseLearningRecord) {
    this.writeFile({
      version: 1,
      records: record ? [CourseLearningRecordSchema.parse(record)] : [],
    });
  }

  clear() {
    this.writeFile(emptyStoreFile());
  }

  private readFile(): CourseLearningRecordStoreFile {
    if (!fs.existsSync(this.filePath)) return emptyStoreFile();

    try {
      return normalizeStoreFile(
        JSON.parse(fs.readFileSync(this.filePath, "utf8"))
      );
    } catch {
      return emptyStoreFile();
    }
  }

  private writeFile(file: CourseLearningRecordStoreFile) {
    const normalized = normalizeStoreFile(file);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(normalized, null, 2), "utf8");
    fs.renameSync(tmpPath, this.filePath);
  }
}

function recordKey(userId: string, courseId: number) {
  return `${userId}:${courseId}`;
}

export function resolveCourseLearningRecordStorePath() {
  return path.resolve(
    process.cwd(),
    process.env.HONGBOSHI_COURSE_LEARNING_RECORD_FILE ??
      ".hongboshi-data/course-learning-records.json"
  );
}

export function createDefaultCourseLearningRecordStore(): CourseLearningRecordStore {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST ||
    process.env.HONGBOSHI_COURSE_LEARNING_RECORD_STORE === "memory"
  ) {
    return new InMemoryCourseLearningRecordStore();
  }

  return new JsonFileCourseLearningRecordStore();
}
