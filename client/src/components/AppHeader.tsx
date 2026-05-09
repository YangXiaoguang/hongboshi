/*
 * AppHeader - 全局顶部导航栏 v2
 * 「知性蓝调」设计: 深海蓝 (#1B365D) 背景，底部1px蓝色渐变线
 * 集成: 登录状态管理，未登录显示登录按钮，已登录显示头像+下拉菜单
 */

import { useState, useRef, useEffect } from "react";
import { Bell, User, Menu, X, LogOut, Heart, BookOpen, Settings, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "首页", href: "/", active: false },
  { label: "课程中心", href: "/courses", active: true },
  { label: "名师专栏", href: "/experts", active: false },
  { label: "学习路径", href: "/paths", active: false },
  { label: "关于我们", href: "/about", active: false },
];

export default function AppHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, isLoggedIn, openLoginModal, logout } = useAuth();

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  const handleNavClick = (label: string) => {
    if (label !== "课程中心") {
      toast("功能开发中", { description: `「${label}」页面即将上线，敬请期待` });
    }
  };

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    toast("已退出登录", { description: "期待您再次光临", icon: "👋" });
  };

  const userMenuItems = [
    { icon: BookOpen, label: "我的课程", onClick: () => toast("我的课程", { description: "功能即将上线" }) },
    { icon: Heart, label: "我的收藏", onClick: () => toast("我的收藏", { description: "功能即将上线" }) },
    { icon: Settings, label: "账号设置", onClick: () => toast("账号设置", { description: "功能即将上线" }) },
  ];

  // Generate avatar initials
  const getAvatarText = () => {
    if (!user) return "";
    if (user.loginMethod === "wechat") return user.nickname.charAt(0);
    return user.nickname.slice(-2, -1) || "用";
  };

  return (
    <header className="sticky top-0 z-50">
      {/* Main nav bar */}
      <div
        className="w-full"
        style={{ backgroundColor: "#1B365D" }}
      >
        <div className="max-w-[1200px] mx-auto px-4 lg:px-6 flex items-center justify-between h-[60px]">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: "#4A90D9" }}
            >
              红
            </div>
            <span className="text-white font-semibold text-base tracking-wide hidden sm:inline">
              红博士心理小讲堂
            </span>
            <span className="text-white font-semibold text-sm sm:hidden">
              红博士
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.label)}
                className={`px-4 py-2 text-sm rounded-md transition-all duration-200 ${
                  item.active
                    ? "text-white bg-white/15 font-medium"
                    : "text-white/70 hover:text-white hover:bg-white/8"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <button
              className="relative p-2 text-white/70 hover:text-white transition-colors"
              onClick={() => {
                if (!isLoggedIn) {
                  openLoginModal();
                  return;
                }
                toast("消息中心", { description: "暂无新消息" });
              }}
            >
              <Bell className="w-5 h-5" />
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ backgroundColor: "#E8553A" }}
              />
            </button>

            {/* User area */}
            {isLoggedIn && user ? (
              /* Logged in: avatar + dropdown */
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200"
                >
                  {/* Avatar */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{
                      background: user.loginMethod === "wechat"
                        ? "linear-gradient(135deg, #52B788, #2D6A4F)"
                        : "linear-gradient(135deg, #4A90D9, #1B365D)",
                    }}
                  >
                    {getAvatarText()}
                  </div>
                  <span className="text-white/90 text-sm hidden sm:inline max-w-[100px] truncate">
                    {user.nickname}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-white/50 transition-transform duration-200 hidden sm:block ${
                      userMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden user-menu-enter z-50">
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-gray-50">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                          style={{
                            background: user.loginMethod === "wechat"
                              ? "linear-gradient(135deg, #52B788, #2D6A4F)"
                              : "linear-gradient(135deg, #4A90D9, #1B365D)",
                          }}
                        >
                          {getAvatarText()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {user.nickname}
                          </p>
                          <p className="text-[11px] text-gray-400 flex items-center gap-1">
                            {user.loginMethod === "wechat" ? (
                              <>
                                <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current text-green-500">
                                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348z" />
                                </svg>
                                微信登录
                              </>
                            ) : (
                              <>
                                <User className="w-3 h-3" />
                                手机号登录
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                      {userMenuItems.map((item) => (
                        <button
                          key={item.label}
                          onClick={() => {
                            setUserMenuOpen(false);
                            item.onClick();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors"
                        >
                          <item.icon className="w-4 h-4 text-gray-400" />
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-50 py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        退出登录
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Not logged in: login button */
              <button
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                onClick={openLoginModal}
              >
                <User className="w-4 h-4 text-white/80" />
                <span className="text-white/80 text-sm hidden sm:inline">登录</span>
              </button>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 text-white/70 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom gradient line - brand signature */}
      <div
        className="h-[2px] w-full"
        style={{
          background: "linear-gradient(90deg, #1B365D 0%, #4A90D9 50%, #1B365D 100%)",
        }}
      />

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div
          className="md:hidden border-b border-white/10"
          style={{ backgroundColor: "#1B365D" }}
        >
          <nav className="max-w-[1200px] mx-auto px-4 py-3 flex flex-col gap-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  handleNavClick(item.label);
                  setMobileMenuOpen(false);
                }}
                className={`px-4 py-2.5 text-sm rounded-md text-left transition-all ${
                  item.active
                    ? "text-white bg-white/15 font-medium"
                    : "text-white/70 hover:text-white hover:bg-white/8"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Animations */}
      <style>{`
        .user-menu-enter {
          animation: userMenuIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes userMenuIn {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.96);
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
