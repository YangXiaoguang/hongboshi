import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  History,
  Loader2,
  RefreshCw,
  Save,
  SlidersHorizontal,
  ToggleLeft,
} from "lucide-react";
import { toast } from "sonner";
import { userCan } from "@shared/domain";
import { useAuth } from "@/contexts/AuthContext";
import {
  httpCounselingRepository,
  type CounselingCancellationPolicy,
  type CounselingOperationAuditEvent,
  type CounselingOperationsConsole,
} from "@/features/counseling";

const auditActionCopy = {
  cancellation_policy_updated: "更新取消规则",
  complete_session: "标记完成",
  mark_no_show: "标记未到访",
} satisfies Record<CounselingOperationAuditEvent["action"], string>;

const statusCopy = {
  pending_payment: "待支付",
  scheduled: "已预约",
  completed: "已完成",
  cancelled: "已取消",
  no_show: "未到访",
  refunded: "已退款",
} as const;

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
  const [draftPolicy, setDraftPolicy] = useState<CounselingCancellationPolicy>({
    scheduledRefundCutoffMinutesBeforeStart: 0,
    allowPendingPaymentCancellation: true,
  });
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();

  const canManageOperations = Boolean(user && userCan(user, "admin:manage"));
  const hasChanges = useMemo(
    () => policyChanged(draftPolicy, consoleData?.cancellationPolicy),
    [consoleData?.cancellationPolicy, draftPolicy]
  );

  const loadConsole = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const payload = await httpCounselingRepository.loadOperationsConsole();
      setConsoleData(payload);
      setDraftPolicy(payload.cancellationPolicy);
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
  }, [canManageOperations, isAuthSyncing, isLoggedIn, loadConsole]);

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
            规则与审计
          </h1>
          <p className="mt-3 max-w-[700px] text-sm leading-6 text-[#6F7771]">
            配置用户取消规则，查看规则变更和履约处理记录。
          </p>
        </div>
        <button
          onClick={() => void loadConsole()}
          disabled={isLoading || isSaving}
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
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

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
