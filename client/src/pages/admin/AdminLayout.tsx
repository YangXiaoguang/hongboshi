import { motion } from "framer-motion";
import {
  ChevronRight,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { type ElementType, type ReactNode } from "react";
import { useLocation } from "wouter";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import {
  adminGroupLabels,
  AdminShellIcon,
  getAdminAccessState,
  getVisibleAdminNavigationItems,
  isAdminNavigationItemActive,
  type AdminModuleGroup,
} from "@/features/admin/adminNavigation";

const adminGroups: AdminModuleGroup[] = ["overview", "business", "governance"];

function AccessPanel({
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
    <div className="min-h-screen bg-[#F8F3EA]">
      <AppHeader />
      <div className="mx-auto flex min-h-[calc(100svh-62px)] max-w-[680px] flex-col items-center justify-center px-5 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E5ECE1] text-[#41675A]">
          <Icon className="h-5 w-5" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-[#243B35]">{title}</h1>
        <p className="mt-3 max-w-[460px] text-sm leading-6 text-[#6F7771]">
          {description}
        </p>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
}

function statusLabel(status: "available" | "planned") {
  return status === "available" ? "可用" : "规划";
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { user, isAuthSyncing, openLoginModal } = useAuth();
  const accessState = getAdminAccessState(user, isAuthSyncing);
  const visibleItems = getVisibleAdminNavigationItems(user);

  if (accessState === "syncing") {
    return (
      <AccessPanel
        icon={Loader2}
        title="正在同步后台权限"
        description="系统正在确认当前账号的运营权限和会话状态。"
      />
    );
  }

  if (accessState === "anonymous") {
    return (
      <AccessPanel
        icon={LockKeyhole}
        title="登录后进入运营后台"
        description="课程商品、用户、订单、交易、财务和风险信息只对运营与管理员账号开放。"
        action={
          <button
            onClick={openLoginModal}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047]"
          >
            <UserRound className="h-4 w-4" />
            登录
          </button>
        }
      />
    );
  }

  if (accessState === "forbidden") {
    return (
      <AccessPanel
        icon={ShieldCheck}
        title="当前账号暂无后台权限"
        description="请使用运营或管理员账号进入。咨询师可继续在咨询师工作台处理分配预约。"
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F3EA] text-[#243B35]">
      <AppHeader />
      <div className="mx-auto flex w-full max-w-[1440px] gap-5 px-4 py-4 lg:px-6 lg:py-6">
        <motion.aside
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="hidden w-[268px] shrink-0 lg:block"
        >
          <nav className="sticky top-[86px] overflow-hidden rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] shadow-sm shadow-[#243B35]/5">
            <div className="border-b border-[#E8DED0] px-4 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E5ECE1] text-[#41675A]">
                  <AdminShellIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">运营管理后台</p>
                  <p className="mt-0.5 truncate text-xs text-[#8A8176]">
                    {user?.nickname}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-2 py-3">
              {adminGroups.map(group => {
                const groupItems = visibleItems.filter(
                  item => item.group === group
                );
                if (!groupItems.length) return null;

                return (
                  <div key={group} className="mb-3 last:mb-0">
                    <p className="px-2 pb-1 text-[11px] font-semibold text-[#9A8F82]">
                      {adminGroupLabels[group]}
                    </p>
                    <div className="space-y-1">
                      {groupItems.map(item => {
                        const Icon = item.icon;
                        const isActive = isAdminNavigationItemActive(
                          item,
                          location
                        );
                        const isAvailable = item.status === "available";

                        return (
                          <button
                            key={item.key}
                            onClick={() => {
                              if (isAvailable) navigate(item.href);
                            }}
                            disabled={!isAvailable}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                              isActive
                                ? "bg-[#E6EDDF] text-[#243B35]"
                                : isAvailable
                                  ? "text-[#5F6B64] hover:bg-[#F5EFE6] hover:text-[#243B35]"
                                  : "cursor-not-allowed text-[#AAA197]"
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="min-w-0 flex-1 truncate font-medium">
                              {item.title}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                isAvailable
                                  ? "bg-white/80 text-[#527266]"
                                  : "bg-[#F1E8DC] text-[#9A8F82]"
                              }`}
                            >
                              {statusLabel(item.status)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </nav>
        </motion.aside>

        <div className="min-w-0 flex-1">
          <nav className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {visibleItems.map(item => {
              const Icon = item.icon;
              const isActive = isAdminNavigationItemActive(item, location);
              const isAvailable = item.status === "available";

              return (
                <button
                  key={item.key}
                  onClick={() => {
                    if (isAvailable) navigate(item.href);
                  }}
                  disabled={!isAvailable}
                  className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${
                    isActive
                      ? "bg-[#243B35] text-white"
                      : isAvailable
                        ? "bg-[#FFFDF8] text-[#5F6B64]"
                        : "bg-[#F1E8DC] text-[#9A8F82]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </button>
              );
            })}
          </nav>

          <motion.main
            key={location}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="min-w-0"
          >
            <div className="mb-4 hidden items-center gap-2 text-xs font-semibold text-[#8A8176] lg:flex">
              <button
                onClick={() => navigate("/admin")}
                className="transition hover:text-[#243B35]"
              >
                运营后台
              </button>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-[#53675D]">
                {visibleItems.find(item =>
                  isAdminNavigationItemActive(item, location)
                )?.title ?? "模块"}
              </span>
            </div>
            {children}
          </motion.main>
        </div>
      </div>
    </div>
  );
}
