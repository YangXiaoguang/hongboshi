import { useEffect, useMemo, useState, type ElementType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  ArrowRight,
  BadgePercent,
  Bell,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Crown,
  FileText,
  Heart,
  Image as ImageIcon,
  LifeBuoy,
  Loader2,
  LockKeyhole,
  PackageCheck,
  ReceiptText,
  Save,
  ShieldCheck,
  TicketPercent,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import type {
  CourseMarketingRule,
  Order,
  OrderAfterSalesCreateRequest,
  OrderAfterSalesListResult,
  OrderAfterSalesRequestType,
  OrderAfterSalesRequestStatus,
  PaymentChannel,
  OrderStatus,
  UserNotification,
  UserNotificationType,
  UserCouponDisplayStatus,
  UserPreference,
  UserRole,
} from "@shared/domain";
import AppFooter from "@/components/AppFooter";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { httpUserPreferenceRepository } from "@/features/courses/api/httpUserPreferenceRepository";
import { httpUserNotificationRepository } from "@/features/users/api/httpUserNotificationRepository";
import {
  useCourseAccess,
  useCourseCatalog,
  useCourseEngagement,
  useCourseMarketingRules,
  createPersonalOrderAmountRows,
  createPersonalOrderServiceNotes,
  createPersonalOrderTimeline,
  type Course,
} from "@/features/courses";
import { useCounselingAppointments } from "@/features/counseling";

type PersonalTab = "account" | "orders" | "messages" | "favorites" | "coupons";

const tabs = [
  { key: "account", label: "账号", icon: UserRound },
  { key: "orders", label: "订单", icon: ReceiptText },
  { key: "messages", label: "消息", icon: Bell },
  { key: "favorites", label: "收藏", icon: Heart },
  { key: "coupons", label: "优惠", icon: TicketPercent },
] satisfies { key: PersonalTab; label: string; icon: ElementType }[];

function initialTabFromUrl(): PersonalTab {
  if (typeof window === "undefined") return "account";
  const tab = new URLSearchParams(window.location.search).get("tab");
  return tabs.some(item => item.key === tab) ? (tab as PersonalTab) : "account";
}

function initialOrderIdFromUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    new URLSearchParams(window.location.search).get("orderId") ?? undefined
  );
}

