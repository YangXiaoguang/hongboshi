import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  CourseProductAssetGovernanceBatchTaskSchema,
  type CourseProductAssetGovernanceBatchTask,
} from "../../../shared/domain";
import { getDatabaseUrl, getSharedPostgresPool } from "../../db/postgres";
import {
  createCourseProductAssetGovernanceBatchTaskExecutionLock,
  isCourseProductAssetGovernanceBatchTaskExecutionLockExpired,
  type CourseProductAssetGovernanceBatchTaskExecutionLock,
  type CourseProductAssetGovernanceBatchTaskExecutionLockAcquireInput,
  type CourseProductAssetGovernanceBatchTaskExecutionLockReleaseInput,
} from "./courseProductAssetGovernanceBatchTaskExecutionLock";
import { PostgresCourseProductAssetGovernanceBatchTaskStore } from "./postgresCourseProductAssetGovernanceBatchTaskStore";

const CourseProductAssetGovernanceBatchTaskStoreFileSchema = z.object({
  version: z.literal(1),
  tasks: z.array(CourseProductAssetGovernanceBatchTaskSchema),
});

type CourseProductAssetGovernanceBatchTaskStoreFile = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskStoreFileSchema
>;

export interface CourseProductAssetGovernanceBatchTaskStore {
  listTasks(): Promise<CourseProductAssetGovernanceBatchTask[]>;
  getTask(
    taskId: string
  ): Promise<CourseProductAssetGovernanceBatchTask | undefined>;
  saveTask(
    task: CourseProductAssetGovernanceBatchTask
  ): Promise<CourseProductAssetGovernanceBatchTask>;
  acquireExecutionLock?(
    input: CourseProductAssetGovernanceBatchTaskExecutionLockAcquireInput
  ): Promise<CourseProductAssetGovernanceBatchTaskExecutionLock | undefined>;
  releaseExecutionLock?(
    input: CourseProductAssetGovernanceBatchTaskExecutionLockReleaseInput
  ): Promise<void>;
}

export class InMemoryCourseProductAssetGovernanceBatchTaskStore implements CourseProductAssetGovernanceBatchTaskStore {
  private tasks = new Map<string, CourseProductAssetGovernanceBatchTask>();
  private executionLocks = new Map<
    string,
    CourseProductAssetGovernanceBatchTaskExecutionLock
  >();

