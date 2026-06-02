import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  Loader2,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
  Video,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import AppFooter from "@/components/AppFooter";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import {
  getTopAssessmentDimensions,
  useLatestAssessmentResult,
  type AssessmentDimension,
  type AssessmentResult,
} from "@/features/assessments";
import {
  COUNSELING_PAYMENT_HOLD_MINUTES,
  getCounselingPaymentDeadline,
  useCounselingAppointments,
  useCounselingIntake,
  type Counselor,
  type CounselingAppointmentActionResult,
  type CounselorSpecialty,
  type CounselingChannel,
  type CounselingConcernTag,
  type CounselingSlot,
  type CounselingUrgency,
} from "@/features/counseling";

const specialtyCopy = {
  emotion: "情绪压力",
  relationship: "亲密关系",
  family: "家庭沟通",
  adolescent: "青少年",
  workplace: "职场耗竭",
  trauma: "创伤支持",
  personal_growth: "自我成长",
} satisfies Record<CounselorSpecialty, string>;

const channelCopy = {
  video: { label: "视频咨询", icon: Video },
  voice: { label: "语音咨询", icon: MessageCircle },
  offline: { label: "线下咨询", icon: HeartHandshake },
} satisfies Record<CounselingChannel, { label: string; icon: typeof Video }>;

const concernOptions = [
  { tag: "emotion", label: "情绪低落", detail: "焦虑、低落、易崩溃" },
  { tag: "sleep", label: "睡眠焦虑", detail: "入睡困难、早醒、疲惫" },
  { tag: "relationship", label: "关系困扰", detail: "伴侣、婚姻、亲密关系" },
  { tag: "family", label: "家庭沟通", detail: "亲子、原生家庭、照护压力" },
  { tag: "adolescent", label: "青少年", detail: "学习压力、亲子冲突" },
  { tag: "workplace", label: "职场耗竭", detail: "内耗、边界、职业转型" },
  { tag: "self_growth", label: "自我成长", detail: "自我怀疑、方向感" },
  { tag: "crisis", label: "危机支持", detail: "强烈危险感或自伤念头" },
] satisfies Array<{
  tag: CounselingConcernTag;
  label: string;
  detail: string;
}>;

const urgencyOptions = [
  { value: "this_week", label: "本周内", detail: "适合需要尽快梳理的问题" },
  {
    value: "within_24h",
    label: "24 小时内",
    detail: "状态波动明显，需要优先安排",
  },
  { value: "flexible", label: "时间灵活", detail: "希望匹配合适咨询师" },
  { value: "immediate", label: "即时支持", detail: "存在明显危险或失控感" },
] satisfies Array<{
  value: CounselingUrgency;
  label: string;
  detail: string;
}>;

const dimensionConcernMap = {
  emotion: "emotion",
  sleep: "sleep",
  relationship: "relationship",
  parent_child: "family",
  workplace: "workplace",
  self_growth: "self_growth",
  risk: "crisis",
} satisfies Record<AssessmentDimension, CounselingConcernTag>;

const concernSpecialtyMap: Partial<
  Record<CounselingConcernTag, CounselorSpecialty>
> = {
  emotion: "emotion",
  relationship: "relationship",
  family: "family",
  adolescent: "adolescent",
  workplace: "workplace",
  self_growth: "personal_growth",
};

function formatSlot(slot: CounselingSlot) {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return formatter.format(new Date(slot.startsAt));
}

function slotDuration(slot: CounselingSlot) {
  const minutes = Math.round(
    (Date.parse(slot.endsAt) - Date.parse(slot.startsAt)) / 60000
  );
  return `${minutes} 分钟`;
}

function formatNextSlot(slot?: CounselingSlot) {
  return slot ? formatSlot(slot) : "等待排班";
}

function nextAvailableSlot(slots: CounselingSlot[]) {
  return [...slots].sort(
    (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)
  )[0];
}

function counselorInitial(name: string) {
  return Array.from(name.trim())[0] ?? "咨";
}

function matchedSpecialtyLabels(
  counselor: Counselor,
  tags: CounselingConcernTag[]
) {
  const matched = tags
    .map(tag => concernSpecialtyMap[tag])
    .filter((specialty): specialty is CounselorSpecialty =>
      Boolean(specialty && counselor.specialties.includes(specialty))
    );
  const labels = (matched.length ? matched : counselor.specialties.slice(0, 2))
    .map(specialty => specialtyCopy[specialty])
    .filter((label, index, labels) => labels.indexOf(label) === index);

  return labels.length ? labels : ["适合进一步沟通"];
}