function orderElementId(orderId: string) {
  return `personal-order-${orderId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
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

const paymentChannelCopy = {
  wechat_pay: "微信支付",
  alipay: "支付宝",
  manual: "人工确认",
} satisfies Record<PaymentChannel, string>;

const afterSalesRequestTypeCopy = {
  learning_access_issue: "无法学习/权益异常",
  duplicate_payment: "重复扣款",
  refund_consultation: "退款咨询",
  invoice_receipt: "票据/支付凭证",
  other: "其他问题",
} satisfies Record<OrderAfterSalesRequestType, string>;

const afterSalesStatusCopy = {
  submitted: "已提交",
  reviewing: "处理中",
  linked_to_refund: "已转退款处理",
  resolved: "已解决",
  closed: "已关闭",
} satisfies Record<OrderAfterSalesRequestStatus, string>;

const notificationTypeCopy = {
  after_sales_reviewing: "售后处理中",
  after_sales_resolved: "售后已解决",
  after_sales_closed: "售后已关闭",
  refund_request_accepted: "退款已受理",
  refund_request_rejected: "退款暂未受理",
  refund_completed: "退款已完成",
} satisfies Record<UserNotificationType, string>;

const notificationTone = {
  after_sales_reviewing: "bg-[#E6EDDF] text-[#41675A]",
  after_sales_resolved: "bg-[#E6EDDF] text-[#41675A]",
  after_sales_closed: "bg-[#EFEAE1] text-[#7B817C]",
  refund_request_accepted: "bg-[#FFF1D8] text-[#8A641C]",
  refund_request_rejected: "bg-[#F4E5DE] text-[#A65F48]",
  refund_completed: "bg-[#E6EDDF] text-[#41675A]",
} satisfies Record<UserNotificationType, string>;

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

function formatSignedMoney(amount: number) {
  return amount < 0 ? `-${formatMoney(Math.abs(amount))}` : formatMoney(amount);
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

const couponStatusCopy = {
  claimable: "可领取",
  claimed: "已领取",
  used: "已使用",
  expired: "已过期",
} satisfies Record<UserCouponDisplayStatus, string>;

const couponStatusTone = {
  claimable: "bg-[#FFF1D8] text-[#8A641C]",
  claimed: "bg-[#E6EDDF] text-[#41675A]",
  used: "bg-[#EFEAE1] text-[#7B817C]",
  expired: "bg-[#F4E5DE] text-[#A65F48]",
} satisfies Record<UserCouponDisplayStatus, string>;

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

function couponNameForOrder(
  order: Order,
  marketingRules: CourseMarketingRule[]
) {
  const marketingRuleId = order.couponApplication?.marketingRuleId;
  if (!marketingRuleId) return undefined;
  return (
    marketingRules.find(rule => rule.id === marketingRuleId)?.name ??
    marketingRuleId
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
  const [focusedOrderId, setFocusedOrderId] = useState<string | undefined>(
    initialOrderIdFromUrl
  );
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>(
    initialOrderIdFromUrl
  );
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    avatarUrl: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [userPreference, setUserPreference] = useState<UserPreference>();
  const [isPreferenceLoading, setIsPreferenceLoading] = useState(false);
  const [preferenceError, setPreferenceError] = useState<string | undefined>();
  const [claimingRuleId, setClaimingRuleId] = useState<string | undefined>();
  const [orderActionPendingId, setOrderActionPendingId] = useState<
    string | undefined
  >();
  const [orderAfterSalesByOrderId, setOrderAfterSalesByOrderId] = useState<
    Record<string, OrderAfterSalesListResult>
  >({});
  const [afterSalesLoadingOrderId, setAfterSalesLoadingOrderId] = useState<
    string | undefined
  >();
  const [afterSalesSubmittingOrderId, setAfterSalesSubmittingOrderId] =
    useState<string | undefined>();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [notificationPrivacyNotice, setNotificationPrivacyNotice] =
    useState<string>();
  const [isNotificationLoading, setIsNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState<
    string | undefined
  >();
  const [isMarkingNotificationsRead, setIsMarkingNotificationsRead] =
    useState(false);
  const { user, isLoggedIn, openLoginModal, updateProfile } = useAuth();
  const {
    accessState,
    cancelCheckoutOrder,
    createOrderAfterSalesRequest,
    hasActiveMembership,
    loadOrderAfterSalesRequests,
    membership,
    ownedCourseCount,
    orderCount,
    isSyncing: isAccessSyncing,
  } = useCourseAccess();
  const { allCourses } = useCourseCatalog();
  const {
    favoriteCourseIds,
    favoriteCount,
    favoriteSyncError,
    isFavoriteSyncing,
  } = useCourseEngagement({
    userId: user?.id,
    enableRemoteSync: Boolean(user),
    favoriteSource: "personal_center",
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

  const selectedOrder = useMemo(
    () =>
      selectedOrderId
        ? recentOrders.find(order => order.id === selectedOrderId)
        : undefined,
    [recentOrders, selectedOrderId]
  );

  const selectedOrderCourse = selectedOrder
    ? courseForOrder(selectedOrder, allCourses)
    : undefined;

  const selectedOrderCouponName = selectedOrder
    ? couponNameForOrder(selectedOrder, marketingRules)
    : undefined;

  const selectedOrderAfterSales = selectedOrder
    ? orderAfterSalesByOrderId[selectedOrder.id]
    : undefined;
  const selectedOrderNotifications = selectedOrder
    ? notifications.filter(
        notification => notification.resource.orderId === selectedOrder.id
      )
    : [];
  const unreadNotificationCount = notifications.filter(
    notification => notification.status === "unread"
  ).length;

  const activeRoleLabels =
    user?.roles
      .map(role => roleCopy[role])
      .filter(Boolean)
      .join("、") ?? "未登录";

  const claimedCouponByRuleId = useMemo(
    () =>
      new Map(
        (userPreference?.couponClaims ?? []).map(claim => [
          claim.marketingRuleId,
          claim,
        ])
      ),
    [userPreference?.couponClaims]
  );

  const claimedCouponCount = userPreference?.couponClaims.filter(
    claim => claim.status === "claimed"
  ).length;

  useEffect(() => {
    if (activeTab !== "orders" || !focusedOrderId) return;

    window.setTimeout(() => {
      document
        .getElementById(orderElementId(focusedOrderId))
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }, [activeTab, focusedOrderId, recentOrders.length]);

  const focusOrder = (orderId: string) => {
    setActiveTab("orders");
    setFocusedOrderId(orderId);
    setSelectedOrderId(orderId);
    window.history.replaceState(
      null,
      "",
      `/me?tab=orders&orderId=${encodeURIComponent(orderId)}`
    );
  };

  const closeOrderDetail = () => {
    setSelectedOrderId(undefined);
    if (activeTab === "orders") {
      window.history.replaceState(null, "", "/me?tab=orders");
    }
  };

  useEffect(() => {
    setProfileForm({
      displayName: user?.nickname ?? "",
      avatarUrl: user?.avatar ?? "",
    });
  }, [user?.avatar, user?.id, user?.nickname]);

  useEffect(() => {
    if (!isLoggedIn) {
      setUserPreference(undefined);
      setPreferenceError(undefined);
      setIsPreferenceLoading(false);
      return;
    }

    let mounted = true;
    setIsPreferenceLoading(true);
    httpUserPreferenceRepository
      .getMyPreference()
      .then(preference => {
        if (!mounted) return;
        setUserPreference(preference);
        setPreferenceError(undefined);
      })
      .catch(err => {
        if (!mounted) return;
        setPreferenceError(
          err instanceof Error ? err.message : "账号券包暂时不可用"
        );
      })
      .finally(() => {
        if (mounted) setIsPreferenceLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isLoggedIn, user?.id]);

  useEffect(() => {
    if (!isLoggedIn) {
      setNotifications([]);
      setNotificationPrivacyNotice(undefined);
      setNotificationError(undefined);
      setIsNotificationLoading(false);
      return;
    }

    let mounted = true;
    setIsNotificationLoading(true);
    httpUserNotificationRepository
      .getMyNotifications()
      .then(result => {
        if (!mounted) return;
        setNotifications(result.notifications);
        setNotificationPrivacyNotice(result.privacyNotice);
        setNotificationError(undefined);
      })
      .catch(err => {
        if (!mounted) return;
        setNotificationError(
          err instanceof Error ? err.message : "站内消息暂时不可用"
        );
      })
      .finally(() => {
        if (mounted) setIsNotificationLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isLoggedIn, user?.id]);

  useEffect(() => {
    if (!selectedOrder || !isLoggedIn) return;
    if (!["paid", "refunding", "refunded"].includes(selectedOrder.status)) {
      return;
    }

    let mounted = true;
    setAfterSalesLoadingOrderId(selectedOrder.id);
    loadOrderAfterSalesRequests(selectedOrder.id)
      .then(result => {
        if (!mounted || result === "auth_required") return;
        setOrderAfterSalesByOrderId(prev => ({
          ...prev,
          [selectedOrder.id]: result,
        }));
      })
      .catch(err => {
        if (!mounted) return;
        toast("售后申请读取失败", {
          description: err instanceof Error ? err.message : "请稍后再试。",
        });
      })
      .finally(() => {
        if (mounted) setAfterSalesLoadingOrderId(undefined);
      });

    return () => {
      mounted = false;
    };
  }, [isLoggedIn, loadOrderAfterSalesRequests, selectedOrder]);

  const changeTab = (tab: PersonalTab) => {
    setActiveTab(tab);
    if (tab !== "orders") {
      setFocusedOrderId(undefined);
      setSelectedOrderId(undefined);
    }
    window.history.replaceState(null, "", `/me?tab=${tab}`);
  };

  const openNotificationOrder = (notification: UserNotification) => {
    focusOrder(notification.resource.orderId);
  };

  const markAllNotificationsRead = async () => {
    if (!isLoggedIn || unreadNotificationCount === 0) return;

    setIsMarkingNotificationsRead(true);
    try {
      const nextNotifications = await httpUserNotificationRepository.markRead();
      setNotifications(nextNotifications);
      toast("消息已标记为已读", {
        description: "售后进度仍会保留在消息中心和订单详情中。",
      });
    } catch (err) {
      toast("消息状态更新失败", {
        description: err instanceof Error ? err.message : "请稍后再试。",
      });
    } finally {
      setIsMarkingNotificationsRead(false);
    }
  };

  const navigateToOrderCourse = (order: Order, checkout = false) => {
    const course = courseForOrder(order, allCourses);
    closeOrderDetail();
    if (course) {
      navigate(`/courses/${course.id}${checkout ? "?checkout=course" : ""}`);
      return;
    }

    navigate("/courses");
  };

  const handleCancelOrderFromDetail = async (order: Order) => {
    if (order.status !== "pending_payment") return;

    setOrderActionPendingId(order.id);
    try {
      const result = await cancelCheckoutOrder(order.id);
      if (result === "auth_required") {
        toast("请先登录", {
          description: "登录后可继续处理这笔待支付订单。",
        });
        return;
      }

      setSelectedOrderId(result.checkout.order.id);
      setFocusedOrderId(result.checkout.order.id);
      toast("订单已取消", {
        description: "课程权益未发放，你可以重新下单。",
      });
    } catch (err) {
      toast("订单取消失败", {
        description: err instanceof Error ? err.message : "请稍后再试。",
      });
    } finally {
      setOrderActionPendingId(undefined);
    }
  };

  const handleSubmitAfterSalesRequest = async (
    order: Order,
    request: OrderAfterSalesCreateRequest
  ) => {
    setAfterSalesSubmittingOrderId(order.id);
    try {
      const result = await createOrderAfterSalesRequest(order.id, request);
      if (result === "auth_required") {
        toast("请先登录", {
          description: "登录后可提交并追踪售后申请。",
        });
        return false;
      }

      setOrderAfterSalesByOrderId(prev => ({
        ...prev,
        [order.id]: result,
      }));
      toast("售后申请已提交", {
        description: "后台会按订单号跟进，退款状态不会在用户端直接变更。",
      });
      return true;
    } catch (err) {
      toast("售后申请提交失败", {
        description: err instanceof Error ? err.message : "请稍后再试。",
      });
      return false;
    } finally {
      setAfterSalesSubmittingOrderId(undefined);
    }
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

  const claimCoupon = async (rule: CourseMarketingRule) => {
    if (!isLoggedIn) {
      openLoginModal();
      return;
    }

    setClaimingRuleId(rule.id);
    try {
      const preference = await httpUserPreferenceRepository.claimCoupon(
        rule.id
      );
      setUserPreference(preference);
      toast("优惠券已领取", {
        description: `「${rule.name}」已放入你的账号券包`,
      });
    } catch (err) {
      toast("领取失败", {
        description: err instanceof Error ? err.message : "请稍后再试",
      });
    } finally {
      setClaimingRuleId(undefined);
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
                <p className="text-xs text-white/52">未读消息</p>
                <p className="mt-2 text-2xl font-semibold">
                  {unreadNotificationCount}
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
                      {tab.key === "messages" && unreadNotificationCount > 0 ? (
                        <span className="rounded-full bg-[#B86F56] px-2 py-0.5 text-[11px] font-semibold text-white">
                          {unreadNotificationCount}
                        </span>
                      ) : null}
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
                      const canRebuyCourse =
                        order.status === "refunded" && Boolean(course);
                      return (
                        <div
                          id={orderElementId(order.id)}
                          key={order.id}
                          className={`grid gap-4 px-5 py-5 transition md:grid-cols-[minmax(0,1fr)_140px_120px] ${
                            focusedOrderId === order.id
                              ? "bg-[#FFF7EC] ring-1 ring-inset ring-[#D8B271]"
                              : ""
                          }`}
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
                          <div className="flex flex-wrap items-start gap-2 md:flex-col md:items-end">
                            <button
                              onClick={() => focusOrder(order.id)}
                              className="inline-flex h-9 items-center justify-center rounded-full bg-[#243B35] px-3 text-xs font-semibold text-white transition hover:bg-[#315047]"
                            >
                              订单详情
                            </button>
                            <button
                              onClick={() => {
                                if (course) {
                                  navigate(
                                    `/courses/${course.id}${
                                      canPay || canRebuyCourse
                                        ? "?checkout=course"
                                        : ""
                                    }`
                                  );
                                  return;
                                }
                                navigate("/courses");
                              }}
                              className="inline-flex h-9 items-center justify-center rounded-full border border-[#D8CDBC] px-3 text-xs font-semibold text-[#41675A] transition hover:bg-[#F2F7EE]"
                            >
                              {canPay
                                ? "继续支付"
                                : canRebuyCourse
                                  ? "重新购买"
                                  : "查看课程"}
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

            {activeTab === "messages" && (
              <section className="rounded-lg border border-[#E1D7C8] bg-[#FFFDF8]">
                <div className="flex flex-col gap-3 border-b border-[#E8DED0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">消息中心</h2>
                    <p className="mt-1 text-sm text-[#6D746F]">
                      售后处理、退款受理和后续待办会优先在这里同步。
                    </p>
                    {notificationPrivacyNotice && (
                      <p className="mt-2 text-xs leading-5 text-[#8A8176]">
                        {notificationPrivacyNotice}
                      </p>
                    )}
                    {notificationError && (
                      <p className="mt-2 text-xs font-semibold text-[#A65F48]">
                        {notificationError}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={markAllNotificationsRead}
                    disabled={
                      unreadNotificationCount === 0 ||
                      isMarkingNotificationsRead
                    }
                    className="inline-flex h-10 items-center justify-center rounded-full border border-[#D8CDBC] px-4 text-sm font-semibold text-[#41675A] transition hover:bg-[#F2F7EE] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {isMarkingNotificationsRead ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <BellRing className="mr-2 h-4 w-4" />
                    )}
                    全部标记已读
                  </button>
                </div>

                {isNotificationLoading ? (
                  <div className="flex items-center gap-2 px-5 py-8 text-sm text-[#6D746F]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在同步站内消息
                  </div>
                ) : notifications.length ? (
                  <div className="divide-y divide-[#E8DED0]">
                    {notifications.map(notification => (
                      <button
                        key={notification.id}
                        onClick={() => openNotificationOrder(notification)}
                        className={`grid w-full gap-4 px-5 py-5 text-left transition hover:bg-[#F8F3EA] md:grid-cols-[minmax(0,1fr)_132px] ${
                          notification.status === "unread" ? "bg-[#FFF9F0]" : ""
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                notificationTone[notification.type]
                              }`}
                            >
                              {notificationTypeCopy[notification.type]}
                            </span>
                            {notification.status === "unread" && (
                              <span className="rounded-full bg-[#B86F56] px-2 py-1 text-[11px] font-semibold text-white">
                                未读
                              </span>
                            )}
                          </div>
                          <h3 className="mt-3 font-semibold text-[#243B35]">
                            {notification.title}
                          </h3>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6D746F]">
                            {notification.content}
                          </p>
                          <p className="mt-3 truncate text-xs text-[#8A8176]">
                            {notification.resource.orderTitle ??
                              notification.resource.orderId}
                            {" · "}
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-start md:justify-end">
                          <span className="inline-flex h-9 items-center justify-center rounded-full border border-[#D8CDBC] px-3 text-xs font-semibold text-[#41675A]">
                            查看订单
                            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-5">
                    <EmptyState
                      icon={Bell}
                      title="暂时没有站内消息"
                      description="售后处理和退款受理有新进度时，会在这里留下可追踪记录。"
                      actionLabel="查看订单"
                      onAction={() => changeTab("orders")}
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
                    {isLoggedIn
                      ? isFavoriteSyncing
                        ? "正在同步账号收藏，稍后会和课程列表保持一致。"
                        : "收藏课程已接入账号同步，可在课程列表、详情页和个人中心保持一致。"
                      : "登录后收藏会同步到账号，未登录时会先保留在当前浏览器。"}
                  </p>
                  {favoriteSyncError && (
                    <p className="mt-2 text-xs font-semibold text-[#A65F48]">
                      {favoriteSyncError}
                    </p>
                  )}
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
                    {isLoggedIn
                      ? isPreferenceLoading
                        ? "正在同步账号券包，稍后会展示已领取状态。"
                        : `可用优惠来自服务端营销规则，已领取 ${claimedCouponCount ?? 0} 张课程券。`
                      : "登录后可领取课程券并沉淀到账号券包，未登录仍可查看当前活动。"}
                  </p>
                  {preferenceError && (
                    <p className="mt-2 text-xs font-semibold text-[#A65F48]">
                      {preferenceError}
                    </p>
                  )}
                </div>
                {courseCoupons.length ? (
                  <div className="grid gap-4 p-5 md:grid-cols-2">
                    {courseCoupons.map(rule => {
                      const courseId = rule.scope.courseIds[0];
                      const courseTitle = courseId
                        ? courseTitleById(allCourses, courseId)
                        : "适用课程";
                      const claim = claimedCouponByRuleId.get(rule.id);
                      const status = (claim?.status ??
                        "claimable") as UserCouponDisplayStatus;
                      const isClaiming = claimingRuleId === rule.id;
                      const usedOrder = claim?.usedOrderId
                        ? recentOrders.find(
                            order => order.id === claim.usedOrderId
                          )
                        : undefined;
                      return (
                        <div
                          key={rule.id}
                          className="group overflow-hidden rounded-lg border border-[#E8DED0] bg-[#FFF9F0] text-left transition hover:border-[#CDAA72]"
                        >
                          <div className="flex items-center justify-between gap-4 border-b border-[#EBDCC9] px-5 py-4">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-[#A65F48]">
                                  {couponValue(rule)}
                                </p>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${couponStatusTone[status]}`}
                                >
                                  {couponStatusCopy[status]}
                                </span>
                              </div>
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
                            {status === "used" && claim?.usedOrderId && (
                              <p className="mt-2 line-clamp-1 text-xs font-semibold text-[#6D746F]">
                                已用于订单 {claim.usedOrderId}
                                {claim.usedAt
                                  ? ` · ${formatDate(claim.usedAt)}`
                                  : ""}
                                {usedOrder?.paymentChannel
                                  ? ` · ${paymentChannelCopy[usedOrder.paymentChannel]}`
                                  : ""}
                              </p>
                            )}
                            <div className="mt-4 flex flex-wrap gap-2">
                              {status === "claimable" ? (
                                <button
                                  onClick={() => claimCoupon(rule)}
                                  disabled={isClaiming}
                                  className="inline-flex h-9 items-center justify-center rounded-full bg-[#243B35] px-3 text-xs font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isClaiming && (
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                  )}
                                  {isLoggedIn ? "领取" : "登录领取"}
                                </button>
                              ) : status === "used" ? (
                                <span className="inline-flex h-9 items-center justify-center rounded-full bg-[#EFEAE1] px-3 text-xs font-semibold text-[#7B817C]">
                                  已用于订单
                                </span>
                              ) : status === "expired" ? (
                                <span className="inline-flex h-9 items-center justify-center rounded-full bg-[#F4E5DE] px-3 text-xs font-semibold text-[#A65F48]">
                                  已失效
                                </span>
                              ) : (
                                <span className="inline-flex h-9 items-center justify-center rounded-full bg-[#E6EDDF] px-3 text-xs font-semibold text-[#41675A]">
                                  已入账号券包
                                </span>
                              )}
                              <button
                                onClick={() =>
                                  status === "used"
                                    ? claim?.usedOrderId
                                      ? focusOrder(claim.usedOrderId)
                                      : changeTab("orders")
                                    : courseId
                                      ? navigate(`/courses/${courseId}`)
                                      : navigate("/courses")
                                }
                                className="inline-flex h-9 items-center justify-center rounded-full border border-[#D8CDBC] px-3 text-xs font-semibold text-[#41675A] transition hover:bg-[#F2F7EE]"
                              >
                                {status === "used" ? "查看订单" : "去使用"}
                                <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                              </button>
                            </div>
                          </div>
                        </div>
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
                        领取后会沉淀到账号券包，结算抽屉会优先展示已领取可用券，支付成功后记录使用订单。
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

      <PersonalOrderDetailDrawer
        afterSales={selectedOrderAfterSales}
        couponName={selectedOrderCouponName}
        course={selectedOrderCourse}
        isActionPending={orderActionPendingId === selectedOrder?.id}
        isAfterSalesLoading={afterSalesLoadingOrderId === selectedOrder?.id}
        isAfterSalesSubmitting={
          afterSalesSubmittingOrderId === selectedOrder?.id
        }
        isOpen={Boolean(selectedOrder)}
        notifications={selectedOrderNotifications}
        order={selectedOrder}
        onCancelOrder={handleCancelOrderFromDetail}
        onClose={closeOrderDetail}
        onContinuePayment={order => navigateToOrderCourse(order, true)}
        onRebuyCourse={order => navigateToOrderCourse(order, true)}
        onSubmitAfterSales={handleSubmitAfterSalesRequest}
        onViewCourse={order => navigateToOrderCourse(order)}
        onViewWorkspace={() => {
          closeOrderDetail();
          navigate("/me/courses");
        }}
      />

      <AppFooter />
    </div>
  );
}

