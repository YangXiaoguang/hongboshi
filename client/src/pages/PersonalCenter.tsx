import { useEffect, useMemo, useState, type ElementType } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  ArrowRight,
  BadgePercent,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Crown,
  Heart,
  Image as ImageIcon,
  Loader2,
  LockKeyhole,
  ReceiptText,
  Save,
  ShieldCheck,
  TicketPercent,
  UserRound,
  WalletCards,
} from "lucide-react";
import type {
  CourseMarketingRule,
  Order,
  OrderStatus,
  UserRole,
} from "@shared/domain";
import AppFooter from "@/components/AppFooter";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCourseAccess,
  useCourseCatalog,
  useCourseEngagement,
  useCourseMarketingRules,
  type Course,
} from "@/features/courses";
import { useCounselingAppointments } from "@/features/counseling";

type PersonalTab = "account" | "orders" | "favorites" | "coupons";

const tabs = [
  { key: "account", label: "账号", icon: UserRound },
  { key: "orders", label: "订单", icon: ReceiptText },
  { key: "favorites", label: "收藏", icon: Heart },
  { key: "coupons", label: "优惠", icon: TicketPercent },
] satisfies { key: PersonalTab; label: string; icon: ElementType }[];

function initialTabFromUrl(): PersonalTab {
  if (typeof window === "undefined") return "account";
  const tab = new URLSearchParams(window.location.search).get("tab");
  return tabs.some(item => item.key === tab) ? (tab as PersonalTab) : "account";
}

