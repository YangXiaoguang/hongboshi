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
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Video,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import {
  httpCounselingRepository,
  type CounselingAppointmentActionResult,
  type CounselingAppointmentRecord,
  type CounselingWorkbench,
} from "@/features/counseling";
import type {
  AppointmentStatus,
  CounselingChannel,
  CounselingConcernTag,
  CounselingWorkbenchSummary,
  OrderStatus,
} from "@shared/domain";

type FilterKey = "all" | AppointmentStatus | "refunding";
type FulfillmentAction = "complete_session" | "mark_no_show";

const statusCopy = {
  pending_payment: "待支付",
  scheduled: "已预约",
  completed: "已完成",
  cancelled: "已取消",
  no_show: "未到访",
  refunded: "已退款",
} satisfies Record<AppointmentStatus, string>;

const statusTone = {
  pending_payment: "bg-[#F3E6C9] text-[#7A6129]",
  scheduled: "bg-[#E4EDE4] text-[#355F51]",
  completed: "bg-[#E8F0EA] text-[#41675A]",
  cancelled: "bg-[#EFE8E0] text-[#736B63]",
  no_show: "bg-[#F8E4DC] text-[#A65F48]",
  refunded: "bg-[#E7E2EC] text-[#5E526D]",
} satisfies Record<AppointmentStatus, string>;

const orderStatusCopy = {
  created: "已创建",
  pending_payment: "待支付",
  paid: "已支付",
  closed: "已关闭",
  refunding: "退款中",
  refunded: "已退款",
} satisfies Record<OrderStatus, string>;

const channelCopy = {
  video: "视频",
  voice: "语音",
  offline: "线下",
} satisfies Record<CounselingChannel, string>;

const concernTagCopy = {
  emotion: "情绪",
  sleep: "睡眠",
  relationship: "关系",
  family: "家庭",
  adolescent: "青少年",
  workplace: "职场",
  self_growth: "成长",
  crisis: "危机",
} satisfies Record<CounselingConcernTag, string>;

const filters = [
  { key: "all", label: "全部" },
  { key: "scheduled", label: "待履约" },
  { key: "pending_payment", label: "待支付" },
  { key: "refunding", label: "退款中" },
  { key: "completed", label: "已完成" },
  { key: "no_show", label: "未到访" },
] satisfies Array<{ key: FilterKey; label: string }>;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间待确认";

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(record: CounselingAppointmentRecord) {
  const minutes = Math.round(
    (Date.parse(record.slot.endsAt) - Date.parse(record.slot.startsAt)) / 60000
  );
  return `${minutes} 分钟`;
}

