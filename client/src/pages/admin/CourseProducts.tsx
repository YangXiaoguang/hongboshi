import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  CircleDollarSign,
  Edit3,
  Eye,
  EyeOff,
  FilePenLine,
  History,
  Layers3,
  ListFilter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import {
  ALL_COURSE_PRODUCT_CATEGORY,
  ALL_COURSE_PRODUCT_STATUS,
  COURSE_CATEGORIES,
  COURSE_PRODUCT_PAGE_SIZE,
  COURSE_TYPES,
  type CourseProductAuditEvent,
  type CourseProductBasicInfoUpdateRequest,
  type CourseProductContentQualityResult,
  type CourseProductListItem,
  type CourseProductListQuery,
  type CourseProductListResult,
  type CourseProductPriceUpdateRequest,
  type CourseProductReviewAction,
  type CourseProductReviewStatus,
  type CourseProductStatus,
} from "@shared/domain";
import { useAuth } from "@/contexts/AuthContext";
import { httpCourseProductRepository } from "@/features/catalog";
import { getCourseProductAdminPermissions } from "@/features/catalog/model/courseProductAdminPermissions";
import { assetGovernanceActionCopy } from "./course-assets/courseAssetGovernanceModel";
import {
  CourseProductBasicInfoDialog,
  type CourseProductBasicInfoFormState,
} from "./courses/CourseProductBasicInfoDialog";
import {
  CourseProductPriceDialog,
  type CourseProductPriceFormState,
} from "./courses/CourseProductPriceDialog";
import { CourseProductReviewDialog } from "./courses/CourseProductReviewDialog";
import { CourseProductStatusDialog } from "./courses/CourseProductStatusDialog";
import {
  courseProductReviewActionCopy as reviewActionCopy,
  courseProductReviewCopy as reviewCopy,
  courseProductStatusCopy as statusCopy,
} from "./courses/courseProductAdminLabels";
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

type CourseProductStatusFilter = CourseProductListQuery["status"];
type CourseProductCategoryFilter = CourseProductListQuery["category"];
type StatusActionState = {
  product: CourseProductListItem;
  targetStatus: CourseProductStatus;
};
type ReviewActionState = {
  product: CourseProductListItem;
  action: CourseProductReviewAction;
  targetReviewStatus: CourseProductReviewStatus;
};

const statusFilters: {
  value: CourseProductStatusFilter;
  label: string;
}[] = [
  { value: ALL_COURSE_PRODUCT_STATUS, label: "全部状态" },
  { value: "published", label: "已上架" },
  { value: "unpublished", label: "已下架" },
  { value: "draft", label: "草稿" },
  { value: "archived", label: "已归档" },
];

const sortOptions: {
  value: CourseProductListQuery["sort"];
  label: string;
}[] = [
  { value: "updated_desc", label: "最近更新" },
  { value: "created_desc", label: "最新创建" },
  { value: "learners_desc", label: "学习人数" },
  { value: "price_asc", label: "价格从低到高" },
  { value: "price_desc", label: "价格从高到低" },
];

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

function courseProductListPathFromQuery(query: CourseProductListQuery) {
  const params = new URLSearchParams();
  if (query.keyword) params.set("keyword", query.keyword);
  if (query.category !== ALL_COURSE_PRODUCT_CATEGORY) {
    params.set("category", query.category);
  }
  if (query.status !== ALL_COURSE_PRODUCT_STATUS) {
    params.set("status", query.status);
  }
  if (query.sort !== "updated_desc") params.set("sort", query.sort);
  if (query.page > 1) params.set("page", String(query.page));
  if (query.pageSize !== COURSE_PRODUCT_PAGE_SIZE) {
    params.set("pageSize", String(query.pageSize));
  }
  const queryString = params.toString();
  return queryString ? "/admin/courses?" + queryString : "/admin/courses";
}

