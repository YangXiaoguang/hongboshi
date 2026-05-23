import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  CourseProductPublishQueueBatchTaskSchema,
  type CourseProductPublishQueueBatchTask,
} from "../../../shared/domain";

const CourseProductPublishQueueBatchTaskStoreFileSchema = z.object({
  version: z.literal(1),
  tasks: z.array(CourseProductPublishQueueBatchTaskSchema),
});

type CourseProductPublishQueueBatchTaskStoreFile = z.infer<
  typeof CourseProductPublishQueueBatchTaskStoreFileSchema
>;

export interface CourseProductPublishQueueBatchTaskStore {
  listTasks(): Promise<CourseProductPublishQueueBatchTask[]>;
  getTask(
    taskId: string
  ): Promise<CourseProductPublishQueueBatchTask | undefined>;
  saveTask(
    task: CourseProductPublishQueueBatchTask
  ): Promise<CourseProductPublishQueueBatchTask>;
}

export class InMemoryCourseProductPublishQueueBatchTaskStore implements CourseProductPublishQueueBatchTaskStore {
  private tasks = new Map<string, CourseProductPublishQueueBatchTask>();

  constructor(tasks: CourseProductPublishQueueBatchTask[] = []) {
    tasks.forEach(task => {
      const parsed = CourseProductPublishQueueBatchTaskSchema.parse(task);
      this.tasks.set(parsed.id, cloneTask(parsed));
    });
  }

  async listTasks() {
    return Array.from(this.tasks.values()).map(cloneTask).sort(sortTasks);
  }

  async getTask(taskId: string) {
    const task = this.tasks.get(taskId);
    return task ? cloneTask(task) : undefined;
  }

  async saveTask(task: CourseProductPublishQueueBatchTask) {
    const parsed = CourseProductPublishQueueBatchTaskSchema.parse(task);
    this.tasks.set(parsed.id, cloneTask(parsed));
    return cloneTask(parsed);
  }
}

export class JsonFileCourseProductPublishQueueBatchTaskStore implements CourseProductPublishQueueBatchTaskStore {
  constructor(
    private readonly filePath = resolveCourseProductPublishQueueBatchTaskStorePath()
  ) {}

  async listTasks() {
    return this.readFile().tasks.map(cloneTask).sort(sortTasks);
  }

  async getTask(taskId: string) {
    const task = this.readFile().tasks.find(item => item.id === taskId);
    return task ? cloneTask(task) : undefined;
  }

  async saveTask(task: CourseProductPublishQueueBatchTask) {
    const parsed = CourseProductPublishQueueBatchTaskSchema.parse(task);
    const file = this.readFile();
    const existingIndex = file.tasks.findIndex(item => item.id === parsed.id);
    if (existingIndex >= 0) {
      file.tasks[existingIndex] = parsed;
    } else {
      file.tasks.push(parsed);
    }
    this.writeFile(file);
    return cloneTask(parsed);
  }

  clear() {
    this.writeFile(emptyCourseProductPublishQueueBatchTaskStoreFile());
  }

  private readFile(): CourseProductPublishQueueBatchTaskStoreFile {
    if (!fs.existsSync(this.filePath)) {
      return emptyCourseProductPublishQueueBatchTaskStoreFile();
    }

    try {
      return normalizeCourseProductPublishQueueBatchTaskStoreFile(
        JSON.parse(fs.readFileSync(this.filePath, "utf8"))
      );
    } catch {
      return emptyCourseProductPublishQueueBatchTaskStoreFile();
    }
  }

  private writeFile(file: CourseProductPublishQueueBatchTaskStoreFile) {
    const normalized =
      normalizeCourseProductPublishQueueBatchTaskStoreFile(file);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(normalized, null, 2), "utf8");
    fs.renameSync(tmpPath, this.filePath);
  }
}

let defaultStore: CourseProductPublishQueueBatchTaskStore | undefined;

export function getCourseProductPublishQueueBatchTaskStore() {
  defaultStore ??= createDefaultCourseProductPublishQueueBatchTaskStore();
  return defaultStore;
}

export function setCourseProductPublishQueueBatchTaskStore(
  store: CourseProductPublishQueueBatchTaskStore
) {
  defaultStore = store;
}

export function createDefaultCourseProductPublishQueueBatchTaskStore() {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST ||
    process.env.HONGBOSHI_COURSE_PRODUCT_PUBLISH_QUEUE_BATCH_TASK_STORE ===
      "memory"
  ) {
    return new InMemoryCourseProductPublishQueueBatchTaskStore();
  }

  return new JsonFileCourseProductPublishQueueBatchTaskStore();
}

export function resolveCourseProductPublishQueueBatchTaskStorePath() {
  return path.resolve(
    process.cwd(),
    process.env.HONGBOSHI_COURSE_PRODUCT_PUBLISH_QUEUE_BATCH_TASK_FILE ??
      ".hongboshi-data/course-product-publish-queue-batch-tasks.json"
  );
}

function normalizeCourseProductPublishQueueBatchTaskStoreFile(value: unknown) {
  const parsed =
    CourseProductPublishQueueBatchTaskStoreFileSchema.safeParse(value);
  if (!parsed.success) {
    return emptyCourseProductPublishQueueBatchTaskStoreFile();
  }

  return {
    version: 1,
    tasks: parsed.data.tasks
      .map(task => CourseProductPublishQueueBatchTaskSchema.safeParse(task))
      .filter(
        (
          result
        ): result is z.ZodSafeParseSuccess<CourseProductPublishQueueBatchTask> =>
          result.success
      )
      .map(result => result.data),
  } satisfies CourseProductPublishQueueBatchTaskStoreFile;
}

function emptyCourseProductPublishQueueBatchTaskStoreFile(): CourseProductPublishQueueBatchTaskStoreFile {
  return {
    version: 1,
    tasks: [],
  };
}

function cloneTask(task: CourseProductPublishQueueBatchTask) {
  return CourseProductPublishQueueBatchTaskSchema.parse(
    JSON.parse(JSON.stringify(task))
  );
}

function sortTasks(
  left: CourseProductPublishQueueBatchTask,
  right: CourseProductPublishQueueBatchTask
) {
  return right.updatedAt.localeCompare(left.updatedAt);
}
