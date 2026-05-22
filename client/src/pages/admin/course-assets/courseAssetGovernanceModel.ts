import {
  COURSE_PRODUCT_ASSET_GOVERNANCE_ISSUE_TYPES,
  type CourseProductAssetGovernanceAction,
  type CourseProductAssetGovernanceBatchActionPlanResult,
  type CourseProductAssetGovernanceBatchIssueFilter,
  type CourseProductAssetGovernanceBatchTask,
  type CourseProductAssetGovernanceBatchTaskCreateRequest,
  type CourseProductAssetGovernanceBatchTaskExecuteRequest,
  type CourseProductAssetGovernanceBatchTaskExecutionPlanResult,
  type CourseProductAssetGovernanceBatchTaskExecutionStatusFilter,
  type CourseProductAssetGovernanceBatchTaskListQuery,
  type CourseProductAssetGovernanceBatchTaskQueueObservationResult,
  type CourseProductAssetGovernanceBatchTaskReviewAction,
  type CourseProductAssetGovernanceBatchTaskReviewRequest,
  type CourseProductAssetGovernanceHistoryQuery,
  type CourseProductAssetGovernanceIssueType,
  type CourseProductAssetGovernanceItem,
  type CourseProductAssetGovernanceReferenceSource,
  type CourseProductAssetGovernanceResult,
  type CourseProductLearningMaterialOperationsReport,
} from "@shared/domain";

export type AssetGovernanceFilter =
  | "all"
  | "compliance_status"
  | CourseProductAssetGovernanceIssueType;
export type AssetGovernanceHistoryFilterState = {
  assetId: string;
  productId: string;
  actorId: string;
  action: "all" | CourseProductAssetGovernanceAction;
  issueType: "all" | CourseProductAssetGovernanceIssueType;
  dateFrom: string;
  dateTo: string;
};
export type AssetGovernanceBatchTaskFilterState = {
  approvalStatus: CourseProductAssetGovernanceBatchTaskListQuery["approvalStatus"];
  executionStatus: CourseProductAssetGovernanceBatchTaskExecutionStatusFilter;
  issueFilter: CourseProductAssetGovernanceBatchIssueFilter;
  action: "all" | CourseProductAssetGovernanceAction;
  createdBy: string;
  executionRequestedBy: string;
  dateFrom: string;
  dateTo: string;
  page: number;
};
export type AssetGovernanceActionState = {
  item: CourseProductAssetGovernanceItem;
  action: CourseProductAssetGovernanceAction;
  issueType: CourseProductAssetGovernanceIssueType;
  primaryAssetId?: string;
};
export type AssetGovernanceBatchTaskCancelState = {
  task: CourseProductAssetGovernanceBatchTask;
};
export type AssetGovernanceBatchTaskReviewState = {
  task: CourseProductAssetGovernanceBatchTask;
  action: CourseProductAssetGovernanceBatchTaskReviewAction;
};

export const assetGovernanceIssueCopy = {
  missing_product: "缺失商品",
  unreferenced: "未引用",
  duplicate_content_hash: "重复内容",
  pending_compliance: "待审核",
  rejected_compliance: "已驳回",
  download_disabled_material: "下载关闭",
  soft_delete_candidate: "软删候选",
} satisfies Record<CourseProductAssetGovernanceIssueType, string>;

export const assetGovernanceReferenceSourceCopy = {
  reference_table: "引用表",
  content_material_placeholders: "章节占位推导",
  none: "暂无引用来源",
} satisfies Record<CourseProductAssetGovernanceReferenceSource, string>;

export const assetGovernanceActionCopy = {
  acknowledge_issue: "记录处理",
  mark_duplicate_primary: "设为主素材",
  mark_soft_deleted: "软删除确认",
} satisfies Record<CourseProductAssetGovernanceAction, string>;

export const assetGovernanceBatchTaskStatusCopy = {
  pending_approval: "待审批",
  approved: "已通过",
  rejected: "已驳回",
  canceled: "已取消",
} satisfies Record<
  CourseProductAssetGovernanceBatchTask["approvalStatus"],
  string
>;

export const assetGovernanceBatchTaskExecutionStatusCopy = {
  not_started: "未执行",
  running: "执行中",
  completed: "已完成",
  partially_completed: "部分完成",
  failed: "执行失败",
} satisfies Record<
  CourseProductAssetGovernanceBatchTask["executionStatus"],
  string
