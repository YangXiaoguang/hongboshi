import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  CircleDollarSign,
  ListFilter,
  Loader2,
  LockKeyhole,
  ReceiptText,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import {
  httpPaymentRepository,
  type PaymentReconciliationConsole,
  type PaymentReconciliationEntry,
  type PaymentReconciliationSeverity,
} from "@/features/payments";

type FilterMode = "all" | "issues" | "processing" | "ok";

const severityCopy = {
  ok: "一致",
  warning: "关注",
  critical: "异常",
} satisfies Record<PaymentReconciliationSeverity, string>;

const receiptStatusCopy = {
  processing: "处理中",
  processed: "已处理",
  failed: "失败",
} as const;

const orderStatusCopy = {
  created: "已创建",
  pending_payment: "待支付",
  paid: "已支付",
  closed: "已关闭",
  refunding: "退款中",
  refunded: "已退款",
} as const;

const appointmentStatusCopy = {
  pending_payment: "待支付",
  scheduled: "已预约",
  completed: "已完成",
  cancelled: "已取消",
  no_show: "未到访",
  refunded: "已退款",
} as const;

function formatDate(value?: string) {
  if (!value) return "未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间待确认";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(value?: number) {
  if (typeof value !== "number") return "未记录";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2,
  }).format(value);
}

