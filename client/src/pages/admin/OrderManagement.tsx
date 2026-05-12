import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  FileText,
  Flag,
  History,
  Loader2,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  ShieldAlert,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import {
  ALL_ORDER_ADMIN_ITEM_TYPE,
  ALL_ORDER_ADMIN_STATUS,
  ORDER_ADMIN_PAGE_SIZE,
  ORDER_ADMIN_PERMISSIONS,
  PurchasableTypeSchema,
  userCan,
  type OrderAdminAction,
  type OrderAdminActionRequest,
  type OrderAdminDetail,
  type OrderAdminListItem,
  type OrderAdminListQuery,
  type OrderStatus,
  type PaymentWebhookReceiptStatus,
  type PurchasableType,
} from "@shared/domain";
import { useAuth } from "@/contexts/AuthContext";
import { httpAdminOrderRepository } from "@/features/orders";

const orderStatusCopy = {
  created: "已创建",
  pending_payment: "待支付",
  paid: "已支付",
  closed: "已关闭",
  refunding: "退款中",
  refunded: "已退款",
} satisfies Record<OrderStatus, string>;

const itemTypeCopy = {
  course: "课程",
  membership: "会员",
  counseling_session: "咨询",
  assessment_report: "测评",
} satisfies Record<PurchasableType, string>;

const receiptStatusCopy = {
  processing: "处理中",
  processed: "已处理",
  failed: "失败",
} satisfies Record<PaymentWebhookReceiptStatus, string>;

const orderActionCopy = {
  close_pending: "关闭待支付",
  mark_exception: "标记异常",
  clear_exception: "解除异常",
} satisfies Record<OrderAdminAction, string>;

const exceptionSeverityCopy = {
  warning: "需关注",
  critical: "严重异常",
} satisfies Record<"warning" | "critical", string>;

const sortOptions: {
  value: OrderAdminListQuery["sort"];
  label: string;
}[] = [
  { value: "created_desc", label: "最近创建" },
  { value: "paid_desc", label: "最近支付" },
  { value: "amount_desc", label: "金额最高" },
];

type OrderAdminListQueryResult = Awaited<
  ReturnType<typeof httpAdminOrderRepository.loadOrders>
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

function statusClass(status: OrderStatus) {
  if (status === "paid") return "bg-[#E7EFE8] text-[#41675A]";
  if (status === "pending_payment") return "bg-[#FFF7E5] text-[#8F6B1C]";
  if (["refunding", "refunded"].includes(status)) {
    return "bg-[#EAF0F7] text-[#4A647E]";
  }
  if (status === "closed") return "bg-[#EEF2F7] text-[#536783]";
  return "bg-[#F1E8DC] text-[#73695F]";
}

function receiptClass(status?: PaymentWebhookReceiptStatus) {
  if (status === "processed") return "bg-[#E7EFE8] text-[#41675A]";
  if (status === "failed") return "bg-[#FBEAE7] text-[#9B3B2F]";
  if (status === "processing") return "bg-[#FFF7E5] text-[#8F6B1C]";
  return "bg-[#EEF2F7] text-[#536783]";
}

function exceptionClass(severity?: "warning" | "critical") {
  if (severity === "critical") return "bg-[#FBEAE7] text-[#9B3B2F]";
  return "bg-[#FFF7E5] text-[#8F6B1C]";
}

