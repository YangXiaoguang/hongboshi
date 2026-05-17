import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  WalletCards,
  X,
} from "lucide-react";
import {
  coursePaymentMethods,
  formatCheckoutMoney,
  type Course,
  type CourseCheckoutOrderResult,
  type CourseCheckoutPaymentChannel,
  type CourseCheckoutSummary,
} from "@/features/courses";

export type CourseCheckoutStatus =
  | "idle"
  | "creating"
  | "pending_payment"
  | "processing"
  | "success"
  | "failed";

export function formatCheckoutDateTime(value?: string): string {
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

interface CourseCheckoutDrawerProps {
  acceptedTerms: boolean;
  checkoutError?: string;
  checkoutOrder?: CourseCheckoutOrderResult;
  course: Course;
  isOpen: boolean;
  isSyncing: boolean;
  selectedPaymentChannel: CourseCheckoutPaymentChannel;
  status: CourseCheckoutStatus;
  summary?: CourseCheckoutSummary;
  onAcceptedTermsChange: (accepted: boolean) => void;
  onCancelOrder: () => void;
  onClose: () => void;
  onConfirm: () => void;
  onPaymentChannelChange: (channel: CourseCheckoutPaymentChannel) => void;
  onStartLearning: () => void;
  onViewWorkspace: () => void;
}

export default function CourseCheckoutDrawer({
  acceptedTerms,
  checkoutError,
  checkoutOrder,
  course,
  isOpen,
  isSyncing,
  selectedPaymentChannel,
  status,
  summary,
  onAcceptedTermsChange,
  onCancelOrder,
  onClose,
  onConfirm,
  onPaymentChannelChange,
  onStartLearning,
  onViewWorkspace,
}: CourseCheckoutDrawerProps) {
  const busy = status === "creating" || status === "processing";
  const orderStatusLabel = checkoutOrder
    ? {
        created: "已创建",
        pending_payment: "待支付",
        paid: "已支付",
        closed: "已关闭",
        refunding: "退款中",
        refunded: "已退款",
      }[checkoutOrder.order.status]
    : "待创建";
  const confirmLabel =
    status === "creating"
      ? "创建订单中"
      : status === "processing"
        ? "支付确认中"
        : checkoutOrder?.order.status === "closed"
          ? "订单已关闭"
          : checkoutOrder?.order.status === "pending_payment" ||
              status === "failed"
            ? `继续支付 ${formatCheckoutMoney(summary?.payableAmount ?? 0)}`
            : `创建订单并支付 ${formatCheckoutMoney(summary?.payableAmount ?? 0)}`;

  return (
    <AnimatePresence>
      {isOpen && summary && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end bg-[#172620]/52 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.aside
            className="flex h-full w-full max-w-[480px] flex-col overflow-y-auto bg-[#FFFDF8] text-[#243B35] shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            onClick={event => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E7DED0] bg-[#FFFDF8]/95 px-5 py-4 backdrop-blur">
              <div>
                <p className="text-xs font-semibold text-[#6F8F83]">
                  {status === "success" ? "支付结果" : "课程订单"}
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  {status === "success" ? "权益已准备好" : "订单确认"}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4EFE6] text-[#6D746F] transition hover:text-[#243B35]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {status === "success" ? (
              <div className="flex flex-1 flex-col px-5 py-6">
                <div className="rounded-[28px] bg-[#243B35] p-6 text-white">
                  <CheckCircle2 className="h-10 w-10 text-[#C8D8C0]" />
                  <h3 className="mt-5 text-2xl font-semibold">购买已确认</h3>
                  <p className="mt-3 text-sm leading-7 text-white/68">
                    {summary.mode === "membership"
                      ? "会员权益已经写入账户，本课和更多会员课程可以进入学习。"
                      : "课程权益已经写入账户，可以立即加入学习计划。"}
                  </p>
                  {checkoutOrder && (
                    <p className="mt-4 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-[#DDE8D9]">
                      订单号 {checkoutOrder.order.id}
                    </p>
                  )}
                </div>

                <div className="mt-6 rounded-[24px] border border-[#E4DCCF] bg-[#F9F5EE] p-5">
                  <p className="text-xs font-semibold text-[#6F8F83]">
                    权益交付
                  </p>
                  <p className="mt-3 text-lg font-semibold">
                    {summary.productTitle}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#6D746F]">
                    {summary.productSubtitle}
                  </p>
                </div>

                <div className="mt-auto grid gap-3 pt-8">
                  <button
                    onClick={onStartLearning}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-[#243B35] text-sm font-semibold text-white transition hover:bg-[#315047]"
                  >
                    开始学习
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </button>
                  <button
                    onClick={onViewWorkspace}
                    className="inline-flex h-12 items-center justify-center rounded-full border border-[#D8CEC0] text-sm font-semibold text-[#41675A] transition hover:bg-[#EEF4EA]"
                  >
                    查看成长空间
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-5 py-6">
                <div className="flex gap-4 rounded-[24px] bg-[#F4EFE6] p-4">
                  <img
                    src={course.coverUrl}
                    alt=""
                    className="h-24 w-28 shrink-0 rounded-[18px] object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#6F8F83]">
                      {summary.mode === "membership" ? "会员权益" : "课程商品"}
                    </p>
                    <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-snug">
                      {summary.productTitle}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#6D746F]">
                      {summary.productSubtitle}
                    </p>
                  </div>
                </div>

                <div className="mt-6 divide-y divide-[#E7DED0] border-y border-[#E7DED0]">
                  <CheckoutAmountRow
                    label="商品金额"
                    value={formatCheckoutMoney(summary.listPrice)}
                  />
                  {summary.originalPrice > summary.listPrice && (
                    <CheckoutAmountRow
                      label="原价参考"
                      value={formatCheckoutMoney(summary.originalPrice)}
                      muted
                    />
                  )}
                  {summary.discountAmount > 0 && (
                    <CheckoutAmountRow
                      label="优惠抵扣"
                      value={`-${formatCheckoutMoney(summary.discountAmount)}`}
                      accent
                    />
                  )}
                  <CheckoutAmountRow
                    label="实付金额"
                    value={formatCheckoutMoney(summary.payableAmount)}
                    strong
                  />
                </div>

                <div className="mt-6 rounded-[20px] border border-[#E4DCCF] bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold">订单状态</p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        checkoutOrder?.order.status === "closed" ||
                        status === "failed"
                          ? "bg-[#FFF1EC] text-[#A65F48]"
                          : checkoutOrder?.order.status === "pending_payment"
                            ? "bg-[#FFF8DF] text-[#8A641C]"
                            : "bg-[#E6EDDF] text-[#41675A]"
                      }`}
                    >
                      {orderStatusLabel}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 text-xs leading-5 text-[#6D746F]">
                    <div className="flex items-center justify-between gap-3">
                      <span>订单号</span>
                      <span className="max-w-[260px] truncate font-semibold text-[#243B35]">
                        {checkoutOrder?.order.id ?? "确认后生成"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>支付保留</span>
                      <span className="font-semibold text-[#243B35]">
                        {formatCheckoutDateTime(
                          checkoutOrder?.payment.expiresAt
                        )}
                      </span>
                    </div>
                  </div>
                  {checkoutError && (
                    <p className="mt-4 rounded-[14px] bg-[#FFF1EC] px-3 py-2 text-xs leading-5 text-[#A65F48]">
                      {checkoutError}
                    </p>
                  )}
                </div>

                <div className="mt-6">
                  <p className="text-sm font-semibold">交付内容</p>
                  <div className="mt-3 grid gap-2">
                    {summary.deliveryItems.map(item => (
                      <CheckoutInfoRow key={item.label} {...item} />
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-sm font-semibold">支付方式</p>
                  <div className="mt-3 grid gap-2">
                    {coursePaymentMethods.map(method => (
                      <button
                        key={method.channel}
                        onClick={() => onPaymentChannelChange(method.channel)}
                        className={`flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-left transition ${
                          selectedPaymentChannel === method.channel
                            ? "border-[#6F8F83] bg-[#EEF4EA]"
                            : "border-[#E4DCCF] bg-white hover:border-[#AFC2AB]"
                        }`}
                      >
                        <span>
                          <span className="block text-sm font-semibold">
                            {method.label}
                          </span>
                          <span className="mt-1 block text-xs text-[#7B817C]">
                            {method.description}
                          </span>
                        </span>
                        <WalletCards className="h-4 w-4 shrink-0 text-[#6F8F83]" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 rounded-[20px] bg-[#F9F5EE] p-4">
                  <p className="text-sm font-semibold">购买须知</p>
                  <ul className="mt-3 space-y-2 text-xs leading-5 text-[#6D746F]">
                    {summary.notices.map(item => (
                      <li key={item}>· {item}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    aria-pressed={acceptedTerms}
                    onClick={() => onAcceptedTermsChange(!acceptedTerms)}
                    className="mt-4 flex w-full items-start gap-3 rounded-[16px] px-2 py-2 text-left text-xs leading-5 text-[#5F6B64] transition hover:bg-white/72"
                  >
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        acceptedTerms
                          ? "border-[#41675A] bg-[#41675A] text-white"
                          : "border-[#CFC5B8] bg-white"
                      }`}
                    >
                      {acceptedTerms && <CheckCircle2 className="h-3 w-3" />}
                    </span>
                    <span>我已确认订单金额、权益交付和开发期支付说明。</span>
                  </button>
                </div>

                <button
                  onClick={onConfirm}
                  disabled={
                    isSyncing ||
                    busy ||
                    checkoutOrder?.order.status === "closed"
                  }
                  className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#243B35] text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-wait disabled:opacity-65"
                >
                  {confirmLabel}
                </button>
                {checkoutOrder?.order.status === "pending_payment" && (
                  <button
                    onClick={onCancelOrder}
                    disabled={busy}
                    className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-full border border-[#D8CEC0] text-sm font-semibold text-[#41675A] transition hover:bg-[#EEF4EA] disabled:cursor-wait disabled:opacity-65"
                  >
                    取消订单
                  </button>
                )}
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CheckoutAmountRow({
  label,
  value,
  accent = false,
  muted = false,
  strong = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm text-[#6D746F]">{label}</span>
      <span
        className={`text-sm ${
          strong
            ? "text-xl font-semibold text-[#A65F48]"
            : accent
              ? "font-semibold text-[#A65F48]"
              : muted
                ? "text-[#9AA19B] line-through"
                : "font-semibold text-[#243B35]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function CheckoutInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[16px] bg-[#F9F5EE] px-4 py-3">
      <span className="text-xs font-semibold text-[#7B817C]">{label}</span>
      <span className="text-right text-xs font-semibold text-[#243B35]">
        {value}
      </span>
    </div>
  );
}
