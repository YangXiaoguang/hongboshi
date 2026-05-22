import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  type CourseProductAssetGovernanceBatchActionPlanResult,
  type CourseProductAssetGovernanceBatchDraftResult,
  type CourseProductAssetGovernanceBatchTask,
  type CourseProductAssetGovernanceBatchTaskExecutionDetailResult,
  type CourseProductAssetGovernanceBatchTaskExecutionPlanResult,
  type CourseProductAssetGovernanceBatchTaskExecutionResult,
  type CourseProductAssetGovernanceBatchTaskListResult,
  type CourseProductAssetGovernanceBatchTaskQueueObservationResult,
  type CourseProductAssetGovernanceBatchTaskReviewAction,
  type CourseProductAssetGovernanceHistoryResult,
  type CourseProductAssetGovernanceItem,
  type CourseProductAssetGovernanceResult,
  type CourseProductLearningMaterialOperationsReport,
} from "@shared/domain";
import { useAuth } from "@/contexts/AuthContext";
import { httpCourseProductRepository } from "@/features/catalog";
import { getCourseProductAdminPermissions } from "@/features/catalog/model/courseProductAdminPermissions";
import CourseProductAssetGovernancePanel from "./CourseProductAssetGovernancePanel";
import {
  assetGovernanceActionCopy,
  assetGovernanceBatchIssueFilterFromPanelFilter,
  assetGovernanceBatchTaskCreateRequestFromPanelFilter,
  assetGovernanceBatchTaskExecuteRequestFromReason,
  assetGovernanceBatchTaskExecutionPlanItemStatusCopy,
  assetGovernanceBatchTaskExecutionPlanRiskCopy,
  assetGovernanceBatchTaskExecutionPlanSummaryText,
  assetGovernanceBatchTaskExecutionStatusCopy,
  assetGovernanceBatchTaskListQueryFromFilters,
  assetGovernanceBatchTaskReviewActionCopy,
  assetGovernanceBatchTaskReviewRequestFromAction,
  assetGovernanceHistoryQueryFromFilters,
  assetGovernanceIssueCopy,
  defaultAssetGovernanceBatchTaskFilters,
  defaultAssetGovernanceHistoryFilters,
  type AssetGovernanceActionState,
  type AssetGovernanceBatchTaskCancelState,
  type AssetGovernanceBatchTaskFilterState,
  type AssetGovernanceBatchTaskReviewState,
  type AssetGovernanceFilter,
  type AssetGovernanceHistoryFilterState,
} from "./courseAssetGovernanceModel";

