import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  CalendarClock,
  CalendarPlus,
  CalendarX,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Eye,
  FileSearch,
  History,
  ListChecks,
  Loader2,
  PauseCircle,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  ToggleLeft,
  Trash2,
  UserCheck,
  UserRoundCog,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { userCan } from "@shared/domain";
import { useAuth } from "@/contexts/AuthContext";
import {
  httpCounselingRepository,
  type CounselorAdminProfile,
  type CounselorAdminProfileConsole,
  type CounselorAdminProfileFilter,
  type CounselorAdminServiceStatus,
  type CounselorCredentialStatus,
  type CounselorSpecialty,
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
  counselor_profile_created: "新增咨询师档案",
  counselor_profile_updated: "更新咨询师档案",
  counselor_profile_deleted: "删除咨询师档案",
  counselor_service_status_updated: "更新接单状态",
} satisfies Record<CounselingOperationAuditEvent["action"], string>;

const serviceStatusCopy = {
  active: "可预约",
  full: "已约满",
  paused: "暂停接单",
} as const;

const specialtyCopy = {
  emotion: "情绪压力",
  relationship: "亲密关系",
  family: "家庭沟通",
  adolescent: "青少年",
  workplace: "职场耗竭",
  trauma: "创伤支持",
  personal_growth: "自我成长",
} satisfies Record<CounselorSpecialty, string>;

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

type CounselorProfileServiceStatusFilter = "all" | CounselorAdminServiceStatus;

type CounselorProfileCredentialStatusFilter = "all" | CounselorCredentialStatus;

type CounselorProfileFiltersDraft = {
  serviceStatus: CounselorProfileServiceStatusFilter;
  credentialStatus: CounselorProfileCredentialStatusFilter;
  keyword: string;
};

type CounselorProfileDraft = {
  counselorId: string;
  name: string;
  avatarUrl: string;
  title: string;
  introduction: string;
  specialties: CounselorSpecialty[];
  licenseSummary: string;
  trainingSummary: string;
  serviceStyle: string;
  idealClientDescription: string;
  yearsOfPractice: string;
  caseHours: string;
  sessionPrice: string;
  serviceStatus: CounselorAdminServiceStatus;
  acceptsNewClients: boolean;
  credentialStatus: CounselorCredentialStatus;
  credentialExpiresAt: string;
  reason: string;
};

type CounselorProfileDraftErrors = Partial<
  Record<keyof CounselorProfileDraft, string>
>;

type CounselingWorkspaceTab = "counselors" | "schedule" | "records" | "rules";

type CounselorProfileEditorMode = "create" | "edit";

const counselingWorkspaceTabs: Array<{
  id: CounselingWorkspaceTab;
  label: string;
  description: string;
}> = [
  {
    id: "counselors",
    label: "咨询师",
    description: "新增、维护、停用和删除",
  },
  {
    id: "schedule",
    label: "排班",
    description: "新增时段和关闭时段",
  },
  {
    id: "records",
    label: "履约",
    description: "查看预约和异常",
  },
  {
    id: "rules",
    label: "规则与审计",
    description: "取消规则和操作流水",
  },
];

const counselorProfileServiceStatusCopy = {
  active: "正常接单",
  paused: "暂停接单",
} satisfies Record<CounselorAdminServiceStatus, string>;

const credentialStatusCopy = {
  verified: "资质已核验",
  pending_review: "待复核",
  expiring_soon: "即将到期",
  expired: "资质到期",
} satisfies Record<CounselorCredentialStatus, string>;

const credentialStatusClassName = {
  verified: "border-[#BBD0C5] bg-[#EEF6F0] text-[#2F6B54]",
  pending_review: "border-[#E8D2A1] bg-[#FFF8DF] text-[#8A641C]",
  expiring_soon: "border-[#E8D2A1] bg-[#FFF8DF] text-[#8A641C]",
  expired: "border-[#EDCDBF] bg-[#FFF4EF] text-[#A65F48]",
} satisfies Record<CounselorCredentialStatus, string>;

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

const defaultCounselorProfileFilters: CounselorProfileFiltersDraft = {
  serviceStatus: "all",
  credentialStatus: "all",
  keyword: "",
};

const counselorSpecialtyOptions = Object.entries(specialtyCopy) as Array<
  [CounselorSpecialty, string]
>;

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