const roleCopy = {
  visitor: "访客",
  member: "普通用户",
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

const orderStatusTone = {
  created: "bg-[#E6EDDF] text-[#41675A]",
  pending_payment: "bg-[#FFF1D8] text-[#8A641C]",
  paid: "bg-[#E6EDDF] text-[#41675A]",
  closed: "bg-[#EFEAE1] text-[#7B817C]",
  refunding: "bg-[#F4E5DE] text-[#A65F48]",
  refunded: "bg-[#F4E5DE] text-[#A65F48]",
} satisfies Record<OrderStatus, string>;

const appointmentStatusCopy = {
  pending_payment: "待支付",
  scheduled: "已预约",
  completed: "已完成",
  cancelled: "已取消",
  no_show: "未到访",
  refunded: "已退款",
} as const;

function formatMoney(amount: number) {
  return `¥${amount.toFixed(amount % 1 === 0 ? 0 : 1)}`;
}

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

function couponValue(rule: CourseMarketingRule) {
  if (rule.discount.kind === "fixed_amount") {
    return rule.discount.amount > 0
      ? `立减 ${formatMoney(rule.discount.amount)}`
      : "活动价";
  }
  if (rule.discount.kind === "fixed_price") {
    return `${formatMoney(rule.discount.payableAmount)} 到手`;
  }
  return `${Math.round(rule.discount.rate * 100)}% 组合折扣`;
}

function courseForOrder(order: Order, courses: Course[]) {
  const item = order.items[0];
  if (!item || item.type !== "course") return undefined;
  return courses.find(course => String(course.id) === item.targetId);
}

function courseTitleById(courses: Course[], courseId: number) {
  return (
    courses.find(course => course.id === courseId)?.title ?? `课程 ${courseId}`
  );
}

function orderActivityTime(order: Order) {
  return (
    order.entitlementDeliveredAt ??
    order.paidAt ??
    order.closedAt ??
    order.expiresAt ??
    order.createdAt
  );
}

function statusBadge(status: OrderStatus) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${orderStatusTone[status]}`}
    >
      {orderStatusCopy[status]}
    </span>
  );
}

function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const Icon = icon;
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-[#D9CFC0] bg-[#FFFDF8]/72 px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E6EDDF] text-[#41675A]">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-5 text-lg font-semibold text-[#243B35]">{title}</h3>
      <p className="mt-2 max-w-[420px] text-sm leading-6 text-[#6D746F]">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047]"
        >
          {actionLabel}
          <ArrowRight className="ml-2 h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: ElementType;
}) {
  const Icon = icon;
  return (
    <div className="min-w-0 border-b border-[#E6DED0] pb-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[#6D746F]">{label}</p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E6EDDF] text-[#41675A]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-4 truncate text-3xl font-semibold text-[#243B35]">
        {value}
      </p>
    </div>
  );
}

export default function PersonalCenter() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<PersonalTab>(initialTabFromUrl);
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    avatarUrl: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const { user, isLoggedIn, openLoginModal, updateProfile } = useAuth();
  const {
    accessState,
    hasActiveMembership,
    membership,
    ownedCourseCount,
    orderCount,
    isSyncing: isAccessSyncing,
  } = useCourseAccess();
  const { allCourses } = useCourseCatalog();
  const { favoriteCourseIds, favoriteCount } = useCourseEngagement({
    userId: user?.id,
    enableRemoteSync: Boolean(user),
  });
  const { rules: marketingRules } = useCourseMarketingRules();
  const { appointments, upcomingCount } = useCounselingAppointments(isLoggedIn);

  const favoriteCourses = useMemo(
    () => allCourses.filter(course => favoriteCourseIds.has(course.id)),
    [allCourses, favoriteCourseIds]
  );

  const courseCoupons = useMemo(
    () =>
      marketingRules
        .filter(rule => rule.type === "course_coupon")
        .sort((left, right) => right.priority - left.priority),
    [marketingRules]
  );

  const recentOrders = useMemo(
    () =>
      [...accessState.orders].sort(
        (left, right) =>
          Date.parse(orderActivityTime(right)) -
            Date.parse(orderActivityTime(left)) ||
          right.id.localeCompare(left.id)
      ),
    [accessState.orders]
  );

  const pendingPaymentCount = recentOrders.filter(
    order => order.status === "pending_payment"
  ).length;

  const paidOrderCount = recentOrders.filter(
    order => order.status === "paid"
  ).length;

  const activeRoleLabels =
    user?.roles
      .map(role => roleCopy[role])
      .filter(Boolean)
      .join("、") ?? "未登录";

  useEffect(() => {
    setProfileForm({
      displayName: user?.nickname ?? "",
      avatarUrl: user?.avatar ?? "",
    });
  }, [user?.avatar, user?.id, user?.nickname]);

  const changeTab = (tab: PersonalTab) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", `/me?tab=${tab}`);
  };

  const saveProfile = async () => {
    if (!isLoggedIn) {
      openLoginModal();
      return;
    }

    const displayName = profileForm.displayName.trim();
    const avatarUrl = profileForm.avatarUrl.trim();

    if (displayName.length < 2) {
      toast("昵称至少需要 2 个字");
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateProfile({
        displayName,
        avatarUrl: avatarUrl || undefined,
      });
      toast("资料已保存", { description: "账号资料已同步到当前登录会话" });
    } catch (err) {
      toast("资料保存失败", {
        description: err instanceof Error ? err.message : "请稍后再试",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F3EA] text-[#243B35]">
      <AppHeader />

      <main className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden rounded-lg bg-[#243B35] text-white"
        >
          <div className="grid gap-8 px-5 py-8 md:grid-cols-[minmax(0,1fr)_320px] md:px-8 lg:px-10">
            <div>
              <p className="text-sm font-semibold text-[#C7D8C2]">个人中心</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
                {user ? `${user.nickname}，欢迎回来` : "登录后管理你的成长账户"}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/68">
                这里集中管理课程订单、收藏、优惠和账号信息，学习与购买记录会优先按当前账号聚合。
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {isLoggedIn ? (
                  <button
                    onClick={() => navigate("/courses")}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[#DDE8D9] px-5 text-sm font-semibold text-[#243B35] transition hover:bg-white"
                  >
                    继续选课
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={openLoginModal}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[#DDE8D9] px-5 text-sm font-semibold text-[#243B35] transition hover:bg-white"
                  >
                    登录 / 注册
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => navigate("/me/courses")}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/20 px-5 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
                >
                  成长空间
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-lg bg-white/8 p-4">
              <div>
                <p className="text-xs text-white/52">课程权益</p>
                <p className="mt-2 text-2xl font-semibold">
                  {ownedCourseCount}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/52">待支付</p>
                <p className="mt-2 text-2xl font-semibold">
                  {pendingPaymentCount}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/52">收藏课程</p>
                <p className="mt-2 text-2xl font-semibold">{favoriteCount}</p>
              </div>
              <div>
                <p className="text-xs text-white/52">可用优惠</p>
                <p className="mt-2 text-2xl font-semibold">
                  {courseCoupons.length}
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-[86px] lg:self-start">
            <div className="overflow-hidden rounded-lg border border-[#E1D7C8] bg-[#FFFDF8]">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => changeTab(tab.key)}
                    className={`flex w-full items-center justify-between gap-3 border-b border-[#EDE4D7] px-4 py-4 text-left text-sm font-semibold transition last:border-b-0 ${
                      active
                        ? "bg-[#E6EDDF] text-[#243B35]"
                        : "text-[#68736D] hover:bg-[#F7F1E8] hover:text-[#243B35]"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </span>
                    <ChevronRight
                      className={`h-4 w-4 transition ${active ? "translate-x-0.5" : ""}`}
                    />
                  </button>
                );
              })}
            </div>
          </aside>

          <motion.section
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="min-w-0"
          >
            {activeTab === "account" && (
              <div className="space-y-5">
                <section className="rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 sm:p-6">
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-4">
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#6F8F83] text-xl font-semibold text-white">
                        {user?.avatar ? (
                          <img
                            src={user.avatar}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          (user?.nickname.trim().charAt(0) ?? "未")
                        )}
                      </span>
                      <div>
                        <h2 className="text-xl font-semibold">
                          {user?.nickname ?? "未登录用户"}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-[#6D746F]">
                          {isLoggedIn
                            ? `${user?.loginMethod === "wechat" ? "微信登录" : "手机号登录"} · ${activeRoleLabels}`
                            : "登录后可同步订单、收藏和学习权益。"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={
                        isLoggedIn ? () => changeTab("orders") : openLoginModal
                      }
                      className="inline-flex h-10 items-center justify-center rounded-full bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047]"
                    >
                      {isLoggedIn ? "查看订单" : "立即登录"}
                    </button>
                  </div>

                  <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <Metric
                      label="全部订单"
                      value={orderCount}
                      icon={ReceiptText}
                    />
                    <Metric
                      label="已支付"
                      value={paidOrderCount}
                      icon={CheckCircle2}
                    />
                    <Metric
                      label="预约咨询"
                      value={upcomingCount}
                      icon={CalendarClock}
                    />
                    <Metric
                      label="会员状态"
                      value={hasActiveMembership ? "有效" : "未开通"}
                      icon={Crown}
                    />
                  </div>
                </section>

                <section className="rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-[#6F8F83]" />
                      <h3 className="font-semibold">资料设置</h3>
                    </div>
                    <span className="w-fit rounded-full bg-[#E6EDDF] px-3 py-1 text-xs font-semibold text-[#41675A]">
                      服务端同步
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_132px] lg:items-end">
                    <label className="block min-w-0">
                      <span className="text-xs font-semibold text-[#6D746F]">
                        昵称
                      </span>
                      <input
                        value={profileForm.displayName}
                        disabled={!isLoggedIn || isSavingProfile}
                        maxLength={24}
                        onChange={event =>
                          setProfileForm(current => ({
                            ...current,
                            displayName: event.target.value,
                          }))
                        }
                        className="mt-2 h-11 w-full rounded-lg border border-[#D8CDBC] bg-white px-3 text-sm font-semibold text-[#243B35] outline-none transition placeholder:text-[#A49B90] focus:border-[#6F8F83] disabled:cursor-not-allowed disabled:bg-[#F4EFE6] disabled:text-[#8A8176]"
                        placeholder="请输入昵称"
                      />
                    </label>

                    <label className="block min-w-0">
                      <span className="text-xs font-semibold text-[#6D746F]">
                        头像链接
                      </span>
                      <input
                        value={profileForm.avatarUrl}
                        disabled={!isLoggedIn || isSavingProfile}
                        onChange={event =>
                          setProfileForm(current => ({
                            ...current,
                            avatarUrl: event.target.value,
                          }))
                        }
                        className="mt-2 h-11 w-full rounded-lg border border-[#D8CDBC] bg-white px-3 text-sm text-[#243B35] outline-none transition placeholder:text-[#A49B90] focus:border-[#6F8F83] disabled:cursor-not-allowed disabled:bg-[#F4EFE6] disabled:text-[#8A8176]"
                        placeholder="https://..."
                      />
                    </label>

                    <button
                      onClick={saveProfile}
                      disabled={isSavingProfile}
                      className="inline-flex h-11 items-center justify-center rounded-full bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingProfile ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      {isLoggedIn ? "保存资料" : "登录后编辑"}
                    </button>
                  </div>
                </section>

                <section className="grid gap-5 md:grid-cols-2">
                  <div className="rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-[#6F8F83]" />
                      <h3 className="font-semibold">账号与隐私</h3>
                    </div>
                    <dl className="mt-5 space-y-4 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#6D746F]">账号 ID</dt>
                        <dd className="max-w-[220px] truncate font-semibold">
                          {user?.id ?? "未登录"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#6D746F]">手机号</dt>
                        <dd className="font-semibold">
                          {user?.phoneMasked ?? "未绑定"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#6D746F]">课程记录同步</dt>
                        <dd className="font-semibold">
                          {isAccessSyncing ? "同步中" : "已准备"}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-[#B08A3C]" />
                      <h3 className="font-semibold">成长会员</h3>
                    </div>
                    <p className="mt-5 text-2xl font-semibold">
                      {hasActiveMembership
                        ? (membership.planName ?? "成长会员")
                        : "暂未开通"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#6D746F]">
                      {hasActiveMembership
                        ? `有效期至 ${formatDate(membership.expiresAt)}`
                        : "会员课程、阶段档案和后续权益会集中沉淀在当前账号。"}
                    </p>
                    <button
                      onClick={() => navigate("/courses")}
                      className="mt-5 inline-flex h-10 items-center justify-center rounded-full border border-[#D8CDBC] px-4 text-sm font-semibold text-[#41675A] transition hover:bg-[#F2F7EE]"
                    >
                      查看会员课程
                    </button>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "orders" && (
              <section className="rounded-lg border border-[#E1D7C8] bg-[#FFFDF8]">
                <div className="border-b border-[#E8DED0] px-5 py-4">
                  <h2 className="text-xl font-semibold">我的订单</h2>
                  <p className="mt-1 text-sm text-[#6D746F]">
                    课程订单来自课程权益服务，咨询预约会在登录后同步显示。
                  </p>
                </div>
                {recentOrders.length || appointments.length ? (
                  <div className="divide-y divide-[#E8DED0]">
                    {recentOrders.map(order => {
                      const course = courseForOrder(order, allCourses);
                      const firstItem = order.items[0];
                      const title = firstItem?.title ?? "订单商品";
                      const canPay = order.status === "pending_payment";
                      return (
                        <div
                          key={order.id}
                          className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,1fr)_140px_120px]"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate font-semibold">
                                {title}
                              </h3>
                              {statusBadge(order.status)}
                            </div>
                            <p className="mt-2 truncate text-xs text-[#8A8176]">
                              {order.id}
                            </p>
                            <p className="mt-2 text-sm text-[#6D746F]">
                              创建 {formatDate(order.createdAt)} · 更新{" "}
                              {formatDate(orderActivityTime(order))}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[#8A8176]">实付金额</p>
                            <p className="mt-2 text-lg font-semibold text-[#A65F48]">
                              {formatMoney(order.payableAmount)}
                            </p>
                          </div>
                          <div className="flex items-start md:justify-end">
                            <button
                              onClick={() => {
                                if (course) {
                                  navigate(
                                    `/courses/${course.id}${canPay ? "?checkout=course" : ""}`
                                  );
                                  return;
                                }
                                navigate("/courses");
                              }}
                              className="inline-flex h-9 items-center justify-center rounded-full border border-[#D8CDBC] px-3 text-xs font-semibold text-[#41675A] transition hover:bg-[#F2F7EE]"
                            >
                              {canPay ? "继续支付" : "查看课程"}
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {appointments.map(record => (
                      <div
                        key={record.appointment.id}
                        className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,1fr)_140px_120px]"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-semibold">
                              {record.counselor.name} 咨询预约
                            </h3>
                            <span className="rounded-full bg-[#E6EDDF] px-2.5 py-1 text-xs font-semibold text-[#41675A]">
                              {appointmentStatusCopy[record.appointment.status]}
                            </span>
                          </div>
                          <p className="mt-2 truncate text-xs text-[#8A8176]">
                            {record.appointment.id}
                          </p>
                          <p className="mt-2 text-sm text-[#6D746F]">
                            时段 {formatDate(record.slot.startsAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#8A8176]">咨询师</p>
                          <p className="mt-2 text-lg font-semibold">
                            {record.counselor.name}
                          </p>
                        </div>
                        <div className="flex items-start md:justify-end">
                          <button
                            onClick={() => navigate("/consulting")}
                            className="inline-flex h-9 items-center justify-center rounded-full border border-[#D8CDBC] px-3 text-xs font-semibold text-[#41675A] transition hover:bg-[#F2F7EE]"
                          >
                            查看咨询
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-5">
                    <EmptyState
                      icon={ReceiptText}
                      title="还没有订单"
                      description="在课程列表或详情页下单后，待支付、已支付和退款中的订单都会出现在这里。"
                      actionLabel="去选课程"
                      onAction={() => navigate("/courses")}
                    />
                  </div>
                )}
              </section>
            )}

            {activeTab === "favorites" && (
              <section className="rounded-lg border border-[#E1D7C8] bg-[#FFFDF8]">
                <div className="border-b border-[#E8DED0] px-5 py-4">
                  <h2 className="text-xl font-semibold">我的收藏</h2>
                  <p className="mt-1 text-sm text-[#6D746F]">
                    收藏课程会保留在当前浏览器，并在后续接入账号收藏同步。
                  </p>
                </div>
                {favoriteCourses.length ? (
                  <div className="divide-y divide-[#E8DED0]">
                    {favoriteCourses.map(course => (
                      <button
                        key={course.id}
                        onClick={() => navigate(`/courses/${course.id}`)}
                        className="grid w-full gap-4 px-5 py-5 text-left transition hover:bg-[#F8F3EA] md:grid-cols-[104px_minmax(0,1fr)_120px]"
                      >
                        <img
                          src={course.coverUrl}
                          alt=""
                          className="h-20 w-full rounded-lg object-cover md:w-[104px]"
                        />
                        <div className="min-w-0">
                          <h3 className="line-clamp-2 font-semibold">
                            {course.title}
                          </h3>
                          <p className="mt-2 text-sm text-[#6D746F]">
                            {course.teacher} · {course.category} ·{" "}
                            {course.learners.toLocaleString()} 人学习
                          </p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-lg font-semibold text-[#A65F48]">
                            {course.isFree ? "免费" : formatMoney(course.price)}
                          </p>
                          <p className="mt-2 text-xs text-[#8A8176]">
                            查看详情
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-5">
                    <EmptyState
                      icon={Heart}
                      title="还没有收藏课程"
                      description="遇到想慢慢了解的课程，可以先收藏，再回到个人中心继续比较。"
                      actionLabel="浏览课程"
                      onAction={() => navigate("/courses")}
                    />
                  </div>
                )}
              </section>
            )}

            {activeTab === "coupons" && (
              <section className="rounded-lg border border-[#E1D7C8] bg-[#FFFDF8]">
                <div className="border-b border-[#E8DED0] px-5 py-4">
                  <h2 className="text-xl font-semibold">优惠与权益</h2>
                  <p className="mt-1 text-sm text-[#6D746F]">
                    当前可用优惠来自服务端营销规则，结算时会按课程自动计算。
                  </p>
                </div>
                {courseCoupons.length ? (
                  <div className="grid gap-4 p-5 md:grid-cols-2">
                    {courseCoupons.map(rule => {
                      const courseId = rule.scope.courseIds[0];
                      const courseTitle = courseId
                        ? courseTitleById(allCourses, courseId)
                        : "适用课程";
                      return (
                        <button
                          key={rule.id}
                          onClick={() =>
                            courseId
                              ? navigate(`/courses/${courseId}`)
                              : navigate("/courses")
                          }
                          className="group overflow-hidden rounded-lg border border-[#E8DED0] bg-[#FFF9F0] text-left transition hover:border-[#CDAA72]"
                        >
                          <div className="flex items-center justify-between gap-4 border-b border-[#EBDCC9] px-5 py-4">
                            <div>
                              <p className="text-sm font-semibold text-[#A65F48]">
                                {couponValue(rule)}
                              </p>
                              <h3 className="mt-2 font-semibold text-[#243B35]">
                                {rule.name}
                              </h3>
                            </div>
                            <BadgePercent className="h-6 w-6 text-[#B08A3C]" />
                          </div>
                          <div className="px-5 py-4">
                            <p className="line-clamp-2 text-sm leading-6 text-[#6D746F]">
                              {rule.description}
                            </p>
                            <p className="mt-3 text-xs text-[#8A8176]">
                              适用：{courseTitle}
                            </p>
                            <p className="mt-4 inline-flex items-center text-sm font-semibold text-[#41675A]">
                              去使用
                              <ArrowRight className="ml-1.5 h-4 w-4 transition group-hover:translate-x-0.5" />
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-5">
                    <EmptyState
                      icon={TicketPercent}
                      title="暂无可用优惠"
                      description="新的课程券和会员活动上线后，会自动出现在这里。"
                      actionLabel="查看课程"
                      onAction={() => navigate("/courses")}
                    />
                  </div>
                )}

                <div className="border-t border-[#E8DED0] px-5 py-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-start gap-3">
                      <WalletCards className="mt-0.5 h-4 w-4 text-[#6F8F83]" />
                      <p className="text-sm leading-6 text-[#6D746F]">
                        优惠在结算抽屉中自动抵扣，无需手动输入券码。
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock3 className="mt-0.5 h-4 w-4 text-[#6F8F83]" />
                      <p className="text-sm leading-6 text-[#6D746F]">
                        限时活动以服务端规则为准，过期或暂停后不再展示。
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <LockKeyhole className="mt-0.5 h-4 w-4 text-[#6F8F83]" />
                      <p className="text-sm leading-6 text-[#6D746F]">
                        订单金额、权益发放和退款状态仍由服务端订单控制。
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </motion.section>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