>;

export const assetGovernanceBatchTaskQueueJobStatusCopy = {
  queued: "已排队",
  running: "执行中",
  succeeded: "已成功",
  failed: "已失败",
} as const;

export const assetGovernanceBatchTaskReviewActionCopy = {
  approve: "通过审批",
  reject: "驳回草案",
} satisfies Record<CourseProductAssetGovernanceBatchTaskReviewAction, string>;

export const assetGovernanceBatchTaskExecutionPlanItemStatusCopy = {
  planned: "计划执行",
  skipped: "已跳过",
} satisfies Record<
  CourseProductAssetGovernanceBatchTaskExecutionPlanResult["items"][number]["status"],
  string
>;

export const assetGovernanceBatchTaskExecutionPlanRiskCopy = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
} satisfies Record<
  CourseProductAssetGovernanceBatchTaskExecutionPlanResult["items"][number]["riskLevel"],
  string
>;

export const assetGovernanceBatchTaskApprovalFilters: {
  value: CourseProductAssetGovernanceBatchTaskListQuery["approvalStatus"];
  label: string;
}[] = [
  { value: "all", label: "全部审批" },
  { value: "pending_approval", label: "待审批" },
  { value: "approved", label: "已通过" },
  { value: "rejected", label: "已驳回" },
  { value: "canceled", label: "已取消" },
];

export const assetGovernanceBatchTaskExecutionFilters: {
  value: CourseProductAssetGovernanceBatchTaskExecutionStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "全部执行" },
  { value: "not_started", label: "未执行" },
  { value: "running", label: "执行中" },
  { value: "completed", label: "已完成" },
  { value: "partially_completed", label: "部分完成" },
  { value: "failed", label: "执行失败" },
];

export const assetGovernanceFilters: {
  value: AssetGovernanceFilter;
  label: string;
}[] = [
  { value: "all", label: "全部问题" },
  { value: "unreferenced", label: "未引用" },
  { value: "duplicate_content_hash", label: "重复内容" },
  { value: "compliance_status", label: "待审/驳回" },
  { value: "download_disabled_material", label: "下载关闭" },
  { value: "missing_product", label: "缺失商品" },
  { value: "soft_delete_candidate", label: "软删候选" },
];

export const defaultAssetGovernanceHistoryFilters: AssetGovernanceHistoryFilterState =
  {
    assetId: "",
    productId: "",
    actorId: "",
    action: "all",
    issueType: "all",
    dateFrom: "",
    dateTo: "",
  };

export const defaultAssetGovernanceBatchTaskFilters: AssetGovernanceBatchTaskFilterState =
  {
    approvalStatus: "all",
    executionStatus: "all",
    issueFilter: "all",
    action: "all",
    createdBy: "",
    executionRequestedBy: "",
    dateFrom: "",
    dateTo: "",
    page: 1,
  };

export function assetGovernanceBatchIssueFilterFromPanelFilter(
  filter: AssetGovernanceFilter
): CourseProductAssetGovernanceBatchIssueFilter {
  return filter;
}

export function assetGovernanceBatchTaskCreateRequestFromPanelFilter(
  filter: AssetGovernanceFilter,
  reason: string,
  note?: string
): CourseProductAssetGovernanceBatchTaskCreateRequest {
  return {
    action: "acknowledge_issue",
    query: {
      issueFilter: assetGovernanceBatchIssueFilterFromPanelFilter(filter),
      previewSize: 8,
    },
    reason: reason.trim(),
    note: note?.trim() || undefined,
  };
}

export function assetGovernanceBatchTaskReviewRequestFromAction(
  action: CourseProductAssetGovernanceBatchTaskReviewAction,
  reason: string
): CourseProductAssetGovernanceBatchTaskReviewRequest {
  return {
    action,
    reason: reason.trim(),
  };
}

export function assetGovernanceBatchTaskExecuteRequestFromReason(
  reason: string,
  note?: string
): CourseProductAssetGovernanceBatchTaskExecuteRequest {
  return {
    confirmExecution: true,
    reason: reason.trim(),
    note: note?.trim() || undefined,
  };
}