function counselorFallbackCopy(counselor: Counselor) {
  const specialtyLabels = counselor.specialties
    .slice(0, 2)
    .map(specialty => specialtyCopy[specialty])
    .join("、");

  return {
    training:
      counselor.trainingSummary ??
      `${counselor.licenseSummary}，持续接受专业训练和督导。`,
    style:
      counselor.serviceStyle ??
      "咨询节奏稳定，重视安全感、目标共识和每次会谈后的可执行行动。",
    ideal:
      counselor.idealClientDescription ??
      `适合正在经历${specialtyLabels || "情绪压力"}，希望有人陪同梳理问题、降低内耗并建立行动路径的来访者。`,
  };
}

function getAssessmentPrefill(result: AssessmentResult | undefined) {
  if (!result) return undefined;

  const concernTags = getTopAssessmentDimensions(result)
    .map(dimension => dimensionConcernMap[dimension])
    .filter((tag, index, tags) => tags.indexOf(tag) === index);
  const withRisk =
    result.report.riskLevel === "urgent"
      ? [...concernTags, "crisis" as const]
      : concernTags;

  return {
    assessmentReportId: result.report.id,
    assessmentRiskLevel: result.report.riskLevel,
    concernTags: withRisk.length ? withRisk : ["emotion" as const],
    urgency:
      result.report.riskLevel === "urgent"
        ? ("immediate" as const)
        : result.report.riskLevel === "high"
          ? ("within_24h" as const)
          : ("this_week" as const),
  };
}

function counselorScore(counselor: Counselor, tags: CounselingConcernTag[]) {
  return tags.reduce((score, tag) => {
    const specialty = concernSpecialtyMap[tag];
    return specialty && counselor.specialties.includes(specialty)
      ? score + 1
      : score;
  }, 0);
}