function itemTypeOptionsFromResult(
  result: OrderAdminListQueryResult | undefined
) {
  return result?.filters.itemTypes.length
    ? result.filters.itemTypes
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

function OrderRow({
  order,
  selected,
  onSelect,
}: {
  order: OrderAdminListItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`grid w-full gap-3 border-b border-[#E8DED0] px-4 py-4 text-left transition lg:grid-cols-[minmax(260px,1.4fr)_130px_120px_120px_150px] ${
        selected ? "bg-[#EEF5EA]" : "hover:bg-[#FBF7EF]"
      }`}
    >
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E5ECE1] text-[#41675A]">
            <ReceiptText className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-[#243B35]">
              {order.primaryTitle}
            </span>
            <span className="mt-0.5 block truncate text-xs text-[#8A8176]">
              {order.id}
            </span>
            {order.exception ? (
              <span
                className={`mt-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${exceptionClass(
                  order.exception.severity
                )}`}
              >
                <Flag className="h-3 w-3" />
                {exceptionSeverityCopy[order.exception.severity]}
              </span>
            ) : null}
          </span>
        </span>
      </span>
      <span className="text-sm text-[#5F6B64]">
        <span className="block truncate font-semibold text-[#243B35]">
          {order.user.displayName}
        </span>
        <span className="mt-0.5 block truncate text-xs text-[#8A8176]">
          {order.user.phoneMasked ?? order.user.id}
        </span>
      </span>
      <span>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
            order.status
          )}`}
        >
          {orderStatusCopy[order.status]}
        </span>
      </span>
      <span className="text-sm font-semibold text-[#243B35]">
        {formatMoney(order.payableAmount)}
      </span>
      <span className="flex items-center justify-between gap-2 text-sm text-[#5F6B64] lg:block">
        <span>{formatDate(order.createdAt)}</span>
        <span
          className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${receiptClass(
            order.latestReceiptStatus
          )}`}
        >
          {order.latestReceiptStatus
            ? receiptStatusCopy[order.latestReceiptStatus]
            : "无回调"}
        </span>
      </span>
    </button>
  );
}