function AccessPanel({
  icon,
  title,
  description,
  action,
}: {
  icon: ElementType;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const Icon = icon;

  return (
    <div className="mx-auto flex min-h-[520px] max-w-[560px] flex-col items-center justify-center px-5 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E5ECE1] text-[#41675A]">
        <Icon className="h-5 w-5" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold text-[#243B35]">{title}</h1>
      <p className="mt-3 max-w-[420px] text-sm leading-6 text-[#6F7771]">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

function severityClass(severity: PaymentReconciliationSeverity) {
  if (severity === "critical") {
    return "bg-[#FFF0EA] text-[#AD503A] ring-[#E7B49F]";
  }
  if (severity === "warning") {
    return "bg-[#FFF7E5] text-[#8F6B1C] ring-[#E7D08F]";
  }
  return "bg-[#E7EFE8] text-[#41675A] ring-[#BCD1C4]";
}

function metricItems(consoleData?: PaymentReconciliationConsole) {
  const summary = consoleData?.summary;
  return [
    {
      label: "回调收据",
      value: summary?.receiptCount ?? 0,
      icon: ReceiptText,
    },
    {
      label: "一致",
      value: summary?.okCount ?? 0,
      icon: BadgeCheck,
    },
    {
      label: "处理中",
      value: summary?.processingCount ?? 0,
      icon: Activity,
    },
    {
      label: "异常",
      value: summary?.criticalCount ?? 0,
      icon: AlertTriangle,
    },
  ];
}

function filterEntries(
  entries: PaymentReconciliationEntry[],
  mode: FilterMode
) {
  if (mode === "issues") {
    return entries.filter(entry => entry.severity !== "ok");
  }
  if (mode === "processing") {
    return entries.filter(entry => entry.webhook.status === "processing");
  }
  if (mode === "ok") {
    return entries.filter(entry => entry.severity === "ok");
  }
  return entries;
}

function ReconciliationRow({
  entry,
  index,
}: {
  entry: PaymentReconciliationEntry;
  index: number;
}) {
  const orderStatus = entry.business?.orderStatus
    ? orderStatusCopy[entry.business.orderStatus]
    : "未找到订单";
  const appointmentStatus = entry.business?.appointmentStatus
    ? appointmentStatusCopy[
        entry.business.appointmentStatus as keyof typeof appointmentStatusCopy
      ]
    : "未关联";

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay: Math.min(index * 0.025, 0.16) }}
      className="group grid gap-4 py-4 transition hover:bg-[#FBF7EF] md:grid-cols-[minmax(0,1fr)_320px]"
    >
      <div className="min-w-0 px-4 md:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold ring-1 ${severityClass(
              entry.severity
            )}`}
          >
            {severityCopy[entry.severity]}
          </span>
          <span className="text-xs font-semibold text-[#5D6B63]">
            {receiptStatusCopy[entry.webhook.status]}
          </span>
          <span className="text-xs text-[#8A8176]">
            {formatDate(entry.webhook.receivedAt)}
          </span>
        </div>
        <h2 className="mt-3 truncate text-sm font-semibold text-[#243B35]">
          {entry.webhook.orderId}
        </h2>
        <p className="mt-1 truncate text-xs text-[#8A8176]">
          {entry.webhook.id} · {entry.webhook.type}
        </p>

        {entry.issues.length > 0 ? (
          <div className="mt-3 space-y-2">
            {entry.issues.map(issue => (
              <p
                key={`${entry.id}_${issue.code}`}
                className="rounded-lg bg-[#FFF4EF] px-3 py-2 text-sm leading-6 text-[#9B5843]"
              >
                {issue.message}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-[#527266]">
            <SearchCheck className="h-4 w-4" />
            回调、订单和咨询状态一致
          </p>
        )}
      </div>

      <div className="grid gap-3 px-4 text-sm md:px-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-[#8A8176]">回调金额</p>
            <p className="mt-1 font-semibold text-[#243B35]">
              {formatMoney(entry.webhook.amount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#8A8176]">订单金额</p>
            <p className="mt-1 font-semibold text-[#243B35]">
              {formatMoney(entry.business?.payableAmount)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-[#8A8176]">订单状态</p>
            <p className="mt-1 font-semibold text-[#243B35]">{orderStatus}</p>
          </div>
          <div>
            <p className="text-xs text-[#8A8176]">预约状态</p>
            <p className="mt-1 font-semibold text-[#243B35]">
              {appointmentStatus}
            </p>
          </div>
        </div>
        <p className="text-xs leading-5 text-[#8A8176]">
          交易号 {entry.webhook.transactionId}
        </p>
      </div>
    </motion.article>
  );
}

export default function PaymentReconciliation() {
  const { user, isLoggedIn, isAuthSyncing, openLoginModal } = useAuth();
  const [consoleData, setConsoleData] =
    useState<PaymentReconciliationConsole>();
  const [filter, setFilter] = useState<FilterMode>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const canManagePayments = Boolean(
    user?.roles.some(role => ["operator", "admin"].includes(role))
  );

  const loadConsole = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      setConsoleData(await httpPaymentRepository.loadReconciliationConsole());
    } catch (err) {
      setError(err instanceof Error ? err.message : "支付对账暂时不可用");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthSyncing || !isLoggedIn || !canManagePayments) return;
    void loadConsole();
  }, [canManagePayments, isAuthSyncing, isLoggedIn, loadConsole]);

  const entries = useMemo(
    () => filterEntries(consoleData?.entries ?? [], filter),
    [consoleData?.entries, filter]
  );

  if (!isAuthSyncing && !isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#F8F3EA]">
        <AppHeader />
        <AccessPanel
          icon={LockKeyhole}
          title="登录后进入支付对账"
          description="支付回调、订单和咨询预约状态只对运营与管理员账号开放。"
          action={
            <button
              onClick={openLoginModal}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047]"
            >
              <UserRound className="h-4 w-4" />
              登录
            </button>
          }
        />
      </div>
    );
  }

  if (!isAuthSyncing && isLoggedIn && !canManagePayments) {
    return (
      <div className="min-h-screen bg-[#F8F3EA]">
        <AppHeader />
        <AccessPanel
          icon={ShieldCheck}
          title="当前账号暂无支付对账权限"
          description="请使用运营或管理员账号进入。"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F3EA] text-[#243B35]">
      <AppHeader />
      <main className="mx-auto w-full max-w-[1280px] px-4 py-6 lg:px-8 lg:py-8">
        <section className="flex flex-col gap-4 border-b border-[#E1D7C8] pb-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B7E6D]">
              支付对账
            </p>
            <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
              回调与业务状态
            </h1>
            <p className="mt-3 max-w-[720px] text-sm leading-6 text-[#6F7771]">
              对比支付回调收据、业务订单和咨询预约状态，定位接入真实支付前的异常链路。
            </p>
          </div>
          <button
            onClick={() => void loadConsole()}
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
          {metricItems(consoleData).map(item => {
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
          <div className="flex flex-col gap-3 border-b border-[#E8DED0] px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ListFilter className="h-4 w-4 text-[#6F8F83]" />
              最近回调
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "全部"],
                ["issues", "异常"],
                ["processing", "处理中"],
                ["ok", "一致"],
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setFilter(mode as FilterMode)}
                  className={`h-8 rounded-lg px-3 text-xs font-semibold transition ${
                    filter === mode
                      ? "bg-[#355F51] text-white"
                      : "bg-[#F4EBDD] text-[#5D6B63] hover:bg-[#E6EDDF]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {isLoading && !consoleData ? (
            <div className="flex min-h-[360px] items-center justify-center text-sm text-[#6F7771]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              正在读取支付对账
            </div>
          ) : entries.length ? (
            <div className="divide-y divide-[#E8DED0]">
              {entries.map((entry, index) => (
                <ReconciliationRow key={entry.id} entry={entry} index={index} />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
              <CircleDollarSign className="h-8 w-8 text-[#7C9288]" />
              <h2 className="mt-4 text-lg font-semibold">暂无对账记录</h2>
              <p className="mt-2 max-w-[380px] text-sm leading-6 text-[#6F7771]">
                支付或退款回调进入系统后，这里会显示最近收据和业务状态。
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
