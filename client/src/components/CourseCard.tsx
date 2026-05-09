import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Clock,
  Copy,
  Heart,
  MessageCircle,
  Share2,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import type { Course } from "@/features/courses";

interface CourseCardProps {
  course: Course;
  index: number;
  isFavorited?: boolean;
  onToggleFavorite?: (courseId: number) => void;
}

const typeToneMap: Record<string, string> = {
  直播: "bg-[#F4E5DE] text-[#A65F48]",
  录播: "bg-[#E6EDDF] text-[#4E7366]",
  专栏: "bg-[#EFE7D8] text-[#8C6E4A]",
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

export default function CourseCard({
  course,
  index,
  isFavorited = false,
  onToggleFavorite,
}: CourseCardProps) {
  const [, navigate] = useLocation();
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [heartAnimating, setHeartAnimating] = useState(false);
  const [countdown, setCountdown] = useState(() =>
    course.discount?.endsAt ? getCountdown(course.discount.endsAt) : ""
  );

  useEffect(() => {
    if (!course.discount?.endsAt) return;
    const timer = setInterval(() => {
      setCountdown(getCountdown(course.discount!.endsAt));
    }, 60000);
    return () => clearInterval(timer);
  }, [course.discount?.endsAt]);

  const handleClick = () => {
    navigate(`/courses/${course.id}`);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHeartAnimating(true);
    setTimeout(() => setHeartAnimating(false), 520);
    onToggleFavorite?.(course.id);
    toast(isFavorited ? "已取消收藏" : "已收藏课程", {
      description: isFavorited
        ? `「${course.title}」已从收藏夹移除`
        : `「${course.title}」已加入收藏夹`,
    });
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSharePopup(true);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareText = `【红博士心理小讲堂】${course.title} - ${course.teacher} | ${
      course.isFree ? "免费" : `¥${course.price}`
    }`;
    navigator.clipboard.writeText(shareText).finally(() => {
      toast("分享内容已复制", {
        description: "可粘贴到微信或聊天窗口发送给好友",
      });
    });
    setShowSharePopup(false);
  };

  const handleShareToFriend = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareText = `推荐一门心理成长课程：「${course.title}」— ${course.teacher}`;
    navigator.clipboard.writeText(shareText).catch(() => {});
    toast("分享给好友", {
      description: "课程信息已复制，打开微信粘贴发送",
    });
    setShowSharePopup(false);
  };

  const handleCouponClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast("优惠券已领取", {
      description: `「${course.coupon!.label}」已放入您的账户，下单时自动抵扣`,
    });
  };

  const discountActive = course.discount && countdown !== "已结束";

  return (
    <div
      onClick={handleClick}
      className="course-card group relative cursor-pointer overflow-hidden rounded-[26px] border border-[#E4DCCF] bg-[#FFFDF8] transition"
      style={{
        animationDelay: `${index * 48}ms`,
        animation: "courseFadeIn 0.45s ease-out both",
      }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#EEE6DB]">
        <img
          src={course.coverUrl}
          alt={course.title}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E332D]/72 via-transparent to-transparent opacity-70" />

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              typeToneMap[course.type] || "bg-[#E6EDDF] text-[#4E7366]"
            }`}
          >
            {course.type}
          </span>
          {course.isVip && (
            <span className="rounded-full bg-[#EFE7D8] px-2.5 py-1 text-[11px] font-semibold text-[#8C6E4A]">
              会员
            </span>
          )}
          {course.isFree && (
            <span className="rounded-full bg-[#DDE8D9] px-2.5 py-1 text-[11px] font-semibold text-[#41675A]">
              免费
            </span>
          )}
        </div>

        <div className="absolute right-3 top-3 flex gap-2 opacity-0 transition duration-300 group-hover:opacity-100">
          <button
            onClick={handleFavorite}
            className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur transition ${
              isFavorited
                ? "bg-[#B86F56] text-white"
                : "bg-white/82 text-[#5F6B64] hover:text-[#B86F56]"
            }`}
            title={isFavorited ? "取消收藏" : "收藏课程"}
          >
            <Heart
              className={`h-4 w-4 transition ${
                heartAnimating ? "scale-125" : "scale-100"
              } ${isFavorited ? "fill-current" : ""}`}
            />
          </button>
          <button
            onClick={handleShare}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/82 text-[#5F6B64] backdrop-blur transition hover:text-[#41675A]"
            title="分享课程"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-1.5 text-xs text-white/82">
            <Users className="h-3.5 w-3.5" />
            <span>{formatLearners(course.learners)} 人学习</span>
          </div>
          {discountActive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/16 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
              <Clock className="h-3 w-3" />
              {countdown}
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-[#6F8F83]">
          <BookOpen className="h-3.5 w-3.5" />
          {course.category}
        </div>

        <h3 className="mt-3 min-h-[3rem] text-base font-semibold leading-snug text-[#243B35] transition group-hover:text-[#5F7F73]">
          {course.title}
        </h3>

        <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[#7B817C]">
          <span className="truncate">{course.teacher}</span>
          {isFavorited && <Heart className="h-4 w-4 shrink-0 fill-current text-[#B86F56]" />}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {course.coupon && (
            <button
              onClick={handleCouponClick}
              className="inline-flex items-center gap-1 rounded-full border border-[#D8B9A9] px-2.5 py-1 text-[11px] font-semibold text-[#A65F48] transition hover:bg-[#F8E8E2]"
            >
              <Ticket className="h-3 w-3" />
              {course.coupon.label}
            </button>
          )}
          {course.discount && discountActive && (
            <span className="rounded-full bg-[#F4E5DE] px-2.5 py-1 text-[11px] font-semibold text-[#A65F48]">
              {course.discount.label}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-end justify-between border-t border-[#EFE6DA] pt-4">
          <div>
            <p className="text-[11px] text-[#9AA19B]">适合自学与陪伴练习</p>
            <div className="mt-1 flex items-baseline gap-2">
              {course.isFree ? (
                <span className="text-lg font-semibold text-[#41675A]">免费</span>
              ) : (
                <>
                  <span className="text-lg font-semibold text-[#A65F48]">
                    ¥{course.price.toFixed(1)}
                  </span>
                  {course.originalPrice > course.price && (
                    <span className="text-xs text-[#B6B4AD] line-through">
                      ¥{course.originalPrice.toFixed(1)}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#E6EDDF] text-[#41675A] transition group-hover:bg-[#243B35] group-hover:text-white">
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>

      {showSharePopup && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-[#1E332D]/62 p-4 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            setShowSharePopup(false);
          }}
        >
          <div
            className="share-popup-enter w-full max-w-[292px] rounded-3xl bg-[#FFFDF8] p-4 shadow-2xl shadow-black/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[#243B35]">分享课程</h4>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSharePopup(false);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F4EFE6] text-[#7B817C] transition hover:text-[#243B35]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#F4EFE6] p-3">
              <img
                src={course.coverUrl}
                alt=""
                className="h-12 w-16 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0">
                <p className="line-clamp-1 text-xs font-semibold text-[#243B35]">
                  {course.title}
                </p>
                <p className="mt-1 text-[11px] text-[#8A918B]">{course.teacher}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={handleShareToFriend}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#E6EDDF] px-3 py-3 text-xs font-semibold text-[#41675A] transition hover:bg-[#DDE8D9]"
              >
                <MessageCircle className="h-4 w-4" />
                微信好友
              </button>
              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#243B35] px-3 py-3 text-xs font-semibold text-white transition hover:bg-[#315047]"
              >
                <Copy className="h-4 w-4" />
                复制内容
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .course-card {
          box-shadow: 0 1px 2px rgba(36, 59, 53, 0.04);
        }
        .course-card:hover {
          transform: translateY(-4px);
          border-color: rgba(111, 143, 131, 0.42);
          box-shadow: 0 18px 34px rgba(36, 59, 53, 0.1);
        }
        @keyframes courseFadeIn {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .share-popup-enter {
          animation: sharePopupIn 0.24s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes sharePopupIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
