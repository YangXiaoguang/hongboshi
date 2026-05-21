import { createHash, randomUUID } from "crypto";
import {
  CourseProductAssetGovernanceBatchTaskCreateRequestSchema,
  CourseProductAssetGovernanceBatchTaskCancelRequestSchema,
  CourseProductAssetGovernanceBatchTaskApprovalPreflightSchema,
  CourseProductAssetGovernanceBatchTaskListQuerySchema,
  CourseProductAssetGovernanceBatchTaskListResultSchema,
  CourseProductAssetGovernanceBatchTaskMutationResultSchema,
  CourseProductAssetGovernanceBatchTaskReviewRequestSchema,
  CourseProductAssetGovernanceBatchTaskReviewSummarySchema,
  CourseProductAssetGovernanceBatchTaskSchema,
  type CourseProductAssetGovernanceBatchDraftQuery,
  type CourseProductAssetGovernanceBatchTaskApprovalPreflight,
  type CourseProductAssetGovernanceBatchTask,
  type CourseProductAssetGovernanceBatchTaskCreateRequest,
  type CourseProductAssetGovernanceBatchTaskListQuery,
  type CourseProductAssetGovernanceIssueType,
  type CourseProductAssetGovernanceItem,
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
import { getCourseProductAssetGovernance } from "./courseProductAssetGovernance";
import {
  getCourseProductAssetGovernanceBatchTaskStore,
  type CourseProductAssetGovernanceBatchTaskStore,
} from "./courseProductAssetGovernanceBatchTaskStore";

export class CourseProductAssetGovernanceBatchTaskPreflightError extends Error {
  constructor(
    public readonly task: CourseProductAssetGovernanceBatchTask,
    public readonly preflight: CourseProductAssetGovernanceBatchTaskApprovalPreflight
  ) {
    super(
      "COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_PREFLIGHT_RECREATE_REQUIRED"
    );
  }
}

export async function listCourseProductAssetGovernanceBatchTasks({
  query,
  store = getCourseProductAssetGovernanceBatchTaskStore(),
  now = new Date().toISOString(),
}: {
  query?: Partial<CourseProductAssetGovernanceBatchTaskListQuery>;
  store?: CourseProductAssetGovernanceBatchTaskStore;
  now?: string;
} = {}) {
  const parsedQuery =
    CourseProductAssetGovernanceBatchTaskListQuerySchema.parse(query ?? {});
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
      approvedCount: allTasks.filter(task => task.approvalStatus === "approved")
        .length,
      rejectedCount: allTasks.filter(task => task.approvalStatus === "rejected")
        .length,
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
  const parsed =
    CourseProductAssetGovernanceBatchTaskCreateRequestSchema.parse(request);
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
  const candidateSnapshot = await getBatchTaskCandidateSnapshot({
    query: preview.query,
    productStore,
    contentStore,
    assetStore,
    now,
  });

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
      candidateAssetIds: candidateSnapshot.assetIds,
      candidateIssueTypeByAssetId: candidateSnapshot.issueTypeByAssetId,
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
    throw new Error(
      "COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_NOT_CANCELABLE"
    );
  }
  if (task.createdBy !== actorId && !actorRoles.includes("admin")) {
    throw new Error(
      "COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_CANCEL_FORBIDDEN"
    );
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

export async function reviewCourseProductAssetGovernanceBatchTask({
  taskId,
  request,
  actorId,
  actorRoles = [],
  productStore = getCourseProductStore(),
  contentStore = getCourseProductContentStore(),
  assetStore = getCourseProductAssetStore(),
  taskStore = getCourseProductAssetGovernanceBatchTaskStore(),
  now = new Date().toISOString(),
}: {
  taskId: string;
  request: unknown;
  actorId: string;
  actorRoles?: string[];
  productStore?: CourseProductStore;
  contentStore?: CourseProductContentStore;
  assetStore?: CourseProductAssetStore;
  taskStore?: CourseProductAssetGovernanceBatchTaskStore;
  now?: string;
}) {
  const parsed =
    CourseProductAssetGovernanceBatchTaskReviewRequestSchema.parse(request);
  const task = await taskStore.getTask(taskId);
  if (!task) {
    throw new Error("COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_NOT_FOUND");
  }
  if (task.approvalStatus !== "pending_approval") {
    throw new Error(
      "COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_NOT_REVIEWABLE"
    );
  }
  if (task.createdBy === actorId && !actorRoles.includes("admin")) {
    throw new Error(
      "COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_REVIEW_SELF_FORBIDDEN"
    );
  }

  const beforeSummary = batchTaskReviewSummary(task);
  if (parsed.action === "reject") {
    const rejected = await taskStore.saveTask(
      CourseProductAssetGovernanceBatchTaskSchema.parse({
        ...task,
        approvalStatus: "rejected",
        reviewedBy: actorId,
        reviewedByRoles: actorRoles,
        reviewedAt: now,
        reviewAction: parsed.action,
        reviewReason: parsed.reason,
        reviewBeforeSummary: beforeSummary,
        reviewAfterSummary: batchTaskReviewSummary({
          ...task,
          approvalStatus: "rejected",
        }),
        updatedAt: now,
      })
    );
    return batchTaskMutationResult({
      task: rejected,
      taskStore,
      now,
    });
  }

  const preflight = await buildApprovalPreflight({
    task,
    actorId,
    productStore,
    contentStore,
    assetStore,
    now,
  });
  if (preflight.requiresRecreate) {
    const refreshed = await taskStore.saveTask(
      CourseProductAssetGovernanceBatchTaskSchema.parse({
        ...task,
        approvalPreflight: preflight,
        updatedAt: now,
      })
    );
    throw new CourseProductAssetGovernanceBatchTaskPreflightError(
      refreshed,
      preflight
    );
  }

  const approved = await taskStore.saveTask(
    CourseProductAssetGovernanceBatchTaskSchema.parse({
      ...task,
      approvalStatus: "approved",
      reviewedBy: actorId,
      reviewedByRoles: actorRoles,
      reviewedAt: now,
      reviewAction: parsed.action,
      reviewReason: parsed.reason,
      approvalPreflight: preflight,
      reviewBeforeSummary: beforeSummary,
      reviewAfterSummary: batchTaskReviewSummary({
        ...task,
        approvalStatus: "approved",
        candidateAssetCount: preflight.currentCandidateAssetCount,
        eligibleActionCount: preflight.stillEligibleActionCount,
        manualReviewAssetCount: preflight.currentManualReviewAssetCount,
        softDeleteCandidateCount: preflight.currentSoftDeleteCandidateCount,
      }),
      updatedAt: now,
    })
  );

  return batchTaskMutationResult({
    task: approved,
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

async function buildApprovalPreflight({
  task,
  actorId,
  productStore,
  contentStore,
  assetStore,
  now,
}: {
  task: CourseProductAssetGovernanceBatchTask;
  actorId: string;
  productStore: CourseProductStore;
  contentStore: CourseProductContentStore;
  assetStore: CourseProductAssetStore;
  now: string;
}) {
  const [preview, snapshot] = await Promise.all([
    previewCourseProductAssetGovernanceBatchDraft({
      query: task.query,
      requestedBy: actorId,
      productStore,
      contentStore,
      assetStore,
      now,
    }),
    getBatchTaskCandidateSnapshot({
      query: task.query,
      productStore,
      contentStore,
      assetStore,
      now,
    }),
  ]);
  const originalAssetIds = task.candidateAssetIds;
  const originalAssetIdSet = new Set(originalAssetIds);
  const currentAssetIdSet = new Set(snapshot.assetIds);
  const disappearedAssetIds = originalAssetIds.filter(
    assetId => !currentAssetIdSet.has(assetId)
  );
  const newCandidateAssetIds = originalAssetIds.length
    ? snapshot.assetIds.filter(assetId => !originalAssetIdSet.has(assetId))
    : [];
  const changedIssueTypeAssetIds = originalAssetIds.filter(assetId => {
    const originalIssueTypes = task.candidateIssueTypeByAssetId[assetId];
    const currentIssueTypes = snapshot.issueTypeByAssetId[assetId];
    if (!originalIssueTypes || !currentIssueTypes) return false;
    return !issueTypeSetsEqual(originalIssueTypes, currentIssueTypes);
  });
  const candidateDeltaCount =
    snapshot.assetIds.length - task.candidateAssetCount;
  const allowedDelta = Math.max(1, Math.floor(task.candidateAssetCount * 0.1));
  const requiresRecreate =
    disappearedAssetIds.length > 0 ||
    changedIssueTypeAssetIds.length > 0 ||
    Math.abs(candidateDeltaCount) > allowedDelta;

  return CourseProductAssetGovernanceBatchTaskApprovalPreflightSchema.parse({
    generatedAt: now,
    originalCandidateAssetCount: task.candidateAssetCount,
    currentCandidateAssetCount: snapshot.assetIds.length,
    candidateDeltaCount,
    disappearedAssetIds,
    newCandidateAssetIds,
    changedIssueTypeAssetIds,
    stillEligibleActionCount: preview.summary.eligibleActionCount,
    currentManualReviewAssetCount: preview.summary.manualReviewAssetCount,
    currentSoftDeleteCandidateCount: preview.summary.softDeleteCandidateCount,
    currentIssueTypeDistribution: preview.summary.issueTypeDistribution,
    currentProposedActionDistribution:
      preview.summary.proposedActionDistribution,
    requiresRecreate,
    notes: buildApprovalPreflightNotes({
      hasOriginalSnapshot: originalAssetIds.length > 0,
      disappearedAssetIds,
      newCandidateAssetIds,
      changedIssueTypeAssetIds,
      candidateDeltaCount,
      allowedDelta,
      requiresRecreate,
    }),
  });
}

async function getBatchTaskCandidateSnapshot({
  query,
  productStore,
  contentStore,
  assetStore,
  now,
}: {
  query: CourseProductAssetGovernanceBatchDraftQuery;
  productStore: CourseProductStore;
  contentStore: CourseProductContentStore;
  assetStore: CourseProductAssetStore;
  now: string;
}) {
  const governance = await getCourseProductAssetGovernance({
    productStore,
    contentStore,
    assetStore,
    now,
  });
  const candidates = governance.items.filter(item =>
    matchesBatchTaskDraftQuery(item, query)
  );
  return {
    assetIds: candidates.map(item => item.asset.id),
    issueTypeByAssetId: Object.fromEntries(
      candidates.map(item => [item.asset.id, [...item.issueTypes].sort()])
    ) as Record<string, CourseProductAssetGovernanceIssueType[]>,
  };
}

function matchesBatchTaskDraftQuery(
  item: CourseProductAssetGovernanceItem,
  query: CourseProductAssetGovernanceBatchDraftQuery
) {
  if (query.productId && item.asset.productId !== query.productId) return false;
  if (item.issueTypes.length === 0) return false;
  if (query.issueFilter === "all") return true;
  if (query.issueFilter === "compliance_status") {
    return (
      item.issueTypes.includes("pending_compliance") ||
      item.issueTypes.includes("rejected_compliance")
    );
  }
  return item.issueTypes.includes(query.issueFilter);
}

function batchTaskReviewSummary(task: CourseProductAssetGovernanceBatchTask) {
  return CourseProductAssetGovernanceBatchTaskReviewSummarySchema.parse({
    approvalStatus: task.approvalStatus,
    candidateAssetCount: task.candidateAssetCount,
    eligibleActionCount: task.eligibleActionCount,
    manualReviewAssetCount: task.manualReviewAssetCount,
    softDeleteCandidateCount: task.softDeleteCandidateCount,
  });
}

function issueTypeSetsEqual(
  left: CourseProductAssetGovernanceIssueType[],
  right: CourseProductAssetGovernanceIssueType[]
) {
  const normalizedLeft = [...left].sort().join("|");
  const normalizedRight = [...right].sort().join("|");
  return normalizedLeft === normalizedRight;
}

function buildApprovalPreflightNotes({
  hasOriginalSnapshot,
  disappearedAssetIds,
  newCandidateAssetIds,
  changedIssueTypeAssetIds,
  candidateDeltaCount,
  allowedDelta,
  requiresRecreate,
}: {
  hasOriginalSnapshot: boolean;
  disappearedAssetIds: string[];
  newCandidateAssetIds: string[];
  changedIssueTypeAssetIds: string[];
  candidateDeltaCount: number;
  allowedDelta: number;
  requiresRecreate: boolean;
}) {
  const notes: string[] = [];
  if (!hasOriginalSnapshot) {
    notes.push("该草案缺少原始候选明细，仅能按候选数量和当前治理摘要做预检。");
  }
  if (disappearedAssetIds.length > 0) {
    notes.push(`${disappearedAssetIds.length} 个原候选素材已不在当前筛选中。`);
  }
  if (newCandidateAssetIds.length > 0) {
    notes.push(`${newCandidateAssetIds.length} 个素材成为新的候选。`);
  }
  if (changedIssueTypeAssetIds.length > 0) {
    notes.push(
      `${changedIssueTypeAssetIds.length} 个候选素材的问题类型已变化。`
    );
  }
  if (Math.abs(candidateDeltaCount) > allowedDelta) {
    notes.push(
      `候选数量变化 ${candidateDeltaCount}，超过当前允许波动 ${allowedDelta}。`
    );
  }
  notes.push(
    requiresRecreate
      ? "审批前预检变化较大，请重新生成批量治理草案。"
      : "审批前预检通过，后续仍需单独执行批量处理任务。"
  );
  return notes;
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
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function safeTimeId(value: string) {
  return value.replace(/[^0-9A-Za-z]/g, "").slice(0, 24);
}
