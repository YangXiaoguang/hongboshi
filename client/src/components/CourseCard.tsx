/*
 * CourseCard - 单个课程卡片（升级版 v3）
 * 「知性蓝调」设计: 轻微阴影、8px圆角、hover上浮+光晕+操作按钮浮现
 * 功能: 收藏、分享到微信、优惠券标签、限时折扣标签、增强hover动效
 * 包含: 封面图、标题、标签、讲师、学习人数、价格、促销标签、操作按钮
 */

import { useState, useEffect } from "react";
import { Users, Heart, Share2, X, Copy, Clock, Ticket } from "lucide-react";
import { toast } from "sonner";
import type { Course } from "@/lib/mockData";

interface CourseCardProps {
  course: Course;
  index: number;
  isFavorited?: boolean;
  onToggleFavorite?: (courseId: number) => void;
}

const typeColorMap: Record<string, string> = {
  直播: "#E8553A",
  录播: "#4A90D9",
  专栏: "#7B9E87",
};

function formatLearners(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

/** Calculate remaining time string from endsAt */
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

export default function CourseCard({
  course,
  index,
  isFavorited = false,
  onToggleFavorite,
}: CourseCardProps) {
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [heartAnimating, setHeartAnimating] = useState(false);
  const [countdown, setCountdown] = useState(() =>
    course.discount?.endsAt ? getCountdown(course.discount.endsAt) : ""
  );

  // Update countdown every minute
  useEffect(() => {
    if (!course.discount?.endsAt) return;
    const timer = setInterval(() => {
      setCountdown(getCountdown(course.discount!.endsAt));
    }, 60000);
    return () => clearInterval(timer);
  }, [course.discount?.endsAt]);

  const handleClick = () => {
    toast("课程详情", {
      description: `即将进入「${course.title}」详情页`,
    });
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHeartAnimating(true);
    setTimeout(() => setHeartAnimating(false), 600);
    onToggleFavorite?.(course.id);
    toast(isFavorited ? "已取消收藏" : "已收藏课程", {
      description: isFavorited
        ? `「${course.title}」已从收藏夹移除`
        : `「${course.title}」已加入收藏夹`,
      icon: isFavorited ? "💔" : "❤️",
    });
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSharePopup(true);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareText = `【红博士心理小讲堂】${course.title} - ${course.teacher} | ${course.isFree ? "免费" : `¥${course.price}`}`;
    navigator.clipboard.writeText(shareText).then(() => {
      toast("链接已复制", {
        description: "可粘贴到微信聊天中分享给好友",
        icon: "✅",
      });
    }).catch(() => {
      toast("复制成功", {
        description: "分享内容已准备好，可粘贴到微信",
        icon: "✅",
      });
    });
    setShowSharePopup(false);
  };

  const handleShareToMoments = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast("分享到朋友圈", {
      description: "请截图或复制链接后分享到微信朋友圈",
      icon: "🔗",
    });
    setShowSharePopup(false);
  };

  const handleShareToFriend = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareText = `推荐一门好课：「${course.title}」— ${course.teacher}`;
    navigator.clipboard.writeText(shareText).catch(() => {});
    toast("分享给好友", {
      description: "课程信息已复制，打开微信粘贴发送给好友",
      icon: "💬",
    });
    setShowSharePopup(false);
  };

  const handleCouponClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast("优惠券已领取", {
      description: `「${course.coupon!.label}」已放入您的账户，下单时自动抵扣`,
      icon: "🎫",
    });
  };

  const hasPromo = !course.isFree && (course.discount || course.coupon);

  return (
    <div
      onClick={handleClick}
      className="course-card group bg-white rounded-lg overflow-hidden border border-gray-100 cursor-pointer relative"
      style={{
        animationDelay: `${index * 50}ms`,
        animation: "fadeInUp 0.4s ease-out both",
      }}
    >
      {/* Cover image area */}
      <div className="relative aspect-video overflow-hidden bg-gray-100">
        <img
          src={course.coverUrl}
          alt={course.title}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          loading="lazy"
        />

        {/* Hover overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Action buttons - appear on hover */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 translate-y-[-8px] group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out z-10">
          <button
            onClick={handleFavorite}
            className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-300 ${
              isFavorited
                ? "bg-red-500/90 text-white shadow-lg shadow-red-500/25"
                : "bg-white/80 text-gray-600 hover:bg-white hover:text-red-500 hover:shadow-md"
            }`}
            title={isFavorited ? "取消收藏" : "收藏课程"}
          >
            <Heart
              className={`w-4 h-4 transition-transform duration-300 ${
                heartAnimating ? "scale-125" : "scale-100"
              } ${isFavorited ? "fill-current" : ""}`}
            />
          </button>
          <button
            onClick={handleShare}
            className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-gray-600 hover:bg-white hover:text-green-600 hover:shadow-md transition-all duration-300"
            title="分享到微信"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Type tag - bottom left */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
          <span
            className="px-2 py-0.5 rounded text-xs font-medium text-white shadow-sm"
            style={{ backgroundColor: typeColorMap[course.type] || "#4A90D9" }}
          >
            {course.type}
          </span>
        </div>

        {/* Discount ribbon - top left diagonal */}
        {course.discount && !course.isFree && (
          <div className="absolute top-0 left-0 z-[5]">
            <div className="discount-ribbon flex items-center gap-1 px-2.5 py-1 text-white text-[10px] font-bold shadow-md">
              <Clock className="w-3 h-3" />
              <span>{course.discount.label}</span>
            </div>
          </div>
        )}

        {/* VIP badge - top right triangle (hidden when action buttons visible) */}
        {course.isVip && (
          <div className="absolute top-0 right-0 group-hover:opacity-0 transition-opacity duration-300">
            <div
              className="w-0 h-0"
              style={{
                borderLeft: "40px solid transparent",
                borderTop: "40px solid #D4A853",
              }}
            />
            <span className="absolute top-[3px] right-[2px] text-[10px] font-bold text-white rotate-45">
              VIP
            </span>
          </div>
        )}

        {/* Free badge */}
        {course.isFree && (
          <div
            className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-semibold text-white"
            style={{ backgroundColor: "#52B788" }}
          >
            免费
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-3.5">
        {/* Title - 2 line clamp */}
        <h3 className="text-sm font-medium text-gray-800 leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-[#4A90D9] transition-colors duration-300">
          {course.title}
        </h3>

        {/* Teacher + learners */}
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-xs text-gray-400">{course.teacher}</span>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Users className="w-3 h-3" />
            <span>{formatLearners(course.learners)}</span>
          </div>
        </div>

        {/* Promo tags area - coupon + countdown */}
        {hasPromo && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {/* Coupon tag */}
            {course.coupon && (
              <button
                onClick={handleCouponClick}
                className="coupon-tag inline-flex items-center gap-0.5 px-1.5 py-[2px] rounded border text-[10px] font-medium transition-all hover:shadow-sm active:scale-95"
                style={{
                  color: "#E8553A",
                  borderColor: "#E8553A",
                  backgroundColor: "rgba(232, 85, 58, 0.05)",
                }}
              >
                <Ticket className="w-3 h-3" />
                {course.coupon.label}
              </button>
            )}
            {/* Countdown tag */}
            {course.discount && countdown !== "已结束" && (
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-[2px] rounded text-[10px] font-medium"
                style={{
                  color: "#fff",
                  background: "linear-gradient(135deg, #FF6B35, #E8553A)",
                }}
              >
                <Clock className="w-2.5 h-2.5" />
                {countdown}
              </span>
            )}
          </div>
        )}

        {/* Price area */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
          <div className="flex items-baseline gap-2">
            {course.isFree ? (
              <span
                className="text-sm font-semibold"
                style={{ color: "#52B788" }}
              >
                免费
              </span>
            ) : (
              <>
                <span
                  className="text-base font-bold tabular-nums"
                  style={{ color: "#E8553A" }}
                >
                  ¥{course.price.toFixed(1)}
                </span>
                {course.originalPrice > course.price && (
                  <span className="text-xs text-gray-300 line-through tabular-nums">
                    ¥{course.originalPrice.toFixed(1)}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Small favorite indicator (always visible if favorited) */}
          {isFavorited && (
            <Heart className="w-3.5 h-3.5 text-red-400 fill-current opacity-60" />
          )}
        </div>
      </div>

      {/* WeChat Share Popup */}
      {showSharePopup && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 rounded-lg backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            setShowSharePopup(false);
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-4 mx-4 w-[calc(100%-2rem)] max-w-[280px] share-popup-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-800">分享到微信</h4>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSharePopup(false);
                }}
                className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-lg mb-3">
              <img
                src={course.coverUrl}
                alt=""
                className="w-12 h-8 rounded object-cover shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-700 line-clamp-1">{course.title}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{course.teacher}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleShareToFriend}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg hover:bg-green-50 transition-colors group/share"
              >
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-sm group-hover/share:shadow-md transition-shadow">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.045c.134 0 .24-.11.24-.245 0-.06-.024-.12-.04-.178l-.325-1.233a.492.492 0 01.177-.554C23.028 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-7.062-6.122zM14.53 13.39c.535 0 .969.44.969.983a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.983.97-.983zm4.844 0c.535 0 .969.44.969.983a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.983.97-.983z" />
                  </svg>
                </div>
                <span className="text-[10px] text-gray-600 font-medium">微信好友</span>
              </button>

              <button
                onClick={handleShareToMoments}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg hover:bg-green-50 transition-colors group/share"
              >
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center shadow-sm group-hover/share:shadow-md transition-shadow">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 2c1.82 0 3.507.613 4.855 1.644L7.644 16.855A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8zm0 16a7.96 7.96 0 01-4.855-1.644l9.211-9.211A7.96 7.96 0 0120 12c0 4.411-3.589 8-8 8z" />
                  </svg>
                </div>
                <span className="text-[10px] text-gray-600 font-medium">朋友圈</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg hover:bg-blue-50 transition-colors group/share"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm group-hover/share:shadow-md transition-shadow" style={{ backgroundColor: "#4A90D9" }}>
                  <Copy className="w-5 h-5 text-white" />
                </div>
                <span className="text-[10px] text-gray-600 font-medium">复制链接</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced hover styles + promo tag styles */}
      <style>{`
        .course-card {
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      border-color 0.3s ease;
          box-shadow: 0 1px 3px rgba(27, 54, 93, 0.06);
        }
        .course-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 28px rgba(27, 54, 93, 0.12),
                      0 4px 10px rgba(74, 144, 217, 0.08);
          border-color: rgba(74, 144, 217, 0.2);
        }
        .course-card:active {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(27, 54, 93, 0.1);
        }
        .discount-ribbon {
          background: linear-gradient(135deg, #FF6B35, #E8553A);
          border-radius: 0 0 8px 0;
          letter-spacing: 0.5px;
        }
        .coupon-tag {
          position: relative;
          overflow: hidden;
        }
        .coupon-tag::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(232, 85, 58, 0.08), transparent);
          animation: couponShimmer 3s ease-in-out infinite;
        }
        @keyframes couponShimmer {
          0%, 100% { left: -100%; }
          50% { left: 100%; }
        }
        .share-popup-enter {
          animation: sharePopupIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes sharePopupIn {
          from {
            opacity: 0;
            transform: scale(0.85) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
