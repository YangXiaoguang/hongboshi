import { describe, expect, it } from "vitest";
import { observeCourseProductAssetGovernanceBatchTaskQueue } from "./courseProductAssetGovernanceBatchTaskQueueObservation";
import { InMemoryCourseProductAssetGovernanceBatchTaskExecutionQueue } from "./courseProductAssetGovernanceBatchTaskExecutionQueue";
import { InMemoryCourseProductAssetGovernanceBatchTaskStore } from "./courseProductAssetGovernanceBatchTaskStore";

describe("course product asset governance batch task queue observation", () => {
  it("summarizes latest queue jobs and retryable failed tasks", async () => {
    const taskStore = new InMemoryCourseProductAssetGovernanceBatchTaskStore();
    const queue =
      new InMemoryCourseProductAssetGovernanceBatchTaskExecutionQueue();
    await taskStore.saveTask({
      id: "asset_governance_batch_task_retry",
      action: "acknowledge_issue",
      approvalStatus: "approved",
      query: {
        issueFilter: "pending_compliance",
        previewSize: 8,
      },
      candidateAssetCount: 1,
      previewItemCount: 1,
      eligibleActionCount: 1,
      manualReviewAssetCount: 0,
      softDeleteCandidateCount: 0,
      issueTypeDistribution: [
        { key: "pending_compliance", label: "待审核", count: 1 },
      ],
      proposedActionDistribution: [
        { key: "acknowledge_issue", label: "记录处理", count: 1 },
      ],
      candidateAssetIds: ["asset_1"],
      candidateIssueTypeByAssetId: {
        asset_1: ["pending_compliance"],
      },
      safetyNotes: ["只写审计，不修改素材 Store"],
      createdBy: "operator_1",
      createdByRoles: ["catalog_operator"],
      reason: "统一记录待审核素材处理计划",
      createdAt: "2026-05-22T09:50:00.000Z",
      updatedAt: "2026-05-22T09:55:00.000Z",
      reviewedBy: "operator_2",
      reviewedByRoles: ["catalog_operator"],
      reviewedAt: "2026-05-22T09:56:00.000Z",
      reviewAction: "approve",
      reviewReason: "审批前候选范围已复核",
      executionStatus: "failed",
      executionAttemptCount: 2,
      lastExecutionError: "audit append timeout",
      lastExecutionFailedAt: "2026-05-22T10:00:00.000Z",
    });

    await expect(
      queue.enqueue(
        {
          taskId: "asset_governance_batch_task_retry",
          requestedBy: "operator_3",
          now: "2026-05-22T10:01:00.000Z",
        },
        async () => {
          throw new Error("queue worker failed");
        }
      )
    ).resolves.toMatchObject({
      status: "queued",
    });
    await new Promise(resolve => setTimeout(resolve, 0));

    const observation = await observeCourseProductAssetGovernanceBatchTaskQueue(
      {
        query: {
          taskId: "asset_governance_batch_task_retry",
          limit: 5,
        },
        taskStore,
        queue,
        now: "2026-05-22T10:02:00.000Z",
      }
    );

    expect(observation.summary).toMatchObject({
      observedTaskCount: 1,
      failedJobCount: 1,
      failedTaskCount: 1,
      retryableTaskCount: 1,
      totalExecutionAttemptCount: 2,
    });
    expect(observation.items[0]).toMatchObject({
      taskId: "asset_governance_batch_task_retry",
      retryRecommended: true,
      lastExecutionError: "audit append timeout",
    });
  });
});
