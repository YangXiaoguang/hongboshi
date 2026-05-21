import { createHash, randomUUID } from "crypto";
import {
  CourseProductAssetGovernanceBatchTaskCreateRequestSchema,
  CourseProductAssetGovernanceBatchTaskCancelRequestSchema,
  CourseProductAssetGovernanceBatchTaskListQuerySchema,
  CourseProductAssetGovernanceBatchTaskListResultSchema,
  CourseProductAssetGovernanceBatchTaskMutationResultSchema,
  CourseProductAssetGovernanceBatchTaskSchema,
  type CourseProductAssetGovernanceBatchDraftQuery,
  type CourseProductAssetGovernanceBatchTask,
  type CourseProductAssetGovernanceBatchTaskCreateRequest,
  type CourseProductAssetGovernanceBatchTaskListQuery,
} from "../../../shared/domain";
import {
  getCourseProductAssetStore,
  type CourseProductAssetStore,
} from "./courseProductAssetStore";
import {
  getCourseProductContentStore,
  type CourseProductContentStore,
} from "./courseProductContentStore";
import {
  getCourseProductStore,
  type CourseProductStore,
} from "./courseProductStore";
import { previewCourseProductAssetGovernanceBatchDraft } from "./courseProductAssetGovernanceHistory";
import {
  getCourseProductAssetGovernanceBatchTaskStore,
  type CourseProductAssetGovernanceBatchTaskStore,
} from "./courseProductAssetGovernanceBatchTaskStore";

export async function listCourseProductAssetGovernanceBatchTasks({
  query,
  store = getCourseProductAssetGovernanceBatchTaskStore(),
  now = new Date().toISOString(),
}: {
  query?: Partial<CourseProductAssetGovernanceBatchTaskListQuery>;
  store?: CourseProductAssetGovernanceBatchTaskStore;
  now?: string;
} = {}) {
  const parsedQuery = CourseProductAssetGovernanceBatchTaskListQuerySchema.parse(
    query ?? {}
  );
  const allTasks = await store.listTasks();
  const filteredTasks = allTasks.filter(task =>
    matchesBatchTaskListQuery(task, parsedQuery)
  );
  const totalPages =
    filteredTasks.length === 0
      ? 0
      : Math.ceil(filteredTasks.length / parsedQuery.pageSize);
  const page = Math.min(parsedQuery.page, Math.max(1, totalPages || 1));
  const start = (page - 1) * parsedQuery.pageSize;

  return CourseProductAssetGovernanceBatchTaskListResultSchema.parse({
    generatedAt: now,
    query: {
      ...parsedQuery,
      page,
    },
    summary: {
      totalTaskCount: allTasks.length,
      pendingApprovalCount: allTasks.filter(
        task => task.approvalStatus === "pending_approval"
      ).length,
      canceledCount: allTasks.filter(task => task.approvalStatus === "canceled")
        .length,
    },
    items: filteredTasks.slice(start, start + parsedQuery.pageSize),
    meta: {
      page,
      pageSize: parsedQuery.pageSize,
      total: filteredTasks.length,
      totalPages,
    },
  });
}

export async function createCourseProductAssetGovernanceBatchTask({
  request,
  actorId,
  actorRoles = [],
  productStore = getCourseProductStore(),
  contentStore = getCourseProductContentStore(),
  assetStore = getCourseProductAssetStore(),
  taskStore = getCourseProductAssetGovernanceBatchTaskStore(),
  now = new Date().toISOString(),
}: {
  request: CourseProductAssetGovernanceBatchTaskCreateRequest;
  actorId: string;
  actorRoles?: string[];
  productStore?: CourseProductStore;
  contentStore?: CourseProductContentStore;
  assetStore?: CourseProductAssetStore;
  taskStore?: CourseProductAssetGovernanceBatchTaskStore;
  now?: string;
}) {
  const parsed = CourseProductAssetGovernanceBatchTaskCreateRequestSchema.parse(
    request
  );
  const preview = await previewCourseProductAssetGovernanceBatchDraft({
    query: parsed.query,
    requestedBy: actorId,
    productStore,
    contentStore,
    assetStore,
    now,
  });
  if (preview.summary.candidateAssetCount === 0) {
    throw new Error("COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_EMPTY");
  }

  const dedupeKey = batchTaskDedupeKey(parsed);
  const existingPendingTask = (await taskStore.listTasks()).find(
    task =>
      task.approvalStatus === "pending_approval" &&
      batchTaskDedupeKey(task) === dedupeKey
  );
  if (existingPendingTask) {
    throw new Error("COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_DUPLICATE");
  }

  const task = await taskStore.saveTask(
    CourseProductAssetGovernanceBatchTaskSchema.parse({
      id: createBatchTaskId(now, dedupeKey),
      action: parsed.action,
      approvalStatus: "pending_approval",
      query: preview.query,
      candidateAssetCount: preview.summary.candidateAssetCount,
      previewItemCount: preview.summary.previewItemCount,
      eligibleActionCount: preview.summary.eligibleActionCount,
      manualReviewAssetCount: preview.summary.manualReviewAssetCount,
      softDeleteCandidateCount: preview.summary.softDeleteCandidateCount,
      issueTypeDistribution: preview.summary.issueTypeDistribution,
      proposedActionDistribution: preview.summary.proposedActionDistribution,
      safetyNotes: preview.safetyNotes,
      createdBy: actorId,
      createdByRoles: actorRoles,
      reason: parsed.reason,
      note: parsed.note,
      createdAt: now,
      updatedAt: now,
    })
  );

  return batchTaskMutationResult({
    task,
    taskStore,
    now,
  });
}

