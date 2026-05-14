import {
  AlertTriangle,
  BadgeDollarSign,
  BookOpen,
  ClipboardList,
  CreditCard,
  FileClock,
  LayoutDashboard,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import {
  COURSE_CATALOG_PERMISSIONS,
  FINANCE_ADMIN_PERMISSIONS,
  ORDER_ADMIN_PERMISSIONS,
  TRANSACTION_ADMIN_PERMISSIONS,
  USER_ADMIN_PERMISSIONS,
  type AuthPermission,
  type UserProfile,
  userCan,
} from "@shared/domain";

export type AdminModuleStatus = "available" | "planned";
export type AdminModuleGroup = "overview" | "business" | "governance";
export type AdminAccessState =
  | "syncing"
  | "anonymous"
  | "forbidden"
  | "authorized";

export interface AdminNavigationItem {
  key: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  permission: AuthPermission;
  status: AdminModuleStatus;
  group: AdminModuleGroup;
  milestone: string;
}

export const adminNavigationItems = [
  {
    key: "overview",
    title: "后台首页",
    description: "运营模块入口、建设状态和下一步任务。",
    href: "/admin",
    icon: LayoutDashboard,
    permission: "admin:read",
    status: "available",
    group: "overview",
    milestone: "M1",
  },
  {
    key: "counseling",
    title: "咨询运营",
    description: "排班维护、取消规则、履约审计和咨询服务运营配置。",
    href: "/admin/counseling",
    icon: SlidersHorizontal,
    permission: "admin:manage",
    status: "available",
    group: "business",
    milestone: "已上线",
  },
  {
    key: "payments",
    title: "支付对账",
    description: "核对回调收据、业务订单和咨询预约状态。",
    href: "/admin/payments",
    icon: ReceiptText,
    permission: "admin:manage",
    status: "available",
    group: "business",
    milestone: "已上线",
  },
  {
    key: "courses",
    title: "课程商品",
    description: "课程商品、详情内容、价格、审核流和上下架。",
    href: "/admin/courses",
    icon: BookOpen,
    permission: COURSE_CATALOG_PERMISSIONS.read,
    status: "available",
    group: "business",
    milestone: "M2-H",
  },
  {
    key: "users",
    title: "用户会员",
    description: "用户检索、会员权益、账号状态和会员操作审计。",
    href: "/admin/users",
    icon: UsersRound,
    permission: USER_ADMIN_PERMISSIONS.read,
    status: "available",
    group: "business",
    milestone: "M3-B",
  },
  {
    key: "orders",
    title: "订单管理",
    description: "课程、咨询和会员订单聚合、状态动作和异常审计。",
    href: "/admin/orders",
    icon: ClipboardList,
    permission: ORDER_ADMIN_PERMISSIONS.read,
    status: "available",
    group: "business",
    milestone: "M4-B",
  },
  {
    key: "transactions",
    title: "交易退款",
    description: "支付/退款流水、回调状态和关联订单追踪。",
    href: "/admin/transactions",
    icon: CreditCard,
    permission: TRANSACTION_ADMIN_PERMISSIONS.read,
    status: "available",
    group: "business",
    milestone: "M5-A",
  },
  {
    key: "finance",
    title: "财务管理",
    description: "收入、退款、净收款和异常金额只读口径。",
    href: "/admin/finance",
    icon: BadgeDollarSign,
    permission: FINANCE_ADMIN_PERMISSIONS.read,
    status: "available",
    group: "governance",
    milestone: "M6-A",
  },
  {
    key: "risk",
    title: "风险复核",
    description: "高风险测评、咨询前信息和人工处理记录。",
    href: "/admin/risk",
    icon: AlertTriangle,
    permission: "admin:manage",
    status: "planned",
    group: "governance",
    milestone: "M8",
  },
  {
    key: "audit",
    title: "审计中心",
    description: "跨模块操作日志、对象追踪和导出基础。",
    href: "/admin/audit",
    icon: FileClock,
    permission: "admin:manage",
    status: "planned",
    group: "governance",
    milestone: "M9",
  },
] as const satisfies readonly AdminNavigationItem[];

export function getAdminAccessState(
  user: Pick<UserProfile, "roles"> | null | undefined,
  isAuthSyncing: boolean
): AdminAccessState {
  if (isAuthSyncing) return "syncing";
  if (!user) return "anonymous";
  return adminNavigationItems.some(item => userCan(user, item.permission))
    ? "authorized"
    : "forbidden";
}

export function canAccessAdmin(
  user: Pick<UserProfile, "roles"> | null | undefined
) {
  return getAdminAccessState(user, false) === "authorized";
}

export function getVisibleAdminNavigationItems(
  user: Pick<UserProfile, "roles"> | null | undefined
) {
  if (!user || !canAccessAdmin(user)) return [];

  return adminNavigationItems.filter(item => userCan(user, item.permission));
}

export function getAvailableAdminNavigationItems(
  user: Pick<UserProfile, "roles"> | null | undefined
) {
  return getVisibleAdminNavigationItems(user).filter(
    item => item.status === "available"
  );
}

export function getPlannedAdminNavigationItems(
  user: Pick<UserProfile, "roles"> | null | undefined
) {
  return getVisibleAdminNavigationItems(user).filter(
    item => item.status === "planned"
  );
}

export function isAdminNavigationItemActive(
  item: Pick<AdminNavigationItem, "href">,
  pathname: string
) {
  if (item.href === "/admin") return pathname === "/admin";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function findAdminNavigationItem(pathname: string) {
  return adminNavigationItems.find(item =>
    isAdminNavigationItemActive(item, pathname)
  );
}

export const adminGroupLabels = {
  overview: "总览",
  business: "业务运营",
  governance: "治理与财务",
} satisfies Record<AdminModuleGroup, string>;

export const adminShellPrinciples = [
  "共享契约先行",
  "服务端状态机",
  "权限与审计内建",
  "小步交付可升级",
];

export const AdminShellIcon = ShieldCheck;
