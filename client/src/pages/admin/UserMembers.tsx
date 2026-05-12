import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import {
  ALL_USER_ADMIN_MEMBERSHIP_STATUS,
  ALL_USER_ADMIN_ROLE,
  USER_ADMIN_PAGE_SIZE,
  USER_ADMIN_PERMISSIONS,
  UserRoleSchema,
  userCan,
  type ConsentType,
  type OrderStatus,
  type UserAdminDetail,
  type UserAdminListItem,
  type UserAdminListQuery,
  type UserAdminMembershipStatus,
  type UserRole,
} from "@shared/domain";
import { useAuth } from "@/contexts/AuthContext";
import { httpAdminUserRepository } from "@/features/users";

const roleCopy = {
  visitor: "访客",
  member: "会员用户",
  counselor: "咨询师",
  catalog_viewer: "课程只读",
  catalog_operator: "课程运营",
  operator: "运营",
  admin: "管理员",
} satisfies Record<UserRole, string>;

const membershipCopy = {
  none: "未开通",
  active: "生效中",
  expired: "已到期",
} satisfies Record<UserAdminMembershipStatus, string>;

const orderStatusCopy = {
  created: "已创建",
  pending_payment: "待支付",
  paid: "已支付",
  closed: "已关闭",
  refunding: "退款中",
  refunded: "已退款",
} satisfies Record<OrderStatus, string>;

const consentCopy = {
  terms: "用户协议",
  privacy: "隐私政策",
  assessment_notice: "测评告知",
  counseling_notice: "咨询告知",
  minor_guardian_notice: "监护人告知",
} satisfies Record<ConsentType, string>;

const appointmentStatusCopy = {
  pending_payment: "待支付",
  scheduled: "已预约",
  completed: "已完成",
  cancelled: "已取消",
  no_show: "未到访",
  refunded: "已退款",
};

const riskLevelCopy = {
  medium: "中风险",
  high: "高风险",
  urgent: "紧急",
};

const riskSourceCopy = {
  assessment: "心理测评",
  counseling_intake: "咨询前信息",
  chat: "对话",
  operator: "运营标记",
};

const riskStatusCopy = {
  open: "待处理",
  reviewing: "复核中",
  resolved: "已解决",
  escalated: "已升级",
};

const sortOptions: {
  value: UserAdminListQuery["sort"];
  label: string;
}[] = [
  { value: "last_activity_desc", label: "最近活跃" },
  { value: "updated_desc", label: "最近更新" },
  { value: "created_desc", label: "最新注册" },
];

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

function formatMoney(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2,
  }).format(value);
}

function membershipClass(status: UserAdminMembershipStatus) {
  if (status === "active") return "bg-[#E7EFE8] text-[#41675A]";
  if (status === "expired") return "bg-[#FFF7E5] text-[#8F6B1C]";
  return "bg-[#EEF2F7] text-[#536783]";
}

function riskClass(count: number) {
  return count > 0 ? "bg-[#FBEAE7] text-[#9B3B2F]" : "bg-[#E7EFE8] text-[#41675A]";
}

