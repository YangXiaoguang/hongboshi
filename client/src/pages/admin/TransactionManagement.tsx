import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  FileWarning,
  Flag,
  History,
  Loader2,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import {
  ALL_TRANSACTION_ADMIN_CHANNEL,
  ALL_TRANSACTION_ADMIN_ITEM_TYPE,
  ALL_TRANSACTION_ADMIN_STATUS,
  ALL_TRANSACTION_ADMIN_TYPE,
  PaymentChannelSchema,
  PaymentWebhookReceiptStatusSchema,
  PurchasableTypeSchema,
  TRANSACTION_ADMIN_PAGE_SIZE,
  TRANSACTION_ADMIN_PERMISSIONS,
  userCan,
  type OrderStatus,
  type PaymentChannel,
  type PaymentWebhookReceiptStatus,
  type PurchasableType,
  type TransactionAdminAction,
  type TransactionAdminActionRequest,
  type TransactionAdminAuditEvent,
  type TransactionAdminDetail,
  type TransactionAdminFlowType,
  type TransactionAdminListItem,
  type TransactionAdminListQuery,
  type TransactionAdminSeverity,
  type TransactionAdminWorkOrder,
  type TransactionRefundProvider,
  type TransactionRefundProviderStatus,
} from "@shared/domain";
import { useAuth } from "@/contexts/AuthContext";
import { httpTransactionAdminRepository } from "@/features/transactions";

const flowTypeCopy = {
  payment: "支付",
  refund: "退款",
} satisfies Record<TransactionAdminFlowType, string>;

const channelCopy = {
  wechat_pay: "微信支付",
  alipay: "支付宝",
  manual: "人工模拟",
} satisfies Record<PaymentChannel, string>;

const receiptStatusCopy = {
  processing: "处理中",
  processed: "已处理",
  failed: "失败",
} satisfies Record<PaymentWebhookReceiptStatus, string>;

const severityCopy = {
  ok: "一致",
  warning: "关注",
  critical: "异常",
} satisfies Record<TransactionAdminSeverity, string>;

const exceptionSeverityCopy = {
  warning: "关注",
  critical: "严重",
} satisfies Record<TransactionAdminWorkOrder["severity"], string>;

const workOrderStatusCopy = {
  open: "处理中",
  resolved: "已处理",
} satisfies Record<TransactionAdminWorkOrder["status"], string>;

const transactionActionCopy = {
  request_refund: "申请退款",
  mark_exception: "标记异常",
  resolve_exception: "解决异常",
} satisfies Record<TransactionAdminAction, string>;

const orderStatusCopy = {
  created: "已创建",
  pending_payment: "待支付",
  paid: "已支付",
  closed: "已关闭",
  refunding: "退款中",
  refunded: "已退款",
} satisfies Record<OrderStatus, string>;

const refundProviderCopy = {
  manual: "人工退款通道",
  simulated: "模拟退款通道",
} satisfies Record<TransactionRefundProvider, string>;

const refundProviderStatusCopy = {
  accepted: "已受理",
  rejected: "已拒绝",
  failed: "受理失败",
} satisfies Record<TransactionRefundProviderStatus, string>;

const itemTypeCopy = {
  course: "课程",
  membership: "会员",
  counseling_session: "咨询",
  assessment_report: "测评",
} satisfies Record<PurchasableType, string>;

const sortOptions: {
  value: TransactionAdminListQuery["sort"];
  label: string;
}[] = [
  { value: "occurred_desc", label: "最近发生" },
  { value: "received_desc", label: "最近接收" },
  { value: "amount_desc", label: "金额最高" },
];

type TransactionAdminListQueryResult = Awaited<
  ReturnType<typeof httpTransactionAdminRepository.loadTransactions>
>;

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

function formatMoney(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2,
  }).format(value);
}

