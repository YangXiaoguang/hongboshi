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
  createCourseProductAssetGovernanceBatchTask,
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
