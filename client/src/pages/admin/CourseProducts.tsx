import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Layers3,
  ListFilter,
  Loader2,
  RefreshCw,
  Search,
  UsersRound,
} from "lucide-react";
import {
  ALL_COURSE_PRODUCT_CATEGORY,
  ALL_COURSE_PRODUCT_STATUS,
  COURSE_CATEGORIES,
  COURSE_PRODUCT_PAGE_SIZE,
  userCan,
  type CourseProductListItem,
  type CourseProductListQuery,
  type CourseProductListResult,
  type CourseProductReviewStatus,
  type CourseProductStatus,
} from "@shared/domain";
import { useAuth } from "@/contexts/AuthContext";
import { httpCourseProductRepository } from "@/features/catalog";

type CourseProductStatusFilter = CourseProductListQuery["status"];
type CourseProductCategoryFilter = CourseProductListQuery["category"];

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

function CourseProductRow({
  item,
  index,
}: {
  item: CourseProductListItem;
  index: number;
}) {
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

  const categories = useMemo(
    () => [ALL_COURSE_PRODUCT_CATEGORY, ...COURSE_CATEGORIES],
    []
  );
  const items = data?.items ?? [];
  const meta = data?.meta;
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
            读取前台课程种子数据并统一为运营商品模型，支持搜索、状态、分类和分页核对。
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
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-[#F8F3EA] text-xs text-[#8A8176]">
                  <tr>
                    <th className="px-5 py-3 font-semibold">商品</th>
                    <th className="px-5 py-3 font-semibold">分类</th>
                    <th className="px-5 py-3 font-semibold">讲师与学习</th>
                    <th className="px-5 py-3 font-semibold">价格</th>
                    <th className="px-5 py-3 font-semibold">状态</th>
                    <th className="px-5 py-3 font-semibold">更新时间</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <CourseProductRow key={item.id} item={item} index={index} />
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
    </div>
  );
}
