import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  CalendarPlus,
  CalendarX,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  History,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  ToggleLeft,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { userCan } from "@shared/domain";
import { useAuth } from "@/contexts/AuthContext";
import {
  httpCounselingRepository,
  type CounselingAdminScheduleActionRequest,
  type CounselingAdminScheduleConsole,
  type CounselingAdminScheduleSlot,
  type CounselingCancellationPolicy,
  type CounselingChannel,
  type CounselingOperationAuditEvent,
  type CounselingOperationsConsole,
  type CounselingServiceRecord,
  type CounselingServiceRecordAnomalyType,
  type CounselingServiceRecordConsole,
  type CounselingServiceRecordFilter,
} from "@/features/counseling";

const auditActionCopy = {
  cancellation_policy_updated: "更新取消规则",
  complete_session: "标记完成",
  mark_no_show: "标记未到访",
  schedule_slot_added: "新增排班",
  schedule_slot_closed: "关闭排班",
  schedule_slot_restored: "恢复排班",
} satisfies Record<CounselingOperationAuditEvent["action"], string>;

const serviceStatusCopy = {
  active: "可预约",
  full: "已约满",
  paused: "暂停接单",
} as const;

const scheduleStatusCopy = {
  available: "可预约",
  locked: "待支付锁定",
  scheduled: "已预约",
  closed: "已关闭",
} as const;

const scheduleStatusClassName = {
  available: "border-[#BBD0C5] bg-[#EEF6F0] text-[#2F6B54]",
  locked: "border-[#E8D2A1] bg-[#FFF8DF] text-[#8A641C]",
  scheduled: "border-[#C9D5E7] bg-[#EFF4FB] text-[#3B5F8A]",
  closed: "border-[#E3D3CC] bg-[#FFF1EC] text-[#9A5944]",
} satisfies Record<CounselingAdminScheduleSlot["status"], string>;

type ServiceRecordStatusFilter =
  | "all"
  | CounselingServiceRecord["appointmentStatus"];

type ServiceRecordAnomalyFilter = "all" | CounselingServiceRecordAnomalyType;

type ServiceRecordFiltersDraft = {
  counselorId: string;
  appointmentStatus: ServiceRecordStatusFilter;
  anomalyType: ServiceRecordAnomalyFilter;
  keyword: string;
};

const statusCopy = {
  pending_payment: "待支付",
  scheduled: "已预约",
  completed: "已完成",
  cancelled: "已取消",
  no_show: "未到访",
  refunded: "已退款",
} as const;

const orderStatusCopy = {
  created: "已创建",
  pending_payment: "待支付",
  paid: "已支付",
  closed: "已关闭",
  refunding: "退款中",
  refunded: "已退款",
} as const;

const anomalyCopy = {
  payment_hold_expiring: "锁定临近释放",
  payment_hold_expired: "锁定已过期",
  payment_hold_closed: "待支付已关闭",
  upcoming_unconfirmed: "临近未确认",
  cancelled_pending_refund: "取消待退款",
  refunding: "退款中",
  no_show: "未到访",
} satisfies Record<CounselingServiceRecordAnomalyType, string>;

const anomalyClassName = {
  payment_hold_expiring: "border-[#E8D2A1] bg-[#FFF8DF] text-[#8A641C]",
  payment_hold_expired: "border-[#EDCDBF] bg-[#FFF4EF] text-[#A65F48]",
  payment_hold_closed: "border-[#E3D3CC] bg-[#FFF1EC] text-[#9A5944]",
  upcoming_unconfirmed: "border-[#C9D5E7] bg-[#EFF4FB] text-[#3B5F8A]",
  cancelled_pending_refund: "border-[#E8D2A1] bg-[#FFF8DF] text-[#8A641C]",
  refunding: "border-[#E8D2A1] bg-[#FFF8DF] text-[#8A641C]",
  no_show: "border-[#EDCDBF] bg-[#FFF4EF] text-[#A65F48]",
} satisfies Record<CounselingServiceRecordAnomalyType, string>;

const riskLevelCopy = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
  urgent: "紧急",
} as const;

