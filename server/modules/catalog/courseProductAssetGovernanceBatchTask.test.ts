import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { courses } from "../../../shared/data/mockCourses";
import type {
  CourseProductAsset,
  CourseProductAssetGovernanceBatchTask,
} from "../../../shared/domain";
import { InMemoryCourseProductAssetStore } from "./courseProductAssetStore";
import { InMemoryCourseProductContentStore } from "./courseProductContentStore";
import {
  InMemoryCourseProductStore,
  courseProductFromCourse,
} from "./courseProductStore";
import {
  cancelCourseProductAssetGovernanceBatchTask,
  CourseProductAssetGovernanceBatchTaskPreflightError,
  createCourseProductAssetGovernanceBatchTask,
  previewCourseProductAssetGovernanceBatchTaskExecutionPlan,
  reviewCourseProductAssetGovernanceBatchTask,
} from "./courseProductAssetGovernanceBatchTask";
import {
  InMemoryCourseProductAssetGovernanceBatchTaskStore,
  JsonFileCourseProductAssetGovernanceBatchTaskStore,
} from "./courseProductAssetGovernanceBatchTaskStore";

const product = courseProductFromCourse(courses[0]);

function asset(patch: Partial<CourseProductAsset> = {}): CourseProductAsset {
  return {
    id: "asset_pending_1",
    productId: product.id,
    kind: "worksheet",
    title: "待审核课后练习",
    fileName: "worksheet.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1200,
    sourceType: "object_storage",
    objectKey: "course-assets/course_product_1/worksheet.pdf",
    contentHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    complianceStatus: "pending",
    downloadEnabled: false,
    uploadedBy: "operator_1",
    uploadedAt: "2026-05-21T09:00:00.000Z",
    updatedAt: "2026-05-21T09:00:00.000Z",
    ...patch,
  };
}

function stores() {
  return {
    productStore: new InMemoryCourseProductStore([product]),
    contentStore: new InMemoryCourseProductContentStore([]),
    assetStore: new InMemoryCourseProductAssetStore([asset()]),
    taskStore: new InMemoryCourseProductAssetGovernanceBatchTaskStore(),
  };
}

