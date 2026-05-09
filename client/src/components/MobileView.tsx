/*
 * MobileView - 微信小程序端（类App）课程发现页面 v3
 * 「知性蓝调」设计: 适配移动端的紧凑布局
 * 功能: 收藏、分享到微信、优惠券标签、限时折扣标签
 * 包含: 顶部搜索栏、分类Tab、课程列表、加载更多
 */

import { useState, useEffect } from "react";
import { Search, Bell, Users, Heart, Share2, X, Copy, Clock, Ticket, User, Smartphone, MessageSquare, Shield, Loader2, LogOut, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  categories,
  courseTypes,
  searchCourses,
  type Course,
  type CourseCategoryFilter,
  type CourseTypeFilter,
} from "@/features/courses";

const typeColorMap: Record<string, string> = {
  直播: "#B86F56",
  录播: "#6F8F83",
  专栏: "#7B9E87",
};

function formatLearners(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function getCountdown(endsAt: string): string {
  const now = new Date().getTime();
  const end = new Date(endsAt).getTime();
  const diff = end - now;
  if (diff <= 0) return "已结束";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `剩${days}天${hours}时`;
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `剩${hours}时${mins}分`;
}

interface MobileViewProps {
  courses: Course[];
  selectedCategory: CourseCategoryFilter;
  selectedType: CourseTypeFilter;
  onCategoryChange: (cat: CourseCategoryFilter) => void;
  onTypeChange: (type: CourseTypeFilter) => void;
  favorites: Set<number>;
  onToggleFavorite: (courseId: number) => void;
}

export default function MobileView({
  courses,
  selectedCategory,
  selectedType,
  onCategoryChange,
  onTypeChange,
  favorites,
  onToggleFavorite,
}: MobileViewProps) {
  const { user, isLoggedIn, loginWithPhone, loginWithWechat, logout } = useAuth();
  const [visibleCount, setVisibleCount] = useState(6);
  const [searchValue, setSearchValue] = useState("");
  const [shareTarget, setShareTarget] = useState<Course | null>(null);
  const [, setTick] = useState(0);
  const [showMobileLogin, setShowMobileLogin] = useState(false);
  const [mobileLoginTab, setMobileLoginTab] = useState<"phone" | "wechat">("phone");
  const [mobilePhone, setMobilePhone] = useState("");
  const [mobileCode, setMobileCode] = useState("");
  const [mobileCountdown, setMobileCountdown] = useState(0);
  const [mobileAgreed, setMobileAgreed] = useState(false);
  const [mobileSubmitting, setMobileSubmitting] = useState(false);
  const [showMobileProfile, setShowMobileProfile] = useState(false);

  // Update countdown every minute
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  // Mobile login countdown
  useEffect(() => {
    if (mobileCountdown > 0) {
      const t = setInterval(() => setMobileCountdown((p) => (p <= 1 ? 0 : p - 1)), 1000);
      return () => clearInterval(t);
    }
  }, [mobileCountdown > 0]);

  const handleMobileSendCode = () => {
    if (!/^1[3-9]\d{9}$/.test(mobilePhone)) {
      toast("请输入正确的手机号", { icon: "⚠️" });
      return;
    }
    setMobileCountdown(60);
    toast("验证码已发送", { description: `已发送至 ${mobilePhone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")}`, icon: "📱" });
  };

  const handleMobilePhoneLogin = async () => {
    if (!/^1[3-9]\d{9}$/.test(mobilePhone)) { toast("请输入正确的手机号", { icon: "⚠️" }); return; }
    if (!/^\d{6}$/.test(mobileCode)) { toast("请输入6位验证码", { icon: "⚠️" }); return; }
    if (!mobileAgreed) { toast("请先同意用户协议", { icon: "📋" }); return; }
    setMobileSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    loginWithPhone(mobilePhone);
    setMobileSubmitting(false);
    setShowMobileLogin(false);
    toast("登录成功", { description: "欢迎来到红博士心理小讲堂", icon: "🎉" });
  };

  const handleMobileWechatLogin = async () => {
    if (!mobileAgreed) { toast("请先同意用户协议", { icon: "📋" }); return; }
    setMobileSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    loginWithWechat();
    setMobileSubmitting(false);
    setShowMobileLogin(false);
    toast("微信登录成功", { description: "欢迎来到红博士心理小讲堂", icon: "🎉" });
  };

  const handleMobileLogout = () => {
    setShowMobileProfile(false);
    logout();
    toast("已退出登录", { icon: "👋" });
  };

  const filteredCourses = searchCourses(courses, searchValue);

  const visibleCourses = filteredCourses.slice(0, visibleCount);

  const handleFavorite = (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    onToggleFavorite(course.id);
    const isFav = favorites.has(course.id);
    toast(isFav ? "已取消收藏" : "已收藏", {
      description: isFav
        ? `「${course.title}」已移除`
        : `「${course.title}」已加入收藏`,
      icon: isFav ? "💔" : "❤️",
    });
  };

  const handleShare = (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    setShareTarget(course);
  };

  const handleShareToFriend = () => {
    if (!shareTarget) return;
    const text = `推荐一门好课：「${shareTarget.title}」— ${shareTarget.teacher}`;
    navigator.clipboard.writeText(text).catch(() => {});
    toast("分享给好友", {
      description: "课程信息已复制，打开微信发送",
      icon: "💬",
    });
    setShareTarget(null);
  };

  const handleShareToMoments = () => {
    toast("分享到朋友圈", {
      description: "请截图或复制链接后分享",
      icon: "🔗",
    });
    setShareTarget(null);
  };

  const handleCopyLink = () => {
    if (!shareTarget) return;
    const text = `【红博士心理小讲堂】${shareTarget.title} - ${shareTarget.teacher} | ${shareTarget.isFree ? "免费" : `¥${shareTarget.price}`}`;
    navigator.clipboard.writeText(text).catch(() => {});
    toast("链接已复制", {
      description: "可粘贴到微信分享",
      icon: "✅",
    });
    setShareTarget(null);
  };

  const handleCouponClick = (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    toast("优惠券已领取", {
      description: `「${course.coupon!.label}」已放入您的账户`,
      icon: "🎫",
    });
  };

  return (
    <div className="min-h-full relative" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
      {/* Status bar placeholder */}
      <div className="h-[44px]" style={{ backgroundColor: "#243B35" }} />

      {/* Mini program header */}
      <div
        className="px-4 pb-3 pt-1"
        style={{ backgroundColor: "#243B35" }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-white font-semibold text-[15px]">红博士心理小讲堂</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!isLoggedIn) { setShowMobileLogin(true); return; }
                toast("消息", { description: "暂无新消息" });
              }}
              className="relative"
            >
              <Bell className="w-[18px] h-[18px] text-white/70" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />
            </button>
            {isLoggedIn && user ? (
              <button
                onClick={() => setShowMobileProfile(true)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                style={{
                  background: user.loginMethod === "wechat"
                    ? "linear-gradient(135deg, #7B9E87, #41675A)"
                    : "linear-gradient(135deg, #6F8F83, #243B35)",
                }}
              >
                {user.nickname.charAt(0)}
              </button>
            ) : (
              <button
                onClick={() => setShowMobileLogin(true)}
                className="px-2 py-0.5 rounded-full bg-white/15 text-white/80 text-[11px]"
              >
                登录
              </button>
            )}
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="搜索感兴趣的课程"
            className="w-full h-[32px] pl-8 pr-3 text-xs rounded-full bg-white/95 text-gray-700 placeholder:text-gray-300 focus:outline-none"
          />
        </div>
      </div>

      {/* Category tabs - horizontal scroll */}
      <div className="bg-white border-b border-gray-100">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-0 px-2 py-2 min-w-max">
            {categories.slice(0, 8).map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`px-3 py-1 text-xs whitespace-nowrap rounded-full mx-0.5 transition-all ${
                  selectedCategory === cat
                    ? "text-white font-medium"
                    : "text-gray-500"
                }`}
                style={
                  selectedCategory === cat
                    ? { backgroundColor: "#6F8F83" }
                    : {}
                }
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Type filter pills */}
      <div className="bg-white px-3 py-2 flex items-center gap-2 border-b border-gray-50">
        <span className="text-[10px] text-gray-400 shrink-0">类型:</span>
        {courseTypes.map((type) => (
          <button
            key={type}
            onClick={() => onTypeChange(type)}
            className={`px-2.5 py-0.5 rounded-full text-[10px] border transition-all ${
              selectedType === type
                ? "text-white border-transparent font-medium"
                : "text-gray-500 border-gray-200"
            }`}
            style={
              selectedType === type
                ? { backgroundColor: "#6F8F83", borderColor: "#6F8F83" }
                : {}
            }
          >
            {type}
          </button>
        ))}
      </div>

      {/* Course list */}
      <div className="px-3 py-3 space-y-3">
        {visibleCourses.map((course) => {
          const isFav = favorites.has(course.id);
          const hasPromo = !course.isFree && (course.discount || course.coupon);
          return (
            <div
              key={course.id}
              onClick={() =>
                toast("课程详情", {
                  description: `即将进入「${course.title}」`,
                })
              }
              className="bg-white rounded-lg overflow-hidden shadow-sm active:scale-[0.98] transition-transform"
            >
              {/* Horizontal card layout */}
              <div className="flex gap-3 p-3">
                {/* Cover */}
                <div className="relative w-[120px] h-[80px] rounded-md overflow-hidden shrink-0 bg-gray-100">
                  <img
                    src={course.coverUrl}
                    alt={course.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Type badge */}
                  <span
                    className="absolute bottom-1 left-1 px-1.5 py-px rounded text-[9px] font-medium text-white"
                    style={{ backgroundColor: typeColorMap[course.type] }}
                  >
                    {course.type}
                  </span>
                  {course.isVip && (
                    <span className="absolute top-1 right-1 px-1 py-px rounded text-[8px] font-bold text-white bg-amber-500">
                      VIP
                    </span>
                  )}
                  {/* Discount badge on cover */}
                  {course.discount && !course.isFree && (
                    <span
                      className="absolute top-0 left-0 px-1.5 py-px text-[8px] font-bold text-white rounded-br-md"
                      style={{ background: "linear-gradient(135deg, #C98B6A, #B86F56)" }}
                    >
                      {course.discount.label}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <h4 className="text-[13px] font-medium text-gray-800 leading-tight line-clamp-2">
                    {course.title}
                  </h4>

                  {/* Promo tags row */}
                  {hasPromo && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {course.coupon && (
                        <button
                          onClick={(e) => handleCouponClick(e, course)}
                          className="inline-flex items-center gap-0.5 px-1 py-px rounded border text-[9px] font-medium active:scale-95 transition-transform"
                          style={{
                            color: "#B86F56",
                            borderColor: "#B86F56",
                            backgroundColor: "rgba(232, 85, 58, 0.05)",
                          }}
                        >
                          <Ticket className="w-2.5 h-2.5" />
                          {course.coupon.label}
                        </button>
                      )}
                      {course.discount && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1 py-px rounded text-[9px] font-medium text-white"
                          style={{ background: "linear-gradient(135deg, #C98B6A, #B86F56)" }}
                        >
                          <Clock className="w-2.5 h-2.5" />
                          {getCountdown(course.discount.endsAt)}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-0.5">
                    <div className="flex items-baseline gap-1.5">
                      {course.isFree ? (
                        <span className="text-xs font-semibold" style={{ color: "#7B9E87" }}>
                          免费
                        </span>
                      ) : (
                        <>
                          <span
                            className="text-sm font-bold tabular-nums"
                            style={{ color: "#B86F56" }}
                          >
                            ¥{course.price}
                          </span>
                          {course.originalPrice > course.price && (
                            <span className="text-[10px] text-gray-300 line-through">
                              ¥{course.originalPrice}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleFavorite(e, course)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                          isFav
                            ? "bg-red-50 text-red-500"
                            : "bg-gray-50 text-gray-300"
                        }`}
                      >
                        <Heart className={`w-3 h-3 ${isFav ? "fill-current" : ""}`} />
                      </button>
                      <button
                        onClick={(e) => handleShare(e, course)}
                        className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 active:bg-green-50 active:text-green-500 transition-colors"
                      >
                        <Share2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Load more */}
        {visibleCount < filteredCourses.length && (
          <button
            onClick={() => setVisibleCount((prev) => prev + 6)}
            className="w-full py-3 text-xs text-gray-400 bg-white rounded-lg shadow-sm active:bg-gray-50 transition-colors"
          >
            加载更多课程
          </button>
        )}

        {filteredCourses.length === 0 && (
          <div className="py-12 text-center">
            <div className="text-3xl mb-2">📚</div>
            <p className="text-xs text-gray-400">暂无匹配课程</p>
          </div>
        )}
      </div>

      {/* Bottom tab bar */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-2 pb-5">
        <div className="flex items-center justify-around">
          {[
            { icon: "🏠", label: "首页", active: false },
            { icon: "📚", label: "课程", active: true },
            { icon: "📖", label: "学习", active: false },
            { icon: "👤", label: "我的", active: false },
          ].map((tab) => (
            <button
              key={tab.label}
              onClick={() => {
                if (tab.label === "我的") {
                  if (isLoggedIn) setShowMobileProfile(true);
                  else setShowMobileLogin(true);
                } else if (!tab.active) {
                  toast("功能开发中", { description: `「${tab.label}」即将上线` });
                }
              }}
              className="flex flex-col items-center gap-0.5"
            >
              <span className="text-lg">{tab.icon}</span>
              <span
                className={`text-[10px] ${
                  tab.active ? "font-medium" : "text-gray-400"
                }`}
                style={tab.active ? { color: "#6F8F83" } : {}}
              >
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* WeChat Share Bottom Sheet */}
      {shareTarget && (
        <div
          className="absolute inset-0 z-50 flex items-end justify-center"
          onClick={() => setShareTarget(null)}
        >
          <div className="absolute inset-0 bg-black/40 mobile-backdrop-enter" />
          <div
            className="relative w-full bg-white rounded-t-2xl p-4 pb-8 mobile-sheet-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-8 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[13px] font-semibold text-gray-800">分享到微信</h4>
              <button
                onClick={() => setShareTarget(null)}
                className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-lg mb-4">
              <img
                src={shareTarget.coverUrl}
                alt=""
                className="w-12 h-8 rounded object-cover shrink-0"
              />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-gray-700 line-clamp-1">{shareTarget.title}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{shareTarget.teacher}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={handleShareToFriend}
                className="flex flex-col items-center gap-2 py-3 rounded-xl active:bg-green-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-white fill-current">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.045c.134 0 .24-.11.24-.245 0-.06-.024-.12-.04-.178l-.325-1.233a.492.492 0 01.177-.554C23.028 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-7.062-6.122zM14.53 13.39c.535 0 .969.44.969.983a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.983.97-.983zm4.844 0c.535 0 .969.44.969.983a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.983.97-.983z" />
                  </svg>
                </div>
                <span className="text-[11px] text-gray-600 font-medium">微信好友</span>
              </button>
              <button
                onClick={handleShareToMoments}
                className="flex flex-col items-center gap-2 py-3 rounded-xl active:bg-green-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center shadow-sm">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-white fill-current">
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 2c1.82 0 3.507.613 4.855 1.644L7.644 16.855A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8zm0 16a7.96 7.96 0 01-4.855-1.644l9.211-9.211A7.96 7.96 0 0120 12c0 4.411-3.589 8-8 8z" />
                  </svg>
                </div>
                <span className="text-[11px] text-gray-600 font-medium">朋友圈</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center gap-2 py-3 rounded-xl active:bg-blue-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: "#6F8F83" }}>
                  <Copy className="w-6 h-6 text-white" />
                </div>
                <span className="text-[11px] text-gray-600 font-medium">复制链接</span>
              </button>
            </div>
            <button
              onClick={() => setShareTarget(null)}
              className="w-full mt-4 py-2.5 text-xs text-gray-500 bg-gray-50 rounded-lg active:bg-gray-100 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Mobile Login Page */}
      {showMobileLogin && (
        <div className="absolute inset-0 z-50 bg-white mobile-sheet-enter" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
          {/* Header */}
          <div className="flex items-center h-11 px-3" style={{ backgroundColor: "#243B35" }}>
            <button onClick={() => setShowMobileLogin(false)} className="text-white/70">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="flex-1 text-center text-white text-sm font-medium">登录 / 注册</span>
            <div className="w-5" />
          </div>

          <div className="px-6 pt-8">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold mb-3" style={{ backgroundColor: "#6F8F83" }}>红</div>
              <h3 className="text-base font-bold" style={{ color: "#243B35" }}>红博士心理小讲堂</h3>
              <p className="text-[11px] text-gray-400 mt-1">登录后享受更多课程权益</p>
            </div>

            {/* Tab switch */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1 mb-6">
              <button
                onClick={() => setMobileLoginTab("phone")}
                className={`flex-1 py-2 rounded-lg text-xs font-medium text-center transition-all ${
                  mobileLoginTab === "phone" ? "bg-white text-gray-800 shadow-sm" : "text-gray-400"
                }`}
              >手机号登录</button>
              <button
                onClick={() => setMobileLoginTab("wechat")}
                className={`flex-1 py-2 rounded-lg text-xs font-medium text-center transition-all ${
                  mobileLoginTab === "wechat" ? "bg-white text-gray-800 shadow-sm" : "text-gray-400"
                }`}
              >微信登录</button>
            </div>

            {mobileLoginTab === "phone" ? (
              <div>
                {/* Phone input */}
                <div className="mb-3">
                  <div className="flex items-center h-11 border border-gray-200 rounded-xl px-3" style={{ backgroundColor: "#FFFDF8" }}>
                    <span className="text-xs text-gray-400 mr-2">+86</span>
                    <span className="w-px h-4 bg-gray-200 mr-2" />
                    <input
                      type="tel"
                      value={mobilePhone}
                      onChange={(e) => setMobilePhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                      placeholder="请输入手机号"
                      className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none"
                    />
                  </div>
                </div>
                {/* Code input */}
                <div className="flex gap-2 mb-5">
                  <div className="flex-1 flex items-center h-11 border border-gray-200 rounded-xl px-3" style={{ backgroundColor: "#FFFDF8" }}>
                    <MessageSquare className="w-3.5 h-3.5 text-gray-300 mr-2" />
                    <input
                      type="text"
                      value={mobileCode}
                      onChange={(e) => setMobileCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="6位验证码"
                      className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleMobileSendCode}
                    disabled={mobileCountdown > 0}
                    className={`shrink-0 h-11 px-3 rounded-xl text-xs font-medium transition-all ${
                      mobileCountdown > 0 ? "bg-gray-100 text-gray-400" : "text-white"
                    }`}
                    style={mobileCountdown > 0 ? {} : { backgroundColor: "#6F8F83" }}
                  >
                    {mobileCountdown > 0 ? `${mobileCountdown}s` : "获取验证码"}
                  </button>
                </div>
                {/* Login button */}
                <button
                  onClick={handleMobilePhoneLogin}
                  disabled={mobileSubmitting}
                  className="w-full h-11 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #243B35, #6F8F83)" }}
                >
                  {mobileSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />登录中...</> : <>登录 / 注册</>}
                </button>
                <p className="text-center text-[10px] text-gray-300 mt-2">未注册的手机号将自动创建账号</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                {/* WeChat one-click login */}
                <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mb-4 shadow-lg">
                  <svg viewBox="0 0 24 24" className="w-10 h-10 text-white fill-current">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.045c.134 0 .24-.11.24-.245 0-.06-.024-.12-.04-.178l-.325-1.233a.492.492 0 01.177-.554C23.028 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-7.062-6.122zM14.53 13.39c.535 0 .969.44.969.983a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.983.97-.983zm4.844 0c.535 0 .969.44.969.983a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.983.97-.983z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600 mb-1">微信一键登录</p>
                <p className="text-[10px] text-gray-300 mb-6">使用微信账号快速登录</p>
                <button
                  onClick={handleMobileWechatLogin}
                  disabled={mobileSubmitting}
                  className="w-full h-11 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
                  style={{ backgroundColor: "#7B9E87" }}
                >
                  {mobileSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />授权中...</> : <>微信授权登录</>}
                </button>
              </div>
            )}

            {/* Agreement */}
            <div className="flex items-start gap-2 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setMobileAgreed(!mobileAgreed)}
                className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                  mobileAgreed ? "border-transparent text-white" : "border-gray-300"
                }`}
                style={mobileAgreed ? { backgroundColor: "#6F8F83" } : {}}
              >
                {mobileAgreed && <svg viewBox="0 0 12 12" className="w-3 h-3 fill-current"><path d="M10.28 2.28a.75.75 0 00-1.06-1.06L4.5 5.94 2.78 4.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l5.25-5.25z" /></svg>}
              </button>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                我已阅读并同意
                <span className="mx-0.5 underline" style={{ color: "#6F8F83" }}>《用户服务协议》</span>
                和
                <span className="mx-0.5 underline" style={{ color: "#6F8F83" }}>《隐私政策》</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Profile Page */}
      {showMobileProfile && isLoggedIn && user && (
        <div className="absolute inset-0 z-50 bg-gray-50 mobile-sheet-enter" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
          {/* Header */}
          <div className="flex items-center h-11 px-3" style={{ backgroundColor: "#243B35" }}>
            <button onClick={() => setShowMobileProfile(false)} className="text-white/70">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="flex-1 text-center text-white text-sm font-medium">个人中心</span>
            <div className="w-5" />
          </div>

          {/* Profile card */}
          <div className="mx-4 mt-4 p-4 bg-white rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold"
                style={{
                  background: user.loginMethod === "wechat"
                    ? "linear-gradient(135deg, #7B9E87, #41675A)"
                    : "linear-gradient(135deg, #6F8F83, #243B35)",
                }}
              >
                {user.nickname.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{user.nickname}</p>
                <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                  {user.loginMethod === "wechat" ? (
                    <><svg viewBox="0 0 24 24" className="w-3 h-3 fill-current text-green-500"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348z" /></svg>微信登录</>
                  ) : (
                    <><Smartphone className="w-3 h-3" />手机号登录</>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="mx-4 mt-3 bg-white rounded-xl shadow-sm overflow-hidden">
            {[
              { icon: "📚", label: "我的课程", count: "3" },
              { icon: "❤️", label: "我的收藏", count: String(favorites.size) },
              { icon: "🎫", label: "我的优惠券", count: "2" },
              { icon: "⚙️", label: "账号设置", count: "" },
            ].map((item, i) => (
              <button
                key={item.label}
                onClick={() => toast(item.label, { description: "功能即将上线" })}
                className={`w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-gray-50 transition-colors ${
                  i > 0 ? "border-t border-gray-50" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-[13px] text-gray-700">{item.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  {item.count && <span className="text-[11px] text-gray-400">{item.count}</span>}
                  <ChevronLeft className="w-3.5 h-3.5 text-gray-300 rotate-180" />
                </div>
              </button>
            ))}
          </div>

          {/* Logout button */}
          <div className="mx-4 mt-3">
            <button
              onClick={handleMobileLogout}
              className="w-full py-3 bg-white rounded-xl text-sm text-red-500 font-medium shadow-sm active:bg-red-50 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>
        </div>
      )}

      {/* Styles */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .mobile-backdrop-enter {
          animation: backdropFadeIn 0.2s ease both;
        }
        .mobile-sheet-enter {
          animation: sheetSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes backdropFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes sheetSlideUp {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
