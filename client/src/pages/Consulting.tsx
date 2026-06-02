import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Video,
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
  useCounselingIntake,
  type Counselor,
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
  const tagSpecialtyMap: Partial<
    Record<CounselingConcernTag, CounselorSpecialty>
  > = {
    emotion: "emotion",
    relationship: "relationship",
    family: "family",
    adolescent: "adolescent",
    workplace: "workplace",
    self_growth: "personal_growth",
  };

  return tags.reduce((score, tag) => {
    const specialty = tagSpecialtyMap[tag];
    return specialty && counselor.specialties.includes(specialty)
      ? score + 1
      : score;
  }, 0);
}

export default function Consulting() {
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

  const handleCounselorSelect = (counselorId: string) => {
    const firstSlot = availability?.slots.find(
      slot => slot.counselorId === counselorId && slot.available
    );
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
        description: "咨询师会在服务前查看你的困扰重点。",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F5EE] text-[#243B35]">
      <AppHeader />

      <main className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <section className="overflow-hidden rounded-[32px] bg-[#243B35] text-white shadow-xl shadow-[#243B35]/10">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_360px] lg:p-10">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/14 px-3 py-1 text-xs font-semibold text-white/78">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  私密预约
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/14 px-3 py-1 text-xs font-semibold text-white/78">
                  <CalendarCheck className="h-3.5 w-3.5" />
                  咨询师排班
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/14 px-3 py-1 text-xs font-semibold text-white/78">
                  <Sparkles className="h-3.5 w-3.5" />
                  可承接测评结果
                </span>
              </div>
              <h1 className="mt-7 text-3xl font-semibold tracking-normal sm:text-4xl lg:text-5xl">
                咨询预约
              </h1>
              <p className="mt-4 max-w-[680px] text-sm leading-7 text-white/72">
                选择适合的咨询师和时间，把测评结果、当前困扰和紧急程度整理成一次清晰的预约意向。
              </p>
            </motion.div>

            <div className="rounded-[28px] border border-white/12 bg-white/8 p-5">
              <p className="text-sm font-semibold text-[#DDE8D9]">当前路径</p>
              <div className="mt-5 space-y-4 text-sm text-white/74">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DDE8D9] text-[#243B35]">
                    1
                  </span>
                  选择咨询师与时间
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/12 text-white">
                    2
                  </span>
                  补充咨询前信息
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/12 text-white">
                    3
                  </span>
                  生成预约单与后续步骤
                </div>
              </div>
            </div>
          </div>
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

        <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-8">
            <div className="rounded-[28px] border border-[#E4DCCF] bg-[#FFFDF8] p-5 shadow-sm shadow-[#243B35]/5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#6F8F83]">咨询师</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#243B35]">
                    选择一个适合当前议题的人
                  </h2>
                </div>
                {isLoading && (
                  <Loader2 className="h-5 w-5 animate-spin text-[#6F8F83]" />
                )}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {counselors.map(counselor => {
                  const selected = draft.counselorId === counselor.id;
                  return (
                    <button
                      key={counselor.id}
                      onClick={() => handleCounselorSelect(counselor.id)}
                      className={`min-h-[220px] rounded-[24px] border p-5 text-left transition ${
                        selected
                          ? "border-[#6F8F83] bg-[#E6EDDF]"
                          : "border-[#E4DCCF] bg-[#FFFDF8] hover:border-[#BFD0B8] hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xl font-semibold text-[#243B35]">
                            {counselor.name}
                          </p>
                          <p className="mt-1 text-sm text-[#6D746F]">
                            {counselor.title}
                          </p>
                        </div>
                        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#4F7068]">
                          {counselor.rating?.toFixed(1) ?? "新"}
                        </span>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-[#5F6B64]">
                        {counselor.introduction}
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        {counselor.specialties.map(specialty => (
                          <span
                            key={specialty}
                            className="rounded-full bg-[#F5EFE5] px-3 py-1 text-xs font-semibold text-[#65716A]"
                          >
                            {specialtyCopy[specialty]}
                          </span>
                        ))}
                      </div>
                      <div className="mt-5 flex items-center justify-between border-t border-[#E4DCCF] pt-4 text-xs text-[#6D746F]">
                        <span>{counselor.licenseSummary}</span>
                        <span className="font-semibold text-[#243B35]">
                          ¥{counselor.sessionPrice}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[28px] border border-[#E4DCCF] bg-[#FFFDF8] p-5 shadow-sm shadow-[#243B35]/5 sm:p-6">
              <p className="text-sm font-semibold text-[#6F8F83]">可预约时段</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#243B35]">
                选择一个能安心说话的时间
              </h2>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {slotsForSelectedCounselor.map(slot => {
                  const selected = draft.slotId === slot.id;
                  const ChannelIcon = channelCopy[slot.channel].icon;
                  return (
                    <button
                      key={slot.id}
                      onClick={() => handleSlotSelect(slot)}
                      className={`rounded-[22px] border p-4 text-left transition ${
                        selected
                          ? "border-[#6F8F83] bg-[#E6EDDF]"
                          : "border-[#E4DCCF] bg-[#FFFDF8] hover:border-[#BFD0B8] hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[#243B35]">
                          {formatSlot(slot)}
                        </span>
                        <ChannelIcon className="h-4 w-4 text-[#6F8F83]" />
                      </div>
                      <p className="mt-3 text-xs text-[#6D746F]">
                        {channelCopy[slot.channel].label} · {slotDuration(slot)}
                      </p>
                    </button>
                  );
                })}
              </div>

              {!slotsForSelectedCounselor.length && (
                <div className="mt-6 rounded-[22px] border border-dashed border-[#D8CEC0] p-6 text-sm text-[#6D746F]">
                  当前咨询师暂无可预约时段，请选择其他咨询师。
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-[86px] lg:self-start">
            <div className="rounded-[28px] border border-[#E4DCCF] bg-[#FFFDF8] p-6 shadow-sm shadow-[#243B35]/5">
              <p className="text-sm font-semibold text-[#6F8F83]">咨询前信息</p>
              <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                让咨询师先知道重点
              </h2>

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

              {selectedCounselor && selectedSlot && (
                <div className="mt-6 rounded-[20px] bg-[#F5EFE5] p-4">
                  <div className="flex items-start gap-3">
                    <Clock3 className="mt-0.5 h-5 w-5 text-[#6F8F83]" />
                    <div>
                      <p className="text-sm font-semibold text-[#243B35]">
                        {selectedCounselor.name} · {formatSlot(selectedSlot)}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#6D746F]">
                        {channelCopy[selectedSlot.channel].label}，
                        {slotDuration(selectedSlot)}，提交后会保留{" "}
                        {COUNSELING_PAYMENT_HOLD_MINUTES} 分钟待支付。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  Boolean(appointmentResult) ||
                  !selectedCounselor ||
                  !selectedSlot
                }
                className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#243B35] px-5 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:bg-[#9AA19B]"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {appointmentResult ? "预约单已生成" : "提交预约意向"}
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

            {appointmentResult && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-[28px] border border-[#D8CEC0] bg-[#E6EDDF] p-6"
              >
                <p className="text-sm font-semibold text-[#41675A]">
                  预约单已生成
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[#243B35]">
                  {appointmentResult.counselor.name} ·{" "}
                  {formatSlot(appointmentResult.slot)}
                </h3>
                <p className="mt-2 text-sm text-[#4F5B54]">
                  订单金额 ¥{appointmentResult.order.payableAmount}
                  ，当前状态为待支付。
                </p>
                <div className="mt-5 space-y-3">
                  {appointmentResult.nextSteps.map(step => (
                    <div
                      key={step}
                      className="flex gap-3 text-sm text-[#4F5B54]"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#6F8F83]" />
                      <span className="leading-6">{step}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </aside>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
