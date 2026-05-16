import { useMemo, useState, type ElementType, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  ArrowRight,
  BarChart3,
  BookmarkCheck,
  BookOpenCheck,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Compass,
  Crown,
  Heart,
  Loader2,
  LockKeyhole,
  PlayCircle,
  ReceiptText,
  Route,
  Trophy,
  UserRound,
  XCircle,
} from "lucide-react";
import AppFooter from "@/components/AppFooter";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import type { OrderStatus, UserRole } from "@shared/domain";
import {
  createLearningPlanWorkspace,
  getCourseAccessDescription,
  useCourseAccess,
  useCourseCatalog,
  useCourseEngagement,
  type Course,
  type CourseAccessStatus,
  type LearningPlanCourseItem,
} from "@/features/courses";
import {
  getTopAssessmentDimensions,
  loadLatestAssessmentResult,
  type AssessmentDimension,
} from "@/features/assessments";
import {
  COUNSELING_PAYMENT_HOLD_MINUTES,
  getCounselingPaymentDeadline,
  httpCounselingRepository,
  type CounselingAppointmentRecord,
  type CounselingAppointmentAction,
  type CounselingConcernTag,
} from "@/features/counseling";
import { useGrowthProfile } from "@/features/growth";

const accessStatusCopy = {
  free: "免费课程",
  owned: "已购买",
  member_included: "会员权益",
  requires_purchase: "待购买",
  requires_membership: "会员课",
} satisfies Record<CourseAccessStatus, string>;

const progressStatusCopy = {
  not_started: "未开始",
  in_progress: "学习中",
  completed: "已完成",
} satisfies Record<"not_started" | "in_progress" | "completed", string>;

function getPlanActionLabel(item: LearningPlanCourseItem): string {
  if (!item.access.canStart) return "查看详情";
  if (item.bucket === "saved") {
    return "加入学习计划";
  }

  return item.bucket === "completed" ? "复习课程" : "继续学习";
}

const roleCopy = {
  visitor: "访客",
  member: "会员用户",
  counselor: "咨询师",
  catalog_viewer: "课程只读",
  catalog_operator: "课程运营",
  operator: "运营",
  admin: "管理员",
} satisfies Record<UserRole, string>;

const orderStatusCopy = {
  created: "已创建",
  pending_payment: "待支付",
  paid: "已支付",
  closed: "已关闭",
  refunding: "退款中",
  refunded: "已退款",
} satisfies Record<OrderStatus, string>;

const appointmentStatusCopy = {
  pending_payment: "待支付",
  scheduled: "已预约",
  completed: "已完成",
  cancelled: "已取消",
  no_show: "未到访",
  refunded: "已退款",
} as const;

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

const assessmentDimensionCopy = {
  emotion: "情绪",
  sleep: "睡眠",
  relationship: "关系",
  parent_child: "亲子",
  workplace: "职场",
  self_growth: "成长",
  risk: "风险",
} satisfies Record<AssessmentDimension, string>;

function formatCurrency(amount: number): string {
  return `¥${amount.toFixed(amount % 1 === 0 ? 0 : 1)}`;
}

