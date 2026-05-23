import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  ALL_COURSE_PRODUCT_CATEGORY,
  ALL_COURSE_PRODUCT_STATUS,
  COURSE_CATEGORIES,
  COURSE_PRODUCT_PAGE_SIZE,
  type CourseProductContentQualityResult,
  type CourseProductListItem,
  type CourseProductListQuery,
  type CourseProductListResult,
  type CourseProductPriceUpdateRequest,
  type CourseProductPublishQueueAction,
  type CourseProductPublishQueueBatchTaskListResult,
  type CourseProductPublishQueueBatchTaskPreflightResult,
  type CourseProductPublishQueueBatchTaskReviewAction,
  type CourseProductPublishQueueResult,
  type CourseProductReviewAction,
  type CourseProductReviewStatus,
  type CourseProductStatus,
} from "@shared/domain";
import { useAuth } from "@/contexts/AuthContext";
import { httpCourseProductRepository } from "@/features/catalog";
import { getCourseProductAdminPermissions } from "@/features/catalog/model/courseProductAdminPermissions";
import { CourseProductAuditTrail } from "./courses/CourseProductAuditTrail";
import {
  CourseProductFilters,
  sortOptions,
  statusFilters,
  type CourseProductCategoryFilter,
  type CourseProductStatusFilter,
} from "./courses/CourseProductFilters";
import { CourseProductListRow } from "./courses/CourseProductListRow";
import { CourseProductMetrics } from "./courses/CourseProductMetrics";
import { CourseProductPublishQueuePanel } from "./courses/CourseProductPublishQueuePanel";
import {
  CourseProductPriceDialog,
  type CourseProductPriceFormState,
} from "./courses/CourseProductPriceDialog";
import { CourseProductReviewDialog } from "./courses/CourseProductReviewDialog";
import { CourseProductStatusDialog } from "./courses/CourseProductStatusDialog";
import { courseProductReviewActionCopy as reviewActionCopy } from "./courses/courseProductAdminLabels";
import type { CourseProductWorkspaceStep } from "./courses/courseProductListPresentation";
export {
  assetGovernanceBatchIssueFilterFromPanelFilter,
  assetGovernanceBatchTaskCreateRequestFromPanelFilter,
  assetGovernanceBatchTaskExecuteRequestFromReason,
  assetGovernanceBatchTaskExecutionPlanSummaryText,
  assetGovernanceBatchTaskListQueryFromFilters,
  assetGovernanceBatchTaskReviewRequestFromAction,
  assetGovernanceHistoryQueryFromFilters,
  courseProductAssetGovernanceSuggestion,
  filterCourseProductAssetGovernanceItems,
} from "./course-assets/courseAssetGovernanceModel";

type StatusActionState = {
  product: CourseProductListItem;
  targetStatus: CourseProductStatus;
};
type ReviewActionState = {
  product: CourseProductListItem;
  action: CourseProductReviewAction;
  targetReviewStatus: CourseProductReviewStatus;
};