const defaultServiceRecordFilters: ServiceRecordFiltersDraft = {
  counselorId: "all",
  appointmentStatus: "all",
  anomalyType: "all",
  keyword: "",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间待确认";

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function toDateTimeLocalValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function buildDefaultScheduleDraft() {
  const startsAt = new Date();
  startsAt.setDate(startsAt.getDate() + 1);
  startsAt.setHours(10, 0, 0, 0);
  const endsAt = new Date(startsAt.getTime() + 50 * 60 * 1000);

  return {
    counselorId: "",
    startsAt: toDateTimeLocalValue(startsAt),
    endsAt: toDateTimeLocalValue(endsAt),
    channel: "video" as CounselingChannel,
    reason: "",
  };
}

function localInputToIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function toServiceRecordRequestFilters(
  filters: ServiceRecordFiltersDraft
): Partial<CounselingServiceRecordFilter> {
  return {
    counselorId:
      filters.counselorId === "all" ? undefined : filters.counselorId,
    appointmentStatus:
      filters.appointmentStatus === "all"
        ? undefined
        : filters.appointmentStatus,
    anomalyType:
      filters.anomalyType === "all" ? undefined : filters.anomalyType,
    keyword: filters.keyword.trim() || undefined,
    limit: 50,
  };
}

function policyChanged(
  draft: CounselingCancellationPolicy,
  saved?: CounselingCancellationPolicy
) {
  if (!saved) return false;
  return (
    draft.allowPendingPaymentCancellation !==
      saved.allowPendingPaymentCancellation ||
    draft.scheduledRefundCutoffMinutesBeforeStart !==
      saved.scheduledRefundCutoffMinutesBeforeStart
  );
}

function AuditMeta({ event }: { event: CounselingOperationAuditEvent }) {
  if (event.action === "cancellation_policy_updated") {
    return (
      <p className="mt-2 text-sm leading-6 text-[#66716A]">
        预约开始前{" "}
        <span className="font-semibold text-[#243B35]">
          {event.policyBefore?.scheduledRefundCutoffMinutesBeforeStart ?? 0}
        </span>{" "}
        分钟改为{" "}
        <span className="font-semibold text-[#243B35]">
          {event.policyAfter?.scheduledRefundCutoffMinutesBeforeStart ?? 0}
        </span>{" "}
        分钟；待支付取消{" "}
        <span className="font-semibold text-[#243B35]">
          {event.policyAfter?.allowPendingPaymentCancellation ? "允许" : "关闭"}
        </span>
        。
      </p>
    );
  }

  if (event.action.startsWith("schedule_slot_")) {
    return (
      <p className="mt-2 text-sm leading-6 text-[#66716A]">
        咨询师{" "}
        <span className="font-semibold text-[#243B35]">
          {event.counselorId ?? "未记录"}
        </span>{" "}
        的排班已更新。
      </p>
    );
  }

  return (
    <p className="mt-2 text-sm leading-6 text-[#66716A]">
      预约 {event.appointmentId ?? "未记录"} 从{" "}
      <span className="font-semibold text-[#243B35]">
        {event.previousAppointmentStatus
          ? statusCopy[event.previousAppointmentStatus]
          : "未记录"}
      </span>{" "}
      到{" "}
      <span className="font-semibold text-[#243B35]">
        {event.nextAppointmentStatus
          ? statusCopy[event.nextAppointmentStatus]
          : "未记录"}
      </span>
      。
    </p>
  );
}

export default function CounselingOperations() {
  const { user, isLoggedIn, isAuthSyncing } = useAuth();
  const [consoleData, setConsoleData] = useState<CounselingOperationsConsole>();
  const [scheduleConsole, setScheduleConsole] =
    useState<CounselingAdminScheduleConsole>();
  const [serviceRecordConsole, setServiceRecordConsole] =
    useState<CounselingServiceRecordConsole>();
  const [serviceRecordFilters, setServiceRecordFilters] = useState(
    defaultServiceRecordFilters
  );
  const [draftPolicy, setDraftPolicy] = useState<CounselingCancellationPolicy>({
    scheduledRefundCutoffMinutesBeforeStart: 0,
    allowPendingPaymentCancellation: true,
  });
  const [scheduleDraft, setScheduleDraft] = useState(buildDefaultScheduleDraft);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isScheduleSaving, setIsScheduleSaving] = useState(false);
  const [isServiceRecordsLoading, setIsServiceRecordsLoading] = useState(false);
  const [scheduleActionSlotId, setScheduleActionSlotId] = useState<string>();
  const [error, setError] = useState<string>();

  const canManageOperations = Boolean(user && userCan(user, "admin:manage"));
  const hasChanges = useMemo(
    () => policyChanged(draftPolicy, consoleData?.cancellationPolicy),
    [consoleData?.cancellationPolicy, draftPolicy]
  );
  const scheduleTotals = useMemo(() => {
    const schedules = scheduleConsole?.counselors ?? [];
    return schedules.reduce(
      (totals, schedule) => ({
        available: totals.available + schedule.summary.availableCount,
        locked: totals.locked + schedule.summary.lockedCount,
        scheduled: totals.scheduled + schedule.summary.scheduledCount,
        closed: totals.closed + schedule.summary.closedCount,
      }),
      { available: 0, locked: 0, scheduled: 0, closed: 0 }
    );
  }, [scheduleConsole?.counselors]);
  const serviceRecordCounselors = useMemo(
    () =>
      serviceRecordConsole?.counselors ??
      scheduleConsole?.counselors.map(schedule => schedule.counselor) ??
      [],
    [scheduleConsole?.counselors, serviceRecordConsole?.counselors]
  );

  const loadServiceRecords = useCallback(
    async (filters: ServiceRecordFiltersDraft) => {
      setIsServiceRecordsLoading(true);
      setError(undefined);
      try {
        const payload = await httpCounselingRepository.loadServiceRecords(
          toServiceRecordRequestFilters(filters)
        );
        setServiceRecordConsole(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "咨询服务记录暂时不可用");
      } finally {
        setIsServiceRecordsLoading(false);
      }
    },
    []
  );

  const loadConsole = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const [payload, schedules] = await Promise.all([
        httpCounselingRepository.loadOperationsConsole(),
        httpCounselingRepository.loadAdminSchedules(),
      ]);
      setConsoleData(payload);
      setScheduleConsole(schedules);
      setDraftPolicy(payload.cancellationPolicy);
      setScheduleDraft(previous => ({
        ...previous,
        counselorId:
          previous.counselorId || schedules.counselors[0]?.counselor.id || "",
      }));
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "咨询运营配置暂时不可用");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthSyncing || !isLoggedIn || !canManageOperations) return;
    void loadConsole();
    void loadServiceRecords(defaultServiceRecordFilters);
  }, [
    canManageOperations,
    isAuthSyncing,
    isLoggedIn,
    loadConsole,
    loadServiceRecords,
  ]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(undefined);
    try {
      const result = await httpCounselingRepository.updateCancellationPolicy({
        policy: draftPolicy,
        reason: reason.trim() || undefined,
      });
      setConsoleData(previous => ({
        cancellationPolicy: result.cancellationPolicy,
        auditEvents: [
          result.auditEvent,
          ...(previous?.auditEvents ?? []).filter(
            event => event.id !== result.auditEvent.id
          ),
        ],
        serverTime: result.serverTime,
      }));
      setDraftPolicy(result.cancellationPolicy);
      setReason("");
      toast("取消规则已保存", {
        description: "新的取消策略会立即用于后续用户取消操作",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "取消规则暂时无法保存";
      setError(message);
      toast("保存失败", { description: message });
    } finally {
      setIsSaving(false);
    }
  };

  const syncScheduleAudit = useCallback(
    (auditEvent?: CounselingOperationAuditEvent) => {
      if (!auditEvent) return;
      setConsoleData(previous =>
        previous
          ? {
              ...previous,
              auditEvents: [
                auditEvent,
                ...previous.auditEvents.filter(
                  event => event.id !== auditEvent.id
                ),
              ],
            }
          : previous
      );
    },
    []
  );

  const handleScheduleAction = useCallback(
    async (
      request: CounselingAdminScheduleActionRequest,
      pendingSlotId = "new"
    ) => {
      setIsScheduleSaving(true);
      setScheduleActionSlotId(pendingSlotId);
      setError(undefined);
      try {
        const result =
          await httpCounselingRepository.updateAdminSchedule(request);
        setScheduleConsole(result.scheduleConsole);
        syncScheduleAudit(result.auditEvent);
        if (request.action === "add_available_slot") {
          setScheduleDraft(previous => ({ ...previous, reason: "" }));
        }
        toast(
          request.action === "add_available_slot"
            ? "排班已新增"
            : request.action === "close_slot"
              ? "时段已关闭"
              : "时段已恢复",
          {
            description: "咨询师排班状态已同步到运营看板",
          }
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "咨询排班暂时无法保存";
        setError(message);
        toast("排班保存失败", { description: message });
      } finally {
        setIsScheduleSaving(false);
        setScheduleActionSlotId(undefined);
      }
    },
    [syncScheduleAudit]
  );

  const handleAddScheduleSlot = useCallback(() => {
    const startsAt = localInputToIso(scheduleDraft.startsAt);
    const endsAt = localInputToIso(scheduleDraft.endsAt);
    if (!scheduleDraft.counselorId || !startsAt || !endsAt) {
      const message = "请完整填写咨询师和排班时间";
      setError(message);
      toast("排班保存失败", { description: message });
      return;
    }

    void handleScheduleAction(
      {
        action: "add_available_slot",
        counselorId: scheduleDraft.counselorId,
        startsAt,
        endsAt,
        channel: scheduleDraft.channel,
        reason: scheduleDraft.reason.trim() || undefined,
      },
      "new"
    );
  }, [handleScheduleAction, scheduleDraft]);

  if (isAuthSyncing || !isLoggedIn || !canManageOperations) {
    return null;
  }

  return (
    <div className="text-[#243B35]">
      <section className="flex flex-col gap-4 border-b border-[#E1D7C8] pb-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B7E6D]">
            咨询运营配置
          </p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
            排班、规则与审计
          </h1>
          <p className="mt-3 max-w-[700px] text-sm leading-6 text-[#6F7771]">
            维护咨询师可预约时段，配置取消规则，查看规则变更和履约处理记录。
          </p>
        </div>
        <button
          onClick={() => {
            void loadConsole();
            void loadServiceRecords(serviceRecordFilters);
          }}
          disabled={isLoading || isSaving || isServiceRecordsLoading}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-lg border border-[#CFC4B5] bg-[#FFFDF8] px-4 text-sm font-semibold text-[#355F51] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading || isServiceRecordsLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          刷新
        </button>
      </section>

      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-[#EDCDBF] bg-[#FFF4EF] px-4 py-3 text-sm text-[#A65F48]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="mt-6 grid gap-6 xl:grid-cols-[360px_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="h-fit rounded-lg border border-[#D7CBB9] bg-[#FFFDF8] p-5 shadow-sm shadow-[#243B35]/5"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-[#243B35]">
            <CalendarPlus className="h-4 w-4 text-[#6F8F83]" />
            新增可预约时段
          </div>

          <label className="mt-5 block text-sm font-semibold text-[#40534B]">
            咨询师
          </label>
          <select
            value={scheduleDraft.counselorId}
            onChange={event =>
              setScheduleDraft(previous => ({
                ...previous,
                counselorId: event.target.value,
              }))
            }
            className="mt-2 h-10 w-full rounded-lg border border-[#D8CDBC] bg-white px-3 text-sm font-semibold text-[#243B35] outline-none transition focus:border-[#6F8F83]"
          >
            {(scheduleConsole?.counselors ?? []).map(schedule => (
              <option key={schedule.counselor.id} value={schedule.counselor.id}>
                {schedule.counselor.name} ·{" "}
                {serviceStatusCopy[schedule.serviceStatus]}
              </option>
            ))}
          </select>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <label className="block text-sm font-semibold text-[#40534B]">
              开始时间
              <input
                type="datetime-local"
                value={scheduleDraft.startsAt}
                onChange={event =>
                  setScheduleDraft(previous => ({
                    ...previous,
                    startsAt: event.target.value,
                  }))
                }
                className="mt-2 h-10 w-full rounded-lg border border-[#D8CDBC] bg-white px-3 text-sm font-semibold text-[#243B35] outline-none transition focus:border-[#6F8F83]"
              />
            </label>
            <label className="block text-sm font-semibold text-[#40534B]">
              结束时间
              <input
                type="datetime-local"
                value={scheduleDraft.endsAt}
                onChange={event =>
                  setScheduleDraft(previous => ({
                    ...previous,
                    endsAt: event.target.value,
                  }))
                }
                className="mt-2 h-10 w-full rounded-lg border border-[#D8CDBC] bg-white px-3 text-sm font-semibold text-[#243B35] outline-none transition focus:border-[#6F8F83]"
              />
            </label>
          </div>

          <label className="mt-4 block text-sm font-semibold text-[#40534B]">
            咨询渠道
          </label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              ["video", "视频"],
              ["voice", "语音"],
              ["offline", "线下"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setScheduleDraft(previous => ({
                    ...previous,
                    channel: value as CounselingChannel,
                  }))
                }
                className={`h-9 rounded-lg border text-sm font-semibold transition ${
                  scheduleDraft.channel === value
                    ? "border-[#6F8F83] bg-[#E5ECE1] text-[#355F51]"
                    : "border-[#D8CDBC] bg-white text-[#66716A] hover:border-[#AAB9AF]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="mt-4 block text-sm font-semibold text-[#40534B]">
            备注
          </label>
          <textarea
            value={scheduleDraft.reason}
            onChange={event =>
              setScheduleDraft(previous => ({
                ...previous,
                reason: event.target.value,
              }))
            }
            maxLength={200}
            rows={3}
            placeholder="例如：节后新增晚间咨询窗口"
            className="mt-2 w-full resize-none rounded-lg border border-[#D8CDBC] bg-white px-3 py-2 text-sm leading-6 text-[#243B35] outline-none transition placeholder:text-[#AAA197] focus:border-[#6F8F83]"
          />

          <button
            onClick={handleAddScheduleSlot}
            disabled={
              isScheduleSaving ||
              isLoading ||
              !scheduleDraft.counselorId ||
              scheduleActionSlotId === "new"
            }
            className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#355F51] px-4 text-sm font-semibold text-white transition hover:bg-[#243B35] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isScheduleSaving && scheduleActionSlotId === "new" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarPlus className="h-4 w-4" />
            )}
            保存时段
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.32,
            delay: 0.03,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="min-w-0 rounded-lg border border-[#D7CBB9] bg-[#FFFDF8] p-5 shadow-sm shadow-[#243B35]/5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8DED0] pb-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CalendarClock className="h-4 w-4 text-[#6F8F83]" />
              未来排班
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-[#E5ECE1] px-2.5 py-1 text-[#41675A]">
                可约 {scheduleTotals.available}
              </span>
              <span className="rounded-full bg-[#EFF4FB] px-2.5 py-1 text-[#3B5F8A]">
                已约 {scheduleTotals.scheduled}
              </span>
              <span className="rounded-full bg-[#FFF8DF] px-2.5 py-1 text-[#8A641C]">
                锁定 {scheduleTotals.locked}
              </span>
              <span className="rounded-full bg-[#FFF1EC] px-2.5 py-1 text-[#9A5944]">
                关闭 {scheduleTotals.closed}
              </span>
            </div>
          </div>

          {isLoading && !scheduleConsole ? (
            <div className="flex min-h-[360px] items-center justify-center text-sm text-[#6F7771]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              正在读取排班
            </div>
          ) : scheduleConsole ? (
            <div className="mt-5 grid gap-4 2xl:grid-cols-2">
              {scheduleConsole.counselors.map(schedule => (
                <article
                  key={schedule.counselor.id}
                  className="rounded-lg border border-[#E6DDD0] bg-[#FFFCF6] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-[#243B35]">
                          {schedule.counselor.name}
                        </h2>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            schedule.serviceStatus === "active"
                              ? "bg-[#E5ECE1] text-[#41675A]"
                              : schedule.serviceStatus === "full"
                                ? "bg-[#EFF4FB] text-[#3B5F8A]"
                                : "bg-[#F1E9DD] text-[#8B7E6D]"
                          }`}
                        >
                          {serviceStatusCopy[schedule.serviceStatus]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#8A8176]">
                        {schedule.counselor.title}
                      </p>
                    </div>
                    <div className="text-right text-xs leading-5 text-[#66716A]">
                      <p>可约 {schedule.summary.availableCount}</p>
                      <p>
                        锁定/已约{" "}
                        {schedule.summary.lockedCount +
                          schedule.summary.scheduledCount}
                      </p>
                    </div>
                  </div>

                  {schedule.nextAvailableAt && (
                    <p className="mt-3 rounded-lg bg-[#F3EEE5] px-3 py-2 text-xs font-semibold text-[#5F6B64]">
                      最近可约 {formatDate(schedule.nextAvailableAt)}
                    </p>
                  )}

                  <div className="mt-3 grid gap-2">
                    {schedule.slots.length ? (
                      schedule.slots.slice(0, 8).map(slot => {
                        const canClose = slot.status === "available";
                        const canRestore = slot.status === "closed";
                        const isPending = scheduleActionSlotId === slot.id;

                        return (
                          <div
                            key={slot.id}
                            className="rounded-lg border border-[#E8DED0] bg-white px-3 py-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#243B35]">
                                  {formatDate(slot.startsAt)} ·{" "}
                                  {slot.channel === "video"
                                    ? "视频"
                                    : slot.channel === "voice"
                                      ? "语音"
                                      : "线下"}
                                </p>
                                {slot.conflictHint && (
                                  <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                                    {slot.conflictHint}
                                  </p>
                                )}
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <span
                                  className={`rounded-full border px-2 py-1 text-xs font-semibold ${scheduleStatusClassName[slot.status]}`}
                                >
                                  {scheduleStatusCopy[slot.status]}
                                </span>
                                {(canClose || canRestore) && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleScheduleAction(
                                        canClose
                                          ? {
                                              action: "close_slot",
                                              slotId: slot.id,
                                            }
                                          : {
                                              action: "restore_slot",
                                              slotId: slot.id,
                                            },
                                        slot.id
                                      )
                                    }
                                    disabled={isScheduleSaving}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#D8CDBC] bg-[#FFFDF8] text-[#355F51] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-55"
                                    title={canClose ? "关闭时段" : "恢复时段"}
                                  >
                                    {isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : canClose ? (
                                      <CalendarX className="h-4 w-4" />
                                    ) : (
                                      <RotateCcw className="h-4 w-4" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-lg border border-dashed border-[#D8CDBC] px-3 py-6 text-center text-sm text-[#8A8176]">
                        暂无未来排班
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[360px] items-center justify-center text-sm text-[#6F7771]">
              暂无排班数据
            </div>
          )}
        </motion.div>
      </section>

      <section className="mt-6 rounded-lg border border-[#D7CBB9] bg-[#FFFDF8] p-5 shadow-sm shadow-[#243B35]/5">
        <div className="flex flex-col gap-4 border-b border-[#E8DED0] pb-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#243B35]">
              <FileSearch className="h-4 w-4 text-[#6F8F83]" />
              服务记录与履约异常
            </div>
            <p className="mt-2 max-w-[720px] text-xs leading-5 text-[#7A827C]">
              仅展示运营所需的预约、订单、风险等级和审计摘要，不展示咨询说明、测评答案或风险信号原文。
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:w-[620px] xl:grid-cols-[1fr_1fr_1fr_auto]">
            <select
              value={serviceRecordFilters.counselorId}
              onChange={event =>
                setServiceRecordFilters(previous => ({
                  ...previous,
                  counselorId: event.target.value,
                }))
              }
              className="h-10 rounded-lg border border-[#D8CDBC] bg-white px-3 text-sm font-semibold text-[#243B35] outline-none transition focus:border-[#6F8F83]"
            >
              <option value="all">全部咨询师</option>
              {serviceRecordCounselors.map(counselor => (
                <option key={counselor.id} value={counselor.id}>
                  {counselor.name}
                </option>
              ))}
            </select>
            <select
              value={serviceRecordFilters.appointmentStatus}
              onChange={event =>
                setServiceRecordFilters(previous => ({
                  ...previous,
                  appointmentStatus: event.target
                    .value as ServiceRecordStatusFilter,
                }))
              }
              className="h-10 rounded-lg border border-[#D8CDBC] bg-white px-3 text-sm font-semibold text-[#243B35] outline-none transition focus:border-[#6F8F83]"
            >
              <option value="all">全部状态</option>
              {Object.entries(statusCopy).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={serviceRecordFilters.anomalyType}
              onChange={event =>
                setServiceRecordFilters(previous => ({
                  ...previous,
                  anomalyType: event.target.value as ServiceRecordAnomalyFilter,
                }))
              }
              className="h-10 rounded-lg border border-[#D8CDBC] bg-white px-3 text-sm font-semibold text-[#243B35] outline-none transition focus:border-[#6F8F83]"
            >
              <option value="all">全部异常</option>
              {Object.entries(anomalyCopy).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void loadServiceRecords(serviceRecordFilters)}
              disabled={isServiceRecordsLoading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#355F51] px-4 text-sm font-semibold text-white transition hover:bg-[#243B35] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isServiceRecordsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              筛选
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-[#E5ECE1] px-2.5 py-1 text-[#41675A]">
              记录 {serviceRecordConsole?.summary.totalCount ?? 0}
            </span>
            <span className="rounded-full bg-[#FFF4EF] px-2.5 py-1 text-[#A65F48]">
              异常 {serviceRecordConsole?.summary.anomalyCount ?? 0}
            </span>
            <span className="rounded-full bg-[#FFF8DF] px-2.5 py-1 text-[#8A641C]">
              待支付临近{" "}
              {serviceRecordConsole?.summary.paymentHoldExpiringCount ?? 0}
            </span>
            <span className="rounded-full bg-[#EFF4FB] px-2.5 py-1 text-[#3B5F8A]">
              未到访 {serviceRecordConsole?.summary.noShowCount ?? 0}
            </span>
            <span className="rounded-full bg-[#F1E9DD] px-2.5 py-1 text-[#7B6F61]">
              待退款 {serviceRecordConsole?.summary.refundingCount ?? 0}
            </span>
          </div>
          <label className="relative block md:w-[320px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8176]" />
            <input
              value={serviceRecordFilters.keyword}
              onChange={event =>
                setServiceRecordFilters(previous => ({
                  ...previous,
                  keyword: event.target.value,
                }))
              }
              onKeyDown={event => {
                if (event.key === "Enter") {
                  void loadServiceRecords(serviceRecordFilters);
                }
              }}
              placeholder="搜索预约、订单、用户 ID"
              className="h-10 w-full rounded-lg border border-[#D8CDBC] bg-white pl-9 pr-3 text-sm font-semibold text-[#243B35] outline-none transition placeholder:text-[#AAA197] focus:border-[#6F8F83]"
            />
          </label>
        </div>

        {isServiceRecordsLoading && !serviceRecordConsole ? (
          <div className="mt-5 flex min-h-[240px] items-center justify-center text-sm text-[#6F7771]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            正在读取服务记录
          </div>
        ) : serviceRecordConsole?.records.length ? (
          <div className="mt-5 divide-y divide-[#E8DED0]">
            {serviceRecordConsole.records.map((record, index) => (
              <motion.article
                key={record.appointmentId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.22,
                  delay: Math.min(index * 0.02, 0.12),
                }}
                className="grid gap-3 py-4 xl:grid-cols-[minmax(220px,1.15fr)_minmax(260px,1.35fr)_minmax(220px,1fr)]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F1E9DD] text-[#6F8F83]">
                      {record.anomalies.length ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <UserCheck className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#243B35]">
                        {record.counselorName} · {formatDate(record.startsAt)}
                      </p>
                      <p className="mt-1 truncate text-xs text-[#8A8176]">
                        {record.appointmentId} · 用户 {record.userId}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#E5ECE1] px-2.5 py-1 text-xs font-semibold text-[#41675A]">
                      {statusCopy[record.appointmentStatus]}
                    </span>
                    {record.orderStatus && (
                      <span className="rounded-full bg-[#F3EEE5] px-2.5 py-1 text-xs font-semibold text-[#6F675E]">
                        {orderStatusCopy[record.orderStatus]}
                      </span>
                    )}
                    {record.riskLevel && (
                      <span className="rounded-full bg-[#EFF4FB] px-2.5 py-1 text-xs font-semibold text-[#3B5F8A]">
                        {riskLevelCopy[record.riskLevel]}
                      </span>
                    )}
                    {record.anomalies.map(anomaly => (
                      <span
                        key={anomaly}
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${anomalyClassName[anomaly]}`}
                      >
                        {anomalyCopy[anomaly]}
                      </span>
                    ))}
                  </div>
                  {record.operationHint && (
                    <p className="mt-2 text-xs leading-5 text-[#7A827C]">
                      {record.operationHint}
                    </p>
                  )}
                </div>

                <div className="grid gap-1 text-xs leading-5 text-[#66716A] xl:text-right">
                  <p>
                    渠道{" "}
                    <span className="font-semibold text-[#243B35]">
                      {record.channel === "video"
                        ? "视频"
                        : record.channel === "voice"
                          ? "语音"
                          : "线下"}
                    </span>
                  </p>
                  {typeof record.minutesUntilStart === "number" && (
                    <p>
                      距开始{" "}
                      <span className="font-semibold text-[#243B35]">
                        {record.minutesUntilStart >= 0
                          ? `${record.minutesUntilStart} 分钟`
                          : "已开始"}
                      </span>
                    </p>
                  )}
                  {record.latestAuditAction && (
                    <p>
                      最近审计{" "}
                      <span className="font-semibold text-[#243B35]">
                        {auditActionCopy[record.latestAuditAction]}
                      </span>
                    </p>
                  )}
                </div>
              </motion.article>
            ))}
          </div>
        ) : (
          <div className="mt-5 flex min-h-[240px] flex-col items-center justify-center px-6 text-center">
            <FileSearch className="h-8 w-8 text-[#7C9288]" />
            <h2 className="mt-4 text-lg font-semibold">暂无服务记录</h2>
            <p className="mt-2 max-w-[360px] text-sm leading-6 text-[#6F7771]">
              当前筛选条件下没有预约履约记录，调整筛选后再查看。
            </p>
          </div>
        )}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="h-fit rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-sm shadow-[#243B35]/5"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-[#243B35]">
            <SlidersHorizontal className="h-4 w-4 text-[#6F8F83]" />
            取消规则
          </div>

          <label className="mt-5 block text-sm font-semibold text-[#40534B]">
            已确认预约可取消截止时间
          </label>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="number"
              min={0}
              step={15}
              value={draftPolicy.scheduledRefundCutoffMinutesBeforeStart}
              onChange={event =>
                setDraftPolicy(previous => ({
                  ...previous,
                  scheduledRefundCutoffMinutesBeforeStart: Math.max(
                    0,
                    Number(event.target.value) || 0
                  ),
                }))
              }
              className="h-10 w-32 rounded-lg border border-[#D8CDBC] bg-white px-3 text-sm font-semibold text-[#243B35] outline-none transition focus:border-[#6F8F83]"
            />
            <span className="text-sm text-[#66716A]">分钟前</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#8A8176]">
            超过该时间后，用户取消会被拦截并提示联系平台支持。
          </p>

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-[#E6DDD0] bg-[#F8F3EA] px-3 py-3">
            <input
              type="checkbox"
              checked={draftPolicy.allowPendingPaymentCancellation}
              onChange={event =>
                setDraftPolicy(previous => ({
                  ...previous,
                  allowPendingPaymentCancellation: event.target.checked,
                }))
              }
              className="mt-1 h-4 w-4 accent-[#355F51]"
            />
            <span>
              <span className="flex items-center gap-2 text-sm font-semibold text-[#243B35]">
                <ToggleLeft className="h-4 w-4 text-[#6F8F83]" />
                允许待支付预约取消
              </span>
              <span className="mt-1 block text-xs leading-5 text-[#8A8176]">
                关闭后，待支付预约只能等待超时释放或由运营介入。
              </span>
            </span>
          </label>

          <label className="mt-5 block text-sm font-semibold text-[#40534B]">
            变更原因
          </label>
          <textarea
            value={reason}
            onChange={event => setReason(event.target.value)}
            maxLength={200}
            rows={3}
            placeholder="例如：节假日前临时调整取消规则"
            className="mt-2 w-full resize-none rounded-lg border border-[#D8CDBC] bg-white px-3 py-2 text-sm leading-6 text-[#243B35] outline-none transition placeholder:text-[#AAA197] focus:border-[#6F8F83]"
          />

          <button
            onClick={() => void handleSave()}
            disabled={isSaving || !hasChanges}
            className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#355F51] px-4 text-sm font-semibold text-white transition hover:bg-[#243B35] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            保存规则
          </button>

          {consoleData?.serverTime && (
            <p className="mt-4 text-xs text-[#8A8176]">
              当前配置读取于 {formatDate(consoleData.serverTime)}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.34,
            delay: 0.04,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="min-w-0 rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-sm shadow-[#243B35]/5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8DED0] pb-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <History className="h-4 w-4 text-[#6F8F83]" />
              审计流水
            </div>
            <span className="rounded-full bg-[#E5ECE1] px-2.5 py-1 text-xs font-semibold text-[#41675A]">
              {consoleData?.auditEvents.length ?? 0} 条
            </span>
          </div>

          {isLoading && !consoleData ? (
            <div className="flex min-h-[360px] items-center justify-center text-sm text-[#6F7771]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              正在读取审计流水
            </div>
          ) : consoleData?.auditEvents.length ? (
            <div className="divide-y divide-[#E8DED0]">
              {consoleData.auditEvents.map((event, index) => (
                <motion.article
                  key={event.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.24,
                    delay: Math.min(index * 0.025, 0.16),
                  }}
                  className="py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F1E9DD] text-[#6F8F83]">
                        {event.action === "cancellation_policy_updated" ? (
                          <ClipboardList className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#243B35]">
                          {auditActionCopy[event.action]}
                        </p>
                        <p className="mt-1 text-xs text-[#8A8176]">
                          {event.actorId} · {event.actorRoles.join(" / ")}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-[#8A8176]">
                      {formatDate(event.createdAt)}
                    </span>
                  </div>
                  <AuditMeta event={event} />
                  {event.note && (
                    <p className="mt-2 rounded-lg bg-[#F8F3EA] px-3 py-2 text-sm leading-6 text-[#5F6B64]">
                      {event.note}
                    </p>
                  )}
                </motion.article>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
              <History className="h-8 w-8 text-[#7C9288]" />
              <h2 className="mt-4 text-lg font-semibold">暂无审计记录</h2>
              <p className="mt-2 max-w-[360px] text-sm leading-6 text-[#6F7771]">
                保存规则或处理履约后，这里会显示最近操作。
              </p>
            </div>
          )}
        </motion.div>
      </section>
    </div>
  );
}
