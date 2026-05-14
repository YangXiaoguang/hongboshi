import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeDollarSign,
  Calculator,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CheckCircle2,
  CreditCard,
  Download,
  FileWarning,
  Loader2,
  Percent,
  ReceiptText,
  RefreshCw,
  Save,
  Search,
  TrendingDown,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import {
  ALL_FINANCE_ADMIN_CHANNEL,
  ALL_FINANCE_ADMIN_ITEM_TYPE,
  FINANCE_ADMIN_PAGE_SIZE,
  FINANCE_ADMIN_PERMISSIONS,
  FinanceAdminQuerySchema,
  PaymentChannelSchema,
  PurchasableTypeSchema,
  userCan,
  type FinanceAdminChannelFeeRule,
  type FinanceAdminEntry,
  type FinanceAdminEntryType,
  type FinanceAdminOverview,
  type FinanceAdminQuery,
  type FinanceAdminRuleConsole,
  type PaymentChannel,
  type PurchasableType,
} from "@shared/domain";
import { useAuth } from "@/contexts/AuthContext";
import { httpFinanceAdminRepository } from "@/features/finance";

const entryTypeCopy = {
  payment: "收入",
  refund: "退款",
  pending_refund: "退款中",
  exception: "异常",
} satisfies Record<FinanceAdminEntryType, string>;

const channelCopy = {
  wechat_pay: "微信支付",
  alipay: "支付宝",
  manual: "人工模拟",
} satisfies Record<PaymentChannel, string>;

const itemTypeCopy = {
  course: "课程",
  membership: "会员",
  counseling_session: "咨询",
  assessment_report: "测评",
} satisfies Record<PurchasableType, string>;