export default function CourseAssetGovernancePage() {
  const { user, isLoggedIn, isAuthSyncing } = useAuth();
  const [assetGovernance, setAssetGovernance] =
    useState<CourseProductAssetGovernanceResult>();
  const [assetGovernanceHistory, setAssetGovernanceHistory] =
    useState<CourseProductAssetGovernanceHistoryResult>();
  const [assetGovernanceBatchDraft, setAssetGovernanceBatchDraft] =
    useState<CourseProductAssetGovernanceBatchDraftResult>();
  const [assetGovernanceBatchTasks, setAssetGovernanceBatchTasks] =
    useState<CourseProductAssetGovernanceBatchTaskListResult>();
  const [assetGovernanceQueueObservation, setAssetGovernanceQueueObservation] =
    useState<CourseProductAssetGovernanceBatchTaskQueueObservationResult>();
  const [assetGovernanceBatchActionPlan, setAssetGovernanceBatchActionPlan] =
    useState<CourseProductAssetGovernanceBatchActionPlanResult>();
  const [learningMaterialReport, setLearningMaterialReport] =
    useState<CourseProductLearningMaterialOperationsReport>();
  const [assetGovernanceFilter, setAssetGovernanceFilter] =
    useState<AssetGovernanceFilter>("all");
  const [assetGovernanceHistoryFilters, setAssetGovernanceHistoryFilters] =
    useState<AssetGovernanceHistoryFilterState>(
      defaultAssetGovernanceHistoryFilters
    );
  const [assetGovernanceBatchTaskFilters, setAssetGovernanceBatchTaskFilters] =
    useState<AssetGovernanceBatchTaskFilterState>(
      defaultAssetGovernanceBatchTaskFilters
    );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [actionMessage, setActionMessage] = useState<string>();
  const [mutatingAssetId, setMutatingAssetId] = useState<string>();
  const [governanceAction, setGovernanceAction] =
    useState<AssetGovernanceActionState>();
  const [governanceReason, setGovernanceReason] = useState("");
  const [governanceNote, setGovernanceNote] = useState("");
  const [
    isAssetGovernanceBatchTaskDraftOpen,
    setIsAssetGovernanceBatchTaskDraftOpen,
  ] = useState(false);
  const [assetGovernanceBatchTaskReason, setAssetGovernanceBatchTaskReason] =
    useState("");
  const [assetGovernanceBatchTaskNote, setAssetGovernanceBatchTaskNote] =
    useState("");
  const [assetGovernanceBatchTaskCancel, setAssetGovernanceBatchTaskCancel] =
    useState<AssetGovernanceBatchTaskCancelState>();
  const [
    assetGovernanceBatchTaskCancelReason,
    setAssetGovernanceBatchTaskCancelReason,
  ] = useState("");
  const [assetGovernanceBatchTaskReview, setAssetGovernanceBatchTaskReview] =
    useState<AssetGovernanceBatchTaskReviewState>();
  const [
    assetGovernanceBatchTaskReviewReason,
    setAssetGovernanceBatchTaskReviewReason,
  ] = useState("");
  const [
    assetGovernanceBatchTaskExecutionPlan,
    setAssetGovernanceBatchTaskExecutionPlan,
  ] = useState<CourseProductAssetGovernanceBatchTaskExecutionPlanResult>();
  const [
    assetGovernanceBatchTaskExecutionResult,
    setAssetGovernanceBatchTaskExecutionResult,
  ] = useState<CourseProductAssetGovernanceBatchTaskExecutionResult>();
  const [
    assetGovernanceBatchTaskExecutionDetail,
    setAssetGovernanceBatchTaskExecutionDetail,
  ] = useState<CourseProductAssetGovernanceBatchTaskExecutionDetailResult>();
  const [
    assetGovernanceBatchTaskExecuteReason,
    setAssetGovernanceBatchTaskExecuteReason,
  ] = useState("");
  const [
    assetGovernanceBatchTaskExecuteNote,
    setAssetGovernanceBatchTaskExecuteNote,
  ] = useState("");
  const [
    isAssetGovernanceBatchTaskExecuteConfirmed,
    setIsAssetGovernanceBatchTaskExecuteConfirmed,
  ] = useState(false);
  const [mutatingBatchTaskId, setMutatingBatchTaskId] = useState<string>();

  const catalogPermissions = useMemo(
    () => getCourseProductAdminPermissions(user),
    [user]
  );

  const loadGovernanceData = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const [
        governance,
        learningReport,
        history,
        batchDraft,
        batchTasks,
        queueObservation,
        batchActionPlan,
      ] = await Promise.all([
        httpCourseProductRepository.loadCourseProductAssetGovernance(),
        httpCourseProductRepository.loadCourseProductLearningMaterialOperationsReport(),
        httpCourseProductRepository.loadCourseProductAssetGovernanceHistory(
          assetGovernanceHistoryQueryFromFilters(assetGovernanceHistoryFilters)
        ),
        catalogPermissions.canReview
          ? httpCourseProductRepository.loadCourseProductAssetGovernanceBatchDraft(
              {
                issueFilter: assetGovernanceBatchIssueFilterFromPanelFilter(
                  assetGovernanceFilter
                ),
                previewSize: 8,
              }
            )
          : Promise.resolve(undefined),
        catalogPermissions.canReview
          ? httpCourseProductRepository.loadCourseProductAssetGovernanceBatchTasks(
              assetGovernanceBatchTaskListQueryFromFilters(
                assetGovernanceBatchTaskFilters
              )
            )
          : Promise.resolve(undefined),
        catalogPermissions.canReview
          ? httpCourseProductRepository.loadCourseProductAssetGovernanceBatchTaskQueueObservation(
              { limit: 6 }
            )
          : Promise.resolve(undefined),
        catalogPermissions.canReview
          ? httpCourseProductRepository.loadCourseProductAssetGovernanceBatchActionPlan(
              {
                action: "all",
                previewSize: 6,
              }
            )
          : Promise.resolve(undefined),
      ]);

      setAssetGovernance(governance);
      setLearningMaterialReport(learningReport);
      setAssetGovernanceHistory(history);
      setAssetGovernanceBatchDraft(batchDraft);
      setAssetGovernanceBatchTasks(batchTasks);
      setAssetGovernanceQueueObservation(queueObservation);
      setAssetGovernanceBatchActionPlan(batchActionPlan);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "课程素材治理数据暂时不可用"
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    assetGovernanceBatchTaskFilters,
    assetGovernanceFilter,
    assetGovernanceHistoryFilters,
    catalogPermissions.canReview,
  ]);

  useEffect(() => {
    if (isAuthSyncing || !isLoggedIn || !catalogPermissions.canRead) return;
    void loadGovernanceData();
  }, [
    catalogPermissions.canRead,
    isAuthSyncing,
    isLoggedIn,
    loadGovernanceData,
  ]);

  const locateGovernanceAsset = useCallback(
    (item: CourseProductAssetGovernanceItem) => {
      setActionError(undefined);
      setActionMessage(undefined);

      if (!item.product) {
        setActionError("该素材指向的课程商品不存在，请先核对素材归属数据。");
        return;
      }

      const params = new URLSearchParams({ keyword: item.product.title });
      window.location.assign("/admin/courses?" + params.toString());
    },
    []
  );

  const updateAssetGovernanceHistoryFilters = useCallback(
    (patch: Partial<AssetGovernanceHistoryFilterState>) => {
      setAssetGovernanceHistoryFilters(current => ({
        ...current,
        ...patch,
      }));
    },
    []
  );

  const updateAssetGovernanceBatchTaskFilters = useCallback(
    (patch: Partial<AssetGovernanceBatchTaskFilterState>) => {
      setAssetGovernanceBatchTaskFilters(current => ({
        ...current,
        ...patch,
      }));
    },
    []
  );

  const openGovernanceAction = useCallback(
    (action: AssetGovernanceActionState) => {
      if (!catalogPermissions.canReview) {
        setActionError("当前账号暂无课程素材治理权限");
        return;
      }
      setActionError(undefined);
      setActionMessage(undefined);
      setGovernanceAction(action);
      setGovernanceReason("");
      setGovernanceNote("");
    },
    [catalogPermissions.canReview]
  );

  const submitGovernanceAction = useCallback(async () => {
    if (!governanceAction) return;
    if (!catalogPermissions.canReview) {
      setActionError("当前账号暂无课程素材治理权限");
      return;
    }

    const reason = governanceReason.trim();
    if (reason.length < 4) {
      setActionError("请填写至少 4 个字的治理原因");
      return;
    }

    const { item, action, issueType, primaryAssetId } = governanceAction;
    setMutatingAssetId(item.asset.id);
    setActionError(undefined);
    setActionMessage(undefined);

    try {
      const result =
        await httpCourseProductRepository.applyCourseProductAssetGovernanceAction(
          item.asset.productId,
          item.asset.id,
          {
            action,
            issueType,
            primaryAssetId,
            reason,
            note: governanceNote.trim() || undefined,
          }
        );
      setAssetGovernance(result.governance);
      setGovernanceAction(undefined);
      setGovernanceReason("");
      setGovernanceNote("");
      setActionMessage(
        `${item.asset.title} 已${assetGovernanceActionCopy[action]}`
      );
      await loadGovernanceData();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "课程素材治理动作失败"
      );
    } finally {
      setMutatingAssetId(undefined);
    }
  }, [
    catalogPermissions.canReview,
    governanceAction,
    governanceNote,
    governanceReason,
    loadGovernanceData,
  ]);

  const openAssetGovernanceBatchTaskDraft = useCallback(() => {
    if (!catalogPermissions.canReview) {
      setActionError("当前账号暂无课程素材治理权限");
      return;
    }
    if (!assetGovernanceBatchDraft) {
      setActionError("请先读取批量治理草稿预览");
      return;
    }
    if (assetGovernanceBatchDraft.summary.candidateAssetCount < 1) {
      setActionError("当前筛选没有可保存的治理候选");
      return;
    }

    setActionError(undefined);
    setActionMessage(undefined);
    setAssetGovernanceBatchTaskReason("");
    setAssetGovernanceBatchTaskNote("");
    setIsAssetGovernanceBatchTaskDraftOpen(true);
  }, [assetGovernanceBatchDraft, catalogPermissions.canReview]);

  const submitAssetGovernanceBatchTaskDraft = useCallback(async () => {
    if (!catalogPermissions.canReview) {
      setActionError("当前账号暂无课程素材治理权限");
      return;
    }

    const reason = assetGovernanceBatchTaskReason.trim();
    if (reason.length < 4) {
      setActionError("请填写至少 4 个字的草案原因");
      return;
    }

    setMutatingBatchTaskId("create");
    setActionError(undefined);
    setActionMessage(undefined);

    try {
      const result =
        await httpCourseProductRepository.createCourseProductAssetGovernanceBatchTask(
          assetGovernanceBatchTaskCreateRequestFromPanelFilter(
            assetGovernanceFilter,
            reason,
            assetGovernanceBatchTaskNote
          )
        );
      setAssetGovernanceBatchTasks(result.tasks);
      setIsAssetGovernanceBatchTaskDraftOpen(false);
      setAssetGovernanceBatchTaskReason("");
      setAssetGovernanceBatchTaskNote("");
      setActionMessage(
        `已保存批量治理草案，候选素材 ${result.task.candidateAssetCount} 个，等待审批`
      );
      await loadGovernanceData();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "课程素材批量治理任务创建失败"
      );
    } finally {
      setMutatingBatchTaskId(undefined);
    }
  }, [
    assetGovernanceBatchTaskNote,
    assetGovernanceBatchTaskReason,
    assetGovernanceFilter,
    catalogPermissions.canReview,
    loadGovernanceData,
  ]);

  const openAssetGovernanceBatchTaskReview = useCallback(
    (
      task: CourseProductAssetGovernanceBatchTask,
      action: CourseProductAssetGovernanceBatchTaskReviewAction
    ) => {
      if (!catalogPermissions.canReview) {
        setActionError("当前账号暂无课程素材治理权限");
        return;
      }
      setActionError(undefined);
      setActionMessage(undefined);
      setAssetGovernanceBatchTaskReview({ task, action });
      setAssetGovernanceBatchTaskReviewReason("");
    },
    [catalogPermissions.canReview]
  );

  const submitAssetGovernanceBatchTaskReview = useCallback(async () => {
    if (!assetGovernanceBatchTaskReview) return;
    if (!catalogPermissions.canReview) {
      setActionError("当前账号暂无课程素材治理权限");
      return;
    }

    const reason = assetGovernanceBatchTaskReviewReason.trim();
    if (reason.length < 4) {
      setActionError("请填写至少 4 个字的审批原因");
      return;
    }

    const { task, action } = assetGovernanceBatchTaskReview;
    setMutatingBatchTaskId(task.id);
    setActionError(undefined);
    setActionMessage(undefined);

    try {
      const result =
        await httpCourseProductRepository.reviewCourseProductAssetGovernanceBatchTask(
          task.id,
          assetGovernanceBatchTaskReviewRequestFromAction(action, reason)
        );
      setAssetGovernanceBatchTasks(result.tasks);
      setAssetGovernanceBatchTaskReview(undefined);
      setAssetGovernanceBatchTaskReviewReason("");
      setActionMessage(
        `批量治理草案已${action === "approve" ? "通过审批" : "驳回"}`
      );
      await loadGovernanceData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "课程素材批量治理任务审批失败";
      setActionError(message);
      if (message.includes("预检变化较大")) {
        await loadGovernanceData();
      }
    } finally {
      setMutatingBatchTaskId(undefined);
    }
  }, [
    assetGovernanceBatchTaskReview,
    assetGovernanceBatchTaskReviewReason,
    catalogPermissions.canReview,
    loadGovernanceData,
  ]);

  const openAssetGovernanceBatchTaskCancel = useCallback(
    (task: CourseProductAssetGovernanceBatchTask) => {
      if (!catalogPermissions.canReview) {
        setActionError("当前账号暂无课程素材治理权限");
        return;
      }
      setActionError(undefined);
      setActionMessage(undefined);
      setAssetGovernanceBatchTaskCancel({ task });
      setAssetGovernanceBatchTaskCancelReason("");
    },
    [catalogPermissions.canReview]
  );

  const submitAssetGovernanceBatchTaskCancel = useCallback(async () => {
    if (!assetGovernanceBatchTaskCancel) return;
    if (!catalogPermissions.canReview) {
      setActionError("当前账号暂无课程素材治理权限");
      return;
    }

    const reason = assetGovernanceBatchTaskCancelReason.trim();
    if (reason.length < 4) {
      setActionError("请填写至少 4 个字的取消原因");
      return;
    }

    const { task } = assetGovernanceBatchTaskCancel;
    setMutatingBatchTaskId(task.id);
    setActionError(undefined);
    setActionMessage(undefined);

    try {
      const result =
        await httpCourseProductRepository.cancelCourseProductAssetGovernanceBatchTask(
          task.id,
          {
            reason,
          }
        );
      setAssetGovernanceBatchTasks(result.tasks);
      setAssetGovernanceBatchTaskCancel(undefined);
      setAssetGovernanceBatchTaskCancelReason("");
      setActionMessage("批量治理草案已取消");
      await loadGovernanceData();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "课程素材批量治理任务取消失败"
      );
    } finally {
      setMutatingBatchTaskId(undefined);
    }
  }, [
    assetGovernanceBatchTaskCancel,
    assetGovernanceBatchTaskCancelReason,
    catalogPermissions.canReview,
    loadGovernanceData,
  ]);

  const openAssetGovernanceBatchTaskExecutionPlan = useCallback(
    async (task: CourseProductAssetGovernanceBatchTask) => {
      if (!catalogPermissions.canReview) {
        setActionError("当前账号暂无课程素材治理权限");
        return;
      }
      if (task.approvalStatus !== "approved") {
        setActionError("仅已通过审批的批量治理草案可生成执行预案");
        return;
      }

      setMutatingBatchTaskId(`execution:${task.id}`);
      setActionError(undefined);
      setActionMessage(undefined);

      try {
        const shouldLoadExecutionDetail =
          task.executionStatus !== "not_started" &&
          task.executionStatus !== "running";
        const detail = shouldLoadExecutionDetail
          ? await httpCourseProductRepository.loadCourseProductAssetGovernanceBatchTaskExecutionDetail(
              task.id
            )
          : undefined;
        const plan =
          detail?.executionPlan ??
          (await httpCourseProductRepository.loadCourseProductAssetGovernanceBatchTaskExecutionPlan(
            task.id
          ));
        setAssetGovernanceBatchTaskExecutionPlan(plan);
        setAssetGovernanceBatchTaskExecutionDetail(detail);
        setAssetGovernanceBatchTaskExecutionResult(undefined);
        setAssetGovernanceBatchTaskExecuteReason("");
        setAssetGovernanceBatchTaskExecuteNote("");
        setIsAssetGovernanceBatchTaskExecuteConfirmed(false);
        setActionMessage(
          detail?.summary
            ? `执行记录：审计 ${detail.summary.auditEventCount} 条，跳过 ${detail.summary.skippedActionCount} 项`
            : assetGovernanceBatchTaskExecutionPlanSummaryText(plan)
        );
      } catch (err) {
        setActionError(
          err instanceof Error
            ? err.message
            : "课程素材批量治理执行预案读取失败"
        );
      } finally {
        setMutatingBatchTaskId(undefined);
      }
    },
    [catalogPermissions.canReview]
  );

  const submitAssetGovernanceBatchTaskExecution = useCallback(async () => {
    if (!assetGovernanceBatchTaskExecutionPlan) return;
    if (!catalogPermissions.canReview) {
      setActionError("当前账号暂无课程素材治理权限");
      return;
    }

    const reason = assetGovernanceBatchTaskExecuteReason.trim();
    if (reason.length < 4) {
      setActionError("请填写至少 4 个字的执行原因");
      return;
    }
    if (!isAssetGovernanceBatchTaskExecuteConfirmed) {
      setActionError("请确认本次只写入治理审计，不修改素材和引用");
      return;
    }

    const task = assetGovernanceBatchTaskExecutionPlan.task;
    setMutatingBatchTaskId(`execute:${task.id}`);
    setActionError(undefined);
    setActionMessage(undefined);

    try {
      const result =
        await httpCourseProductRepository.executeCourseProductAssetGovernanceBatchTask(
          task.id,
          assetGovernanceBatchTaskExecuteRequestFromReason(
            reason,
            assetGovernanceBatchTaskExecuteNote
          )
        );
      setAssetGovernanceBatchTaskExecutionPlan(result.executionPlan);
      setAssetGovernanceBatchTaskExecutionResult(result);
      setAssetGovernanceBatchTaskExecutionDetail({
        task: result.task,
        executionPlan: result.executionPlan,
        summary: result.summary,
        items: result.items,
        auditEvents: result.auditEvents,
        idempotentReplay: result.idempotentReplay,
      });
      setAssetGovernanceBatchTasks(result.tasks);
      setActionMessage(
        `批量治理执行完成：写入 ${result.summary.auditEventCount} 条审计，跳过 ${result.summary.skippedActionCount} 项`
      );
      await loadGovernanceData();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "课程素材批量治理执行失败"
      );
      await loadGovernanceData();
    } finally {
      setMutatingBatchTaskId(undefined);
    }
  }, [
    assetGovernanceBatchTaskExecuteNote,
    assetGovernanceBatchTaskExecuteReason,
    assetGovernanceBatchTaskExecutionPlan,
    catalogPermissions.canReview,
    isAssetGovernanceBatchTaskExecuteConfirmed,
    loadGovernanceData,
  ]);

  const batchTaskExecutionSummary =
    assetGovernanceBatchTaskExecutionDetail?.summary ??
    assetGovernanceBatchTaskExecutionResult?.summary ??
    assetGovernanceBatchTaskExecutionPlan?.task.executionSummary;
  const batchTaskExecutionItems =
    assetGovernanceBatchTaskExecutionDetail?.items ??
    assetGovernanceBatchTaskExecutionResult?.items ??
    [];
  const batchTaskExecutionAuditEvents =
    assetGovernanceBatchTaskExecutionDetail?.auditEvents ??
    assetGovernanceBatchTaskExecutionResult?.auditEvents ??
    [];
  const batchTaskExecutionCurrentTask =
    assetGovernanceBatchTaskExecutionDetail?.task ??
    assetGovernanceBatchTaskExecutionResult?.task ??
    assetGovernanceBatchTaskExecutionPlan?.task;
  const batchTaskExecutionIsReplay =
    assetGovernanceBatchTaskExecutionDetail?.idempotentReplay ??
    assetGovernanceBatchTaskExecutionResult?.idempotentReplay ??
    false;

  if (isAuthSyncing || !isLoggedIn || !catalogPermissions.canRead) {
    return null;
  }

  return (
    <div className="text-[#243B35]">
      <section className="flex flex-col gap-4 border-b border-[#E1D7C8] pb-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B7E6D]">
            课程素材
          </p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
            素材治理工作区
          </h1>
          <p className="mt-3 max-w-[760px] text-sm leading-6 text-[#6F7771]">
            集中查看素材引用、学习资料报表、批量治理任务和高风险动作预案；本页独立读取治理数据，不进入课程商品列表加载链路。
          </p>
        </div>
        <button
          onClick={() => void loadGovernanceData()}
          disabled={isLoading}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-lg border border-[#CFC4B5] bg-[#FFFDF8] px-4 text-sm font-semibold text-[#355F51] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          刷新
        </button>
      </section>

      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-[#EDCDBF] bg-[#FFF4EF] px-4 py-3 text-sm text-[#A65F48]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {actionError && (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-[#EDCDBF] bg-[#FFF4EF] px-4 py-3 text-sm text-[#A65F48]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}
      {actionMessage && (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-[#C8D8C8] bg-[#EEF6ED] px-4 py-3 text-sm text-[#41675A]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      <CourseProductAssetGovernancePanel
        governance={assetGovernance}
        history={assetGovernanceHistory}
        batchDraft={assetGovernanceBatchDraft}
        batchTasks={assetGovernanceBatchTasks}
        queueObservation={assetGovernanceQueueObservation}
        batchActionPlan={assetGovernanceBatchActionPlan}
        learningMaterialReport={learningMaterialReport}
        filter={assetGovernanceFilter}
        historyFilters={assetGovernanceHistoryFilters}
        batchTaskFilters={assetGovernanceBatchTaskFilters}
        canEdit={catalogPermissions.canEdit}
        canReview={catalogPermissions.canReview}
        mutatingAssetId={mutatingAssetId}
        isBatchTaskMutating={Boolean(mutatingBatchTaskId)}
        mutatingBatchTaskId={mutatingBatchTaskId}
        onFilterChange={setAssetGovernanceFilter}
        onHistoryFiltersChange={updateAssetGovernanceHistoryFilters}
        onBatchTaskFiltersChange={updateAssetGovernanceBatchTaskFilters}
        onRefreshGovernanceData={() => void loadGovernanceData()}
        onLocateAsset={locateGovernanceAsset}
        onOpenGovernanceAction={openGovernanceAction}
        onOpenBatchTaskDraft={openAssetGovernanceBatchTaskDraft}
        onOpenBatchTaskReview={openAssetGovernanceBatchTaskReview}
        onOpenBatchTaskCancel={openAssetGovernanceBatchTaskCancel}
        onOpenBatchTaskExecutionPlan={openAssetGovernanceBatchTaskExecutionPlan}
      />

      {governanceAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18231F]/45 px-4">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-[540px] rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#8A8176]">
                  素材治理动作
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                  {assetGovernanceActionCopy[governanceAction.action]}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6F7771]">
                  {governanceAction.item.asset.title} ·{" "}
                  {assetGovernanceIssueCopy[governanceAction.issueType]}
                </p>
              </div>
              <button
                onClick={() => setGovernanceAction(undefined)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7D746B] transition hover:bg-[#F1E8DC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {governanceAction.primaryAssetId && (
              <div className="mt-4 rounded-lg border border-[#D8CEC0] bg-[#FBF7EF] px-3 py-2 text-xs leading-5 text-[#6F7771]">
                主素材 ID：{governanceAction.primaryAssetId}
              </div>
            )}

            <label className="mt-5 block text-sm font-semibold text-[#41524B]">
              治理原因
              <textarea
                value={governanceReason}
                onChange={event => setGovernanceReason(event.target.value)}
                placeholder="例如：重复素材已确认保留该主素材，后续合并引用"
                className="mt-2 min-h-[88px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold text-[#41524B]">
              处理备注
              <textarea
                value={governanceNote}
                onChange={event => setGovernanceNote(event.target.value)}
                placeholder="可补充后续动作、引用合并计划或软删除确认依据"
                className="mt-2 min-h-[72px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
              />
            </label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setGovernanceAction(undefined)}
                className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-4 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
              >
                取消
              </button>
              <button
                onClick={() => void submitGovernanceAction()}
                disabled={
                  governanceReason.trim().length < 4 || Boolean(mutatingAssetId)
                }
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  governanceAction.action === "mark_soft_deleted"
                    ? "bg-[#AD503A] text-white hover:bg-[#9D4935]"
                    : "bg-[#243B35] text-white hover:bg-[#315047]"
                }`}
              >
                {mutatingAssetId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : governanceAction.action === "mark_soft_deleted" ? (
                  <Trash2 className="h-4 w-4" />
                ) : (
                  <ClipboardCheck className="h-4 w-4" />
                )}
                确认{assetGovernanceActionCopy[governanceAction.action]}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {isAssetGovernanceBatchTaskDraftOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18231F]/45 px-4">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-[560px] rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#8A8176]">
                  批量治理草案
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                  保存为待审批任务
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6F7771]">
                  本次仅记录处理草案，不修改素材状态、引用关系或对象文件。
                </p>
              </div>
              <button
                onClick={() => setIsAssetGovernanceBatchTaskDraftOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7D746B] transition hover:bg-[#F1E8DC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-[#E1D7C8] bg-[#FBF7EF] px-3 py-3 text-xs">
              <div>
                <p className="text-[#8A8176]">候选素材</p>
                <p className="mt-1 text-base font-semibold text-[#243B35]">
                  {assetGovernanceBatchDraft?.summary.candidateAssetCount ?? 0}
                </p>
              </div>
              <div>
                <p className="text-[#8A8176]">可记录动作</p>
                <p className="mt-1 text-base font-semibold text-[#243B35]">
                  {assetGovernanceBatchDraft?.summary.eligibleActionCount ?? 0}
                </p>
              </div>
              <div>
                <p className="text-[#8A8176]">需复核</p>
                <p className="mt-1 text-base font-semibold text-[#243B35]">
                  {assetGovernanceBatchDraft?.summary.manualReviewAssetCount ??
                    0}
                </p>
              </div>
            </div>

            <label className="mt-5 block text-sm font-semibold text-[#41524B]">
              草案原因
              <textarea
                value={assetGovernanceBatchTaskReason}
                onChange={event =>
                  setAssetGovernanceBatchTaskReason(event.target.value)
                }
                placeholder="例如：本周先统一记录未引用素材处理意见，待负责人审批后再执行"
                className="mt-2 min-h-[88px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold text-[#41524B]">
              草案备注
              <textarea
                value={assetGovernanceBatchTaskNote}
                onChange={event =>
                  setAssetGovernanceBatchTaskNote(event.target.value)
                }
                placeholder="可补充筛选口径、审批负责人或后续执行边界"
                className="mt-2 min-h-[72px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
              />
            </label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setIsAssetGovernanceBatchTaskDraftOpen(false)}
                className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-4 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
              >
                取消
              </button>
              <button
                onClick={() => void submitAssetGovernanceBatchTaskDraft()}
                disabled={
                  assetGovernanceBatchTaskReason.trim().length < 4 ||
                  Boolean(mutatingBatchTaskId)
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutatingBatchTaskId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardCheck className="h-4 w-4" />
                )}
                保存草案
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {assetGovernanceBatchTaskReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18231F]/45 px-4">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-[560px] rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#8A8176]">
                  批量草案审批
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                  {
                    assetGovernanceBatchTaskReviewActionCopy[
                      assetGovernanceBatchTaskReview.action
                    ]
                  }
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6F7771]">
                  审批会先重新校验候选范围；本步骤仍不修改素材状态、引用关系或对象文件。
                </p>
              </div>
              <button
                onClick={() => setAssetGovernanceBatchTaskReview(undefined)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7D746B] transition hover:bg-[#F1E8DC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-[#E1D7C8] bg-[#FBF7EF] px-3 py-3 text-xs">
              <div>
                <p className="text-[#8A8176]">候选素材</p>
                <p className="mt-1 text-base font-semibold text-[#243B35]">
                  {assetGovernanceBatchTaskReview.task.candidateAssetCount}
                </p>
              </div>
              <div>
                <p className="text-[#8A8176]">可记录动作</p>
                <p className="mt-1 text-base font-semibold text-[#243B35]">
                  {assetGovernanceBatchTaskReview.task.eligibleActionCount}
                </p>
              </div>
              <div>
                <p className="text-[#8A8176]">需复核</p>
                <p className="mt-1 text-base font-semibold text-[#243B35]">
                  {assetGovernanceBatchTaskReview.task.manualReviewAssetCount}
                </p>
              </div>
            </div>

            <label className="mt-5 block text-sm font-semibold text-[#41524B]">
              审批原因
              <textarea
                value={assetGovernanceBatchTaskReviewReason}
                onChange={event =>
                  setAssetGovernanceBatchTaskReviewReason(event.target.value)
                }
                placeholder={
                  assetGovernanceBatchTaskReview.action === "approve"
                    ? "例如：候选范围和处理口径已复核，允许进入后续执行预案"
                    : "例如：候选范围需要重新确认，先驳回当前草案"
                }
                className="mt-2 min-h-[88px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
              />
            </label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setAssetGovernanceBatchTaskReview(undefined)}
                className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-4 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
              >
                取消
              </button>
              <button
                onClick={() => void submitAssetGovernanceBatchTaskReview()}
                disabled={
                  assetGovernanceBatchTaskReviewReason.trim().length < 4 ||
                  Boolean(mutatingBatchTaskId)
                }
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  assetGovernanceBatchTaskReview.action === "approve"
                    ? "bg-[#243B35] text-white hover:bg-[#315047]"
                    : "bg-[#AD503A] text-white hover:bg-[#9D4935]"
                }`}
              >
                {mutatingBatchTaskId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : assetGovernanceBatchTaskReview.action === "approve" ? (
                  <ClipboardCheck className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                确认
                {
                  assetGovernanceBatchTaskReviewActionCopy[
                    assetGovernanceBatchTaskReview.action
                  ]
                }
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {assetGovernanceBatchTaskCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18231F]/45 px-4">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-[520px] rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#8A8176]">
                  取消批量草案
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                  {assetGovernanceBatchTaskCancel.task.candidateAssetCount}{" "}
                  个候选素材
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6F7771]">
                  取消后草案保留历史记录，但不会进入后续审批或执行。
                </p>
              </div>
              <button
                onClick={() => setAssetGovernanceBatchTaskCancel(undefined)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7D746B] transition hover:bg-[#F1E8DC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-5 block text-sm font-semibold text-[#41524B]">
              取消原因
              <textarea
                value={assetGovernanceBatchTaskCancelReason}
                onChange={event =>
                  setAssetGovernanceBatchTaskCancelReason(event.target.value)
                }
                placeholder="例如：筛选口径需要重新确认，先取消当前草案"
                className="mt-2 min-h-[88px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
              />
            </label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setAssetGovernanceBatchTaskCancel(undefined)}
                className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-4 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
              >
                返回
              </button>
              <button
                onClick={() => void submitAssetGovernanceBatchTaskCancel()}
                disabled={
                  assetGovernanceBatchTaskCancelReason.trim().length < 4 ||
                  Boolean(mutatingBatchTaskId)
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#AD503A] px-4 text-sm font-semibold text-white transition hover:bg-[#9D4935] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutatingBatchTaskId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                确认取消
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {assetGovernanceBatchTaskExecutionPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18231F]/45 px-4">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="max-h-[86vh] w-full max-w-[780px] overflow-hidden rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] shadow-xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E8DED0] px-5 py-4">
              <div>
                <p className="text-xs font-semibold text-[#8A8176]">
                  {batchTaskExecutionSummary ? "执行记录" : "执行预案"}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                  已审批批量治理任务
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6F7771]">
                  {assetGovernanceBatchTaskExecutionPlanSummaryText(
                    assetGovernanceBatchTaskExecutionPlan
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  setAssetGovernanceBatchTaskExecutionPlan(undefined);
                  setAssetGovernanceBatchTaskExecutionResult(undefined);
                  setAssetGovernanceBatchTaskExecutionDetail(undefined);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7D746B] transition hover:bg-[#F1E8DC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(86vh-146px)] overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  [
                    "计划动作",
                    assetGovernanceBatchTaskExecutionPlan.summary
                      .plannedActionCount,
                  ],
                  [
                    "跳过项",
                    assetGovernanceBatchTaskExecutionPlan.summary
                      .skippedActionCount,
                  ],
                  [
                    "高风险",
                    assetGovernanceBatchTaskExecutionPlan.summary
                      .highRiskItemCount,
                  ],
                  [
                    "新候选",
                    assetGovernanceBatchTaskExecutionPlan.summary
                      .newCandidateAssetCount,
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-[#E1D7C8] bg-[#FBF7EF] px-3 py-2"
                  >
                    <p className="text-xs text-[#8A8176]">{label}</p>
                    <p className="mt-1 text-lg font-semibold text-[#243B35]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {assetGovernanceBatchTaskExecutionPlan.safetyNotes.map(note => (
                  <span
                    key={note}
                    className="inline-flex min-h-7 items-center rounded-full bg-[#FFF7E5] px-3 text-xs font-semibold text-[#8F6B1C]"
                  >
                    {note}
                  </span>
                ))}
              </div>

              {(() => {
                const summary = batchTaskExecutionSummary;
                if (!summary) return null;
                return (
                  <div className="mt-4 rounded-lg border border-[#C8D8C8] bg-[#EEF6ED] px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#243B35]">
                        执行结果
                      </p>
                      <span className="inline-flex h-6 items-center rounded-full bg-white px-2 text-xs font-semibold text-[#41675A]">
                        {
                          assetGovernanceBatchTaskExecutionStatusCopy[
                            summary.executionStatus
                          ]
                        }
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#41675A]">
                      写入 {summary.auditEventCount} 条审计，执行{" "}
                      {summary.executedActionCount} 项，跳过{" "}
                      {summary.skippedActionCount} 项，失败{" "}
                      {summary.failedActionCount} 项
                      {batchTaskExecutionIsReplay ? "，本次为历史回放" : ""}。
                    </p>
                    {batchTaskExecutionAuditEvents[0] ? (
                      <p className="mt-1 text-xs leading-5 text-[#41675A]">
                        最近审计：{batchTaskExecutionAuditEvents[0].id}
                      </p>
                    ) : null}
                  </div>
                );
              })()}

              {batchTaskExecutionItems.length ? (
                <div className="mt-4 overflow-hidden rounded-lg border border-[#C8D8C8] bg-white">
                  <div className="border-b border-[#E8DED0] bg-[#EEF6ED] px-3 py-2">
                    <p className="text-xs font-semibold text-[#41675A]">
                      执行明细
                    </p>
                  </div>
                  {batchTaskExecutionItems.slice(0, 8).map(item => (
                    <div
                      key={`${item.assetId}:${item.status}:${item.auditEventId ?? item.skipReason ?? item.errorMessage ?? "result"}`}
                      className="border-b border-[#E8DED0] px-3 py-3 last:border-b-0"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="min-w-0 text-sm font-semibold text-[#243B35]">
                          {item.assetTitle ?? item.assetId}
                        </p>
                        <span
                          className={`inline-flex h-6 items-center rounded-full px-2 text-xs font-semibold ${
                            item.status === "executed"
                              ? "bg-[#EEF6ED] text-[#41675A]"
                              : item.status === "failed"
                                ? "bg-[#FDEBE5] text-[#A65F48]"
                                : "bg-[#FFF7E5] text-[#8F6B1C]"
                          }`}
                        >
                          {item.status === "executed"
                            ? "已执行"
                            : item.status === "failed"
                              ? "失败"
                              : "已跳过"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[#6F7771]">
                        {item.productTitle ?? item.productId ?? "未知商品"} ·{" "}
                        {assetGovernanceActionCopy[item.plannedAction]}
                        {item.issueType
                          ? ` · ${assetGovernanceIssueCopy[item.issueType]}`
                          : ""}
                      </p>
                      {item.auditEventId ? (
                        <p className="mt-1 text-xs text-[#8A8176]">
                          审计事件 {item.auditEventId}
                        </p>
                      ) : null}
                      {item.skipReason || item.errorMessage ? (
                        <p className="mt-2 rounded-md bg-[#FFF7E5] px-2 py-1 text-xs leading-5 text-[#8F6B1C]">
                          {item.errorMessage ?? item.skipReason}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 overflow-hidden rounded-lg border border-[#E1D7C8] bg-white">
                {assetGovernanceBatchTaskExecutionPlan.items
                  .slice(0, 8)
                  .map(item => (
                    <div
                      key={item.assetId}
                      className="border-b border-[#E8DED0] px-3 py-3 last:border-b-0"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="min-w-0 text-sm font-semibold text-[#243B35]">
                          {item.assetTitle ?? item.assetId}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`inline-flex h-6 items-center rounded-full px-2 text-xs font-semibold ${
                              item.status === "planned"
                                ? "bg-[#EEF6ED] text-[#41675A]"
                                : "bg-[#FFF7E5] text-[#8F6B1C]"
                            }`}
                          >
                            {
                              assetGovernanceBatchTaskExecutionPlanItemStatusCopy[
                                item.status
                              ]
                            }
                          </span>
                          <span
                            className={`inline-flex h-6 items-center rounded-full px-2 text-xs font-semibold ${
                              item.riskLevel === "high"
                                ? "bg-[#FDEBE5] text-[#A65F48]"
                                : item.riskLevel === "medium"
                                  ? "bg-[#FFF7E5] text-[#8F6B1C]"
                                  : "bg-[#EEF6ED] text-[#41675A]"
                            }`}
                          >
                            {
                              assetGovernanceBatchTaskExecutionPlanRiskCopy[
                                item.riskLevel
                              ]
                            }
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[#6F7771]">
                        {item.productTitle ?? item.productId ?? "未知商品"} ·{" "}
                        {assetGovernanceActionCopy[item.plannedAction]}
                        {item.plannedIssueType
                          ? ` · ${assetGovernanceIssueCopy[item.plannedIssueType]}`
                          : ""}
                      </p>
                      {item.skipReason ? (
                        <p className="mt-2 rounded-md bg-[#FFF7E5] px-2 py-1 text-xs leading-5 text-[#8F6B1C]">
                          {item.skipReason}
                        </p>
                      ) : null}
                    </div>
                  ))}
              </div>
            </div>

            <div className="border-t border-[#E8DED0] px-5 py-3">
              {(batchTaskExecutionCurrentTask?.executionStatus ===
                "not_started" ||
                batchTaskExecutionCurrentTask?.executionStatus ===
                  "failed") && (
                <div className="mb-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <label className="block text-xs font-semibold text-[#41524B]">
                    执行原因
                    <textarea
                      value={assetGovernanceBatchTaskExecuteReason}
                      onChange={event =>
                        setAssetGovernanceBatchTaskExecuteReason(
                          event.target.value
                        )
                      }
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal text-[#243B35] outline-none transition focus:border-[#8FA99C]"
                      placeholder="说明本次批量写入审计的业务原因"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-[#41524B]">
                    备注
                    <textarea
                      value={assetGovernanceBatchTaskExecuteNote}
                      onChange={event =>
                        setAssetGovernanceBatchTaskExecuteNote(
                          event.target.value
                        )
                      }
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal text-[#243B35] outline-none transition focus:border-[#8FA99C]"
                      placeholder="可选，写入到审计 after.note"
                    />
                  </label>
                  <label className="flex items-start gap-2 text-xs leading-5 text-[#6F7771] md:col-span-2">
                    <input
                      type="checkbox"
                      checked={isAssetGovernanceBatchTaskExecuteConfirmed}
                      onChange={event =>
                        setIsAssetGovernanceBatchTaskExecuteConfirmed(
                          event.target.checked
                        )
                      }
                      className="mt-1 h-4 w-4 rounded border-[#CFC4B5] accent-[#355F51]"
                    />
                    <span>
                      我确认本次只写入 asset_governance 审计，不修改素材 Store、
                      课程引用或物理文件。
                    </span>
                  </label>
                </div>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                {(batchTaskExecutionCurrentTask?.executionStatus ===
                  "not_started" ||
                  batchTaskExecutionCurrentTask?.executionStatus ===
                    "failed") && (
                  <button
                    onClick={() =>
                      void submitAssetGovernanceBatchTaskExecution()
                    }
                    disabled={
                      assetGovernanceBatchTaskExecuteReason.trim().length < 4 ||
                      !isAssetGovernanceBatchTaskExecuteConfirmed ||
                      Boolean(mutatingBatchTaskId)
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#E6EDDF] px-4 text-sm font-semibold text-[#355F51] transition hover:bg-[#D7E5D4] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {mutatingBatchTaskId ===
                    `execute:${batchTaskExecutionCurrentTask.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ClipboardCheck className="h-4 w-4" />
                    )}
                    {batchTaskExecutionCurrentTask.executionStatus === "failed"
                      ? "重新执行记录处理"
                      : "确认执行记录处理"}
                  </button>
                )}
                <button
                  onClick={() => {
                    setAssetGovernanceBatchTaskExecutionPlan(undefined);
                    setAssetGovernanceBatchTaskExecutionResult(undefined);
                    setAssetGovernanceBatchTaskExecutionDetail(undefined);
                  }}
                  className="h-10 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047]"
                >
                  关闭
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
