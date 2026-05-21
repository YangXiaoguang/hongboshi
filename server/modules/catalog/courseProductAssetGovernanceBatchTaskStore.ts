import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  CourseProductAssetGovernanceBatchTaskSchema,
  type CourseProductAssetGovernanceBatchTask,
} from "../../../shared/domain";

const CourseProductAssetGovernanceBatchTaskStoreFileSchema = z.object({
  version: z.literal(1),
  tasks: z.array(CourseProductAssetGovernanceBatchTaskSchema),
});

type CourseProductAssetGovernanceBatchTaskStoreFile = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskStoreFileSchema
>;

export interface CourseProductAssetGovernanceBatchTaskStore {
  listTasks(): Promise<CourseProductAssetGovernanceBatchTask[]>;
  getTask(taskId: string): Promise<CourseProductAssetGovernanceBatchTask | undefined>;
  saveTask(
    task: CourseProductAssetGovernanceBatchTask
  ): Promise<CourseProductAssetGovernanceBatchTask>;
}

export class InMemoryCourseProductAssetGovernanceBatchTaskStore
  implements CourseProductAssetGovernanceBatchTaskStore
{
  private tasks = new Map<string, CourseProductAssetGovernanceBatchTask>();

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
}

export class JsonFileCourseProductAssetGovernanceBatchTaskStore
  implements CourseProductAssetGovernanceBatchTaskStore
{
  constructor(
    private readonly filePath =
      resolveCourseProductAssetGovernanceBatchTaskStorePath()
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

let defaultStore:
  | CourseProductAssetGovernanceBatchTaskStore
  | undefined;

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
      .filter((result): result is z.ZodSafeParseSuccess<CourseProductAssetGovernanceBatchTask> => result.success)
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

function sortTasks(
  left: CourseProductAssetGovernanceBatchTask,
  right: CourseProductAssetGovernanceBatchTask
) {
  return right.updatedAt.localeCompare(left.updatedAt);
}