function OrderDetailPanel({
  detail,
  loading,
  error,
  canOperate,
  actionSubmitting,
  actionError,
  onSubmitAction,
}: {
  detail?: OrderAdminDetail;
  loading: boolean;
  error?: string;
  canOperate: boolean;
  actionSubmitting: boolean;
  actionError?: string;
  onSubmitAction: (request: OrderAdminActionRequest) => Promise<boolean>;
}) {
  const [selectedAction, setSelectedAction] =
    useState<OrderAdminAction>("mark_exception");
  const [severity, setSeverity] = useState<"warning" | "critical">("warning");
  const [reason, setReason] = useState("");

  const availableActions = detail
    ? ([
        ...(detail.order.status === "created" ||
        detail.order.status === "pending_payment"
          ? (["close_pending"] as const)
          : []),
        "mark_exception",
        ...(detail.order.exception ? (["clear_exception"] as const) : []),
      ] satisfies OrderAdminAction[])
    : ([] satisfies OrderAdminAction[]);

  useEffect(() => {
    if (!availableActions.length) return;
    if (!availableActions.includes(selectedAction)) {
      setSelectedAction(availableActions[0]);
    }
  }, [
    availableActions,
    detail?.order.exception?.status,
    detail?.order.id,
    detail?.order.status,
    selectedAction,
  ]);

  async function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedReason = reason.trim();
    const request: OrderAdminActionRequest =
      selectedAction === "mark_exception"
        ? {
            action: selectedAction,
            severity,
            reason: trimmedReason,
          }
        : {
            action: selectedAction,
            reason: trimmedReason,
          };

    const ok = await onSubmitAction(request);
    if (ok) {
      setReason("");
      if (request.action === "clear_exception") {
        setSelectedAction("mark_exception");
      }
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-sm text-[#6F7771]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        正在读取订单详情
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="订单详情暂时不可用"
        description={error}
      />
    );
  }

  if (!detail) {
    return (
      <EmptyState
        icon={FileText}
        title="选择一个订单"
        description="订单金额、明细、支付回调、履约对象和状态时间线会在这里汇总。"
      />
    );
  }

  return (
    <div>
      <div className="px-5 py-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#E5ECE1] text-[#41675A]">
            <ReceiptText className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-[#243B35]">
              {detail.order.primaryTitle}
            </h2>
            <p className="mt-1 truncate text-xs text-[#8A8176]">
              {detail.order.id}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                detail.order.status
              )}`}
            >
              {orderStatusCopy[detail.order.status]}
            </span>
            {detail.order.exception ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${exceptionClass(
                  detail.order.exception.severity
                )}`}
              >
                <Flag className="h-3 w-3" />
                {exceptionSeverityCopy[detail.order.exception.severity]}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 border-y border-[#E8DED0] text-center text-sm">
          <div className="border-r border-[#E8DED0] py-3">
            <p className="text-lg font-semibold">
              {formatMoney(detail.payableAmount)}
            </p>
            <p className="mt-0.5 text-xs text-[#8A8176]">应付</p>
          </div>
          <div className="border-r border-[#E8DED0] py-3">
            <p className="text-lg font-semibold">{detail.items.length}</p>
            <p className="mt-0.5 text-xs text-[#8A8176]">明细</p>
          </div>
          <div className="py-3">
            <p className="text-lg font-semibold">
              {detail.paymentReceipts.length}
            </p>
            <p className="mt-0.5 text-xs text-[#8A8176]">回调</p>
          </div>
        </div>
      </div>

      {canOperate ? (
        <DetailSection title="订单操作">
          {detail.order.exception ? (
            <div
              className={`mb-3 rounded-lg px-3 py-2 text-sm ${exceptionClass(
                detail.order.exception.severity
              )}`}
            >
              <div className="flex items-center gap-2 font-semibold">
                <ShieldAlert className="h-4 w-4" />
                {exceptionSeverityCopy[detail.order.exception.severity]}
              </div>
              <p className="mt-1 leading-5">{detail.order.exception.reason}</p>
              <p className="mt-1 text-xs opacity-80">
                {formatDate(detail.order.exception.markedAt)}
              </p>
            </div>
          ) : null}

          <form onSubmit={submitAction} className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-semibold text-[#8A8176]">
                动作
                <select
                  value={selectedAction}
                  onChange={event =>
                    setSelectedAction(event.target.value as OrderAdminAction)
                  }
                  className="h-10 rounded-lg border border-[#DCCDBB] bg-white px-3 text-sm font-medium text-[#243B35] outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15"
                >
                  {availableActions.map(action => (
                    <option key={action} value={action}>
                      {orderActionCopy[action]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-xs font-semibold text-[#8A8176]">
                级别
                <select
                  value={severity}
                  onChange={event =>
                    setSeverity(event.target.value as "warning" | "critical")
                  }
                  disabled={selectedAction !== "mark_exception"}
                  className="h-10 rounded-lg border border-[#DCCDBB] bg-white px-3 text-sm font-medium text-[#243B35] outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15 disabled:bg-[#F8F3EA] disabled:text-[#9A8F82]"
                >
                  <option value="warning">需关注</option>
                  <option value="critical">严重异常</option>
                </select>
              </label>
            </div>

            <label className="grid gap-1 text-xs font-semibold text-[#8A8176]">
              原因
              <textarea
                value={reason}
                onChange={event => setReason(event.target.value)}
                rows={3}
                placeholder="记录本次操作原因"
                className="min-h-24 resize-none rounded-lg border border-[#DCCDBB] bg-white px-3 py-2 text-sm font-medium text-[#243B35] outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15"
              />
            </label>

            {actionError ? (
              <p className="rounded-lg bg-[#FBEAE7] px-3 py-2 text-xs font-semibold text-[#9B3B2F]">
                {actionError}
              </p>
            ) : null}

            <button
              disabled={actionSubmitting || reason.trim().length < 2}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {actionSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : selectedAction === "clear_exception" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : selectedAction === "mark_exception" ? (
                <Flag className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              提交
            </button>
          </form>
        </DetailSection>
      ) : null}

      <DetailSection title="用户摘要">
        <div className="flex items-center gap-3 text-sm">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F1E8DC] text-[#73695F]">
            <UserRound className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-[#243B35]">
              {detail.order.user.displayName}
            </p>
            <p className="mt-1 text-xs text-[#8A8176]">
              {detail.order.user.phoneMasked ?? detail.order.user.id}
            </p>
          </div>
        </div>
      </DetailSection>

      <DetailSection title="订单明细">
        <div className="divide-y divide-[#E8DED0]">
          {detail.items.map(item => (
            <div
              key={`${item.type}-${item.targetId}`}
              className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#243B35]">
                  {item.title}
                </p>
                <p className="mt-1 text-xs text-[#8A8176]">
                  {itemTypeCopy[item.type]} · x{item.quantity}
                </p>
              </div>
              <p className="text-sm font-semibold text-[#243B35]">
                {formatMoney(item.unitPrice)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2 border-t border-[#E8DED0] pt-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-[#5F6B64]">原价</span>
            <span className="font-semibold">
              {formatMoney(detail.subtotal)}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-[#5F6B64]">优惠</span>
            <span className="font-semibold">
              {formatMoney(detail.discountAmount)}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-[#5F6B64]">应付</span>
            <span className="font-semibold text-[#243B35]">
              {formatMoney(detail.payableAmount)}
            </span>
          </div>
        </div>
      </DetailSection>

      <DetailSection title="关联对象">
        {detail.relatedObjects.length === 0 ? (
          <p className="text-sm text-[#8A8176]">暂无关联对象</p>
        ) : (
          <div className="grid gap-2">
            {detail.relatedObjects.map(object => (
              <div
                key={`${object.type}-${object.targetId}`}
                className="rounded-lg bg-[#F8F3EA] px-3 py-2 text-sm"
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
                  {object.status ?? "未记录"}
                  {object.counselorName ? ` · ${object.counselorName}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      <DetailSection title="支付回调">
        {detail.paymentReceipts.length === 0 ? (
          <p className="text-sm text-[#8A8176]">暂无支付或退款回调</p>
        ) : (
          <div className="divide-y divide-[#E8DED0]">
            {detail.paymentReceipts.map(receipt => (
              <div key={receipt.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#243B35]">
                      {receipt.type === "payment.succeeded"
                        ? "支付成功"
                        : "退款成功"}
                    </p>
                    <p className="mt-1 text-xs text-[#8A8176]">
                      {receipt.channel} · {formatDate(receipt.occurredAt)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${receiptClass(
                      receipt.status
                    )}`}
                  >
                    {receiptStatusCopy[receipt.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      <DetailSection title="操作审计">
        {detail.auditEvents.length === 0 ? (
          <p className="text-sm text-[#8A8176]">暂无订单后台操作记录</p>
        ) : (
          <div className="space-y-3">
            {detail.auditEvents.map(event => (
              <div key={event.id} className="rounded-lg bg-[#F8F3EA] px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-[#243B35]">
                      <History className="h-4 w-4 text-[#6F8F83]" />
                      {orderActionCopy[event.action]}
                    </p>
                    <p className="mt-1 text-xs text-[#8A8176]">
                      {event.actorId} · {formatDate(event.createdAt)}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#53675D]">
                    {orderStatusCopy[event.before.status]} -&gt;{" "}
                    {orderStatusCopy[event.after.status]}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-5 text-[#5F6B64]">
                  {event.reason}
                </p>
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      <DetailSection title="状态时间线">
        <div className="space-y-3">
          {detail.timeline.map((event, index) => (
            <div
              key={`${event.type}-${event.occurredAt}-${index}`}
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

export default function OrderManagement() {
  const { user } = useAuth();
  const canRead = Boolean(user && userCan(user, ORDER_ADMIN_PERMISSIONS.read));
  const canOperate = Boolean(
    user && userCan(user, ORDER_ADMIN_PERMISSIONS.operate)
  );
  const [query, setQuery] = useState<OrderAdminListQuery>({
    keyword: "",
    status: ALL_ORDER_ADMIN_STATUS,
    itemType: ALL_ORDER_ADMIN_ITEM_TYPE,
    sort: "created_desc",
    page: 1,
    pageSize: ORDER_ADMIN_PAGE_SIZE,
  });
  const [keywordDraft, setKeywordDraft] = useState("");
  const [result, setResult] = useState<OrderAdminListQueryResult>();
  const [selectedOrderId, setSelectedOrderId] = useState<string>();
  const [detail, setDetail] = useState<OrderAdminDetail>();
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [detailError, setDetailError] = useState<string>();
  const [actionError, setActionError] = useState<string>();

  const loadOrders = useCallback(async () => {
    if (!canRead) return undefined;

    setLoading(true);
    setError(undefined);
    try {
      const nextResult = await httpAdminOrderRepository.loadOrders(query);
      setResult(nextResult);
      setSelectedOrderId(current => {
        if (current && nextResult.items.some(item => item.id === current)) {
          return current;
        }
        return nextResult.items[0]?.id;
      });
      return nextResult;
    } catch (err) {
      setError(err instanceof Error ? err.message : "订单列表暂时不可用");
      setResult(undefined);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [canRead, query]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    setActionError(undefined);
    if (!canRead || !selectedOrderId) {
      setDetail(undefined);
      return;
    }

    setDetailLoading(true);
    setDetailError(undefined);
    httpAdminOrderRepository
      .loadOrderDetail(selectedOrderId)
      .then(setDetail)
      .catch(err => {
        setDetail(undefined);
        setDetailError(
          err instanceof Error ? err.message : "订单详情暂时不可用"
        );
      })
      .finally(() => setDetailLoading(false));
  }, [canRead, selectedOrderId]);

  const submitOrderAction = useCallback(
    async (request: OrderAdminActionRequest) => {
      if (!selectedOrderId) return false;

      setActionSubmitting(true);
      setActionError(undefined);
      try {
        const mutation = await httpAdminOrderRepository.updateOrder(
          selectedOrderId,
          request
        );
        setDetail(mutation.detail);
        await loadOrders();
        return true;
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "订单操作暂时不可用"
        );
        return false;
      } finally {
        setActionSubmitting(false);
      }
    },
    [loadOrders, selectedOrderId]
  );

  const itemTypeOptions = useMemo(
    () => itemTypeOptionsFromResult(result),
    [result]
  );
  const statusOptions = useMemo(
    () =>
      result?.filters.statuses.length
        ? result.filters.statuses
        : ([
            "created",
            "pending_payment",
            "paid",
            "closed",
            "refunding",
            "refunded",
          ] as OrderStatus[]),
    [result]
  );

  function updateQuery(next: Partial<OrderAdminListQuery>) {
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

  if (!canRead) {
    return (
      <div className="rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-8 text-center text-[#243B35] shadow-sm shadow-[#243B35]/5">
        <ShieldCheck className="mx-auto h-8 w-8 text-[#6F8F83]" />
        <h1 className="mt-4 text-xl font-semibold">当前账号暂无订单后台权限</h1>
        <p className="mt-2 text-sm leading-6 text-[#6F7771]">
          课程、会员和咨询订单需要订单后台读取权限。
        </p>
      </div>
    );
  }

  return (
    <div className="text-[#243B35]">
      <section className="flex flex-col gap-4 border-b border-[#E1D7C8] pb-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B7E6D]">
            订单管理
          </p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
            统一订单台
          </h1>
          <p className="mt-3 max-w-[760px] text-sm leading-6 text-[#6F7771]">
            聚合课程、会员和咨询订单，提供检索、支付回调、履约关联、异常标记和待支付关闭动作。
          </p>
        </div>
        <button
          onClick={() => void loadOrders()}
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
            label: "订单数",
            value: result?.summary.totalCount ?? 0,
            icon: ReceiptText,
          },
          {
            label: "待支付",
            value: result?.summary.pendingPaymentCount ?? 0,
            icon: Clock3,
          },
          {
            label: "已支付",
            value: result?.summary.paidCount ?? 0,
            icon: PackageCheck,
          },
          {
            label: "已收金额",
            value: result?.summary.paidAmount ?? 0,
            icon: CreditCard,
            money: true,
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
          className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px_180px_auto]"
        >
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A8F82]" />
            <input
              value={keywordDraft}
              onChange={event => setKeywordDraft(event.target.value)}
              placeholder="搜索订单号、用户、商品"
              className="h-10 w-full rounded-lg border border-[#DCCDBB] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15"
            />
          </label>

          <select
            value={query.status}
            onChange={event =>
              updateQuery({
                status: event.target.value as OrderAdminListQuery["status"],
              })
            }
            className="h-10 rounded-lg border border-[#DCCDBB] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15"
          >
            <option value={ALL_ORDER_ADMIN_STATUS}>全部状态</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>
                {orderStatusCopy[status]}
              </option>
            ))}
          </select>

          <select
            value={query.itemType}
            onChange={event =>
              updateQuery({
                itemType: event.target.value as OrderAdminListQuery["itemType"],
              })
            }
            className="h-10 rounded-lg border border-[#DCCDBB] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15"
          >
            <option value={ALL_ORDER_ADMIN_ITEM_TYPE}>全部类型</option>
            {itemTypeOptions.map(type => (
              <option key={type} value={type}>
                {itemTypeCopy[type]}
              </option>
            ))}
          </select>

          <select
            value={query.sort}
            onChange={event =>
              updateQuery({
                sort: event.target.value as OrderAdminListQuery["sort"],
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
          <div className="hidden grid-cols-[minmax(260px,1.4fr)_130px_120px_120px_150px] border-b border-[#E8DED0] bg-[#F8F3EA] px-4 py-3 text-xs font-semibold text-[#8A8176] lg:grid">
            <span>订单</span>
            <span>用户</span>
            <span>状态</span>
            <span>金额</span>
            <span>创建/回调</span>
          </div>

          {loading ? (
            <div className="flex min-h-[340px] items-center justify-center text-sm text-[#6F7771]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              正在读取订单
            </div>
          ) : error ? (
            <EmptyState
              icon={AlertTriangle}
              title="订单列表暂时不可用"
              description={error}
            />
          ) : result && result.items.length > 0 ? (
            <div>
              {result.items.map(item => (
                <OrderRow
                  key={item.id}
                  order={item}
                  selected={item.id === selectedOrderId}
                  onSelect={() => setSelectedOrderId(item.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ReceiptText}
              title="没有匹配的订单"
              description="当前筛选条件下暂无课程、会员或咨询订单。"
            />
          )}

          {result && result.meta.totalPages > 0 && (
            <div className="flex flex-col gap-3 border-t border-[#E8DED0] px-4 py-3 text-sm text-[#6F7771] md:flex-row md:items-center md:justify-between">
              <span>
                第 {result.meta.page} / {result.meta.totalPages} 页，共{" "}
                {result.meta.total} 单
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

        <aside className="overflow-hidden rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] shadow-sm shadow-[#243B35]/5">
          <div className="flex items-center justify-between border-b border-[#E8DED0] px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ReceiptText className="h-4 w-4 text-[#6F8F83]" />
              订单详情
            </div>
            <div className="flex items-center gap-2 text-xs text-[#8A8176]">
              <CalendarClock className="h-3.5 w-3.5" />
              {formatDate(detail?.generatedAt)}
            </div>
          </div>
          <OrderDetailPanel
            detail={detail}
            loading={detailLoading}
            error={detailError}
            canOperate={canOperate}
            actionSubmitting={actionSubmitting}
            actionError={actionError}
            onSubmitAction={submitOrderAction}
          />
        </aside>
      </section>
    </div>
  );
}