function metricValue(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function severityClass(severity: TransactionAdminSeverity) {
  if (severity === "critical") return "bg-[#FBEAE7] text-[#9B3B2F]";
  if (severity === "warning") return "bg-[#FFF7E5] text-[#8F6B1C]";
  return "bg-[#E7EFE8] text-[#41675A]";
}

function statusClass(status: PaymentWebhookReceiptStatus) {
  if (status === "processed") return "bg-[#E7EFE8] text-[#41675A]";
  if (status === "failed") return "bg-[#FBEAE7] text-[#9B3B2F]";
  return "bg-[#FFF7E5] text-[#8F6B1C]";
}

function flowClass(type: TransactionAdminFlowType) {
  return type === "refund"
    ? "bg-[#EAF0F7] text-[#4A647E]"
    : "bg-[#E5ECE1] text-[#41675A]";
}

function refundProviderStatusClass(status: TransactionRefundProviderStatus) {
  if (status === "accepted") return "bg-[#E7EFE8] text-[#41675A]";
  if (status === "rejected") return "bg-[#FFF7E5] text-[#8F6B1C]";
  return "bg-[#FFF0EA] text-[#AD503A]";
}

function itemTypeOptionsFromResult(
  result: TransactionAdminListQueryResult | undefined
) {
  return result?.filters.itemTypes.length
    ? result.filters.itemTypes
    : PurchasableTypeSchema.options;
}

function channelOptionsFromResult(
  result: TransactionAdminListQueryResult | undefined
) {
  return result?.filters.channels.length
    ? result.filters.channels
    : PaymentChannelSchema.options;
}

function statusOptionsFromResult(
  result: TransactionAdminListQueryResult | undefined
) {
  return result?.filters.statuses.length
    ? result.filters.statuses
    : PaymentWebhookReceiptStatusSchema.options;
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
      <p className="mt-2 max-w-[360px] text-sm leading-6 text-[#7B817C]">
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

function TransactionRow({
  transaction,
  selected,
  onSelect,
}: {
  transaction: TransactionAdminListItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const FlowIcon = transaction.type === "refund" ? ArrowDownLeft : ArrowUpRight;

  return (
    <button
      onClick={onSelect}
      className={`grid w-full gap-3 border-b border-[#E8DED0] px-4 py-4 text-left transition lg:grid-cols-[minmax(260px,1.35fr)_140px_120px_130px_150px] ${
        selected ? "bg-[#EEF5EA]" : "hover:bg-[#FBF7EF]"
      }`}
    >
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${flowClass(
              transaction.type
            )}`}
          >
            <FlowIcon className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-[#243B35]">
              {transaction.primaryTitle}
            </span>
            <span className="mt-0.5 block truncate text-xs text-[#8A8176]">
              {transaction.id}
            </span>
            {transaction.issues.length > 0 ? (
              <span
                className={`mt-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${severityClass(
                  transaction.severity
                )}`}
              >
                <Flag className="h-3 w-3" />
                {severityCopy[transaction.severity]} ·{" "}
                {transaction.issues.length} 项
              </span>
            ) : null}
            {transaction.workOrder?.status === "open" ? (
              <span className="ml-1 mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-[#FFF7E5] px-2 py-0.5 text-[11px] font-semibold text-[#8F6B1C]">
                <ClipboardCheck className="h-3 w-3" />
                工单处理中
              </span>
            ) : null}
          </span>
        </span>
      </span>
      <span className="min-w-0 text-sm text-[#5F6B64]">
        <span className="block truncate font-semibold text-[#243B35]">
          {transaction.user?.displayName ?? "未匹配用户"}
        </span>
        <span className="mt-0.5 block truncate text-xs text-[#8A8176]">
          {transaction.user?.phoneMasked ?? transaction.orderId}
        </span>
      </span>
      <span className="flex flex-wrap gap-2 lg:block">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${flowClass(
            transaction.type
          )}`}
        >
          {flowTypeCopy[transaction.type]}
        </span>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold lg:mt-1 ${statusClass(
            transaction.status
          )}`}
        >
          {receiptStatusCopy[transaction.status]}
        </span>
      </span>
      <span>
        <span className="block text-sm font-semibold text-[#243B35]">
          {formatMoney(transaction.amount)}
        </span>
        <span className="mt-0.5 block text-xs text-[#8A8176]">
          {channelCopy[transaction.channel]}
        </span>
      </span>
      <span className="text-sm text-[#5F6B64]">
        <span className="block">{formatDate(transaction.occurredAt)}</span>
        <span className="mt-0.5 block truncate text-xs text-[#8A8176]">
          {transaction.transactionId}
        </span>
      </span>
    </button>
  );
}

function activeWorkOrder(transaction: TransactionAdminListItem) {
  return transaction.workOrder?.status === "open"
    ? transaction.workOrder
    : undefined;
}

function actionIcon(action: TransactionAdminAction) {
  if (action === "request_refund") return Send;
  if (action === "resolve_exception") return CheckCircle2;
  return ShieldAlert;
}

function availableTransactionActions(detail: TransactionAdminDetail) {
  const transaction = detail.transaction;
  const openWorkOrder = activeWorkOrder(transaction);
  const actions: Array<{
    value: TransactionAdminAction;
    label: string;
    icon: LucideIcon;
  }> = [];

  const canRequestRefund =
    transaction.type === "payment" &&
    transaction.status === "processed" &&
    detail.relatedOrder?.status === "paid" &&
    transaction.severity === "ok" &&
    !openWorkOrder;

  if (canRequestRefund) {
    actions.push({
      value: "request_refund",
      label: transactionActionCopy.request_refund,
      icon: actionIcon("request_refund"),
    });
  }

  if (openWorkOrder) {
    actions.push({
      value: "resolve_exception",
      label: transactionActionCopy.resolve_exception,
      icon: actionIcon("resolve_exception"),
    });
  } else {
    actions.push({
      value: "mark_exception",
      label: transactionActionCopy.mark_exception,
      icon: actionIcon("mark_exception"),
    });
  }

  return actions;
}

function TransactionActionPanel({
  detail,
  canOperate,
  submitting,
  error,
  onSubmitAction,
}: {
  detail: TransactionAdminDetail;
  canOperate: boolean;
  submitting: boolean;
  error?: string;
  onSubmitAction: (request: TransactionAdminActionRequest) => Promise<boolean>;
}) {
  const actions = useMemo(() => availableTransactionActions(detail), [detail]);
  const [action, setAction] = useState<TransactionAdminAction>(
    actions[0]?.value ?? "mark_exception"
  );
  const [severity, setSeverity] =
    useState<TransactionAdminWorkOrder["severity"]>("warning");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!actions.some(item => item.value === action)) {
      setAction(actions[0]?.value ?? "mark_exception");
    }
  }, [action, actions]);

  const selected = actions.find(item => item.value === action) ?? actions[0];
  const SelectedIcon = selected ? selected.icon : ClipboardCheck;
  const reasonReady = reason.trim().length >= 4;
  const disabled = !canOperate || !selected || submitting || !reasonReady;

  async function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || disabled) return;

    const request: TransactionAdminActionRequest =
      action === "mark_exception"
        ? {
            action,
            severity,
            reason: reason.trim(),
          }
        : {
            action,
            reason: reason.trim(),
          };

    const ok = await onSubmitAction(request);
    if (ok) setReason("");
  }

  return (
    <form onSubmit={submitAction} className="space-y-3">
      <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2">
        <select
          value={action}
          onChange={event =>
            setAction(event.target.value as TransactionAdminAction)
          }
          disabled={!canOperate || submitting}
          className="h-10 rounded-lg border border-[#DCCDBB] bg-white px-3 text-sm font-semibold text-[#243B35] outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {actions.map(item => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {action === "mark_exception" ? (
          <select
            value={severity}
            onChange={event =>
              setSeverity(
                event.target.value as TransactionAdminWorkOrder["severity"]
              )
            }
            disabled={!canOperate || submitting}
            className="h-10 rounded-lg border border-[#DCCDBB] bg-white px-3 text-sm font-semibold text-[#243B35] outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15 disabled:cursor-not-allowed disabled:opacity-55"
          >
            <option value="warning">{exceptionSeverityCopy.warning}</option>
            <option value="critical">{exceptionSeverityCopy.critical}</option>
          </select>
        ) : (
          <span className="inline-flex h-10 items-center justify-center rounded-lg bg-[#EEF2F7] px-3 text-xs font-semibold text-[#536783]">
            {selected?.label ?? "操作"}
          </span>
        )}
      </div>

      <textarea
        value={reason}
        onChange={event => setReason(event.target.value)}
        rows={3}
        disabled={!canOperate || submitting}
        placeholder="处理原因"
        className="w-full resize-none rounded-lg border border-[#DCCDBB] bg-white px-3 py-2 text-sm leading-6 text-[#243B35] outline-none transition placeholder:text-[#A99B8C] focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15 disabled:cursor-not-allowed disabled:opacity-55"
      />

      {error ? (
        <p className="rounded-lg bg-[#FFF0EA] px-3 py-2 text-sm leading-6 text-[#AD503A]">
          {error}
        </p>
      ) : null}

      {!canOperate ? (
        <p className="rounded-lg bg-[#F8F3EA] px-3 py-2 text-sm leading-6 text-[#8A8176]">
          当前账号暂无交易后台操作权限。
        </p>
      ) : null}

      <button
        disabled={disabled}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-55"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <SelectedIcon className="h-4 w-4" />
        )}
        {selected?.label ?? "提交"}
      </button>
    </form>
  );
}

function TransactionWorkOrderCard({
  workOrder,
}: {
  workOrder?: TransactionAdminWorkOrder;
}) {
  if (!workOrder) {
    return (
      <p className="inline-flex items-center gap-2 text-sm text-[#527266]">
        <BadgeCheck className="h-4 w-4" />
        暂无交易异常工单
      </p>
    );
  }

  return (
    <div className="rounded-lg bg-[#F8F3EA] px-3 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-[#243B35]">
          {workOrderStatusCopy[workOrder.status]}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            workOrder.severity === "critical"
              ? "bg-[#FBEAE7] text-[#9B3B2F]"
              : "bg-[#FFF7E5] text-[#8F6B1C]"
          }`}
        >
          {exceptionSeverityCopy[workOrder.severity]}
        </span>
      </div>
      <p className="mt-2 leading-6 text-[#5F6B64]">{workOrder.reason}</p>
      <p className="mt-2 text-xs text-[#8A8176]">
        {formatDate(workOrder.markedAt)}
        {workOrder.resolvedAt ? ` · ${formatDate(workOrder.resolvedAt)}` : ""}
      </p>
      {workOrder.resolution ? (
        <p className="mt-2 rounded-lg bg-white px-3 py-2 leading-6 text-[#527266]">
          {workOrder.resolution}
        </p>
      ) : null}
    </div>
  );
}

function TransactionAuditList({
  events,
}: {
  events: TransactionAdminAuditEvent[];
}) {
  if (!events.length) {
    return (
      <p className="inline-flex items-center gap-2 text-sm text-[#8A8176]">
        <History className="h-4 w-4" />
        暂无交易操作记录
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {events.map(event => (
        <div
          key={event.id}
          className="rounded-lg border border-[#E8DED0] bg-white px-3 py-3 text-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-[#243B35]">
              {transactionActionCopy[event.action]}
            </span>
            <span className="text-xs text-[#8A8176]">
              {formatDate(event.createdAt)}
            </span>
          </div>
          <p className="mt-2 leading-6 text-[#5F6B64]">{event.reason}</p>
          {event.refundProviderResult ? (
            <div
              className={`mt-2 rounded-lg px-3 py-2 text-xs leading-5 ${refundProviderStatusClass(
                event.refundProviderResult.status
              )}`}
            >
              <p className="font-semibold">
                {refundProviderCopy[event.refundProviderResult.provider]} ·{" "}
                {refundProviderStatusCopy[event.refundProviderResult.status]}
              </p>
              <p className="mt-1">{event.refundProviderResult.message}</p>
              <p className="mt-1 opacity-80">
                {formatDate(event.refundProviderResult.handledAt)}
                {event.refundProviderResult.requestId
                  ? ` · ${event.refundProviderResult.requestId}`
                  : ""}
              </p>
            </div>
          ) : null}
          <p className="mt-2 text-xs text-[#8A8176]">
            {event.before.orderStatus
              ? orderStatusCopy[event.before.orderStatus]
              : "未匹配订单"}
            {" -> "}
            {event.after.orderStatus
              ? orderStatusCopy[event.after.orderStatus]
              : "未匹配订单"}
          </p>
        </div>
      ))}
    </div>
  );
}

function TransactionDetailPanel({
  detail,
  loading,
  error,
  canOperate,
  actionSubmitting,
  actionError,
  onSubmitAction,
}: {
  detail?: TransactionAdminDetail;
  loading: boolean;
  error?: string;
  canOperate: boolean;
  actionSubmitting: boolean;
  actionError?: string;
  onSubmitAction: (request: TransactionAdminActionRequest) => Promise<boolean>;
}) {
  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-sm text-[#6F7771]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        正在读取交易详情
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="交易详情暂时不可用"
        description={error}
      />
    );
  }

  if (!detail) {
    return (
      <EmptyState
        icon={CreditCard}
        title="选择一条流水"
        description="左侧选择支付或退款流水后，这里会显示订单、业务对象和处理时间线。"
      />
    );
  }

  const transaction = detail.transaction;

  return (
    <div>
      <div className="px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#8A8176]">
              {flowTypeCopy[transaction.type]}流水
            </p>
            <h2 className="mt-1 truncate text-xl font-semibold text-[#243B35]">
              {transaction.primaryTitle}
            </h2>
            <p className="mt-1 truncate text-xs text-[#8A8176]">
              {transaction.id}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${severityClass(
              transaction.severity
            )}`}
          >
            {severityCopy[transaction.severity]}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-[#8A8176]">金额</p>
            <p className="mt-1 font-semibold text-[#243B35]">
              {formatMoney(transaction.amount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#8A8176]">渠道</p>
            <p className="mt-1 font-semibold text-[#243B35]">
              {channelCopy[transaction.channel]}
            </p>
          </div>
        </div>
      </div>

      <DetailSection title="流水信息">
        <dl className="grid gap-3 text-sm">
          {[
            ["订单号", transaction.orderId],
            ["交易号", transaction.transactionId],
            ["事件类型", transaction.eventType],
            ["接收时间", formatDate(transaction.receivedAt)],
            ["处理时间", formatDate(transaction.processedAt)],
            ["响应状态", transaction.responseStatus?.toString() ?? "未返回"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="shrink-0 text-[#8A8176]">{label}</dt>
              <dd className="min-w-0 truncate font-medium text-[#243B35]">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </DetailSection>

      <DetailSection title="关联订单">
        {detail.relatedOrder ? (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-[#243B35]">
                {detail.relatedOrder.primaryTitle}
              </span>
              <span className="rounded-full bg-[#EEF2F7] px-2 py-0.5 text-xs font-semibold text-[#536783]">
                {orderStatusCopy[detail.relatedOrder.status]}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-[#8A8176]">用户</p>
                <p className="mt-1 font-semibold text-[#243B35]">
                  {detail.relatedOrder.user.displayName}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#8A8176]">订单金额</p>
                <p className="mt-1 font-semibold text-[#243B35]">
                  {formatMoney(detail.relatedOrder.payableAmount)}
                </p>
              </div>
            </div>
            {detail.relatedOrder.exception ? (
              <p className="rounded-lg bg-[#FFF7E5] px-3 py-2 text-sm leading-6 text-[#8F6B1C]">
                {detail.relatedOrder.exception.reason}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm leading-6 text-[#8A8176]">
            暂未匹配到业务订单。
          </p>
        )}
      </DetailSection>

      <DetailSection title="业务对象">
        {detail.businessObjects.length ? (
          <div className="space-y-2">
            {detail.businessObjects.map(object => (
              <div
                key={`${object.type}_${object.targetId}`}
                className="rounded-lg bg-[#F8F3EA] px-3 py-3 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-[#243B35]">
                    {object.title}
                  </span>
                  <span className="text-xs text-[#8A8176]">
                    {itemTypeCopy[object.type]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#8A8176]">
                  {object.status ?? "状态未记录"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-6 text-[#8A8176]">暂无关联业务对象。</p>
        )}
      </DetailSection>

      <DetailSection title="异常提示">
        {transaction.issues.length ? (
          <div className="space-y-2">
            {transaction.issues.map(issue => (
              <p
                key={`${transaction.id}_${issue.code}`}
                className={`rounded-lg px-3 py-2 text-sm leading-6 ${
                  issue.severity === "critical"
                    ? "bg-[#FFF0EA] text-[#AD503A]"
                    : "bg-[#FFF7E5] text-[#8F6B1C]"
                }`}
              >
                {issue.message}
              </p>
            ))}
          </div>
        ) : (
          <p className="inline-flex items-center gap-2 text-sm text-[#527266]">
            <BadgeCheck className="h-4 w-4" />
            回调、订单与业务对象状态一致
          </p>
        )}
      </DetailSection>

      <DetailSection title="交易操作">
        <TransactionActionPanel
          detail={detail}
          canOperate={canOperate}
          submitting={actionSubmitting}
          error={actionError}
          onSubmitAction={onSubmitAction}
        />
      </DetailSection>

      <DetailSection title="异常工单">
        <TransactionWorkOrderCard workOrder={transaction.workOrder} />
      </DetailSection>

      <DetailSection title="操作审计">
        <TransactionAuditList events={detail.auditEvents} />
      </DetailSection>

      <DetailSection title="处理时间线">
        <div className="space-y-3">
          {detail.timeline.map(event => (
            <div
              key={`${event.type}_${event.occurredAt}`}
              className="flex gap-3"
            >
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#6F8F83]" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#243B35]">
                  {event.label}
                </p>
                <p className="mt-1 text-xs text-[#8A8176]">
                  {formatDate(event.occurredAt)}
                  {event.detail ? ` · ${event.detail}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-[#8A8176]">
          {detail.privacyNotice}
        </p>
      </DetailSection>
    </div>
  );
}

export default function TransactionManagement() {
  const { user } = useAuth();
  const canRead = Boolean(
    user && userCan(user, TRANSACTION_ADMIN_PERMISSIONS.read)
  );
  const canOperate = Boolean(
    user && userCan(user, TRANSACTION_ADMIN_PERMISSIONS.operate)
  );
  const [query, setQuery] = useState<TransactionAdminListQuery>({
    keyword: "",
    type: ALL_TRANSACTION_ADMIN_TYPE,
    channel: ALL_TRANSACTION_ADMIN_CHANNEL,
    status: ALL_TRANSACTION_ADMIN_STATUS,
    itemType: ALL_TRANSACTION_ADMIN_ITEM_TYPE,
    sort: "occurred_desc",
    page: 1,
    pageSize: TRANSACTION_ADMIN_PAGE_SIZE,
  });
  const [keywordDraft, setKeywordDraft] = useState("");
  const [result, setResult] = useState<TransactionAdminListQueryResult>();
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>();
  const [detail, setDetail] = useState<TransactionAdminDetail>();
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [detailError, setDetailError] = useState<string>();
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string>();

  const loadTransactions = useCallback(async () => {
    if (!canRead) return undefined;

    setLoading(true);
    setError(undefined);
    try {
      const nextResult =
        await httpTransactionAdminRepository.loadTransactions(query);
      setResult(nextResult);
      setSelectedTransactionId(current => {
        if (current && nextResult.items.some(item => item.id === current)) {
          return current;
        }
        return nextResult.items[0]?.id;
      });
      return nextResult;
    } catch (err) {
      setError(err instanceof Error ? err.message : "交易流水暂时不可用");
      setResult(undefined);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [canRead, query]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    if (!canRead || !selectedTransactionId) {
      setDetail(undefined);
      return;
    }

    setDetailLoading(true);
    setDetailError(undefined);
    httpTransactionAdminRepository
      .loadTransactionDetail(selectedTransactionId)
      .then(setDetail)
      .catch(err => {
        setDetail(undefined);
        setDetailError(
          err instanceof Error ? err.message : "交易详情暂时不可用"
        );
      })
      .finally(() => setDetailLoading(false));
  }, [canRead, selectedTransactionId]);

  const itemTypeOptions = useMemo(
    () => itemTypeOptionsFromResult(result),
    [result]
  );
  const channelOptions = useMemo(
    () => channelOptionsFromResult(result),
    [result]
  );
  const statusOptions = useMemo(
    () => statusOptionsFromResult(result),
    [result]
  );

  function updateQuery(next: Partial<TransactionAdminListQuery>) {
    setQuery(current => ({
      ...current,
      ...next,
      page: next.page ?? 1,
    }));
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateQuery({ keyword: keywordDraft.trim() });
  }

  const submitTransactionAction = useCallback(
    async (request: TransactionAdminActionRequest) => {
      if (!selectedTransactionId) return false;

      setActionSubmitting(true);
      setActionError(undefined);
      try {
        const result = await httpTransactionAdminRepository.updateTransaction(
          selectedTransactionId,
          request
        );
        setDetail(result.detail);
        await loadTransactions();
        return true;
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "交易操作暂时不可用"
        );
        return false;
      } finally {
        setActionSubmitting(false);
      }
    },
    [loadTransactions, selectedTransactionId]
  );

  if (!canRead) {
    return (
      <div className="rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-8 text-center text-[#243B35] shadow-sm shadow-[#243B35]/5">
        <ShieldCheck className="mx-auto h-8 w-8 text-[#6F8F83]" />
        <h1 className="mt-4 text-xl font-semibold">当前账号暂无交易后台权限</h1>
        <p className="mt-2 text-sm leading-6 text-[#6F7771]">
          支付、退款和渠道回调流水需要交易后台读取权限。
        </p>
      </div>
    );
  }

  return (
    <div className="text-[#243B35]">
      <section className="flex flex-col gap-4 border-b border-[#E1D7C8] pb-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B7E6D]">
            交易退款
          </p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
            交易流水台
          </h1>
          <p className="mt-3 max-w-[760px] text-sm leading-6 text-[#6F7771]">
            聚合支付、退款、渠道回调和订单履约关系，支持财务、客服和运营排查异常链路。
          </p>
        </div>
        <button
          onClick={() => void loadTransactions()}
          disabled={loading}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-wait disabled:opacity-70"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </button>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 grid border-y border-[#E1D7C8] bg-[#FFFDF8] md:grid-cols-4"
      >
        {[
          {
            label: "流水数",
            value: result?.summary.totalCount ?? 0,
            icon: CreditCard,
          },
          {
            label: "净收款",
            value: result?.summary.netAmount ?? 0,
            icon: CircleDollarSign,
            money: true,
          },
          {
            label: "退款金额",
            value: result?.summary.refundAmount ?? 0,
            icon: WalletCards,
            money: true,
          },
          {
            label: "异常/关注",
            value:
              (result?.summary.criticalCount ?? 0) +
              (result?.summary.warningCount ?? 0),
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
                <p className="mt-1 text-2xl font-semibold text-[#243B35]">
                  {metric.money
                    ? formatMoney(metric.value)
                    : metricValue(metric.value)}
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
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_repeat(4,minmax(120px,140px))]"
        >
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A8F82]" />
            <input
              value={keywordDraft}
              onChange={event => setKeywordDraft(event.target.value)}
              placeholder="搜索流水号、订单、用户、交易号"
              className="h-10 w-full rounded-lg border border-[#DCCDBB] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15"
            />
          </label>

          <select
            value={query.type}
            onChange={event =>
              updateQuery({
                type: event.target.value as TransactionAdminListQuery["type"],
              })
            }
            className="h-10 rounded-lg border border-[#DCCDBB] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15"
          >
            <option value={ALL_TRANSACTION_ADMIN_TYPE}>全部流水</option>
            <option value="payment">支付</option>
            <option value="refund">退款</option>
          </select>

          <select
            value={query.status}
            onChange={event =>
              updateQuery({
                status: event.target
                  .value as TransactionAdminListQuery["status"],
              })
            }
            className="h-10 rounded-lg border border-[#DCCDBB] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15"
          >
            <option value={ALL_TRANSACTION_ADMIN_STATUS}>全部状态</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>
                {receiptStatusCopy[status]}
              </option>
            ))}
          </select>

          <select
            value={query.channel}
            onChange={event =>
              updateQuery({
                channel: event.target
                  .value as TransactionAdminListQuery["channel"],
              })
            }
            className="h-10 rounded-lg border border-[#DCCDBB] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15"
          >
            <option value={ALL_TRANSACTION_ADMIN_CHANNEL}>全部渠道</option>
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
                itemType: event.target
                  .value as TransactionAdminListQuery["itemType"],
              })
            }
            className="h-10 rounded-lg border border-[#DCCDBB] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15"
          >
            <option value={ALL_TRANSACTION_ADMIN_ITEM_TYPE}>全部业务</option>
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
                sort: event.target.value as TransactionAdminListQuery["sort"],
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

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="min-w-0 overflow-hidden rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] shadow-sm shadow-[#243B35]/5">
          <div className="hidden grid-cols-[minmax(260px,1.35fr)_140px_120px_130px_150px] border-b border-[#E8DED0] bg-[#F8F3EA] px-4 py-3 text-xs font-semibold text-[#8A8176] lg:grid">
            <span>流水</span>
            <span>用户/订单</span>
            <span>类型/状态</span>
            <span>金额/渠道</span>
            <span>发生时间</span>
          </div>

          {loading ? (
            <div className="flex min-h-[340px] items-center justify-center text-sm text-[#6F7771]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              正在读取交易流水
            </div>
          ) : error ? (
            <EmptyState
              icon={AlertTriangle}
              title="交易流水暂时不可用"
              description={error}
            />
          ) : result && result.items.length > 0 ? (
            <div>
              {result.items.map(item => (
                <TransactionRow
                  key={item.id}
                  transaction={item}
                  selected={item.id === selectedTransactionId}
                  onSelect={() => setSelectedTransactionId(item.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CreditCard}
              title="没有匹配的交易流水"
              description="当前筛选条件下暂无支付、退款或渠道回调记录。"
            />
          )}

          {result && result.meta.totalPages > 0 && (
            <div className="flex flex-col gap-3 border-t border-[#E8DED0] px-4 py-3 text-sm text-[#6F7771] md:flex-row md:items-center md:justify-between">
              <span>
                第 {result.meta.page} / {result.meta.totalPages} 页，共{" "}
                {result.meta.total} 条
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
                      page: Math.min(result.meta.totalPages, query.page + 1),
                    })
                  }
                  disabled={query.page >= result.meta.totalPages}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#DCCDBB] px-3 font-semibold text-[#53675D] transition hover:bg-[#F8F3EA] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  下一页
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="min-w-0 overflow-hidden rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] shadow-sm shadow-[#243B35]/5 xl:sticky xl:top-[86px] xl:max-h-[calc(100svh-112px)] xl:overflow-y-auto">
          <TransactionDetailPanel
            detail={detail}
            loading={detailLoading}
            error={detailError}
            canOperate={canOperate}
            actionSubmitting={actionSubmitting}
            actionError={actionError}
            onSubmitAction={submitTransactionAction}
          />
        </aside>
      </section>
    </div>
  );
}
