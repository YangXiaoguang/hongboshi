import {
  CourseProductAssetGovernanceBatchTaskExecutionJobSchema,
  type CourseProductAssetGovernanceBatchTaskExecutionJob,
  type CourseProductAssetGovernanceBatchTaskExecutionResult,
  type CourseProductAssetGovernanceBatchTaskExecutionSummary,
} from "../../../shared/domain";

type BatchTaskExecutionQueueRunInput = {
  taskId: string;
  requestedBy: string;
  now?: string;
};

type BatchTaskExecutionRunner<T> = () => Promise<T>;

export interface CourseProductAssetGovernanceBatchTaskExecutionQueue {
  enqueue<T>(
    input: BatchTaskExecutionQueueRunInput,
    runner: BatchTaskExecutionRunner<T>
  ): Promise<CourseProductAssetGovernanceBatchTaskExecutionJob>;
  runNow<T>(
    input: BatchTaskExecutionQueueRunInput,
    runner: BatchTaskExecutionRunner<T>
  ): Promise<T>;
  getJobStatus(
    jobId: string
  ): Promise<CourseProductAssetGovernanceBatchTaskExecutionJob | undefined>;
}

export class InMemoryCourseProductAssetGovernanceBatchTaskExecutionQueue implements CourseProductAssetGovernanceBatchTaskExecutionQueue {
  private jobs = new Map<
    string,
    CourseProductAssetGovernanceBatchTaskExecutionJob
  >();

  async enqueue<T>(
    input: BatchTaskExecutionQueueRunInput,
    runner: BatchTaskExecutionRunner<T>
  ) {
    const job = this.createJob(input);
    this.jobs.set(job.id, job);
    void this.runExistingJob(job.id, runner).catch(() => undefined);
    return cloneJob(job);
  }

  async runNow<T>(
    input: BatchTaskExecutionQueueRunInput,
    runner: BatchTaskExecutionRunner<T>
  ) {
    const job = this.createJob(input);
    this.jobs.set(job.id, job);
    return this.runExistingJob(job.id, runner);
  }

  async getJobStatus(jobId: string) {
    const job = this.jobs.get(jobId);
    return job ? cloneJob(job) : undefined;
  }

  clear() {
    this.jobs.clear();
  }

  private createJob(
    input: BatchTaskExecutionQueueRunInput
  ): CourseProductAssetGovernanceBatchTaskExecutionJob {
    const now = input.now ?? new Date().toISOString();
    return CourseProductAssetGovernanceBatchTaskExecutionJobSchema.parse({
      id: createJobId(input.taskId, now),
      taskId: input.taskId,
      status: "queued",
      requestedBy: input.requestedBy,
      enqueuedAt: now,
      attemptCount: 0,
    });
  }

  private async runExistingJob<T>(
    jobId: string,
    runner: BatchTaskExecutionRunner<T>
  ) {
    const queued = this.jobs.get(jobId);
    if (!queued)
      throw new Error("COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_JOB_NOT_FOUND");
    const startedAt = new Date().toISOString();
    this.jobs.set(
      jobId,
      CourseProductAssetGovernanceBatchTaskExecutionJobSchema.parse({
        ...queued,
        status: "running",
        startedAt,
        attemptCount: queued.attemptCount + 1,
      })
    );

    try {
      const result = await runner();
      const finishedAt = new Date().toISOString();
      const running = this.jobs.get(jobId);
      if (running) {
        this.jobs.set(
          jobId,
          CourseProductAssetGovernanceBatchTaskExecutionJobSchema.parse({
            ...running,
            status: "succeeded",
            finishedAt,
            summary: extractExecutionSummary(result),
          })
        );
      }
      return result;
    } catch (err) {
      const finishedAt = new Date().toISOString();
      const running = this.jobs.get(jobId);
      if (running) {
        this.jobs.set(
          jobId,
          CourseProductAssetGovernanceBatchTaskExecutionJobSchema.parse({
            ...running,
            status: "failed",
            finishedAt,
            lastError:
              err instanceof Error ? err.message.slice(0, 240) : "任务执行失败",
          })
        );
      }
      throw err;
    }
  }
}

let defaultQueue:
  | CourseProductAssetGovernanceBatchTaskExecutionQueue
  | undefined;

export function getCourseProductAssetGovernanceBatchTaskExecutionQueue() {
  defaultQueue ??=
    new InMemoryCourseProductAssetGovernanceBatchTaskExecutionQueue();
  return defaultQueue;
}

export function setCourseProductAssetGovernanceBatchTaskExecutionQueue(
  queue: CourseProductAssetGovernanceBatchTaskExecutionQueue
) {
  defaultQueue = queue;
}

function extractExecutionSummary(
  result: unknown
): CourseProductAssetGovernanceBatchTaskExecutionSummary | undefined {
  const maybeResult =
    result as Partial<CourseProductAssetGovernanceBatchTaskExecutionResult>;
  return maybeResult.summary;
}

function cloneJob(job: CourseProductAssetGovernanceBatchTaskExecutionJob) {
  return CourseProductAssetGovernanceBatchTaskExecutionJobSchema.parse(
    JSON.parse(JSON.stringify(job))
  );
}

function createJobId(taskId: string, now: string) {
  return [
    "asset_governance_batch_execution_job",
    taskId.replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 48),
    now.replace(/[^0-9]/g, "").slice(0, 14),
  ].join("_");
}