function buildSummary(
  records: CounselingAppointmentRecord[]
): CounselingWorkbenchSummary {
  return {
    scheduledCount: records.filter(
      record => record.appointment.status === "scheduled"
    ).length,
    pendingPaymentCount: records.filter(
      record => record.appointment.status === "pending_payment"
    ).length,
    refundingCount: records.filter(
      record => record.order?.status === "refunding"
    ).length,
    completedCount: records.filter(
      record => record.appointment.status === "completed"
    ).length,
    noShowCount: records.filter(
      record => record.appointment.status === "no_show"
    ).length,
  };
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

function SummaryItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ElementType;
}) {
  const Icon = icon;

  return (
    <div className="min-w-0 border-b border-[#E5DCCC] py-4 sm:border-b-0 sm:border-r sm:px-5 last:sm:border-r-0">
      <div className="flex items-center gap-2 text-sm text-[#6F7771]">
        <Icon className="h-4 w-4 text-[#7C9288]" />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-2 text-3xl font-semibold text-[#243B35]">{value}</p>
    </div>
  );
}

function recordMatchesFilter(
  record: CounselingAppointmentRecord,
  filter: FilterKey
) {
  if (filter === "all") return true;
  if (filter === "refunding") return record.order?.status === "refunding";
  return record.appointment.status === filter;
}

function resultToRecord(
  result: CounselingAppointmentActionResult
): CounselingAppointmentRecord {
  return {
    appointment: result.appointment,
    counselor: result.counselor,
    slot: result.slot,
    order: result.order,
    riskEvent: result.riskEvent,
  };
}

export default function CounselorWorkbench() {
  const { user, isLoggedIn, isAuthSyncing, openLoginModal } = useAuth();
  const [workbench, setWorkbench] = useState<CounselingWorkbench>();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState<string>();

  const canUseWorkbench = Boolean(
    user?.roles.some(role => ["counselor", "operator", "admin"].includes(role))
  );

  const loadWorkbench = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const payload =
        await httpCounselingRepository.loadWorkbenchAppointments();
      setWorkbench(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "咨询师工作台暂时不可用");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthSyncing || !isLoggedIn || !canUseWorkbench) return;
    void loadWorkbench();
  }, [canUseWorkbench, isAuthSyncing, isLoggedIn, loadWorkbench]);

  const records = workbench?.appointments ?? [];
  const visibleRecords = useMemo(
    () => records.filter(record => recordMatchesFilter(record, activeFilter)),
    [activeFilter, records]
  );

  const handleFulfillment = async (
    record: CounselingAppointmentRecord,
    action: FulfillmentAction
  ) => {
    setUpdatingAppointmentId(record.appointment.id);
    try {
      const result = await httpCounselingRepository.fulfillAppointment(
        record.appointment.id,
        { action }
      );
      const nextRecord = resultToRecord(result);
      setWorkbench(previous => {
        if (!previous) return previous;
        const nextAppointments = previous.appointments.map(item =>
          item.appointment.id === nextRecord.appointment.id ? nextRecord : item
        );

        return {
          ...previous,
          appointments: nextAppointments,
          summary: buildSummary(nextAppointments),
        };
      });
      toast(action === "complete_session" ? "已标记完成" : "已标记未到访", {
        description: result.nextSteps[0],
      });
    } catch (err) {
      toast("履约状态更新失败", {
        description:
          err instanceof Error ? err.message : "请稍后刷新工作台后重试",
      });
    } finally {
      setUpdatingAppointmentId(undefined);
    }
  };

  if (!isAuthSyncing && !isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#F8F3EA]">
        <AppHeader />
        <AccessPanel
          icon={ShieldCheck}
          title="登录后进入咨询师工作台"
          description="工作台仅用于处理已分配的咨询预约、服务履约和退款中状态。"
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

  if (!isAuthSyncing && isLoggedIn && !canUseWorkbench) {
    return (
      <div className="min-h-screen bg-[#F8F3EA]">
        <AppHeader />
        <AccessPanel
          icon={AlertCircle}
          title="当前账号暂无工作台权限"
          description="请使用咨询师、运营或管理员账号进入。普通用户可在成长空间查看自己的预约记录。"
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
              咨询师工作台
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[#243B35] md:text-4xl">
              预约处理
            </h1>
            <p className="mt-3 max-w-[680px] text-sm leading-6 text-[#6F7771]">
              查看已分配预约、服务状态、风险提示和退款中订单。
            </p>
          </div>
          <button
            onClick={() => void loadWorkbench()}
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

        <section className="grid border-b border-[#E1D7C8] sm:grid-cols-2 lg:grid-cols-5">
          <SummaryItem
            label="待履约"
            value={workbench?.summary.scheduledCount ?? 0}
            icon={CalendarCheck}
          />
          <SummaryItem
            label="待支付"
            value={workbench?.summary.pendingPaymentCount ?? 0}
            icon={Clock3}
          />
          <SummaryItem
            label="退款中"
            value={workbench?.summary.refundingCount ?? 0}
            icon={RefreshCw}
          />
          <SummaryItem
            label="已完成"
            value={workbench?.summary.completedCount ?? 0}
            icon={CheckCircle2}
          />
          <SummaryItem
            label="未到访"
            value={workbench?.summary.noShowCount ?? 0}
            icon={XCircle}
          />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[248px_1fr]">
          <aside className="h-fit rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-3">
            <div className="flex items-center gap-2 px-2 py-2 text-sm font-semibold text-[#243B35]">
              <ClipboardList className="h-4 w-4 text-[#6F8F83]" />
              状态筛选
            </div>
            <div className="mt-2 space-y-1">
              {filters.map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`flex h-10 w-full items-center justify-between rounded-lg px-3 text-sm transition ${
                    activeFilter === filter.key
                      ? "bg-[#E5ECE1] font-semibold text-[#243B35]"
                      : "text-[#66716A] hover:bg-[#F4EFE7]"
                  }`}
                >
                  <span>{filter.label}</span>
                  <span className="text-xs">
                    {
                      records.filter(record =>
                        recordMatchesFilter(record, filter.key)
                      ).length
                    }
                  </span>
                </button>
              ))}
            </div>
            {workbench?.serverTime && (
              <p className="mt-4 border-t border-[#E9DFD1] px-2 pt-3 text-xs leading-5 text-[#8A8176]">
                更新时间 {formatDate(workbench.serverTime)}
              </p>
            )}
          </aside>

          <div className="min-w-0">
            {error && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-[#EDCDBF] bg-[#FFF4EF] px-4 py-3 text-sm text-[#A65F48]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isLoading && !workbench ? (
              <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] text-sm text-[#6F7771]">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在读取预约
              </div>
            ) : visibleRecords.length === 0 ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-[#D6CBBB] bg-[#FFFDF8]/80 px-6 text-center">
                <CircleDot className="h-8 w-8 text-[#7C9288]" />
                <h2 className="mt-4 text-lg font-semibold text-[#243B35]">
                  暂无对应预约
                </h2>
                <p className="mt-2 max-w-[360px] text-sm leading-6 text-[#6F7771]">
                  切换筛选或刷新后查看最新分配记录。
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleRecords.map((record, index) => {
                  const appointment = record.appointment;
                  const isUpdating = updatingAppointmentId === appointment.id;
                  const canFulfill = appointment.status === "scheduled";

                  return (
                    <motion.article
                      key={appointment.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.28,
                        delay: Math.min(index * 0.025, 0.16),
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-4 shadow-sm shadow-[#243B35]/5 md:p-5"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[appointment.status]}`}
                            >
                              {statusCopy[appointment.status]}
                            </span>
                            {record.order?.status === "refunding" && (
                              <span className="rounded-full bg-[#F8E4DC] px-2.5 py-1 text-xs font-semibold text-[#A65F48]">
                                退款中
                              </span>
                            )}
                            {record.riskEvent && (
                              <span className="rounded-full bg-[#FFF1D4] px-2.5 py-1 text-xs font-semibold text-[#8B6528]">
                                风险关注
                              </span>
                            )}
                          </div>

                          <h2 className="mt-3 truncate text-xl font-semibold text-[#243B35]">
                            {formatDate(record.slot.startsAt)}
                          </h2>
                          <div className="mt-3 grid gap-2 text-sm text-[#66716A] md:grid-cols-2 xl:grid-cols-4">
                            <span className="inline-flex items-center gap-2">
                              <UserRound className="h-4 w-4 text-[#82978D]" />
                              用户 {appointment.userId}
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-[#82978D]" />
                              {record.counselor.name}
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <Video className="h-4 w-4 text-[#82978D]" />
                              {channelCopy[appointment.channel]}
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <Clock3 className="h-4 w-4 text-[#82978D]" />
                              {formatDuration(record)}
                            </span>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {appointment.concernTags.map(tag => (
                              <span
                                key={tag}
                                className="rounded-full bg-[#F1E9DD] px-2.5 py-1 text-xs font-semibold text-[#6D665E]"
                              >
                                {concernTagCopy[tag]}
                              </span>
                            ))}
                          </div>

                          {appointment.noteForCounselor && (
                            <p className="mt-4 max-w-[780px] rounded-lg bg-[#F6F0E8] px-3 py-2 text-sm leading-6 text-[#5F6B64]">
                              {appointment.noteForCounselor}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-col gap-3 xl:w-[220px]">
                          <div className="rounded-lg bg-[#F6F0E8] px-3 py-2 text-sm text-[#66716A]">
                            <span className="block text-xs text-[#8A8176]">
                              订单状态
                            </span>
                            <span className="mt-1 block font-semibold text-[#243B35]">
                              {record.order
                                ? orderStatusCopy[record.order.status]
                                : "未关联"}
                            </span>
                          </div>

                          {canFulfill ? (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() =>
                                  void handleFulfillment(
                                    record,
                                    "complete_session"
                                  )
                                }
                                disabled={isUpdating}
                                title="标记完成"
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#355F51] px-3 text-sm font-semibold text-white transition hover:bg-[#243B35] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isUpdating ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                                完成
                              </button>
                              <button
                                onClick={() =>
                                  void handleFulfillment(record, "mark_no_show")
                                }
                                disabled={isUpdating}
                                title="标记未到访"
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#D8C8BA] bg-[#FFFDF8] px-3 text-sm font-semibold text-[#A65F48] transition hover:bg-[#FFF4EF] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <XCircle className="h-4 w-4" />
                                未到
                              </button>
                            </div>
                          ) : (
                            <span className="inline-flex h-10 items-center justify-center rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] text-sm font-semibold text-[#7D857F]">
                              暂无履约动作
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
