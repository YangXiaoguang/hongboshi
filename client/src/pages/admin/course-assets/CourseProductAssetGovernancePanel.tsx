import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FilePenLine,
  History,
  Layers3,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  COURSE_PRODUCT_ASSET_GOVERNANCE_ACTIONS,
  COURSE_PRODUCT_ASSET_GOVERNANCE_ISSUE_TYPES,
  type CourseProductAssetGovernanceBatchActionPlanResult,
  type CourseProductAssetGovernanceBatchDraftResult,
  type CourseProductAssetGovernanceBatchIssueFilter,
  type CourseProductAssetGovernanceBatchTask,
  type CourseProductAssetGovernanceBatchTaskExecutionStatusFilter,
  type CourseProductAssetGovernanceBatchTaskListResult,
  type CourseProductAssetGovernanceBatchTaskQueueObservationResult,
  type CourseProductAssetGovernanceBatchTaskReviewAction,
  type CourseProductAssetGovernanceHistoryResult,
  type CourseProductAssetGovernanceItem,
  type CourseProductAssetGovernanceResult,
  type CourseProductAssetKind,
  type CourseProductContentAssetReviewStatus,
  type CourseProductLearningMaterialOperationsReport,
  type CourseProductReviewStatus,
} from "@shared/domain";
import {
  assetGovernanceActionCopy,
  assetGovernanceBatchTaskApprovalFilters,
  assetGovernanceBatchTaskExecutionFilters,
  assetGovernanceBatchTaskExecutionPlanRiskCopy,
  assetGovernanceBatchTaskExecutionStatusCopy,
  assetGovernanceBatchTaskQueueJobStatusCopy,
  assetGovernanceBatchTaskStatusCopy,
  assetGovernanceFilters,
  assetGovernanceIssueCopy,
  assetGovernanceMetricItems,
  assetGovernanceReferenceSourceCopy,
  batchActionPlanMetricItems,
  batchTaskFirstExecutionIssue,
  courseProductAssetGovernanceSuggestion,
  filterCourseProductAssetGovernanceItems,
  formatPercent,
  governanceActionsForItem,
  learningMaterialReportMetricItems,
  primaryAssetGovernanceIssue,
  queueObservationMetricItems,
  type AssetGovernanceActionState,
  type AssetGovernanceBatchTaskFilterState,
  type AssetGovernanceFilter,
  type AssetGovernanceHistoryFilterState,
} from "./courseAssetGovernanceModel";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const reviewCopy = {
  not_submitted: "未提交",
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
} satisfies Record<CourseProductReviewStatus, string>;

const assetReviewStatusCopy = {
  not_required: "无需审核",
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
} satisfies Record<CourseProductContentAssetReviewStatus, string>;

const courseProductAssetKindCopy = {
  detail_image: "详情主图",
  proof_image: "证明图片",
  chapter_material: "章节资料",
  worksheet: "练习表",
  audio: "音频",
  video: "视频",
} satisfies Record<CourseProductAssetKind, string>;