  constructor(tasks: CourseProductAssetGovernanceBatchTask[] = []) {
    tasks.forEach(task => {
      const parsed = CourseProductAssetGovernanceBatchTaskSchema.parse(task);
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

  async saveTask(task: CourseProductAssetGovernanceBatchTask) {
    const parsed = CourseProductAssetGovernanceBatchTaskSchema.parse(task);
    this.tasks.set(parsed.id, cloneTask(parsed));
    return cloneTask(parsed);
  }

  async acquireExecutionLock(
    input: CourseProductAssetGovernanceBatchTaskExecutionLockAcquireInput
  ) {
    const task = this.tasks.get(input.taskId);
    if (!task) return undefined;
    if (
      !canAcquireExecutionLock(
        task,
        this.executionLocks.get(task.id),
        input.now
      )
    ) {
      return undefined;
    }

    const lock = createCourseProductAssetGovernanceBatchTaskExecutionLock({
      task,
      input,
    });
    this.tasks.set(task.id, cloneTask(lock.task));
    this.executionLocks.set(task.id, lock);
    return cloneExecutionLock(lock);
  }

  async releaseExecutionLock(
    input: CourseProductAssetGovernanceBatchTaskExecutionLockReleaseInput
  ) {
    const lock = this.executionLocks.get(input.taskId);
    if (lock?.lockToken === input.lockToken) {
      this.executionLocks.delete(input.taskId);
    }
  }
}

export class JsonFileCourseProductAssetGovernanceBatchTaskStore implements CourseProductAssetGovernanceBatchTaskStore {
  private executionLocks = new Map<
    string,
    CourseProductAssetGovernanceBatchTaskExecutionLock
  >();

  constructor(
    private readonly filePath = resolveCourseProductAssetGovernanceBatchTaskStorePath()
  ) {}

  async listTasks() {
    return this.readFile().tasks.map(cloneTask).sort(sortTasks);
  }

  async getTask(taskId: string) {
    const task = this.readFile().tasks.find(item => item.id === taskId);
    return task ? cloneTask(task) : undefined;
  }

  async saveTask(task: CourseProductAssetGovernanceBatchTask) {
    const parsed = CourseProductAssetGovernanceBatchTaskSchema.parse(task);
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

  async acquireExecutionLock(
    input: CourseProductAssetGovernanceBatchTaskExecutionLockAcquireInput
  ) {
    const file = this.readFile();
    const task = file.tasks.find(item => item.id === input.taskId);
    if (!task) return undefined;
    if (
      !canAcquireExecutionLock(
        task,
        this.executionLocks.get(task.id),
        input.now
      )
    ) {
      return undefined;
    }

    const lock = createCourseProductAssetGovernanceBatchTaskExecutionLock({
      task,
      input,
    });
    const existingIndex = file.tasks.findIndex(item => item.id === task.id);
    file.tasks[existingIndex] = lock.task;
    this.writeFile(file);
    this.executionLocks.set(task.id, lock);
    return cloneExecutionLock(lock);
  }

  async releaseExecutionLock(
    input: CourseProductAssetGovernanceBatchTaskExecutionLockReleaseInput
  ) {
    const lock = this.executionLocks.get(input.taskId);
    if (lock?.lockToken === input.lockToken) {
      this.executionLocks.delete(input.taskId);
    }
  }

  clear() {
    this.writeFile(emptyCourseProductAssetGovernanceBatchTaskStoreFile());
  }

  private readFile(): CourseProductAssetGovernanceBatchTaskStoreFile {
    if (!fs.existsSync(this.filePath)) {
      return emptyCourseProductAssetGovernanceBatchTaskStoreFile();
    }

    try {
      return normalizeCourseProductAssetGovernanceBatchTaskStoreFile(
        JSON.parse(fs.readFileSync(this.filePath, "utf8"))
      );
    } catch {
      return emptyCourseProductAssetGovernanceBatchTaskStoreFile();
    }
  }

  private writeFile(file: CourseProductAssetGovernanceBatchTaskStoreFile) {
    const normalized =
      normalizeCourseProductAssetGovernanceBatchTaskStoreFile(file);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(normalized, null, 2), "utf8");
    fs.renameSync(tmpPath, this.filePath);
  }
}

let defaultStore: CourseProductAssetGovernanceBatchTaskStore | undefined;

export function getCourseProductAssetGovernanceBatchTaskStore() {
  defaultStore ??= createDefaultCourseProductAssetGovernanceBatchTaskStore();
  return defaultStore;
}

export function setCourseProductAssetGovernanceBatchTaskStore(
  store: CourseProductAssetGovernanceBatchTaskStore
) {
  defaultStore = store;
}

export function createDefaultCourseProductAssetGovernanceBatchTaskStore() {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST ||
    process.env.HONGBOSHI_COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_STORE ===
      "memory"
  ) {
    return new InMemoryCourseProductAssetGovernanceBatchTaskStore();
  }

  if (
    process.env.HONGBOSHI_COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_STORE ===
    "postgres"
  ) {
    if (!getDatabaseUrl()) {
      throw new Error(
        "HONGBOSHI_COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_STORE=postgres requires DATABASE_URL"
      );
    }
    return new PostgresCourseProductAssetGovernanceBatchTaskStore(
      getSharedPostgresPool()
    );
  }

  return new JsonFileCourseProductAssetGovernanceBatchTaskStore();
}

export function resolveCourseProductAssetGovernanceBatchTaskStorePath() {
  return path.resolve(
    process.cwd(),
    process.env.HONGBOSHI_COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_FILE ??
      ".hongboshi-data/course-product-asset-governance-batch-tasks.json"
  );
}

function normalizeCourseProductAssetGovernanceBatchTaskStoreFile(
  value: unknown
) {
  const parsed =
    CourseProductAssetGovernanceBatchTaskStoreFileSchema.safeParse(value);
  if (!parsed.success) {
    return emptyCourseProductAssetGovernanceBatchTaskStoreFile();
  }
  return {
    version: 1,
    tasks: parsed.data.tasks
      .map(task => CourseProductAssetGovernanceBatchTaskSchema.safeParse(task))
      .filter(
        (
          result
        ): result is z.ZodSafeParseSuccess<CourseProductAssetGovernanceBatchTask> =>
          result.success
      )
      .map(result => result.data),
  } satisfies CourseProductAssetGovernanceBatchTaskStoreFile;
}

function emptyCourseProductAssetGovernanceBatchTaskStoreFile(): CourseProductAssetGovernanceBatchTaskStoreFile {
  return {
    version: 1,
    tasks: [],
  };
}

function cloneTask(task: CourseProductAssetGovernanceBatchTask) {
  return CourseProductAssetGovernanceBatchTaskSchema.parse(
    JSON.parse(JSON.stringify(task))
  );
}

function cloneExecutionLock(
  lock: CourseProductAssetGovernanceBatchTaskExecutionLock
) {
  return {
    ...lock,
    task: cloneTask(lock.task),
  };
}

function canAcquireExecutionLock(
  task: CourseProductAssetGovernanceBatchTask,
  lock: CourseProductAssetGovernanceBatchTaskExecutionLock | undefined,
  now: string
) {
  if (
    lock &&
    !isCourseProductAssetGovernanceBatchTaskExecutionLockExpired({
      expiresAt: lock.expiresAt,
      now,
    })
  ) {
    return false;
  }
  return ["not_started", "failed", "running"].includes(task.executionStatus);
}

function sortTasks(
  left: CourseProductAssetGovernanceBatchTask,
  right: CourseProductAssetGovernanceBatchTask
) {
  return right.updatedAt.localeCompare(left.updatedAt);
}
