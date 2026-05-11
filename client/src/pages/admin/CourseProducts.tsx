import { useCallback, useEffect, useMemo, useState } from "react";
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
  History,
  Layers3,
  ListFilter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
  UsersRound,
} from "lucide-react";
import {
  ALL_COURSE_PRODUCT_CATEGORY,
  ALL_COURSE_PRODUCT_STATUS,
  COURSE_CATEGORIES,
  COURSE_PRODUCT_PAGE_SIZE,
  COURSE_TYPES,
  userCan,
  type CourseCategory,
  type CourseProductAuditEvent,
  type CourseProductBasicInfoUpdateRequest,
  type CourseProductListItem,
  type CourseProductListQuery,
  type CourseProductListResult,
  type CourseProductPriceUpdateRequest,
  type CourseProductReviewAction,
  type CourseProductReviewStatus,
  type CourseProductStatus,
  type CourseType,
} from "@shared/domain";
import { useAuth } from "@/contexts/AuthContext";
import { httpCourseProductRepository } from "@/features/catalog";

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
type PriceFormState = {
  amount: string;
  originalAmount: string;
  isFree: boolean;
  memberIncluded: boolean;
  reason: string;
};
type BasicInfoFormState = {
  title: string;
  coverUrl: string;
  category: CourseCategory;
  type: CourseType;
  instructorName: string;
  learners: string;
  reason: string;
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

const statusCopy = {
  draft: "草稿",
  published: "已上架",
  unpublished: "已下架",
  archived: "已归档",
} satisfies Record<CourseProductStatus, string>;

const reviewCopy = {
  not_submitted: "未提交",
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
} satisfies Record<CourseProductReviewStatus, string>;

const reviewActionCopy = {
  submit: "提交审核",
  approve: "通过审核",
  reject: "驳回审核",
  withdraw: "撤回审核",
} satisfies Record<CourseProductReviewAction, string>;

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
  if (action === "status_update") return "状态更新";
  if (action === "price_update") return "价格更新";
  if (action === "review_update") return "审核更新";
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
  reviewBlockReason,
  onEditInfo,
  onEditPrice,
  onRequestReviewAction,
  onRequestStatusChange,
}: {
  item: CourseProductListItem;
  index: number;
  isMutating: boolean;
  reviewBlockReason?: string;
  onEditInfo: (item: CourseProductListItem) => void;
  onEditPrice: (item: CourseProductListItem) => void;
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
          <button
            onClick={() => onRequestStatusChange(item, targetStatus)}
            disabled={!canToggleStatus || isMutating}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D8CEC0] bg-white px-2.5 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {item.status === "published" ? "下架" : "上架"}
          </button>
          {reviewActions.map(action => (
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
          <button
            onClick={() => onEditInfo(item)}
            disabled={isMutating}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D8CEC0] bg-white px-2.5 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Edit3 className="h-3.5 w-3.5" />
            编辑
          </button>
          <button
            onClick={() => onEditPrice(item)}
            disabled={isMutating}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#E6EDDF] px-2.5 text-xs font-semibold text-[#355F51] transition hover:bg-[#D7E5D4] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Edit3 className="h-3.5 w-3.5" />
            改价
          </button>
        </div>
      </td>
    </motion.tr>
  );
}

