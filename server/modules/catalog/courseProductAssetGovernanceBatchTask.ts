import { createHash, randomUUID } from "crypto";
import {
  CourseProductAssetGovernanceBatchTaskCreateRequestSchema,
  CourseProductAssetGovernanceBatchTaskCancelRequestSchema,
  CourseProductAssetGovernanceBatchTaskApprovalPreflightSchema,
  CourseProductAssetGovernanceBatchTaskExecutionPlanResultSchema,
  CourseProductAssetGovernanceHistorySnapshotSchema,
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
  type CourseProductAssetGovernanceBatchTaskExecutionPlanItem,
  type CourseProductAssetGovernanceBatchTaskExecutionPlanRiskLevel,
  type CourseProductAssetGovernanceBatchTaskListQuery,
  type CourseProductAssetGovernanceHistorySnapshot,
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

export async function previewCourseProductAssetGovernanceBatchTaskExecutionPlan({
  taskId,
  actorId,
  productStore = getCourseProductStore(),
  contentStore = getCourseProductContentStore(),
  assetStore = getCourseProductAssetStore(),
  taskStore = getCourseProductAssetGovernanceBatchTaskStore(),
  now = new Date().toISOString(),
}: {
  taskId: string;
  actorId: string;
  productStore?: CourseProductStore;
  contentStore?: CourseProductContentStore;
  assetStore?: CourseProductAssetStore;
  taskStore?: CourseProductAssetGovernanceBatchTaskStore;
  now?: string;
}) {
  const task = await taskStore.getTask(taskId);
  if (!task) {
    throw new Error("COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_NOT_FOUND");
  }
  if (task.approvalStatus !== "approved") {
    throw new Error(
      "COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_EXECUTION_PLAN_NOT_APPROVED"
    );
  }
  if (task.approvalPreflight?.requiresRecreate) {
    throw new Error(
      "COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_EXECUTION_PLAN_RECREATE_REQUIRED"
    );
  }

  const governance = await getCourseProductAssetGovernance({
    productStore,
    contentStore,
    assetStore,
    now,
  });
  const currentCandidates = governance.items.filter(item =>
    matchesBatchTaskDraftQuery(item, task.query)
  );
  const currentCandidateIdSet = new Set(
    currentCandidates.map(item => item.asset.id)
  );
  const currentItemByAssetId = new Map(
    governance.items.map(item => [item.asset.id, item])
  );
  const originalAssetIds = task.candidateAssetIds.length
    ? task.candidateAssetIds
    : currentCandidates.map(item => item.asset.id);
  const originalAssetIdSet = new Set(originalAssetIds);
  const newCandidateAssetCount = currentCandidates.filter(
    item => !originalAssetIdSet.has(item.asset.id)
  ).length;
  const changedIssueTypeAssetIds = originalAssetIds.filter(assetId => {
    const originalIssueTypes = task.candidateIssueTypeByAssetId[assetId];
    const currentItem = currentItemByAssetId.get(assetId);
    if (!originalIssueTypes?.length || !currentItem) return false;
    return !issueTypeSetsEqual(originalIssueTypes, currentItem.issueTypes);
  });

  const items = originalAssetIds.map(assetId =>
    batchTaskExecutionPlanItem({
      task,
      assetId,
      item: currentItemByAssetId.get(assetId),
      currentCandidateIdSet,
    })
  );
  const plannedItems = items.filter(item => item.status === "planned");
  const skippedItems = items.filter(item => item.status === "skipped");

  return CourseProductAssetGovernanceBatchTaskExecutionPlanResultSchema.parse({
    generatedAt: now,
    requestedBy: actorId,
    previewOnly: true,
    willModifyAssetStore: false,
    willWriteAuditEvents: false,
    task,
    summary: {
      taskId: task.id,
      originalCandidateAssetCount: originalAssetIds.length,
      currentCandidateAssetCount: currentCandidates.length,
      newCandidateAssetCount,
      disappearedAssetCount: originalAssetIds.filter(
        assetId => !currentCandidateIdSet.has(assetId)
      ).length,
      changedIssueTypeCount: changedIssueTypeAssetIds.length,
      plannedActionCount: plannedItems.length,
      skippedActionCount: skippedItems.length,
      estimatedAuditEventCount: plannedItems.length,
      highRiskItemCount: items.filter(item => item.riskLevel === "high").length,
      mediumRiskItemCount: items.filter(item => item.riskLevel === "medium")
        .length,
      lowRiskItemCount: items.filter(item => item.riskLevel === "low").length,
    },
    items,
    safetyNotes: buildExecutionPlanSafetyNotes({
      hasOriginalSnapshot: task.candidateAssetIds.length > 0,
      plannedCount: plannedItems.length,
      skippedCount: skippedItems.length,
      newCandidateAssetCount,
      changedIssueTypeCount: changedIssueTypeAssetIds.length,
    }),
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

function batchTaskExecutionPlanItem({
  task,
  assetId,
  item,
  currentCandidateIdSet,
}: {
  task: CourseProductAssetGovernanceBatchTask;
  assetId: string;
  item?: CourseProductAssetGovernanceItem;
  currentCandidateIdSet: Set<string>;
}): CourseProductAssetGovernanceBatchTaskExecutionPlanItem {
  const originalIssueTypes = task.candidateIssueTypeByAssetId[assetId] ?? [];
  const issueTypes = item?.issueTypes ?? originalIssueTypes;
  const plannedIssueType = selectExecutionPlanIssueType({
    task,
    item,
    originalIssueTypes,
  });
  const base = {
    assetId,
    productId: item?.asset.productId,
    productTitle: item?.product?.title,
    assetTitle: item?.asset.title,
    assetKind: item?.asset.kind,
    issueTypes,
    referenceCount: item?.referenceCount ?? 0,
    duplicateContentHashAssetIds: item?.duplicateContentHashAssetIds ?? [],
    plannedAction: task.action,
    plannedIssueType,
  };

  if (!item) {
    return {
      ...base,
      status: "skipped",
      riskLevel: "high",
      skipReason: "原候选素材已不在当前素材治理快照中",
      notes: ["跳过项需要重新生成治理草案，或改为单素材治理。"],
    };
  }

  if (
    originalIssueTypes.length > 0 &&
    !issueTypeSetsEqual(originalIssueTypes, item.issueTypes)
  ) {
    return {
      ...base,
      status: "skipped",
      riskLevel: executionPlanRiskLevel([...originalIssueTypes, ...issueTypes]),
      skipReason: "当前问题类型已不同于审批时的候选快照",
      notes: ["问题类型发生漂移，继续执行可能写入错误审计口径。"],
    };
  }

  if (!currentCandidateIdSet.has(assetId)) {
    return {
      ...base,
      status: "skipped",
      riskLevel: executionPlanRiskLevel(issueTypes),
      skipReason: "当前素材已不再匹配该治理草案筛选条件",
      notes: ["当前筛选已变化，跳过以保持已审批任务边界。"],
    };
  }

  return {
    ...base,
    status: "planned",
    riskLevel: executionPlanRiskLevel(issueTypes),
    auditEventPreview:
      item && plannedIssueType
        ? {
            action: task.action,
            issueType: plannedIssueType,
            reason: task.reason,
            before: governanceSnapshotForExecutionPlan({
              item,
              action: task.action,
              issueType: plannedIssueType,
              note: item.asset.note,
            }),
            after: governanceSnapshotForExecutionPlan({
              item,
              action: task.action,
              issueType: plannedIssueType,
              note: task.note?.trim() || task.reason,
            }),
          }
        : undefined,
    notes: ["真实执行前仍需复核本预案，当前不会写入审计或修改素材。"],
  };
}

function selectExecutionPlanIssueType({
  task,
  item,
  originalIssueTypes,
}: {
  task: CourseProductAssetGovernanceBatchTask;
  item?: CourseProductAssetGovernanceItem;
  originalIssueTypes: CourseProductAssetGovernanceIssueType[];
}) {
  if (!item) return originalIssueTypes[0];
  if (
    task.query.issueFilter !== "all" &&
    task.query.issueFilter !== "compliance_status" &&
    item.issueTypes.includes(task.query.issueFilter)
  ) {
    return task.query.issueFilter;
  }
  if (task.query.issueFilter === "compliance_status") {
    const complianceIssue = item.issueTypes.find(issueType =>
      ["pending_compliance", "rejected_compliance"].includes(issueType)
    );
    if (complianceIssue) return complianceIssue;
  }
  return (
    originalIssueTypes.find(issueType => item.issueTypes.includes(issueType)) ??
    item.issueTypes[0]
  );
}

function executionPlanRiskLevel(
  issueTypes: CourseProductAssetGovernanceIssueType[]
): CourseProductAssetGovernanceBatchTaskExecutionPlanRiskLevel {
  if (
    issueTypes.some(issueType =>
      ["missing_product", "rejected_compliance", "soft_delete_candidate"].includes(
        issueType
      )
    )
  ) {
    return "high";
  }
  if (
    issueTypes.some(issueType =>
      [
        "duplicate_content_hash",
        "pending_compliance",
        "download_disabled_material",
      ].includes(issueType)
    )
  ) {
    return "medium";
  }
  return "low";
}

function governanceSnapshotForExecutionPlan({
  item,
  action,
  issueType,
  note,
}: {
  item: CourseProductAssetGovernanceItem;
  action: CourseProductAssetGovernanceBatchTask["action"];
  issueType: CourseProductAssetGovernanceIssueType;
  note?: string;
}): CourseProductAssetGovernanceHistorySnapshot {
  return CourseProductAssetGovernanceHistorySnapshotSchema.parse({
    assetId: item.asset.id,
    productId: item.asset.productId,
    title: item.asset.title,
    kind: item.asset.kind,
    governanceAction: action,
    issueType,
    referenceCount: item.referenceCount,
    duplicateContentHashAssetIds: item.duplicateContentHashAssetIds,
    complianceStatus: item.asset.complianceStatus,
    downloadEnabled: item.asset.downloadEnabled,
    deletedAt: item.asset.deletedAt,
    note,
  });
}

function buildExecutionPlanSafetyNotes({
  hasOriginalSnapshot,
  plannedCount,
  skippedCount,
  newCandidateAssetCount,
  changedIssueTypeCount,
}: {
  hasOriginalSnapshot: boolean;
  plannedCount: number;
  skippedCount: number;
  newCandidateAssetCount: number;
  changedIssueTypeCount: number;
}) {
  const notes = [
    "当前为已审批批量治理任务的执行预案，只读模拟，不修改素材 Store。",
    "本预案只展示未来可能写入的 asset_governance 审计计划，当前不会写审计事件。",
    `预计真实执行时会生成 ${plannedCount} 个处理动作和 ${plannedCount} 条审计事件。`,
  ];
  if (!hasOriginalSnapshot) {
    notes.push("该任务缺少原始候选快照，预案已按当前筛选做兼容生成。");
  }
  if (skippedCount > 0) {
    notes.push(`${skippedCount} 个候选因当前数据漂移被跳过，需要重新生成草案。`);
  }
  if (newCandidateAssetCount > 0) {
    notes.push(`${newCandidateAssetCount} 个当前新候选不属于已审批任务范围。`);
  }
  if (changedIssueTypeCount > 0) {
    notes.push(`${changedIssueTypeCount} 个候选的问题类型已变化，本次预案不执行。`);
  }
  return notes;
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