export function assetGovernanceBatchTaskExecutionPlanSummaryText(
  plan: CourseProductAssetGovernanceBatchTaskExecutionPlanResult
) {
  return `计划 ${plan.summary.plannedActionCount} 个动作，跳过 ${plan.summary.skippedActionCount} 个，预计审计 ${plan.summary.estimatedAuditEventCount} 条`;
}

export function batchTaskFirstExecutionIssue(
  task: CourseProductAssetGovernanceBatchTask
) {
  const issueItem = task.executionItems.find(
    item => item.status === "failed" || item.status === "skipped"
  );
  return issueItem?.errorMessage ?? issueItem?.skipReason;
}

export function assetGovernanceBatchTaskListQueryFromFilters(
  filters: AssetGovernanceBatchTaskFilterState
): Partial<CourseProductAssetGovernanceBatchTaskListQuery> {
  return {
    approvalStatus: filters.approvalStatus,
    executionStatus: filters.executionStatus,
    issueFilter: filters.issueFilter,
    action: filters.action === "all" ? undefined : filters.action,
    createdBy: filters.createdBy.trim() || undefined,
    executionRequestedBy: filters.executionRequestedBy.trim() || undefined,
    dateFrom: dateInputToDateTime(filters.dateFrom, false),
    dateTo: dateInputToDateTime(filters.dateTo, true),
    page: filters.page,
    pageSize: 8,
  };
}

export function assetGovernanceHistoryQueryFromFilters(
  filters: AssetGovernanceHistoryFilterState
): Partial<CourseProductAssetGovernanceHistoryQuery> {
  return {
    assetId: filters.assetId.trim() || undefined,
    productId: filters.productId.trim() || undefined,
    actorId: filters.actorId.trim() || undefined,
    action: filters.action === "all" ? undefined : filters.action,
    issueType: filters.issueType === "all" ? undefined : filters.issueType,
    dateFrom: dateInputToDateTime(filters.dateFrom, false),
    dateTo: dateInputToDateTime(filters.dateTo, true),
    page: 1,
    pageSize: 5,
  };
}

function dateInputToDateTime(value: string, endOfDay: boolean) {
  if (!value) return undefined;
  return `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+08:00`;
}

export function assetGovernanceMetricItems(
  governance?: CourseProductAssetGovernanceResult
) {
  const summary = governance?.summary;
  return [
    {
      label: "总素材",
      value: summary?.totalAssetCount ?? 0,
    },
    {
      label: "未引用",
      value: summary?.unreferencedAssetCount ?? 0,
    },
    {
      label: "重复 hash",
      value: summary?.duplicateContentHashAssetCount ?? 0,
    },
    {
      label: "待审核",
      value: summary?.pendingComplianceCount ?? 0,
    },
    {
      label: "已驳回",
      value: summary?.rejectedComplianceCount ?? 0,
    },
    {
      label: "下载关闭",
      value: summary?.downloadDisabledMaterialCount ?? 0,
    },
    {
      label: "软删候选",
      value: summary?.softDeleteCandidateCount ?? 0,
    },
    {
      label: "引用来源",
      value: summary
        ? assetGovernanceReferenceSourceCopy[summary.referenceSource]
        : "未读取",
    },
  ];
}

export function queueObservationMetricItems(
  observation?: CourseProductAssetGovernanceBatchTaskQueueObservationResult
) {
  const summary = observation?.summary;
  return [
    { label: "观测任务", value: summary?.observedTaskCount ?? 0 },
    { label: "队列 job", value: summary?.observedJobCount ?? 0 },
    { label: "执行中", value: summary?.runningJobCount ?? 0 },
    { label: "失败 job", value: summary?.failedJobCount ?? 0 },
    { label: "可重试", value: summary?.retryableTaskCount ?? 0 },
    { label: "尝试次数", value: summary?.totalExecutionAttemptCount ?? 0 },
  ];
}