function formatMoney(item: CourseProductListItem) {
  if (item.price.isFree) return "免费";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: item.price.currency,
    maximumFractionDigits: 2,
  }).format(item.price.amount);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatAuditMoney(value: unknown) {
  if (!value || typeof value !== "object") return "未记录";
  const amount = "amount" in value ? Number(value.amount) : Number.NaN;
  const isFree = "isFree" in value ? Boolean(value.isFree) : false;
  if (isFree) return "免费";
  if (!Number.isFinite(amount)) return "未记录";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2,
  }).format(amount);
}

function auditStatusLabel(value: unknown) {
  if (typeof value !== "string") return "未记录";
  return value in statusCopy
    ? statusCopy[value as CourseProductStatus]
    : "未记录";
}

function auditReviewStatusLabel(value: unknown) {
  if (typeof value !== "string") return "未记录";
  return value in reviewCopy
    ? reviewCopy[value as CourseProductReviewStatus]
    : "未记录";
}

function auditChangeText(event: CourseProductAuditEvent) {
  if (event.action === "product_create") {
    const courseId =
      typeof event.after.courseId === "number" ? event.after.courseId : "";
    return courseId ? `新增课程 ID ${courseId}` : "新增课程商品草稿";
  }

  if (event.action === "asset_governance") {
    const action =
      typeof event.after.governanceAction === "string"
        ? event.after.governanceAction
        : "acknowledge_issue";
    const issue =
      typeof event.after.issueType === "string" ? event.after.issueType : "";
    return `${assetGovernanceActionCopy[action as keyof typeof assetGovernanceActionCopy] ?? "治理处理"} · ${issue}`;
  }
  if (event.action === "status_update") {
    return `${auditStatusLabel(event.before.status)} -> ${auditStatusLabel(
      event.after.status
    )}`;
  }
  if (event.action === "review_update") {
    return `${auditReviewStatusLabel(
      event.before.reviewStatus
    )} -> ${auditReviewStatusLabel(event.after.reviewStatus)}`;
  }
  if (event.action === "content_update") {
    const beforeChapters =
      typeof event.before.chapterCount === "number"
        ? event.before.chapterCount
        : 0;
    const afterChapters =
      typeof event.after.chapterCount === "number"
        ? event.after.chapterCount
        : 0;
    return `${beforeChapters} 章 -> ${afterChapters} 章`;
  }
  if (event.action === "info_update") {
    const beforeTitle =
      typeof event.before.title === "string" ? event.before.title : "未记录";
    const afterTitle =
      typeof event.after.title === "string" ? event.after.title : "未记录";
    return `${beforeTitle} -> ${afterTitle}`;
  }
  return `${formatAuditMoney(event.before.price)} -> ${formatAuditMoney(
    event.after.price
  )}`;
}

function auditActionLabel(action: CourseProductAuditEvent["action"]) {
  if (action === "product_create") return "新增商品";
  if (action === "status_update") return "状态更新";
  if (action === "price_update") return "价格更新";
  if (action === "review_update") return "审核更新";
  if (action === "content_update") return "内容更新";
  if (action === "asset_upload") return "素材上传";
  if (action === "asset_review") return "素材审核";
  if (action === "asset_governance") return "素材治理";
  return "信息更新";
}

function statusClass(status: CourseProductStatus) {
  if (status === "published") {
    return "bg-[#E7EFE8] text-[#41675A] ring-[#BCD1C4]";
  }
  if (status === "unpublished") {
    return "bg-[#FFF7E5] text-[#8F6B1C] ring-[#E7D08F]";
  }
  if (status === "archived") {
    return "bg-[#EFEAE3] text-[#6D655C] ring-[#D7CCBF]";
  }
  return "bg-[#EEF2F7] text-[#536783] ring-[#CDD7E4]";
}

