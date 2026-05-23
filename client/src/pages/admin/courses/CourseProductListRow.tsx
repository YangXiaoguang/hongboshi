import { motion } from "framer-motion";
import { ClipboardCheck, Edit3, Eye, EyeOff, Layers3 } from "lucide-react";
import type {
  CourseProductContentQualityResult,
  CourseProductListItem,
  CourseProductReviewAction,
  CourseProductReviewStatus,
  CourseProductStatus,
} from "@shared/domain";
import {
  courseProductReviewActionCopy,
  courseProductReviewCopy,
  courseProductStatusCopy,
} from "./courseProductAdminLabels";
import {
  courseProductReviewActionsForItem,
  courseProductReviewClass,
  courseProductStatusClass,
  formatCourseProductDate,
  formatCourseProductMoney,
  type CourseProductWorkspaceStep,
} from "./courseProductListPresentation";

export function CourseProductListRow({
  item,
  index,
  isMutating,
  contentQuality,
  canEdit,
  canReview,
  canPublish,
  canPrice,
  reviewBlockReason,
  onEditPrice,
  onOpenWorkspace,
  onRequestReviewAction,
  onRequestStatusChange,
}: {
  item: CourseProductListItem;
  index: number;
  isMutating: boolean;
  contentQuality?: CourseProductContentQualityResult;
  canEdit: boolean;
  canReview: boolean;
  canPublish: boolean;
  canPrice: boolean;
  reviewBlockReason?: string;
  onEditPrice: (item: CourseProductListItem) => void;
  onOpenWorkspace: (
    item: CourseProductListItem,
    step?: CourseProductWorkspaceStep
  ) => void;
  onRequestReviewAction: (
    item: CourseProductListItem,
    action: CourseProductReviewAction,
    targetReviewStatus: CourseProductReviewStatus
  ) => void;
  onRequestStatusChange: (
    item: CourseProductListItem,
    targetStatus: CourseProductStatus
  ) => void;
}) {
  const targetStatus =
    item.status === "published" ? "unpublished" : "published";
  const canToggleStatus =
    item.status === "published" ||
    ((item.status === "unpublished" || item.status === "draft") &&
      item.reviewStatus === "approved");
  const StatusIcon = item.status === "published" ? EyeOff : Eye;
  const reviewActions = courseProductReviewActionsForItem(item);
  const hasPublishQueueAction = canReview || canPublish;
  const hasVisibleActions = canEdit || hasPublishQueueAction || canPrice;

  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.025, 0.16) }}
      className="group border-b border-[#E8DED0] last:border-b-0 hover:bg-[#FBF7EF]"
    >
      <td className="px-5 py-4">
        <div className="flex min-w-[320px] items-center gap-3">
          <img
            src={item.coverUrl}
            alt={item.title}
            className="h-12 w-16 shrink-0 rounded-md object-cover ring-1 ring-[#E5DACB]"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#243B35]">
              {item.title}
            </p>
            <p className="mt-1 text-xs text-[#8A8176]">
              ID {item.courseId} ·{" "}
              {item.source === "seed" ? "种子数据" : "运营录入"}
            </p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="min-w-[120px] text-sm text-[#5F6B64]">
          <p className="font-semibold text-[#243B35]">{item.category}</p>
          <p className="mt-1 text-xs text-[#8A8176]">{item.type}</p>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="min-w-[110px] text-sm text-[#5F6B64]">
          <p>{item.instructorName}</p>
          <p className="mt-1 text-xs text-[#8A8176]">
            {item.learners.toLocaleString("zh-CN")} 人学习
          </p>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="min-w-[110px]">
          <p className="text-sm font-semibold text-[#243B35]">
            {formatCourseProductMoney(item)}
          </p>
          {item.price.originalAmount > item.price.amount && (
            <p className="mt-1 text-xs text-[#9A8F82] line-through">
              ¥{item.price.originalAmount}
            </p>
          )}
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="min-w-[112px] space-y-2">
          <span
            className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold ring-1 ${courseProductStatusClass(
              item.status
            )}`}
          >
            {courseProductStatusCopy[item.status]}
          </span>
          <span
            className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold ${courseProductReviewClass(
              item.reviewStatus
            )}`}
          >
            {courseProductReviewCopy[item.reviewStatus]}
          </span>
          {contentQuality && (
            <span
              className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold ${
                contentQuality.ready
                  ? "bg-[#EDF5EF] text-[#41675A]"
                  : "bg-[#FFF0EA] text-[#AD503A]"
              }`}
            >
              {contentQuality.ready
                ? contentQuality.warningCount > 0
                  ? "内容可审"
                  : "内容达标"
                : "内容待补"}
            </span>
          )}
          {item.reviewStatus === "rejected" && reviewBlockReason && (
            <p className="max-w-[160px] text-xs leading-5 text-[#AD503A]">
              {reviewBlockReason}
            </p>
          )}
        </div>
      </td>
      <td className="px-5 py-4 text-sm text-[#5F6B64]">
        <div className="min-w-[96px]">
          <p>{formatCourseProductDate(item.updatedAt)}</p>
          <p className="mt-1 text-xs text-[#8A8176]">
            创建 {formatCourseProductDate(item.createdAt)}
          </p>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="flex min-w-[220px] flex-wrap gap-2">
          {canPublish && !canEdit && (
            <button
              onClick={() => onRequestStatusChange(item, targetStatus)}
              disabled={!canToggleStatus || isMutating}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D8CEC0] bg-white px-2.5 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {item.status === "published" ? "下架" : "上架"}
            </button>
          )}
          {canReview &&
            !canEdit &&
            reviewActions.map(action => (
              <button
                key={action.action}
                onClick={() =>
                  onRequestReviewAction(
                    item,
                    action.action,
                    action.targetReviewStatus
                  )
                }
                disabled={isMutating}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D8CEC0] bg-white px-2.5 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                {courseProductReviewActionCopy[action.action]}
              </button>
            ))}
          {canEdit && (
            <button
              onClick={() => onOpenWorkspace(item)}
              disabled={isMutating}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D8CEC0] bg-white px-2.5 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Layers3 className="h-3.5 w-3.5" />
              工作台
            </button>
          )}
          {canEdit && hasPublishQueueAction && (
            <button
              onClick={() => onOpenWorkspace(item, "publish")}
              disabled={isMutating}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#243B35] px-2.5 text-xs font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              发布管理
            </button>
          )}
          {canPrice && !canEdit && (
            <button
              onClick={() => onEditPrice(item)}
              disabled={isMutating}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#E6EDDF] px-2.5 text-xs font-semibold text-[#355F51] transition hover:bg-[#D7E5D4] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Edit3 className="h-3.5 w-3.5" />
              改价
            </button>
          )}
          {!hasVisibleActions && (
            <span className="inline-flex h-8 items-center rounded-lg bg-[#F1E8DC] px-2.5 text-xs font-semibold text-[#7B817C]">
              只读
            </span>
          )}
        </div>
      </td>
    </motion.tr>
  );
}