function PersonalOrderDetailDrawer({
  afterSales,
  couponName,
  course,
  isActionPending,
  isAfterSalesLoading,
  isAfterSalesSubmitting,
  isOpen,
  notifications,
  order,
  onCancelOrder,
  onClose,
  onContinuePayment,
  onRebuyCourse,
  onSubmitAfterSales,
  onViewCourse,
  onViewWorkspace,
}: {
  afterSales?: OrderAfterSalesListResult;
  couponName?: string;
  course?: Course;
  isActionPending: boolean;
  isAfterSalesLoading: boolean;
  isAfterSalesSubmitting: boolean;
  isOpen: boolean;
  notifications: UserNotification[];
  order?: Order;
  onCancelOrder: (order: Order) => void;
  onClose: () => void;
  onContinuePayment: (order: Order) => void;
  onRebuyCourse: (order: Order) => void;
  onSubmitAfterSales: (
    order: Order,
    request: OrderAfterSalesCreateRequest
  ) => Promise<boolean>;
  onViewCourse: (order: Order) => void;
  onViewWorkspace: () => void;
}) {
  const amountRows = order ? createPersonalOrderAmountRows(order) : [];
  const timeline = order ? createPersonalOrderTimeline(order) : [];
  const serviceNotes = order ? createPersonalOrderServiceNotes(order) : [];
  const [afterSalesType, setAfterSalesType] =
    useState<OrderAfterSalesRequestType>("learning_access_issue");
  const [afterSalesDescription, setAfterSalesDescription] = useState("");
  const [afterSalesContact, setAfterSalesContact] = useState("");
  const firstItem = order?.items[0];
  const canPay = order?.status === "pending_payment";
  const canViewCourse =
    order?.status === "paid" || order?.status === "refunding";
  const canRebuyCourse = order?.status === "refunded";
  const canSubmitAfterSales =
    order?.status === "paid" || order?.status === "refunding";
  const activeAfterSales = afterSales?.activeRequest;
  const afterSalesRequests = afterSales?.requests ?? [];
  const isAfterSalesFormReady =
    afterSalesDescription.trim().length >= 4 &&
    afterSalesContact.trim().length >= 4;

  useEffect(() => {
    setAfterSalesType("learning_access_issue");
    setAfterSalesDescription("");
    setAfterSalesContact("");
  }, [order?.id]);

  return (
    <AnimatePresence>
      {isOpen && order && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end bg-[#172620]/52 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.aside
            className="flex h-full w-full max-w-[520px] flex-col overflow-y-auto bg-[#FFFDF8] text-[#243B35] shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={event => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E7DED0] bg-[#FFFDF8]/95 px-5 py-4 backdrop-blur">
              <div>
                <p className="text-xs font-semibold text-[#6F8F83]">订单详情</p>
                <h2 className="mt-1 text-xl font-semibold">
                  {orderStatusCopy[order.status]}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4EFE6] text-[#6D746F] transition hover:text-[#243B35]"
                aria-label="关闭订单详情"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-6">
              <div className="rounded-[24px] bg-[#243B35] p-5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#DDE8D9]">
                      {firstItem?.type === "membership"
                        ? "会员订单"
                        : "课程订单"}
                    </p>
                    <h3 className="mt-3 line-clamp-2 text-xl font-semibold">
                      {firstItem?.title ?? "订单商品"}
                    </h3>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#DDE8D9]">
                    {orderStatusCopy[order.status]}
                  </span>
                </div>
                <p className="mt-4 break-all rounded-[16px] bg-white/10 px-3 py-2 text-xs font-semibold text-[#DDE8D9]">
                  订单号 {order.id}
                </p>
              </div>

              <section className="mt-5 rounded-[20px] border border-[#E4DCCF] bg-white p-5">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[#6F8F83]" />
                  <h3 className="font-semibold">金额明细</h3>
                </div>
                <div className="mt-4 divide-y divide-[#E8DED0]">
                  {amountRows.map(row => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-4 py-3 text-sm"
                    >
                      <span className="text-[#6D746F]">{row.label}</span>
                      <span
                        className={`font-semibold ${
                          row.tone === "discount"
                            ? "text-[#A65F48]"
                            : row.tone === "payable"
                              ? "text-[#243B35]"
                              : "text-[#5F6B64]"
                        }`}
                      >
                        {formatSignedMoney(row.amount)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 text-xs text-[#6D746F] sm:grid-cols-2">
                  <p className="rounded-[16px] bg-[#F9F5EE] px-3 py-2">
                    支付方式：
                    <span className="font-semibold text-[#243B35]">
                      {order.paymentChannel
                        ? paymentChannelCopy[order.paymentChannel]
                        : "待确认"}
                    </span>
                  </p>
                  <p className="rounded-[16px] bg-[#F9F5EE] px-3 py-2">
                    优惠券：
                    <span className="font-semibold text-[#243B35]">
                      {couponName ?? "未使用账号券"}
                    </span>
                  </p>
                </div>
              </section>

              <section className="mt-5 rounded-[20px] border border-[#E4DCCF] bg-white p-5">
                <div className="flex items-center gap-2">
                  <PackageCheck className="h-4 w-4 text-[#6F8F83]" />
                  <h3 className="font-semibold">权益交付</h3>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-[#5F6B64]">
                  <p>
                    商品类型：
                    <span className="font-semibold text-[#243B35]">
                      {firstItem?.type === "membership"
                        ? "成长会员"
                        : "课程商品"}
                    </span>
                  </p>
                  <p>
                    商品数量：
                    <span className="font-semibold text-[#243B35]">
                      {firstItem?.quantity ?? 1}
                    </span>
                  </p>
                  <p>
                    交付状态：
                    <span className="font-semibold text-[#243B35]">
                      {order.status === "refunded"
                        ? "已退款，权益已停止"
                        : order.entitlementDeliveredAt
                          ? `已交付 · ${formatDate(order.entitlementDeliveredAt)}`
                          : order.status === "pending_payment"
                            ? "待支付后交付"
                            : "未交付"}
                    </span>
                  </p>
                </div>
              </section>

              <section className="mt-5 rounded-[20px] border border-[#E4DCCF] bg-white p-5">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#6F8F83]" />
                  <h3 className="font-semibold">订单时间线</h3>
                </div>
                <div className="mt-4 space-y-3">
                  {timeline.map(item => (
                    <div
                      key={item.key}
                      className="flex items-start justify-between gap-4 rounded-[16px] bg-[#F9F5EE] px-3 py-3 text-sm"
                    >
                      <span
                        className={`font-semibold ${
                          item.tone === "success"
                            ? "text-[#41675A]"
                            : item.tone === "warning"
                              ? "text-[#8A641C]"
                              : item.tone === "muted"
                                ? "text-[#7B817C]"
                                : "text-[#243B35]"
                        }`}
                      >
                        {item.label}
                      </span>
                      <span className="shrink-0 text-xs text-[#6D746F]">
                        {formatDate(item.at)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-5 rounded-[20px] border border-[#E4DCCF] bg-[#FFF7EC] p-5">
                <div className="flex items-center gap-2">
                  <LifeBuoy className="h-4 w-4 text-[#A65F48]" />
                  <h3 className="font-semibold">售后服务</h3>
                </div>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-[#6D746F]">
                  {serviceNotes.map(note => (
                    <li key={note}>· {note}</li>
                  ))}
                </ul>
                {isAfterSalesLoading && (
                  <div className="mt-4 flex items-center gap-2 rounded-[16px] bg-white/70 px-3 py-3 text-sm text-[#6D746F]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在同步售后申请状态
                  </div>
                )}
                {afterSalesRequests.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {afterSalesRequests.map(request => (
                      <div
                        key={request.id}
                        className="rounded-[16px] border border-[#E6D6C8] bg-white/80 px-3 py-3 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-[#243B35]">
                            {afterSalesRequestTypeCopy[request.requestType]}
                          </span>
                          <span className="rounded-full bg-[#F4EFE6] px-2.5 py-1 text-xs font-semibold text-[#6D746F]">
                            {afterSalesStatusCopy[request.status]}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-[#6D746F]">
                          {request.description}
                        </p>
                        <p className="mt-2 break-all text-xs text-[#8B8175]">
                          工单号 {request.id} · {formatDate(request.createdAt)}
                        </p>
                        {request.operatorNote ? (
                          <p className="mt-2 rounded-[12px] bg-[#F8F3EA] px-3 py-2 text-xs leading-5 text-[#6D746F]">
                            处理备注：{request.operatorNote}
                          </p>
                        ) : null}
                        {request.linkedRefundRequestId ? (
                          <p className="mt-2 rounded-[12px] bg-[#EAF2EC] px-3 py-2 text-xs leading-5 text-[#41675A]">
                            退款申请已受理，受理单号{" "}
                            {request.linkedRefundRequestId}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
                {notifications.length > 0 && (
                  <div className="mt-4 rounded-[16px] border border-[#E6D6C8] bg-white/80 px-3 py-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#243B35]">
                      <BellRing className="h-4 w-4 text-[#6F8F83]" />
                      售后进度
                    </div>
                    <div className="mt-3 space-y-2">
                      {notifications.slice(0, 4).map(notification => (
                        <div
                          key={notification.id}
                          className="rounded-[12px] bg-[#F8F3EA] px-3 py-2 text-xs leading-5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-[#243B35]">
                              {notificationTypeCopy[notification.type]}
                            </span>
                            <span className="text-[#8A8176]">
                              {formatDate(notification.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-[#6D746F]">
                            {notification.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {canSubmitAfterSales && !activeAfterSales && (
                  <form
                    className="mt-4 space-y-3"
                    onSubmit={event => {
                      event.preventDefault();
                      if (!isAfterSalesFormReady || isAfterSalesSubmitting) {
                        return;
                      }
                      void onSubmitAfterSales(order, {
                        requestType: afterSalesType,
                        description: afterSalesDescription,
                        contact: afterSalesContact,
                      }).then(success => {
                        if (success) {
                          setAfterSalesDescription("");
                          setAfterSalesContact("");
                        }
                      });
                    }}
                  >
                    <select
                      value={afterSalesType}
                      onChange={event =>
                        setAfterSalesType(
                          event.target.value as OrderAfterSalesRequestType
                        )
                      }
                      className="h-11 w-full rounded-[16px] border border-[#D8CDBC] bg-white px-3 text-sm font-semibold text-[#243B35] outline-none transition focus:border-[#6F8F83]"
                    >
                      {Object.entries(afterSalesRequestTypeCopy).map(
                        ([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                    <textarea
                      value={afterSalesDescription}
                      onChange={event =>
                        setAfterSalesDescription(event.target.value)
                      }
                      maxLength={500}
                      rows={3}
                      placeholder="请简要说明遇到的问题"
                      className="min-h-[96px] w-full resize-none rounded-[16px] border border-[#D8CDBC] bg-white px-3 py-3 text-sm text-[#243B35] outline-none transition placeholder:text-[#A69D91] focus:border-[#6F8F83]"
                    />
                    <input
                      value={afterSalesContact}
                      onChange={event =>
                        setAfterSalesContact(event.target.value)
                      }
                      maxLength={80}
                      placeholder="手机号或邮箱"
                      className="h-11 w-full rounded-[16px] border border-[#D8CDBC] bg-white px-3 text-sm text-[#243B35] outline-none transition placeholder:text-[#A69D91] focus:border-[#6F8F83]"
                    />
                    <button
                      type="submit"
                      disabled={
                        !isAfterSalesFormReady || isAfterSalesSubmitting
                      }
                      className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#A65F48] text-sm font-semibold text-white transition hover:bg-[#8F4F3C] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isAfterSalesSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      提交售后申请
                    </button>
                  </form>
                )}
                {activeAfterSales && (
                  <p className="mt-4 rounded-[16px] bg-white/80 px-3 py-3 text-sm leading-6 text-[#6D746F]">
                    当前申请正在处理中，后台会结合订单、交易流水和权益记录核查。
                  </p>
                )}
              </section>

              <div className="mt-6 grid gap-3">
                {canPay && (
                  <button
                    onClick={() => onContinuePayment(order)}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-[#243B35] text-sm font-semibold text-white transition hover:bg-[#315047]"
                  >
                    继续支付
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </button>
                )}
                {canPay && (
                  <button
                    onClick={() => onCancelOrder(order)}
                    disabled={isActionPending}
                    className="inline-flex h-12 items-center justify-center rounded-full border border-[#D8CDBC] text-sm font-semibold text-[#A65F48] transition hover:bg-[#FFF1EC] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isActionPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    取消订单
                  </button>
                )}
                {canViewCourse && course && (
                  <button
                    onClick={() => onViewCourse(order)}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-[#243B35] text-sm font-semibold text-white transition hover:bg-[#315047]"
                  >
                    查看课程
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </button>
                )}
                {canRebuyCourse && course && (
                  <button
                    onClick={() => onRebuyCourse(order)}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-[#243B35] text-sm font-semibold text-white transition hover:bg-[#315047]"
                  >
                    重新购买
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </button>
                )}
                {order.status === "paid" && (
                  <button
                    onClick={onViewWorkspace}
                    className="inline-flex h-12 items-center justify-center rounded-full border border-[#D8CDBC] text-sm font-semibold text-[#41675A] transition hover:bg-[#EEF4EA]"
                  >
                    查看成长空间
                  </button>
                )}
              </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