describe("course product asset governance batch tasks", () => {
  it("creates pending approval task drafts without mutating assets", async () => {
    const context = stores();
    const before = await context.assetStore.getAsset("asset_pending_1");

    const result = await createCourseProductAssetGovernanceBatchTask({
      ...context,
      actorId: "operator_1",
      actorRoles: ["catalog_operator"],
      request: {
        action: "acknowledge_issue",
        query: {
          issueFilter: "pending_compliance",
          previewSize: 5,
        },
        reason: "统一记录待审核素材处理计划",
      },
      now: "2026-05-21T10:00:00.000Z",
    });
    const after = await context.assetStore.getAsset("asset_pending_1");

    expect(result.task).toMatchObject({
      action: "acknowledge_issue",
      approvalStatus: "pending_approval",
      candidateAssetCount: 1,
      createdBy: "operator_1",
    });
    expect(result.tasks.summary.pendingApprovalCount).toBe(1);
    expect(after).toEqual(before);

    await expect(
      createCourseProductAssetGovernanceBatchTask({
        ...context,
        actorId: "operator_1",
        request: {
          action: "acknowledge_issue",
          query: {
            issueFilter: "pending_compliance",
            previewSize: 5,
          },
          reason: "重复创建同一筛选草案",
        },
        now: "2026-05-21T10:01:00.000Z",
      })
    ).rejects.toThrow("COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_DUPLICATE");
  });

  it("allows creators or admins to cancel pending approval task drafts", async () => {
    const context = stores();
    const created = await createCourseProductAssetGovernanceBatchTask({
      ...context,
      actorId: "operator_1",
      actorRoles: ["catalog_operator"],
      request: {
        action: "acknowledge_issue",
        query: {
          issueFilter: "pending_compliance",
          previewSize: 5,
        },
        reason: "统一记录待审核素材处理计划",
      },
      now: "2026-05-21T10:00:00.000Z",
    });

    await expect(
      cancelCourseProductAssetGovernanceBatchTask({
        taskId: created.task.id,
        actorId: "operator_2",
        actorRoles: ["catalog_operator"],
        taskStore: context.taskStore,
        request: {
          reason: "非创建人尝试取消",
        },
        now: "2026-05-21T10:02:00.000Z",
      })
    ).rejects.toThrow(
      "COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_CANCEL_FORBIDDEN"
    );

    const canceled = await cancelCourseProductAssetGovernanceBatchTask({
      taskId: created.task.id,
      actorId: "operator_1",
      actorRoles: ["catalog_operator"],
      taskStore: context.taskStore,
      request: {
        reason: "筛选口径需要重新确认",
      },
      now: "2026-05-21T10:03:00.000Z",
    });

    expect(canceled.task).toMatchObject({
      approvalStatus: "canceled",
      canceledBy: "operator_1",
      cancelReason: "筛选口径需要重新确认",
    });
    expect(canceled.tasks.summary.canceledCount).toBe(1);

    const recreated = await createCourseProductAssetGovernanceBatchTask({
      ...context,
      actorId: "operator_1",
      actorRoles: ["catalog_operator"],
      request: {
        action: "acknowledge_issue",
        query: {
          issueFilter: "pending_compliance",
          previewSize: 5,
        },
        reason: "重新创建待审批素材处理计划",
      },
      now: "2026-05-21T10:04:00.000Z",
    });

    const adminCanceled = await cancelCourseProductAssetGovernanceBatchTask({
      taskId: recreated.task.id,
      actorId: "admin_1",
      actorRoles: ["admin"],
      taskStore: context.taskStore,
      request: {
        reason: "管理员统一取消旧批次",
      },
      now: "2026-05-21T10:05:00.000Z",
    });

    expect(adminCanceled.task.canceledBy).toBe("admin_1");
  });

  it("reviews task drafts with separation of duties and preflight summaries", async () => {
    const context = stores();
    const created = await createCourseProductAssetGovernanceBatchTask({
      ...context,
      actorId: "operator_1",
      actorRoles: ["catalog_operator"],
      request: {
        action: "acknowledge_issue",
        query: {
          issueFilter: "pending_compliance",
          previewSize: 5,
        },
        reason: "统一记录待审核素材处理计划",
      },
      now: "2026-05-21T10:00:00.000Z",
    });

    await expect(
      reviewCourseProductAssetGovernanceBatchTask({
        ...context,
        taskId: created.task.id,
        actorId: "operator_1",
        actorRoles: ["catalog_operator"],
        request: {
          action: "approve",
          reason: "自己创建的草案不能自己审批",
        },
        now: "2026-05-21T10:01:00.000Z",
      })
    ).rejects.toThrow(
      "COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_REVIEW_SELF_FORBIDDEN"
    );

    const approved = await reviewCourseProductAssetGovernanceBatchTask({
      ...context,
      taskId: created.task.id,
      actorId: "operator_2",
      actorRoles: ["catalog_operator"],
      request: {
        action: "approve",
        reason: "候选范围和处理口径已完成交叉复核",
      },
      now: "2026-05-21T10:02:00.000Z",
    });

    expect(approved.task).toMatchObject({
      approvalStatus: "approved",
      reviewedBy: "operator_2",
      reviewAction: "approve",
      approvalPreflight: {
        requiresRecreate: false,
        currentCandidateAssetCount: 1,
      },
    });
    expect(approved.tasks.summary.approvedCount).toBe(1);

    const nextDraft = await createCourseProductAssetGovernanceBatchTask({
      ...context,
      actorId: "operator_1",
      actorRoles: ["catalog_operator"],
      request: {
        action: "acknowledge_issue",
        query: {
          issueFilter: "pending_compliance",
          previewSize: 5,
        },
        reason: "重新提交待审核素材处理计划",
      },
      now: "2026-05-21T10:03:00.000Z",
    });
    const rejected = await reviewCourseProductAssetGovernanceBatchTask({
      ...context,
      taskId: nextDraft.task.id,
      actorId: "operator_2",
      actorRoles: ["catalog_operator"],
      request: {
        action: "reject",
        reason: "筛选口径需要补充人工复核说明",
      },
      now: "2026-05-21T10:04:00.000Z",
    });

    expect(rejected.task).toMatchObject({
      approvalStatus: "rejected",
      reviewedBy: "operator_2",
      reviewAction: "reject",
      reviewReason: "筛选口径需要补充人工复核说明",
      reviewBeforeSummary: {
        approvalStatus: "pending_approval",
      },
      reviewAfterSummary: {
        approvalStatus: "rejected",
      },
    });
    expect(rejected.tasks.summary.rejectedCount).toBe(1);
  });

  it("keeps task drafts pending when approval preflight requires recreation", async () => {
    const context = stores();
    const created = await createCourseProductAssetGovernanceBatchTask({
      ...context,
      actorId: "operator_1",
      actorRoles: ["catalog_operator"],
      request: {
        action: "acknowledge_issue",
        query: {
          issueFilter: "pending_compliance",
          previewSize: 5,
        },
        reason: "统一记录待审核素材处理计划",
      },
      now: "2026-05-21T10:00:00.000Z",
    });

    const currentAsset = await context.assetStore.getAsset("asset_pending_1");
    if (!currentAsset) throw new Error("missing fixture asset");
    await context.assetStore.saveAsset({
      ...currentAsset,
      complianceStatus: "approved",
      downloadEnabled: true,
      updatedAt: "2026-05-21T10:01:00.000Z",
    });

    await expect(
      reviewCourseProductAssetGovernanceBatchTask({
        ...context,
        taskId: created.task.id,
        actorId: "operator_2",
        actorRoles: ["catalog_operator"],
        request: {
          action: "approve",
          reason: "候选范围和处理口径已完成交叉复核",
        },
        now: "2026-05-21T10:02:00.000Z",
      })
    ).rejects.toBeInstanceOf(
      CourseProductAssetGovernanceBatchTaskPreflightError
    );

    const storedTask = await context.taskStore.getTask(created.task.id);
    expect(storedTask).toMatchObject({
      approvalStatus: "pending_approval",
      approvalPreflight: {
        requiresRecreate: true,
        currentCandidateAssetCount: 0,
        disappearedAssetIds: ["asset_pending_1"],
      },
    });
  });

  it("generates read-only execution plans for approved task drafts", async () => {
    const context = stores();
    const created = await createCourseProductAssetGovernanceBatchTask({
      ...context,
      actorId: "operator_1",
      actorRoles: ["catalog_operator"],
      request: {
        action: "acknowledge_issue",
        query: {
          issueFilter: "pending_compliance",
          previewSize: 5,
        },
        reason: "统一记录待审核素材处理计划",
      },
      now: "2026-05-21T10:00:00.000Z",
    });
    const approved = await reviewCourseProductAssetGovernanceBatchTask({
      ...context,
      taskId: created.task.id,
      actorId: "operator_2",
      actorRoles: ["catalog_operator"],
      request: {
        action: "approve",
        reason: "候选范围和处理口径已完成交叉复核",
      },
      now: "2026-05-21T10:01:00.000Z",
    });
    const before = await context.assetStore.getAsset("asset_pending_1");

    const plan = await previewCourseProductAssetGovernanceBatchTaskExecutionPlan(
      {
        ...context,
        taskId: approved.task.id,
        actorId: "operator_2",
        now: "2026-05-21T10:02:00.000Z",
      }
    );
    const after = await context.assetStore.getAsset("asset_pending_1");

    expect(plan).toMatchObject({
      previewOnly: true,
      willModifyAssetStore: false,
      willWriteAuditEvents: false,
      summary: {
        plannedActionCount: 1,
        skippedActionCount: 0,
        estimatedAuditEventCount: 1,
      },
      items: [
        {
          assetId: "asset_pending_1",
          status: "planned",
          plannedAction: "acknowledge_issue",
          plannedIssueType: "pending_compliance",
          riskLevel: "medium",
        },
      ],
    });
    expect(plan.items[0].auditEventPreview).toMatchObject({
      action: "acknowledge_issue",
      issueType: "pending_compliance",
      reason: "统一记录待审核素材处理计划",
    });
    expect(after).toEqual(before);
  });

  it("rejects execution plans for non-approved task drafts", async () => {
    const context = stores();
    const created = await createCourseProductAssetGovernanceBatchTask({
      ...context,
      actorId: "operator_1",
      actorRoles: ["catalog_operator"],
      request: {
        action: "acknowledge_issue",
        query: {
          issueFilter: "pending_compliance",
          previewSize: 5,
        },
        reason: "统一记录待审核素材处理计划",
      },
      now: "2026-05-21T10:00:00.000Z",
    });

    await expect(
      previewCourseProductAssetGovernanceBatchTaskExecutionPlan({
        ...context,
        taskId: created.task.id,
        actorId: "operator_2",
        now: "2026-05-21T10:01:00.000Z",
      })
    ).rejects.toThrow(
      "COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_EXECUTION_PLAN_NOT_APPROVED"
    );

    const rejected = await reviewCourseProductAssetGovernanceBatchTask({
      ...context,
      taskId: created.task.id,
      actorId: "operator_2",
      actorRoles: ["catalog_operator"],
      request: {
        action: "reject",
        reason: "筛选口径需要补充人工复核说明",
      },
      now: "2026-05-21T10:02:00.000Z",
    });

    await expect(
      previewCourseProductAssetGovernanceBatchTaskExecutionPlan({
        ...context,
        taskId: rejected.task.id,
        actorId: "operator_2",
        now: "2026-05-21T10:03:00.000Z",
      })
    ).rejects.toThrow(
      "COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_EXECUTION_PLAN_NOT_APPROVED"
    );

    const blockedTask: CourseProductAssetGovernanceBatchTask = {
      ...created.task,
      id: "asset_governance_batch_task_blocked",
      approvalStatus: "approved",
      reviewedBy: "operator_2",
      reviewedByRoles: ["catalog_operator"],
      reviewedAt: "2026-05-21T10:04:00.000Z",
      reviewAction: "approve",
      reviewReason: "候选范围和处理口径已完成交叉复核",
      approvalPreflight: {
        generatedAt: "2026-05-21T10:04:00.000Z",
        originalCandidateAssetCount: 1,
        currentCandidateAssetCount: 0,
        candidateDeltaCount: -1,
        disappearedAssetIds: ["asset_pending_1"],
        newCandidateAssetIds: [],
        changedIssueTypeAssetIds: [],
        stillEligibleActionCount: 0,
        currentManualReviewAssetCount: 0,
        currentSoftDeleteCandidateCount: 0,
        currentIssueTypeDistribution: [],
        currentProposedActionDistribution: [],
        requiresRecreate: true,
        notes: ["审批前预检变化较大，请重新生成批量治理草案。"],
      },
      updatedAt: "2026-05-21T10:04:00.000Z",
    };
    await context.taskStore.saveTask(blockedTask);

    await expect(
      previewCourseProductAssetGovernanceBatchTaskExecutionPlan({
        ...context,
        taskId: blockedTask.id,
        actorId: "operator_2",
        now: "2026-05-21T10:05:00.000Z",
      })
    ).rejects.toThrow(
      "COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_EXECUTION_PLAN_RECREATE_REQUIRED"
    );
  });

  it("skips drifted candidates in execution plans without writing assets", async () => {
    const context = stores();
    const created = await createCourseProductAssetGovernanceBatchTask({
      ...context,
      actorId: "operator_1",
      actorRoles: ["catalog_operator"],
      request: {
        action: "acknowledge_issue",
        query: {
          issueFilter: "pending_compliance",
          previewSize: 5,
        },
        reason: "统一记录待审核素材处理计划",
      },
      now: "2026-05-21T10:00:00.000Z",
    });
    const approved = await reviewCourseProductAssetGovernanceBatchTask({
      ...context,
      taskId: created.task.id,
      actorId: "operator_2",
      actorRoles: ["catalog_operator"],
      request: {
        action: "approve",
        reason: "候选范围和处理口径已完成交叉复核",
      },
      now: "2026-05-21T10:01:00.000Z",
    });
    const currentAsset = await context.assetStore.getAsset("asset_pending_1");
    if (!currentAsset) throw new Error("missing fixture asset");
    await context.assetStore.saveAsset({
      ...currentAsset,
      complianceStatus: "approved",
      downloadEnabled: true,
      updatedAt: "2026-05-21T10:02:00.000Z",
    });
    const before = await context.assetStore.getAsset("asset_pending_1");

    const plan = await previewCourseProductAssetGovernanceBatchTaskExecutionPlan(
      {
        ...context,
        taskId: approved.task.id,
        actorId: "operator_2",
        now: "2026-05-21T10:03:00.000Z",
      }
    );
    const after = await context.assetStore.getAsset("asset_pending_1");

    expect(plan.summary).toMatchObject({
      plannedActionCount: 0,
      skippedActionCount: 1,
      disappearedAssetCount: 1,
      changedIssueTypeCount: 1,
    });
    expect(plan.items[0]).toMatchObject({
      status: "skipped",
      skipReason: "当前问题类型已不同于审批时的候选快照",
    });
    expect(after).toEqual(before);
  });

  it("persists task drafts in the JSON store", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hongboshi-batch-task-"));
    const filePath = path.join(dir, "tasks.json");
    const store = new JsonFileCourseProductAssetGovernanceBatchTaskStore(
      filePath
    );
    const task: CourseProductAssetGovernanceBatchTask = {
      id: "asset_governance_batch_task_test",
      action: "acknowledge_issue",
      approvalStatus: "pending_approval",
      query: {
        issueFilter: "pending_compliance",
        previewSize: 5,
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
      safetyNotes: ["待审批任务不会修改素材 Store"],
      createdBy: "operator_1",
      createdByRoles: ["catalog_operator"],
      reason: "保存 JSON 任务草案",
      createdAt: "2026-05-21T10:00:00.000Z",
      updatedAt: "2026-05-21T10:00:00.000Z",
    };

    await store.saveTask(task);
    const reloaded = new JsonFileCourseProductAssetGovernanceBatchTaskStore(
      filePath
    );

    expect(await reloaded.getTask(task.id)).toMatchObject({
      id: task.id,
      approvalStatus: "pending_approval",
    });
    expect(await reloaded.listTasks()).toHaveLength(1);

    fs.rmSync(dir, { recursive: true, force: true });
  });
});