export function learningMaterialReportMetricItems(
  report?: CourseProductLearningMaterialOperationsReport
) {
  const summary = report?.summary;
  return [
    { label: "资料槽位", value: summary?.materialSlotCount ?? 0 },
    { label: "已绑定", value: summary?.boundMaterialSlotCount ?? 0 },
    {
      label: "绑定率",
      value: summary ? formatPercent(summary.materialBindingRate) : "0%",
    },
    { label: "资料素材", value: summary?.learningMaterialAssetCount ?? 0 },
    {
      label: "开放下载",
      value: summary?.downloadableLearningMaterialAssetCount ?? 0,
    },
    {
      label: "治理问题",
      value: summary?.governanceIssueLearningMaterialCount ?? 0,
    },
  ];
}

export function batchActionPlanMetricItems(
  plan?: CourseProductAssetGovernanceBatchActionPlanResult
) {
  const summary = plan?.summary;
  return [
    { label: "重复组", value: summary?.duplicateGroupCount ?? 0 },
    { label: "重复素材", value: summary?.duplicateAssetCount ?? 0 },
    { label: "待合并引用", value: summary?.mergeCandidateReferenceCount ?? 0 },
    { label: "软删候选", value: summary?.softDeleteCandidateCount ?? 0 },
    {
      label: "低风险软删",
      value: summary?.safeSoftDeleteCandidateCount ?? 0,
    },
    { label: "高风险项", value: summary?.highRiskItemCount ?? 0 },
  ];
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function hasAssetGovernanceIssue(
  item: CourseProductAssetGovernanceItem,
  issueType: CourseProductAssetGovernanceIssueType
) {
  return item.issueTypes.includes(issueType);
}

export function filterCourseProductAssetGovernanceItems(
  items: CourseProductAssetGovernanceItem[],
  filter: AssetGovernanceFilter
) {
  if (filter === "all") {
    return items.filter(item => item.issueTypes.length > 0);
  }

  if (filter === "compliance_status") {
    return items.filter(
      item =>
        hasAssetGovernanceIssue(item, "pending_compliance") ||
        hasAssetGovernanceIssue(item, "rejected_compliance")
    );
  }

  return items.filter(item => hasAssetGovernanceIssue(item, filter));
}

export function primaryAssetGovernanceIssue(
  item: CourseProductAssetGovernanceItem
) {
  const issueType = item.issueTypes[0];
  return issueType ? assetGovernanceIssueCopy[issueType] : "正常";
}

export function courseProductAssetGovernanceSuggestion(
  item: CourseProductAssetGovernanceItem
) {
  if (hasAssetGovernanceIssue(item, "missing_product")) {
    return "先核对素材归属，必要时从 Store 中迁移或清理异常 productId。";
  }
  if (hasAssetGovernanceIssue(item, "pending_compliance")) {
    return "进入素材队列完成合规审核，再决定是否用于详情图文或资料下载。";
  }
  if (hasAssetGovernanceIssue(item, "rejected_compliance")) {
    return "替换素材或补充来源说明，避免驳回素材继续出现在运营配置中。";
  }
  if (hasAssetGovernanceIssue(item, "download_disabled_material")) {
    return "确认资料合规后开启下载，或从章节资料中解绑该素材。";
  }
  if (hasAssetGovernanceIssue(item, "duplicate_content_hash")) {
    return "保留主素材，合并重复引用后再考虑软删冗余对象。";
  }
  if (hasAssetGovernanceIssue(item, "soft_delete_candidate")) {
    return "确认无前台引用后可进入单素材软删除确认，不触发物理删除。";
  }
  if (hasAssetGovernanceIssue(item, "unreferenced")) {
    return "补充到课程详情或章节资料，若长期不用再进入软删流程。";
  }
  return "当前素材未发现治理问题，保持定期复核。";
}

export function governanceActionsForItem(
  item: CourseProductAssetGovernanceItem
) {
  const primaryIssue = item.issueTypes[0];
  if (!primaryIssue) return [];

  const actions: AssetGovernanceActionState[] = [
    {
      item,
      action: "acknowledge_issue",
      issueType: primaryIssue,
    },
  ];

  if (hasAssetGovernanceIssue(item, "duplicate_content_hash")) {
    actions.push({
      item,
      action: "mark_duplicate_primary",
      issueType: "duplicate_content_hash",
      primaryAssetId: item.asset.id,
    });
  }

  if (hasAssetGovernanceIssue(item, "soft_delete_candidate")) {
    actions.push({
      item,
      action: "mark_soft_deleted",
      issueType: "soft_delete_candidate",
    });
  }

  return actions;
}
