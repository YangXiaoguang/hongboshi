import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileWarning,
  History,
  Loader2,
  MessageCircle,
  PhoneCall,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  ALL_RISK_ADMIN_LEVEL,
  ALL_RISK_ADMIN_SOURCE,
  ALL_RISK_ADMIN_STATUS,
  RISK_ADMIN_PAGE_SIZE,
  RISK_ADMIN_PERMISSIONS,
  RiskAdminListQuerySchema,
  RiskEventSourceSchema,
  RiskEventStatusSchema,
  RiskLevelSchema,
  userCan,
  type RiskAdminAction,
  type RiskAdminDetail,
  type RiskAdminListItem,
  type RiskAdminListQuery,
  type RiskAdminListResult,
  type RiskEventSource,
  type RiskEventStatus,
  type RiskLevel,
} from "@shared/domain";
import { useAuth } from "@/contexts/AuthContext";
import { httpRiskAdminRepository } from "@/features/risk";

const riskLevelCopy = {
  medium: "中风险",
  high: "高风险",
  urgent: "紧急风险",
} satisfies Record<RiskLevel, string>;

const riskStatusCopy = {
  open: "待复核",
  reviewing: "复核中",
  escalated: "已升级",
  resolved: "已解决",
} satisfies Record<RiskEventStatus, string>;

const riskSourceCopy = {
  assessment: "心理测评",
  counseling_intake: "咨询前信息",
  chat: "对话",
  operator: "运营标记",
} satisfies Record<RiskEventSource, string>;

const riskActionCopy = {
  start_review: "开始复核",
  mark_contacted: "已联系用户",
  recommend_counseling: "建议咨询",
  escalate: "升级处理",
  resolve: "标记解决",
} satisfies Record<RiskAdminAction, string>;

const riskActionDescription = {
  start_review: "锁定当前事件并进入人工复核。",
  mark_contacted: "记录已完成联系或联系尝试。",
  recommend_counseling: "记录已推荐咨询或后续支持。",
  escalate: "转入更高优先级队列。",
  resolve: "完成本次风险事件处理。",
} satisfies Record<RiskAdminAction, string>;

const sortOptions: {
  value: RiskAdminListQuery["sort"];
  label: string;
}[] = [
  { value: "status_priority_desc", label: "状态优先" },
  { value: "risk_level_desc", label: "风险优先" },
  { value: "created_desc", label: "最近触发" },
];

function formatDate(value?: string) {
  if (!value) return "未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function metricValue(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function riskLevelClass(level: RiskLevel) {
  if (level === "urgent") return "bg-[#FBEAE7] text-[#9B3B2F]";
  if (level === "high") return "bg-[#FFF7E5] text-[#8F6B1C]";
  return "bg-[#EAF0F7] text-[#4A647E]";
}

function riskStatusClass(status: RiskEventStatus) {
  if (status === "resolved") return "bg-[#E7EFE8] text-[#41675A]";
  if (status === "escalated") return "bg-[#FBEAE7] text-[#9B3B2F]";
  if (status === "reviewing") return "bg-[#FFF7E5] text-[#8F6B1C]";
  return "bg-[#EAF0F7] text-[#4A647E]";
}

function sourceIcon(source: RiskEventSource): LucideIcon {
  if (source === "assessment") return ClipboardCheck;
  if (source === "counseling_intake") return MessageCircle;
  if (source === "operator") return ShieldCheck;
  return FileWarning;
}

