import { describe, expect, it } from "vitest";
import { InMemoryCourseProductAssetGovernanceBatchTaskExecutionQueue } from "./courseProductAssetGovernanceBatchTaskExecutionQueue";

describe("course product asset governance batch task execution queue", () => {
  it("runs tasks immediately and keeps a succeeded job status", async () => {
    const queue =
      new InMemoryCourseProductAssetGovernanceBatchTaskExecutionQueue();

    const result = await queue.runNow(
      {
        taskId: "asset_governance_batch_task_1",
        requestedBy: "operator_1",
        now: "2026-05-22T10:00:00.000Z",
      },
      async () => ({
        summary: {
          taskId: "asset_governance_batch_task_1",
          executionStatus: "completed" as const,
          plannedActionCount: 1,
          executedActionCount: 1,
          skippedActionCount: 0,
          failedActionCount: 0,
          auditEventCount: 1,
        },
      })
    );
    const jobs = await queue.getJobStatus(
      "asset_governance_batch_execution_job_asset_governance_batch_task_1_20260522100000"
    );

    expect(result.summary.auditEventCount).toBe(1);
    expect(jobs).toMatchObject({
      taskId: "asset_governance_batch_task_1",
      status: "succeeded",
      attemptCount: 1,
      summary: {
        executionStatus: "completed",
        auditEventCount: 1,
      },
    });
  });

  it("records failed queued jobs for later inspection", async () => {
    const queue =
      new InMemoryCourseProductAssetGovernanceBatchTaskExecutionQueue();

    const job = await queue.enqueue(
      {
        taskId: "asset_governance_batch_task_2",
        requestedBy: "operator_1",
        now: "2026-05-22T10:01:00.000Z",
      },
      async () => {
        throw new Error("queue worker failed");
      }
    );
    await new Promise(resolve => setTimeout(resolve, 0));
    const status = await queue.getJobStatus(job.id);

    expect(status).toMatchObject({
      status: "failed",
      attemptCount: 1,
      lastError: "queue worker failed",
    });
  });

  it("lists recent jobs by task id for queue observation", async () => {
    const queue =
      new InMemoryCourseProductAssetGovernanceBatchTaskExecutionQueue();

    await queue.runNow(
      {
        taskId: "asset_governance_batch_task_1",
        requestedBy: "operator_1",
        now: "2026-05-22T10:02:00.000Z",
      },
      async () => ({ ok: true })
    );
    await queue.runNow(
      {
        taskId: "asset_governance_batch_task_2",
        requestedBy: "operator_1",
        now: "2026-05-22T10:03:00.000Z",
      },
      async () => ({ ok: true })
    );

    const jobs = await queue.listJobs({
      taskId: "asset_governance_batch_task_2",
      limit: 1,
    });

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      taskId: "asset_governance_batch_task_2",
      status: "succeeded",
    });
  });
});
