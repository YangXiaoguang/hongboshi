import { useEffect, useRef, useState } from "react";
import {
  Bell,
  BookOpen,
  ChevronDown,
  ClipboardList,
  Heart,
  LogOut,
  Menu,
  Settings,
  SlidersHorizontal,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "首页", href: "/" },
  { label: "咨询服务", href: "/consulting" },
  { label: "心理课程", href: "/" },
  { label: "成长测评", href: "/assessment" },
  { label: "关于我们", href: "/about" },
];

export default function AppHeader() {
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, isLoggedIn, openLoginModal, logout } = useAuth();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  const isNavActive = (label: string) => {
    if (label === "首页") return location === "/";
    if (label === "咨询服务") return location.startsWith("/consulting");
    if (label === "心理课程") return location.startsWith("/courses");
    if (label === "成长测评") return location.startsWith("/assessment");
    return false;
  };

  const handleNavClick = (item: (typeof navItems)[number]) => {
    if (
      item.href === "/" ||
      item.href === "/assessment" ||
      item.href === "/consulting"
    ) {
      navigate(item.href);
      return;
    }

    toast("功能开发中", { description: `「${item.label}」页面即将上线` });
  };

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    toast("已退出登录", { description: "期待您再次光临" });
  };

  const canUseCounselorWorkbench = Boolean(
    user?.roles.some(role => ["counselor", "operator", "admin"].includes(role))
  );
  const canManageCounselingOperations = Boolean(
    user?.roles.some(role => ["operator", "admin"].includes(role))
  );

  const userMenuItems = [
    {
      icon: BookOpen,
      label: "成长空间",
      onClick: () => navigate("/me/courses"),
    },
    ...(canUseCounselorWorkbench
      ? [
          {
            icon: ClipboardList,
            label: "咨询师工作台",
            onClick: () => navigate("/counselor/workbench"),
          },
        ]
      : []),
    ...(canManageCounselingOperations
      ? [
          {
            icon: SlidersHorizontal,
            label: "咨询运营配置",
            onClick: () => navigate("/admin/counseling"),
          },
        ]
      : []),
    {
      icon: Heart,
      label: "我的收藏",
      onClick: () => navigate("/me/courses"),
    },
    {
      icon: Settings,
      label: "账号设置",
      onClick: () => toast("账号设置", { description: "功能即将上线" }),
    },
  ];

  const getAvatarText = () => {
    if (!user) return "";
    return user.nickname.trim().charAt(0) || "用";
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#E8DED0]/80 bg-[#F9F5EE]/86 backdrop-blur-xl">
      <div className="mx-auto flex h-[62px] max-w-[1280px] items-center justify-between px-4 lg:px-8">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-3"
          aria-label="红博士心理小讲堂首页"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#243B35] text-sm font-semibold text-[#F4EBDD]">
            红
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-semibold text-[#243B35]">
              红博士心理小讲堂
            </span>
            <span className="block text-[11px] text-[#7B817C]">
              心理咨询与成长陪伴
            </span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map(item => (
            <button
              key={item.label}
              onClick={() => handleNavClick(item)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                isNavActive(item.label)
                  ? "bg-[#E6EDDF] text-[#243B35]"
                  : "text-[#68736D] hover:bg-white/70 hover:text-[#243B35]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#6D746F] transition hover:bg-white/70 hover:text-[#243B35]"
            onClick={() => {
              if (!isLoggedIn) {
                openLoginModal();
                return;
              }
              toast("消息中心", { description: "暂无新消息" });
            }}
            aria-label="消息中心"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#B86F56]" />
          </button>

          {isLoggedIn && user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-full bg-white/70 py-1 pl-1 pr-3 text-[#243B35] shadow-sm shadow-[#243B35]/5 transition hover:bg-white"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6F8F83] text-xs font-semibold text-white">
                  {getAvatarText()}
                </span>
                <span className="hidden max-w-[112px] truncate text-sm font-medium sm:inline">
                  {user.nickname}
                </span>
                <ChevronDown
                  className={`hidden h-3.5 w-3.5 text-[#7B817C] transition sm:block ${
                    userMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {userMenuOpen && (
                <div className="user-menu-enter absolute right-0 top-full z-50 mt-3 w-56 overflow-hidden rounded-2xl border border-[#E8DED0] bg-[#FFFCF7] shadow-xl shadow-[#243B35]/10">
                  <div className="border-b border-[#EFE6DA] px-4 py-3">
                    <p className="truncate text-sm font-semibold text-[#243B35]">
                      {user.nickname}
                    </p>
                    <p className="mt-1 text-xs text-[#8A918B]">
                      {user.loginMethod === "wechat"
                        ? "微信登录"
                        : "手机号登录"}
                    </p>
                  </div>

                  <div className="py-1">
                    {userMenuItems.map(item => (
                      <button
                        key={item.label}
                        onClick={() => {
                          setUserMenuOpen(false);
                          item.onClick();
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#5F6B64] transition hover:bg-[#F4EFE6] hover:text-[#243B35]"
                      >
                        <item.icon className="h-4 w-4 text-[#8CA096]" />
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-[#EFE6DA] py-1">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#B86F56] transition hover:bg-[#F8E8E2]"
                    >
                      <LogOut className="h-4 w-4" />
                      退出登录
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              className="hidden h-10 items-center gap-2 rounded-full bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] sm:flex"
              onClick={openLoginModal}
            >
              <User className="h-4 w-4" />
              登录
            </button>
          )}

          <button
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#6D746F] transition hover:bg-white/70 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="打开导航"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-[#E8DED0] bg-[#FFFCF7] md:hidden">
          <nav className="mx-auto flex max-w-[1280px] flex-col gap-1 px-4 py-3">
            {navItems.map(item => (
              <button
                key={item.label}
                onClick={() => {
                  handleNavClick(item);
                  setMobileMenuOpen(false);
                }}
                className={`rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                  isNavActive(item.label)
                    ? "bg-[#E6EDDF] text-[#243B35]"
                    : "text-[#68736D] hover:bg-[#F4EFE6]"
                }`}
              >
                {item.label}
              </button>
            ))}
            {!isLoggedIn && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openLoginModal();
                }}
                className="mt-2 rounded-xl bg-[#243B35] px-4 py-3 text-left text-sm font-semibold text-white"
              >
                登录 / 注册
              </button>
            )}
          </nav>
        </div>
      )}

      <style>{`
        .user-menu-enter {
          animation: userMenuIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes userMenuIn {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </header>
  );
}
