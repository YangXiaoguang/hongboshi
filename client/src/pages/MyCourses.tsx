import { useMemo, type ElementType, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  Crown,
  Heart,
  Loader2,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import AppFooter from "@/components/AppFooter";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import type { OrderStatus, UserRole } from "@shared/domain";
import {
  buildCourseDetail,
  useCourseAccess,
  useCourseCatalog,
  useCourseEngagement,
  type Course,
  type CourseAccessStatus,
  type CourseProgress,
} from "@/features/courses";

type LearningRow = {
  course: Course;
  accessStatus: CourseAccessStatus;
  canStart: boolean;
  totalChapters: number;
  progress?: CourseProgress;
  progressPercent: number;
  isFavorited: boolean;
};

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

const roleCopy = {
  visitor: "访客",
  member: "会员用户",
  counselor: "咨询师",
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

function getLearningSortValue(row: LearningRow): number {
  if (row.progress?.lastViewedAt) return Date.parse(row.progress.lastViewedAt);
  if (row.progress?.updatedAt) return Date.parse(row.progress.updatedAt);
  if (row.canStart) return 1;
  if (row.isFavorited) return 0;
  return -1;
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

function CourseRow({ row, onOpen }: { row: LearningRow; onOpen: () => void }) {
  const progressLabel = row.progress
    ? progressStatusCopy[row.progress.status]
    : "未开始";
  const completedCount = row.progress?.completedChapterIds.length ?? 0;
  const locked = !row.canStart;

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
        aria-label={`查看${row.course.title}`}
      >
        <img
          src={row.course.coverUrl}
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
            {accessStatusCopy[row.accessStatus]}
          </span>
          <span className="rounded-full bg-[#F4E5DE] px-2.5 py-1 text-xs font-semibold text-[#A65F48]">
            {row.course.category}
          </span>
          {row.isFavorited && (
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
          {row.course.title}
        </button>
        <p className="mt-2 text-sm text-[#767F78]">
          {row.course.teacher} · {row.course.type} · {row.totalChapters} 个阶段
        </p>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 w-full max-w-[420px] overflow-hidden rounded-full bg-[#ECE5DB]">
            <span
              className={`block h-full rounded-full ${
                locked ? "bg-[#CDBEA9]" : "bg-[#6F8F83]"
              }`}
              style={{ width: `${row.progressPercent}%` }}
            />
          </div>
          <span className="w-12 shrink-0 text-right text-xs font-semibold text-[#667069]">
            {row.progressPercent}%
          </span>
        </div>
        <p className="mt-2 text-xs text-[#8A918B]">
          {progressLabel} · 已完成 {completedCount} / {row.totalChapters} 个阶段
        </p>
      </div>

      <div className="flex items-center md:justify-end">
        <button
          onClick={onOpen}
          className={`inline-flex h-11 min-w-[116px] items-center justify-center rounded-full px-4 text-sm font-semibold transition ${
            locked
              ? "border border-[#D8CEC0] text-[#6D746F] hover:bg-[#FFFDF8]"
              : "bg-[#243B35] text-white hover:bg-[#315047]"
          }`}
        >
          {locked ? "查看详情" : "继续学习"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </button>
      </div>
    </motion.article>
  );
}

export default function MyCourses() {
  const [, navigate] = useLocation();
  const { user, isLoggedIn, isAuthSyncing, openLoginModal } = useAuth();
  const { allCourses, isLoading: isCatalogLoading } = useCourseCatalog();
  const {
    accessState,
    hasActiveMembership,
    membership,
    ownedCourseCount,
    orderCount,
    isSyncing: isAccessSyncing,
    accessError,
    getCourseAccess,
  } = useCourseAccess();
  const { favoriteCourseIds, favoriteCount, getProgress } =
    useCourseEngagement();

  const learningRows = useMemo(() => {
    return allCourses
      .map(course => {
        const access = getCourseAccess(course);
        const detail = buildCourseDetail(course);
        const progress = getProgress(course.id);
        const totalChapters = detail.chapters.length;
        const completedCount = progress?.completedChapterIds.length ?? 0;
        const progressPercent =
          !access.canStart && !progress
            ? 0
            : Math.min(100, Math.round((completedCount / totalChapters) * 100));

        return {
          course,
          accessStatus: access.status,
          canStart: access.canStart,
          totalChapters,
          progress,
          progressPercent,
          isFavorited: favoriteCourseIds.has(course.id),
        } satisfies LearningRow;
      })
      .filter(row => row.canStart || row.progress || row.isFavorited)
      .sort((a, b) => getLearningSortValue(b) - getLearningSortValue(a));
  }, [allCourses, favoriteCourseIds, getCourseAccess, getProgress]);

  const recentOrders = useMemo(() => {
    return accessState.orders.slice(0, 4);
  }, [accessState.orders]);

  const membershipLabel = hasActiveMembership
    ? (membership.planName ?? "成长会员")
    : "未开通";
  const isBusy = isAuthSyncing || isCatalogLoading || isAccessSyncing;

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
                课程权益、学习进度、收藏和订单会在这里集中管理，方便你随时回到自己的成长节奏。
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
                  onClick={() => navigate("/")}
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
                  {["课程权益", "学习记录", "订单明细"].map(label => (
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
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#DDE8D9]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  已同步账号
                </span>
                {isBusy && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/72">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    正在更新
                  </span>
                )}
              </div>
              <h1 className="mt-6 text-3xl font-semibold tracking-normal sm:text-4xl lg:text-5xl">
                {user?.nickname ?? "成长空间"}
              </h1>
              <p className="mt-4 max-w-[660px] text-sm leading-7 text-white/72">
                这里沉淀课程学习、会员权益和购买记录，让每一次开始和继续都更清楚。
              </p>

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
              <p className="text-sm font-semibold text-[#DDE8D9]">会员权益</p>
              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-2xl font-semibold">{membershipLabel}</p>
                  <p className="mt-2 text-xs text-white/62">
                    {hasActiveMembership
                      ? `有效期至 ${formatDate(membership.expiresAt)}`
                      : "开通后可学习会员课程"}
                  </p>
                </div>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F2E6C9] text-[#6C5526]">
                  <Crown className="h-5 w-5" />
                </span>
              </div>
              <button
                onClick={() => navigate("/")}
                className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-[#DDE8D9] px-5 text-sm font-semibold text-[#20362F] transition hover:bg-white"
              >
                {hasActiveMembership ? "查看会员课程" : "了解会员课程"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.section>

        {accessError && (
          <div className="mt-5 rounded-[20px] border border-[#F0D6C9] bg-[#FFF5EF] px-5 py-4 text-sm text-[#A65F48]">
            {accessError}
          </div>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            icon={BookOpenCheck}
            label="已拥有课程"
            value={ownedCourseCount}
            accent="sage"
          />
          <Metric
            icon={Sparkles}
            label="学习清单"
            value={learningRows.length}
            accent="gold"
          />
          <Metric
            icon={Heart}
            label="收藏课程"
            value={favoriteCount}
            accent="clay"
          />
          <Metric
            icon={ReceiptText}
            label="订单记录"
            value={orderCount}
            accent="ink"
          />
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[28px] border border-[#E4DCCF] bg-[#FFFDF8] p-5 shadow-sm shadow-[#243B35]/5 sm:p-6">
            <div className="flex flex-col gap-3 border-b border-[#E7DED0] pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#6F8F83]">
                  学习中的课程
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#243B35]">
                  继续你的成长节奏
                </h2>
              </div>
              <button
                onClick={() => navigate("/")}
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#D8CEC0] px-4 text-sm font-semibold text-[#4F5B54] transition hover:bg-[#F4EFE6]"
              >
                发现更多课程
              </button>
            </div>

            {learningRows.length ? (
              <div className="mt-1">
                {learningRows.map(row => (
                  <CourseRow
                    key={row.course.id}
                    row={row}
                    onOpen={() => navigate(`/courses/${row.course.id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="pt-6">
                <EmptyState
                  icon={BookOpenCheck}
                  title="还没有加入课程"
                  description="可以先从免费课程或与你当下困扰相关的主题开始，形成一份低压力的学习清单。"
                  action={
                    <button
                      onClick={() => navigate("/")}
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
                课程、权益、订单已同步
              </div>
            </div>
          </aside>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