function toDateInputValue(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function dateInputToIso(value: string) {
  if (!value) return undefined;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
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

function toCounselorProfileRequestFilters(
  filters: CounselorProfileFiltersDraft
): Partial<CounselorAdminProfileFilter> {
  return {
    serviceStatus:
      filters.serviceStatus === "all" ? undefined : filters.serviceStatus,
    credentialStatus:
      filters.credentialStatus === "all" ? undefined : filters.credentialStatus,
    keyword: filters.keyword.trim() || undefined,
    limit: 50,
  };
}

function counselorProfileDraftFromProfile(
  profile: CounselorAdminProfile
): CounselorProfileDraft {
  return {
    counselorId: profile.counselor.id,
    name: profile.counselor.name,
    avatarUrl: profile.counselor.avatarUrl ?? "",
    title: profile.counselor.title,
    introduction: profile.counselor.introduction,
    specialties: profile.counselor.specialties,
    licenseSummary: profile.counselor.licenseSummary,
    trainingSummary: profile.counselor.trainingSummary ?? "",
    serviceStyle: profile.counselor.serviceStyle ?? "",
    idealClientDescription: profile.counselor.idealClientDescription ?? "",
    yearsOfPractice: String(profile.counselor.yearsOfPractice),
    caseHours:
      typeof profile.counselor.caseHours === "number"
        ? String(profile.counselor.caseHours)
        : "",
    sessionPrice: String(profile.counselor.sessionPrice),
    serviceStatus: profile.serviceStatus,
    acceptsNewClients: profile.acceptsNewClients,
    credentialStatus: profile.credentialStatus,
    credentialExpiresAt: toDateInputValue(profile.credentialExpiresAt),
    reason: "",
  };
}

function buildNewCounselorProfileDraft(): CounselorProfileDraft {
  return {
    counselorId: "",
    name: "",
    avatarUrl: "",
    title: "心理咨询师",
    introduction: "",
    specialties: ["emotion"],
    licenseSummary: "",
    trainingSummary: "",
    serviceStyle: "",
    idealClientDescription: "",
    yearsOfPractice: "0",
    caseHours: "",
    sessionPrice: "399",
    serviceStatus: "active",
    acceptsNewClients: true,
    credentialStatus: "verified",
    credentialExpiresAt: "",
    reason: "新增咨询师档案",
  };
}

function sameSpecialties(a: CounselorSpecialty[], b: CounselorSpecialty[]) {
  if (a.length !== b.length) return false;
  const normalizedA = [...a].sort();
  const normalizedB = [...b].sort();
  return normalizedA.every((item, index) => item === normalizedB[index]);
}

function counselorProfileDraftChanged(
  profile: CounselorAdminProfile,
  draft?: CounselorProfileDraft
) {
  if (!draft) return false;
  return (
    profile.counselor.name !== draft.name.trim() ||
    (profile.counselor.avatarUrl ?? "") !== draft.avatarUrl.trim() ||
    profile.counselor.title !== draft.title.trim() ||
    profile.counselor.introduction !== draft.introduction.trim() ||
    profile.counselor.licenseSummary !== draft.licenseSummary.trim() ||
    (profile.counselor.trainingSummary ?? "") !==
      draft.trainingSummary.trim() ||
    (profile.counselor.serviceStyle ?? "") !== draft.serviceStyle.trim() ||
    (profile.counselor.idealClientDescription ?? "") !==
      draft.idealClientDescription.trim() ||
    profile.counselor.yearsOfPractice !== Number(draft.yearsOfPractice) ||
    (profile.counselor.caseHours ?? "") !==
      (draft.caseHours.trim() ? Number(draft.caseHours) : "") ||
    profile.counselor.sessionPrice !== Number(draft.sessionPrice) ||
    profile.serviceStatus !== draft.serviceStatus ||
    profile.acceptsNewClients !== draft.acceptsNewClients ||
    profile.credentialStatus !== draft.credentialStatus ||
    toDateInputValue(profile.credentialExpiresAt) !==
      draft.credentialExpiresAt ||
    !sameSpecialties(profile.counselor.specialties, draft.specialties)
  );
}

function isValidOptionalUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateCounselorProfileDraft(draft: CounselorProfileDraft) {
  const yearsOfPractice = Number(draft.yearsOfPractice);
  const sessionPrice = Number(draft.sessionPrice);
  const caseHours = draft.caseHours.trim() ? Number(draft.caseHours) : 0;
  const errors: CounselorProfileDraftErrors = {};

  if (!draft.name.trim()) errors.name = "请填写咨询师姓名";
  if (!draft.title.trim()) errors.title = "请填写职称或服务定位";
  if (!isValidOptionalUrl(draft.avatarUrl)) {
    errors.avatarUrl = "头像链接需要是 http 或 https URL";
  }
  if (draft.introduction.trim().length < 10) {
    errors.introduction = "前台介绍至少 10 个字，建议写清楚擅长议题和服务方式";
  }
  if (!draft.licenseSummary.trim()) {
    errors.licenseSummary = "请填写资质摘要";
  }
  if (draft.specialties.length < 1) {
    errors.specialties = "至少选择一个擅长方向";
  }
  if (
    !Number.isFinite(yearsOfPractice) ||
    !Number.isInteger(yearsOfPractice) ||
    yearsOfPractice < 0 ||
    yearsOfPractice > 60
  ) {
    errors.yearsOfPractice = "执业年限需为 0-60 的整数";
  }
  if (
    draft.caseHours.trim() &&
    (!Number.isFinite(caseHours) ||
      !Number.isInteger(caseHours) ||
      caseHours < 0)
  ) {
    errors.caseHours = "服务小时数需为非负整数";
  }
  if (
    !Number.isFinite(sessionPrice) ||
    sessionPrice < 0 ||
    sessionPrice > 5000
  ) {
    errors.sessionPrice = "单次价格需在 0-5000 之间";
  }

  return {
    errors,
    values: {
      yearsOfPractice,
      sessionPrice,
      caseHours: draft.caseHours.trim() ? caseHours : undefined,
    },
  };
}

function buildCounselorProfileSamplePatch(draft: CounselorProfileDraft) {
  const name = draft.name.trim() || "这位咨询师";
  const specialtyLabels = draft.specialties
    .map(specialty => specialtyCopy[specialty])
    .join("、");

  return {
    introduction:
      draft.introduction.trim() ||
      `${name}长期关注${specialtyLabels || "情绪压力"}议题，擅长把复杂困扰拆成可理解、可练习、可复盘的咨询目标。`,
    licenseSummary:
      draft.licenseSummary.trim() ||
      `${draft.title.trim() || "心理咨询师"}，持续接受伦理、督导和专业训练。`,
    trainingSummary:
      draft.trainingSummary.trim() ||
      "接受心理咨询伦理、个案概念化、情绪调节与关系议题相关训练，保持定期督导。",
    serviceStyle:
      draft.serviceStyle.trim() ||
      "风格温和、结构清晰，重视安全感与目标感，适合希望稳定梳理问题并建立行动路径的来访者。",
    idealClientDescription:
      draft.idealClientDescription.trim() ||
      `适合正在经历${specialtyLabels || "情绪压力"}、希望获得连续支持和具体练习方法的来访者。`,
    caseHours: draft.caseHours.trim() || "800",
  };
}

function counselorPublicVisibility(profile: CounselorAdminProfile) {
  if (profile.serviceStatus !== "active") {
    return {
      visible: false,
      label: "前台不展示",
      reason: "当前为暂停接单状态",
    };
  }
  if (!profile.acceptsNewClients) {
    return {
      visible: false,
      label: "前台不展示",
      reason: "未开启接受新来访者",
    };
  }
  if (
    profile.credentialStatus !== "verified" &&
    profile.credentialStatus !== "expiring_soon"
  ) {
    return {
      visible: false,
      label: "前台不展示",
      reason: `资质状态为${credentialStatusCopy[profile.credentialStatus]}`,
    };
  }

  return {
    visible: true,
    label: "前台可展示",
    reason:
      profile.scheduleSummary.availableCount > 0
        ? "用户端可选择该咨询师并预约可用时段"
        : "用户端可看到咨询师，但暂无可预约时段",
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

  if (event.action.startsWith("counselor_")) {
    return (
      <p className="mt-2 text-sm leading-6 text-[#66716A]">
        咨询师{" "}
        <span className="font-semibold text-[#243B35]">
          {event.counselorId ?? "未记录"}
        </span>{" "}
        的档案或接单状态已更新。
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

function DraftFieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-semibold text-[#A65F48]">{message}</p>;
}

function CounselorProfileEditorDrawer({
  mode,
  draft,
  errors,
  hasChanges,
  isSaving,
  onApplySample,
  onChange,
  onClose,
  onSave,
  onToggleSpecialty,
}: {
  mode: CounselorProfileEditorMode;
  draft: CounselorProfileDraft;
  errors: CounselorProfileDraftErrors;
  hasChanges: boolean;
  isSaving: boolean;
  onApplySample: () => void;
  onChange: (patch: Partial<CounselorProfileDraft>) => void;
  onClose: () => void;
  onSave: () => void;
  onToggleSpecialty: (specialty: CounselorSpecialty) => void;
}) {
  const previewAvatarUrl = isValidOptionalUrl(draft.avatarUrl)
    ? draft.avatarUrl.trim()
    : "";
  const saveDisabled = isSaving || (mode === "edit" && !hasChanges);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end bg-[#182E27]/25 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <motion.aside
        initial={{ x: 32, opacity: 0.8 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="flex h-full w-full max-w-[860px] flex-col border-l border-[#D7CBB9] bg-[#FFFDF8] shadow-2xl shadow-[#182E27]/20"
      >
        <header className="shrink-0 border-b border-[#E8DED0] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#8A8176]">咨询师名册</p>
              <h2 className="mt-1 text-2xl font-semibold text-[#243B35]">
                {mode === "create" ? "新增咨询师" : "编辑咨询师资料"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#66716A]">
                只维护运营和前台需要的关键资料；保存后立即进入咨询师名册。
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onApplySample}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[#D8CDBC] bg-white px-3 text-sm font-semibold text-[#355F51] transition hover:border-[#9FB3A9]"
              >
                补全示例
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#D8CDBC] bg-white text-[#5F6B64] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-45"
                title="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
            <div className="min-w-0 space-y-5">
              <section className="rounded-lg border border-[#E8DED0] bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#243B35]">
                  <UserRoundCog className="h-4 w-4 text-[#6F8F83]" />
                  基础资料
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="block text-sm font-semibold text-[#40534B]">
                    姓名
                    <input
                      value={draft.name}
                      onChange={event => onChange({ name: event.target.value })}
                      className="mt-2 h-10 w-full rounded-lg border border-[#D8CDBC] bg-white px-3 text-sm text-[#243B35] outline-none transition focus:border-[#6F8F83]"
                    />
                    <DraftFieldError message={errors.name} />
                  </label>
                  <label className="block text-sm font-semibold text-[#40534B]">
                    职称
                    <input
                      value={draft.title}
                      onChange={event =>
                        onChange({ title: event.target.value })
                      }
                      className="mt-2 h-10 w-full rounded-lg border border-[#D8CDBC] bg-white px-3 text-sm text-[#243B35] outline-none transition focus:border-[#6F8F83]"
                    />
                    <DraftFieldError message={errors.title} />
                  </label>
                  <label className="block text-sm font-semibold text-[#40534B]">
                    执业年限
                    <input
                      type="number"
                      min={0}
                      max={60}
                      step={1}
                      value={draft.yearsOfPractice}
                      onChange={event =>
                        onChange({ yearsOfPractice: event.target.value })
                      }
                      className="mt-2 h-10 w-full rounded-lg border border-[#D8CDBC] bg-white px-3 text-sm text-[#243B35] outline-none transition focus:border-[#6F8F83]"
                    />
                    <DraftFieldError message={errors.yearsOfPractice} />
                  </label>
                  <label className="block text-sm font-semibold text-[#40534B]">
                    服务小时数
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={draft.caseHours}
                      placeholder="例如 800"
                      onChange={event =>
                        onChange({ caseHours: event.target.value })
                      }
                      className="mt-2 h-10 w-full rounded-lg border border-[#D8CDBC] bg-white px-3 text-sm text-[#243B35] outline-none transition placeholder:text-[#AAA197] focus:border-[#6F8F83]"
                    />
                    <DraftFieldError message={errors.caseHours} />
                  </label>
                  <label className="block text-sm font-semibold text-[#40534B]">
                    单次价格
                    <input
                      type="number"
                      min={0}
                      max={5000}
                      step={1}
                      value={draft.sessionPrice}
                      onChange={event =>
                        onChange({ sessionPrice: event.target.value })
                      }
                      className="mt-2 h-10 w-full rounded-lg border border-[#D8CDBC] bg-white px-3 text-sm text-[#243B35] outline-none transition focus:border-[#6F8F83]"
                    />
                    <DraftFieldError message={errors.sessionPrice} />
                  </label>
                  <label className="block text-sm font-semibold text-[#40534B]">
                    头像 URL
                    <input
                      value={draft.avatarUrl}
                      placeholder="https://..."
                      onChange={event =>
                        onChange({ avatarUrl: event.target.value })
                      }
                      className="mt-2 h-10 w-full rounded-lg border border-[#D8CDBC] bg-white px-3 text-sm text-[#243B35] outline-none transition placeholder:text-[#AAA197] focus:border-[#6F8F83]"
                    />
                    <DraftFieldError message={errors.avatarUrl} />
                  </label>
                </div>
                {previewAvatarUrl && (
                  <div className="mt-4 flex items-center gap-3 rounded-lg bg-[#F8F3EA] p-3">
                    <img
                      src={previewAvatarUrl}
                      alt=""
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                    <p className="text-xs leading-5 text-[#6F7771]">
                      头像会用于用户端咨询师卡片和预约确认页。
                    </p>
                  </div>
                )}
              </section>

              <section className="rounded-lg border border-[#E8DED0] bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#243B35]">
                  <ListChecks className="h-4 w-4 text-[#6F8F83]" />
                  前台展示
                </div>
                <label className="mt-4 block text-sm font-semibold text-[#40534B]">
                  前台介绍
                  <textarea
                    value={draft.introduction}
                    onChange={event =>
                      onChange({ introduction: event.target.value })
                    }
                    rows={5}
                    maxLength={600}
                    placeholder="写清楚擅长议题、服务方式和适合用户"
                    className="mt-2 w-full resize-none rounded-lg border border-[#D8CDBC] bg-white px-3 py-2 text-sm leading-6 text-[#243B35] outline-none transition placeholder:text-[#AAA197] focus:border-[#6F8F83]"
                  />
                  <DraftFieldError message={errors.introduction} />
                </label>

                <div className="mt-4">
                  <p className="text-sm font-semibold text-[#40534B]">
                    擅长方向
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {counselorSpecialtyOptions.map(([value, label]) => {
                      const checked = draft.specialties.includes(value);
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => onToggleSpecialty(value)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            checked
                              ? "border-[#6F8F83] bg-[#E5ECE1] text-[#355F51]"
                              : "border-[#D8CDBC] bg-white text-[#66716A] hover:border-[#AAB9AF]"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <DraftFieldError message={errors.specialties} />
                </div>
              </section>

              <section className="rounded-lg border border-[#E8DED0] bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#243B35]">
                  <BadgeCheck className="h-4 w-4 text-[#6F8F83]" />
                  专业信息
                </div>
                <label className="mt-4 block text-sm font-semibold text-[#40534B]">
                  资质摘要
                  <textarea
                    value={draft.licenseSummary}
                    onChange={event =>
                      onChange({ licenseSummary: event.target.value })
                    }
                    rows={3}
                    maxLength={180}
                    placeholder="例如：国家二级心理咨询师，持续接受督导"
                    className="mt-2 w-full resize-none rounded-lg border border-[#D8CDBC] bg-white px-3 py-2 text-sm leading-6 text-[#243B35] outline-none transition placeholder:text-[#AAA197] focus:border-[#6F8F83]"
                  />
                  <DraftFieldError message={errors.licenseSummary} />
                </label>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="block text-sm font-semibold text-[#40534B]">
                    训练背景
                    <textarea
                      value={draft.trainingSummary}
                      onChange={event =>
                        onChange({ trainingSummary: event.target.value })
                      }
                      rows={4}
                      maxLength={300}
                      className="mt-2 w-full resize-none rounded-lg border border-[#D8CDBC] bg-white px-3 py-2 text-sm leading-6 text-[#243B35] outline-none transition focus:border-[#6F8F83]"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-[#40534B]">
                    咨询风格
                    <textarea
                      value={draft.serviceStyle}
                      onChange={event =>
                        onChange({ serviceStyle: event.target.value })
                      }
                      rows={4}
                      maxLength={300}
                      className="mt-2 w-full resize-none rounded-lg border border-[#D8CDBC] bg-white px-3 py-2 text-sm leading-6 text-[#243B35] outline-none transition focus:border-[#6F8F83]"
                    />
                  </label>
                </div>
                <label className="mt-3 block text-sm font-semibold text-[#40534B]">
                  适合人群
                  <textarea
                    value={draft.idealClientDescription}
                    onChange={event =>
                      onChange({ idealClientDescription: event.target.value })
                    }
                    rows={3}
                    maxLength={300}
                    className="mt-2 w-full resize-none rounded-lg border border-[#D8CDBC] bg-white px-3 py-2 text-sm leading-6 text-[#243B35] outline-none transition focus:border-[#6F8F83]"
                  />
                </label>
              </section>
            </div>

            <div className="min-w-0 space-y-5">
              <section className="rounded-lg border border-[#E8DED0] bg-[#FFFCF6] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#243B35]">
                  <ToggleLeft className="h-4 w-4 text-[#6F8F83]" />
                  接单设置
                </div>
                <div className="mt-4 grid gap-2">
                  {[
                    ["active", "正常接单"],
                    ["paused", "暂停接单"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        onChange({
                          serviceStatus: value as CounselorAdminServiceStatus,
                          acceptsNewClients: value === "active",
                        })
                      }
                      className={`h-10 rounded-lg border text-sm font-semibold transition ${
                        draft.serviceStatus === value
                          ? "border-[#6F8F83] bg-[#E5ECE1] text-[#355F51]"
                          : "border-[#D8CDBC] bg-white text-[#66716A] hover:border-[#AAB9AF]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#40534B]">
                  <input
                    type="checkbox"
                    checked={
                      draft.serviceStatus === "active" &&
                      draft.acceptsNewClients
                    }
                    disabled={draft.serviceStatus !== "active"}
                    onChange={event =>
                      onChange({ acceptsNewClients: event.target.checked })
                    }
                    className="h-4 w-4 accent-[#355F51]"
                  />
                  接受新来访者
                </label>
                <p className="mt-2 text-xs leading-5 text-[#7A827C]">
                  前台展示条件：正常接单、接受新来访者，且资质为已核验或即将到期。
                </p>
              </section>

              <section className="rounded-lg border border-[#E8DED0] bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#243B35]">
                  <FileSearch className="h-4 w-4 text-[#6F8F83]" />
                  资质状态
                </div>
                <label className="mt-4 block text-sm font-semibold text-[#40534B]">
                  状态
                  <select
                    value={draft.credentialStatus}
                    onChange={event =>
                      onChange({
                        credentialStatus: event.target
                          .value as CounselorCredentialStatus,
                      })
                    }
                    className="mt-2 h-10 w-full rounded-lg border border-[#D8CDBC] bg-white px-3 text-sm font-semibold text-[#243B35] outline-none transition focus:border-[#6F8F83]"
                  >
                    {Object.entries(credentialStatusCopy).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </label>
                <label className="mt-3 block text-sm font-semibold text-[#40534B]">
                  到期日
                  <input
                    type="date"
                    value={draft.credentialExpiresAt}
                    onChange={event =>
                      onChange({ credentialExpiresAt: event.target.value })
                    }
                    className="mt-2 h-10 w-full rounded-lg border border-[#D8CDBC] bg-white px-3 text-sm font-semibold text-[#243B35] outline-none transition focus:border-[#6F8F83]"
                  />
                </label>
              </section>

              <section className="rounded-lg border border-[#E8DED0] bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#243B35]">
                  <History className="h-4 w-4 text-[#6F8F83]" />
                  操作记录
                </div>
                <label className="mt-4 block text-sm font-semibold text-[#40534B]">
                  操作原因
                  <textarea
                    value={draft.reason}
                    onChange={event => onChange({ reason: event.target.value })}
                    rows={4}
                    maxLength={200}
                    placeholder="例如：更新咨询师展示资料"
                    className="mt-2 w-full resize-none rounded-lg border border-[#D8CDBC] bg-white px-3 py-2 text-sm leading-6 text-[#243B35] outline-none transition placeholder:text-[#AAA197] focus:border-[#6F8F83]"
                  />
                </label>
                <p className="mt-3 text-xs leading-5 text-[#7A827C]">
                  新增、编辑、停用和删除都会进入咨询运营审计。
                </p>
              </section>
            </div>
          </div>
        </div>

        <footer className="shrink-0 border-t border-[#E8DED0] bg-[#FFFDF8] px-5 py-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-[#D8CDBC] bg-white px-4 text-sm font-semibold text-[#5F6B64] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-45"
            >
              取消
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saveDisabled}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#355F51] px-5 text-sm font-semibold text-white transition hover:bg-[#243B35] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              保存咨询师资料
            </button>
          </div>
        </footer>
      </motion.aside>
    </motion.div>
  );
}

function CounselorPublicPreviewDialog({
  profile,
  onClose,
  onOpenPublicPage,
}: {
  profile: CounselorAdminProfile;
  onClose: () => void;
  onOpenPublicPage: () => void;
}) {
  const visibility = counselorPublicVisibility(profile);
  const counselor = profile.counselor;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#182E27]/30 px-4 py-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[720px] overflow-hidden rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] shadow-xl shadow-[#182E27]/20"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E8DED0] px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-[#8A8176]">用户端预览</p>
            <h2 className="mt-1 text-xl font-semibold text-[#243B35]">
              {counselor.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#D8CDBC] bg-white text-[#5F6B64] transition hover:border-[#9FB3A9]"
            title="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="rounded-lg border border-[#E6DDD0] bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xl font-semibold text-[#243B35]">
                  {counselor.name}
                </p>
                <p className="mt-1 text-sm text-[#66716A]">{counselor.title}</p>
              </div>
              <span className="rounded-full bg-[#F5EFE5] px-3 py-1 text-xs font-semibold text-[#4F7068]">
                {counselor.rating?.toFixed(1) ?? "新"}
              </span>
            </div>

            <p className="mt-4 text-sm leading-7 text-[#5F6B64]">
              {counselor.introduction}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
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
          </div>

          <div className="rounded-lg border border-[#E8DED0] bg-[#FFFCF6] p-4">
            <div
              className={`rounded-lg px-3 py-3 text-sm font-semibold ${
                visibility.visible
                  ? "bg-[#E5ECE1] text-[#355F51]"
                  : "bg-[#FFF1EC] text-[#9A5944]"
              }`}
            >
              {visibility.label}
            </div>
            <p className="mt-3 text-xs leading-5 text-[#6F7771]">
              {visibility.reason}
            </p>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#7A827C]">可预约</dt>
                <dd className="font-semibold text-[#243B35]">
                  {profile.scheduleSummary.availableCount}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#7A827C]">接新客</dt>
                <dd className="font-semibold text-[#243B35]">
                  {profile.acceptsNewClients ? "开启" : "关闭"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#7A827C]">资质</dt>
                <dd className="font-semibold text-[#243B35]">
                  {credentialStatusCopy[profile.credentialStatus]}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={onOpenPublicPage}
              className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#355F51] px-4 text-sm font-semibold text-white transition hover:bg-[#243B35]"
            >
              <ExternalLink className="h-4 w-4" />
              打开用户端
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function CounselorAuditDetailDialog({
  event,
  onClose,
}: {
  event: CounselingOperationAuditEvent;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#182E27]/30 px-4 py-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[560px] rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-xl shadow-[#182E27]/20"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#8A8176]">审计详情</p>
            <h2 className="mt-1 text-xl font-semibold text-[#243B35]">
              {auditActionCopy[event.action]}
            </h2>
            <p className="mt-2 text-xs text-[#8A8176]">{event.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#D8CDBC] bg-white text-[#5F6B64] transition hover:border-[#9FB3A9]"
            title="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 rounded-lg border border-[#E8DED0] bg-white p-4">
          <dl className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[#7A827C]">操作者</dt>
              <dd className="font-semibold text-[#243B35]">{event.actorId}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[#7A827C]">角色</dt>
              <dd className="font-semibold text-[#243B35]">
                {event.actorRoles.join(" / ")}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[#7A827C]">时间</dt>
              <dd className="font-semibold text-[#243B35]">
                {formatDate(event.createdAt)}
              </dd>
            </div>
            {event.counselorId && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#7A827C]">咨询师</dt>
                <dd className="font-semibold text-[#243B35]">
                  {event.counselorId}
                </dd>
              </div>
            )}
            {event.appointmentId && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#7A827C]">预约</dt>
                <dd className="font-semibold text-[#243B35]">
                  {event.appointmentId}
                </dd>
              </div>
            )}
            {event.userId && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#7A827C]">用户</dt>
                <dd className="font-semibold text-[#243B35]">{event.userId}</dd>
              </div>
            )}
          </dl>
          <AuditMeta event={event} />
          {event.note && (
            <p className="mt-3 rounded-lg bg-[#F8F3EA] px-3 py-2 text-sm leading-6 text-[#5F6B64]">
              {event.note}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function CounselingOperations() {
  const { user, isLoggedIn, isAuthSyncing } = useAuth();
  const [activeWorkspace, setActiveWorkspace] =
    useState<CounselingWorkspaceTab>("counselors");
  const [consoleData, setConsoleData] = useState<CounselingOperationsConsole>();
  const [scheduleConsole, setScheduleConsole] =
    useState<CounselingAdminScheduleConsole>();
  const [counselorProfileConsole, setCounselorProfileConsole] =
    useState<CounselorAdminProfileConsole>();
  const [counselorProfileFilters, setCounselorProfileFilters] = useState(
    defaultCounselorProfileFilters
  );
  const [selectedCounselorId, setSelectedCounselorId] = useState<string>();
  const [counselorProfileDraft, setCounselorProfileDraft] =
    useState<CounselorProfileDraft>();
  const [counselorProfileDraftErrors, setCounselorProfileDraftErrors] =
    useState<CounselorProfileDraftErrors>({});
  const [counselorEditorMode, setCounselorEditorMode] =
    useState<CounselorProfileEditorMode>();
  const [deleteCounselorProfile, setDeleteCounselorProfile] =
    useState<CounselorAdminProfile>();
  const [deleteCounselorReason, setDeleteCounselorReason] = useState("");
  const [publicPreviewProfile, setPublicPreviewProfile] =
    useState<CounselorAdminProfile>();
  const [auditDetailEvent, setAuditDetailEvent] =
    useState<CounselingOperationAuditEvent>();
  const [highlightedScheduleCounselorId, setHighlightedScheduleCounselorId] =
    useState<string>();
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
  const [isCounselorProfilesLoading, setIsCounselorProfilesLoading] =
    useState(false);
  const [counselorProfileActionId, setCounselorProfileActionId] =
    useState<string>();
  const [isCounselorProfileSaving, setIsCounselorProfileSaving] =
    useState(false);
  const [isCounselorDeleting, setIsCounselorDeleting] = useState(false);
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
      counselorProfileConsole?.profiles.map(profile => profile.counselor) ??
      scheduleConsole?.counselors.map(schedule => schedule.counselor) ??
      [],
    [
      counselorProfileConsole?.profiles,
      scheduleConsole?.counselors,
      serviceRecordConsole?.counselors,
    ]
  );
  const counselorProfiles = counselorProfileConsole?.profiles ?? [];
  const selectedCounselorProfile = useMemo(
    () =>
      counselorProfiles.find(
        profile => profile.counselor.id === selectedCounselorId
      ) ?? counselorProfiles[0],
    [counselorProfiles, selectedCounselorId]
  );
  const selectedCounselorDraftChanged = useMemo(
    () =>
      selectedCounselorProfile
        ? counselorProfileDraftChanged(
            selectedCounselorProfile,
            counselorProfileDraft
          )
        : false,
    [counselorProfileDraft, selectedCounselorProfile]
  );
  const selectedCounselorSchedule = useMemo(
    () =>
      scheduleConsole?.counselors.find(
        schedule =>
          schedule.counselor.id === selectedCounselorProfile?.counselor.id
      ),
    [scheduleConsole?.counselors, selectedCounselorProfile?.counselor.id]
  );
  const selectedCounselorAuditEvents = useMemo(
    () =>
      (consoleData?.auditEvents ?? [])
        .filter(
          event => event.counselorId === selectedCounselorProfile?.counselor.id
        )
        .slice(0, 4),
    [consoleData?.auditEvents, selectedCounselorProfile?.counselor.id]
  );
  const selectedCounselorVisibility = useMemo(
    () =>
      selectedCounselorProfile
        ? counselorPublicVisibility(selectedCounselorProfile)
        : undefined,
    [selectedCounselorProfile]
  );
  const highlightedScheduleCounselor = useMemo(
    () =>
      scheduleConsole?.counselors.find(
        schedule => schedule.counselor.id === highlightedScheduleCounselorId
      ),
    [highlightedScheduleCounselorId, scheduleConsole?.counselors]
  );

  const loadCounselorProfiles = useCallback(
    async (filters: CounselorProfileFiltersDraft) => {
      setIsCounselorProfilesLoading(true);
      setError(undefined);
      try {
        const payload =
          await httpCounselingRepository.loadCounselorAdminProfiles(
            toCounselorProfileRequestFilters(filters)
          );
        setCounselorProfileConsole(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "咨询师档案暂时不可用");
      } finally {
        setIsCounselorProfilesLoading(false);
      }
    },
    []
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
    void loadCounselorProfiles(defaultCounselorProfileFilters);
    void loadServiceRecords(defaultServiceRecordFilters);
  }, [
    canManageOperations,
    isAuthSyncing,
    isLoggedIn,
    loadConsole,
    loadCounselorProfiles,
    loadServiceRecords,
  ]);

  useEffect(() => {
    if (counselorEditorMode === "create") return;

    if (!counselorProfiles.length) {
      if (selectedCounselorId) setSelectedCounselorId(undefined);
      if (counselorProfileDraft) setCounselorProfileDraft(undefined);
      return;
    }

    const nextSelected =
      counselorProfiles.find(
        profile => profile.counselor.id === selectedCounselorId
      ) ?? counselorProfiles[0];
    if (!nextSelected) return;

    if (nextSelected.counselor.id !== selectedCounselorId) {
      setSelectedCounselorId(nextSelected.counselor.id);
      setCounselorProfileDraft(counselorProfileDraftFromProfile(nextSelected));
      return;
    }

    if (counselorProfileDraft?.counselorId !== nextSelected.counselor.id) {
      setCounselorProfileDraft(counselorProfileDraftFromProfile(nextSelected));
    }
  }, [
    counselorEditorMode,
    counselorProfileDraft,
    counselorProfiles,
    selectedCounselorId,
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

  const handleToggleCounselorServiceStatus = useCallback(
    async (profile: CounselorAdminProfile) => {
      setCounselorProfileActionId(profile.counselor.id);
      setError(undefined);
      const nextActive = profile.serviceStatus !== "active";
      try {
        const result =
          await httpCounselingRepository.updateCounselorAdminProfile({
            counselorId: profile.counselor.id,
            profile: {
              serviceStatus: nextActive ? "active" : "paused",
              acceptsNewClients: nextActive,
            },
            reason: nextActive ? "恢复咨询师接单" : "暂停咨询师接单",
          });
        setCounselorProfileConsole(result.console);
        setSelectedCounselorId(result.profile.counselor.id);
        setCounselorProfileDraft(
          counselorProfileDraftFromProfile(result.profile)
        );
        syncScheduleAudit(result.auditEvent);
        void loadConsole();
        void loadCounselorProfiles(counselorProfileFilters);
        void loadServiceRecords(serviceRecordFilters);
        toast(nextActive ? "已恢复接单" : "已暂停接单", {
          description: `${profile.counselor.name} 的服务状态已更新`,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "咨询师档案暂时无法保存";
        setError(message);
        toast("档案保存失败", { description: message });
      } finally {
        setCounselorProfileActionId(undefined);
      }
    },
    [
      counselorProfileFilters,
      loadConsole,
      loadCounselorProfiles,
      loadServiceRecords,
      serviceRecordFilters,
      syncScheduleAudit,
    ]
  );

  const selectCounselorProfile = useCallback(
    (profile: CounselorAdminProfile) => {
      setSelectedCounselorId(profile.counselor.id);
      setCounselorProfileDraft(counselorProfileDraftFromProfile(profile));
      setCounselorProfileDraftErrors({});
      setCounselorEditorMode(undefined);
    },
    []
  );

  const openCreateCounselorProfile = useCallback(() => {
    setCounselorEditorMode("create");
    setCounselorProfileDraft(buildNewCounselorProfileDraft());
    setCounselorProfileDraftErrors({});
  }, []);

  const openEditCounselorProfile = useCallback(
    (profile: CounselorAdminProfile) => {
      setSelectedCounselorId(profile.counselor.id);
      setCounselorProfileDraft(counselorProfileDraftFromProfile(profile));
      setCounselorProfileDraftErrors({});
      setCounselorEditorMode("edit");
    },
    []
  );

  const focusCounselorSchedule = useCallback(
    (profile: CounselorAdminProfile) => {
      setActiveWorkspace("schedule");
      setHighlightedScheduleCounselorId(profile.counselor.id);
      setScheduleDraft(previous => ({
        ...previous,
        counselorId: profile.counselor.id,
        reason:
          previous.reason.trim() || `为${profile.counselor.name}新增可预约时段`,
      }));
    },
    []
  );

  const closeCounselorEditor = useCallback(() => {
    setCounselorEditorMode(undefined);
    setCounselorProfileDraftErrors({});
    if (selectedCounselorProfile) {
      setCounselorProfileDraft(
        counselorProfileDraftFromProfile(selectedCounselorProfile)
      );
    }
  }, [selectedCounselorProfile]);

  const updateCounselorProfileDraft = useCallback(
    (patch: Partial<CounselorProfileDraft>) => {
      setCounselorProfileDraft(previous =>
        previous ? { ...previous, ...patch } : previous
      );
      setCounselorProfileDraftErrors(previous => {
        const next = { ...previous };
        (Object.keys(patch) as Array<keyof CounselorProfileDraft>).forEach(
          key => {
            delete next[key];
          }
        );
        return next;
      });
    },
    []
  );

  const toggleCounselorSpecialty = useCallback(
    (specialty: CounselorSpecialty) => {
      setCounselorProfileDraft(previous => {
        if (!previous) return previous;
        const checked = previous.specialties.includes(specialty);
        return {
          ...previous,
          specialties: checked
            ? previous.specialties.filter(item => item !== specialty)
            : [...previous.specialties, specialty],
        };
      });
      setCounselorProfileDraftErrors(previous => {
        const next = { ...previous };
        delete next.specialties;
        return next;
      });
    },
    []
  );

  const applyCounselorProfileSample = useCallback(() => {
    setCounselorProfileDraft(previous =>
      previous
        ? {
            ...previous,
            ...buildCounselorProfileSamplePatch(previous),
          }
        : previous
    );
    setCounselorProfileDraftErrors(previous => {
      const next = { ...previous };
      delete next.introduction;
      delete next.licenseSummary;
      delete next.trainingSummary;
      delete next.serviceStyle;
      delete next.idealClientDescription;
      delete next.caseHours;
      return next;
    });
  }, []);

  const handleSaveCounselorProfile = useCallback(async () => {
    if (!counselorProfileDraft) return;
    if (counselorEditorMode !== "create" && !selectedCounselorProfile) return;

    const validation = validateCounselorProfileDraft(counselorProfileDraft);
    setCounselorProfileDraftErrors(validation.errors);
    const firstError = Object.values(validation.errors)[0];
    if (firstError) {
      const message = firstError;
      setError(message);
      toast("档案保存失败", { description: message });
      return;
    }

    setIsCounselorProfileSaving(true);
    setError(undefined);
    try {
      const profilePayload = {
        name: counselorProfileDraft.name.trim(),
        title: counselorProfileDraft.title.trim(),
        introduction: counselorProfileDraft.introduction.trim(),
        specialties: counselorProfileDraft.specialties,
        licenseSummary: counselorProfileDraft.licenseSummary.trim(),
        avatarUrl: counselorProfileDraft.avatarUrl.trim() || undefined,
        trainingSummary:
          counselorProfileDraft.trainingSummary.trim() || undefined,
        serviceStyle: counselorProfileDraft.serviceStyle.trim() || undefined,
        idealClientDescription:
          counselorProfileDraft.idealClientDescription.trim() || undefined,
        yearsOfPractice: validation.values.yearsOfPractice,
        caseHours: validation.values.caseHours,
        sessionPrice: validation.values.sessionPrice,
        serviceStatus: counselorProfileDraft.serviceStatus,
        acceptsNewClients:
          counselorProfileDraft.serviceStatus === "active" &&
          counselorProfileDraft.acceptsNewClients,
        credentialStatus: counselorProfileDraft.credentialStatus,
        credentialExpiresAt: dateInputToIso(
          counselorProfileDraft.credentialExpiresAt
        ),
      };
      const result =
        counselorEditorMode === "create"
          ? await httpCounselingRepository.createCounselorAdminProfile({
              profile: profilePayload,
              reason:
                counselorProfileDraft.reason.trim() ||
                `新增咨询师档案：${counselorProfileDraft.name.trim()}`,
            })
          : await httpCounselingRepository.updateCounselorAdminProfile({
              counselorId: selectedCounselorProfile!.counselor.id,
              profile: profilePayload,
              reason:
                counselorProfileDraft.reason.trim() ||
                `更新咨询师档案：${selectedCounselorProfile!.counselor.name}`,
            });
      setCounselorProfileConsole(result.console);
      setSelectedCounselorId(result.profile.counselor.id);
      setCounselorProfileDraft(
        counselorProfileDraftFromProfile(result.profile)
      );
      setCounselorProfileDraftErrors({});
      setCounselorEditorMode(undefined);
      syncScheduleAudit(result.auditEvent);
      void loadConsole();
      void loadCounselorProfiles(counselorProfileFilters);
      void loadServiceRecords(serviceRecordFilters);
      toast("咨询师档案已保存", {
        description:
          counselorEditorMode === "create"
            ? `${result.profile.counselor.name} 已加入咨询师名册`
            : `${result.profile.counselor.name} 的前台展示和接单门禁已更新`,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "咨询师档案暂时无法保存";
      setError(message);
      toast("档案保存失败", { description: message });
    } finally {
      setIsCounselorProfileSaving(false);
    }
  }, [
    counselorProfileDraft,
    counselorEditorMode,
    counselorProfileFilters,
    loadConsole,
    loadCounselorProfiles,
    loadServiceRecords,
    selectedCounselorProfile,
    serviceRecordFilters,
    syncScheduleAudit,
  ]);

  const handleDeleteCounselorProfile = useCallback(async () => {
    if (!deleteCounselorProfile) return;
    if (deleteCounselorReason.trim().length < 2) {
      const message = "请填写删除原因，便于后续审计追溯";
      setError(message);
      toast("删除失败", { description: message });
      return;
    }

    setIsCounselorDeleting(true);
    setError(undefined);
    try {
      const result = await httpCounselingRepository.deleteCounselorAdminProfile(
        {
          counselorId: deleteCounselorProfile.counselor.id,
          reason: deleteCounselorReason.trim(),
        }
      );
      setCounselorProfileConsole(result.console);
      const nextProfile = result.console.profiles[0];
      setSelectedCounselorId(nextProfile?.counselor.id);
      setCounselorProfileDraft(
        nextProfile ? counselorProfileDraftFromProfile(nextProfile) : undefined
      );
      setCounselorEditorMode(undefined);
      setDeleteCounselorProfile(undefined);
      setDeleteCounselorReason("");
      syncScheduleAudit(result.auditEvent);
      void loadConsole();
      void loadCounselorProfiles(counselorProfileFilters);
      void loadServiceRecords(serviceRecordFilters);
      toast("咨询师已从名册移除", {
        description: "删除会保留审计记录；已有预约的咨询师会被服务端拦截",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "咨询师暂时无法删除";
      setError(message);
      toast("删除失败", { description: message });
    } finally {
      setIsCounselorDeleting(false);
    }
  }, [
    counselorProfileFilters,
    deleteCounselorProfile,
    deleteCounselorReason,
    loadConsole,
    loadCounselorProfiles,
    loadServiceRecords,
    serviceRecordFilters,
    syncScheduleAudit,
  ]);

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
            咨询师、排班与履约
          </h1>
          <p className="mt-3 max-w-[700px] text-sm leading-6 text-[#6F7771]">
            维护咨询师展示资料、接单门禁和未来可预约时段，跟进履约异常与规则审计。
          </p>
        </div>
        <button
          onClick={() => {
            void loadConsole();
            void loadCounselorProfiles(counselorProfileFilters);
            void loadServiceRecords(serviceRecordFilters);
          }}
          disabled={
            isLoading ||
            isSaving ||
            isCounselorProfilesLoading ||
            isServiceRecordsLoading
          }
          className="inline-flex h-10 w-fit items-center gap-2 rounded-lg border border-[#CFC4B5] bg-[#FFFDF8] px-4 text-sm font-semibold text-[#355F51] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ||
          isCounselorProfilesLoading ||
          isServiceRecordsLoading ? (
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

      <nav className="mt-5 grid gap-2 rounded-lg border border-[#D7CBB9] bg-[#FFFDF8] p-2 shadow-sm shadow-[#243B35]/5 md:grid-cols-4">
        {counselingWorkspaceTabs.map(tab => {
          const isActive = activeWorkspace === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveWorkspace(tab.id)}
              className={`rounded-lg px-4 py-3 text-left transition ${
                isActive
                  ? "bg-[#E5ECE1] text-[#243B35]"
                  : "text-[#66716A] hover:bg-[#F8F3EA]"
              }`}
            >
              <span className="block text-sm font-semibold">{tab.label}</span>
              <span className="mt-1 block text-xs">{tab.description}</span>
            </button>
          );
        })}
      </nav>

      {activeWorkspace === "counselors" && (
        <section className="mt-6 rounded-lg border border-[#D7CBB9] bg-[#FFFDF8] p-5 shadow-sm shadow-[#243B35]/5">
          <div className="flex flex-col gap-4 border-b border-[#E8DED0] pb-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#243B35]">
                <UserRoundCog className="h-4 w-4 text-[#6F8F83]" />
                咨询师维护工作台
              </div>
              <p className="mt-2 max-w-[720px] text-xs leading-5 text-[#7A827C]">
                维护前台展示资料、接单门禁、价格和资质状态；用户端只展示可接单且资质可用的咨询师。
              </p>
            </div>
            <div className="flex flex-col gap-2 2xl:w-[860px]">
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={openCreateCounselorProfile}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#355F51] px-4 text-sm font-semibold text-white transition hover:bg-[#243B35]"
                >
                  <Plus className="h-4 w-4" />
                  新增咨询师
                </button>
              </div>
              <div className="grid gap-2 md:grid-cols-[150px_150px_minmax(220px,1fr)_auto]">
                <select
                  value={counselorProfileFilters.serviceStatus}
                  onChange={event =>
                    setCounselorProfileFilters(previous => ({
                      ...previous,
                      serviceStatus: event.target
                        .value as CounselorProfileServiceStatusFilter,
                    }))
                  }
                  className="h-10 rounded-lg border border-[#D8CDBC] bg-white px-3 text-sm font-semibold text-[#243B35] outline-none transition focus:border-[#6F8F83]"
                >
                  <option value="all">全部状态</option>
                  {Object.entries(counselorProfileServiceStatusCopy).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    )
                  )}
                </select>
                <select
                  value={counselorProfileFilters.credentialStatus}
                  onChange={event =>
                    setCounselorProfileFilters(previous => ({
                      ...previous,
                      credentialStatus: event.target
                        .value as CounselorProfileCredentialStatusFilter,
                    }))
                  }
                  className="h-10 rounded-lg border border-[#D8CDBC] bg-white px-3 text-sm font-semibold text-[#243B35] outline-none transition focus:border-[#6F8F83]"
                >
                  <option value="all">全部资质</option>
                  {Object.entries(credentialStatusCopy).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    )
                  )}
                </select>
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8176]" />
                  <input
                    value={counselorProfileFilters.keyword}
                    onChange={event =>
                      setCounselorProfileFilters(previous => ({
                        ...previous,
                        keyword: event.target.value,
                      }))
                    }
                    onKeyDown={event => {
                      if (event.key === "Enter") {
                        void loadCounselorProfiles(counselorProfileFilters);
                      }
                    }}
                    placeholder="搜索姓名、职称、资质或擅长方向"
                    className="h-10 w-full rounded-lg border border-[#D8CDBC] bg-white pl-9 pr-3 text-sm font-semibold text-[#243B35] outline-none transition placeholder:text-[#AAA197] focus:border-[#6F8F83]"
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    void loadCounselorProfiles(counselorProfileFilters)
                  }
                  disabled={isCounselorProfilesLoading}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#355F51] px-4 text-sm font-semibold text-white transition hover:bg-[#243B35] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {isCounselorProfilesLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  筛选
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-[#E5ECE1] px-2.5 py-1 text-[#41675A]">
              咨询师 {counselorProfileConsole?.summary.totalCount ?? 0}
            </span>
            <span className="rounded-full bg-[#EEF6F0] px-2.5 py-1 text-[#2F6B54]">
              正常接单 {counselorProfileConsole?.summary.activeCount ?? 0}
            </span>
            <span className="rounded-full bg-[#FFF1EC] px-2.5 py-1 text-[#9A5944]">
              暂停 {counselorProfileConsole?.summary.pausedCount ?? 0}
            </span>
            <span className="rounded-full bg-[#FFF8DF] px-2.5 py-1 text-[#8A641C]">
              资质待关注{" "}
              {(counselorProfileConsole?.summary.pendingReviewCount ?? 0) +
                (counselorProfileConsole?.summary.expiringSoonCount ?? 0) +
                (counselorProfileConsole?.summary.expiredCredentialCount ?? 0)}
            </span>
          </div>

          {isCounselorProfilesLoading && !counselorProfileConsole ? (
            <div className="mt-5 flex min-h-[220px] items-center justify-center text-sm text-[#6F7771]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              正在读取咨询师档案
            </div>
          ) : counselorProfiles.length ? (
            <div className="mt-5 grid gap-4 2xl:grid-cols-[420px_minmax(0,1fr)]">
              <div className="min-w-0 rounded-lg border border-[#E8DED0] bg-[#FBF7EF] p-2">
                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1 2xl:max-h-[680px]">
                  {counselorProfiles.map(profile => {
                    const isSelected =
                      profile.counselor.id ===
                      selectedCounselorProfile?.counselor.id;
                    return (
                      <button
                        key={profile.counselor.id}
                        type="button"
                        onClick={() => selectCounselorProfile(profile)}
                        className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                          isSelected
                            ? "border-[#6F8F83] bg-white shadow-sm shadow-[#243B35]/5"
                            : "border-transparent bg-transparent hover:border-[#E1D7C8] hover:bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-sm font-semibold text-[#243B35]">
                                {profile.counselor.name}
                              </h2>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  profile.serviceStatus === "active"
                                    ? "bg-[#E5ECE1] text-[#41675A]"
                                    : "bg-[#FFF1EC] text-[#9A5944]"
                                }`}
                              >
                                {
                                  counselorProfileServiceStatusCopy[
                                    profile.serviceStatus
                                  ]
                                }
                              </span>
                            </div>
                            <p className="mt-1 line-clamp-1 text-xs font-semibold text-[#66716A]">
                              {profile.counselor.title} · ¥
                              {profile.counselor.sessionPrice}/次
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${credentialStatusClassName[profile.credentialStatus]}`}
                          >
                            {credentialStatusCopy[profile.credentialStatus]}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-[#66716A]">
                          <p>
                            可约{" "}
                            <span className="font-semibold text-[#243B35]">
                              {profile.scheduleSummary.availableCount}
                            </span>
                          </p>
                          <p>
                            已约{" "}
                            <span className="font-semibold text-[#243B35]">
                              {profile.scheduleSummary.scheduledCount}
                            </span>
                          </p>
                          <p>
                            异常{" "}
                            <span className="font-semibold text-[#243B35]">
                              {profile.serviceSummary.anomalyCount}
                            </span>
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedCounselorProfile && counselorProfileDraft ? (
                <div className="min-w-0 rounded-lg border border-[#E1D7C8] bg-white p-4">
                  <div className="flex flex-col gap-4 border-b border-[#E8DED0] pb-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-[#243B35]">
                          {selectedCounselorProfile.counselor.name}
                        </h2>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            selectedCounselorProfile.serviceStatus === "active"
                              ? "bg-[#E5ECE1] text-[#41675A]"
                              : "bg-[#FFF1EC] text-[#9A5944]"
                          }`}
                        >
                          {
                            counselorProfileServiceStatusCopy[
                              selectedCounselorProfile.serviceStatus
                            ]
                          }
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${credentialStatusClassName[selectedCounselorProfile.credentialStatus]}`}
                        >
                          {
                            credentialStatusCopy[
                              selectedCounselorProfile.credentialStatus
                            ]
                          }
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#66716A]">
                        {selectedCounselorProfile.counselor.title} · 最近更新{" "}
                        {formatDate(selectedCounselorProfile.updatedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPublicPreviewProfile(selectedCounselorProfile)
                        }
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#D8CDBC] bg-[#FFFDF8] px-4 text-sm font-semibold text-[#355F51] transition hover:border-[#9FB3A9]"
                      >
                        <Eye className="h-4 w-4" />
                        前台预览
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          window.open(
                            `/consulting?counselorId=${selectedCounselorProfile.counselor.id}`,
                            "_blank",
                            "noopener,noreferrer"
                          )
                        }
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#D8CDBC] bg-[#FFFDF8] px-4 text-sm font-semibold text-[#355F51] transition hover:border-[#9FB3A9]"
                      >
                        <ExternalLink className="h-4 w-4" />
                        用户端
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void handleToggleCounselorServiceStatus(
                            selectedCounselorProfile
                          )
                        }
                        disabled={
                          Boolean(counselorProfileActionId) ||
                          isCounselorProfileSaving
                        }
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#D8CDBC] bg-[#FFFDF8] px-4 text-sm font-semibold text-[#355F51] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {counselorProfileActionId ===
                        selectedCounselorProfile.counselor.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : selectedCounselorProfile.serviceStatus ===
                          "active" ? (
                          <PauseCircle className="h-4 w-4" />
                        ) : (
                          <BadgeCheck className="h-4 w-4" />
                        )}
                        {selectedCounselorProfile.serviceStatus === "active"
                          ? "暂停接单"
                          : "恢复接单"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          openEditCounselorProfile(selectedCounselorProfile)
                        }
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#355F51] px-4 text-sm font-semibold text-white transition hover:bg-[#243B35]"
                      >
                        <Pencil className="h-4 w-4" />
                        编辑资料
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteCounselorProfile(selectedCounselorProfile);
                          setDeleteCounselorReason(
                            `删除咨询师：${selectedCounselorProfile.counselor.name}`
                          );
                        }}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#E6C7BB] bg-white px-4 text-sm font-semibold text-[#A65F48] transition hover:border-[#D59A87]"
                      >
                        <Trash2 className="h-4 w-4" />
                        删除
                      </button>
                    </div>
                  </div>

                  {selectedCounselorProfile && (
                    <div className="mt-4 grid gap-2 md:grid-cols-4">
                      {[
                        {
                          label: "未来可约",
                          value:
                            selectedCounselorProfile.scheduleSummary
                              .availableCount,
                        },
                        {
                          label: "已预约",
                          value:
                            selectedCounselorProfile.scheduleSummary
                              .scheduledCount,
                        },
                        {
                          label: "完成服务",
                          value:
                            selectedCounselorProfile.serviceSummary
                              .completedCount,
                        },
                        {
                          label: "异常",
                          value:
                            selectedCounselorProfile.serviceSummary
                              .anomalyCount,
                        },
                      ].map(item => (
                        <div
                          key={item.label}
                          className="rounded-lg border border-[#E8DED0] bg-[#FFFDF8] px-3 py-3"
                        >
                          <p className="text-xs text-[#8A8176]">{item.label}</p>
                          <p className="mt-1 text-lg font-semibold text-[#243B35]">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(280px,1.1fr)]">
                    <section className="rounded-lg border border-[#E8DED0] bg-[#FFFCF6] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[#243B35]">
                          <Eye className="h-4 w-4 text-[#6F8F83]" />
                          前台可见性
                        </div>
                        {selectedCounselorVisibility && (
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              selectedCounselorVisibility.visible
                                ? "bg-[#E5ECE1] text-[#355F51]"
                                : "bg-[#FFF1EC] text-[#9A5944]"
                            }`}
                          >
                            {selectedCounselorVisibility.label}
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-xs leading-5 text-[#6F7771]">
                        {selectedCounselorVisibility?.reason ??
                          "读取前台展示规则中"}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setPublicPreviewProfile(selectedCounselorProfile)
                        }
                        className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#D8CDBC] bg-white px-3 text-xs font-semibold text-[#355F51] transition hover:border-[#9FB3A9]"
                      >
                        <Eye className="h-4 w-4" />
                        查看展示卡片
                      </button>
                    </section>

                    <section className="rounded-lg border border-[#E8DED0] bg-[#FFFCF6] p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#243B35]">
                        <CalendarDays className="h-4 w-4 text-[#6F8F83]" />
                        排班承接
                      </div>
                      <p className="mt-3 text-xs leading-5 text-[#6F7771]">
                        {selectedCounselorSchedule?.nextAvailableAt
                          ? `最近可约 ${formatDate(
                              selectedCounselorSchedule.nextAvailableAt
                            )}`
                          : "暂无可预约时段，建议补充排班后再开放成交入口"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded-full bg-[#E5ECE1] px-2.5 py-1 text-[#41675A]">
                          可约{" "}
                          {selectedCounselorSchedule?.summary.availableCount ??
                            0}
                        </span>
                        <span className="rounded-full bg-[#EFF4FB] px-2.5 py-1 text-[#3B5F8A]">
                          已约{" "}
                          {selectedCounselorSchedule?.summary.scheduledCount ??
                            0}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          focusCounselorSchedule(selectedCounselorProfile)
                        }
                        className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#D8CDBC] bg-white px-3 text-xs font-semibold text-[#355F51] transition hover:border-[#9FB3A9]"
                      >
                        <CalendarPlus className="h-4 w-4" />
                        去排班
                      </button>
                    </section>

                    <section className="rounded-lg border border-[#E8DED0] bg-[#FFFCF6] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[#243B35]">
                          <History className="h-4 w-4 text-[#6F8F83]" />
                          最近审计
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveWorkspace("rules")}
                          className="text-xs font-semibold text-[#355F51] transition hover:text-[#243B35]"
                        >
                          全部流水
                        </button>
                      </div>
                      {selectedCounselorAuditEvents.length ? (
                        <div className="mt-3 divide-y divide-[#E8DED0]">
                          {selectedCounselorAuditEvents
                            .slice(0, 2)
                            .map(event => (
                              <div
                                key={event.id}
                                className="flex items-center justify-between gap-3 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold text-[#243B35]">
                                    {auditActionCopy[event.action]}
                                  </p>
                                  <p className="mt-1 truncate text-xs text-[#8A8176]">
                                    {event.actorId} ·{" "}
                                    {formatDate(event.createdAt)}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setAuditDetailEvent(event)}
                                  className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-[#D8CDBC] bg-white px-2.5 text-xs font-semibold text-[#355F51] transition hover:border-[#9FB3A9]"
                                >
                                  详情
                                </button>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-xs leading-5 text-[#6F7771]">
                          暂无该咨询师的审计记录。
                        </p>
                      )}
                    </section>
                  </div>

                  <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#243B35]">
                        <ListChecks className="h-4 w-4 text-[#6F8F83]" />
                        前台展示摘要
                      </div>
                      {selectedCounselorProfile.counselor.avatarUrl && (
                        <div className="mt-4 flex items-center gap-3 rounded-lg bg-[#F8F3EA] p-3">
                          <img
                            src={selectedCounselorProfile.counselor.avatarUrl}
                            alt=""
                            className="h-16 w-16 rounded-lg object-cover"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#243B35]">
                              {selectedCounselorProfile.counselor.name}
                            </p>
                            <p className="mt-1 text-xs text-[#7A827C]">
                              用户端咨询师卡片与预约页展示素材
                            </p>
                          </div>
                        </div>
                      )}
                      <p className="mt-3 text-sm leading-7 text-[#5F6B64]">
                        {selectedCounselorProfile.counselor.introduction}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {selectedCounselorProfile.counselor.specialties.map(
                          specialty => (
                            <span
                              key={specialty}
                              className="rounded-full bg-[#F1E9DD] px-2.5 py-1 text-xs font-semibold text-[#6F675E]"
                            >
                              {specialtyCopy[specialty]}
                            </span>
                          )
                        )}
                      </div>
                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        {selectedCounselorProfile.counselor.trainingSummary && (
                          <div className="rounded-lg border border-[#E8DED0] bg-[#FFFCF6] p-3">
                            <p className="text-xs font-semibold text-[#8A8176]">
                              训练背景
                            </p>
                            <p className="mt-2 text-sm leading-6 text-[#40534B]">
                              {
                                selectedCounselorProfile.counselor
                                  .trainingSummary
                              }
                            </p>
                          </div>
                        )}
                        {selectedCounselorProfile.counselor.serviceStyle && (
                          <div className="rounded-lg border border-[#E8DED0] bg-[#FFFCF6] p-3">
                            <p className="text-xs font-semibold text-[#8A8176]">
                              咨询风格
                            </p>
                            <p className="mt-2 text-sm leading-6 text-[#40534B]">
                              {selectedCounselorProfile.counselor.serviceStyle}
                            </p>
                          </div>
                        )}
                        {selectedCounselorProfile.counselor
                          .idealClientDescription && (
                          <div className="rounded-lg border border-[#E8DED0] bg-[#FFFCF6] p-3 md:col-span-2">
                            <p className="text-xs font-semibold text-[#8A8176]">
                              适合人群
                            </p>
                            <p className="mt-2 text-sm leading-6 text-[#40534B]">
                              {
                                selectedCounselorProfile.counselor
                                  .idealClientDescription
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 rounded-lg border border-[#E8DED0] bg-[#FFFCF6] p-4">
                      <p className="text-sm font-semibold text-[#243B35]">
                        维护状态
                      </p>
                      <dl className="mt-3 grid gap-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-[#7A827C]">接新客</dt>
                          <dd className="font-semibold text-[#243B35]">
                            {selectedCounselorProfile.acceptsNewClients
                              ? "开启"
                              : "关闭"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-[#7A827C]">执业年限</dt>
                          <dd className="font-semibold text-[#243B35]">
                            {selectedCounselorProfile.counselor.yearsOfPractice}{" "}
                            年
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-[#7A827C]">单次价格</dt>
                          <dd className="font-semibold text-[#243B35]">
                            ¥{selectedCounselorProfile.counselor.sessionPrice}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-[#7A827C]">服务小时</dt>
                          <dd className="font-semibold text-[#243B35]">
                            {selectedCounselorProfile.counselor.caseHours ??
                              "未填写"}
                          </dd>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <dt className="text-[#7A827C]">资质摘要</dt>
                          <dd className="max-w-[220px] text-right font-semibold leading-6 text-[#243B35]">
                            {selectedCounselorProfile.counselor.licenseSummary}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-5 flex min-h-[220px] flex-col items-center justify-center px-6 text-center">
              <UserRoundCog className="h-8 w-8 text-[#7C9288]" />
              <h2 className="mt-4 text-lg font-semibold">暂无咨询师档案</h2>
              <p className="mt-2 max-w-[360px] text-sm leading-6 text-[#6F7771]">
                当前筛选条件下没有咨询师，调整状态或关键词后再查看。
              </p>
            </div>
          )}
        </section>
      )}

      {activeWorkspace === "schedule" && (
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
                <option
                  key={schedule.counselor.id}
                  value={schedule.counselor.id}
                >
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
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                {highlightedScheduleCounselor && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#9FB3A9] bg-white px-2.5 py-1 text-[#355F51]">
                    已定位 {highlightedScheduleCounselor.counselor.name}
                    <button
                      type="button"
                      onClick={() =>
                        setHighlightedScheduleCounselorId(undefined)
                      }
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[#5F6B64] transition hover:bg-[#E5ECE1]"
                      title="取消定位"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
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
                {scheduleConsole.counselors.map(schedule => {
                  const isHighlighted =
                    highlightedScheduleCounselorId === schedule.counselor.id;

                  return (
                    <article
                      key={schedule.counselor.id}
                      className={`rounded-lg border p-4 transition ${
                        isHighlighted
                          ? "border-[#6F8F83] bg-white shadow-sm shadow-[#243B35]/10"
                          : "border-[#E6DDD0] bg-[#FFFCF6]"
                      }`}
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
                                        title={
                                          canClose ? "关闭时段" : "恢复时段"
                                        }
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
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-[360px] items-center justify-center text-sm text-[#6F7771]">
                暂无排班数据
              </div>
            )}
          </motion.div>
        </section>
      )}

      {activeWorkspace === "records" && (
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
                    anomalyType: event.target
                      .value as ServiceRecordAnomalyFilter,
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
      )}

      {activeWorkspace === "rules" && (
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
      )}

      {counselorEditorMode && counselorProfileDraft && (
        <CounselorProfileEditorDrawer
          mode={counselorEditorMode}
          draft={counselorProfileDraft}
          errors={counselorProfileDraftErrors}
          hasChanges={selectedCounselorDraftChanged}
          isSaving={isCounselorProfileSaving}
          onApplySample={applyCounselorProfileSample}
          onChange={updateCounselorProfileDraft}
          onClose={closeCounselorEditor}
          onSave={() => void handleSaveCounselorProfile()}
          onToggleSpecialty={toggleCounselorSpecialty}
        />
      )}

      {publicPreviewProfile && (
        <CounselorPublicPreviewDialog
          profile={publicPreviewProfile}
          onClose={() => setPublicPreviewProfile(undefined)}
          onOpenPublicPage={() =>
            window.open(
              `/consulting?counselorId=${publicPreviewProfile.counselor.id}`,
              "_blank",
              "noopener,noreferrer"
            )
          }
        />
      )}

      {auditDetailEvent && (
        <CounselorAuditDetailDialog
          event={auditDetailEvent}
          onClose={() => setAuditDetailEvent(undefined)}
        />
      )}

      {deleteCounselorProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#182E27]/30 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-[520px] rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-xl shadow-[#182E27]/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#243B35]">
                  删除咨询师
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6F7771]">
                  {deleteCounselorProfile.counselor.name}{" "}
                  将从运营名册和用户端可预约列表移除；若已有预约记录，服务端会拦截删除。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteCounselorProfile(undefined)}
                disabled={isCounselorDeleting}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#D8CDBC] bg-white text-[#5F6B64] transition hover:border-[#9FB3A9] disabled:opacity-50"
                title="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-5 block text-sm font-semibold text-[#40534B]">
              删除原因
              <textarea
                value={deleteCounselorReason}
                onChange={event => setDeleteCounselorReason(event.target.value)}
                rows={3}
                maxLength={200}
                className="mt-2 w-full resize-none rounded-lg border border-[#D8CDBC] bg-white px-3 py-2 text-sm leading-6 text-[#243B35] outline-none transition focus:border-[#6F8F83]"
              />
            </label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteCounselorProfile(undefined)}
                disabled={isCounselorDeleting}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[#D8CDBC] bg-white px-4 text-sm font-semibold text-[#5F6B64] transition hover:border-[#9FB3A9] disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteCounselorProfile()}
                disabled={isCounselorDeleting}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#A65F48] px-4 text-sm font-semibold text-white transition hover:bg-[#8E4E3B] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isCounselorDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
