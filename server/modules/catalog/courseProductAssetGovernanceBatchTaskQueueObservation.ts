import {
  CourseProductAssetGovernanceBatchTaskQueueObservationQuerySchema,
  CourseProductAssetGovernanceBatchTaskQueueObservationResultSchema,
  type CourseProductAssetGovernanceBatchTask,
  type CourseProductAssetGovernanceBatchTaskExecutionJob,
  type CourseProductAssetGovernanceBatchTaskQueueObservationQuery,
} from "../../../shared/domain";
import {
  getCourseProductAssetGovernanceBatchTaskStore,
  type CourseProductAssetGovernanceBatchTaskStore,
} from "./courseProductAssetGovernanceBatchTaskStore";
import {
  getCourseProductAssetGovernanceBatchTaskExecutionQueue,
  type CourseProductAssetGovernanceBatchTaskExecutionQueue,
} from "./courseProductAssetGovernanceBatchTaskExecutionQueue";

export async function observeCourseProductAssetGovernanceBatchTaskQueue({
  query = {},
  taskStore = getCourseProductAssetGovernanceBatchTaskStore(),
  queue = getCourseProductAssetGovernanceBatchTaskExecutionQueue(),
  now = new Date().toISOString(),
}: {
  query?: Partial<CourseProductAssetGovernanceBatchTaskQueueObservationQuery>;
  taskStore?: CourseProductAssetGovernanceBatchTaskStore;
  queue?: CourseProductAssetGovernanceBatchTaskExecutionQueue;
  now?: string;
} = {}) {
  const parsedQuery =
    CourseProductAssetGovernanceBatchTaskQueueObservationQuerySchema.parse(
      query
    );
  const [allTasks, jobs] = await Promise.all([
    taskStore.listTasks(),
    queue.listJobs({
      taskId: parsedQuery.taskId,
      limit: parsedQuery.taskId ? parsedQuery.limit : parsedQuery.limit * 4,
    }),
  ]);
  const tasks = allTasks
    .filter(task => !parsedQuery.taskId || task.id === parsedQuery.taskId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, parsedQuery.limit);
  const taskById = new Map(tasks.map(task => [task.id, task]));
  const latestJobByTaskId = latestJobsByTaskId(jobs);
  const observedTaskIds = new Set([
    ...tasks.map(task => task.id),
    ...jobs.map(job => job.taskId),
  ]);
  const items = Array.from(observedTaskIds)
    .map(taskId =>
      buildQueueObservationItem({
        taskId,
        task: taskById.get(taskId),
        latestJob: latestJobByTaskId.get(taskId),
      })
    )
    .sort(sortQueueObservationItems)
    .slice(0, parsedQuery.limit);

  const summaryJobs = jobs.filter(job =>
    items.some(item => item.taskId === job.taskId)
  );
  const retryableTaskCount = items.filter(item => item.retryRecommended).length;

  return CourseProductAssetGovernanceBatchTaskQueueObservationResultSchema.parse(
    {
      generatedAt: now,
      query: parsedQuery,
      summary: {
        observedTaskCount: items.length,
        observedJobCount: summaryJobs.length,
        queuedJobCount: summaryJobs.filter(job => job.status === "queued")
          .length,
        runningJobCount: summaryJobs.filter(job => job.status === "running")
          .length,
        succeededJobCount: summaryJobs.filter(job => job.status === "succeeded")
          .length,
        failedJobCount: summaryJobs.filter(job => job.status === "failed")
          .length,
        runningTaskCount: items.filter(
          item => item.executionStatus === "running"
        ).length,
        failedTaskCount: items.filter(item => item.executionStatus === "failed")
          .length,
        retryableTaskCount,
        totalExecutionAttemptCount: items.reduce(
          (sum, item) => sum + item.executionAttemptCount,
          0
        ),
      },
      items,
      notes: buildQueueObservationNotes({
        hasJobs: jobs.length > 0,
        retryableTaskCount,
      }),
    }
  );
}

function buildQueueObservationItem({
  taskId,
  task,
  latestJob,
}: {
  taskId: string;
  task?: CourseProductAssetGovernanceBatchTask;
  latestJob?: CourseProductAssetGovernanceBatchTaskExecutionJob;
}) {
  const retryRecommended = Boolean(
    task?.executionStatus === "failed" || latestJob?.status === "failed"
  );

  return {
    taskId,
    task,
    latestJob,
    approvalStatus: task?.approvalStatus,
    executionStatus: task?.executionStatus,
    executionAttemptCount: task?.executionAttemptCount ?? 0,
    lastExecutionError: task?.lastExecutionError ?? latestJob?.lastError,
    lastExecutionFailedAt: task?.lastExecutionFailedAt,
    retryRecommended,
    operatorHint: buildOperatorHint({ task, latestJob, retryRecommended }),
  };
}

function latestJobsByTaskId(
  jobs: CourseProductAssetGovernanceBatchTaskExecutionJob[]
) {
  return jobs.reduce((result, job) => {
    const existing = result.get(job.taskId);
    if (!existing || job.enqueuedAt > existing.enqueuedAt) {
      result.set(job.taskId, job);
    }
    return result;
  }, new Map<string, CourseProductAssetGovernanceBatchTaskExecutionJob>());
}

function buildOperatorHint({
  task,
  latestJob,
  retryRecommended,
}: {
  task?: CourseProductAssetGovernanceBatchTask;
  latestJob?: CourseProductAssetGovernanceBatchTaskExecutionJob;
  retryRecommended: boolean;
}) {
  if (retryRecommended) return "检查失败原因后，可重新打开执行面板重试";
  if (latestJob?.status === "queued") return "任务已入队，等待 worker 接管";
  if (latestJob?.status === "running" || task?.executionStatus === "running") {
    return "任务正在执行，稍后刷新查看执行结果";
  }
  if (
    latestJob?.status === "succeeded" ||
    task?.executionStatus === "completed"
  ) {
    return "任务已执行成功，可查看执行明细和审计事件";
  }
  if (task?.approvalStatus === "approved") {
    return "任务已审批，可生成执行预案并确认执行";
  }
  if (task?.approvalStatus === "pending_approval") {
    return "任务仍在待审批状态，暂不会进入执行队列";
  }
  return "当前没有队列 job，可按任务状态继续处理";
}

function buildQueueObservationNotes({
  hasJobs,
  retryableTaskCount,
}: {
  hasJobs: boolean;
  retryableTaskCount: number;
}) {
  const notes: string[] = [
    "当前队列观测基于内存 job 状态，服务重启后只保留任务执行字段",
  ];
  if (!hasJobs) {
    notes.push("当前尚未观察到队列 job，可从已审批任务执行后再刷新");
  }
  if (retryableTaskCount > 0) {
    notes.push(`发现 ${retryableTaskCount} 个可重试任务，请优先查看失败原因`);
  }
  return notes;
}

function sortQueueObservationItems(
  left: ReturnType<typeof buildQueueObservationItem>,
  right: ReturnType<typeof buildQueueObservationItem>
) {
  const leftTime =
    left.latestJob?.enqueuedAt ?? left.task?.updatedAt ?? left.taskId;
  const rightTime =
    right.latestJob?.enqueuedAt ?? right.task?.updatedAt ?? right.taskId;
  return rightTime.localeCompare(leftTime);
}