export default function CourseProducts() {
  const { user, isLoggedIn, isAuthSyncing } = useAuth();
  const [data, setData] = useState<CourseProductListResult>();
  const [query, setQuery] = useState<CourseProductListQuery>({
    keyword: "",
    category: ALL_COURSE_PRODUCT_CATEGORY,
    status: ALL_COURSE_PRODUCT_STATUS,
    sort: "updated_desc",
    page: 1,
    pageSize: COURSE_PRODUCT_PAGE_SIZE,
  });
  const [keywordDraft, setKeywordDraft] = useState("");
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
  const [infoForm, setInfoForm] = useState<BasicInfoFormState>({
    title: "",
    coverUrl: "",
    category: COURSE_CATEGORIES[0],
    type: COURSE_TYPES[0],
    instructorName: "",
    learners: "0",
    reason: "",
  });
  const [priceEditor, setPriceEditor] = useState<CourseProductListItem>();
  const [priceForm, setPriceForm] = useState<PriceFormState>({
    amount: "",
    originalAmount: "",
    isFree: false,
    memberIncluded: false,
    reason: "",
  });

  const canManageCourses = Boolean(user && userCan(user, "admin:manage"));

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      setData(await httpCourseProductRepository.loadCourseProducts(query));
    } catch (err) {
      setError(err instanceof Error ? err.message : "课程商品列表暂时不可用");
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (isAuthSyncing || !isLoggedIn || !canManageCourses) return;
    void loadProducts();
  }, [canManageCourses, isAuthSyncing, isLoggedIn, loadProducts]);

  const openInfoEditor = useCallback((item: CourseProductListItem) => {
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
  }, []);

  const openPriceEditor = useCallback((item: CourseProductListItem) => {
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
  }, []);

  const openStatusAction = useCallback(
    (product: CourseProductListItem, targetStatus: CourseProductStatus) => {
      setActionError(undefined);
      setActionMessage(undefined);
      setStatusAction({ product, targetStatus });
      setStatusReason("");
    },
    []
  );

  const openReviewAction = useCallback(
    (
      product: CourseProductListItem,
      action: CourseProductReviewAction,
      targetReviewStatus: CourseProductReviewStatus
    ) => {
      setActionError(undefined);
      setActionMessage(undefined);
      setReviewAction({ product, action, targetReviewStatus });
      setReviewReason("");
    },
    []
  );

  const submitStatusAction = useCallback(async () => {
    if (!statusAction) return;
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
  }, [loadProducts, statusAction, statusReason]);

  const submitReviewAction = useCallback(async () => {
    if (!reviewAction) return;
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
  }, [loadProducts, reviewAction, reviewReason]);

  const submitBasicInfoUpdate = useCallback(async () => {
    if (!infoEditor) return;

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
  }, [infoEditor, infoForm, loadProducts]);

  const submitPriceUpdate = useCallback(async () => {
    if (!priceEditor) return;

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
  }, [loadProducts, priceEditor, priceForm]);

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

  if (isAuthSyncing || !isLoggedIn || !canManageCourses) {
    return null;
  }

  return (
    <div className="text-[#243B35]">
      <section className="flex flex-col gap-4 border-b border-[#E1D7C8] pb-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B7E6D]">
            课程商品
          </p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
            商品列表与状态
          </h1>
          <p className="mt-3 max-w-[760px] text-sm leading-6 text-[#6F7771]">
            统一管理课程商品的基础信息、审核流、上架状态、价格和审计记录，已联动前台发布可见性，支持搜索、分类、排序和分页核对。
          </p>
        </div>
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
                      reviewBlockReason={rejectedReviewReasons.get(item.id)}
                      onEditInfo={openInfoEditor}
                      onEditPrice={openPriceEditor}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18231F]/45 px-4">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-[520px] rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#8A8176]">状态动作</p>
                <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                  {statusAction.targetStatus === "published"
                    ? "上架课程商品"
                    : "下架课程商品"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6F7771]">
                  {statusAction.product.title}
                </p>
              </div>
              <button
                onClick={() => setStatusAction(undefined)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7D746B] transition hover:bg-[#F1E8DC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-5 block text-sm font-semibold text-[#41524B]">
              操作原因
              <textarea
                value={statusReason}
                onChange={event => setStatusReason(event.target.value)}
                placeholder="例如：内容完成复核，允许本周活动曝光"
                className="mt-2 min-h-[96px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
              />
            </label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setStatusAction(undefined)}
                className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-4 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
              >
                取消
              </button>
              <button
                onClick={() => void submitStatusAction()}
                disabled={
                  statusReason.trim().length < 4 || Boolean(mutatingProductId)
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutatingProductId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : statusAction.targetStatus === "published" ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                确认
                {statusAction.targetStatus === "published" ? "上架" : "下架"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {reviewAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18231F]/45 px-4">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-[520px] rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#8A8176]">审核动作</p>
                <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                  {reviewActionCopy[reviewAction.action]}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6F7771]">
                  {reviewAction.product.title} ·{" "}
                  {reviewCopy[reviewAction.product.reviewStatus]} {"->"}{" "}
                  {reviewCopy[reviewAction.targetReviewStatus]}
                </p>
              </div>
              <button
                onClick={() => setReviewAction(undefined)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7D746B] transition hover:bg-[#F1E8DC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-5 block text-sm font-semibold text-[#41524B]">
              审核原因
              <textarea
                value={reviewReason}
                onChange={event => setReviewReason(event.target.value)}
                placeholder={
                  reviewAction.action === "reject"
                    ? "例如：章节素材缺少课后练习说明"
                    : "例如：课程内容和素材已完成审核确认"
                }
                className="mt-2 min-h-[96px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
              />
            </label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setReviewAction(undefined)}
                className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-4 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
              >
                取消
              </button>
              <button
                onClick={() => void submitReviewAction()}
                disabled={
                  reviewReason.trim().length < 4 || Boolean(mutatingProductId)
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutatingProductId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardCheck className="h-4 w-4" />
                )}
                确认{reviewActionCopy[reviewAction.action]}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {infoEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18231F]/45 px-4">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-[680px] rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#8A8176]">基础信息</p>
                <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                  {infoEditor.title}
                </h2>
              </div>
              <button
                onClick={() => setInfoEditor(undefined)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7D746B] transition hover:bg-[#F1E8DC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-[#41524B]">
                课程标题
                <input
                  value={infoForm.title}
                  onChange={event =>
                    setInfoForm(current => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                />
              </label>
              <label className="text-sm font-semibold text-[#41524B]">
                讲师
                <input
                  value={infoForm.instructorName}
                  onChange={event =>
                    setInfoForm(current => ({
                      ...current,
                      instructorName: event.target.value,
                    }))
                  }
                  className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                />
              </label>
            </div>

            <label className="mt-4 block text-sm font-semibold text-[#41524B]">
              封面地址
              <input
                value={infoForm.coverUrl}
                onChange={event =>
                  setInfoForm(current => ({
                    ...current,
                    coverUrl: event.target.value,
                  }))
                }
                className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
              />
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="text-sm font-semibold text-[#41524B]">
                分类
                <select
                  value={infoForm.category}
                  onChange={event =>
                    setInfoForm(current => ({
                      ...current,
                      category: event.target.value as CourseCategory,
                    }))
                  }
                  className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                >
                  {COURSE_CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-[#41524B]">
                类型
                <select
                  value={infoForm.type}
                  onChange={event =>
                    setInfoForm(current => ({
                      ...current,
                      type: event.target.value as CourseType,
                    }))
                  }
                  className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                >
                  {COURSE_TYPES.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-[#41524B]">
                学习人数
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={infoForm.learners}
                  onChange={event =>
                    setInfoForm(current => ({
                      ...current,
                      learners: event.target.value,
                    }))
                  }
                  className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                />
              </label>
            </div>

            <label className="mt-4 block text-sm font-semibold text-[#41524B]">
              更新原因
              <textarea
                value={infoForm.reason}
                onChange={event =>
                  setInfoForm(current => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
                placeholder="例如：课程封面和讲师信息完成校对"
                className="mt-2 min-h-[96px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
              />
            </label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setInfoEditor(undefined)}
                className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-4 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
              >
                取消
              </button>
              <button
                onClick={() => void submitBasicInfoUpdate()}
                disabled={
                  infoForm.title.trim().length < 2 ||
                  infoForm.instructorName.trim().length < 1 ||
                  infoForm.reason.trim().length < 4 ||
                  Boolean(mutatingProductId)
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutatingProductId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Edit3 className="h-4 w-4" />
                )}
                保存信息
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {priceEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18231F]/45 px-4">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-[560px] rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#8A8176]">价格编辑</p>
                <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                  {priceEditor.title}
                </h2>
              </div>
              <button
                onClick={() => setPriceEditor(undefined)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7D746B] transition hover:bg-[#F1E8DC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-[#41524B]">
                售价
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceForm.amount}
                  disabled={priceForm.isFree}
                  onChange={event =>
                    setPriceForm(current => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83] disabled:bg-[#F4EFE7] disabled:text-[#9A8F82]"
                />
              </label>
              <label className="text-sm font-semibold text-[#41524B]">
                原价
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceForm.originalAmount}
                  onChange={event =>
                    setPriceForm(current => ({
                      ...current,
                      originalAmount: event.target.value,
                    }))
                  }
                  className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-lg border border-[#E1D7C8] bg-white px-3 py-2 text-sm font-semibold text-[#41524B]">
                <input
                  type="checkbox"
                  checked={priceForm.isFree}
                  onChange={event =>
                    setPriceForm(current => ({
                      ...current,
                      isFree: event.target.checked,
                      amount: event.target.checked ? "0" : current.amount,
                    }))
                  }
                />
                免费课程
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-[#E1D7C8] bg-white px-3 py-2 text-sm font-semibold text-[#41524B]">
                <input
                  type="checkbox"
                  checked={priceForm.memberIncluded}
                  onChange={event =>
                    setPriceForm(current => ({
                      ...current,
                      memberIncluded: event.target.checked,
                    }))
                  }
                />
                会员权益内
              </label>
            </div>

            <label className="mt-4 block text-sm font-semibold text-[#41524B]">
              改价原因
              <textarea
                value={priceForm.reason}
                onChange={event =>
                  setPriceForm(current => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
                placeholder="例如：配合课程专题活动调整本期价格"
                className="mt-2 min-h-[96px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
              />
            </label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setPriceEditor(undefined)}
                className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-4 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
              >
                取消
              </button>
              <button
                onClick={() => void submitPriceUpdate()}
                disabled={
                  priceForm.reason.trim().length < 4 ||
                  Boolean(mutatingProductId)
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutatingProductId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Edit3 className="h-4 w-4" />
                )}
                保存价格
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