function reviewClass(status: CourseProductReviewStatus) {
  if (status === "approved") {
    return "bg-[#E7EFE8] text-[#41675A]";
  }
  if (status === "rejected") {
    return "bg-[#FFF0EA] text-[#AD503A]";
  }
  if (status === "pending") {
    return "bg-[#FFF7E5] text-[#8F6B1C]";
  }
  return "bg-[#F1E8DC] text-[#7B817C]";
}

function metricItems(data?: CourseProductListResult) {
  const summary = data?.summary;
  return [
    {
      label: "课程商品",
      value: summary?.totalCount ?? 0,
      icon: Layers3,
    },
    {
      label: "已上架",
      value: summary?.publishedCount ?? 0,
      icon: BookOpenCheck,
    },
    {
      label: "免费课程",
      value: summary?.freeCount ?? 0,
      icon: CircleDollarSign,
    },
    {
      label: "会员权益",
      value: summary?.memberIncludedCount ?? 0,
      icon: UsersRound,
    },
  ];
}

function reviewActionsForItem(item: CourseProductListItem) {
  if (item.status === "archived") return [];

  if (
    item.reviewStatus === "not_submitted" ||
    item.reviewStatus === "rejected"
  ) {
    return [
      {
        action: "submit" as const,
        targetReviewStatus: "pending" as const,
      },
    ];
  }

  if (item.reviewStatus === "pending") {
    return [
      {
        action: "approve" as const,
        targetReviewStatus: "approved" as const,
      },
      {
        action: "reject" as const,
        targetReviewStatus: "rejected" as const,
      },
      {
        action: "withdraw" as const,
        targetReviewStatus: "not_submitted" as const,
      },
    ];
  }

  return [];
}