function formatDate(value?: string): string {
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

function EmptyState({
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
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[#D8CEC0] bg-[#FFFDF8]/72 px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E6EDDF] text-[#41675A]">
        <Icon className="h-5 w-5" />
      </span>
      <h2 className="mt-5 text-lg font-semibold text-[#243B35]">{title}</h2>
      <p className="mt-2 max-w-[420px] text-sm leading-6 text-[#767F78]">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  accent = "sage",
}: {
  label: string;
  value: string | number;
  icon: ElementType;
  accent?: "sage" | "clay" | "gold" | "ink";
}) {
  const Icon = icon;
  const tone =
    accent === "clay"
      ? "bg-[#F4E5DE] text-[#A65F48]"
      : accent === "gold"
        ? "bg-[#F2E6C9] text-[#81652C]"
        : accent === "ink"
          ? "bg-[#E2E5E1] text-[#243B35]"
          : "bg-[#E6EDDF] text-[#41675A]";

  return (
    <div className="min-w-0 rounded-[22px] border border-[#E4DCCF] bg-[#FFFDF8] p-5 shadow-sm shadow-[#243B35]/5">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm text-[#767F78]">{label}</p>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-5 truncate text-3xl font-semibold text-[#243B35]">
        {value}
      </p>
    </div>
  );
}

function CourseRow({
  item,
  onOpen,
  onStart,
}: {
  item: LearningPlanCourseItem;
  onOpen: () => void;
  onStart: () => void;
}) {
  const progressLabel = item.progress
    ? progressStatusCopy[item.progress.status]
    : "未开始";
  const completedCount = item.progress?.completedChapterIds.length ?? 0;
  const locked = !item.access.canStart;
  const primaryLabel = getPlanActionLabel(item);
  const handlePrimaryAction =
    item.bucket === "saved" && item.access.canStart ? onStart : onOpen;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
      className="grid gap-4 border-b border-[#E7DED0] px-1 py-5 last:border-b-0 md:grid-cols-[112px_1fr_auto]"
    >
      <button
        onClick={onOpen}
        className="relative h-[82px] w-full overflow-hidden rounded-[18px] bg-[#E7DED0] md:w-[112px]"
        aria-label={`查看${item.course.title}`}
      >
        <img
          src={item.course.coverUrl}
          alt=""
          className="h-full w-full object-cover transition duration-300 hover:scale-105"
        />
        {locked && (
          <span className="absolute inset-0 flex items-center justify-center bg-[#243B35]/52 text-white">
            <LockKeyhole className="h-5 w-5" />
          </span>
        )}
      </button>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#E6EDDF] px-2.5 py-1 text-xs font-semibold text-[#41675A]">
            {accessStatusCopy[item.access.status]}
          </span>
          <span className="rounded-full bg-[#F4E5DE] px-2.5 py-1 text-xs font-semibold text-[#A65F48]">
            {item.learningPath.label}
          </span>
          <span className="rounded-full bg-[#F7EFE6] px-2.5 py-1 text-xs font-semibold text-[#8B6F46]">
            {item.course.category}
          </span>
          {item.isFavorited && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F7EFE6] px-2.5 py-1 text-xs font-semibold text-[#8B6F46]">
              <Heart className="h-3 w-3 fill-current" />
              已收藏
            </span>
          )}
        </div>
        <button
          onClick={onOpen}
          className="mt-3 block max-w-full truncate text-left text-lg font-semibold text-[#243B35] transition hover:text-[#6F8F83]"
        >
          {item.course.title}
        </button>
        <p className="mt-2 text-sm text-[#767F78]">
          {item.course.teacher} · {item.course.type} · {item.totalChapters}{" "}
          个阶段
        </p>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 w-full max-w-[420px] overflow-hidden rounded-full bg-[#ECE5DB]">
            <span
              className={`block h-full rounded-full ${
                locked ? "bg-[#CDBEA9]" : "bg-[#6F8F83]"
              }`}
              style={{ width: `${item.progressPercent}%` }}
            />
          </div>
          <span className="w-12 shrink-0 text-right text-xs font-semibold text-[#667069]">
            {item.progressPercent}%
          </span>
        </div>
        <p className="mt-2 text-xs text-[#8A918B]">
          {progressLabel} · 已完成 {completedCount} / {item.totalChapters}{" "}
          个阶段
        </p>
        {item.nextCourse && (
          <p className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#F4EFE6] px-3 py-1 text-xs font-semibold text-[#6D746F]">
            <Route className="h-3.5 w-3.5 shrink-0 text-[#6F8F83]" />
            <span className="truncate">下一门：{item.nextCourse.title}</span>
          </p>
        )}
      </div>

      <div className="flex items-center md:justify-end">
        <button
          onClick={handlePrimaryAction}
          className={`inline-flex h-11 min-w-[116px] items-center justify-center rounded-full px-4 text-sm font-semibold transition ${
            locked
              ? "border border-[#D8CEC0] text-[#6D746F] hover:bg-[#FFFDF8]"
              : "bg-[#243B35] text-white hover:bg-[#315047]"
          }`}
        >
          {primaryLabel}
          <ArrowRight className="ml-2 h-4 w-4" />
        </button>
      </div>
    </motion.article>
  );
}

function PlanSection({
  title,
  description,
  items,
  emptyText,
  icon,
  onOpenCourse,
  onStartCourse,
}: {
  title: string;
  description: string;
  items: LearningPlanCourseItem[];
  emptyText: string;
  icon: ElementType;
  onOpenCourse: (course: Course) => void;
  onStartCourse: (course: Course) => void;
}) {
  const Icon = icon;

  return (
    <section className="border-t border-[#E7DED0] pt-6 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#6F8F83]">
            <Icon className="h-4 w-4" />
            {title}
          </p>
          <p className="mt-2 text-sm leading-6 text-[#767F78]">{description}</p>
        </div>
        <span className="w-fit rounded-full bg-[#F4EFE6] px-3 py-1 text-xs font-semibold text-[#6D746F]">
          {items.length} 门
        </span>
      </div>

      {items.length ? (
        <div className="mt-2">
          {items.map(item => (
            <CourseRow
              key={item.course.id}
              item={item}
              onOpen={() => onOpenCourse(item.course)}
              onStart={() => onStartCourse(item.course)}
            />
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-[18px] bg-[#F9F5EE] px-4 py-3 text-sm leading-6 text-[#767F78]">
          {emptyText}
        </p>
      )}
    </section>
  );
}

function AppointmentRow({
  record,
  onOpen,
  onConfirmPayment,
  onCancel,
  isUpdating,
}: {
  record: CounselingAppointmentRecord;
  onOpen: () => void;
  onConfirmPayment: () => void;
  onCancel: () => void;
  isUpdating: boolean;
}) {
  const status = appointmentStatusCopy[record.appointment.status];
  const canConfirmPayment = record.appointment.status === "pending_payment";
  const canCancel = ["pending_payment", "scheduled"].includes(
    record.appointment.status
  );
  const paymentDeadline = canConfirmPayment
    ? getCounselingPaymentDeadline(record.appointment)
    : undefined;

  return (
    <div className="rounded-[20px] border border-[#E7DED0] bg-[#FFFCF7] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#243B35]">
            {record.counselor.name} · {formatDate(record.slot.startsAt)}
          </p>
          <p className="mt-1 text-xs text-[#8A918B]">
            {record.counselor.title} · {record.appointment.channel}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#E6EDDF] px-2.5 py-1 text-xs font-semibold text-[#41675A]">
          {status}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {record.appointment.concernTags.slice(0, 4).map(tag => (
          <span
            key={tag}
            className="rounded-full bg-[#F5EFE5] px-2.5 py-1 text-xs font-semibold text-[#6D746F]"
          >
            {concernTagCopy[tag]}
          </span>
        ))}
      </div>

      {record.riskEvent && (
        <p className="mt-3 rounded-[16px] bg-[#FFF5EF] px-3 py-2 text-xs leading-5 text-[#A65F48]">
          已进入风险关注队列：{record.riskEvent.riskLevel}
        </p>
      )}

      {record.appointment.assessmentReportId && (
        <p className="mt-3 rounded-[16px] bg-[#F5EFE5] px-3 py-2 text-xs leading-5 text-[#6D746F]">
          已关联测评报告：{record.appointment.assessmentReportId}
        </p>
      )}

      {record.order && (
        <p className="mt-3 rounded-[16px] bg-[#F5EFE5] px-3 py-2 text-xs leading-5 text-[#6D746F]">
          关联订单：{orderStatusCopy[record.order.status]} ·{" "}
          {formatCurrency(record.order.payableAmount)}
        </p>
      )}

      {paymentDeadline && (
        <p className="mt-3 flex items-start gap-2 rounded-[16px] bg-[#F4E5DE] px-3 py-2 text-xs leading-5 text-[#8C5947]">
          <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            支付保留至 {formatDate(paymentDeadline)}，超过{" "}
            {COUNSELING_PAYMENT_HOLD_MINUTES} 分钟将自动取消并释放时段。
          </span>
        </p>
      )}

      <button
        onClick={onOpen}
        className="mt-4 inline-flex h-9 items-center justify-center rounded-full border border-[#D8CEC0] px-3 text-xs font-semibold text-[#4F5B54] transition hover:bg-[#F4EFE6]"
      >
        查看预约入口
        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
      </button>

      {(canConfirmPayment || canCancel) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {canConfirmPayment && (
            <button
              onClick={onConfirmPayment}
              disabled={isUpdating}
              className="inline-flex h-9 items-center justify-center rounded-full bg-[#243B35] px-3 text-xs font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:bg-[#9AA19B]"
            >
              {isUpdating ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              确认支付
            </button>
          )}
          {canCancel && (
            <button
              onClick={onCancel}
              disabled={isUpdating}
              className="inline-flex h-9 items-center justify-center rounded-full border border-[#D8CEC0] px-3 text-xs font-semibold text-[#6D746F] transition hover:bg-[#F4EFE6] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <XCircle className="mr-1.5 h-3.5 w-3.5" />
              取消预约
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyCourses() {
  const [, navigate] = useLocation();
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState<
    string | undefined
  >();
  const { user, isLoggedIn, isAuthSyncing, openLoginModal } = useAuth();
  const { allCourses, isLoading: isCatalogLoading } = useCourseCatalog();
  const {
    accessState,
    hasActiveMembership,
    membership,
    isSyncing: isAccessSyncing,
    accessError,
    getCourseAccess,
  } = useCourseAccess();
  const { engagementState, startCourse } = useCourseEngagement();
  const {
    profile: growthProfile,
    isLoading: isGrowthProfileLoading,
    error: growthProfileError,
    reload: reloadGrowthProfile,
  } = useGrowthProfile(isLoggedIn);
  const localAssessment = useMemo(() => loadLatestAssessmentResult(), []);
  const latestAssessment = growthProfile?.latestAssessment ?? localAssessment;
  const profileSummary = growthProfile?.summary;
  const profileCourseAccess = growthProfile?.courseAccess;

  const learningPlan = useMemo(
    () =>
      createLearningPlanWorkspace({
        courses: allCourses,
        engagementState,
        resolveAccess: getCourseAccess,
      }),
    [allCourses, engagementState, getCourseAccess]
  );

  const recentOrders = useMemo(() => {
    return (profileCourseAccess?.orders ?? accessState.orders).slice(0, 4);
  }, [accessState.orders, profileCourseAccess]);
  const recentAppointments = useMemo(
    () => (growthProfile?.counseling.appointments ?? []).slice(0, 3),
    [growthProfile]
  );
  const topAssessmentDimensions = useMemo(
    () => getTopAssessmentDimensions(latestAssessment, 3),
    [latestAssessment]
  );

  const membershipLabel = hasActiveMembership
    ? (membership.planName ?? "成长会员")
    : "未开通";
  const isBusy =
    isAuthSyncing ||
    isCatalogLoading ||
    isAccessSyncing ||
    isGrowthProfileLoading;
  const focusItem = learningPlan.focusItem;
  const nextCourse = learningPlan.nextCourse;

  const handleOpenCourse = (course: Course) => {
    navigate(`/courses/${course.id}`);
  };

  const handleStartCourse = (course: Course) => {
    const access = getCourseAccess(course);
    if (!access.canStart) {
      toast("请先解锁课程", {
        description: getCourseAccessDescription(access.status),
      });
      navigate(`/courses/${course.id}`);
      return;
    }

    startCourse(course.id);
    toast("已加入学习计划", {
      description: `「${course.title}」已放入进行中课程，可以从成长空间继续。`,
    });
  };

  const handleAppointmentAction = async (
    appointmentId: string,
    action: Extract<CounselingAppointmentAction, "confirm_payment" | "cancel">
  ) => {
    setUpdatingAppointmentId(appointmentId);
    try {
      const result = await httpCounselingRepository.updateAppointment(
        appointmentId,
        action
      );
      await reloadGrowthProfile();
      if (action === "confirm_payment") {
        toast("预约已确认", {
          description: "咨询师会在服务前查看你的咨询前信息。",
        });
      } else {
        toast(
          result.order?.status === "refunding"
            ? "预约已取消，退款处理中"
            : "预约已取消",
          {
            description:
              result.order?.status === "refunding"
                ? "原咨询时段已释放，退款完成后订单会更新为已退款。"
                : "原咨询时段已释放，可以重新选择合适时间。",
          }
        );
      }
    } catch (err) {
      toast("预约状态更新失败", {
        description:
          err instanceof Error ? err.message : "请稍后再试或联系平台支持。",
      });
    } finally {
      setUpdatingAppointmentId(undefined);
    }
  };

  if (!isLoggedIn && !isAuthSyncing) {
    return (
      <div className="min-h-screen bg-[#F9F5EE] text-[#243B35]">
        <AppHeader />
        <main className="mx-auto flex min-h-[calc(100vh-220px)] max-w-[1080px] items-center px-5 py-14 sm:px-8 lg:px-10">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
            className="grid w-full gap-8 rounded-[32px] border border-[#E4DCCF] bg-[#FFFDF8] p-6 shadow-sm shadow-[#243B35]/6 md:grid-cols-[1fr_340px] md:p-9"
          >
            <div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#E6EDDF] text-[#41675A]">
                <UserRound className="h-5 w-5" />
              </span>
              <h1 className="mt-6 text-3xl font-semibold tracking-normal text-[#243B35] sm:text-4xl">
                登录后查看你的成长空间
              </h1>
              <p className="mt-4 max-w-[560px] text-sm leading-7 text-[#6D746F]">
                课程权益、学习进度、测评报告、咨询预约和订单会在这里集中管理，方便你随时回到自己的成长节奏。
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={openLoginModal}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#243B35] px-6 text-sm font-semibold text-white transition hover:bg-[#315047]"
                >
                  登录 / 注册
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate("/courses")}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-[#D8CEC0] px-6 text-sm font-semibold text-[#4F5B54] transition hover:bg-[#F4EFE6]"
                >
                  先看看课程
                </button>
              </div>
            </div>

            <div className="rounded-[28px] bg-[#F5EFE5] p-5">
              <div className="rounded-[22px] bg-[#243B35] p-5 text-white">
                <p className="text-sm font-semibold text-[#DDE8D9]">个人空间</p>
                <div className="mt-8 space-y-4">
                  {["课程权益", "测评记录", "咨询预约"].map(label => (
                    <div
                      key={label}
                      className="flex items-center justify-between border-b border-white/12 pb-4 last:border-b-0 last:pb-0"
                    >
                      <span className="text-sm text-white/76">{label}</span>
                      <span className="h-2 w-16 rounded-full bg-white/20" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F5EE] text-[#243B35]">
      <AppHeader />

      <main className="mx-auto max-w-[1220px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-[32px] bg-[#243B35] p-6 text-white shadow-xl shadow-[#243B35]/10 sm:p-8 lg:p-10"
        >
          <div className="grid gap-8 lg:grid-cols-[1fr_390px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#DDE8D9]">
                  <BookOpenCheck className="h-3.5 w-3.5" />
                  学习计划
                </span>
                {isBusy && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/72">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    正在更新
                  </span>
                )}
              </div>
              <h1 className="mt-6 text-3xl font-semibold tracking-normal sm:text-4xl lg:text-5xl">
                {user?.nickname ? `${user.nickname}的成长空间` : "成长空间"}
              </h1>
              <p className="mt-4 max-w-[660px] text-sm leading-7 text-white/72">
                这里优先整理已加入学习计划、收藏待学和已完成课程，再把测评与咨询放在辅助位置，帮助你知道下一步接着学什么。
              </p>

              {focusItem ? (
                <div className="mt-8 max-w-[700px] border-l border-[#BFD0B8]/45 pl-5">
                  <p className="text-xs font-semibold text-[#BFD0B8]">
                    本次继续
                  </p>
                  <button
                    onClick={() => handleOpenCourse(focusItem.course)}
                    className="mt-3 block text-left text-2xl font-semibold leading-snug text-white transition hover:text-[#DDE8D9]"
                  >
                    {focusItem.course.title}
                  </button>
                  <p className="mt-3 text-sm leading-6 text-white/68">
                    {focusItem.learningPath.title} · 已完成{" "}
                    {focusItem.progressPercent}% ·{" "}
                    {focusItem.nextCourse
                      ? `下一门建议 ${focusItem.nextCourse.title}`
                      : "当前路径暂无更多课程"}
                  </p>
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() =>
                        focusItem.bucket === "saved" &&
                        focusItem.access.canStart
                          ? handleStartCourse(focusItem.course)
                          : handleOpenCourse(focusItem.course)
                      }
                      className="inline-flex h-11 items-center justify-center rounded-full bg-[#DDE8D9] px-5 text-sm font-semibold text-[#20362F] transition hover:bg-white"
                    >
                      <PlayCircle className="mr-2 h-4 w-4" />
                      {getPlanActionLabel(focusItem)}
                    </button>
                    {nextCourse && (
                      <button
                        onClick={() => handleOpenCourse(nextCourse)}
                        className="inline-flex h-11 items-center justify-center rounded-full border border-white/18 px-5 text-sm font-semibold text-white/82 transition hover:bg-white/10 hover:text-white"
                      >
                        查看下一门
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-8 max-w-[680px] border-l border-[#BFD0B8]/45 pl-5">
                  <p className="text-xs font-semibold text-[#BFD0B8]">
                    尚未建立学习计划
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/68">
                    可以先收藏一门课程，或从免费课程加入学习计划，成长空间会自动生成继续学习和下一步建议。
                  </p>
                  <button
                    onClick={() => navigate("/courses")}
                    className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#DDE8D9] px-5 text-sm font-semibold text-[#20362F] transition hover:bg-white"
                  >
                    去课程中心
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="mt-7 flex flex-wrap gap-2">
                {(user?.roles ?? []).map(role => (
                  <span
                    key={role}
                    className="rounded-full border border-white/16 px-3 py-1 text-xs font-semibold text-white/78"
                  >
                    {roleCopy[role]}
                  </span>
                ))}
                <span className="rounded-full border border-white/16 px-3 py-1 text-xs font-semibold text-white/78">
                  会话至 {formatDate(user?.sessionExpiresAt)}
                </span>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/12 bg-white/8 p-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-[#DDE8D9]">
                  下一步建议
                </p>
                <Compass className="h-5 w-5 text-[#DDE8D9]" />
              </div>

              {nextCourse ? (
                <button
                  onClick={() => handleOpenCourse(nextCourse)}
                  className="group mt-5 block w-full text-left"
                >
                  <img
                    src={nextCourse.coverUrl}
                    alt=""
                    className="h-36 w-full rounded-[22px] object-cover opacity-90 transition duration-300 group-hover:opacity-100"
                  />
                  <span className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#DDE8D9]">
                    同路径下一课
                  </span>
                  <span className="mt-3 block text-xl font-semibold leading-snug text-white group-hover:text-[#DDE8D9]">
                    {nextCourse.title}
                  </span>
                  <span className="mt-3 block text-xs leading-5 text-white/62">
                    {nextCourse.teacher} · {nextCourse.category} ·{" "}
                    {nextCourse.isFree
                      ? "免费"
                      : `¥${nextCourse.price.toFixed(1)}`}
                  </span>
                </button>
              ) : (
                <div className="mt-5 rounded-[22px] bg-white/8 p-5">
                  <p className="text-lg font-semibold text-white">先选一门课</p>
                  <p className="mt-3 text-sm leading-6 text-white/64">
                    加入学习计划后，这里会出现同路径下一门课程。
                  </p>
                </div>
              )}

              <div className="mt-6 border-t border-white/12 pt-5">
                <p className="text-xs font-semibold text-[#BFD0B8]">计划概览</p>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-semibold">
                      {learningPlan.summary.activeCount}
                    </p>
                    <p className="mt-1 text-xs text-white/58">进行中</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">
                      {learningPlan.summary.savedCount}
                    </p>
                    <p className="mt-1 text-xs text-white/58">待学</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">
                      {learningPlan.summary.completedCount}
                    </p>
                    <p className="mt-1 text-xs text-white/58">完成</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {accessError && (
          <div className="mt-5 rounded-[20px] border border-[#F0D6C9] bg-[#FFF5EF] px-5 py-4 text-sm text-[#A65F48]">
            {accessError}
          </div>
        )}

        {growthProfileError && (
          <div className="mt-5 rounded-[20px] border border-[#F0D6C9] bg-[#FFF5EF] px-5 py-4 text-sm text-[#A65F48]">
            {growthProfileError}
          </div>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Metric
            icon={PlayCircle}
            label="进行中课程"
            value={learningPlan.summary.activeCount}
            accent="sage"
          />
          <Metric
            icon={BookmarkCheck}
            label="收藏待学"
            value={learningPlan.summary.savedCount}
            accent="gold"
          />
          <Metric
            icon={Trophy}
            label="已完成"
            value={learningPlan.summary.completedCount}
            accent="clay"
          />
          <Metric
            icon={BarChart3}
            label="平均进度"
            value={`${learningPlan.summary.averageProgressPercent}%`}
            accent="sage"
          />
          <Metric
            icon={CalendarCheck}
            label="咨询预约"
            value={profileSummary?.upcomingCounselingCount ?? 0}
            accent="ink"
          />
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[28px] border border-[#E4DCCF] bg-[#FFFDF8] p-5 shadow-sm shadow-[#243B35]/5 sm:p-6">
            <div className="flex flex-col gap-3 border-b border-[#E7DED0] pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#6F8F83]">学习计划</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#243B35]">
                  按状态整理课程，不再混在一个清单里
                </h2>
              </div>
              <button
                onClick={() => navigate("/courses")}
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#D8CEC0] px-4 text-sm font-semibold text-[#4F5B54] transition hover:bg-[#F4EFE6]"
              >
                发现更多课程
              </button>
            </div>

            {learningPlan.summary.totalPlanCount ? (
              <div className="mt-6 space-y-7">
                <PlanSection
                  icon={PlayCircle}
                  title="进行中"
                  description="已经加入学习计划的课程会优先展示，方便继续学习和记录进度。"
                  items={learningPlan.active}
                  emptyText="还没有进行中的课程。可以从收藏待学里加入，或去课程中心选择一门免费课开始。"
                  onOpenCourse={handleOpenCourse}
                  onStartCourse={handleStartCourse}
                />
                <PlanSection
                  icon={BookmarkCheck}
                  title="收藏待学"
                  description="收藏课程先保留为待学清单，确认适合后再加入学习计划。"
                  items={learningPlan.saved}
                  emptyText="暂无收藏待学课程。看到合适的课程时可以先收藏，不必马上购买或学习。"
                  onOpenCourse={handleOpenCourse}
                  onStartCourse={handleStartCourse}
                />
                <PlanSection
                  icon={Trophy}
                  title="已完成"
                  description="完成课程保留在这里，用来复习章节和继续同路径下一门课程。"
                  items={learningPlan.completed}
                  emptyText="完成第一门课程后，这里会形成你的阶段性成长记录。"
                  onOpenCourse={handleOpenCourse}
                  onStartCourse={handleStartCourse}
                />
              </div>
            ) : (
              <div className="pt-6">
                <EmptyState
                  icon={BookOpenCheck}
                  title="还没有加入课程"
                  description="可以先从免费课程或与你当下困扰相关的主题开始，形成一份低压力的学习清单。"
                  action={
                    <button
                      onClick={() => navigate("/courses")}
                      className="inline-flex h-11 items-center justify-center rounded-full bg-[#243B35] px-5 text-sm font-semibold text-white transition hover:bg-[#315047]"
                    >
                      去课程中心
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </button>
                  }
                />
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-[28px] border border-[#E4DCCF] bg-[#FFFDF8] p-6 shadow-sm shadow-[#243B35]/5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#6F8F83]">
                    会员权益
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                    {membershipLabel}
                  </h2>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F2E6C9] text-[#81652C]">
                  <Crown className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#6D746F]">
                {hasActiveMembership
                  ? `有效期至 ${formatDate(membership.expiresAt)}，会员课程会自动进入可学习权益。`
                  : "开通后可学习会员课程，收藏中的会员课会更容易转入学习计划。"}
              </p>
              <button
                onClick={() => navigate("/courses")}
                className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-full border border-[#D8CEC0] text-xs font-semibold text-[#4F5B54] transition hover:bg-[#F4EFE6]"
              >
                {hasActiveMembership ? "查看会员课程" : "了解会员课程"}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </button>
            </div>

            <div className="rounded-[28px] border border-[#E4DCCF] bg-[#FFFDF8] p-6 shadow-sm shadow-[#243B35]/5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#6F8F83]">
                    最近测评
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                    当前支持路径
                  </h2>
                </div>
                <BarChart3 className="h-5 w-5 text-[#A65F48]" />
              </div>

              {latestAssessment ? (
                <div className="mt-6">
                  <div className="rounded-[20px] bg-[#F5EFE5] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#243B35]">
                          {latestAssessment.report.riskLevel === "low"
                            ? "低风险"
                            : latestAssessment.report.riskLevel === "medium"
                              ? "需要关注"
                              : latestAssessment.report.riskLevel === "high"
                                ? "建议咨询"
                                : "优先求助"}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-[#6D746F]">
                          {latestAssessment.report.summary}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#E6EDDF] px-2.5 py-1 text-xs font-semibold text-[#41675A]">
                        {formatDate(latestAssessment.report.createdAt)}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {topAssessmentDimensions.map(dimension => (
                        <span
                          key={dimension}
                          className="rounded-full bg-[#FFFDF8] px-2.5 py-1 text-xs font-semibold text-[#6D746F]"
                        >
                          {assessmentDimensionCopy[dimension]}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => navigate("/assessment")}
                    className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-full border border-[#D8CEC0] text-xs font-semibold text-[#4F5B54] transition hover:bg-[#F4EFE6]"
                  >
                    重新测评
                  </button>
                </div>
              ) : (
                <div className="mt-6">
                  <EmptyState
                    icon={BarChart3}
                    title="暂无测评报告"
                    description="完成一次快速评估后，这里会显示风险等级、主要维度和推荐路径。"
                    action={
                      <button
                        onClick={() => navigate("/assessment")}
                        className="inline-flex h-10 items-center justify-center rounded-full bg-[#243B35] px-4 text-xs font-semibold text-white transition hover:bg-[#315047]"
                      >
                        开始测评
                      </button>
                    }
                  />
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-[#E4DCCF] bg-[#FFFDF8] p-6 shadow-sm shadow-[#243B35]/5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#6F8F83]">
                    咨询预约
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                    最近支持安排
                  </h2>
                </div>
                <CalendarCheck className="h-5 w-5 text-[#A65F48]" />
              </div>

              {recentAppointments.length ? (
                <div className="mt-6 space-y-4">
                  {recentAppointments.map(record => (
                    <AppointmentRow
                      key={record.appointment.id}
                      record={record}
                      onOpen={() => navigate("/consulting")}
                      onConfirmPayment={() =>
                        void handleAppointmentAction(
                          record.appointment.id,
                          "confirm_payment"
                        )
                      }
                      onCancel={() =>
                        void handleAppointmentAction(
                          record.appointment.id,
                          "cancel"
                        )
                      }
                      isUpdating={
                        updatingAppointmentId === record.appointment.id
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-6">
                  <EmptyState
                    icon={CalendarCheck}
                    title="暂无咨询预约"
                    description="当测评或生活状态提示需要专业支持时，可以从这里预约咨询师。"
                    action={
                      <button
                        onClick={() => navigate("/consulting")}
                        className="inline-flex h-10 items-center justify-center rounded-full bg-[#243B35] px-4 text-xs font-semibold text-white transition hover:bg-[#315047]"
                      >
                        预约咨询
                      </button>
                    }
                  />
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-[#E4DCCF] bg-[#FFFDF8] p-6 shadow-sm shadow-[#243B35]/5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#6F8F83]">
                    最近订单
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                    支付与权益记录
                  </h2>
                </div>
                <ReceiptText className="h-5 w-5 text-[#A65F48]" />
              </div>

              {recentOrders.length ? (
                <div className="mt-6 space-y-4">
                  {recentOrders.map(order => (
                    <div
                      key={order.id}
                      className="rounded-[20px] border border-[#E7DED0] bg-[#FFFCF7] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-2 text-sm font-semibold text-[#243B35]">
                          {order.items[0]?.title ?? "订单"}
                        </p>
                        <span className="shrink-0 rounded-full bg-[#E6EDDF] px-2.5 py-1 text-xs font-semibold text-[#41675A]">
                          {orderStatusCopy[order.status]}
                        </span>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs text-[#8A918B]">
                        <span>{formatDate(order.createdAt)}</span>
                        <span className="font-semibold text-[#A65F48]">
                          {formatCurrency(order.payableAmount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6">
                  <EmptyState
                    icon={ReceiptText}
                    title="暂无订单"
                    description="购买课程或开通会员后，订单会自动显示在这里。"
                  />
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-[#E4DCCF] bg-[#F5EFE5] p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#243B35] text-white">
                  <CalendarClock className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#243B35]">
                    下一阶段
                  </p>
                  <p className="mt-1 text-xs text-[#767F78]">
                    咨询预约、测评报告、支持计划
                  </p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-7 text-[#5F6B64]">
                完成一次课程后，可以把困扰记录、练习反馈和咨询准备继续放在同一条成长线索里。
              </p>
              <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#41675A]">
                <CheckCircle2 className="h-4 w-4" />
                成长档案聚合已同步
              </div>
            </div>
          </aside>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
