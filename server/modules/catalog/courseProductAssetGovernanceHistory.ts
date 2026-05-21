import {
  CourseProductAssetGovernanceActionSchema,
  CourseProductAssetGovernanceBatchDraftQuerySchema,
  CourseProductAssetGovernanceBatchDraftResultSchema,
  CourseProductAssetGovernanceHistoryQuerySchema,
  CourseProductAssetGovernanceHistoryResultSchema,
  CourseProductAssetGovernanceHistorySnapshotSchema,
  CourseProductAssetGovernanceIssueTypeSchema,
  type CourseProductAssetGovernanceAction,
  type CourseProductAssetGovernanceBatchDraftAction,
  type CourseProductAssetGovernanceBatchDraftItem,
  type CourseProductAssetGovernanceBatchDraftQuery,
  type CourseProductAssetGovernanceHistoryItem,
  type CourseProductAssetGovernanceHistoryQuery,
  type CourseProductAssetGovernanceHistorySnapshot,
  type CourseProductAssetGovernanceIssueType,
  type CourseProductAssetGovernanceItem,
  type CourseProductAuditEvent,
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
import { getCourseProductAssetGovernance } from "./courseProductAssetGovernance";

const GOVERNANCE_ACTION_LABELS = {
  acknowledge_issue: "记录处理",
  mark_duplicate_primary: "设为主素材",
  mark_soft_deleted: "软删除确认",
} satisfies Record<CourseProductAssetGovernanceAction, string>;

const GOVERNANCE_ISSUE_LABELS = {
  missing_product: "商品不存在",
  unreferenced: "未引用",
  duplicate_content_hash: "重复内容",
  pending_compliance: "待合规",
  rejected_compliance: "合规驳回",
  download_disabled_material: "资料下载关闭",
  soft_delete_candidate: "软删除候选",
} satisfies Record<CourseProductAssetGovernanceIssueType, string>;

export async function listCourseProductAssetGovernanceHistory({
  query,
  productStore = getCourseProductStore(),
  now = new Date().toISOString(),
}: {
  query?: Partial<CourseProductAssetGovernanceHistoryQuery>;
  productStore?: CourseProductStore;
  now?: string;
} = {}) {
  const parsedQuery = CourseProductAssetGovernanceHistoryQuerySchema.parse(
    query ?? {}
  );
  const allGovernanceEvents = (
    await productStore.listAuditEvents(parsedQuery.productId)
  )
    .filter(event => event.action === "asset_governance")
    .map(auditEventToHistoryItem)
    .filter((item): item is CourseProductAssetGovernanceHistoryItem =>
      Boolean(item)
    );
  const filteredItems = allGovernanceEvents.filter(item =>
    matchesHistoryQuery(item, parsedQuery)
  );
  const totalPages =
    filteredItems.length === 0
      ? 0
      : Math.ceil(filteredItems.length / parsedQuery.pageSize);
  const page = Math.min(parsedQuery.page, Math.max(1, totalPages || 1));
  const start = (page - 1) * parsedQuery.pageSize;

  return CourseProductAssetGovernanceHistoryResultSchema.parse({
    generatedAt: now,
    query: {
      ...parsedQuery,
      page,
    },
    summary: {
      totalEventCount: allGovernanceEvents.length,
      filteredEventCount: filteredItems.length,
      actorCount: new Set(filteredItems.map(item => item.actorId)).size,
      actionDistribution: buildDistribution(
        filteredItems.map(item => item.action),
        GOVERNANCE_ACTION_LABELS
      ),
      issueTypeDistribution: buildDistribution(
        filteredItems.map(item => item.issueType),
        GOVERNANCE_ISSUE_LABELS
      ),
    },
    items: filteredItems.slice(start, start + parsedQuery.pageSize),
    meta: {
      page,
      pageSize: parsedQuery.pageSize,
      total: filteredItems.length,
      totalPages,
    },
  });
}

export async function previewCourseProductAssetGovernanceBatchDraft({
  query,
  requestedBy,
  productStore = getCourseProductStore(),
  contentStore = getCourseProductContentStore(),
  assetStore = getCourseProductAssetStore(),
  now = new Date().toISOString(),
}: {
  query?: Partial<CourseProductAssetGovernanceBatchDraftQuery>;
  requestedBy: string;
  productStore?: CourseProductStore;
  contentStore?: CourseProductContentStore;
  assetStore?: CourseProductAssetStore;
  now?: string;
}) {
  const parsedQuery = CourseProductAssetGovernanceBatchDraftQuerySchema.parse(
    query ?? {}
  );
  const governance = await getCourseProductAssetGovernance({
    productStore,
    contentStore,
    assetStore,
    now,
  });
  const candidates = governance.items.filter(item =>
    matchesBatchDraftQuery(item, parsedQuery)
  );
  const draftItems = candidates
    .slice(0, parsedQuery.previewSize)
    .map(batchDraftItemFromGovernanceItem);
  const allProposedActions = candidates.flatMap(item =>
    proposedActionsForGovernanceItem(item)
  );
  const manualReviewAssetCount = candidates.filter(item =>
    proposedActionsForGovernanceItem(item).some(action => !action.eligible)
  ).length;

  return CourseProductAssetGovernanceBatchDraftResultSchema.parse({
    generatedAt: now,
    requestedBy,
    query: parsedQuery,
    previewOnly: true,
    willModifyAssetStore: false,
    summary: {
      candidateAssetCount: candidates.length,
      previewItemCount: draftItems.length,
      eligibleActionCount: allProposedActions.filter(action => action.eligible)
        .length,
      manualReviewAssetCount,
      softDeleteCandidateCount: candidates.filter(item =>
        item.issueTypes.includes("soft_delete_candidate")
      ).length,
      issueTypeDistribution: buildDistribution(
        candidates.flatMap(item => item.issueTypes),
        GOVERNANCE_ISSUE_LABELS
      ),
      proposedActionDistribution: buildDistribution(
        allProposedActions.map(action => action.action),
        GOVERNANCE_ACTION_LABELS
      ),
    },
    items: draftItems,
    safetyNotes: buildBatchDraftSafetyNotes(candidates),
  });
}

function auditEventToHistoryItem(
  event: CourseProductAuditEvent
): CourseProductAssetGovernanceHistoryItem | undefined {
  const before = governanceSnapshotFromRecord(event.before);
  const after = governanceSnapshotFromRecord(event.after);
  const actionResult = CourseProductAssetGovernanceActionSchema.safeParse(
    after.governanceAction ?? before.governanceAction
  );
  const issueTypeResult =
    CourseProductAssetGovernanceIssueTypeSchema.safeParse(
      after.issueType ?? before.issueType
    );
  const assetId = after.assetId ?? before.assetId;
  if (!actionResult.success || !issueTypeResult.success || !assetId) {
    return undefined;
  }

  return {
    id: event.id,
    productId: event.productId,
    productTitle: event.productTitle,
    assetId,
    assetTitle: after.title ?? before.title,
    assetKind: after.kind ?? before.kind,
    action: actionResult.data,
    issueType: issueTypeResult.data,
    actorId: event.actorId,
    actorRoles: stringArrayFromUnknown(
      event.after.actorRoles ?? event.before.actorRoles
    ),
    reason: event.reason,
    primaryAssetId: after.primaryAssetId ?? before.primaryAssetId,
    referenceCount: after.referenceCount ?? before.referenceCount,
    before,
    after,
    createdAt: event.createdAt,
  };
}

function governanceSnapshotFromRecord(
  record: Record<string, unknown>
): CourseProductAssetGovernanceHistorySnapshot {
  return CourseProductAssetGovernanceHistorySnapshotSchema.parse({
    assetId: stringFromUnknown(record.assetId),
    productId: stringFromUnknown(record.productId),
    title: stringFromUnknown(record.title),
    kind: stringFromUnknown(record.kind),
    governanceAction: stringFromUnknown(record.governanceAction),
    issueType: stringFromUnknown(record.issueType),
    primaryAssetId: stringFromUnknown(record.primaryAssetId),
    referenceCount: numberFromUnknown(record.referenceCount),
    duplicateContentHashAssetIds: stringArrayFromUnknown(
      record.duplicateContentHashAssetIds
    ),
    complianceStatus: stringFromUnknown(record.complianceStatus),
    downloadEnabled:
      typeof record.downloadEnabled === "boolean"
        ? record.downloadEnabled
        : undefined,
    deletedAt: stringFromUnknown(record.deletedAt),
    note: stringFromUnknown(record.note),
  });
}

function matchesHistoryQuery(
  item: CourseProductAssetGovernanceHistoryItem,
  query: CourseProductAssetGovernanceHistoryQuery
) {
  if (query.assetId && item.assetId !== query.assetId) return false;
  if (query.productId && item.productId !== query.productId) return false;
  if (query.action && item.action !== query.action) return false;
  if (query.issueType && item.issueType !== query.issueType) return false;
  if (query.actorId && item.actorId !== query.actorId) return false;
  if (query.dateFrom && item.createdAt < query.dateFrom) return false;
  if (query.dateTo && item.createdAt > query.dateTo) return false;
  return true;
}

function matchesBatchDraftQuery(
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

function batchDraftItemFromGovernanceItem(
  item: CourseProductAssetGovernanceItem
): CourseProductAssetGovernanceBatchDraftItem {
  return {
    assetId: item.asset.id,
    productId: item.asset.productId,
    productTitle: item.product?.title,
    assetTitle: item.asset.title,
    assetKind: item.asset.kind,
    issueTypes: item.issueTypes,
    referenceCount: item.referenceCount,
    duplicateContentHashAssetIds: item.duplicateContentHashAssetIds,
    proposedActions: proposedActionsForGovernanceItem(item),
  };
}

function proposedActionsForGovernanceItem(
  item: CourseProductAssetGovernanceItem
): CourseProductAssetGovernanceBatchDraftAction[] {
  const actions: CourseProductAssetGovernanceBatchDraftAction[] = [];

  item.issueTypes.forEach(issueType => {
    actions.push({
      action: "acknowledge_issue",
      issueType,
      eligible: true,
      reason: "可作为后续批量记录处理草稿，当前不执行写入",
    });
  });

  if (item.issueTypes.includes("duplicate_content_hash")) {
    actions.push({
      action: "mark_duplicate_primary",
      issueType: "duplicate_content_hash",
      eligible: false,
      reason: "重复素材需要人工确认主素材和引用合并策略",
      primaryAssetId: item.asset.id,
    });
  }

  if (item.issueTypes.includes("soft_delete_candidate")) {
    actions.push({
      action: "mark_soft_deleted",
      issueType: "soft_delete_candidate",
      eligible: false,
      reason: "软删除需单素材确认或后续审批队列，当前只预览",
    });
  }

  return actions;
}

function buildBatchDraftSafetyNotes(
  candidates: CourseProductAssetGovernanceItem[]
) {
  const notes = [
    "当前为批量处理草稿预览，不会修改素材元数据、引用关系或对象文件。",
    "预览结果只来自治理摘要和审计摘要，不读取原始文件，也不生成对象签名 URL。",
    "真正批量处理、自动合并引用、物理删除对象和异步任务队列继续后置。",
  ];
  if (
    candidates.some(item => item.issueTypes.includes("duplicate_content_hash"))
  ) {
    notes.push("重复内容批量处理前必须先明确主素材和引用迁移策略。");
  }
  if (candidates.some(item => item.issueTypes.includes("soft_delete_candidate"))) {
    notes.push("软删除候选仍需单素材确认或后续审批，不进入批量直接写入。");
  }
  return notes;
}

function buildDistribution<T extends string>(
  values: T[],
  labels: Record<T, string>
) {
  const counts = values.reduce((result, value) => {
    result.set(value, (result.get(value) ?? 0) + 1);
    return result;
  }, new Map<T, number>());

  return Array.from(counts.entries())
    .map(([key, count]) => ({
      key,
      label: labels[key],
      count,
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function stringFromUnknown(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberFromUnknown(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringArrayFromUnknown(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