function actionOptionsForStatus(status: RiskEventStatus): RiskAdminAction[] {
  if (status === "resolved") return [];
  if (status === "open") {
    return [
      "start_review",
      "mark_contacted",
      "recommend_counseling",
      "escalate",
      "resolve",
    ];
  }
  if (status === "reviewing") {
    return ["mark_contacted", "recommend_counseling", "escalate", "resolve"];
  }
  return ["mark_contacted", "recommend_counseling", "resolve"];
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  const Icon = icon;
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center px-5 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#E5ECE1] text-[#41675A]">
        <Icon className="h-5 w-5" />
      </span>
      <h2 className="mt-4 text-sm font-semibold text-[#243B35]">{title}</h2>
      <p className="mt-2 max-w-[380px] text-sm leading-6 text-[#7B817C]">
        {description}
      </p>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-[#E8DED0] px-5 py-4 first:border-t-0">
      <h3 className="text-xs font-semibold text-[#8A8176]">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function RiskEventRow({
  event,
  selected,
  onSelect,
}: {
  event: RiskAdminListItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const SourceIcon = sourceIcon(event.source);

  return (
    <button
      onClick={onSelect}
      className={`grid w-full gap-3 border-b border-[#E8DED0] px-4 py-4 text-left text-sm transition last:border-b-0 lg:grid-cols-[minmax(260px,1.3fr)_130px_120px_130px] ${
        selected ? "bg-[#F5EFE6]" : "hover:bg-[#FBF7EF]"
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E6EDDF] text-[#41675A]">
            <SourceIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-[#243B35]">
              {event.user.displayName ?? event.user.id ?? "匿名风险事件"}
            </p>
            <p className="mt-0.5 truncate text-xs text-[#8A8176]">
              {event.user.phoneMasked ?? event.id}
            </p>
          </div>
        </div>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#66716A]">
          {event.signalSummary}
        </p>
      </div>

      <div>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${riskLevelClass(
            event.riskLevel
          )}`}
        >
          {riskLevelCopy[event.riskLevel]}
        </span>
        <p className="mt-2 text-xs text-[#8A8176]">
          {riskSourceCopy[event.source]}
        </p>
      </div>

      <div>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${riskStatusClass(
            event.status
          )}`}
        >
          {riskStatusCopy[event.status]}
        </span>
        <p className="mt-2 text-xs text-[#8A8176]">
          {event.recordCount ? `${event.recordCount} 条记录` : "暂无记录"}
        </p>
      </div>

      <div className="min-w-0 text-[#5F6B64]">
        <p>{formatDate(event.createdAt)}</p>
        <p className="mt-1 truncate text-xs text-[#8A8176]">
          {event.reviewerId ?? "未分配复核人"}
        </p>
      </div>
    </button>
  );
}

function MetricTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  const Icon = icon;
  return (
    <div className="flex items-center justify-between border-b border-[#E8DED0] px-4 py-4 md:border-b-0 md:border-r last:md:border-r-0">
      <div>
        <p className="text-xs text-[#8A8176]">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-[#243B35]">
          {metricValue(value)}
        </p>
      </div>
      <Icon className="h-5 w-5 text-[#6F8F83]" />
    </div>
  );
}

export default function RiskReview() {
  const { user } = useAuth();
  const canReview = !!user && userCan(user, RISK_ADMIN_PERMISSIONS.review);
  const [query, setQuery] = useState<Partial<RiskAdminListQuery>>({
    page: 1,
    pageSize: RISK_ADMIN_PAGE_SIZE,
    riskLevel: ALL_RISK_ADMIN_LEVEL,
    status: ALL_RISK_ADMIN_STATUS,
    source: ALL_RISK_ADMIN_SOURCE,
    sort: "status_priority_desc",
    keyword: "",
  });
  const [result, setResult] = useState<RiskAdminListResult | null>(null);
  const [detail, setDetail] = useState<RiskAdminDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string>();
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] =
    useState<RiskAdminAction>("start_review");
  const [note, setNote] = useState("");

  const normalizedQuery = useMemo(
    () => RiskAdminListQuerySchema.parse(query),
    [query]
  );

  const actionOptions = useMemo(
    () => (detail ? actionOptionsForStatus(detail.event.status) : []),
    [detail]
  );

  const loadList = useCallback(
    async (showLoading = true) => {
      if (showLoading) setIsLoadingList(true);
      setListError(null);
      try {
        const data = await httpRiskAdminRepository.loadEvents(normalizedQuery);
        setResult(data);
        setSelectedId(current => {
          if (current && data.items.some(item => item.id === current)) {
            return current;
          }
          return data.items[0]?.id;
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "风险复核列表加载失败";
        setListError(message);
        toast.error(message);
      } finally {
        if (showLoading) setIsLoadingList(false);
      }
    },
    [normalizedQuery]
  );

  const loadDetail = useCallback(async (riskEventId: string) => {
    setIsLoadingDetail(true);
    setDetailError(null);
    try {
      const data = await httpRiskAdminRepository.loadEventDetail(riskEventId);
      setDetail(data);
      const nextActions = actionOptionsForStatus(data.event.status);
      setSelectedAction(nextActions[0] ?? "start_review");
      setNote("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "风险复核详情加载失败";
      setDetailError(message);
      setDetail(null);
      toast.error(message);
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId);
  }, [loadDetail, selectedId]);

  function updateQuery(next: Partial<RiskAdminListQuery>) {
    setQuery(current => ({
      ...current,
      ...next,
      page: next.page ?? 1,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !canReview || !selectedId) return;
    const trimmedNote = note.trim();
    if (trimmedNote.length < 2) {
      toast.error("请填写至少 2 个字的处理备注");
      return;
    }

    setIsSubmitting(true);
    try {
      const mutation = await httpRiskAdminRepository.updateEvent(selectedId, {
        action: selectedAction,
        note: trimmedNote,
      });
      setDetail(mutation.detail);
      setNote("");
      const nextActions = actionOptionsForStatus(mutation.detail.event.status);
      setSelectedAction(nextActions[0] ?? "start_review");
      await loadList(false);
      toast.success("风险复核处理已记录");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "风险复核处理失败";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const page = result?.meta.page ?? normalizedQuery.page;
  const totalPages = Math.max(result?.meta.totalPages ?? 0, 1);
  const items = result?.items ?? [];

  return (
    <div className="text-[#243B35]">
      <section className="flex flex-col gap-4 border-b border-[#E1D7C8] pb-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B7E6D]">
            风险复核台
          </p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
            高风险事件复核与处理记录
          </h1>
          <p className="mt-3 max-w-[780px] text-sm leading-6 text-[#6F7771]">
            汇总心理测评、咨询前信息和运营标记触发的风险事件，提供状态跟进、SOP
            提醒和处理记录沉淀。页面默认只展示运营必要摘要，避免扩散敏感原文。
          </p>
        </div>
        <button
          onClick={() => void loadList()}
          disabled={isLoadingList}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoadingList ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          刷新
        </button>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 grid border-y border-[#E1D7C8] bg-[#FFFDF8] md:grid-cols-4"
      >
        <MetricTile
          label="待处理事件"
          value={result?.summary.needsActionCount ?? 0}
          icon={ShieldAlert}
        />
        <MetricTile
          label="紧急风险"
          value={result?.summary.urgentCount ?? 0}
          icon={AlertTriangle}
        />
        <MetricTile
          label="复核中"
          value={result?.summary.reviewingCount ?? 0}
          icon={Loader2}
        />
        <MetricTile
          label="已解决"
          value={result?.summary.resolvedCount ?? 0}
          icon={CheckCircle2}
        />
      </motion.section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 overflow-hidden rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] shadow-sm shadow-[#243B35]/5">
          <div className="border-b border-[#E8DED0] px-4 py-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_150px_150px_150px_150px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A8F82]" />
                <input
                  value={normalizedQuery.keyword}
                  onChange={event =>
                    updateQuery({ keyword: event.target.value })
                  }
                  placeholder="搜索用户、事件或摘要"
                  className="h-10 w-full rounded-lg border border-[#E1D7C8] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#9CAF88]"
                />
              </label>

              <select
                value={normalizedQuery.riskLevel}
                onChange={event =>
                  updateQuery({
                    riskLevel: event.target
                      .value as RiskAdminListQuery["riskLevel"],
                  })
                }
                className="h-10 rounded-lg border border-[#E1D7C8] bg-white px-3 text-sm outline-none transition focus:border-[#9CAF88]"
              >
                <option value={ALL_RISK_ADMIN_LEVEL}>全部等级</option>
                {RiskLevelSchema.options.map(level => (
                  <option key={level} value={level}>
                    {riskLevelCopy[level]}
                  </option>
                ))}
              </select>

              <select
                value={normalizedQuery.status}
                onChange={event =>
                  updateQuery({
                    status: event.target.value as RiskAdminListQuery["status"],
                  })
                }
                className="h-10 rounded-lg border border-[#E1D7C8] bg-white px-3 text-sm outline-none transition focus:border-[#9CAF88]"
              >
                <option value={ALL_RISK_ADMIN_STATUS}>全部状态</option>
                {RiskEventStatusSchema.options.map(status => (
                  <option key={status} value={status}>
                    {riskStatusCopy[status]}
                  </option>
                ))}
              </select>

              <select
                value={normalizedQuery.source}
                onChange={event =>
                  updateQuery({
                    source: event.target.value as RiskAdminListQuery["source"],
                  })
                }
                className="h-10 rounded-lg border border-[#E1D7C8] bg-white px-3 text-sm outline-none transition focus:border-[#9CAF88]"
              >
                <option value={ALL_RISK_ADMIN_SOURCE}>全部来源</option>
                {RiskEventSourceSchema.options.map(source => (
                  <option key={source} value={source}>
                    {riskSourceCopy[source]}
                  </option>
                ))}
              </select>

              <select
                value={normalizedQuery.sort}
                onChange={event =>
                  updateQuery({
                    sort: event.target.value as RiskAdminListQuery["sort"],
                  })
                }
                className="h-10 rounded-lg border border-[#E1D7C8] bg-white px-3 text-sm outline-none transition focus:border-[#9CAF88]"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="min-h-[420px]">
            {isLoadingList ? (
              <EmptyState
                icon={Loader2}
                title="正在加载风险事件"
                description="系统正在汇总风险事件、处理记录和最小化展示摘要。"
              />
            ) : listError ? (
              <EmptyState
                icon={FileWarning}
                title="风险复核列表暂时不可用"
                description={listError}
              />
            ) : items.length ? (
              <div>
                {items.map(event => (
                  <RiskEventRow
                    key={event.id}
                    event={event}
                    selected={event.id === selectedId}
                    onSelect={() => setSelectedId(event.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ShieldCheck}
                title="当前筛选下暂无风险事件"
                description="可以切换等级、状态、来源或搜索条件查看其他风险复核队列。"
              />
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-[#E8DED0] px-4 py-4 text-sm text-[#66716A] md:flex-row md:items-center md:justify-between">
            <span>
              共 {metricValue(result?.meta.total ?? 0)} 条，当前第 {page} /{" "}
              {totalPages} 页
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuery({ page: Math.max(page - 1, 1) })}
                disabled={page <= 1 || isLoadingList}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#E1D7C8] bg-white px-3 font-semibold transition hover:bg-[#F8F3EA] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                上一页
              </button>
              <button
                onClick={() =>
                  updateQuery({ page: Math.min(page + 1, totalPages) })
                }
                disabled={page >= totalPages || isLoadingList}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#E1D7C8] bg-white px-3 font-semibold transition hover:bg-[#F8F3EA] disabled:cursor-not-allowed disabled:opacity-50"
              >
                下一页
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <aside className="min-w-0 overflow-hidden rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] shadow-sm shadow-[#243B35]/5">
          {isLoadingDetail ? (
            <EmptyState
              icon={Loader2}
              title="正在读取复核详情"
              description="正在加载当前事件的摘要、SOP 提醒和处理记录。"
            />
          ) : detailError ? (
            <EmptyState
              icon={FileWarning}
              title="风险复核详情暂时不可用"
              description={detailError}
            />
          ) : detail ? (
            <>
              <div className="border-b border-[#E8DED0] px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#8A8176]">
                      当前事件
                    </p>
                    <h2 className="mt-1 truncate text-lg font-semibold">
                      {detail.event.user.displayName ??
                        detail.event.user.id ??
                        detail.event.id}
                    </h2>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${riskStatusClass(
                      detail.event.status
                    )}`}
                  >
                    {riskStatusCopy[detail.event.status]}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#66716A]">
                  {detail.event.signalSummary}
                </p>
              </div>

              <DetailSection title="事件摘要">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-[#F8F3EA] px-3 py-2">
                    <p className="text-xs text-[#8A8176]">风险等级</p>
                    <p className="mt-1 font-semibold">
                      {riskLevelCopy[detail.event.riskLevel]}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#F8F3EA] px-3 py-2">
                    <p className="text-xs text-[#8A8176]">来源</p>
                    <p className="mt-1 font-semibold">
                      {riskSourceCopy[detail.event.source]}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#F8F3EA] px-3 py-2">
                    <p className="text-xs text-[#8A8176]">触发时间</p>
                    <p className="mt-1 font-semibold">
                      {formatDate(detail.event.createdAt)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#F8F3EA] px-3 py-2">
                    <p className="text-xs text-[#8A8176]">复核人</p>
                    <p className="mt-1 truncate font-semibold">
                      {detail.event.reviewerId ?? "未分配"}
                    </p>
                  </div>
                </div>
              </DetailSection>

              <DetailSection title="关联对象">
                {detail.event.relatedObject ? (
                  <div className="rounded-lg bg-[#F8F3EA] p-3 text-sm">
                    <div className="flex items-center gap-2 font-semibold">
                      <CalendarDays className="h-4 w-4 text-[#6F8F83]" />
                      {detail.event.relatedObject.type === "assessment_report"
                        ? "测评报告"
                        : "咨询预约"}
                    </div>
                    <p className="mt-2 break-all text-xs text-[#8A8176]">
                      {detail.event.relatedObject.id}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#66716A]">
                      {detail.event.relatedObject.summary ?? "暂无摘要"}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-[#66716A]">
                    当前事件暂未匹配到可展示的关联业务对象。
                  </p>
                )}
              </DetailSection>

              <DetailSection title="处理建议">
                <div className="space-y-2">
                  {detail.sopHints.map(hint => (
                    <div
                      key={hint}
                      className="flex items-start gap-2 rounded-lg bg-[#F8F3EA] px-3 py-2 text-sm leading-6 text-[#5F6B64]"
                    >
                      <Sparkles className="mt-1 h-3.5 w-3.5 shrink-0 text-[#6F8F83]" />
                      {hint}
                    </div>
                  ))}
                </div>
              </DetailSection>

              {canReview && actionOptions.length ? (
                <DetailSection title="记录处理">
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <select
                      value={selectedAction}
                      onChange={event =>
                        setSelectedAction(event.target.value as RiskAdminAction)
                      }
                      className="h-10 w-full rounded-lg border border-[#E1D7C8] bg-white px-3 text-sm outline-none transition focus:border-[#9CAF88]"
                    >
                      {actionOptions.map(action => (
                        <option key={action} value={action}>
                          {riskActionCopy[action]}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs leading-5 text-[#8A8176]">
                      {riskActionDescription[selectedAction]}
                    </p>
                    <textarea
                      value={note}
                      onChange={event => setNote(event.target.value)}
                      rows={4}
                      maxLength={300}
                      placeholder="填写处理摘要，不粘贴用户敏感原文"
                      className="w-full resize-none rounded-lg border border-[#E1D7C8] bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-[#9CAF88]"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <PhoneCall className="h-4 w-4" />
                      )}
                      保存处理记录
                    </button>
                  </form>
                </DetailSection>
              ) : null}

              <DetailSection title="处理记录">
                {detail.records.length ? (
                  <div className="space-y-3">
                    {detail.records.map(record => (
                      <div
                        key={record.id}
                        className="rounded-lg border border-[#E8DED0] bg-white px-3 py-3 text-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2 font-semibold">
                            <History className="h-4 w-4 shrink-0 text-[#6F8F83]" />
                            <span className="truncate">
                              {riskActionCopy[record.action]}
                            </span>
                          </div>
                          <span className="shrink-0 text-xs text-[#8A8176]">
                            {formatDate(record.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-[#8A8176]">
                          {riskStatusCopy[record.previousStatus]} →{" "}
                          {riskStatusCopy[record.nextStatus]} · {record.actorId}
                        </p>
                        <p className="mt-2 leading-6 text-[#5F6B64]">
                          {record.note}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-[#66716A]">
                    暂无处理记录。首次处理后将自动沉淀复核人、状态变化和备注。
                  </p>
                )}
              </DetailSection>

              <DetailSection title="隐私边界">
                <div className="flex items-start gap-2 rounded-lg bg-[#F8F3EA] px-3 py-2 text-sm leading-6 text-[#5F6B64]">
                  <BadgeCheck className="mt-1 h-3.5 w-3.5 shrink-0 text-[#6F8F83]" />
                  {detail.privacyNotice}
                </div>
              </DetailSection>
            </>
          ) : (
            <EmptyState
              icon={ShieldCheck}
              title="选择左侧风险事件"
              description="选中事件后可查看最小化摘要、关联对象、SOP 提醒和处理记录。"
            />
          )}
        </aside>
      </section>
    </div>
  );
}