const sortOptions: {
  value: FinanceAdminQuery["sort"];
  label: string;
}[] = [
  { value: "occurred_desc", label: "最近发生" },
  { value: "amount_desc", label: "金额最高" },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2,
  }).format(value);
}

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

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 3,
  }).format(value * 100)}%`;
}

type FinanceRuleDraft = Record<
  PaymentChannel,
  {
    ratePercent: string;
    fixedFeeAmount: string;
    minimumFeeAmount: string;
  }
>;

function numericDraftValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function draftFromRule(rule: FinanceAdminChannelFeeRule) {
  return {
    ratePercent: String(Number((rule.rate * 100).toFixed(4))),
    fixedFeeAmount: String(rule.fixedFeeAmount),
    minimumFeeAmount: String(rule.minimumFeeAmount),
  };
}

function ruleDraftsFromConsole(
  ruleConsole: FinanceAdminRuleConsole
): FinanceRuleDraft {
  return Object.fromEntries(
    PaymentChannelSchema.options.map(channel => {
      const rule = ruleConsole.rules.channelFeeRules.find(
        item => item.channel === channel
      );
      return [
        channel,
        draftFromRule(
          rule ?? {
            channel,
            rate: 0,
            fixedFeeAmount: 0,
            minimumFeeAmount: 0,
            effectiveFrom: ruleConsole.rules.updatedAt,
            description: `${channelCopy[channel]} 手续费规则`,
          }
        ),
      ];
    })
  ) as FinanceRuleDraft;
}

function entryTypeClass(type: FinanceAdminEntryType) {
  if (type === "payment") return "bg-[#E7EFE8] text-[#41675A]";
  if (type === "refund") return "bg-[#EAF0F7] text-[#4A647E]";
  if (type === "pending_refund") return "bg-[#FFF7E5] text-[#8F6B1C]";
  return "bg-[#FFF0EA] text-[#AD503A]";
}

function severityDot(entry: FinanceAdminEntry) {
  if (entry.severity === "critical") return "bg-[#AD503A]";
  if (entry.severity === "warning") return "bg-[#D39B33]";
  return "bg-[#6F8F83]";
}

function channelOptionsFromOverview(
  overview: FinanceAdminOverview | undefined
) {
  return overview?.filters.channels.length
    ? overview.filters.channels
    : PaymentChannelSchema.options;
}

function itemTypeOptionsFromOverview(
  overview: FinanceAdminOverview | undefined
) {
  return overview?.filters.itemTypes.length
    ? overview.filters.itemTypes
    : PurchasableTypeSchema.options;
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
    <div className="flex min-h-[260px] flex-col items-center justify-center px-5 py-10 text-center">
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

function FinanceEntryRow({ entry }: { entry: FinanceAdminEntry }) {
  return (
    <div className="grid gap-3 border-b border-[#E8DED0] px-4 py-4 text-sm last:border-b-0 lg:grid-cols-[minmax(260px,1.4fr)_130px_120px_130px_150px]">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${severityDot(entry)}`} />
          <span className="truncate font-semibold text-[#243B35]">
            {entry.primaryTitle}
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-[#8A8176]">{entry.orderId}</p>
        {entry.reason ? (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#6F7771]">
            {entry.reason}
          </p>
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-[#243B35]">
          {entry.user.displayName}
        </p>
        <p className="mt-1 truncate text-xs text-[#8A8176]">
          {entry.user.phoneMasked ?? entry.user.id}
        </p>
      </div>
      <div>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${entryTypeClass(
            entry.type
          )}`}
        >
          {entryTypeCopy[entry.type]}
        </span>
        <p className="mt-2 text-xs text-[#8A8176]">
          {entry.itemTypes.map(type => itemTypeCopy[type]).join(" / ")}
        </p>
      </div>
      <div>
        <p className="font-semibold text-[#243B35]">
          {formatMoney(entry.amount)}
        </p>
        <p className="mt-1 text-xs text-[#8A8176]">
          {entry.channel ? channelCopy[entry.channel] : "未匹配渠道"}
        </p>
      </div>
      <div className="min-w-0 text-[#5F6B64]">
        <p>{formatDate(entry.occurredAt)}</p>
        <p className="mt-1 truncate text-xs text-[#8A8176]">
          {entry.transactionId ?? entry.sourceStatus}
        </p>
      </div>
    </div>
  );
}

export default function FinanceManagement() {
  const { user } = useAuth();
  const canRead = Boolean(
    user && userCan(user, FINANCE_ADMIN_PERMISSIONS.read)
  );
  const canManageRules = Boolean(
    user && userCan(user, FINANCE_ADMIN_PERMISSIONS.manage)
  );
  const [query, setQuery] = useState<FinanceAdminQuery>({
    keyword: "",
    channel: ALL_FINANCE_ADMIN_CHANNEL,
    itemType: ALL_FINANCE_ADMIN_ITEM_TYPE,
    sort: "occurred_desc",
    page: 1,
    pageSize: FINANCE_ADMIN_PAGE_SIZE,
  });
  const [keywordDraft, setKeywordDraft] = useState("");
  const [overview, setOverview] = useState<FinanceAdminOverview>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string>();
  const [exportSuccess, setExportSuccess] = useState<string>();
  const [ruleConsole, setRuleConsole] = useState<FinanceAdminRuleConsole>();
  const [ruleDrafts, setRuleDrafts] = useState<FinanceRuleDraft>();
  const [ruleLoading, setRuleLoading] = useState(false);
  const [ruleSaving, setRuleSaving] = useState(false);
  const [ruleError, setRuleError] = useState<string>();
  const [ruleSuccess, setRuleSuccess] = useState<string>();

  const loadOverview = useCallback(async () => {
    if (!canRead) return undefined;

    setLoading(true);
    setError(undefined);
    try {
      const nextOverview = await httpFinanceAdminRepository.loadOverview(query);
      setOverview(nextOverview);
      return nextOverview;
    } catch (err) {
      setError(err instanceof Error ? err.message : "财务管理暂时不可用");
      setOverview(undefined);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [canRead, query]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const applyRuleConsole = useCallback(
    (nextRuleConsole: FinanceAdminRuleConsole) => {
      setRuleConsole(nextRuleConsole);
      setRuleDrafts(ruleDraftsFromConsole(nextRuleConsole));
    },
    []
  );

  const loadRules = useCallback(async () => {
    if (!canRead) return undefined;

    setRuleLoading(true);
    setRuleError(undefined);
    try {
      const nextRuleConsole = await httpFinanceAdminRepository.loadRules();
      applyRuleConsole(nextRuleConsole);
      return nextRuleConsole;
    } catch (err) {
      setRuleError(err instanceof Error ? err.message : "财务规则暂时不可用");
      setRuleConsole(undefined);
      setRuleDrafts(undefined);
      return undefined;
    } finally {
      setRuleLoading(false);
    }
  }, [applyRuleConsole, canRead]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  useEffect(() => {
    setExportError(undefined);
    setExportSuccess(undefined);
  }, [query]);

  const channelOptions = useMemo(
    () => channelOptionsFromOverview(overview),
    [overview]
  );
  const itemTypeOptions = useMemo(
    () => itemTypeOptionsFromOverview(overview),
    [overview]
  );

  function updateQuery(next: Partial<FinanceAdminQuery>) {
    setQuery(current =>
      FinanceAdminQuerySchema.parse({
        ...current,
        ...next,
        page: next.page ?? 1,
      })
    );
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateQuery({ keyword: keywordDraft.trim() });
  }

  async function exportCsv() {
    if (!canRead || exporting) return;

    setExporting(true);
    setExportError(undefined);
    setExportSuccess(undefined);
    try {
      const result = await httpFinanceAdminRepository.exportCsv(query);
      const blob = new Blob([result.content], {
        type: result.contentType,
      });
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
      setExportSuccess(`已生成 ${result.filename}`);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "财务导出暂时不可用");
    } finally {
      setExporting(false);
    }
  }

  function updateRuleDraft(
    channel: PaymentChannel,
    field: keyof FinanceRuleDraft[PaymentChannel],
    value: string
  ) {
    setRuleSuccess(undefined);
    setRuleDrafts(current => {
      if (!current) return current;
      return {
        ...current,
        [channel]: {
          ...current[channel],
          [field]: value,
        },
      };
    });
  }

  async function saveRules(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ruleConsole || !ruleDrafts || !canManageRules || ruleSaving) return;

    setRuleSaving(true);
    setRuleError(undefined);
    setRuleSuccess(undefined);
    try {
      const channelFeeRules = PaymentChannelSchema.options.map(channel => {
        const currentRule =
          ruleConsole.rules.channelFeeRules.find(
            rule => rule.channel === channel
          ) ??
          ({
            channel,
            effectiveFrom: ruleConsole.rules.updatedAt,
            description: `${channelCopy[channel]} 手续费规则`,
            rate: 0,
            fixedFeeAmount: 0,
            minimumFeeAmount: 0,
          } satisfies FinanceAdminChannelFeeRule);
        const draft = ruleDrafts[channel];
        return {
          ...currentRule,
          rate: numericDraftValue(draft.ratePercent) / 100,
          fixedFeeAmount: numericDraftValue(draft.fixedFeeAmount),
          minimumFeeAmount: numericDraftValue(draft.minimumFeeAmount),
        };
      });
      const result = await httpFinanceAdminRepository.updateRules({
        channelFeeRules,
        notes: "财务后台保存手续费规则",
      });
      const nextRuleConsole = {
        rules: result.rules,
        preview: result.preview,
        canManage: true,
        serverTime: result.preview.generatedAt,
      } satisfies FinanceAdminRuleConsole;
      applyRuleConsole(nextRuleConsole);
      setRuleSuccess("手续费规则已保存");
    } catch (err) {
      setRuleError(err instanceof Error ? err.message : "财务规则保存失败");
    } finally {
      setRuleSaving(false);
    }
  }

  if (!canRead) {
    return (
      <div className="rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-8 text-center text-[#243B35] shadow-sm shadow-[#243B35]/5">
        <BadgeDollarSign className="mx-auto h-8 w-8 text-[#6F8F83]" />
        <h1 className="mt-4 text-xl font-semibold">当前账号暂无财务权限</h1>
        <p className="mt-2 text-sm leading-6 text-[#6F7771]">
          财务数据需要财务后台读取权限。
        </p>
      </div>
    );
  }

  return (
    <div className="text-[#243B35]">
      <section className="flex flex-col gap-4 border-b border-[#E1D7C8] pb-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B7E6D]">
            财务管理
          </p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
            财务只读台
          </h1>
          <p className="mt-3 max-w-[760px] text-sm leading-6 text-[#6F7771]">
            按服务端财务口径汇总收入、退款、净收款、退款中和异常金额。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void exportCsv()}
            disabled={exporting}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-lg border border-[#DCCDBB] bg-[#FFFDF8] px-4 text-sm font-semibold text-[#53675D] transition hover:bg-[#F8F3EA] disabled:cursor-wait disabled:opacity-70"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            导出 CSV
          </button>
          <button
            onClick={() => {
              void loadOverview();
              void loadRules();
            }}
            disabled={loading || ruleLoading}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading || ruleLoading ? "animate-spin" : ""
              }`}
            />
            刷新
          </button>
        </div>
      </section>

      {(exportError || exportSuccess) && (
        <div
          className={`mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            exportError
              ? "border-[#F0C7B7] bg-[#FFF0EA] text-[#AD503A]"
              : "border-[#C9DDC8] bg-[#F2F8EF] text-[#41675A]"
          }`}
        >
          {exportError ? (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          <span>{exportError ?? exportSuccess}</span>
        </div>
      )}

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 grid border-y border-[#E1D7C8] bg-[#FFFDF8] md:grid-cols-5"
      >
        {[
          {
            label: "收入",
            value: overview?.summary.grossRevenueAmount ?? 0,
            icon: CircleDollarSign,
          },
          {
            label: "退款",
            value: overview?.summary.refundAmount ?? 0,
            icon: TrendingDown,
          },
          {
            label: "净收款",
            value: overview?.summary.netRevenueAmount ?? 0,
            icon: WalletCards,
          },
          {
            label: "退款中",
            value: overview?.summary.pendingRefundAmount ?? 0,
            icon: ReceiptText,
          },
          {
            label: "异常金额",
            value: overview?.summary.exceptionAmount ?? 0,
            icon: FileWarning,
          },
        ].map(metric => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="flex items-center justify-between border-b border-[#E8DED0] px-4 py-4 md:border-b-0 md:border-r last:md:border-r-0"
            >
              <div>
                <p className="text-xs text-[#8A8176]">{metric.label}</p>
                <p className="mt-1 text-xl font-semibold text-[#243B35]">
                  {formatMoney(metric.value)}
                </p>
              </div>
              <Icon className="h-5 w-5 text-[#6F8F83]" />
            </div>
          );
        })}
      </motion.section>

      <section className="mt-6 rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-4 shadow-sm shadow-[#243B35]/5">
        <form
          onSubmit={submitSearch}
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_repeat(5,minmax(120px,140px))]"
        >
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A8F82]" />
            <input
              value={keywordDraft}
              onChange={event => setKeywordDraft(event.target.value)}
              placeholder="搜索订单、用户、交易号"
              className="h-10 w-full rounded-lg border border-[#DCCDBB] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15"
            />
          </label>

          <select
            value={query.channel}
            onChange={event =>
              updateQuery({
                channel: event.target.value as FinanceAdminQuery["channel"],
              })
            }
            className="h-10 rounded-lg border border-[#DCCDBB] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15"
          >
            <option value={ALL_FINANCE_ADMIN_CHANNEL}>全部渠道</option>
            {channelOptions.map(channel => (
              <option key={channel} value={channel}>
                {channelCopy[channel]}
              </option>
            ))}
          </select>

          <select
            value={query.itemType}
            onChange={event =>
              updateQuery({
                itemType: event.target.value as FinanceAdminQuery["itemType"],
              })
            }
            className="h-10 rounded-lg border border-[#DCCDBB] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15"
          >
            <option value={ALL_FINANCE_ADMIN_ITEM_TYPE}>全部业务</option>
            {itemTypeOptions.map(type => (
              <option key={type} value={type}>
                {itemTypeCopy[type]}
              </option>
            ))}
          </select>

          <label className="relative block">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A8F82]" />
            <input
              type="date"
              value={query.fromDate ?? ""}
              onChange={event =>
                updateQuery({ fromDate: event.target.value || undefined })
              }
              className="h-10 w-full rounded-lg border border-[#DCCDBB] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15"
            />
          </label>

          <label className="relative block">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A8F82]" />
            <input
              type="date"
              value={query.toDate ?? ""}
              onChange={event =>
                updateQuery({ toDate: event.target.value || undefined })
              }
              className="h-10 w-full rounded-lg border border-[#DCCDBB] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15"
            />
          </label>

          <select
            value={query.sort}
            onChange={event =>
              updateQuery({
                sort: event.target.value as FinanceAdminQuery["sort"],
              })
            }
            className="h-10 rounded-lg border border-[#DCCDBB] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047]">
            <Search className="h-4 w-4" />
            搜索
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] shadow-sm shadow-[#243B35]/5">
        <div className="flex flex-col gap-3 border-b border-[#E8DED0] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E5ECE1] text-[#41675A]">
              <Calculator className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">账期与手续费</h2>
              <p className="mt-1 truncate text-xs text-[#8A8176]">
                {ruleConsole
                  ? `${ruleConsole.rules.activePeriod.label} · ${ruleConsole.rules.version}`
                  : "读取规则中"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {ruleConsole ? (
              <span className="rounded-full bg-[#F8F3EA] px-2.5 py-1 font-semibold text-[#746758]">
                更新 {formatDate(ruleConsole.rules.updatedAt)}
              </span>
            ) : null}
            {canManageRules ? (
              <span className="rounded-full bg-[#E5ECE1] px-2.5 py-1 font-semibold text-[#41675A]">
                可维护
              </span>
            ) : (
              <span className="rounded-full bg-[#F8F3EA] px-2.5 py-1 font-semibold text-[#8A8176]">
                只读
              </span>
            )}
          </div>
        </div>

        {ruleError || ruleSuccess ? (
          <div
            className={`mx-5 mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
              ruleError
                ? "border-[#F0C7B7] bg-[#FFF0EA] text-[#AD503A]"
                : "border-[#C9DDC8] bg-[#F2F8EF] text-[#41675A]"
            }`}
          >
            {ruleError ? (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            )}
            <span>{ruleError ?? ruleSuccess}</span>
          </div>
        ) : null}

        {ruleLoading ? (
          <div className="flex min-h-[220px] items-center justify-center text-sm text-[#6F7771]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            正在读取财务规则
          </div>
        ) : ruleConsole && ruleDrafts ? (
          <form
            onSubmit={saveRules}
            className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]"
          >
            <div className="min-w-0 px-5 py-5">
              <div className="hidden grid-cols-[120px_repeat(3,minmax(120px,1fr))_140px] gap-3 border-b border-[#E8DED0] pb-3 text-xs font-semibold text-[#8A8176] lg:grid">
                <span>渠道</span>
                <span>费率</span>
                <span>固定费</span>
                <span>最低费</span>
                <span>生效时间</span>
              </div>
              <div className="divide-y divide-[#E8DED0]">
                {PaymentChannelSchema.options.map(channel => {
                  const rule = ruleConsole.rules.channelFeeRules.find(
                    item => item.channel === channel
                  );
                  const draft = ruleDrafts[channel];
                  return (
                    <div
                      key={channel}
                      className="grid gap-3 py-4 text-sm lg:grid-cols-[120px_repeat(3,minmax(120px,1fr))_140px] lg:items-center"
                    >
                      <div>
                        <p className="font-semibold text-[#243B35]">
                          {channelCopy[channel]}
                        </p>
                        <p className="mt-1 text-xs text-[#8A8176]">
                          {rule?.description ?? "手续费规则"}
                        </p>
                      </div>
                      {canManageRules ? (
                        <>
                          <label className="relative block">
                            <Percent className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A8F82]" />
                            <input
                              type="number"
                              min="0"
                              max="20"
                              step="0.001"
                              value={draft.ratePercent}
                              onChange={event =>
                                updateRuleDraft(
                                  channel,
                                  "ratePercent",
                                  event.target.value
                                )
                              }
                              aria-label={`${channelCopy[channel]}费率`}
                              className="h-10 w-full rounded-lg border border-[#DCCDBB] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15"
                            />
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={draft.fixedFeeAmount}
                            onChange={event =>
                              updateRuleDraft(
                                channel,
                                "fixedFeeAmount",
                                event.target.value
                              )
                            }
                            aria-label={`${channelCopy[channel]}固定费`}
                            className="h-10 rounded-lg border border-[#DCCDBB] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={draft.minimumFeeAmount}
                            onChange={event =>
                              updateRuleDraft(
                                channel,
                                "minimumFeeAmount",
                                event.target.value
                              )
                            }
                            aria-label={`${channelCopy[channel]}最低费`}
                            className="h-10 rounded-lg border border-[#DCCDBB] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15"
                          />
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-[#243B35]">
                            {formatPercent(rule?.rate ?? 0)}
                          </p>
                          <p className="font-semibold text-[#243B35]">
                            {formatMoney(rule?.fixedFeeAmount ?? 0)}
                          </p>
                          <p className="font-semibold text-[#243B35]">
                            {formatMoney(rule?.minimumFeeAmount ?? 0)}
                          </p>
                        </>
                      )}
                      <p className="text-xs text-[#8A8176]">
                        {formatDate(rule?.effectiveFrom)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {canManageRules ? (
                <div className="flex justify-end border-t border-[#E8DED0] pt-4">
                  <button
                    disabled={ruleSaving}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-wait disabled:opacity-70"
                  >
                    {ruleSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    保存规则
                  </button>
                </div>
              ) : null}
            </div>

            <div className="border-t border-[#E8DED0] bg-[#F8F3EA] px-5 py-5 xl:border-l xl:border-t-0">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["预计结算", ruleConsole.preview.estimatedSettlementAmount],
                  ["预计手续费", ruleConsole.preview.estimatedFeeAmount],
                  ["退款中", ruleConsole.preview.pendingRefundAmount],
                  ["异常未结算", ruleConsole.preview.exceptionUnsettledAmount],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg bg-[#FFFDF8] px-3 py-3"
                  >
                    <p className="text-xs text-[#8A8176]">{label}</p>
                    <p className="mt-1 text-base font-semibold text-[#243B35]">
                      {formatMoney(Number(value))}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-3">
                {ruleConsole.preview.channelPreviews.map(preview => (
                  <div
                    key={preview.channel}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-[#243B35]">
                        {preview.label}
                      </p>
                      <p className="mt-1 text-xs text-[#8A8176]">
                        {formatPercent(preview.rate)} · 手续费{" "}
                        {formatMoney(preview.estimatedFeeAmount)}
                      </p>
                    </div>
                    <span className="font-semibold text-[#243B35]">
                      {formatMoney(preview.estimatedSettlementAmount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </form>
        ) : null}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 overflow-hidden rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] shadow-sm shadow-[#243B35]/5">
          <div className="hidden grid-cols-[minmax(260px,1.4fr)_130px_120px_130px_150px] border-b border-[#E8DED0] bg-[#F8F3EA] px-4 py-3 text-xs font-semibold text-[#8A8176] lg:grid">
            <span>财务事项</span>
            <span>用户</span>
            <span>类型</span>
            <span>金额/渠道</span>
            <span>发生时间</span>
          </div>

          {loading ? (
            <div className="flex min-h-[340px] items-center justify-center text-sm text-[#6F7771]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              正在读取财务数据
            </div>
          ) : error ? (
            <EmptyState
              icon={AlertTriangle}
              title="财务管理暂时不可用"
              description={error}
            />
          ) : overview && overview.items.length > 0 ? (
            <div>
              {overview.items.map(entry => (
                <FinanceEntryRow key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CreditCard}
              title="没有匹配的财务明细"
              description="当前筛选条件下暂无收入、退款、退款中或异常事项。"
            />
          )}

          {overview && overview.meta.totalPages > 0 && (
            <div className="flex flex-col gap-3 border-t border-[#E8DED0] px-4 py-3 text-sm text-[#6F7771] md:flex-row md:items-center md:justify-between">
              <span>
                第 {overview.meta.page} / {overview.meta.totalPages} 页，共{" "}
                {overview.meta.total} 条
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    updateQuery({ page: Math.max(1, query.page - 1) })
                  }
                  disabled={query.page <= 1}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#DCCDBB] px-3 font-semibold text-[#53675D] transition hover:bg-[#F8F3EA] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一页
                </button>
                <button
                  onClick={() =>
                    updateQuery({
                      page: Math.min(overview.meta.totalPages, query.page + 1),
                    })
                  }
                  disabled={query.page >= overview.meta.totalPages}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#DCCDBB] px-3 font-semibold text-[#53675D] transition hover:bg-[#F8F3EA] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  下一页
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-sm shadow-[#243B35]/5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">明细结构</h2>
              <span className="rounded-full bg-[#E5ECE1] px-2.5 py-1 text-xs font-semibold text-[#41675A]">
                {metricValue(overview?.summary.entryCount ?? 0)} 条
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {[
                ["收入", overview?.summary.paymentCount ?? 0],
                ["退款", overview?.summary.refundCount ?? 0],
                ["退款中", overview?.summary.pendingRefundCount ?? 0],
                ["异常", overview?.summary.exceptionCount ?? 0],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-[#F8F3EA] px-3 py-3">
                  <p className="text-xs text-[#8A8176]">{label}</p>
                  <p className="mt-1 text-lg font-semibold text-[#243B35]">
                    {metricValue(Number(value))}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-sm shadow-[#243B35]/5">
            <h2 className="text-sm font-semibold">渠道净额</h2>
            <div className="mt-4 space-y-3">
              {overview?.channelBreakdown.length ? (
                overview.channelBreakdown.map(item => (
                  <div
                    key={item.channel}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-[#5F6B64]">{item.label}</span>
                    <span className="font-semibold text-[#243B35]">
                      {formatMoney(item.amount)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#8A8176]">暂无渠道净额。</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-sm shadow-[#243B35]/5">
            <h2 className="text-sm font-semibold">导出口径</h2>
            <p className="mt-3 text-xs leading-5 text-[#8A8176]">
              CSV
              含生成时间、筛选条件、汇总金额、口径版本；账期、手续费、结算批次和发票状态为预留字段。
            </p>
          </div>

          <div className="rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-sm shadow-[#243B35]/5">
            <h2 className="text-sm font-semibold">财务口径</h2>
            <div className="mt-4 space-y-3">
              {overview?.policies.map(policy => (
                <div
                  key={policy.key}
                  className="border-t border-[#E8DED0] pt-3 first:border-t-0 first:pt-0"
                >
                  <p className="text-sm font-semibold text-[#243B35]">
                    {policy.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                    {policy.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