function metricValue(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function roleOptionsFromResult(result: UserAdminListQueryResult | undefined) {
  const roles = result?.filters.roles.length
    ? result.filters.roles
    : UserRoleSchema.options;
  return roles;
}

type UserAdminListQueryResult = Awaited<
  ReturnType<typeof httpAdminUserRepository.loadUsers>
>;

function UserRow({
  user,
  selected,
  onSelect,
}: {
  user: UserAdminListItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`grid w-full gap-3 border-b border-[#E8DED0] px-4 py-4 text-left transition lg:grid-cols-[minmax(220px,1.2fr)_120px_120px_120px_120px] ${
        selected ? "bg-[#EEF5EA]" : "hover:bg-[#FBF7EF]"
      }`}
    >
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E5ECE1] text-[#41675A]">
            <UserRound className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-[#243B35]">
              {user.displayName}
            </span>
            <span className="mt-0.5 block truncate text-xs text-[#8A8176]">
              {user.phoneMasked ?? user.id}
            </span>
          </span>
        </span>
      </span>
      <span className="flex flex-wrap gap-1.5 lg:block">
        {user.roles.slice(0, 2).map(role => (
          <span
            key={role}
            className="inline-flex rounded-full bg-[#F1E8DC] px-2 py-0.5 text-xs font-semibold text-[#73695F] lg:mb-1"
          >
            {roleCopy[role]}
          </span>
        ))}
      </span>
      <span>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${membershipClass(
            user.membershipStatus
          )}`}
        >
          {membershipCopy[user.membershipStatus]}
        </span>
      </span>
      <span className="text-sm text-[#5F6B64]">
        {user.ownedCourseCount} 门 / {user.orderCount} 单
      </span>
      <span className="flex items-center justify-between gap-2 text-sm text-[#5F6B64] lg:block">
        <span>{formatDate(user.lastActivityAt)}</span>
        <span
          className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${riskClass(
            user.activeRiskCount
          )}`}
        >
          {user.activeRiskCount > 0 ? `${user.activeRiskCount} 个风险` : "无开放风险"}
        </span>
      </span>
    </button>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  const Icon = icon;
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center px-5 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#E5ECE1] text-[#41675A]">
        <Icon className="h-5 w-5" />
      </span>
      <h2 className="mt-4 text-sm font-semibold text-[#243B35]">{title}</h2>
      <p className="mt-2 max-w-[360px] text-sm leading-6 text-[#7B817C]">
        {description}
      </p>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-[#E8DED0] px-5 py-4 first:border-t-0">
      <h3 className="text-xs font-semibold text-[#8A8176]">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function UserDetailPanel({
  detail,
  loading,
  error,
}: {
  detail?: UserAdminDetail;
  loading: boolean;
  error?: string;
}) {
  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-sm text-[#6F7771]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        正在读取用户详情
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="用户详情暂时不可用"
        description={error}
      />
    );
  }

  if (!detail) {
    return (
      <EmptyState
        icon={Eye}
        title="选择一个用户"
        description="用户摘要、会员权益、课程订单、咨询预约和风险提示会在这里汇总。"
      />
    );
  }

  return (
    <div>
      <div className="px-5 py-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#E5ECE1] text-[#41675A]">
            <UserRound className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-[#243B35]">
              {detail.user.displayName}
            </h2>
            <p className="mt-1 text-xs text-[#8A8176]">{detail.user.id}</p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${membershipClass(
              detail.user.membershipStatus
            )}`}
          >
            {membershipCopy[detail.user.membershipStatus]}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 border-y border-[#E8DED0] text-center text-sm">
          <div className="border-r border-[#E8DED0] py-3">
            <p className="text-lg font-semibold">{detail.courseAccess.ownedCourseCount}</p>
            <p className="mt-0.5 text-xs text-[#8A8176]">课程</p>
          </div>
          <div className="border-r border-[#E8DED0] py-3">
            <p className="text-lg font-semibold">{detail.counseling.totalCount}</p>
            <p className="mt-0.5 text-xs text-[#8A8176]">咨询</p>
          </div>
          <div className="py-3">
            <p className="text-lg font-semibold">{detail.risk.openCount}</p>
            <p className="mt-0.5 text-xs text-[#8A8176]">风险</p>
          </div>
        </div>
      </div>

      <DetailSection title="会员权益">
        <div className="grid gap-2 text-sm text-[#5F6B64]">
          <div className="flex justify-between gap-3">
            <span>会员状态</span>
            <span className="font-semibold text-[#243B35]">
              {membershipCopy[detail.membership.status]}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span>会员计划</span>
            <span className="font-semibold text-[#243B35]">
              {detail.membership.planName ?? "未记录"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span>到期时间</span>
            <span className="font-semibold text-[#243B35]">
              {formatDate(detail.membership.expiresAt)}
            </span>
          </div>
        </div>
      </DetailSection>

      <DetailSection title="最近订单">
        {detail.courseAccess.recentOrders.length === 0 ? (
          <p className="text-sm text-[#8A8176]">暂无订单</p>
        ) : (
          <div className="divide-y divide-[#E8DED0]">
            {detail.courseAccess.recentOrders.map(order => (
              <div key={order.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#243B35]">
                      {order.title}
                    </p>
                    <p className="mt-1 text-xs text-[#8A8176]">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#243B35]">
                      {formatMoney(order.payableAmount)}
                    </p>
                    <p className="mt-1 text-xs text-[#8A8176]">
                      {orderStatusCopy[order.status]}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      <DetailSection title="咨询预约摘要">
        {detail.counseling.recentAppointments.length === 0 ? (
          <p className="text-sm text-[#8A8176]">暂无咨询预约</p>
        ) : (
          <div className="divide-y divide-[#E8DED0]">
            {detail.counseling.recentAppointments.map(appointment => (
              <div
                key={appointment.appointmentId}
                className="py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#243B35]">
                      {appointment.counselorName}
                    </p>
                    <p className="mt-1 text-xs text-[#8A8176]">
                      {formatDate(appointment.startsAt)} · {appointment.channel}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#F1E8DC] px-2 py-0.5 text-xs font-semibold text-[#73695F]">
                    {appointmentStatusCopy[appointment.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      <DetailSection title="风险提示">
        {detail.risk.recentEvents.length === 0 ? (
          <p className="text-sm text-[#8A8176]">暂无开放风险事件</p>
        ) : (
          <div className="divide-y divide-[#E8DED0]">
            {detail.risk.recentEvents.map(event => (
              <div key={event.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#243B35]">
                      {riskSourceCopy[event.source]}
                    </p>
                    <p className="mt-1 text-xs text-[#8A8176]">
                      {formatDate(event.createdAt)}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#FBEAE7] px-2 py-0.5 text-xs font-semibold text-[#9B3B2F]">
                    {riskLevelCopy[event.riskLevel]} · {riskStatusCopy[event.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      <DetailSection title="协议记录">
        {detail.consents.length === 0 ? (
          <p className="text-sm text-[#8A8176]">暂无协议记录</p>
        ) : (
          <div className="grid gap-2">
            {detail.consents.map(consent => (
              <div
                key={`${consent.type}-${consent.version}`}
                className="flex justify-between gap-3 text-sm"
              >
                <span className="text-[#5F6B64]">
                  {consentCopy[consent.type]} {consent.version}
                </span>
                <span className="text-[#8A8176]">
                  {formatDate(consent.acceptedAt)}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs leading-5 text-[#8A8176]">
          {detail.privacyNotice}
        </p>
      </DetailSection>
    </div>
  );
}

export default function UserMembers() {
  const { user } = useAuth();
  const canRead = Boolean(user && userCan(user, USER_ADMIN_PERMISSIONS.read));
  const [query, setQuery] = useState<UserAdminListQuery>({
    keyword: "",
    role: ALL_USER_ADMIN_ROLE,
    membershipStatus: ALL_USER_ADMIN_MEMBERSHIP_STATUS,
    sort: "last_activity_desc",
    page: 1,
    pageSize: USER_ADMIN_PAGE_SIZE,
  });
  const [keywordDraft, setKeywordDraft] = useState("");
  const [result, setResult] = useState<UserAdminListQueryResult>();
  const [selectedUserId, setSelectedUserId] = useState<string>();
  const [detail, setDetail] = useState<UserAdminDetail>();
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [detailError, setDetailError] = useState<string>();

  const loadUsers = useCallback(() => {
    if (!canRead) return;

    setLoading(true);
    setError(undefined);
    httpAdminUserRepository
      .loadUsers(query)
      .then(nextResult => {
        setResult(nextResult);
        setSelectedUserId(current => {
          if (current && nextResult.items.some(item => item.id === current)) {
            return current;
          }
          return nextResult.items[0]?.id;
        });
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : "用户会员列表暂时不可用");
        setResult(undefined);
      })
      .finally(() => setLoading(false));
  }, [canRead, query]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!canRead || !selectedUserId) {
      setDetail(undefined);
      return;
    }

    setDetailLoading(true);
    setDetailError(undefined);
    httpAdminUserRepository
      .loadUserDetail(selectedUserId)
      .then(setDetail)
      .catch(err => {
        setDetail(undefined);
        setDetailError(
          err instanceof Error ? err.message : "用户会员详情暂时不可用"
        );
      })
      .finally(() => setDetailLoading(false));
  }, [canRead, selectedUserId]);

  const roleOptions = useMemo(() => roleOptionsFromResult(result), [result]);
  const membershipOptions = useMemo(
    () =>
      result?.filters.membershipStatuses.length
        ? result.filters.membershipStatuses
        : (["none", "active", "expired"] as UserAdminMembershipStatus[]),
    [result]
  );

  function updateQuery(next: Partial<UserAdminListQuery>) {
    setQuery(current => ({
      ...current,
      ...next,
      page: next.page ?? 1,
    }));
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateQuery({ keyword: keywordDraft.trim() });
  }

  if (!canRead) {
    return (
      <div className="rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-8 text-center text-[#243B35] shadow-sm shadow-[#243B35]/5">
        <ShieldCheck className="mx-auto h-8 w-8 text-[#6F8F83]" />
        <h1 className="mt-4 text-xl font-semibold">当前账号暂无用户会员权限</h1>
        <p className="mt-2 text-sm leading-6 text-[#6F7771]">
          用户、会员、咨询与风险摘要需要用户后台读取权限。
        </p>
      </div>
    );
  }

  return (
    <div className="text-[#243B35]">
      <section className="flex flex-col gap-4 border-b border-[#E1D7C8] pb-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B7E6D]">
            用户会员
          </p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
            用户会员管理
          </h1>
          <p className="mt-3 max-w-[760px] text-sm leading-6 text-[#6F7771]">
            聚合账号、会员、课程权益、订单、咨询预约和风险摘要，默认保持隐私最小化。
          </p>
        </div>
        <button
          onClick={loadUsers}
          disabled={loading}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-wait disabled:opacity-70"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </button>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 grid border-y border-[#E1D7C8] bg-[#FFFDF8] md:grid-cols-4"
      >
        {[
          {
            label: "用户数",
            value: result?.summary.totalCount ?? 0,
            icon: UsersRound,
          },
          {
            label: "生效会员",
            value: result?.summary.activeMembershipCount ?? 0,
            icon: BadgeCheck,
          },
          {
            label: "未成年人账号",
            value: result?.summary.minorCount ?? 0,
            icon: ShieldCheck,
          },
          {
            label: "开放风险",
            value: result?.summary.activeRiskCount ?? 0,
            icon: AlertTriangle,
          },
        ].map(metric => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="flex items-center justify-between border-b border-[#E8DED0] px-4 py-4 md:border-b-0 md:border-r last:md:border-r-0"
            >
              <div>
                <p className="text-xs text-[#8A8176]">{metric.label}</p>
                <p className="mt-1 text-2xl font-semibold text-[#243B35]">
                  {metricValue(metric.value)}
                </p>
              </div>
              <Icon className="h-5 w-5 text-[#6F8F83]" />
            </div>
          );
        })}
      </motion.section>

      <section className="mt-6 rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-4 shadow-sm shadow-[#243B35]/5">
        <form
          onSubmit={submitSearch}
          className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px_180px_auto]"
        >
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A8F82]" />
            <input
              value={keywordDraft}
              onChange={event => setKeywordDraft(event.target.value)}
              placeholder="搜索用户 ID、昵称、脱敏手机号"
              className="h-10 w-full rounded-lg border border-[#DCCDBB] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15"
            />
          </label>

          <select
            value={query.role}
            onChange={event =>
              updateQuery({
                role: event.target.value as UserAdminListQuery["role"],
              })
            }
            className="h-10 rounded-lg border border-[#DCCDBB] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15"
          >
            <option value={ALL_USER_ADMIN_ROLE}>全部角色</option>
            {roleOptions.map(role => (
              <option key={role} value={role}>
                {roleCopy[role]}
              </option>
            ))}
          </select>

          <select
            value={query.membershipStatus}
            onChange={event =>
              updateQuery({
                membershipStatus: event.target
                  .value as UserAdminListQuery["membershipStatus"],
              })
            }
            className="h-10 rounded-lg border border-[#DCCDBB] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15"
          >
            <option value={ALL_USER_ADMIN_MEMBERSHIP_STATUS}>全部会员</option>
            {membershipOptions.map(status => (
              <option key={status} value={status}>
                {membershipCopy[status]}
              </option>
            ))}
          </select>

          <select
            value={query.sort}
            onChange={event =>
              updateQuery({
                sort: event.target.value as UserAdminListQuery["sort"],
              })
            }
            className="h-10 rounded-lg border border-[#DCCDBB] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047]">
            <Search className="h-4 w-4" />
            搜索
          </button>
        </form>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 overflow-hidden rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] shadow-sm shadow-[#243B35]/5">
          <div className="hidden grid-cols-[minmax(220px,1.2fr)_120px_120px_120px_120px] border-b border-[#E8DED0] bg-[#F8F3EA] px-4 py-3 text-xs font-semibold text-[#8A8176] lg:grid">
            <span>用户</span>
            <span>角色</span>
            <span>会员</span>
            <span>权益/订单</span>
            <span>最近活跃</span>
          </div>

          {loading ? (
            <div className="flex min-h-[340px] items-center justify-center text-sm text-[#6F7771]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              正在读取用户会员
            </div>
          ) : error ? (
            <EmptyState
              icon={AlertTriangle}
              title="用户会员列表暂时不可用"
              description={error}
            />
          ) : result && result.items.length > 0 ? (
            <div>
              {result.items.map(item => (
                <UserRow
                  key={item.id}
                  user={item}
                  selected={item.id === selectedUserId}
                  onSelect={() => setSelectedUserId(item.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={UsersRound}
              title="没有匹配的用户"
              description="当前筛选条件下暂无用户会员记录。"
            />
          )}

          {result && result.meta.totalPages > 0 && (
            <div className="flex flex-col gap-3 border-t border-[#E8DED0] px-4 py-3 text-sm text-[#6F7771] md:flex-row md:items-center md:justify-between">
              <span>
                第 {result.meta.page} / {result.meta.totalPages} 页，共{" "}
                {result.meta.total} 人
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => updateQuery({ page: Math.max(1, query.page - 1) })}
                  disabled={query.page <= 1}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#DCCDBB] px-3 font-semibold text-[#53675D] transition hover:bg-[#F8F3EA] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一页
                </button>
                <button
                  onClick={() =>
                    updateQuery({
                      page: Math.min(result.meta.totalPages, query.page + 1),
                    })
                  }
                  disabled={query.page >= result.meta.totalPages}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#DCCDBB] px-3 font-semibold text-[#53675D] transition hover:bg-[#F8F3EA] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  下一页
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="overflow-hidden rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] shadow-sm shadow-[#243B35]/5">
          <div className="flex items-center justify-between border-b border-[#E8DED0] px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ClipboardList className="h-4 w-4 text-[#6F8F83]" />
              用户详情
            </div>
            <div className="flex items-center gap-2 text-xs text-[#8A8176]">
              <CalendarClock className="h-3.5 w-3.5" />
              {formatDate(detail?.generatedAt)}
            </div>
          </div>
          <UserDetailPanel
            detail={detail}
            loading={detailLoading}
            error={detailError}
          />
        </aside>
      </section>
    </div>
  );
}