export async function cancelCourseProductAssetGovernanceBatchTask({
  taskId,
  request,
  actorId,
  actorRoles = [],
  taskStore = getCourseProductAssetGovernanceBatchTaskStore(),
  now = new Date().toISOString(),
}: {
  taskId: string;
  request: unknown;
  actorId: string;
  actorRoles?: string[];
  taskStore?: CourseProductAssetGovernanceBatchTaskStore;
  now?: string;
}) {
  const parsed =
    CourseProductAssetGovernanceBatchTaskCancelRequestSchema.parse(request);
  const task = await taskStore.getTask(taskId);
  if (!task) {
    throw new Error("COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_NOT_FOUND");
  }
  if (task.approvalStatus !== "pending_approval") {
    throw new Error("COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_NOT_CANCELABLE");
  }
  if (task.createdBy !== actorId && !actorRoles.includes("admin")) {
    throw new Error("COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_CANCEL_FORBIDDEN");
  }

  const next = await taskStore.saveTask(
    CourseProductAssetGovernanceBatchTaskSchema.parse({
      ...task,
      approvalStatus: "canceled",
      canceledBy: actorId,
      canceledAt: now,
      cancelReason: parsed.reason,
      updatedAt: now,
    })
  );

  return batchTaskMutationResult({
    task: next,
    taskStore,
    now,
  });
}

function matchesBatchTaskListQuery(
  task: CourseProductAssetGovernanceBatchTask,
  query: CourseProductAssetGovernanceBatchTaskListQuery
) {
  if (
    query.approvalStatus !== "all" &&
    task.approvalStatus !== query.approvalStatus
  ) {
    return false;
  }
  if (query.createdBy && task.createdBy !== query.createdBy) return false;
  return true;
}

async function batchTaskMutationResult({
  task,
  taskStore,
  now,
}: {
  task: CourseProductAssetGovernanceBatchTask;
  taskStore: CourseProductAssetGovernanceBatchTaskStore;
  now: string;
}) {
  return CourseProductAssetGovernanceBatchTaskMutationResultSchema.parse({
    task,
    tasks: await listCourseProductAssetGovernanceBatchTasks({
      query: {
        page: 1,
        pageSize: 5,
      },
      store: taskStore,
      now,
    }),
  });
}

function batchTaskDedupeKey(
  value:
    | Pick<CourseProductAssetGovernanceBatchTask, "action" | "query">
    | CourseProductAssetGovernanceBatchTaskCreateRequest
) {
  return stableHash({
    action: value.action,
    query: normalizeBatchTaskQuery(value.query),
  });
}

function normalizeBatchTaskQuery(
  query: CourseProductAssetGovernanceBatchDraftQuery
) {
  return {
    issueFilter: query.issueFilter,
    productId: query.productId ?? "",
    previewSize: query.previewSize,
  };
}

function createBatchTaskId(now: string, dedupeKey: string) {
  return [
    "asset_governance_batch_task",
    safeTimeId(now),
    dedupeKey.slice(0, 10),
    randomUUID().slice(0, 8),
  ].join("_");
}

function stableHash(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function safeTimeId(value: string) {
  return value.replace(/[^0-9A-Za-z]/g, "").slice(0, 24);
}