function courseProductListQueryFromUrl(): CourseProductListQuery {
  if (typeof window === "undefined") {
    return {
      keyword: "",
      category: ALL_COURSE_PRODUCT_CATEGORY,
      status: ALL_COURSE_PRODUCT_STATUS,
      sort: "updated_desc",
      page: 1,
      pageSize: COURSE_PRODUCT_PAGE_SIZE,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const rawCategory = params.get("category") ?? "";
  const rawStatus = params.get("status") ?? "";
  const rawSort = params.get("sort") ?? "";
  const page = Number(params.get("page"));
  const pageSize = Number(params.get("pageSize"));

  const categories = [ALL_COURSE_PRODUCT_CATEGORY, ...COURSE_CATEGORIES];
  const statuses = [
    ALL_COURSE_PRODUCT_STATUS,
    ...statusFilters.map(item => item.value),
  ];
  const sorts = sortOptions.map(item => item.value);

  return {
    keyword: params.get("keyword") ?? "",
    category: categories.includes(rawCategory as CourseProductCategoryFilter)
      ? (rawCategory as CourseProductCategoryFilter)
      : ALL_COURSE_PRODUCT_CATEGORY,
    status: statuses.includes(rawStatus as CourseProductStatusFilter)
      ? (rawStatus as CourseProductStatusFilter)
      : ALL_COURSE_PRODUCT_STATUS,
    sort: sorts.includes(rawSort as CourseProductListQuery["sort"])
      ? (rawSort as CourseProductListQuery["sort"])
      : "updated_desc",
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize:
      Number.isInteger(pageSize) && pageSize > 0 && pageSize <= 50
        ? pageSize
        : COURSE_PRODUCT_PAGE_SIZE,
  };
}

export default function CourseProducts() {
  const [, navigate] = useLocation();
  const { user, isLoggedIn, isAuthSyncing } = useAuth();
  const [data, setData] = useState<CourseProductListResult>();
  const [publishQueue, setPublishQueue] =
    useState<CourseProductPublishQueueResult>();
  const [publishQueueBatchTasks, setPublishQueueBatchTasks] =
    useState<CourseProductPublishQueueBatchTaskListResult>();
  const [contentQualityByProductId, setContentQualityByProductId] = useState<
    Record<string, CourseProductContentQualityResult>
  >({});
  const [query, setQuery] = useState<CourseProductListQuery>(
    courseProductListQueryFromUrl
  );
  const [keywordDraft, setKeywordDraft] = useState(() => query.keyword);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [actionMessage, setActionMessage] = useState<string>();
  const [mutatingProductId, setMutatingProductId] = useState<string>();
  const [isCreatingPublishQueueTask, setIsCreatingPublishQueueTask] =
    useState(false);
  const [mutatingPublishQueueTaskId, setMutatingPublishQueueTaskId] =
    useState<string>();
  const [publishQueueTaskPreflight, setPublishQueueTaskPreflight] =
    useState<CourseProductPublishQueueBatchTaskPreflightResult>();
  const [statusAction, setStatusAction] = useState<StatusActionState>();
  const [statusReason, setStatusReason] = useState("");
  const [reviewAction, setReviewAction] = useState<ReviewActionState>();
  const [reviewReason, setReviewReason] = useState("");
  const [priceEditor, setPriceEditor] = useState<CourseProductListItem>();
  const [priceForm, setPriceForm] = useState<CourseProductPriceFormState>({
    amount: "",
    originalAmount: "",
    isFree: false,
    memberIncluded: false,
    reason: "",
  });

  const catalogPermissions = useMemo(
    () => getCourseProductAdminPermissions(user),
    [user]
  );

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const [products, contentQuality, queue, queueTasks] = await Promise.all([
        httpCourseProductRepository.loadCourseProducts(query),
        httpCourseProductRepository.loadCourseProductContentQuality(),
        httpCourseProductRepository.loadCourseProductPublishQueue(query),
        httpCourseProductRepository.loadCourseProductPublishQueueBatchTasks({
          pageSize: 5,
        }),
      ]);
      setData(products);
      setPublishQueue(queue);
      setPublishQueueBatchTasks(queueTasks);
      setContentQualityByProductId(
        Object.fromEntries(
          contentQuality.items.map(item => [item.productId, item.quality])
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "课程商品列表暂时不可用");
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (isAuthSyncing || !isLoggedIn || !catalogPermissions.canRead) return;
    void loadProducts();
  }, [catalogPermissions.canRead, isAuthSyncing, isLoggedIn, loadProducts]);

  const openProductWorkspace = useCallback(
    (item: CourseProductListItem, step?: CourseProductWorkspaceStep) => {
      if (!catalogPermissions.canEdit) return;
      const queryString = step ? `?step=${step}` : "";
      navigate(`/admin/courses/${item.courseId}/edit${queryString}`);
    },
    [catalogPermissions.canEdit, navigate]
  );

  const openProductWorkspaceByCourseId = useCallback(
    (courseId: number, step?: CourseProductWorkspaceStep) => {
      if (!catalogPermissions.canEdit) return;
      const queryString = step ? `?step=${step}` : "";
      navigate(`/admin/courses/${courseId}/edit${queryString}`);
    },
    [catalogPermissions.canEdit, navigate]
  );

  const createPublishQueueTask = useCallback(
    async (action: CourseProductPublishQueueAction, reason: string) => {
      if (!catalogPermissions.canReview) {
        setActionError("当前账号暂无课程发布队列草案权限");
        return;
      }

      const normalizedReason = reason.trim();
      if (normalizedReason.length < 4) {
        setActionError("请填写至少 4 个字的草案原因");
        return;
      }

      setIsCreatingPublishQueueTask(true);
      setActionError(undefined);
      setActionMessage(undefined);
      try {
        const result =
          await httpCourseProductRepository.createCourseProductPublishQueueBatchTask(
            {
              action,
              query,
              reason: normalizedReason,
            }
          );
        setPublishQueueBatchTasks(result.tasks);
        setPublishQueueTaskPreflight(undefined);
        setActionMessage(
          `已生成发布队列草案，候选 ${result.task.candidateCount} 个`
        );
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "课程发布队列草案创建失败"
        );
      } finally {
        setIsCreatingPublishQueueTask(false);
      }
    },
    [catalogPermissions.canReview, query]
  );

  const loadPublishQueueTaskPreflight = useCallback(
    async (taskId: string) => {
      if (!catalogPermissions.canReview) {
        setActionError("当前账号暂无课程发布队列预检权限");
        return;
      }

      setMutatingPublishQueueTaskId(taskId);
      setActionError(undefined);
      setActionMessage(undefined);
      try {
        const result =
          await httpCourseProductRepository.loadCourseProductPublishQueueBatchTaskPreflight(
            taskId
          );
        setPublishQueueTaskPreflight(result);
        setPublishQueueBatchTasks(previous =>
          previous
            ? {
                ...previous,
                items: previous.items.map(item =>
                  item.id === result.task.id ? result.task : item
                ),
              }
            : previous
        );
        setActionMessage(
          result.preflight.requiresRecreate
            ? "预检发现发布队列漂移，请重新生成草案"
            : "发布队列草案预检通过"
        );
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "课程发布队列草案预检失败"
        );
      } finally {
        setMutatingPublishQueueTaskId(undefined);
      }
    },
    [catalogPermissions.canReview]
  );

  const submitPublishQueueTask = useCallback(
    async (taskId: string, reason: string) => {
      if (!catalogPermissions.canReview) {
        setActionError("当前账号暂无课程发布队列草案提交权限");
        return;
      }
      const normalizedReason = reason.trim();
      if (normalizedReason.length < 4) {
        setActionError("请填写至少 4 个字的审批原因");
        return;
      }

      setMutatingPublishQueueTaskId(taskId);
      setActionError(undefined);
      setActionMessage(undefined);
      try {
        const result =
          await httpCourseProductRepository.submitCourseProductPublishQueueBatchTask(
            taskId,
            { reason: normalizedReason }
          );
        setPublishQueueBatchTasks(result.tasks);
        setPublishQueueTaskPreflight(undefined);
        setActionMessage("发布队列草案已提交审批");
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "课程发布队列草案提交失败"
        );
      } finally {
        setMutatingPublishQueueTaskId(undefined);
      }
    },
    [catalogPermissions.canReview]
  );

  const cancelPublishQueueTask = useCallback(
    async (taskId: string, reason: string) => {
      if (!catalogPermissions.canReview) {
        setActionError("当前账号暂无课程发布队列草案取消权限");
        return;
      }
      const normalizedReason = reason.trim();
      if (normalizedReason.length < 4) {
        setActionError("请填写至少 4 个字的取消原因");
        return;
      }

      setMutatingPublishQueueTaskId(taskId);
      setActionError(undefined);
      setActionMessage(undefined);
      try {
        const result =
          await httpCourseProductRepository.cancelCourseProductPublishQueueBatchTask(
            taskId,
            { reason: normalizedReason }
          );
        setPublishQueueBatchTasks(result.tasks);
        setPublishQueueTaskPreflight(previous =>
          previous?.task.id === result.task.id ? undefined : previous
        );
        setActionMessage("发布队列草案已取消");
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "课程发布队列草案取消失败"
        );
      } finally {
        setMutatingPublishQueueTaskId(undefined);
      }
    },
    [catalogPermissions.canReview]
  );

  const reviewPublishQueueTask = useCallback(
    async (
      taskId: string,
      action: CourseProductPublishQueueBatchTaskReviewAction,
      reason: string
    ) => {
      if (!catalogPermissions.canReview) {
        setActionError("当前账号暂无课程发布队列草案审批权限");
        return;
      }
      const normalizedReason = reason.trim();
      if (normalizedReason.length < 4) {
        setActionError("请填写至少 4 个字的审批原因");
        return;
      }

      setMutatingPublishQueueTaskId(taskId);
      setActionError(undefined);
      setActionMessage(undefined);
      try {
        const result =
          await httpCourseProductRepository.reviewCourseProductPublishQueueBatchTask(
            taskId,
            {
              action,
              reason: normalizedReason,
              requireFreshPreflight: true,
            }
          );
        setPublishQueueBatchTasks(result.tasks);
        setPublishQueueTaskPreflight(
          result.task.approvalPreflight
            ? {
                task: result.task,
                preflight: result.task.approvalPreflight,
              }
            : undefined
        );
        setActionMessage(
          action === "approve" ? "发布队列草案已审批通过" : "发布队列草案已驳回"
        );
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "课程发布队列草案审批失败"
        );
      } finally {
        setMutatingPublishQueueTaskId(undefined);
      }
    },
    [catalogPermissions.canReview]
  );

  const openPriceEditor = useCallback(
    (item: CourseProductListItem) => {
      if (!catalogPermissions.canPrice) return;
      setActionError(undefined);
      setActionMessage(undefined);
      setPriceEditor(item);
      setPriceForm({
        amount: String(item.price.amount),
        originalAmount: String(item.price.originalAmount),
        isFree: item.price.isFree,
        memberIncluded: item.price.memberIncluded,
        reason: "",
      });
    },
    [catalogPermissions.canPrice]
  );

  const openStatusAction = useCallback(
    (product: CourseProductListItem, targetStatus: CourseProductStatus) => {
      if (!catalogPermissions.canPublish) return;
      setActionError(undefined);
      setActionMessage(undefined);
      setStatusAction({ product, targetStatus });
      setStatusReason("");
    },
    [catalogPermissions.canPublish]
  );

  const openReviewAction = useCallback(
    (
      product: CourseProductListItem,
      action: CourseProductReviewAction,
      targetReviewStatus: CourseProductReviewStatus
    ) => {
      if (!catalogPermissions.canReview) return;
      setActionError(undefined);
      setActionMessage(undefined);
      setReviewAction({ product, action, targetReviewStatus });
      setReviewReason("");
    },
    [catalogPermissions.canReview]
  );

  const submitStatusAction = useCallback(async () => {
    if (!statusAction) return;
    if (!catalogPermissions.canPublish) {
      setActionError("当前账号暂无课程商品发布权限");
      return;
    }
    setMutatingProductId(statusAction.product.id);
    setActionError(undefined);
    setActionMessage(undefined);

    try {
      await httpCourseProductRepository.updateCourseProductStatus(
        statusAction.product.id,
        {
          status: statusAction.targetStatus,
          reason: statusReason,
        }
      );
      setActionMessage(
        `${statusAction.product.title} 已${statusAction.targetStatus === "published" ? "上架" : "下架"}`
      );
      setStatusAction(undefined);
      setStatusReason("");
      await loadProducts();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "课程商品状态更新失败"
      );
    } finally {
      setMutatingProductId(undefined);
    }
  }, [catalogPermissions.canPublish, loadProducts, statusAction, statusReason]);

  const submitReviewAction = useCallback(async () => {
    if (!reviewAction) return;
    if (!catalogPermissions.canReview) {
      setActionError("当前账号暂无课程商品审核权限");
      return;
    }
    setMutatingProductId(reviewAction.product.id);
    setActionError(undefined);
    setActionMessage(undefined);

    try {
      await httpCourseProductRepository.updateCourseProductReview(
        reviewAction.product.id,
        {
          action: reviewAction.action,
          reason: reviewReason,
        }
      );
      setActionMessage(
        `${reviewAction.product.title} 已${reviewActionCopy[reviewAction.action]}`
      );
      setReviewAction(undefined);
      setReviewReason("");
      await loadProducts();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "课程商品审核状态更新失败"
      );
    } finally {
      setMutatingProductId(undefined);
    }
  }, [catalogPermissions.canReview, loadProducts, reviewAction, reviewReason]);

  const submitPriceUpdate = useCallback(async () => {
    if (!priceEditor) return;
    if (!catalogPermissions.canPrice) {
      setActionError("当前账号暂无课程商品价格权限");
      return;
    }

    const amount = priceForm.isFree ? 0 : Number(priceForm.amount);
    const originalAmount = Number(priceForm.originalAmount || amount);

    if (!Number.isFinite(amount) || !Number.isFinite(originalAmount)) {
      setActionError("请填写有效的课程价格");
      return;
    }

    const request: CourseProductPriceUpdateRequest = {
      amount,
      originalAmount,
      isFree: priceForm.isFree,
      memberIncluded: priceForm.memberIncluded,
      reason: priceForm.reason,
    };

    setMutatingProductId(priceEditor.id);
    setActionError(undefined);
    setActionMessage(undefined);

    try {
      await httpCourseProductRepository.updateCourseProductPrice(
        priceEditor.id,
        request
      );
      setActionMessage(`${priceEditor.title} 价格已更新`);
      setPriceEditor(undefined);
      await loadProducts();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "课程商品价格更新失败"
      );
    } finally {
      setMutatingProductId(undefined);
    }
  }, [catalogPermissions.canPrice, loadProducts, priceEditor, priceForm]);

  const categories = useMemo(
    () => [ALL_COURSE_PRODUCT_CATEGORY, ...COURSE_CATEGORIES],
    []
  );
  const items = data?.items ?? [];
  const meta = data?.meta;
  const auditEvents = data?.auditEvents ?? [];
  const rejectedReviewReasons = useMemo(() => {
    const reasons = new Map<string, string>();
    auditEvents.forEach(event => {
      if (
        event.action === "review_update" &&
        event.after.reviewStatus === "rejected" &&
        !reasons.has(event.productId)
      ) {
        reasons.set(event.productId, event.reason);
      }
    });
    return reasons;
  }, [auditEvents]);

  const hasPreviousPage = Boolean(meta && meta.page > 1);
  const hasNextPage = Boolean(meta && meta.page < meta.totalPages);
  const pageEyebrow = "课程商品";
  const pageTitle = "商品列表与状态";
  const pageDescription =
    "按状态、审核和内容质量筛选商品队列；单商品编辑、审核和上架优先进入工作台处理。";

  if (isAuthSyncing || !isLoggedIn || !catalogPermissions.canRead) {
    return null;
  }

  return (
    <div className="text-[#243B35]">
      <section className="flex flex-col gap-4 border-b border-[#E1D7C8] pb-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B7E6D]">
            {pageEyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
            {pageTitle}
          </h1>
          <p className="mt-3 max-w-[760px] text-sm leading-6 text-[#6F7771]">
            {pageDescription}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {catalogPermissions.canEdit && (
            <button
              onClick={() => navigate("/admin/courses/new")}
              className="inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047]"
            >
              <Plus className="h-4 w-4" />
              新增商品
            </button>
          )}
          <button
            onClick={() => void loadProducts()}
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
        </div>
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

      <CourseProductMetrics data={data} />

      <CourseProductPublishQueuePanel
        queue={publishQueue}
        batchTasks={publishQueueBatchTasks}
        isLoading={isLoading}
        isCreatingTask={isCreatingPublishQueueTask}
        mutatingTaskId={mutatingPublishQueueTaskId}
        preflight={publishQueueTaskPreflight}
        onOpenWorkspace={openProductWorkspaceByCourseId}
        onCreateTask={createPublishQueueTask}
        onLoadTaskPreflight={loadPublishQueueTaskPreflight}
        onSubmitTask={submitPublishQueueTask}
        onCancelTask={cancelPublishQueueTask}
        onReviewTask={reviewPublishQueueTask}
      />

      <CourseProductAuditTrail events={auditEvents} />

      <section className="mt-6 border border-[#E1D7C8] bg-[#FFFDF8] px-5 py-4 shadow-sm shadow-[#243B35]/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#243B35]">
              课程素材治理已拆分
            </p>
            <p className="mt-1 max-w-[760px] text-sm leading-6 text-[#6F7771]">
              素材引用、合规队列、学习资料报表和批量治理任务进入独立工作区，课程商品页只保留日常商品管理。
            </p>
          </div>
          <a
            href="/admin/course-assets/governance"
            className="inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047]"
          >
            打开素材治理
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </section>
      <section className="mt-6 overflow-hidden rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] shadow-sm shadow-[#243B35]/5">
        <CourseProductFilters
          categories={categories}
          keywordDraft={keywordDraft}
          query={query}
          setQuery={setQuery}
          onKeywordDraftChange={setKeywordDraft}
        />

        {isLoading && !data ? (
          <div className="flex min-h-[420px] items-center justify-center text-sm text-[#6F7771]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            正在读取课程商品
          </div>
        ) : items.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1320px] text-left">
                <thead className="bg-[#F8F3EA] text-xs text-[#8A8176]">
                  <tr>
                    <th className="px-5 py-3 font-semibold">商品</th>
                    <th className="px-5 py-3 font-semibold">分类</th>
                    <th className="px-5 py-3 font-semibold">讲师与学习</th>
                    <th className="px-5 py-3 font-semibold">价格</th>
                    <th className="px-5 py-3 font-semibold">状态</th>
                    <th className="px-5 py-3 font-semibold">更新时间</th>
                    <th className="px-5 py-3 font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <CourseProductListRow
                      key={item.id}
                      item={item}
                      index={index}
                      isMutating={Boolean(mutatingProductId)}
                      contentQuality={contentQualityByProductId[item.id]}
                      canEdit={catalogPermissions.canEdit}
                      canReview={catalogPermissions.canReview}
                      canPublish={catalogPermissions.canPublish}
                      canPrice={catalogPermissions.canPrice}
                      reviewBlockReason={rejectedReviewReasons.get(item.id)}
                      onEditPrice={openPriceEditor}
                      onOpenWorkspace={openProductWorkspace}
                      onRequestReviewAction={openReviewAction}
                      onRequestStatusChange={openStatusAction}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#E8DED0] px-4 py-4 text-sm text-[#6F7771] md:flex-row md:items-center md:justify-between md:px-5">
              <span>
                第 {meta?.page ?? 1} / {meta?.totalPages ?? 1} 页，共{" "}
                {meta?.total ?? 0} 个商品
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setQuery(current => ({
                      ...current,
                      page: Math.max(1, current.page - 1),
                    }))
                  }
                  disabled={!hasPreviousPage || isLoading}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一页
                </button>
                <button
                  onClick={() =>
                    setQuery(current => ({
                      ...current,
                      page: current.page + 1,
                    }))
                  }
                  disabled={!hasNextPage || isLoading}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  下一页
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
            <BadgeCheck className="h-8 w-8 text-[#7C9288]" />
            <h2 className="mt-4 text-lg font-semibold">暂无匹配商品</h2>
            <p className="mt-2 max-w-[420px] text-sm leading-6 text-[#6F7771]">
              调整搜索关键词、分类或状态后重新筛选。
            </p>
          </div>
        )}
      </section>

      {statusAction && (
        <CourseProductStatusDialog
          product={statusAction.product}
          targetStatus={statusAction.targetStatus}
          reason={statusReason}
          isSubmitting={Boolean(mutatingProductId)}
          onReasonChange={setStatusReason}
          onCancel={() => setStatusAction(undefined)}
          onSubmit={() => void submitStatusAction()}
        />
      )}

      {reviewAction && (
        <CourseProductReviewDialog
          product={reviewAction.product}
          action={reviewAction.action}
          targetReviewStatus={reviewAction.targetReviewStatus}
          reason={reviewReason}
          isSubmitting={Boolean(mutatingProductId)}
          onReasonChange={setReviewReason}
          onCancel={() => setReviewAction(undefined)}
          onSubmit={() => void submitReviewAction()}
        />
      )}

      {priceEditor && (
        <CourseProductPriceDialog
          product={priceEditor}
          form={priceForm}
          isSubmitting={Boolean(mutatingProductId)}
          onFormChange={setPriceForm}
          onCancel={() => setPriceEditor(undefined)}
          onSubmit={() => void submitPriceUpdate()}
        />
      )}
    </div>
  );
}