export default function CourseProductAssetGovernancePanel({
  governance,
  history,
  batchDraft,
  batchTasks,
  queueObservation,
  batchActionPlan,
  learningMaterialReport,
  filter,
  historyFilters,
  batchTaskFilters,
  canEdit,
  canReview,
  mutatingAssetId,
  isBatchTaskMutating = false,
  mutatingBatchTaskId,
  onFilterChange,
  onHistoryFiltersChange,
  onBatchTaskFiltersChange,
  onRefreshGovernanceData,
  onLocateAsset,
  onOpenGovernanceAction,
  onOpenBatchTaskDraft,
  onOpenBatchTaskReview,
  onOpenBatchTaskCancel,
  onOpenBatchTaskExecutionPlan,
}: {
  governance?: CourseProductAssetGovernanceResult;
  history?: CourseProductAssetGovernanceHistoryResult;
  batchDraft?: CourseProductAssetGovernanceBatchDraftResult;
  batchTasks?: CourseProductAssetGovernanceBatchTaskListResult;
  queueObservation?: CourseProductAssetGovernanceBatchTaskQueueObservationResult;
  batchActionPlan?: CourseProductAssetGovernanceBatchActionPlanResult;
  learningMaterialReport?: CourseProductLearningMaterialOperationsReport;
  filter: AssetGovernanceFilter;
  historyFilters: AssetGovernanceHistoryFilterState;
  batchTaskFilters: AssetGovernanceBatchTaskFilterState;
  canEdit: boolean;
  canReview: boolean;
  mutatingAssetId?: string;
  isBatchTaskMutating?: boolean;
  mutatingBatchTaskId?: string;
  onFilterChange: (filter: AssetGovernanceFilter) => void;
  onHistoryFiltersChange: (
    patch: Partial<AssetGovernanceHistoryFilterState>
  ) => void;
  onBatchTaskFiltersChange: (
    patch: Partial<AssetGovernanceBatchTaskFilterState>
  ) => void;
  onRefreshGovernanceData: () => void;
  onLocateAsset: (item: CourseProductAssetGovernanceItem) => void;
  onOpenGovernanceAction: (action: AssetGovernanceActionState) => void;
  onOpenBatchTaskDraft: () => void;
  onOpenBatchTaskReview: (
    task: CourseProductAssetGovernanceBatchTask,
    action: CourseProductAssetGovernanceBatchTaskReviewAction
  ) => void;
  onOpenBatchTaskCancel: (task: CourseProductAssetGovernanceBatchTask) => void;
  onOpenBatchTaskExecutionPlan: (
    task: CourseProductAssetGovernanceBatchTask
  ) => void;
}) {
  const issueItems = filterCourseProductAssetGovernanceItems(
    governance?.items ?? [],
    filter
  );
  const visibleItems = issueItems.slice(0, 8);
  const issueCount =
    governance?.items.filter(item => item.issueTypes.length > 0).length ?? 0;
  const recentBatchTasks = batchTasks?.items ?? [];
  const canCreateBatchTask = Boolean(
    canReview && batchDraft && batchDraft.summary.candidateAssetCount > 0
  );

  return (
    <section className="mt-6 overflow-hidden rounded-lg border border-[#D9D1C4] bg-[#FFFDF8] shadow-sm shadow-[#243B35]/5">
      <div className="flex flex-col gap-3 border-b border-[#E8DED0] px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[#243B35]">素材治理</p>
            <span className="inline-flex h-6 items-center rounded-full bg-[#F1E8DC] px-2.5 text-xs font-semibold text-[#756B60]">
              {canReview ? "单素材处理" : "只读"}
            </span>
            <span className="inline-flex h-6 items-center rounded-full bg-[#EEF6ED] px-2.5 text-xs font-semibold text-[#41675A]">
              {issueCount} 个待处理
            </span>
          </div>
          <p className="mt-2 max-w-[760px] text-sm leading-6 text-[#6F7771]">
            汇总课程素材的引用、重复内容、合规和下载状态，帮助运营先定位问题，再进入已有内容与素材队列处理。
          </p>
        </div>
        <p className="text-xs leading-5 text-[#8A8176]">
          生成时间{" "}
          {governance?.generatedAt
            ? formatDate(governance.generatedAt)
            : "待读取"}
        </p>
      </div>

      <div className="grid border-b border-[#E8DED0] bg-[#FBF7EF] sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {assetGovernanceMetricItems(governance).map(item => (
          <div
            key={item.label}
            className="min-h-[76px] border-b border-r border-[#E8DED0] px-4 py-3 last:border-r-0"
          >
            <p className="text-xs text-[#8A8176]">{item.label}</p>
            <p className="mt-2 truncate text-lg font-semibold text-[#243B35]">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {governance?.notes.length ? (
        <div className="border-b border-[#E8DED0] px-5 py-3">
          <div className="flex flex-wrap gap-2">
            {governance.notes.map(note => (
              <span
                key={note}
                className="inline-flex min-h-7 items-center rounded-full bg-[#FFF7E5] px-3 text-xs font-semibold text-[#8F6B1C]"
              >
                {note}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid border-b border-[#E8DED0] bg-white lg:grid-cols-2">
        <div className="border-b border-[#E8DED0] px-5 py-4 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#243B35]">队列观测</p>
              <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                最近任务 job、执行中、失败和可重试压力。
              </p>
            </div>
            <span className="inline-flex h-7 items-center rounded-full bg-[#F1E8DC] px-2.5 text-xs font-semibold text-[#756B60]">
              {queueObservation?.generatedAt
                ? formatDate(queueObservation.generatedAt)
                : canReview
                  ? "待读取"
                  : "需审核权限"}
            </span>
          </div>
          {queueObservation ? (
            <>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {queueObservationMetricItems(queueObservation).map(item => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-[#E8DED0] bg-[#FBF7EF] px-3 py-2"
                  >
                    <p className="text-xs text-[#8A8176]">{item.label}</p>
                    <p className="mt-1 text-lg font-semibold text-[#243B35]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-2">
                {queueObservation.items.slice(0, 3).map(item => (
                  <div
                    key={item.taskId}
                    className="rounded-lg border border-[#E1D7C8] bg-white px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-[#243B35]">
                        {item.task?.reason ?? item.taskId}
                      </p>
                      <span className="text-xs text-[#8A8176]">
                        {item.latestJob
                          ? assetGovernanceBatchTaskQueueJobStatusCopy[
                              item.latestJob.status
                            ]
                          : item.executionStatus
                            ? assetGovernanceBatchTaskExecutionStatusCopy[
                                item.executionStatus
                              ]
                            : "无 job"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[#6F7771]">
                      {item.operatorHint}
                    </p>
                    {item.lastExecutionError ? (
                      <p className="mt-1 text-xs leading-5 text-[#A65F48]">
                        {item.lastExecutionError}
                      </p>
                    ) : null}
                  </div>
                ))}
                {!queueObservation.items.length ? (
                  <p className="text-xs leading-5 text-[#8A8176]">
                    暂无可观测队列任务。
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[#8A8176]">
              当前账号只能查看素材治理摘要，队列观测需审核权限。
            </p>
          )}
        </div>

        <div className="px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#243B35]">
                学习资料运营报表
              </p>
              <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                章节资料绑定、下载开放、合规和治理问题分布。
              </p>
            </div>
            <span className="inline-flex h-7 items-center rounded-full bg-[#EEF6ED] px-2.5 text-xs font-semibold text-[#41675A]">
              {learningMaterialReport
                ? assetGovernanceReferenceSourceCopy[
                    learningMaterialReport.summary.referenceSource
                  ]
                : "待读取"}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {learningMaterialReportMetricItems(learningMaterialReport).map(
              item => (
                <div
                  key={item.label}
                  className="rounded-lg border border-[#E8DED0] bg-[#FBF7EF] px-3 py-2"
                >
                  <p className="text-xs text-[#8A8176]">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold text-[#243B35]">
                    {item.value}
                  </p>
                </div>
              )
            )}
          </div>
          {learningMaterialReport ? (
            <>
              <div className="mt-3 flex flex-wrap gap-2">
                {learningMaterialReport.issueTypeDistribution
                  .slice(0, 5)
                  .map(item => (
                    <span
                      key={item.key}
                      className="inline-flex h-7 items-center rounded-full bg-[#FFF7E5] px-2.5 text-xs font-semibold text-[#8F6B1C]"
                    >
                      {item.label} {item.count}
                    </span>
                  ))}
                {!learningMaterialReport.issueTypeDistribution.length ? (
                  <span className="inline-flex h-7 items-center rounded-full bg-[#EEF6ED] px-2.5 text-xs font-semibold text-[#41675A]">
                    暂无资料治理问题
                  </span>
                ) : null}
              </div>
              <div className="mt-3 space-y-2">
                {learningMaterialReport.productRows.slice(0, 3).map(row => (
                  <div
                    key={row.productId}
                    className="rounded-lg border border-[#E1D7C8] bg-white px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-[#243B35]">
                        {row.title}
                      </p>
                      <span className="text-xs text-[#8A8176]">
                        绑定率 {formatPercent(row.materialBindingRate)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[#6F7771]">
                      资料槽 {row.materialSlotCount} · 已绑定{" "}
                      {row.boundMaterialSlotCount} · 问题素材{" "}
                      {row.issueAssetCount}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[#8A8176]">
              学习资料运营报表待读取。
            </p>
          )}
        </div>
      </div>

      <div className="border-b border-[#E8DED0] bg-[#FBF7EF] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-[#243B35]">
                高风险批量动作只读预案
              </p>
              <span className="inline-flex h-6 items-center rounded-full bg-[#FFF7E5] px-2.5 text-xs font-semibold text-[#8F6B1C]">
                不可执行
              </span>
            </div>
            <p className="mt-1 max-w-[760px] text-xs leading-5 text-[#8A8176]">
              批量软删除、重复素材主素材选择和章节引用合并先只展示影响范围，当前不会保存任务、写审计或修改素材。
            </p>
          </div>
          <span className="inline-flex h-7 items-center rounded-full bg-white px-2.5 text-xs font-semibold text-[#756B60]">
            {batchActionPlan?.generatedAt
              ? formatDate(batchActionPlan.generatedAt)
              : canReview
                ? "待读取"
                : "需审核权限"}
          </span>
        </div>
        {batchActionPlan ? (
          <>
            <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {batchActionPlanMetricItems(batchActionPlan).map(item => (
                <div
                  key={item.label}
                  className="rounded-lg border border-[#E8DED0] bg-white px-3 py-2"
                >
                  <p className="text-xs text-[#8A8176]">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold text-[#243B35]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-[#E1D7C8] bg-white p-3">
                <div className="flex items-center gap-2">
                  <Layers3 className="h-4 w-4 text-[#5D7F73]" />
                  <p className="text-xs font-semibold text-[#243B35]">
                    重复素材与引用合并
                  </p>
                </div>
                <div className="mt-3 space-y-2">
                  {batchActionPlan.duplicateGroups.slice(0, 2).map(group => (
                    <div
                      key={group.contentHash}
                      className="rounded-lg border border-[#E8DED0] bg-[#FFFDF8] px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-[#243B35]">
                          主素材 {group.suggestedPrimaryAssetId ?? "待人工确认"}
                        </p>
                        <span
                          className={`text-xs font-semibold ${
                            group.riskLevel === "high"
                              ? "text-[#A65F48]"
                              : group.riskLevel === "medium"
                                ? "text-[#8F6B1C]"
                                : "text-[#41675A]"
                          }`}
                        >
                          {
                            assetGovernanceBatchTaskExecutionPlanRiskCopy[
                              group.riskLevel
                            ]
                          }
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[#6F7771]">
                        素材 {group.duplicateAssetCount} · 受影响引用{" "}
                        {group.affectedReferenceCount} · 待合并{" "}
                        {group.mergeCandidateReferenceCount}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#8A8176]">
                        {group.reviewReasons.join("；")}
                      </p>
                    </div>
                  ))}
                  {!batchActionPlan.duplicateGroups.length ? (
                    <p className="text-xs leading-5 text-[#8A8176]">
                      当前没有重复 contentHash 合并预案。
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="rounded-lg border border-[#E1D7C8] bg-white p-3">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-[#A65F48]" />
                  <p className="text-xs font-semibold text-[#243B35]">
                    软删除影响预案
                  </p>
                </div>
                <div className="mt-3 space-y-2">
                  {batchActionPlan.softDeleteCandidates
                    .slice(0, 3)
                    .map(item => (
                      <div
                        key={item.asset.assetId}
                        className="rounded-lg border border-[#E8DED0] bg-[#FFFDF8] px-3 py-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="truncate text-xs font-semibold text-[#243B35]">
                            {item.asset.assetTitle ?? item.asset.assetId}
                          </p>
                          <span
                            className={`text-xs font-semibold ${
                              item.canSoftDeleteSafely
                                ? "text-[#41675A]"
                                : "text-[#A65F48]"
                            }`}
                          >
                            {item.canSoftDeleteSafely
                              ? "低风险候选"
                              : "需人工复核"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-[#6F7771]">
                          引用 {item.asset.referenceCount} · 下载{" "}
                          {item.downloadEnabled ? "开启" : "关闭"} · 成交位{" "}
                          {item.frontStageUsage ? "可能使用" : "未发现"}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#8A8176]">
                          {item.reviewReasons.join("；")}
                        </p>
                      </div>
                    ))}
                  {!batchActionPlan.softDeleteCandidates.length ? (
                    <p className="text-xs leading-5 text-[#8A8176]">
                      当前没有软删除候选预案。
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
            {batchActionPlan.safetyNotes.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {batchActionPlan.safetyNotes.slice(0, 3).map(note => (
                  <span
                    key={note}
                    className="inline-flex min-h-7 items-center rounded-full bg-white px-3 text-xs font-semibold text-[#756B60]"
                  >
                    {note}
                  </span>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <p className="mt-4 text-sm leading-6 text-[#8A8176]">
            当前账号只能查看素材治理摘要，高风险批量动作预案需审核权限。
          </p>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-[#E8DED0] px-5 py-3">
        {assetGovernanceFilters.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => onFilterChange(option.value)}
            className={`h-8 shrink-0 rounded-lg px-3 text-xs font-semibold transition ${
              filter === option.value
                ? "bg-[#243B35] text-white"
                : "border border-[#D8CEC0] bg-white text-[#41524B] hover:border-[#9FB3A9]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid border-b border-[#E8DED0] bg-[#FFFDF8] lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.88fr)]">
        <div className="border-b border-[#E8DED0] px-5 py-4 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#243B35]">
                批量处理草稿预览
              </p>
              <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                按当前问题筛选生成候选摘要，先保存为待审批草案，不批量写入素材。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-7 items-center rounded-full bg-[#F1E8DC] px-2.5 text-xs font-semibold text-[#756B60]">
                {canReview ? "待审批/未执行" : "需审核权限"}
              </span>
              {canReview && (
                <button
                  type="button"
                  onClick={onOpenBatchTaskDraft}
                  disabled={!canCreateBatchTask || isBatchTaskMutating}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#243B35] px-3 text-xs font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {isBatchTaskMutating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ClipboardCheck className="h-3.5 w-3.5" />
                  )}
                  保存草案
                </button>
              )}
            </div>
          </div>
          {canReview && batchDraft ? (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["候选素材", batchDraft.summary.candidateAssetCount],
                  ["预览行", batchDraft.summary.previewItemCount],
                  ["可记录动作", batchDraft.summary.eligibleActionCount],
                  ["需人工复核", batchDraft.summary.manualReviewAssetCount],
                ].map(([label, value]) => (
                  <div key={label} className="border-r border-[#E8DED0] pr-3">
                    <p className="text-xs text-[#8A8176]">{label}</p>
                    <p className="mt-1 text-lg font-semibold text-[#243B35]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {batchDraft.summary.issueTypeDistribution
                  .slice(0, 6)
                  .map(item => (
                    <span
                      key={item.key}
                      className="inline-flex h-7 items-center rounded-full bg-[#EEF6ED] px-2.5 text-xs font-semibold text-[#41675A]"
                    >
                      {item.label} {item.count}
                    </span>
                  ))}
                {!batchDraft.summary.issueTypeDistribution.length && (
                  <span className="text-xs text-[#8A8176]">
                    当前筛选没有待处理候选。
                  </span>
                )}
              </div>
              <ul className="mt-3 space-y-1 text-xs leading-5 text-[#8A8176]">
                {batchDraft.safetyNotes.slice(0, 3).map(note => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              <div className="mt-4 border-t border-[#E8DED0] pt-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[#41524B]">
                      批量治理任务
                    </p>
                    <p className="mt-1 text-xs text-[#8A8176]">
                      总数 {batchTasks?.meta.total ?? 0} · 待审批{" "}
                      {batchTasks?.summary.pendingApprovalCount ?? 0}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onRefreshGovernanceData}
                    className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#D8CEC0] bg-white px-2 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
                  >
                    <RefreshCw className="h-3 w-3" />
                    刷新
                  </button>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <select
                    value={batchTaskFilters.approvalStatus}
                    onChange={event =>
                      onBatchTaskFiltersChange({
                        approvalStatus: event.target
                          .value as AssetGovernanceBatchTaskFilterState["approvalStatus"],
                        page: 1,
                      })
                    }
                    className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-2 text-xs text-[#41524B] outline-none transition focus:border-[#6F8F83]"
                  >
                    {assetGovernanceBatchTaskApprovalFilters.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={batchTaskFilters.executionStatus}
                    onChange={event =>
                      onBatchTaskFiltersChange({
                        executionStatus: event.target
                          .value as CourseProductAssetGovernanceBatchTaskExecutionStatusFilter,
                        page: 1,
                      })
                    }
                    className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-2 text-xs text-[#41524B] outline-none transition focus:border-[#6F8F83]"
                  >
                    {assetGovernanceBatchTaskExecutionFilters.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={batchTaskFilters.issueFilter}
                    onChange={event =>
                      onBatchTaskFiltersChange({
                        issueFilter: event.target
                          .value as CourseProductAssetGovernanceBatchIssueFilter,
                        page: 1,
                      })
                    }
                    className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-2 text-xs text-[#41524B] outline-none transition focus:border-[#6F8F83]"
                  >
                    {assetGovernanceFilters.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={batchTaskFilters.action}
                    onChange={event =>
                      onBatchTaskFiltersChange({
                        action: event.target
                          .value as AssetGovernanceBatchTaskFilterState["action"],
                        page: 1,
                      })
                    }
                    className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-2 text-xs text-[#41524B] outline-none transition focus:border-[#6F8F83]"
                  >
                    <option value="all">全部动作</option>
                    {COURSE_PRODUCT_ASSET_GOVERNANCE_ACTIONS.map(action => (
                      <option key={action} value={action}>
                        {assetGovernanceActionCopy[action]}
                      </option>
                    ))}
                  </select>
                  <input
                    value={batchTaskFilters.createdBy}
                    onChange={event =>
                      onBatchTaskFiltersChange({
                        createdBy: event.target.value,
                        page: 1,
                      })
                    }
                    placeholder="创建人 ID"
                    className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-2 text-xs text-[#41524B] outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
                  />
                  <input
                    value={batchTaskFilters.executionRequestedBy}
                    onChange={event =>
                      onBatchTaskFiltersChange({
                        executionRequestedBy: event.target.value,
                        page: 1,
                      })
                    }
                    placeholder="执行人 ID"
                    className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-2 text-xs text-[#41524B] outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
                  />
                  <input
                    type="date"
                    value={batchTaskFilters.dateFrom}
                    onChange={event =>
                      onBatchTaskFiltersChange({
                        dateFrom: event.target.value,
                        page: 1,
                      })
                    }
                    className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-2 text-xs text-[#41524B] outline-none transition focus:border-[#6F8F83]"
                  />
                  <input
                    type="date"
                    value={batchTaskFilters.dateTo}
                    onChange={event =>
                      onBatchTaskFiltersChange({
                        dateTo: event.target.value,
                        page: 1,
                      })
                    }
                    className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-2 text-xs text-[#41524B] outline-none transition focus:border-[#6F8F83]"
                  />
                </div>
                {recentBatchTasks.length ? (
                  <div className="mt-2 space-y-2">
                    {recentBatchTasks.map(task => {
                      const executionIssue = batchTaskFirstExecutionIssue(task);
                      return (
                        <div
                          key={task.id}
                          className="rounded-lg border border-[#E1D7C8] bg-white px-3 py-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[#243B35]">
                              {
                                assetGovernanceBatchTaskStatusCopy[
                                  task.approvalStatus
                                ]
                              }{" "}
                              · {assetGovernanceActionCopy[task.action]}
                            </span>
                            <span className="text-xs text-[#8A8176]">
                              {formatDate(task.updatedAt)}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-1 text-xs text-[#6F7771]">
                            {task.candidateAssetCount} 个候选 ·{" "}
                            {assetGovernanceFilters.find(
                              option => option.value === task.query.issueFilter
                            )?.label ?? task.query.issueFilter}{" "}
                            · 创建人 {task.createdBy}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex h-6 items-center rounded-full bg-[#EEF6ED] px-2 text-xs font-semibold text-[#41675A]">
                              {task.manualReviewAssetCount} 个需复核
                            </span>
                            <span className="inline-flex h-6 items-center rounded-full bg-[#F1E8DC] px-2 text-xs font-semibold text-[#756B60]">
                              {
                                assetGovernanceBatchTaskExecutionStatusCopy[
                                  task.executionStatus
                                ]
                              }
                            </span>
                            {task.executionStatus === "failed" ? (
                              <span className="inline-flex h-6 items-center rounded-full bg-[#FDEBE5] px-2 text-xs font-semibold text-[#A65F48]">
                                可重试
                              </span>
                            ) : null}
                            {task.approvalStatus === "pending_approval" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenBatchTaskReview(task, "approve")
                                  }
                                  disabled={isBatchTaskMutating}
                                  className="inline-flex h-6 items-center rounded-lg bg-[#E6EDDF] px-2 text-xs font-semibold text-[#355F51] transition hover:bg-[#D7E5D4] disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                  通过审批
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenBatchTaskReview(task, "reject")
                                  }
                                  disabled={isBatchTaskMutating}
                                  className="inline-flex h-6 items-center rounded-lg border border-[#D8CEC0] bg-white px-2 text-xs font-semibold text-[#A65F48] transition hover:border-[#EDCDBF] disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                  驳回
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onOpenBatchTaskCancel(task)}
                                  disabled={isBatchTaskMutating}
                                  className="inline-flex h-6 items-center rounded-lg border border-[#D8CEC0] bg-white px-2 text-xs font-semibold text-[#6F7771] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                  取消
                                </button>
                              </>
                            )}
                            {task.approvalStatus === "approved" && (
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenBatchTaskExecutionPlan(task)
                                }
                                disabled={
                                  isBatchTaskMutating ||
                                  task.executionStatus === "running"
                                }
                                className="inline-flex h-6 items-center gap-1 rounded-lg bg-[#E6EDDF] px-2 text-xs font-semibold text-[#355F51] transition hover:bg-[#D7E5D4] disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                {mutatingBatchTaskId ===
                                `execution:${task.id}` ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <ClipboardCheck className="h-3 w-3" />
                                )}
                                {task.executionStatus === "not_started"
                                  ? "生成执行预案"
                                  : task.executionStatus === "failed"
                                    ? "查看/重试"
                                    : "查看执行记录"}
                              </button>
                            )}
                          </div>
                          {task.executionSummary ? (
                            <p className="mt-2 text-xs leading-5 text-[#6F7771]">
                              执行 {task.executionSummary.executedActionCount} ·
                              跳过 {task.executionSummary.skippedActionCount} ·
                              失败 {task.executionSummary.failedActionCount} ·
                              审计 {task.executionSummary.auditEventCount}
                            </p>
                          ) : null}
                          {executionIssue ? (
                            <p className="mt-2 rounded-md bg-[#FFF7E5] px-2 py-1 text-xs leading-5 text-[#8F6B1C]">
                              异常线索：{executionIssue}
                            </p>
                          ) : null}
                          {task.lastExecutionError ? (
                            <p className="mt-2 rounded-md bg-[#FDEBE5] px-2 py-1 text-xs leading-5 text-[#A65F48]">
                              最近失败：{task.lastExecutionError}
                              {task.lastExecutionFailedAt
                                ? ` · ${formatDate(task.lastExecutionFailedAt)}`
                                : ""}
                            </p>
                          ) : null}
                          {task.executionAuditEventIds[0] ? (
                            <p className="mt-2 text-xs text-[#8A8176]">
                              审计事件 {task.executionAuditEventIds[0]}
                            </p>
                          ) : null}
                          {task.approvalPreflight?.requiresRecreate ? (
                            <p className="mt-2 rounded-md bg-[#FFF7E5] px-2 py-1 text-xs leading-5 text-[#8F6B1C]">
                              预检提示：{task.approvalPreflight.notes[0]}
                            </p>
                          ) : null}
                          {task.reviewedBy ? (
                            <p className="mt-2 text-xs text-[#8A8176]">
                              审批人 {task.reviewedBy} ·{" "}
                              {task.reviewedAt
                                ? formatDate(task.reviewedAt)
                                : "未记录"}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-xs text-[#8A8176]">
                        第 {batchTasks?.meta.page ?? 1} /{" "}
                        {batchTasks?.meta.totalPages || 1} 页
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onBatchTaskFiltersChange({
                              page: Math.max(1, batchTaskFilters.page - 1),
                            })
                          }
                          disabled={(batchTasks?.meta.page ?? 1) <= 1}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#D8CEC0] bg-white px-2 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <ChevronLeft className="h-3 w-3" />
                          上一页
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onBatchTaskFiltersChange({
                              page: (batchTasks?.meta.page ?? 1) + 1,
                            })
                          }
                          disabled={
                            (batchTasks?.meta.page ?? 1) >=
                            (batchTasks?.meta.totalPages || 1)
                          }
                          className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#D8CEC0] bg-white px-2 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          下一页
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs leading-5 text-[#8A8176]">
                    暂无批量治理任务草案。
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[#8A8176]">
              批量草稿涉及后续处理动作，当前账号仅可查看治理摘要与历史。
            </p>
          )}
        </div>

        <div className="px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#243B35]">
                治理动作历史
              </p>
              <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                只读取审计摘要，不暴露对象文件或签名 URL。
              </p>
            </div>
            <button
              type="button"
              onClick={onRefreshGovernanceData}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D8CEC0] bg-white px-2.5 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
            >
              <History className="h-3.5 w-3.5" />
              筛选历史
            </button>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <input
              value={historyFilters.assetId}
              onChange={event =>
                onHistoryFiltersChange({ assetId: event.target.value })
              }
              placeholder="素材 ID"
              className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-xs outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
            />
            <input
              value={historyFilters.productId}
              onChange={event =>
                onHistoryFiltersChange({ productId: event.target.value })
              }
              placeholder="商品 ID"
              className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-xs outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
            />
            <input
              value={historyFilters.actorId}
              onChange={event =>
                onHistoryFiltersChange({ actorId: event.target.value })
              }
              placeholder="操作者 ID"
              className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-xs outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
            />
            <select
              value={historyFilters.action}
              onChange={event =>
                onHistoryFiltersChange({
                  action: event.target
                    .value as AssetGovernanceHistoryFilterState["action"],
                })
              }
              className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-xs text-[#41524B] outline-none transition focus:border-[#6F8F83]"
            >
              <option value="all">全部动作</option>
              {COURSE_PRODUCT_ASSET_GOVERNANCE_ACTIONS.map(action => (
                <option key={action} value={action}>
                  {assetGovernanceActionCopy[action]}
                </option>
              ))}
            </select>
            <select
              value={historyFilters.issueType}
              onChange={event =>
                onHistoryFiltersChange({
                  issueType: event.target
                    .value as AssetGovernanceHistoryFilterState["issueType"],
                })
              }
              className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-xs text-[#41524B] outline-none transition focus:border-[#6F8F83]"
            >
              <option value="all">全部问题</option>
              {COURSE_PRODUCT_ASSET_GOVERNANCE_ISSUE_TYPES.map(issueType => (
                <option key={issueType} value={issueType}>
                  {assetGovernanceIssueCopy[issueType]}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={historyFilters.dateFrom}
                onChange={event =>
                  onHistoryFiltersChange({ dateFrom: event.target.value })
                }
                className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-2 text-xs outline-none transition focus:border-[#6F8F83]"
              />
              <input
                type="date"
                value={historyFilters.dateTo}
                onChange={event =>
                  onHistoryFiltersChange({ dateTo: event.target.value })
                }
                className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-2 text-xs outline-none transition focus:border-[#6F8F83]"
              />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {history?.items.length ? (
              history.items.map(item => (
                <div
                  key={item.id}
                  className="border-t border-[#E8DED0] pt-2 text-xs leading-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[#243B35]">
                      {assetGovernanceActionCopy[item.action]}
                    </span>
                    <span className="text-[#A65F48]">
                      {assetGovernanceIssueCopy[item.issueType]}
                    </span>
                    <span className="text-[#8A8176]">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-[#5F6B64]">
                    {item.assetTitle ?? item.assetId} · 操作者 {item.actorId}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[#8A8176]">
                    {item.reason}
                  </p>
                </div>
              ))
            ) : (
              <p className="border-t border-[#E8DED0] pt-3 text-sm text-[#8A8176]">
                {history ? "当前筛选下暂无治理动作历史" : "治理历史待读取"}
              </p>
            )}
          </div>
        </div>
      </div>

      {visibleItems.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1360px] text-left">
            <thead className="bg-[#F8F3EA] text-xs text-[#8A8176]">
              <tr>
                <th className="px-5 py-3 font-semibold">课程商品</th>
                <th className="px-5 py-3 font-semibold">素材</th>
                <th className="px-5 py-3 font-semibold">合规</th>
                <th className="px-5 py-3 font-semibold">引用</th>
                <th className="px-5 py-3 font-semibold">重复对象</th>
                <th className="px-5 py-3 font-semibold">更新时间</th>
                <th className="px-5 py-3 font-semibold">建议处理</th>
                <th className="px-5 py-3 font-semibold">治理动作</th>
                <th className="px-5 py-3 font-semibold">定位</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map(item => (
                <tr
                  key={item.asset.id}
                  className="border-b border-[#E8DED0] last:border-b-0 hover:bg-[#FBF7EF]"
                >
                  <td className="px-5 py-4">
                    <div className="min-w-[190px]">
                      <p className="truncate text-sm font-semibold text-[#243B35]">
                        {item.product?.title ?? "商品不存在"}
                      </p>
                      <p className="mt-1 text-xs text-[#8A8176]">
                        {item.product
                          ? `ID ${item.product.courseId} · ${reviewCopy[item.product.reviewStatus]}`
                          : item.asset.productId}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="min-w-[190px]">
                      <p className="truncate text-sm font-semibold text-[#243B35]">
                        {item.asset.title}
                      </p>
                      <p className="mt-1 text-xs text-[#8A8176]">
                        {courseProductAssetKindCopy[item.asset.kind]} ·{" "}
                        {item.asset.fileName}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[#A65F48]">
                        {primaryAssetGovernanceIssue(item)}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold ${
                        item.asset.complianceStatus === "approved"
                          ? "bg-[#E7EFE8] text-[#41675A]"
                          : item.asset.complianceStatus === "rejected"
                            ? "bg-[#FFF0EA] text-[#AD503A]"
                            : item.asset.complianceStatus === "pending"
                              ? "bg-[#FFF7E5] text-[#8F6B1C]"
                              : "bg-[#F1E8DC] text-[#7B817C]"
                      }`}
                    >
                      {assetReviewStatusCopy[item.asset.complianceStatus]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-[#5F6B64]">
                    <div className="min-w-[108px]">
                      <p>{item.referenceCount} 处引用</p>
                      <p className="mt-1 text-xs text-[#8A8176]">
                        {
                          assetGovernanceReferenceSourceCopy[
                            item.referenceSource
                          ]
                        }
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-[#5F6B64]">
                    <div className="min-w-[132px]">
                      {item.duplicateContentHashAssetIds.length > 0 ? (
                        <>
                          <p>
                            {item.duplicateContentHashAssetIds.length} 个重复
                          </p>
                          <p className="mt-1 truncate text-xs text-[#8A8176]">
                            {item.duplicateContentHashAssetIds.join("、")}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-[#8A8176]">无重复对象</p>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-[#5F6B64]">
                    <div className="min-w-[100px]">
                      {formatDate(item.asset.updatedAt)}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="min-w-[240px] max-w-[300px] text-xs leading-5 text-[#6F7771]">
                      {courseProductAssetGovernanceSuggestion(item)}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex min-w-[180px] flex-wrap gap-2">
                      {canReview && item.product ? (
                        governanceActionsForItem(item).map(action => (
                          <button
                            key={action.action}
                            type="button"
                            onClick={() => onOpenGovernanceAction(action)}
                            disabled={mutatingAssetId === item.asset.id}
                            className={`h-8 rounded-lg px-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                              action.action === "mark_soft_deleted"
                                ? "bg-[#FFF0EA] text-[#AD503A] hover:bg-[#FFE8DE]"
                                : action.action === "mark_duplicate_primary"
                                  ? "bg-[#E6EDDF] text-[#355F51] hover:bg-[#D7E5D4]"
                                  : "border border-[#D8CEC0] bg-white text-[#41524B] hover:border-[#9FB3A9]"
                            }`}
                          >
                            {assetGovernanceActionCopy[action.action]}
                          </button>
                        ))
                      ) : (
                        <span className="inline-flex h-8 items-center rounded-lg bg-[#F1E8DC] px-2.5 text-xs font-semibold text-[#7B817C]">
                          {item.product ? "只读" : "待核对"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => onLocateAsset(item)}
                      disabled={!item.product}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D8CEC0] bg-white px-2.5 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <FilePenLine className="h-3.5 w-3.5" />
                      {canEdit ? "打开素材" : "定位课程"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex min-h-[160px] flex-col items-center justify-center px-6 text-center">
          <BadgeCheck className="h-8 w-8 text-[#7C9288]" />
          <h2 className="mt-3 text-base font-semibold">
            {governance ? "当前筛选下暂无素材问题" : "素材治理待读取"}
          </h2>
          <p className="mt-2 max-w-[460px] text-sm leading-6 text-[#6F7771]">
            {governance
              ? "可以切换筛选条件继续检查，或在课程内容面板中维护素材队列。"
              : "刷新后会读取素材引用、合规和重复内容摘要。"}
          </p>
        </div>
      )}
    </section>
  );
}