export default function Consulting() {
  const [, navigate] = useLocation();
  const { isLoggedIn, isAuthSyncing, openLoginModal } = useAuth();
  const {
    availability,
    draft,
    selectedCounselor,
    selectedSlot,
    slotsForSelectedCounselor,
    result: appointmentResult,
    isLoading,
    isSubmitting,
    error,
    updateDraft,
    toggleConcernTag,
    submit,
  } = useCounselingIntake();
  const {
    appointments,
    updateAppointment,
    updatingAppointmentId,
    error: appointmentListError,
  } = useCounselingAppointments(isLoggedIn && !isAuthSyncing);
  const [appointmentActionResult, setAppointmentActionResult] =
    useState<CounselingAppointmentActionResult>();
  const {
    result: latestAssessment,
    source: latestAssessmentSource,
    isLoading: isLatestAssessmentLoading,
  } = useLatestAssessmentResult(isLoggedIn && !isAuthSyncing);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("source") !== "assessment") return;

    const prefill = getAssessmentPrefill(latestAssessment);
    if (prefill) updateDraft(prefill);
  }, [latestAssessment, updateDraft]);

  useEffect(() => {
    setAppointmentActionResult(undefined);
  }, [appointmentResult?.appointment.id]);

  useEffect(() => {
    const counselorId = new URLSearchParams(window.location.search).get(
      "counselorId"
    );
    if (!counselorId || !availability || draft.counselorId === counselorId) {
      return;
    }

    const counselor = availability.counselors.find(
      item => item.id === counselorId
    );
    if (!counselor) return;

    const firstSlot = availability.slots.find(
      slot => slot.counselorId === counselorId && slot.available
    );
    updateDraft({
      counselorId,
      slotId: firstSlot?.id,
      channel: firstSlot?.channel,
    });
  }, [availability, draft.counselorId, updateDraft]);

  const counselors = useMemo(() => {
    return [...(availability?.counselors ?? [])].sort(
      (a, b) =>
        counselorScore(b, draft.concernTags) -
          counselorScore(a, draft.concernTags) ||
        b.yearsOfPractice - a.yearsOfPractice
    );
  }, [availability?.counselors, draft.concernTags]);
  const slotSummaryByCounselor = useMemo(() => {
    const summary = new Map<
      string,
      { count: number; nextSlot?: CounselingSlot }
    >();
    const slots = availability?.slots ?? [];

    for (const counselor of availability?.counselors ?? []) {
      const counselorSlots = slots.filter(
        slot => slot.counselorId === counselor.id && slot.available
      );
      summary.set(counselor.id, {
        count: counselorSlots.length,
        nextSlot: nextAvailableSlot(counselorSlots),
      });
    }

    return summary;
  }, [availability?.counselors, availability?.slots]);
  const selectedNextSlot = useMemo(
    () => nextAvailableSlot(slotsForSelectedCounselor),
    [slotsForSelectedCounselor]
  );
  const selectedMatchLabels = useMemo(
    () =>
      selectedCounselor
        ? matchedSpecialtyLabels(selectedCounselor, draft.concernTags)
        : [],
    [draft.concernTags, selectedCounselor]
  );
  const selectedFallbackCopy = useMemo(
    () => (selectedCounselor ? counselorFallbackCopy(selectedCounselor) : null),
    [selectedCounselor]
  );
  const pendingAppointments = useMemo(
    () =>
      appointments
        .filter(record => record.appointment.status === "pending_payment")
        .sort(
          (left, right) =>
            Date.parse(getCounselingPaymentDeadline(left.appointment)) -
            Date.parse(getCounselingPaymentDeadline(right.appointment))
        ),
    [appointments]
  );
  const displayAppointmentResult = appointmentActionResult ?? appointmentResult;

  const handleCounselorSelect = (counselorId: string) => {
    const firstSlot = availability?.slots.find(
      slot => slot.counselorId === counselorId && slot.available
    );
    const url = new URL(window.location.href);
    url.searchParams.set("counselorId", counselorId);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    updateDraft({
      counselorId,
      slotId: firstSlot?.id,
      channel: firstSlot?.channel,
    });
  };

  const handleSlotSelect = (slot: CounselingSlot) => {
    updateDraft({
      slotId: slot.id,
      channel: slot.channel,
    });
  };

  const handleSubmit = async () => {
    if (!isLoggedIn) {
      openLoginModal();
      toast("请先登录", { description: "登录后即可提交咨询预约意向" });
      return;
    }

    const nextResult = await submit();
    if (nextResult) {
      toast("预约已生成", {
        description: "请在保留时间内完成支付确认，时段才会正式锁定。",
      });
    }
  };

  const handleConfirmPayment = async (appointmentId: string) => {
    if (!isLoggedIn) {
      openLoginModal();
      toast("请先登录", { description: "登录后可继续支付咨询预约。" });
      return;
    }

    const nextResult = await updateAppointment(
      appointmentId,
      "confirm_payment"
    );
    if (nextResult) {
      setAppointmentActionResult(nextResult);
      toast("咨询预约已确认", {
        description: "预约状态已更新，可在个人中心查看后续安排。",
      });
    }
  };

  const handleCancelPendingAppointment = async (appointmentId: string) => {
    const nextResult = await updateAppointment(appointmentId, "cancel");
    if (nextResult) {
      setAppointmentActionResult(nextResult);
      toast("待支付预约已取消", {
        description: "原咨询时段已释放，你可以重新选择更合适的时间。",
      });
    }
  };

  const openPersonalAppointment = (appointmentId: string) => {
    navigate(
      `/me?tab=orders&appointmentId=${encodeURIComponent(appointmentId)}`
    );
  };

  return (
    <div className="min-h-screen bg-[#F9F5EE] text-[#243B35]">
      <AppHeader />

      <main className="mx-auto max-w-[1240px] px-5 pb-28 pt-6 sm:px-8 lg:px-10 lg:pb-14 lg:pt-9">
        <section className="border-b border-[#DED6C8] pb-6">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#6F8F83]">
                心理咨询预约
              </p>
              <h1 className="mt-3 max-w-[760px] text-3xl font-semibold text-[#243B35] sm:text-4xl lg:text-5xl">
                先看清咨询师，再选择适合的时间
              </h1>
              <p className="mt-4 max-w-[700px] text-sm leading-7 text-[#66716A]">
                把测评线索、当前困扰和预约时间放在同一个页面里，帮助你在下单前快速判断“这个人是否适合我”。
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#D8CEC0] bg-[#FFFDF8] px-3 py-1.5 text-xs font-semibold text-[#5F6B64]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#6F8F83]" />
                  隐私最小化
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#D8CEC0] bg-[#FFFDF8] px-3 py-1.5 text-xs font-semibold text-[#5F6B64]">
                  <CalendarCheck className="h-3.5 w-3.5 text-[#6F8F83]" />
                  锁定可约时段
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#D8CEC0] bg-[#FFFDF8] px-3 py-1.5 text-xs font-semibold text-[#5F6B64]">
                  <Sparkles className="h-3.5 w-3.5 text-[#6F8F83]" />
                  可承接测评结果
                </span>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#D8CEC0] bg-[#FFFDF8] p-4">
              <p className="text-sm font-semibold text-[#243B35]">预约进度</p>
              <div className="mt-4 grid gap-2">
                {[
                  {
                    label: "选择咨询师",
                    done: Boolean(selectedCounselor),
                  },
                  {
                    label: "选择可约时段",
                    done: Boolean(selectedSlot),
                  },
                  {
                    label: "补充预约信息",
                    done: draft.concernTags.length > 0,
                  },
                ].map((step, index) => (
                  <div
                    key={step.label}
                    className="flex items-center justify-between gap-3 rounded-[16px] bg-[#F7F1E7] px-3 py-2"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-[#40534B]">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                          step.done
                            ? "bg-[#6F8F83] text-white"
                            : "bg-white text-[#7A827C]"
                        }`}
                      >
                        {step.done ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      {step.label}
                    </span>
                    {step.done && (
                      <span className="text-xs font-semibold text-[#6F8F83]">
                        已完成
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        {latestAssessment && (
          <section className="mt-6 rounded-[24px] border border-[#D8CEC0] bg-[#FFFDF8] px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#243B35]">
                  {latestAssessmentSource === "server"
                    ? "已读取成长档案最近一次测评"
                    : "已读取本机最近一次测评"}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#6D746F]">
                  风险等级：{latestAssessment.report.riskLevel}
                  ，预约信息会带上报告 ID，方便咨询师提前理解当前状态。
                </p>
              </div>
              {isLatestAssessmentLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#6F8F83]" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-[#6F8F83]" />
              )}
            </div>
          </section>
        )}

        {error && (
          <div className="mt-5 rounded-[20px] border border-[#F0D6C9] bg-[#FFF5EF] px-5 py-4 text-sm text-[#A65F48]">
            {error}
          </div>
        )}

        {appointmentListError && (
          <div className="mt-5 rounded-[20px] border border-[#F0D6C9] bg-[#FFF5EF] px-5 py-4 text-sm text-[#A65F48]">
            {appointmentListError}
          </div>
        )}

        {pendingAppointments.length > 0 && !displayAppointmentResult && (
          <section className="mt-6 rounded-[26px] border border-[#E4DCCF] bg-[#FFFDF8] p-4 shadow-sm shadow-[#243B35]/5 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#A65F48]">
                  待支付咨询预约
                </p>
                <h2 className="mt-1 text-xl font-semibold text-[#243B35]">
                  已为你保留咨询时段
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6D746F]">
                  继续支付后预约才会正式确认；取消后会释放时段给其他用户。
                </p>
              </div>
              <button
                onClick={() =>
                  openPersonalAppointment(pendingAppointments[0].appointment.id)
                }
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#D8CEC0] px-4 text-sm font-semibold text-[#41675A] transition hover:bg-[#F2F7EE]"
              >
                去个人中心
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {pendingAppointments.slice(0, 2).map(record => {
                const isUpdating =
                  updatingAppointmentId === record.appointment.id;
                return (
                  <div
                    key={record.appointment.id}
                    className="rounded-[20px] border border-[#E4DCCF] bg-[#F9F5EE] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#243B35]">
                          {record.counselor.name} · {formatSlot(record.slot)}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#6D746F]">
                          保留至{" "}
                          {formatSlot({
                            ...record.slot,
                            startsAt: getCounselingPaymentDeadline(
                              record.appointment
                            ),
                          })}
                          ，应付金额 ¥
                          {record.order?.payableAmount ??
                            record.counselor.sessionPrice}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#FFF1D8] px-2.5 py-1 text-xs font-semibold text-[#8A641C]">
                        待支付
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          handleConfirmPayment(record.appointment.id)
                        }
                        disabled={isUpdating}
                        className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:bg-[#9AA19B]"
                      >
                        {isUpdating && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        继续支付
                      </button>
                      <button
                        onClick={() =>
                          handleCancelPendingAppointment(record.appointment.id)
                        }
                        disabled={isUpdating}
                        className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-[#D8CEC0] px-4 text-sm font-semibold text-[#A65F48] transition hover:bg-[#FFF1EC] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        取消预约
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="min-w-0">
            <section className="rounded-[26px] border border-[#E4DCCF] bg-[#FFFDF8] p-4 shadow-sm shadow-[#243B35]/5 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#6F8F83]">咨询师</p>
                  <h2 className="mt-1 text-2xl font-semibold text-[#243B35]">
                    推荐咨询师
                  </h2>
                </div>
                {isLoading && (
                  <Loader2 className="h-5 w-5 animate-spin text-[#6F8F83]" />
                )}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {counselors.map(counselor => {
                  const selected = draft.counselorId === counselor.id;
                  const slotSummary = slotSummaryByCounselor.get(counselor.id);
                  const matchLabels = matchedSpecialtyLabels(
                    counselor,
                    draft.concernTags
                  );
                  return (
                    <button
                      key={counselor.id}
                      onClick={() => handleCounselorSelect(counselor.id)}
                      className={`min-h-[168px] rounded-[20px] border p-4 text-left transition ${
                        selected
                          ? "border-[#6F8F83] bg-[#E6EDDF] shadow-sm shadow-[#243B35]/8"
                          : "border-[#E4DCCF] bg-[#FFFDF8] hover:border-[#BFD0B8] hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {counselor.avatarUrl ? (
                          <img
                            src={counselor.avatarUrl}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-[16px] object-cover"
                          />
                        ) : (
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[#243B35] text-lg font-semibold text-white">
                            {counselorInitial(counselor.name)}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-base font-semibold text-[#243B35]">
                            {counselor.name}
                          </span>
                          <span className="mt-1 block line-clamp-1 text-xs text-[#6D746F]">
                            {counselor.title}
                          </span>
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {matchLabels.slice(0, 2).map(label => (
                          <span
                            key={label}
                            className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-[#5F6B64]"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                      <div className="mt-4 grid gap-1 text-xs leading-5 text-[#6D746F]">
                        <span>
                          最近可约 {formatNextSlot(slotSummary?.nextSlot)}
                        </span>
                        <span>
                          可约 {slotSummary?.count ?? 0} 个时段 ·{" "}
                          {counselor.yearsOfPractice} 年经验
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-[#E4DCCF] pt-3 text-xs">
                        <span className="inline-flex items-center gap-1 font-semibold text-[#6F8F83]">
                          <Star className="h-3.5 w-3.5 fill-[#6F8F83]" />
                          {counselor.rating?.toFixed(1) ?? "新咨询师"}
                        </span>
                        <span className="font-semibold text-[#243B35]">
                          ¥{counselor.sessionPrice}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {selectedCounselor && selectedFallbackCopy && (
              <motion.section
                key={selectedCounselor.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="mt-6 overflow-hidden rounded-[28px] border border-[#E4DCCF] bg-[#FFFDF8] shadow-sm shadow-[#243B35]/5"
              >
                <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
                  <div className="bg-[#243B35] p-6 text-white">
                    {selectedCounselor.avatarUrl ? (
                      <img
                        src={selectedCounselor.avatarUrl}
                        alt=""
                        className="h-32 w-32 rounded-[28px] object-cover"
                      />
                    ) : (
                      <div className="flex h-32 w-32 items-center justify-center rounded-[28px] bg-white/12 text-5xl font-semibold">
                        {counselorInitial(selectedCounselor.name)}
                      </div>
                    )}
                    <h2 className="mt-5 text-2xl font-semibold">
                      {selectedCounselor.name}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-white/72">
                      {selectedCounselor.title}
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-[18px] bg-white/10 p-3">
                        <p className="text-xs text-white/58">评分</p>
                        <p className="mt-1 font-semibold">
                          {selectedCounselor.rating?.toFixed(1) ?? "新"}
                        </p>
                      </div>
                      <div className="rounded-[18px] bg-white/10 p-3">
                        <p className="text-xs text-white/58">价格</p>
                        <p className="mt-1 font-semibold">
                          ¥{selectedCounselor.sessionPrice}
                        </p>
                      </div>
                      <div className="rounded-[18px] bg-white/10 p-3">
                        <p className="text-xs text-white/58">经验</p>
                        <p className="mt-1 font-semibold">
                          {selectedCounselor.yearsOfPractice} 年
                        </p>
                      </div>
                      <div className="rounded-[18px] bg-white/10 p-3">
                        <p className="text-xs text-white/58">个案小时</p>
                        <p className="mt-1 font-semibold">
                          {selectedCounselor.caseHours
                            ? `${selectedCounselor.caseHours}+`
                            : "持续积累"}
                        </p>
                      </div>
                    </div>
                    <p className="mt-5 rounded-[18px] bg-[#DDE8D9] px-4 py-3 text-xs font-semibold leading-5 text-[#243B35]">
                      最近可约 {formatNextSlot(selectedNextSlot)}
                    </p>
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap gap-2">
                      {selectedCounselor.specialties.map(specialty => (
                        <span
                          key={specialty}
                          className="rounded-full bg-[#F5EFE5] px-3 py-1 text-xs font-semibold text-[#65716A]"
                        >
                          {specialtyCopy[specialty]}
                        </span>
                      ))}
                    </div>
                    <h3 className="mt-5 text-2xl font-semibold text-[#243B35]">
                      {selectedMatchLabels.join("、")}议题可优先了解
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[#5F6B64]">
                      {selectedCounselor.introduction}
                    </p>

                    <div className="mt-6 grid gap-3 md:grid-cols-3">
                      {[
                        {
                          icon: BadgeCheck,
                          label: "资质摘要",
                          value: selectedCounselor.licenseSummary,
                        },
                        {
                          icon: BookOpen,
                          label: "训练背景",
                          value: selectedFallbackCopy.training,
                        },
                        {
                          icon: UserCheck,
                          label: "咨询风格",
                          value: selectedFallbackCopy.style,
                        },
                      ].map(item => {
                        const Icon = item.icon;
                        return (
                          <div
                            key={item.label}
                            className="rounded-[20px] border border-[#E4DCCF] bg-[#FFFCF6] p-4"
                          >
                            <div className="flex items-center gap-2 text-sm font-semibold text-[#243B35]">
                              <Icon className="h-4 w-4 text-[#6F8F83]" />
                              {item.label}
                            </div>
                            <p className="mt-3 line-clamp-4 text-xs leading-5 text-[#6D746F]">
                              {item.value}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 rounded-[20px] border border-[#E4DCCF] bg-[#FFFCF6] p-4">
                      <p className="text-sm font-semibold text-[#243B35]">
                        适合人群
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#5F6B64]">
                        {selectedFallbackCopy.ideal}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#E4DCCF] p-5 sm:p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#6F8F83]">
                        可预约时段
                      </p>
                      <h3 className="mt-1 text-2xl font-semibold text-[#243B35]">
                        选一个能安心说话的时间
                      </h3>
                    </div>
                    <p className="text-xs leading-5 text-[#6D746F]">
                      提交后保留 {COUNSELING_PAYMENT_HOLD_MINUTES} 分钟待支付
                    </p>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {slotsForSelectedCounselor.map(slot => {
                      const selected = draft.slotId === slot.id;
                      const ChannelIcon = channelCopy[slot.channel].icon;
                      return (
                        <button
                          key={slot.id}
                          onClick={() => handleSlotSelect(slot)}
                          className={`rounded-[20px] border p-4 text-left transition ${
                            selected
                              ? "border-[#6F8F83] bg-[#E6EDDF]"
                              : "border-[#E4DCCF] bg-[#FFFDF8] hover:border-[#BFD0B8] hover:bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-[#243B35]">
                              {formatSlot(slot)}
                            </span>
                            <ChannelIcon className="h-4 w-4 shrink-0 text-[#6F8F83]" />
                          </div>
                          <p className="mt-3 text-xs text-[#6D746F]">
                            {channelCopy[slot.channel].label} ·{" "}
                            {slotDuration(slot)}
                          </p>
                          {selected && (
                            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#6F8F83]">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              已选择
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {!slotsForSelectedCounselor.length && (
                    <div className="mt-5 rounded-[20px] border border-dashed border-[#D8CEC0] p-6 text-sm text-[#6D746F]">
                      当前咨询师暂无可预约时段，请选择其他咨询师。
                    </div>
                  )}
                </div>
              </motion.section>
            )}

            {!selectedCounselor && !isLoading && (
              <div className="mt-6 rounded-[24px] border border-dashed border-[#D8CEC0] p-8 text-center text-sm text-[#6D746F]">
                暂无可预约咨询师，请稍后再试。
              </div>
            )}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-[86px] lg:self-start">
            <div className="rounded-[28px] border border-[#E4DCCF] bg-[#FFFDF8] p-6 shadow-sm shadow-[#243B35]/5">
              <p className="text-sm font-semibold text-[#6F8F83]">预约单</p>
              <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                确认咨询信息
              </h2>

              <div className="mt-5 rounded-[20px] bg-[#F5EFE5] p-4">
                {selectedCounselor && selectedSlot ? (
                  <div className="flex items-start gap-3">
                    <Clock3 className="mt-0.5 h-5 w-5 text-[#6F8F83]" />
                    <div>
                      <p className="text-sm font-semibold text-[#243B35]">
                        {selectedCounselor.name} · {formatSlot(selectedSlot)}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#6D746F]">
                        {channelCopy[selectedSlot.channel].label}，
                        {slotDuration(selectedSlot)}，订单金额 ¥
                        {selectedCounselor.sessionPrice}。
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-[#6D746F]">
                    先选择咨询师和可预约时段，系统会在这里生成预约摘要。
                  </p>
                )}
              </div>

              <div className="mt-6">
                <p className="text-xs font-semibold text-[#68736D]">主要困扰</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {concernOptions.map(option => {
                    const selected = draft.concernTags.includes(option.tag);
                    return (
                      <button
                        key={option.tag}
                        onClick={() => toggleConcernTag(option.tag)}
                        className={`rounded-[18px] border p-3 text-left transition ${
                          selected
                            ? "border-[#6F8F83] bg-[#E6EDDF]"
                            : "border-[#E4DCCF] bg-[#FFFDF8] hover:bg-[#F5EFE5]"
                        }`}
                      >
                        <span className="block text-sm font-semibold text-[#243B35]">
                          {option.label}
                        </span>
                        <span className="mt-1 block text-[11px] leading-4 text-[#6D746F]">
                          {option.detail}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <p className="text-xs font-semibold text-[#68736D]">
                  希望被支持的时间
                </p>
                <div className="mt-3 space-y-2">
                  {urgencyOptions.map(option => {
                    const selected = draft.urgency === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => updateDraft({ urgency: option.value })}
                        className={`flex w-full items-center justify-between rounded-[18px] border p-3 text-left transition ${
                          selected
                            ? "border-[#6F8F83] bg-[#E6EDDF]"
                            : "border-[#E4DCCF] bg-[#FFFDF8] hover:bg-[#F5EFE5]"
                        }`}
                      >
                        <span>
                          <span className="block text-sm font-semibold text-[#243B35]">
                            {option.label}
                          </span>
                          <span className="mt-1 block text-[11px] text-[#6D746F]">
                            {option.detail}
                          </span>
                        </span>
                        {selected && (
                          <CheckCircle2 className="h-4 w-4 text-[#6F8F83]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="mt-6 block">
                <span className="text-xs font-semibold text-[#68736D]">
                  想提前告诉咨询师的话
                </span>
                <textarea
                  value={draft.noteForCounselor ?? ""}
                  onChange={event =>
                    updateDraft({ noteForCounselor: event.target.value })
                  }
                  maxLength={500}
                  rows={4}
                  className="mt-3 w-full resize-none rounded-[20px] border border-[#E4DCCF] bg-[#FFFDF8] px-4 py-3 text-sm leading-6 text-[#243B35] outline-none transition placeholder:text-[#A4AAA5] focus:border-[#6F8F83]"
                  placeholder="例如：最近睡眠变差，白天容易失控，想先梳理情绪和关系压力。"
                />
              </label>

              <div className="mt-5 rounded-[18px] border border-[#E4DCCF] bg-[#FFFCF6] px-4 py-3">
                <div className="flex items-start gap-3">
                  <LockKeyhole className="mt-0.5 h-4 w-4 text-[#6F8F83]" />
                  <p className="text-xs leading-5 text-[#6D746F]">
                    咨询前信息只用于本次预约准备，不在运营后台暴露原文；如出现紧急风险，请优先联系线下紧急支持。
                  </p>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  Boolean(displayAppointmentResult) ||
                  !selectedCounselor ||
                  !selectedSlot
                }
                className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#243B35] px-5 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:bg-[#9AA19B]"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {displayAppointmentResult
                  ? "预约单已生成"
                  : "立即预约并锁定时段"}
                {!isSubmitting && !displayAppointmentResult && (
                  <ArrowRight className="ml-2 h-4 w-4" />
                )}
              </button>
            </div>

            {draft.urgency === "immediate" ||
            draft.concernTags.includes("crisis") ? (
              <div className="rounded-[28px] border border-[#F0D6C9] bg-[#FFF5EF] p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-[#A65F48]" />
                  <p className="text-sm leading-6 text-[#884A38]">
                    如果你此刻可能伤害自己或他人，请优先联系身边可信任的人、当地紧急服务或线下医疗机构。
                  </p>
                </div>
              </div>
            ) : null}

            {displayAppointmentResult && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className={`rounded-[28px] border p-6 ${
                  displayAppointmentResult.appointment.status === "scheduled"
                    ? "border-[#C6D9BD] bg-[#E6EDDF]"
                    : displayAppointmentResult.appointment.status ===
                        "cancelled"
                      ? "border-[#E4DCCF] bg-[#F5EFE5]"
                      : "border-[#D8CEC0] bg-[#FFFDF8]"
                }`}
              >
                <p className="text-sm font-semibold text-[#41675A]">
                  {displayAppointmentResult.appointment.status === "scheduled"
                    ? "预约已确认"
                    : displayAppointmentResult.appointment.status ===
                        "cancelled"
                      ? "预约已取消"
                      : "预约单已生成"}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[#243B35]">
                  {displayAppointmentResult.counselor.name} ·{" "}
                  {formatSlot(displayAppointmentResult.slot)}
                </h3>
                <p className="mt-2 text-sm text-[#4F5B54]">
                  订单金额 ¥
                  {displayAppointmentResult.order?.payableAmount ??
                    displayAppointmentResult.counselor.sessionPrice}
                  ，当前状态为
                  {displayAppointmentResult.appointment.status === "scheduled"
                    ? "已预约"
                    : displayAppointmentResult.appointment.status ===
                        "cancelled"
                      ? "已取消"
                      : "待支付"}
                  。
                </p>
                {displayAppointmentResult.appointment.status ===
                  "pending_payment" && (
                  <p className="mt-2 text-xs leading-5 text-[#8A641C]">
                    保留至{" "}
                    {formatSlot({
                      ...displayAppointmentResult.slot,
                      startsAt: getCounselingPaymentDeadline(
                        displayAppointmentResult.appointment
                      ),
                    })}
                    ，超时未支付会自动释放时段。
                  </p>
                )}
                <div className="mt-5 space-y-3">
                  {displayAppointmentResult.nextSteps.map(step => (
                    <div
                      key={step}
                      className="flex gap-3 text-sm text-[#4F5B54]"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#6F8F83]" />
                      <span className="leading-6">{step}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 grid gap-2">
                  {displayAppointmentResult.appointment.status ===
                    "pending_payment" && (
                    <button
                      onClick={() =>
                        handleConfirmPayment(
                          displayAppointmentResult.appointment.id
                        )
                      }
                      disabled={
                        updatingAppointmentId ===
                        displayAppointmentResult.appointment.id
                      }
                      className="inline-flex h-11 items-center justify-center rounded-full bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:bg-[#9AA19B]"
                    >
                      {updatingAppointmentId ===
                        displayAppointmentResult.appointment.id && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      立即支付并确认预约
                    </button>
                  )}
                  <button
                    onClick={() =>
                      openPersonalAppointment(
                        displayAppointmentResult.appointment.id
                      )
                    }
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#D8CEC0] px-4 text-sm font-semibold text-[#41675A] transition hover:bg-[#F2F7EE]"
                  >
                    去个人中心查看
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </aside>
        </section>

        {selectedCounselor && selectedSlot && !displayAppointmentResult && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#D8CEC0] bg-[#FFFDF8]/95 px-4 py-3 shadow-2xl shadow-[#243B35]/12 backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-[640px] items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#243B35]">
                  {selectedCounselor.name} · {formatSlot(selectedSlot)}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-[#6D746F]">
                  <Wallet className="h-3.5 w-3.5" />¥
                  {selectedCounselor.sessionPrice} ·{" "}
                  {channelCopy[selectedSlot.channel].label}
                </p>
              </div>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-[#243B35] px-4 text-sm font-semibold text-white disabled:bg-[#9AA19B]"
              >
                {isSubmitting ? "提交中" : "预约"}
              </button>
            </div>
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  );
}
