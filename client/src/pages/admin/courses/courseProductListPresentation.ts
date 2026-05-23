import type {
  CourseProductAuditEvent,
  CourseProductListItem,
  CourseProductReviewAction,
  CourseProductReviewStatus,
  CourseProductStatus,
} from "@shared/domain";
import { assetGovernanceActionCopy } from "../course-assets/courseAssetGovernanceModel";
import {
  courseProductReviewCopy,
  courseProductStatusCopy,
} from "./courseProductAdminLabels";

export type CourseProductWorkspaceStep =
  | "basic"
  | "media"
  | "price"
  | "content"
  | "publish";

export function formatCourseProductMoney(item: CourseProductListItem) {
  if (item.price.isFree) return "免费";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: item.price.currency,
    maximumFractionDigits: 2,
  }).format(item.price.amount);
}

export function formatCourseProductDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function courseProductStatusClass(status: CourseProductStatus) {
  if (status === "published") {
    return "bg-[#E7EFE8] text-[#41675A] ring-[#BCD1C4]";
  }
  if (status === "unpublished") {
    return "bg-[#FFF7E5] text-[#8F6B1C] ring-[#E7D08F]";
  }
  if (status === "archived") {
    return "bg-[#EFEAE3] text-[#6D655C] ring-[#D7CCBF]";
  }
  return "bg-[#EEF2F7] text-[#536783] ring-[#CDD7E4]";
}

export function courseProductReviewClass(status: CourseProductReviewStatus) {
  if (status === "approved") {
    return "bg-[#E7EFE8] text-[#41675A]";
  }
  if (status === "rejected") {
    return "bg-[#FFF0EA] text-[#AD503A]";
  }
  if (status === "pending") {
    return "bg-[#FFF7E5] text-[#8F6B1C]";
  }
  return "bg-[#F1E8DC] text-[#7B817C]";
}

export function courseProductReviewActionsForItem(item: CourseProductListItem) {
  if (item.status === "archived") return [];

  if (
    item.reviewStatus === "not_submitted" ||
    item.reviewStatus === "rejected"
  ) {
    return [
      {
        action: "submit" as const,
        targetReviewStatus: "pending" as const,
      },
    ];
  }

  if (item.reviewStatus === "pending") {
    return [
      {
        action: "approve" as const,
        targetReviewStatus: "approved" as const,
      },
      {
        action: "reject" as const,
        targetReviewStatus: "rejected" as const,
      },
      {
        action: "withdraw" as const,
        targetReviewStatus: "not_submitted" as const,
      },
    ];
  }

  return [] satisfies {
    action: CourseProductReviewAction;
    targetReviewStatus: CourseProductReviewStatus;
  }[];
}

function formatAuditMoney(value: unknown) {
  if (!value || typeof value !== "object") return "未记录";
  const amount = "amount" in value ? Number(value.amount) : Number.NaN;
  const isFree = "isFree" in value ? Boolean(value.isFree) : false;
  if (isFree) return "免费";
  if (!Number.isFinite(amount)) return "未记录";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2,
  }).format(amount);
}

function auditStatusLabel(value: unknown) {
  if (typeof value !== "string") return "未记录";
  return value in courseProductStatusCopy
    ? courseProductStatusCopy[value as CourseProductStatus]
    : "未记录";
}

function auditReviewStatusLabel(value: unknown) {
  if (typeof value !== "string") return "未记录";
  return value in courseProductReviewCopy
    ? courseProductReviewCopy[value as CourseProductReviewStatus]
    : "未记录";
}

export function courseProductAuditChangeText(event: CourseProductAuditEvent) {
  if (event.action === "product_create") {
    const courseId =
      typeof event.after.courseId === "number" ? event.after.courseId : "";
    return courseId ? `新增课程 ID ${courseId}` : "新增课程商品草稿";
  }

  if (event.action === "asset_governance") {
    const action =
      typeof event.after.governanceAction === "string"
        ? event.after.governanceAction
        : "acknowledge_issue";
    const issue =
      typeof event.after.issueType === "string" ? event.after.issueType : "";
    return `${assetGovernanceActionCopy[action as keyof typeof assetGovernanceActionCopy] ?? "治理处理"} · ${issue}`;
  }
  if (event.action === "status_update") {
    return `${auditStatusLabel(event.before.status)} -> ${auditStatusLabel(
      event.after.status
    )}`;
  }
  if (event.action === "review_update") {
    return `${auditReviewStatusLabel(
      event.before.reviewStatus
    )} -> ${auditReviewStatusLabel(event.after.reviewStatus)}`;
  }
  if (event.action === "content_update") {
    const beforeChapters =
      typeof event.before.chapterCount === "number"
        ? event.before.chapterCount
        : 0;
    const afterChapters =
      typeof event.after.chapterCount === "number"
        ? event.after.chapterCount
        : 0;
    return `${beforeChapters} 章 -> ${afterChapters} 章`;
  }
  if (event.action === "info_update") {
    const beforeTitle =
      typeof event.before.title === "string" ? event.before.title : "未记录";
    const afterTitle =
      typeof event.after.title === "string" ? event.after.title : "未记录";
    return `${beforeTitle} -> ${afterTitle}`;
  }
  return `${formatAuditMoney(event.before.price)} -> ${formatAuditMoney(
    event.after.price
  )}`;
}

export function courseProductAuditActionLabel(
  action: CourseProductAuditEvent["action"]
) {
  if (action === "product_create") return "新增商品";
  if (action === "status_update") return "状态更新";
  if (action === "price_update") return "价格更新";
  if (action === "review_update") return "审核更新";
  if (action === "content_update") return "内容更新";
  if (action === "asset_upload") return "素材上传";
  if (action === "asset_review") return "素材审核";
  if (action === "asset_governance") return "素材治理";
  return "信息更新";
}