function AuditTrail({ events }: { events: CourseProductAuditEvent[] }) {
  const recentEvents = events.slice(0, 5);

  return (
    <section className="mt-6 overflow-hidden rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] shadow-sm shadow-[#243B35]/5">
      <div className="flex items-center justify-between border-b border-[#E8DED0] px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <History className="h-4 w-4 text-[#6F8F83]" />
          最近审计
        </div>
        <span className="rounded-full bg-[#F1E8DC] px-2.5 py-1 text-xs font-semibold text-[#756B60]">
          {events.length} 条
        </span>
      </div>

      {recentEvents.length ? (
        <div className="divide-y divide-[#E8DED0]">
          {recentEvents.map(event => (
            <div
              key={event.id}
              className="grid gap-3 px-5 py-3 text-sm md:grid-cols-[140px_minmax(0,1fr)_180px]"
            >
              <div>
                <p className="font-semibold text-[#243B35]">
                  {auditActionLabel(event.action)}
                </p>
                <p className="mt-1 text-xs text-[#8A8176]">
                  {formatDate(event.createdAt)}
                </p>
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#41524B]">
                  {event.productTitle}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                  {auditChangeText(event)} · {event.reason}
                </p>
              </div>
              <p className="text-xs text-[#8A8176]">操作者 {event.actorId}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex min-h-[116px] items-center justify-center px-5 text-sm text-[#8A8176]">
          本轮还没有课程商品操作记录
        </div>
      )}
    </section>
  );
}

function CourseProductRow({
  item,
  index,
  isMutating,
  contentQuality,
  canEdit,
  canReview,
  canPublish,
  canPrice,
  reviewBlockReason,
  onEditInfo,
  onEditContent,
  onEditPrice,
  onOpenWorkspace,
  onRequestReviewAction,
  onRequestStatusChange,
}: {
  item: CourseProductListItem;
  index: number;
  isMutating: boolean;
  contentQuality?: CourseProductContentQualityResult;
  canEdit: boolean;
  canReview: boolean;
  canPublish: boolean;
  canPrice: boolean;
  reviewBlockReason?: string;
  onEditInfo: (item: CourseProductListItem) => void;
  onEditContent: (item: CourseProductListItem) => void;
  onEditPrice: (item: CourseProductListItem) => void;
  onOpenWorkspace: (item: CourseProductListItem) => void;
  onRequestReviewAction: (
    item: CourseProductListItem,
    action: CourseProductReviewAction,
    targetReviewStatus: CourseProductReviewStatus
  ) => void;
  onRequestStatusChange: (
    item: CourseProductListItem,
    targetStatus: CourseProductStatus
  ) => void;
}) {
  const targetStatus =
    item.status === "published" ? "unpublished" : "published";
  const canToggleStatus =
    item.status === "published" ||
    ((item.status === "unpublished" || item.status === "draft") &&
      item.reviewStatus === "approved");
  const StatusIcon = item.status === "published" ? EyeOff : Eye;
  const reviewActions = reviewActionsForItem(item);
  const hasVisibleActions = canEdit || canReview || canPublish || canPrice;

  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.025, 0.16) }}
      className="group border-b border-[#E8DED0] last:border-b-0 hover:bg-[#FBF7EF]"
    >
      <td className="px-5 py-4">
        <div className="flex min-w-[320px] items-center gap-3">
          <img
            src={item.coverUrl}
            alt={item.title}
            className="h-12 w-16 shrink-0 rounded-md object-cover ring-1 ring-[#E5DACB]"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#243B35]">
              {item.title}
            </p>
            <p className="mt-1 text-xs text-[#8A8176]">
              ID {item.courseId} ·{" "}
              {item.source === "seed" ? "种子数据" : "运营录入"}
            </p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="min-w-[120px] text-sm text-[#5F6B64]">
          <p className="font-semibold text-[#243B35]">{item.category}</p>
          <p className="mt-1 text-xs text-[#8A8176]">{item.type}</p>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="min-w-[110px] text-sm text-[#5F6B64]">
          <p>{item.instructorName}</p>
          <p className="mt-1 text-xs text-[#8A8176]">
            {item.learners.toLocaleString("zh-CN")} 人学习
          </p>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="min-w-[110px]">
          <p className="text-sm font-semibold text-[#243B35]">
            {formatMoney(item)}
          </p>
          {item.price.originalAmount > item.price.amount && (
            <p className="mt-1 text-xs text-[#9A8F82] line-through">
              ¥{item.price.originalAmount}
            </p>
          )}
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="min-w-[112px] space-y-2">
          <span
            className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold ring-1 ${statusClass(
              item.status
            )}`}
          >
            {statusCopy[item.status]}
          </span>
          <span
            className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold ${reviewClass(
              item.reviewStatus
            )}`}
          >
            {reviewCopy[item.reviewStatus]}
          </span>
          {contentQuality && (
            <span
              className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold ${
                contentQuality.ready
                  ? "bg-[#EDF5EF] text-[#41675A]"
                  : "bg-[#FFF0EA] text-[#AD503A]"
              }`}
            >
              {contentQuality.ready
                ? contentQuality.warningCount > 0
                  ? "内容可审"
                  : "内容达标"
                : "内容待补"}
            </span>
          )}
          {item.reviewStatus === "rejected" && reviewBlockReason && (
            <p className="max-w-[160px] text-xs leading-5 text-[#AD503A]">
              {reviewBlockReason}
            </p>
          )}
        </div>
      </td>
      <td className="px-5 py-4 text-sm text-[#5F6B64]">
        <div className="min-w-[96px]">
          <p>{formatDate(item.updatedAt)}</p>
          <p className="mt-1 text-xs text-[#8A8176]">
            创建 {formatDate(item.createdAt)}
          </p>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="flex min-w-[300px] flex-wrap gap-2">
          {canPublish && (
            <button
              onClick={() => onRequestStatusChange(item, targetStatus)}
              disabled={!canToggleStatus || isMutating}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D8CEC0] bg-white px-2.5 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {item.status === "published" ? "下架" : "上架"}
            </button>
          )}
          {canReview &&
            reviewActions.map(action => (
              <button
                key={action.action}
                onClick={() =>
                  onRequestReviewAction(
                    item,
                    action.action,
                    action.targetReviewStatus
                  )
                }
                disabled={isMutating}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D8CEC0] bg-white px-2.5 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                {reviewActionCopy[action.action]}
              </button>
            ))}
          {canEdit && (
            <>
              <button
                onClick={() => onOpenWorkspace(item)}
                disabled={isMutating}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D8CEC0] bg-white px-2.5 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Layers3 className="h-3.5 w-3.5" />
                工作台
              </button>
              <button
                onClick={() => onEditInfo(item)}
                disabled={isMutating}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D8CEC0] bg-white px-2.5 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Edit3 className="h-3.5 w-3.5" />
                编辑
              </button>
              <button
                onClick={() => onEditContent(item)}
                disabled={isMutating}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D8CEC0] bg-white px-2.5 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <FilePenLine className="h-3.5 w-3.5" />
                内容
              </button>
            </>
          )}
          {canPrice && (
            <button
              onClick={() => onEditPrice(item)}
              disabled={isMutating}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#E6EDDF] px-2.5 text-xs font-semibold text-[#355F51] transition hover:bg-[#D7E5D4] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Edit3 className="h-3.5 w-3.5" />
              改价
            </button>
          )}
          {!hasVisibleActions && (
            <span className="inline-flex h-8 items-center rounded-lg bg-[#F1E8DC] px-2.5 text-xs font-semibold text-[#7B817C]">
              只读
            </span>
          )}
        </div>
      </td>
    </motion.tr>
  );
}

export default function CourseProducts() {
  const [, navigate] = useLocation();
  const { user, isLoggedIn, isAuthSyncing } = useAuth();
  const [data, setData] = useState<CourseProductListResult>();
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
  const [statusAction, setStatusAction] = useState<StatusActionState>();
  const [statusReason, setStatusReason] = useState("");
  const [reviewAction, setReviewAction] = useState<ReviewActionState>();
  const [reviewReason, setReviewReason] = useState("");
  const [infoEditor, setInfoEditor] = useState<CourseProductListItem>();
  const [infoForm, setInfoForm] = useState<CourseProductBasicInfoFormState>({
    title: "",
    coverUrl: "",
    category: COURSE_CATEGORIES[0],
    type: COURSE_TYPES[0],
    instructorName: "",
    learners: "0",
    reason: "",
  });
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
      const [products, contentQuality] = await Promise.all([
        httpCourseProductRepository.loadCourseProducts(query),
        httpCourseProductRepository.loadCourseProductContentQuality(),
      ]);
      setData(products);
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

  const openInfoEditor = useCallback(
    (item: CourseProductListItem) => {
      if (!catalogPermissions.canEdit) return;
      setActionError(undefined);
      setActionMessage(undefined);
      setInfoEditor(item);
      setInfoForm({
        title: item.title,
        coverUrl: item.coverUrl,
        category: item.category,
        type: item.type,
        instructorName: item.instructorName,
        learners: String(item.learners),
        reason: "",
      });
    },
    [catalogPermissions.canEdit]
  );

  const openContentEditor = useCallback(
    (item: CourseProductListItem) => {
      if (!catalogPermissions.canEdit) return;
      const returnTo = courseProductListPathFromQuery(query);
      navigate(
        `/admin/courses/${item.courseId}?returnTo=${encodeURIComponent(
          returnTo
        )}`
      );
    },
    [catalogPermissions.canEdit, navigate, query]
  );

  const openProductWorkspace = useCallback(
    (item: CourseProductListItem) => {
      if (!catalogPermissions.canEdit) return;
      navigate(`/admin/courses/${item.courseId}/edit`);
    },
    [catalogPermissions.canEdit, navigate]
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

  const submitBasicInfoUpdate = useCallback(async () => {
    if (!infoEditor) return;
    if (!catalogPermissions.canEdit) {
      setActionError("当前账号暂无课程商品编辑权限");
      return;
    }

    const learners = Number(infoForm.learners);
    if (!Number.isInteger(learners) || learners < 0) {
      setActionError("请填写有效的学习人数");
      return;
    }

    const request: CourseProductBasicInfoUpdateRequest = {
      title: infoForm.title,
      coverUrl: infoForm.coverUrl,
      category: infoForm.category,
      type: infoForm.type,
      instructorName: infoForm.instructorName,
      learners,
      reason: infoForm.reason,
    };

    setMutatingProductId(infoEditor.id);
    setActionError(undefined);
    setActionMessage(undefined);

    try {
      await httpCourseProductRepository.updateCourseProductBasicInfo(
        infoEditor.id,
        request
      );
      setActionMessage(`${infoEditor.title} 基础信息已更新`);
      setInfoEditor(undefined);
      await loadProducts();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "课程商品基础信息更新失败"
      );
    } finally {
      setMutatingProductId(undefined);
    }
  }, [catalogPermissions.canEdit, infoEditor, infoForm, loadProducts]);

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
    "管理课程商品的新建、基础信息、审核流、上架状态和价格；素材治理、批量任务与资料报表已拆到独立工作区。";

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

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 grid border-y border-[#E1D7C8] bg-[#FFFDF8] md:grid-cols-4"
      >
        {metricItems(data).map(item => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center justify-between border-b border-[#E8DED0] px-4 py-4 md:border-b-0 md:border-r last:md:border-r-0"
            >
              <div>
                <p className="text-xs text-[#8A8176]">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold text-[#243B35]">
                  {item.value}
                </p>
              </div>
              <Icon className="h-5 w-5 text-[#6F8F83]" />
            </div>
          );
        })}
      </motion.section>

      <AuditTrail events={auditEvents} />

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
        <form
          onSubmit={event => {
            event.preventDefault();
            setQuery(current => ({
              ...current,
              keyword: keywordDraft,
              page: 1,
            }));
          }}
          className="grid gap-3 border-b border-[#E8DED0] px-4 py-4 lg:grid-cols-[minmax(240px,1fr)_180px_150px_170px_auto] lg:items-center lg:px-5"
        >
          <label className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8176]" />
            <input
              value={keywordDraft}
              onChange={event => setKeywordDraft(event.target.value)}
              placeholder="搜索课程、讲师、分类或 ID"
              className="h-10 w-full rounded-lg border border-[#D8CEC0] bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
            />
          </label>

          <select
            value={query.category}
            onChange={event =>
              setQuery(current => ({
                ...current,
                category: event.target.value as CourseProductCategoryFilter,
                page: 1,
              }))
            }
            className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm text-[#41524B] outline-none transition focus:border-[#6F8F83]"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={query.status}
            onChange={event =>
              setQuery(current => ({
                ...current,
                status: event.target.value as CourseProductStatusFilter,
                page: 1,
              }))
            }
            className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm text-[#41524B] outline-none transition focus:border-[#6F8F83]"
          >
            {statusFilters.map(item => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            value={query.sort}
            onChange={event =>
              setQuery(current => ({
                ...current,
                sort: event.target.value as CourseProductListQuery["sort"],
                page: 1,
              }))
            }
            className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm text-[#41524B] outline-none transition focus:border-[#6F8F83]"
          >
            {sortOptions.map(item => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047]">
            <ListFilter className="h-4 w-4" />
            筛选
          </button>
        </form>

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
                    <CourseProductRow
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
                      onEditInfo={openInfoEditor}
                      onEditContent={openContentEditor}
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

      {infoEditor && (
        <CourseProductBasicInfoDialog
          product={infoEditor}
          form={infoForm}
          isSubmitting={Boolean(mutatingProductId)}
          onFormChange={setInfoForm}
          onCancel={() => setInfoEditor(undefined)}
          onSubmit={() => void submitBasicInfoUpdate()}
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
