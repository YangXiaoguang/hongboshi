import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  CircleDollarSign,
  Edit3,
  Eye,
  EyeOff,
  FilePenLine,
  History,
  Layers3,
  ListFilter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
  UsersRound,
} from "lucide-react";
import {
  ALL_COURSE_PRODUCT_CATEGORY,
  ALL_COURSE_PRODUCT_STATUS,
  COURSE_CATEGORIES,
  COURSE_PRODUCT_ASSET_KINDS,
  COURSE_PRODUCT_ASSET_GOVERNANCE_ACTIONS,
  COURSE_PRODUCT_ASSET_GOVERNANCE_ISSUE_TYPES,
  COURSE_PRODUCT_PAGE_SIZE,
  COURSE_PRODUCT_CONTENT_ASSET_REVIEW_STATUSES,
  COURSE_PRODUCT_CONTENT_MATERIAL_STATUSES,
  COURSE_PRODUCT_CONTENT_MATERIAL_TYPES,
  COURSE_PRODUCT_MERCHANDISING_ASSET_USAGES,
  COURSE_TYPES,
  CourseProductDetailContentSchema,
  evaluateCourseProductContentQuality,
  type CourseCategory,
  type CourseProductAsset,
  type CourseProductAssetGovernanceAction,
  type CourseProductAssetGovernanceBatchDraftResult,
  type CourseProductAssetGovernanceBatchIssueFilter,
  type CourseProductAssetGovernanceBatchTask,
  type CourseProductAssetGovernanceBatchTaskCreateRequest,
  type CourseProductAssetGovernanceBatchTaskListResult,
  type CourseProductAssetGovernanceBatchTaskReviewAction,
  type CourseProductAssetGovernanceBatchTaskReviewRequest,
  type CourseProductAssetGovernanceHistoryQuery,
  type CourseProductAssetGovernanceHistoryResult,
  type CourseProductAssetGovernanceIssueType,
  type CourseProductAssetGovernanceItem,
  type CourseProductAssetGovernanceReferenceSource,
  type CourseProductAssetGovernanceResult,
  type CourseProductAssetKind,
  type CourseProductAuditEvent,
  type CourseProductContentAssetReviewStatus,
  type CourseProductBasicInfoUpdateRequest,
  type CourseProductContentQualityResult,
  type CourseProductContentMaterialStatus,
  type CourseProductContentMaterialType,
  type CourseProductContentUpdateRequest,
  type CourseProductDetailContent,
  type CourseProductListItem,
  type CourseProductListQuery,
  type CourseProductMerchandisingAssetUsage,
  type CourseProductListResult,
  type CourseProductPriceUpdateRequest,
  type CourseProductReviewAction,
  type CourseProductReviewStatus,
  type CourseProductStatus,
  type CourseType,
} from "@shared/domain";
import { useAuth } from "@/contexts/AuthContext";
import { httpCourseProductRepository } from "@/features/catalog";
import { getCourseProductAdminPermissions } from "@/features/catalog/model/courseProductAdminPermissions";

type CourseProductStatusFilter = CourseProductListQuery["status"];
type CourseProductCategoryFilter = CourseProductListQuery["category"];
type StatusActionState = {
  product: CourseProductListItem;
  targetStatus: CourseProductStatus;
};
type ReviewActionState = {
  product: CourseProductListItem;
  action: CourseProductReviewAction;
  targetReviewStatus: CourseProductReviewStatus;
};
type PriceFormState = {
  amount: string;
  originalAmount: string;
  isFree: boolean;
  memberIncluded: boolean;
  reason: string;
};
type BasicInfoFormState = {
  title: string;
  coverUrl: string;
  category: CourseCategory;
  type: CourseType;
  instructorName: string;
  learners: string;
  reason: string;
};
type ContentMaterialFormState = {
  id: string;
  title: string;
  type: CourseProductContentMaterialType;
  status: CourseProductContentMaterialStatus;
  assetId: string;
  assetUrl: string;
  uploadedBy: string;
  uploadedAt?: string;
  complianceStatus: CourseProductContentAssetReviewStatus;
  downloadEnabled: boolean;
  note: string;
};
type ContentChapterFormState = {
  id: string;
  title: string;
  durationMinutes: string;
  materialPlaceholders: ContentMaterialFormState[];
};
type ContentMerchandisingAssetFormState = {
  id: string;
  title: string;
  imageUrl: string;
  altText: string;
  usage: CourseProductMerchandisingAssetUsage;
  complianceStatus: CourseProductContentAssetReviewStatus;
  note: string;
};
type ContentMerchandisingFormState = {
  headline: string;
  subheadline: string;
  showcaseImageUrl: string;
  showcaseImageAlt: string;
  sellingPointsText: string;
  imageAssets: ContentMerchandisingAssetFormState[];
};
type ContentFormState = {
  summary: string;
  targetAudienceText: string;
  merchandising: ContentMerchandisingFormState;
  chapters: ContentChapterFormState[];
  reason: string;
};
type AssetFormState = {
  title: string;
  kind: CourseProductAssetKind;
  chapterId: string;
  file?: File;
  sourceUrl: string;
  mimeType: string;
  sizeBytes: string;
  altText: string;
  note: string;
  reason: string;
};
type AssetGovernanceFilter =
  | "all"
  | "compliance_status"
  | CourseProductAssetGovernanceIssueType;
type AssetGovernanceHistoryFilterState = {
  assetId: string;
  productId: string;
  actorId: string;
  action: "all" | CourseProductAssetGovernanceAction;
  issueType: "all" | CourseProductAssetGovernanceIssueType;
  dateFrom: string;
  dateTo: string;
};
type AssetGovernanceActionState = {
  item: CourseProductAssetGovernanceItem;
  action: CourseProductAssetGovernanceAction;
  issueType: CourseProductAssetGovernanceIssueType;
  primaryAssetId?: string;
};
type AssetGovernanceBatchTaskCancelState = {
  task: CourseProductAssetGovernanceBatchTask;
};
type AssetGovernanceBatchTaskReviewState = {
  task: CourseProductAssetGovernanceBatchTask;
  action: CourseProductAssetGovernanceBatchTaskReviewAction;
};

const statusFilters: {
  value: CourseProductStatusFilter;
  label: string;
}[] = [
  { value: ALL_COURSE_PRODUCT_STATUS, label: "全部状态" },
  { value: "published", label: "已上架" },
  { value: "unpublished", label: "已下架" },
  { value: "draft", label: "草稿" },
  { value: "archived", label: "已归档" },
];

const sortOptions: {
  value: CourseProductListQuery["sort"];
  label: string;
}[] = [
  { value: "updated_desc", label: "最近更新" },
  { value: "created_desc", label: "最新创建" },
  { value: "learners_desc", label: "学习人数" },
  { value: "price_asc", label: "价格从低到高" },
  { value: "price_desc", label: "价格从高到低" },
];

const statusCopy = {
  draft: "草稿",
  published: "已上架",
  unpublished: "已下架",
  archived: "已归档",
} satisfies Record<CourseProductStatus, string>;

const reviewCopy = {
  not_submitted: "未提交",
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
} satisfies Record<CourseProductReviewStatus, string>;

const reviewActionCopy = {
  submit: "提交审核",
  approve: "通过审核",
  reject: "驳回审核",
  withdraw: "撤回审核",
} satisfies Record<CourseProductReviewAction, string>;

const materialTypeCopy = {
  video: "视频",
  audio: "音频",
  document: "文档",
  exercise: "练习",
  live_replay: "直播回放",
  other: "其他",
} satisfies Record<CourseProductContentMaterialType, string>;

const materialStatusCopy = {
  pending: "待准备",
  ready: "已就绪",
} satisfies Record<CourseProductContentMaterialStatus, string>;

const assetReviewStatusCopy = {
  not_required: "无需审核",
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
} satisfies Record<CourseProductContentAssetReviewStatus, string>;

const courseProductAssetKindCopy = {
  detail_image: "详情主图",
  proof_image: "证明图片",
  chapter_material: "章节资料",
  worksheet: "练习表",
  audio: "音频",
  video: "视频",
} satisfies Record<CourseProductAssetKind, string>;

const merchandisingAssetUsageCopy = {
  showcase: "主视觉",
  proof: "证明图",
  gallery: "详情图",
} satisfies Record<CourseProductMerchandisingAssetUsage, string>;

const assetGovernanceIssueCopy = {
  missing_product: "缺失商品",
  unreferenced: "未引用",
  duplicate_content_hash: "重复内容",
  pending_compliance: "待审核",
  rejected_compliance: "已驳回",
  download_disabled_material: "下载关闭",
  soft_delete_candidate: "软删候选",
} satisfies Record<CourseProductAssetGovernanceIssueType, string>;

const assetGovernanceReferenceSourceCopy = {
  reference_table: "引用表",
  content_material_placeholders: "章节占位推导",
  none: "暂无引用来源",
} satisfies Record<CourseProductAssetGovernanceReferenceSource, string>;

const assetGovernanceActionCopy = {
  acknowledge_issue: "记录处理",
  mark_duplicate_primary: "设为主素材",
  mark_soft_deleted: "软删除确认",
} satisfies Record<CourseProductAssetGovernanceAction, string>;

const assetGovernanceBatchTaskStatusCopy = {
  pending_approval: "待审批",
  approved: "已通过",
  rejected: "已驳回",
  canceled: "已取消",
} satisfies Record<
  CourseProductAssetGovernanceBatchTask["approvalStatus"],
  string
>;

const assetGovernanceBatchTaskReviewActionCopy = {
  approve: "通过审批",
  reject: "驳回草案",
} satisfies Record<CourseProductAssetGovernanceBatchTaskReviewAction, string>;

const assetGovernanceFilters: {
  value: AssetGovernanceFilter;
  label: string;
}[] = [
  { value: "all", label: "全部问题" },
  { value: "unreferenced", label: "未引用" },
  { value: "duplicate_content_hash", label: "重复内容" },
  { value: "compliance_status", label: "待审/驳回" },
  { value: "download_disabled_material", label: "下载关闭" },
  { value: "missing_product", label: "缺失商品" },
  { value: "soft_delete_candidate", label: "软删候选" },
];

const defaultAssetGovernanceHistoryFilters: AssetGovernanceHistoryFilterState =
  {
    assetId: "",
    productId: "",
    actorId: "",
    action: "all",
    issueType: "all",
    dateFrom: "",
    dateTo: "",
  };

export function assetGovernanceBatchIssueFilterFromPanelFilter(
  filter: AssetGovernanceFilter
): CourseProductAssetGovernanceBatchIssueFilter {
  return filter;
}

export function assetGovernanceBatchTaskCreateRequestFromPanelFilter(
  filter: AssetGovernanceFilter,
  reason: string,
  note?: string
): CourseProductAssetGovernanceBatchTaskCreateRequest {
  return {
    action: "acknowledge_issue",
    query: {
      issueFilter: assetGovernanceBatchIssueFilterFromPanelFilter(filter),
      previewSize: 8,
    },
    reason: reason.trim(),
    note: note?.trim() || undefined,
  };
}

export function assetGovernanceBatchTaskReviewRequestFromAction(
  action: CourseProductAssetGovernanceBatchTaskReviewAction,
  reason: string
): CourseProductAssetGovernanceBatchTaskReviewRequest {
  return {
    action,
    reason: reason.trim(),
  };
}

export function assetGovernanceHistoryQueryFromFilters(
  filters: AssetGovernanceHistoryFilterState
): Partial<CourseProductAssetGovernanceHistoryQuery> {
  return {
    assetId: filters.assetId.trim() || undefined,
    productId: filters.productId.trim() || undefined,
    actorId: filters.actorId.trim() || undefined,
    action: filters.action === "all" ? undefined : filters.action,
    issueType: filters.issueType === "all" ? undefined : filters.issueType,
    dateFrom: dateInputToDateTime(filters.dateFrom, false),
    dateTo: dateInputToDateTime(filters.dateTo, true),
    page: 1,
    pageSize: 5,
  };
}

function dateInputToDateTime(value: string, endOfDay: boolean) {
  if (!value) return undefined;
  return `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+08:00`;
}

function formatMoney(item: CourseProductListItem) {
  if (item.price.isFree) return "免费";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: item.price.currency,
    maximumFractionDigits: 2,
  }).format(item.price.amount);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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
  return value in statusCopy
    ? statusCopy[value as CourseProductStatus]
    : "未记录";
}

function auditReviewStatusLabel(value: unknown) {
  if (typeof value !== "string") return "未记录";
  return value in reviewCopy
    ? reviewCopy[value as CourseProductReviewStatus]
    : "未记录";
}

function auditChangeText(event: CourseProductAuditEvent) {
  if (event.action === "asset_governance") {
    const action =
      typeof event.after.governanceAction === "string"
        ? event.after.governanceAction
        : "acknowledge_issue";
    const issue =
      typeof event.after.issueType === "string" ? event.after.issueType : "";
    return `${assetGovernanceActionCopy[action as CourseProductAssetGovernanceAction] ?? "治理处理"} · ${issue}`;
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

function auditActionLabel(action: CourseProductAuditEvent["action"]) {
  if (action === "status_update") return "状态更新";
  if (action === "price_update") return "价格更新";
  if (action === "review_update") return "审核更新";
  if (action === "content_update") return "内容更新";
  if (action === "asset_upload") return "素材上传";
  if (action === "asset_review") return "素材审核";
  if (action === "asset_governance") return "素材治理";
  return "信息更新";
}

function statusClass(status: CourseProductStatus) {
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

function reviewClass(status: CourseProductReviewStatus) {
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

function metricItems(data?: CourseProductListResult) {
  const summary = data?.summary;
  return [
    {
      label: "课程商品",
      value: summary?.totalCount ?? 0,
      icon: Layers3,
    },
    {
      label: "已上架",
      value: summary?.publishedCount ?? 0,
      icon: BookOpenCheck,
    },
    {
      label: "免费课程",
      value: summary?.freeCount ?? 0,
      icon: CircleDollarSign,
    },
    {
      label: "会员权益",
      value: summary?.memberIncludedCount ?? 0,
      icon: UsersRound,
    },
  ];
}

function assetGovernanceMetricItems(
  governance?: CourseProductAssetGovernanceResult
) {
  const summary = governance?.summary;
  return [
    {
      label: "总素材",
      value: summary?.totalAssetCount ?? 0,
    },
    {
      label: "未引用",
      value: summary?.unreferencedAssetCount ?? 0,
    },
    {
      label: "重复 hash",
      value: summary?.duplicateContentHashAssetCount ?? 0,
    },
    {
      label: "待审核",
      value: summary?.pendingComplianceCount ?? 0,
    },
    {
      label: "已驳回",
      value: summary?.rejectedComplianceCount ?? 0,
    },
    {
      label: "下载关闭",
      value: summary?.downloadDisabledMaterialCount ?? 0,
    },
    {
      label: "软删候选",
      value: summary?.softDeleteCandidateCount ?? 0,
    },
    {
      label: "引用来源",
      value: summary
        ? assetGovernanceReferenceSourceCopy[summary.referenceSource]
        : "未读取",
    },
  ];
}

function hasAssetGovernanceIssue(
  item: CourseProductAssetGovernanceItem,
  issueType: CourseProductAssetGovernanceIssueType
) {
  return item.issueTypes.includes(issueType);
}

export function filterCourseProductAssetGovernanceItems(
  items: CourseProductAssetGovernanceItem[],
  filter: AssetGovernanceFilter
) {
  if (filter === "all") {
    return items.filter(item => item.issueTypes.length > 0);
  }

  if (filter === "compliance_status") {
    return items.filter(
      item =>
        hasAssetGovernanceIssue(item, "pending_compliance") ||
        hasAssetGovernanceIssue(item, "rejected_compliance")
    );
  }

  return items.filter(item => hasAssetGovernanceIssue(item, filter));
}

function primaryAssetGovernanceIssue(item: CourseProductAssetGovernanceItem) {
  const issueType = item.issueTypes[0];
  return issueType ? assetGovernanceIssueCopy[issueType] : "正常";
}

export function courseProductAssetGovernanceSuggestion(
  item: CourseProductAssetGovernanceItem
) {
  if (hasAssetGovernanceIssue(item, "missing_product")) {
    return "先核对素材归属，必要时从 Store 中迁移或清理异常 productId。";
  }
  if (hasAssetGovernanceIssue(item, "pending_compliance")) {
    return "进入素材队列完成合规审核，再决定是否用于详情图文或资料下载。";
  }
  if (hasAssetGovernanceIssue(item, "rejected_compliance")) {
    return "替换素材或补充来源说明，避免驳回素材继续出现在运营配置中。";
  }
  if (hasAssetGovernanceIssue(item, "download_disabled_material")) {
    return "确认资料合规后开启下载，或从章节资料中解绑该素材。";
  }
  if (hasAssetGovernanceIssue(item, "duplicate_content_hash")) {
    return "保留主素材，合并重复引用后再考虑软删冗余对象。";
  }
  if (hasAssetGovernanceIssue(item, "soft_delete_candidate")) {
    return "确认无前台引用后可进入单素材软删除确认，不触发物理删除。";
  }
  if (hasAssetGovernanceIssue(item, "unreferenced")) {
    return "补充到课程详情或章节资料，若长期不用再进入软删流程。";
  }
  return "当前素材未发现治理问题，保持定期复核。";
}

function governanceActionsForItem(item: CourseProductAssetGovernanceItem) {
  const primaryIssue = item.issueTypes[0];
  if (!primaryIssue) return [];

  const actions: AssetGovernanceActionState[] = [
    {
      item,
      action: "acknowledge_issue",
      issueType: primaryIssue,
    },
  ];

  if (hasAssetGovernanceIssue(item, "duplicate_content_hash")) {
    actions.push({
      item,
      action: "mark_duplicate_primary",
      issueType: "duplicate_content_hash",
      primaryAssetId: item.asset.id,
    });
  }

  if (hasAssetGovernanceIssue(item, "soft_delete_candidate")) {
    actions.push({
      item,
      action: "mark_soft_deleted",
      issueType: "soft_delete_candidate",
    });
  }

  return actions;
}

function reviewActionsForItem(item: CourseProductListItem) {
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

  return [];
}

function contentFormFromDetail(
  content: CourseProductDetailContent
): ContentFormState {
  return {
    summary: content.summary,
    targetAudienceText: content.targetAudience.join("\n"),
    merchandising: {
      headline: content.merchandising.headline ?? "",
      subheadline: content.merchandising.subheadline ?? "",
      showcaseImageUrl: content.merchandising.showcaseImageUrl ?? "",
      showcaseImageAlt: content.merchandising.showcaseImageAlt ?? "",
      sellingPointsText: content.merchandising.sellingPoints.join("\n"),
      imageAssets: content.merchandising.imageAssets.map(asset => ({
        id: asset.id,
        title: asset.title,
        imageUrl: asset.imageUrl,
        altText: asset.altText ?? "",
        usage: asset.usage,
        complianceStatus: asset.complianceStatus,
        note: asset.note ?? "",
      })),
    },
    chapters: content.chapters.map(chapter => ({
      id: chapter.id,
      title: chapter.title,
      durationMinutes: String(chapter.durationMinutes),
      materialPlaceholders: chapter.materialPlaceholders.map(material => ({
        id: material.id,
        title: material.title,
        type: material.type,
        status: material.status,
        assetId: material.assetId ?? "",
        assetUrl: material.assetUrl ?? "",
        uploadedBy: material.uploadedBy ?? "",
        uploadedAt: material.uploadedAt,
        complianceStatus: material.complianceStatus,
        downloadEnabled: material.downloadEnabled,
        note: material.note ?? "",
      })),
    })),
    reason: "",
  };
}

function targetAudienceFromText(value: string) {
  return value
    .split("\n")
    .map(item => item.trim())
    .filter(Boolean);
}

function sellingPointsFromText(value: string) {
  return value
    .split("\n")
    .map(item => item.trim())
    .filter(Boolean);
}

function merchandisingFromContentForm(
  merchandising: ContentMerchandisingFormState
) {
  return {
    headline: merchandising.headline.trim()
      ? merchandising.headline.trim()
      : undefined,
    subheadline: merchandising.subheadline.trim()
      ? merchandising.subheadline.trim()
      : undefined,
    showcaseImageUrl: merchandising.showcaseImageUrl.trim()
      ? merchandising.showcaseImageUrl.trim()
      : undefined,
    showcaseImageAlt: merchandising.showcaseImageAlt.trim()
      ? merchandising.showcaseImageAlt.trim()
      : undefined,
    sellingPoints: sellingPointsFromText(merchandising.sellingPointsText),
    imageAssets: merchandising.imageAssets.map(asset => ({
      id: asset.id,
      title: asset.title,
      imageUrl: asset.imageUrl,
      altText: asset.altText.trim() ? asset.altText.trim() : undefined,
      usage: asset.usage,
      complianceStatus: asset.complianceStatus,
      note: asset.note.trim() ? asset.note.trim() : undefined,
    })),
  };
}

function chaptersFromContentForm(chapters: ContentChapterFormState[]) {
  return chapters.map(chapter => ({
    id: chapter.id,
    title: chapter.title,
    durationMinutes: Number(chapter.durationMinutes),
    materialPlaceholders: chapter.materialPlaceholders.map(material => ({
      id: material.id,
      title: material.title,
      type: material.type,
      status: material.status,
      assetId: material.assetId.trim() ? material.assetId.trim() : undefined,
      assetUrl: material.assetUrl.trim() ? material.assetUrl.trim() : undefined,
      uploadedBy: material.uploadedBy.trim()
        ? material.uploadedBy.trim()
        : undefined,
      uploadedAt: material.uploadedAt,
      complianceStatus: material.complianceStatus,
      downloadEnabled: material.downloadEnabled,
      note: material.note.trim() ? material.note.trim() : undefined,
    })),
  }));
}

function contentQualityFromForm(
  productId: string,
  form: ContentFormState
): CourseProductContentQualityResult {
  const parsed = CourseProductDetailContentSchema.safeParse({
    productId,
    summary: form.summary,
    targetAudience: targetAudienceFromText(form.targetAudienceText),
    merchandising: merchandisingFromContentForm(form.merchandising),
    chapters: chaptersFromContentForm(form.chapters),
    updatedAt: new Date(0).toISOString(),
  });

  if (!parsed.success) {
    return {
      ready: false,
      issueCount: 1,
      blockingCount: 1,
      warningCount: 0,
      issues: [
        {
          code: "schema_invalid",
          severity: "blocking",
          message: "请先补齐摘要、适合人群、章节标题、时长和素材标题。",
        },
      ],
    };
  }

  return evaluateCourseProductContentQuality(parsed.data);
}

function createContentChapter(
  productId: string,
  index: number
): ContentChapterFormState {
  return {
    id: `${productId}_chapter_${Date.now()}_${index}`,
    title: "",
    durationMinutes: "30",
    materialPlaceholders: [],
  };
}

function createContentMaterial(
  chapterId: string,
  index: number
): ContentMaterialFormState {
  return {
    id: `${chapterId}_material_${Date.now()}_${index}`,
    title: "",
    type: "exercise",
    status: "pending",
    assetId: "",
    assetUrl: "",
    uploadedBy: "",
    complianceStatus: "not_required",
    downloadEnabled: false,
    note: "",
  };
}

function createMerchandisingAsset(
  productId: string,
  index: number
): ContentMerchandisingAssetFormState {
  return {
    id: `${productId}_sales_asset_${Date.now()}_${index}`,
    title: "",
    imageUrl: "",
    altText: "",
    usage: "gallery",
    complianceStatus: "pending",
    note: "",
  };
}

function createAssetFormState(): AssetFormState {
  return {
    title: "",
    kind: "detail_image",
    chapterId: "",
    sourceUrl: "",
    mimeType: "image/jpeg",
    sizeBytes: "",
    altText: "",
    note: "",
    reason: "新增课程素材资产",
  };
}

function isImageCourseAsset(asset: CourseProductAsset) {
  return asset.kind === "detail_image" || asset.kind === "proof_image";
}

function isDownloadableCourseAsset(asset: CourseProductAsset) {
  return ["chapter_material", "worksheet", "audio", "video"].includes(
    asset.kind
  );
}

function isApprovedCourseAsset(asset: CourseProductAsset) {
  return (
    asset.complianceStatus === "approved" ||
    asset.complianceStatus === "not_required"
  );
}

function isBindableLearningAsset(asset: CourseProductAsset) {
  return (
    isDownloadableCourseAsset(asset) &&
    isApprovedCourseAsset(asset) &&
    asset.downloadEnabled
  );
}

function materialTypeFromAssetKind(
  kind: CourseProductAssetKind
): CourseProductContentMaterialType {
  if (kind === "worksheet") return "exercise";
  if (kind === "audio") return "audio";
  if (kind === "video") return "video";
  return "document";
}

function courseAssetDownloadUrl(courseId: number, assetId: string) {
  return `/api/courses/${courseId}/assets/${encodeURIComponent(assetId)}/download`;
}

function isUsableAssetUrl(value: string | undefined) {
  return Boolean(
    value && (/^https?:\/\//i.test(value) || value.startsWith("/api/"))
  );
}

function AuditTrail({ events }: { events: CourseProductAuditEvent[] }) {
  const recentEvents = events.slice(0, 5);

  return (
    <section className="mt-6 overflow-hidden rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] shadow-sm shadow-[#243B35]/5">
      <div className="flex items-center justify-between border-b border-[#E8DED0] px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <History className="h-4 w-4 text-[#6F8F83]" />
          最近审计
        </div>
        <span className="rounded-full bg-[#F1E8DC] px-2.5 py-1 text-xs font-semibold text-[#756B60]">
          {events.length} 条
        </span>
      </div>

      {recentEvents.length ? (
        <div className="divide-y divide-[#E8DED0]">
          {recentEvents.map(event => (
            <div
              key={event.id}
              className="grid gap-3 px-5 py-3 text-sm md:grid-cols-[140px_minmax(0,1fr)_180px]"
            >
              <div>
                <p className="font-semibold text-[#243B35]">
                  {auditActionLabel(event.action)}
                </p>
                <p className="mt-1 text-xs text-[#8A8176]">
                  {formatDate(event.createdAt)}
                </p>
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#41524B]">
                  {event.productTitle}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                  {auditChangeText(event)} · {event.reason}
                </p>
              </div>
              <p className="text-xs text-[#8A8176]">操作者 {event.actorId}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex min-h-[116px] items-center justify-center px-5 text-sm text-[#8A8176]">
          本轮还没有课程商品操作记录
        </div>
      )}
    </section>
  );
}

function CourseProductAssetGovernancePanel({
  governance,
  history,
  batchDraft,
  batchTasks,
  filter,
  historyFilters,
  canEdit,
  canReview,
  mutatingAssetId,
  isBatchTaskMutating = false,
  onFilterChange,
  onHistoryFiltersChange,
  onRefreshGovernanceData,
  onLocateAsset,
  onOpenGovernanceAction,
  onOpenBatchTaskDraft,
  onOpenBatchTaskReview,
  onOpenBatchTaskCancel,
}: {
  governance?: CourseProductAssetGovernanceResult;
  history?: CourseProductAssetGovernanceHistoryResult;
  batchDraft?: CourseProductAssetGovernanceBatchDraftResult;
  batchTasks?: CourseProductAssetGovernanceBatchTaskListResult;
  filter: AssetGovernanceFilter;
  historyFilters: AssetGovernanceHistoryFilterState;
  canEdit: boolean;
  canReview: boolean;
  mutatingAssetId?: string;
  isBatchTaskMutating?: boolean;
  onFilterChange: (filter: AssetGovernanceFilter) => void;
  onHistoryFiltersChange: (
    patch: Partial<AssetGovernanceHistoryFilterState>
  ) => void;
  onRefreshGovernanceData: () => void;
  onLocateAsset: (item: CourseProductAssetGovernanceItem) => void;
  onOpenGovernanceAction: (action: AssetGovernanceActionState) => void;
  onOpenBatchTaskDraft: () => void;
  onOpenBatchTaskReview: (
    task: CourseProductAssetGovernanceBatchTask,
    action: CourseProductAssetGovernanceBatchTaskReviewAction
  ) => void;
  onOpenBatchTaskCancel: (task: CourseProductAssetGovernanceBatchTask) => void;
}) {
  const issueItems = filterCourseProductAssetGovernanceItems(
    governance?.items ?? [],
    filter
  );
  const visibleItems = issueItems.slice(0, 8);
  const issueCount =
    governance?.items.filter(item => item.issueTypes.length > 0).length ?? 0;
  const recentBatchTasks = batchTasks?.items ?? [];
  const canCreateBatchTask = Boolean(
    canReview && batchDraft && batchDraft.summary.candidateAssetCount > 0
  );

  return (
    <section className="mt-6 overflow-hidden rounded-lg border border-[#D9D1C4] bg-[#FFFDF8] shadow-sm shadow-[#243B35]/5">
      <div className="flex flex-col gap-3 border-b border-[#E8DED0] px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[#243B35]">素材治理</p>
            <span className="inline-flex h-6 items-center rounded-full bg-[#F1E8DC] px-2.5 text-xs font-semibold text-[#756B60]">
              {canReview ? "单素材处理" : "只读"}
            </span>
            <span className="inline-flex h-6 items-center rounded-full bg-[#EEF6ED] px-2.5 text-xs font-semibold text-[#41675A]">
              {issueCount} 个待处理
            </span>
          </div>
          <p className="mt-2 max-w-[760px] text-sm leading-6 text-[#6F7771]">
            汇总课程素材的引用、重复内容、合规和下载状态，帮助运营先定位问题，再进入已有内容与素材队列处理。
          </p>
        </div>
        <p className="text-xs leading-5 text-[#8A8176]">
          生成时间{" "}
          {governance?.generatedAt
            ? formatDate(governance.generatedAt)
            : "待读取"}
        </p>
      </div>

      <div className="grid border-b border-[#E8DED0] bg-[#FBF7EF] sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {assetGovernanceMetricItems(governance).map(item => (
          <div
            key={item.label}
            className="min-h-[76px] border-b border-r border-[#E8DED0] px-4 py-3 last:border-r-0"
          >
            <p className="text-xs text-[#8A8176]">{item.label}</p>
            <p className="mt-2 truncate text-lg font-semibold text-[#243B35]">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {governance?.notes.length ? (
        <div className="border-b border-[#E8DED0] px-5 py-3">
          <div className="flex flex-wrap gap-2">
            {governance.notes.map(note => (
              <span
                key={note}
                className="inline-flex min-h-7 items-center rounded-full bg-[#FFF7E5] px-3 text-xs font-semibold text-[#8F6B1C]"
              >
                {note}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex gap-2 overflow-x-auto border-b border-[#E8DED0] px-5 py-3">
        {assetGovernanceFilters.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => onFilterChange(option.value)}
            className={`h-8 shrink-0 rounded-lg px-3 text-xs font-semibold transition ${
              filter === option.value
                ? "bg-[#243B35] text-white"
                : "border border-[#D8CEC0] bg-white text-[#41524B] hover:border-[#9FB3A9]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid border-b border-[#E8DED0] bg-[#FFFDF8] lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.88fr)]">
        <div className="border-b border-[#E8DED0] px-5 py-4 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#243B35]">
                批量处理草稿预览
              </p>
              <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                按当前问题筛选生成候选摘要，先保存为待审批草案，不批量写入素材。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-7 items-center rounded-full bg-[#F1E8DC] px-2.5 text-xs font-semibold text-[#756B60]">
                {canReview ? "待审批/未执行" : "需审核权限"}
              </span>
              {canReview && (
                <button
                  type="button"
                  onClick={onOpenBatchTaskDraft}
                  disabled={!canCreateBatchTask || isBatchTaskMutating}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#243B35] px-3 text-xs font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {isBatchTaskMutating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ClipboardCheck className="h-3.5 w-3.5" />
                  )}
                  保存草案
                </button>
              )}
            </div>
          </div>
          {canReview && batchDraft ? (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["候选素材", batchDraft.summary.candidateAssetCount],
                  ["预览行", batchDraft.summary.previewItemCount],
                  ["可记录动作", batchDraft.summary.eligibleActionCount],
                  ["需人工复核", batchDraft.summary.manualReviewAssetCount],
                ].map(([label, value]) => (
                  <div key={label} className="border-r border-[#E8DED0] pr-3">
                    <p className="text-xs text-[#8A8176]">{label}</p>
                    <p className="mt-1 text-lg font-semibold text-[#243B35]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {batchDraft.summary.issueTypeDistribution
                  .slice(0, 6)
                  .map(item => (
                    <span
                      key={item.key}
                      className="inline-flex h-7 items-center rounded-full bg-[#EEF6ED] px-2.5 text-xs font-semibold text-[#41675A]"
                    >
                      {item.label} {item.count}
                    </span>
                  ))}
                {!batchDraft.summary.issueTypeDistribution.length && (
                  <span className="text-xs text-[#8A8176]">
                    当前筛选没有待处理候选。
                  </span>
                )}
              </div>
              <ul className="mt-3 space-y-1 text-xs leading-5 text-[#8A8176]">
                {batchDraft.safetyNotes.slice(0, 3).map(note => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              <div className="mt-4 border-t border-[#E8DED0] pt-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-[#41524B]">
                    最近批量草案
                  </p>
                  <span className="text-xs text-[#8A8176]">
                    待审批 {batchTasks?.summary.pendingApprovalCount ?? 0}
                  </span>
                </div>
                {recentBatchTasks.length ? (
                  <div className="mt-2 space-y-2">
                    {recentBatchTasks.slice(0, 3).map(task => (
                      <div
                        key={task.id}
                        className="rounded-lg border border-[#E1D7C8] bg-white px-3 py-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#243B35]">
                            {
                              assetGovernanceBatchTaskStatusCopy[
                                task.approvalStatus
                              ]
                            }{" "}
                            · {assetGovernanceActionCopy[task.action]}
                          </span>
                          <span className="text-xs text-[#8A8176]">
                            {formatDate(task.updatedAt)}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-1 text-xs text-[#6F7771]">
                          {task.candidateAssetCount} 个候选 ·{" "}
                          {assetGovernanceFilters.find(
                            option => option.value === task.query.issueFilter
                          )?.label ?? task.query.issueFilter}{" "}
                          · 创建人 {task.createdBy}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex h-6 items-center rounded-full bg-[#EEF6ED] px-2 text-xs font-semibold text-[#41675A]">
                            {task.manualReviewAssetCount} 个需复核
                          </span>
                          {task.approvalStatus === "pending_approval" && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenBatchTaskReview(task, "approve")
                                }
                                disabled={isBatchTaskMutating}
                                className="inline-flex h-6 items-center rounded-lg bg-[#E6EDDF] px-2 text-xs font-semibold text-[#355F51] transition hover:bg-[#D7E5D4] disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                通过审批
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenBatchTaskReview(task, "reject")
                                }
                                disabled={isBatchTaskMutating}
                                className="inline-flex h-6 items-center rounded-lg border border-[#D8CEC0] bg-white px-2 text-xs font-semibold text-[#A65F48] transition hover:border-[#EDCDBF] disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                驳回
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenBatchTaskCancel(task)}
                                disabled={isBatchTaskMutating}
                                className="inline-flex h-6 items-center rounded-lg border border-[#D8CEC0] bg-white px-2 text-xs font-semibold text-[#6F7771] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                取消
                              </button>
                            </>
                          )}
                        </div>
                        {task.approvalPreflight?.requiresRecreate ? (
                          <p className="mt-2 rounded-md bg-[#FFF7E5] px-2 py-1 text-xs leading-5 text-[#8F6B1C]">
                            预检提示：{task.approvalPreflight.notes[0]}
                          </p>
                        ) : null}
                        {task.reviewedBy ? (
                          <p className="mt-2 text-xs text-[#8A8176]">
                            审批人 {task.reviewedBy} ·{" "}
                            {task.reviewedAt
                              ? formatDate(task.reviewedAt)
                              : "未记录"}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs leading-5 text-[#8A8176]">
                    暂无批量治理任务草案。
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[#8A8176]">
              批量草稿涉及后续处理动作，当前账号仅可查看治理摘要与历史。
            </p>
          )}
        </div>

        <div className="px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#243B35]">
                治理动作历史
              </p>
              <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                只读取审计摘要，不暴露对象文件或签名 URL。
              </p>
            </div>
            <button
              type="button"
              onClick={onRefreshGovernanceData}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D8CEC0] bg-white px-2.5 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
            >
              <History className="h-3.5 w-3.5" />
              筛选历史
            </button>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <input
              value={historyFilters.assetId}
              onChange={event =>
                onHistoryFiltersChange({ assetId: event.target.value })
              }
              placeholder="素材 ID"
              className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-xs outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
            />
            <input
              value={historyFilters.productId}
              onChange={event =>
                onHistoryFiltersChange({ productId: event.target.value })
              }
              placeholder="商品 ID"
              className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-xs outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
            />
            <input
              value={historyFilters.actorId}
              onChange={event =>
                onHistoryFiltersChange({ actorId: event.target.value })
              }
              placeholder="操作者 ID"
              className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-xs outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
            />
            <select
              value={historyFilters.action}
              onChange={event =>
                onHistoryFiltersChange({
                  action: event.target
                    .value as AssetGovernanceHistoryFilterState["action"],
                })
              }
              className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-xs text-[#41524B] outline-none transition focus:border-[#6F8F83]"
            >
              <option value="all">全部动作</option>
              {COURSE_PRODUCT_ASSET_GOVERNANCE_ACTIONS.map(action => (
                <option key={action} value={action}>
                  {assetGovernanceActionCopy[action]}
                </option>
              ))}
            </select>
            <select
              value={historyFilters.issueType}
              onChange={event =>
                onHistoryFiltersChange({
                  issueType: event.target
                    .value as AssetGovernanceHistoryFilterState["issueType"],
                })
              }
              className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-xs text-[#41524B] outline-none transition focus:border-[#6F8F83]"
            >
              <option value="all">全部问题</option>
              {COURSE_PRODUCT_ASSET_GOVERNANCE_ISSUE_TYPES.map(issueType => (
                <option key={issueType} value={issueType}>
                  {assetGovernanceIssueCopy[issueType]}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={historyFilters.dateFrom}
                onChange={event =>
                  onHistoryFiltersChange({ dateFrom: event.target.value })
                }
                className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-2 text-xs outline-none transition focus:border-[#6F8F83]"
              />
              <input
                type="date"
                value={historyFilters.dateTo}
                onChange={event =>
                  onHistoryFiltersChange({ dateTo: event.target.value })
                }
                className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-2 text-xs outline-none transition focus:border-[#6F8F83]"
              />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {history?.items.length ? (
              history.items.map(item => (
                <div
                  key={item.id}
                  className="border-t border-[#E8DED0] pt-2 text-xs leading-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[#243B35]">
                      {assetGovernanceActionCopy[item.action]}
                    </span>
                    <span className="text-[#A65F48]">
                      {assetGovernanceIssueCopy[item.issueType]}
                    </span>
                    <span className="text-[#8A8176]">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-[#5F6B64]">
                    {item.assetTitle ?? item.assetId} · 操作者 {item.actorId}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[#8A8176]">
                    {item.reason}
                  </p>
                </div>
              ))
            ) : (
              <p className="border-t border-[#E8DED0] pt-3 text-sm text-[#8A8176]">
                {history ? "当前筛选下暂无治理动作历史" : "治理历史待读取"}
              </p>
            )}
          </div>
        </div>
      </div>

      {visibleItems.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1360px] text-left">
            <thead className="bg-[#F8F3EA] text-xs text-[#8A8176]">
              <tr>
                <th className="px-5 py-3 font-semibold">课程商品</th>
                <th className="px-5 py-3 font-semibold">素材</th>
                <th className="px-5 py-3 font-semibold">合规</th>
                <th className="px-5 py-3 font-semibold">引用</th>
                <th className="px-5 py-3 font-semibold">重复对象</th>
                <th className="px-5 py-3 font-semibold">更新时间</th>
                <th className="px-5 py-3 font-semibold">建议处理</th>
                <th className="px-5 py-3 font-semibold">治理动作</th>
                <th className="px-5 py-3 font-semibold">定位</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map(item => (
                <tr
                  key={item.asset.id}
                  className="border-b border-[#E8DED0] last:border-b-0 hover:bg-[#FBF7EF]"
                >
                  <td className="px-5 py-4">
                    <div className="min-w-[190px]">
                      <p className="truncate text-sm font-semibold text-[#243B35]">
                        {item.product?.title ?? "商品不存在"}
                      </p>
                      <p className="mt-1 text-xs text-[#8A8176]">
                        {item.product
                          ? `ID ${item.product.courseId} · ${reviewCopy[item.product.reviewStatus]}`
                          : item.asset.productId}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="min-w-[190px]">
                      <p className="truncate text-sm font-semibold text-[#243B35]">
                        {item.asset.title}
                      </p>
                      <p className="mt-1 text-xs text-[#8A8176]">
                        {courseProductAssetKindCopy[item.asset.kind]} ·{" "}
                        {item.asset.fileName}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[#A65F48]">
                        {primaryAssetGovernanceIssue(item)}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold ${
                        item.asset.complianceStatus === "approved"
                          ? "bg-[#E7EFE8] text-[#41675A]"
                          : item.asset.complianceStatus === "rejected"
                            ? "bg-[#FFF0EA] text-[#AD503A]"
                            : item.asset.complianceStatus === "pending"
                              ? "bg-[#FFF7E5] text-[#8F6B1C]"
                              : "bg-[#F1E8DC] text-[#7B817C]"
                      }`}
                    >
                      {assetReviewStatusCopy[item.asset.complianceStatus]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-[#5F6B64]">
                    <div className="min-w-[108px]">
                      <p>{item.referenceCount} 处引用</p>
                      <p className="mt-1 text-xs text-[#8A8176]">
                        {
                          assetGovernanceReferenceSourceCopy[
                            item.referenceSource
                          ]
                        }
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-[#5F6B64]">
                    <div className="min-w-[132px]">
                      {item.duplicateContentHashAssetIds.length > 0 ? (
                        <>
                          <p>
                            {item.duplicateContentHashAssetIds.length} 个重复
                          </p>
                          <p className="mt-1 truncate text-xs text-[#8A8176]">
                            {item.duplicateContentHashAssetIds.join("、")}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-[#8A8176]">无重复对象</p>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-[#5F6B64]">
                    <div className="min-w-[100px]">
                      {formatDate(item.asset.updatedAt)}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="min-w-[240px] max-w-[300px] text-xs leading-5 text-[#6F7771]">
                      {courseProductAssetGovernanceSuggestion(item)}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex min-w-[180px] flex-wrap gap-2">
                      {canReview && item.product ? (
                        governanceActionsForItem(item).map(action => (
                          <button
                            key={action.action}
                            type="button"
                            onClick={() => onOpenGovernanceAction(action)}
                            disabled={mutatingAssetId === item.asset.id}
                            className={`h-8 rounded-lg px-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                              action.action === "mark_soft_deleted"
                                ? "bg-[#FFF0EA] text-[#AD503A] hover:bg-[#FFE8DE]"
                                : action.action === "mark_duplicate_primary"
                                  ? "bg-[#E6EDDF] text-[#355F51] hover:bg-[#D7E5D4]"
                                  : "border border-[#D8CEC0] bg-white text-[#41524B] hover:border-[#9FB3A9]"
                            }`}
                          >
                            {assetGovernanceActionCopy[action.action]}
                          </button>
                        ))
                      ) : (
                        <span className="inline-flex h-8 items-center rounded-lg bg-[#F1E8DC] px-2.5 text-xs font-semibold text-[#7B817C]">
                          {item.product ? "只读" : "待核对"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => onLocateAsset(item)}
                      disabled={!item.product}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D8CEC0] bg-white px-2.5 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <FilePenLine className="h-3.5 w-3.5" />
                      {canEdit ? "打开素材" : "定位课程"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex min-h-[160px] flex-col items-center justify-center px-6 text-center">
          <BadgeCheck className="h-8 w-8 text-[#7C9288]" />
          <h2 className="mt-3 text-base font-semibold">
            {governance ? "当前筛选下暂无素材问题" : "素材治理待读取"}
          </h2>
          <p className="mt-2 max-w-[460px] text-sm leading-6 text-[#6F7771]">
            {governance
              ? "可以切换筛选条件继续检查，或在课程内容面板中维护素材队列。"
              : "刷新后会读取素材引用、合规和重复内容摘要。"}
          </p>
        </div>
      )}
    </section>
  );
}

function CourseProductRow({
  item,
  index,
  isMutating,
  contentQuality,
  canEdit,
  canReview,
  canPublish,
  canPrice,
  reviewBlockReason,
  onEditInfo,
  onEditContent,
  onEditPrice,
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
  onEditInfo: (item: CourseProductListItem) => void;
  onEditContent: (item: CourseProductListItem) => void;
  onEditPrice: (item: CourseProductListItem) => void;
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
  const reviewActions = reviewActionsForItem(item);
  const hasVisibleActions = canEdit || canReview || canPublish || canPrice;

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
            {formatMoney(item)}
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
            className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold ring-1 ${statusClass(
              item.status
            )}`}
          >
            {statusCopy[item.status]}
          </span>
          <span
            className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold ${reviewClass(
              item.reviewStatus
            )}`}
          >
            {reviewCopy[item.reviewStatus]}
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
          <p>{formatDate(item.updatedAt)}</p>
          <p className="mt-1 text-xs text-[#8A8176]">
            创建 {formatDate(item.createdAt)}
          </p>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="flex min-w-[300px] flex-wrap gap-2">
          {canPublish && (
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
                {reviewActionCopy[action.action]}
              </button>
            ))}
          {canEdit && (
            <>
              <button
                onClick={() => onEditInfo(item)}
                disabled={isMutating}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D8CEC0] bg-white px-2.5 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Edit3 className="h-3.5 w-3.5" />
                编辑
              </button>
              <button
                onClick={() => onEditContent(item)}
                disabled={isMutating}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D8CEC0] bg-white px-2.5 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <FilePenLine className="h-3.5 w-3.5" />
                内容
              </button>
            </>
          )}
          {canPrice && (
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

export default function CourseProducts() {
  const { user, isLoggedIn, isAuthSyncing } = useAuth();
  const [data, setData] = useState<CourseProductListResult>();
  const [assetGovernance, setAssetGovernance] =
    useState<CourseProductAssetGovernanceResult>();
  const [assetGovernanceHistory, setAssetGovernanceHistory] =
    useState<CourseProductAssetGovernanceHistoryResult>();
  const [assetGovernanceBatchDraft, setAssetGovernanceBatchDraft] =
    useState<CourseProductAssetGovernanceBatchDraftResult>();
  const [assetGovernanceBatchTasks, setAssetGovernanceBatchTasks] =
    useState<CourseProductAssetGovernanceBatchTaskListResult>();
  const [assetGovernanceFilter, setAssetGovernanceFilter] =
    useState<AssetGovernanceFilter>("all");
  const [assetGovernanceHistoryFilters, setAssetGovernanceHistoryFilters] =
    useState<AssetGovernanceHistoryFilterState>(
      defaultAssetGovernanceHistoryFilters
    );
  const [contentQualityByProductId, setContentQualityByProductId] = useState<
    Record<string, CourseProductContentQualityResult>
  >({});
  const [query, setQuery] = useState<CourseProductListQuery>({
    keyword: "",
    category: ALL_COURSE_PRODUCT_CATEGORY,
    status: ALL_COURSE_PRODUCT_STATUS,
    sort: "updated_desc",
    page: 1,
    pageSize: COURSE_PRODUCT_PAGE_SIZE,
  });
  const [keywordDraft, setKeywordDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [actionMessage, setActionMessage] = useState<string>();
  const [mutatingProductId, setMutatingProductId] = useState<string>();
  const [statusAction, setStatusAction] = useState<StatusActionState>();
  const [statusReason, setStatusReason] = useState("");
  const [reviewAction, setReviewAction] = useState<ReviewActionState>();
  const [reviewReason, setReviewReason] = useState("");
  const [infoEditor, setInfoEditor] = useState<CourseProductListItem>();
  const [infoForm, setInfoForm] = useState<BasicInfoFormState>({
    title: "",
    coverUrl: "",
    category: COURSE_CATEGORIES[0],
    type: COURSE_TYPES[0],
    instructorName: "",
    learners: "0",
    reason: "",
  });
  const [contentEditor, setContentEditor] = useState<CourseProductListItem>();
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [contentAssets, setContentAssets] = useState<CourseProductAsset[]>([]);
  const [mutatingAssetId, setMutatingAssetId] = useState<string>();
  const [governanceAction, setGovernanceAction] =
    useState<AssetGovernanceActionState>();
  const [governanceReason, setGovernanceReason] = useState("");
  const [governanceNote, setGovernanceNote] = useState("");
  const [
    isAssetGovernanceBatchTaskDraftOpen,
    setIsAssetGovernanceBatchTaskDraftOpen,
  ] = useState(false);
  const [assetGovernanceBatchTaskReason, setAssetGovernanceBatchTaskReason] =
    useState("");
  const [assetGovernanceBatchTaskNote, setAssetGovernanceBatchTaskNote] =
    useState("");
  const [assetGovernanceBatchTaskCancel, setAssetGovernanceBatchTaskCancel] =
    useState<AssetGovernanceBatchTaskCancelState>();
  const [
    assetGovernanceBatchTaskCancelReason,
    setAssetGovernanceBatchTaskCancelReason,
  ] = useState("");
  const [assetGovernanceBatchTaskReview, setAssetGovernanceBatchTaskReview] =
    useState<AssetGovernanceBatchTaskReviewState>();
  const [
    assetGovernanceBatchTaskReviewReason,
    setAssetGovernanceBatchTaskReviewReason,
  ] = useState("");
  const [mutatingBatchTaskId, setMutatingBatchTaskId] = useState<string>();
  const [assetForm, setAssetForm] =
    useState<AssetFormState>(createAssetFormState);
  const [contentForm, setContentForm] = useState<ContentFormState>({
    summary: "",
    targetAudienceText: "",
    merchandising: {
      headline: "",
      subheadline: "",
      showcaseImageUrl: "",
      showcaseImageAlt: "",
      sellingPointsText: "",
      imageAssets: [],
    },
    chapters: [],
    reason: "",
  });
  const [priceEditor, setPriceEditor] = useState<CourseProductListItem>();
  const [priceForm, setPriceForm] = useState<PriceFormState>({
    amount: "",
    originalAmount: "",
    isFree: false,
    memberIncluded: false,
    reason: "",
  });

  const catalogPermissions = useMemo(
    () => getCourseProductAdminPermissions(user),
    [user]
  );

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const [
        products,
        contentQuality,
        governance,
        history,
        batchDraft,
        batchTasks,
      ] = await Promise.all([
        httpCourseProductRepository.loadCourseProducts(query),
        httpCourseProductRepository.loadCourseProductContentQuality(),
        httpCourseProductRepository.loadCourseProductAssetGovernance(),
        httpCourseProductRepository.loadCourseProductAssetGovernanceHistory(
          assetGovernanceHistoryQueryFromFilters(assetGovernanceHistoryFilters)
        ),
        catalogPermissions.canReview
          ? httpCourseProductRepository.loadCourseProductAssetGovernanceBatchDraft(
              {
                issueFilter: assetGovernanceBatchIssueFilterFromPanelFilter(
                  assetGovernanceFilter
                ),
                previewSize: 8,
              }
            )
          : Promise.resolve(undefined),
        catalogPermissions.canReview
          ? httpCourseProductRepository.loadCourseProductAssetGovernanceBatchTasks(
              {
                pageSize: 5,
              }
            )
          : Promise.resolve(undefined),
      ]);
      setData(products);
      setAssetGovernance(governance);
      setAssetGovernanceHistory(history);
      setAssetGovernanceBatchDraft(batchDraft);
      setAssetGovernanceBatchTasks(batchTasks);
      setContentQualityByProductId(
        Object.fromEntries(
          contentQuality.items.map(item => [item.productId, item.quality])
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "课程商品列表暂时不可用");
    } finally {
      setIsLoading(false);
    }
  }, [
    assetGovernanceFilter,
    assetGovernanceHistoryFilters,
    catalogPermissions.canReview,
    query,
  ]);

  useEffect(() => {
    if (isAuthSyncing || !isLoggedIn || !catalogPermissions.canRead) return;
    void loadProducts();
  }, [catalogPermissions.canRead, isAuthSyncing, isLoggedIn, loadProducts]);

  const openInfoEditor = useCallback(
    (item: CourseProductListItem) => {
      if (!catalogPermissions.canEdit) return;
      setActionError(undefined);
      setActionMessage(undefined);
      setInfoEditor(item);
      setInfoForm({
        title: item.title,
        coverUrl: item.coverUrl,
        category: item.category,
        type: item.type,
        instructorName: item.instructorName,
        learners: String(item.learners),
        reason: "",
      });
    },
    [catalogPermissions.canEdit]
  );

  const openContentEditor = useCallback(
    async (item: CourseProductListItem) => {
      if (!catalogPermissions.canEdit) return;
      setActionError(undefined);
      setActionMessage(undefined);
      setContentEditor(item);
      setContentAssets([]);
      setAssetForm(createAssetFormState());
      setIsContentLoading(true);
      try {
        const [content, assets] = await Promise.all([
          httpCourseProductRepository.loadCourseProductContent(item.id),
          httpCourseProductRepository.loadCourseProductAssets(item.id),
        ]);
        setContentForm(contentFormFromDetail(content));
        setContentAssets(assets.items);
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "课程商品详情内容读取失败"
        );
        setContentEditor(undefined);
      } finally {
        setIsContentLoading(false);
      }
    },
    [catalogPermissions.canEdit]
  );

  const openPriceEditor = useCallback(
    (item: CourseProductListItem) => {
      if (!catalogPermissions.canPrice) return;
      setActionError(undefined);
      setActionMessage(undefined);
      setPriceEditor(item);
      setPriceForm({
        amount: String(item.price.amount),
        originalAmount: String(item.price.originalAmount),
        isFree: item.price.isFree,
        memberIncluded: item.price.memberIncluded,
        reason: "",
      });
    },
    [catalogPermissions.canPrice]
  );

  const openStatusAction = useCallback(
    (product: CourseProductListItem, targetStatus: CourseProductStatus) => {
      if (!catalogPermissions.canPublish) return;
      setActionError(undefined);
      setActionMessage(undefined);
      setStatusAction({ product, targetStatus });
      setStatusReason("");
    },
    [catalogPermissions.canPublish]
  );

  const openReviewAction = useCallback(
    (
      product: CourseProductListItem,
      action: CourseProductReviewAction,
      targetReviewStatus: CourseProductReviewStatus
    ) => {
      if (!catalogPermissions.canReview) return;
      setActionError(undefined);
      setActionMessage(undefined);
      setReviewAction({ product, action, targetReviewStatus });
      setReviewReason("");
    },
    [catalogPermissions.canReview]
  );

  const submitStatusAction = useCallback(async () => {
    if (!statusAction) return;
    if (!catalogPermissions.canPublish) {
      setActionError("当前账号暂无课程商品发布权限");
      return;
    }
    setMutatingProductId(statusAction.product.id);
    setActionError(undefined);
    setActionMessage(undefined);

    try {
      await httpCourseProductRepository.updateCourseProductStatus(
        statusAction.product.id,
        {
          status: statusAction.targetStatus,
          reason: statusReason,
        }
      );
      setActionMessage(
        `${statusAction.product.title} 已${statusAction.targetStatus === "published" ? "上架" : "下架"}`
      );
      setStatusAction(undefined);
      setStatusReason("");
      await loadProducts();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "课程商品状态更新失败"
      );
    } finally {
      setMutatingProductId(undefined);
    }
  }, [catalogPermissions.canPublish, loadProducts, statusAction, statusReason]);

  const submitReviewAction = useCallback(async () => {
    if (!reviewAction) return;
    if (!catalogPermissions.canReview) {
      setActionError("当前账号暂无课程商品审核权限");
      return;
    }
    setMutatingProductId(reviewAction.product.id);
    setActionError(undefined);
    setActionMessage(undefined);

    try {
      await httpCourseProductRepository.updateCourseProductReview(
        reviewAction.product.id,
        {
          action: reviewAction.action,
          reason: reviewReason,
        }
      );
      setActionMessage(
        `${reviewAction.product.title} 已${reviewActionCopy[reviewAction.action]}`
      );
      setReviewAction(undefined);
      setReviewReason("");
      await loadProducts();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "课程商品审核状态更新失败"
      );
    } finally {
      setMutatingProductId(undefined);
    }
  }, [catalogPermissions.canReview, loadProducts, reviewAction, reviewReason]);

  const submitBasicInfoUpdate = useCallback(async () => {
    if (!infoEditor) return;
    if (!catalogPermissions.canEdit) {
      setActionError("当前账号暂无课程商品编辑权限");
      return;
    }

    const learners = Number(infoForm.learners);
    if (!Number.isInteger(learners) || learners < 0) {
      setActionError("请填写有效的学习人数");
      return;
    }

    const request: CourseProductBasicInfoUpdateRequest = {
      title: infoForm.title,
      coverUrl: infoForm.coverUrl,
      category: infoForm.category,
      type: infoForm.type,
      instructorName: infoForm.instructorName,
      learners,
      reason: infoForm.reason,
    };

    setMutatingProductId(infoEditor.id);
    setActionError(undefined);
    setActionMessage(undefined);

    try {
      await httpCourseProductRepository.updateCourseProductBasicInfo(
        infoEditor.id,
        request
      );
      setActionMessage(`${infoEditor.title} 基础信息已更新`);
      setInfoEditor(undefined);
      await loadProducts();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "课程商品基础信息更新失败"
      );
    } finally {
      setMutatingProductId(undefined);
    }
  }, [catalogPermissions.canEdit, infoEditor, infoForm, loadProducts]);

  const updateContentChapter = useCallback(
    (
      chapterIndex: number,
      patch: Partial<Omit<ContentChapterFormState, "materialPlaceholders">>
    ) => {
      setContentForm(current => ({
        ...current,
        chapters: current.chapters.map((chapter, index) =>
          index === chapterIndex ? { ...chapter, ...patch } : chapter
        ),
      }));
    },
    []
  );

  const updateContentMaterial = useCallback(
    (
      chapterIndex: number,
      materialIndex: number,
      patch: Partial<ContentMaterialFormState>
    ) => {
      setContentForm(current => ({
        ...current,
        chapters: current.chapters.map((chapter, index) => {
          if (index !== chapterIndex) return chapter;
          return {
            ...chapter,
            materialPlaceholders: chapter.materialPlaceholders.map(
              (material, innerIndex) =>
                innerIndex === materialIndex
                  ? { ...material, ...patch }
                  : material
            ),
          };
        }),
      }));
    },
    []
  );

  const applyAssetToContentMaterial = useCallback(
    (
      chapterIndex: number,
      materialIndex: number,
      asset: CourseProductAsset
    ) => {
      if (!contentEditor || !isBindableLearningAsset(asset)) return;

      updateContentMaterial(chapterIndex, materialIndex, {
        title: asset.title,
        type: materialTypeFromAssetKind(asset.kind),
        status: "ready",
        assetId: asset.id,
        assetUrl: courseAssetDownloadUrl(contentEditor.courseId, asset.id),
        uploadedBy: asset.uploadedBy,
        uploadedAt: asset.uploadedAt,
        complianceStatus: asset.complianceStatus,
        downloadEnabled: asset.downloadEnabled,
        note: asset.note ?? "",
      });
    },
    [contentEditor, updateContentMaterial]
  );

  const updateMerchandising = useCallback(
    (patch: Partial<Omit<ContentMerchandisingFormState, "imageAssets">>) => {
      setContentForm(current => ({
        ...current,
        merchandising: {
          ...current.merchandising,
          ...patch,
        },
      }));
    },
    []
  );

  const updateMerchandisingAsset = useCallback(
    (
      assetIndex: number,
      patch: Partial<ContentMerchandisingAssetFormState>
    ) => {
      setContentForm(current => ({
        ...current,
        merchandising: {
          ...current.merchandising,
          imageAssets: current.merchandising.imageAssets.map((asset, index) =>
            index === assetIndex ? { ...asset, ...patch } : asset
          ),
        },
      }));
    },
    []
  );

  const addMerchandisingAsset = useCallback(() => {
    if (!contentEditor) return;
    setContentForm(current => ({
      ...current,
      merchandising: {
        ...current.merchandising,
        imageAssets: [
          ...current.merchandising.imageAssets,
          createMerchandisingAsset(
            contentEditor.id,
            current.merchandising.imageAssets.length + 1
          ),
        ],
      },
    }));
  }, [contentEditor]);

  const removeMerchandisingAsset = useCallback((assetIndex: number) => {
    setContentForm(current => ({
      ...current,
      merchandising: {
        ...current.merchandising,
        imageAssets: current.merchandising.imageAssets.filter(
          (_, index) => index !== assetIndex
        ),
      },
    }));
  }, []);

  const applyAssetToMerchandising = useCallback(
    (
      asset: CourseProductAsset,
      usage: CourseProductMerchandisingAssetUsage
    ) => {
      if (!isUsableAssetUrl(asset.publicUrl)) {
        setActionError("当前详情图文只支持 http(s) 或同源 API 素材地址");
        return;
      }

      setActionError(undefined);
      setContentForm(current => {
        if (usage === "showcase") {
          return {
            ...current,
            merchandising: {
              ...current.merchandising,
              showcaseImageUrl: asset.publicUrl ?? "",
              showcaseImageAlt:
                asset.altText || current.merchandising.showcaseImageAlt,
            },
          };
        }

        const nextAsset: ContentMerchandisingAssetFormState = {
          id: asset.id,
          title: asset.title,
          imageUrl: asset.publicUrl ?? "",
          altText: asset.altText ?? "",
          usage,
          complianceStatus: asset.complianceStatus,
          note: asset.note ?? "",
        };

        return {
          ...current,
          merchandising: {
            ...current.merchandising,
            imageAssets: [
              ...current.merchandising.imageAssets.filter(
                item => item.id !== asset.id
              ),
              nextAsset,
            ],
          },
        };
      });
    },
    []
  );

  const submitAssetUpload = useCallback(async () => {
    if (!contentEditor) return;
    if (!catalogPermissions.canEdit) {
      setActionError("当前账号暂无课程商品编辑权限");
      return;
    }

    const sizeBytes = assetForm.file
      ? assetForm.file.size
      : assetForm.sizeBytes.trim()
        ? Number(assetForm.sizeBytes)
        : undefined;
    if (
      sizeBytes !== undefined &&
      (!Number.isInteger(sizeBytes) || sizeBytes < 0)
    ) {
      setActionError("请填写有效的素材大小");
      return;
    }

    setMutatingAssetId("upload");
    setActionError(undefined);
    setActionMessage(undefined);

    try {
      const commonRequest = {
        title: assetForm.title,
        kind: assetForm.kind,
        mimeType: assetForm.mimeType,
        sizeBytes,
        chapterId: assetForm.chapterId.trim() || undefined,
        altText: assetForm.altText.trim() ? assetForm.altText : undefined,
        note: assetForm.note.trim() ? assetForm.note : undefined,
        reason: assetForm.reason,
      };
      const result = assetForm.file
        ? await httpCourseProductRepository.uploadCourseProductAssetFile(
            contentEditor.id,
            {
              ...commonRequest,
              fileName: assetForm.file.name,
              file: assetForm.file,
            }
          )
        : await httpCourseProductRepository.uploadCourseProductAsset(
            contentEditor.id,
            {
              ...commonRequest,
              sourceUrl: assetForm.sourceUrl,
            }
          );
      setContentAssets(result.assets);
      setAssetForm(createAssetFormState());
      setActionMessage("课程素材已上传登记，待合规确认后可用于前台展示或下载");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "课程素材上传失败");
    } finally {
      setMutatingAssetId(undefined);
    }
  }, [assetForm, catalogPermissions.canEdit, contentEditor]);

  const updateAssetCompliance = useCallback(
    async (
      asset: CourseProductAsset,
      complianceStatus: "approved" | "rejected"
    ) => {
      if (!contentEditor) return;
      if (!catalogPermissions.canReview) {
        setActionError("当前账号暂无课程商品审核权限");
        return;
      }

      setMutatingAssetId(asset.id);
      setActionError(undefined);
      setActionMessage(undefined);

      try {
        const result =
          await httpCourseProductRepository.updateCourseProductAssetCompliance(
            contentEditor.id,
            asset.id,
            {
              complianceStatus,
              downloadEnabled:
                complianceStatus === "approved" &&
                isDownloadableCourseAsset(asset),
              reason:
                complianceStatus === "approved"
                  ? "素材来源和内容已完成合规确认"
                  : "素材未通过合规检查",
            }
          );
        setContentAssets(result.assets);
        setActionMessage(
          complianceStatus === "approved"
            ? "课程素材已通过合规确认"
            : "课程素材已标记为驳回"
        );
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "课程素材合规处理失败"
        );
      } finally {
        setMutatingAssetId(undefined);
      }
    },
    [catalogPermissions.canReview, contentEditor]
  );

  const addContentChapter = useCallback(() => {
    if (!contentEditor) return;
    setContentForm(current => ({
      ...current,
      chapters: [
        ...current.chapters,
        createContentChapter(contentEditor.id, current.chapters.length + 1),
      ],
    }));
  }, [contentEditor]);

  const removeContentChapter = useCallback((chapterIndex: number) => {
    setContentForm(current => ({
      ...current,
      chapters: current.chapters.filter((_, index) => index !== chapterIndex),
    }));
  }, []);

  const addContentMaterial = useCallback((chapterIndex: number) => {
    setContentForm(current => ({
      ...current,
      chapters: current.chapters.map((chapter, index) => {
        if (index !== chapterIndex) return chapter;
        return {
          ...chapter,
          materialPlaceholders: [
            ...chapter.materialPlaceholders,
            createContentMaterial(
              chapter.id,
              chapter.materialPlaceholders.length + 1
            ),
          ],
        };
      }),
    }));
  }, []);

  const removeContentMaterial = useCallback(
    (chapterIndex: number, materialIndex: number) => {
      setContentForm(current => ({
        ...current,
        chapters: current.chapters.map((chapter, index) => {
          if (index !== chapterIndex) return chapter;
          return {
            ...chapter,
            materialPlaceholders: chapter.materialPlaceholders.filter(
              (_, innerIndex) => innerIndex !== materialIndex
            ),
          };
        }),
      }));
    },
    []
  );

  const submitContentUpdate = useCallback(async () => {
    if (!contentEditor) return;
    if (!catalogPermissions.canEdit) {
      setActionError("当前账号暂无课程商品编辑权限");
      return;
    }

    const targetAudience = targetAudienceFromText(
      contentForm.targetAudienceText
    );
    const chapters = chaptersFromContentForm(contentForm.chapters);

    if (targetAudience.length < 1) {
      setActionError("请至少填写一个适合人群");
      return;
    }
    if (
      chapters.length < 1 ||
      chapters.some(
        chapter =>
          chapter.title.trim().length < 2 ||
          !Number.isInteger(chapter.durationMinutes) ||
          chapter.durationMinutes < 1 ||
          chapter.materialPlaceholders.some(
            material => material.title.trim().length < 2
          )
      )
    ) {
      setActionError("请填写有效的章节和素材信息");
      return;
    }

    const request: CourseProductContentUpdateRequest = {
      summary: contentForm.summary,
      targetAudience,
      merchandising: merchandisingFromContentForm(contentForm.merchandising),
      chapters,
      reason: contentForm.reason,
    };

    setMutatingProductId(contentEditor.id);
    setActionError(undefined);
    setActionMessage(undefined);

    try {
      await httpCourseProductRepository.updateCourseProductContent(
        contentEditor.id,
        request
      );
      setActionMessage(`${contentEditor.title} 详情内容已更新，需重新审核`);
      setContentEditor(undefined);
      await loadProducts();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "课程商品详情内容更新失败"
      );
    } finally {
      setMutatingProductId(undefined);
    }
  }, [catalogPermissions.canEdit, contentEditor, contentForm, loadProducts]);

  const submitPriceUpdate = useCallback(async () => {
    if (!priceEditor) return;
    if (!catalogPermissions.canPrice) {
      setActionError("当前账号暂无课程商品价格权限");
      return;
    }

    const amount = priceForm.isFree ? 0 : Number(priceForm.amount);
    const originalAmount = Number(priceForm.originalAmount || amount);

    if (!Number.isFinite(amount) || !Number.isFinite(originalAmount)) {
      setActionError("请填写有效的课程价格");
      return;
    }

    const request: CourseProductPriceUpdateRequest = {
      amount,
      originalAmount,
      isFree: priceForm.isFree,
      memberIncluded: priceForm.memberIncluded,
      reason: priceForm.reason,
    };

    setMutatingProductId(priceEditor.id);
    setActionError(undefined);
    setActionMessage(undefined);

    try {
      await httpCourseProductRepository.updateCourseProductPrice(
        priceEditor.id,
        request
      );
      setActionMessage(`${priceEditor.title} 价格已更新`);
      setPriceEditor(undefined);
      await loadProducts();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "课程商品价格更新失败"
      );
    } finally {
      setMutatingProductId(undefined);
    }
  }, [catalogPermissions.canPrice, loadProducts, priceEditor, priceForm]);

  const categories = useMemo(
    () => [ALL_COURSE_PRODUCT_CATEGORY, ...COURSE_CATEGORIES],
    []
  );
  const items = data?.items ?? [];
  const locateGovernanceAsset = useCallback(
    (item: CourseProductAssetGovernanceItem) => {
      setActionError(undefined);
      setActionMessage(undefined);

      if (!item.product) {
        setActionError("该素材指向的课程商品不存在，请先核对素材归属数据。");
        return;
      }

      const localProduct = items.find(
        product => product.id === item.product?.id
      );
      if (catalogPermissions.canEdit && localProduct) {
        void openContentEditor(localProduct);
        return;
      }

      const keyword = item.product.title;
      setKeywordDraft(keyword);
      setQuery(current => ({
        ...current,
        keyword,
        page: 1,
      }));
      setActionMessage(
        `已按「${keyword}」定位课程商品；如需管理素材，请打开该商品内容面板。`
      );
    },
    [catalogPermissions.canEdit, items, openContentEditor]
  );

  const updateAssetGovernanceHistoryFilters = useCallback(
    (patch: Partial<AssetGovernanceHistoryFilterState>) => {
      setAssetGovernanceHistoryFilters(current => ({
        ...current,
        ...patch,
      }));
    },
    []
  );

  const openGovernanceAction = useCallback(
    (action: AssetGovernanceActionState) => {
      if (!catalogPermissions.canReview) {
        setActionError("当前账号暂无课程素材治理权限");
        return;
      }
      setActionError(undefined);
      setActionMessage(undefined);
      setGovernanceAction(action);
      setGovernanceReason("");
      setGovernanceNote("");
    },
    [catalogPermissions.canReview]
  );

  const submitGovernanceAction = useCallback(async () => {
    if (!governanceAction) return;
    if (!catalogPermissions.canReview) {
      setActionError("当前账号暂无课程素材治理权限");
      return;
    }

    const reason = governanceReason.trim();
    if (reason.length < 4) {
      setActionError("请填写至少 4 个字的治理原因");
      return;
    }

    const { item, action, issueType, primaryAssetId } = governanceAction;
    setMutatingAssetId(item.asset.id);
    setActionError(undefined);
    setActionMessage(undefined);

    try {
      const result =
        await httpCourseProductRepository.applyCourseProductAssetGovernanceAction(
          item.asset.productId,
          item.asset.id,
          {
            action,
            issueType,
            primaryAssetId,
            reason,
            note: governanceNote.trim() || undefined,
          }
        );
      setAssetGovernance(result.governance);
      setContentAssets(current =>
        current.map(asset =>
          asset.id === result.asset.id ? result.asset : asset
        )
      );
      setGovernanceAction(undefined);
      setGovernanceReason("");
      setGovernanceNote("");
      setActionMessage(
        `${item.asset.title} 已${assetGovernanceActionCopy[action]}`
      );
      await loadProducts();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "课程素材治理动作失败"
      );
    } finally {
      setMutatingAssetId(undefined);
    }
  }, [
    catalogPermissions.canReview,
    governanceAction,
    governanceNote,
    governanceReason,
    loadProducts,
  ]);

  const openAssetGovernanceBatchTaskDraft = useCallback(() => {
    if (!catalogPermissions.canReview) {
      setActionError("当前账号暂无课程素材治理权限");
      return;
    }
    if (!assetGovernanceBatchDraft) {
      setActionError("请先读取批量治理草稿预览");
      return;
    }
    if (assetGovernanceBatchDraft.summary.candidateAssetCount < 1) {
      setActionError("当前筛选没有可保存的治理候选");
      return;
    }

    setActionError(undefined);
    setActionMessage(undefined);
    setAssetGovernanceBatchTaskReason("");
    setAssetGovernanceBatchTaskNote("");
    setIsAssetGovernanceBatchTaskDraftOpen(true);
  }, [assetGovernanceBatchDraft, catalogPermissions.canReview]);

  const submitAssetGovernanceBatchTaskDraft = useCallback(async () => {
    if (!catalogPermissions.canReview) {
      setActionError("当前账号暂无课程素材治理权限");
      return;
    }

    const reason = assetGovernanceBatchTaskReason.trim();
    if (reason.length < 4) {
      setActionError("请填写至少 4 个字的草案原因");
      return;
    }

    setMutatingBatchTaskId("create");
    setActionError(undefined);
    setActionMessage(undefined);

    try {
      const result =
        await httpCourseProductRepository.createCourseProductAssetGovernanceBatchTask(
          assetGovernanceBatchTaskCreateRequestFromPanelFilter(
            assetGovernanceFilter,
            reason,
            assetGovernanceBatchTaskNote
          )
        );
      setAssetGovernanceBatchTasks(result.tasks);
      setIsAssetGovernanceBatchTaskDraftOpen(false);
      setAssetGovernanceBatchTaskReason("");
      setAssetGovernanceBatchTaskNote("");
      setActionMessage(
        `已保存批量治理草案，候选素材 ${result.task.candidateAssetCount} 个，等待审批`
      );
      await loadProducts();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "课程素材批量治理任务创建失败"
      );
    } finally {
      setMutatingBatchTaskId(undefined);
    }
  }, [
    assetGovernanceBatchTaskNote,
    assetGovernanceBatchTaskReason,
    assetGovernanceFilter,
    catalogPermissions.canReview,
    loadProducts,
  ]);

  const openAssetGovernanceBatchTaskReview = useCallback(
    (
      task: CourseProductAssetGovernanceBatchTask,
      action: CourseProductAssetGovernanceBatchTaskReviewAction
    ) => {
      if (!catalogPermissions.canReview) {
        setActionError("当前账号暂无课程素材治理权限");
        return;
      }
      setActionError(undefined);
      setActionMessage(undefined);
      setAssetGovernanceBatchTaskReview({ task, action });
      setAssetGovernanceBatchTaskReviewReason("");
    },
    [catalogPermissions.canReview]
  );

  const submitAssetGovernanceBatchTaskReview = useCallback(async () => {
    if (!assetGovernanceBatchTaskReview) return;
    if (!catalogPermissions.canReview) {
      setActionError("当前账号暂无课程素材治理权限");
      return;
    }

    const reason = assetGovernanceBatchTaskReviewReason.trim();
    if (reason.length < 4) {
      setActionError("请填写至少 4 个字的审批原因");
      return;
    }

    const { task, action } = assetGovernanceBatchTaskReview;
    setMutatingBatchTaskId(task.id);
    setActionError(undefined);
    setActionMessage(undefined);

    try {
      const result =
        await httpCourseProductRepository.reviewCourseProductAssetGovernanceBatchTask(
          task.id,
          assetGovernanceBatchTaskReviewRequestFromAction(action, reason)
        );
      setAssetGovernanceBatchTasks(result.tasks);
      setAssetGovernanceBatchTaskReview(undefined);
      setAssetGovernanceBatchTaskReviewReason("");
      setActionMessage(
        `批量治理草案已${action === "approve" ? "通过审批" : "驳回"}`
      );
      await loadProducts();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "课程素材批量治理任务审批失败";
      setActionError(message);
      if (message.includes("预检变化较大")) {
        await loadProducts();
      }
    } finally {
      setMutatingBatchTaskId(undefined);
    }
  }, [
    assetGovernanceBatchTaskReview,
    assetGovernanceBatchTaskReviewReason,
    catalogPermissions.canReview,
    loadProducts,
  ]);

  const openAssetGovernanceBatchTaskCancel = useCallback(
    (task: CourseProductAssetGovernanceBatchTask) => {
      if (!catalogPermissions.canReview) {
        setActionError("当前账号暂无课程素材治理权限");
        return;
      }
      setActionError(undefined);
      setActionMessage(undefined);
      setAssetGovernanceBatchTaskCancel({ task });
      setAssetGovernanceBatchTaskCancelReason("");
    },
    [catalogPermissions.canReview]
  );

  const submitAssetGovernanceBatchTaskCancel = useCallback(async () => {
    if (!assetGovernanceBatchTaskCancel) return;
    if (!catalogPermissions.canReview) {
      setActionError("当前账号暂无课程素材治理权限");
      return;
    }

    const reason = assetGovernanceBatchTaskCancelReason.trim();
    if (reason.length < 4) {
      setActionError("请填写至少 4 个字的取消原因");
      return;
    }

    const { task } = assetGovernanceBatchTaskCancel;
    setMutatingBatchTaskId(task.id);
    setActionError(undefined);
    setActionMessage(undefined);

    try {
      const result =
        await httpCourseProductRepository.cancelCourseProductAssetGovernanceBatchTask(
          task.id,
          {
            reason,
          }
        );
      setAssetGovernanceBatchTasks(result.tasks);
      setAssetGovernanceBatchTaskCancel(undefined);
      setAssetGovernanceBatchTaskCancelReason("");
      setActionMessage("批量治理草案已取消");
      await loadProducts();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "课程素材批量治理任务取消失败"
      );
    } finally {
      setMutatingBatchTaskId(undefined);
    }
  }, [
    assetGovernanceBatchTaskCancel,
    assetGovernanceBatchTaskCancelReason,
    catalogPermissions.canReview,
    loadProducts,
  ]);

  const meta = data?.meta;
  const auditEvents = data?.auditEvents ?? [];
  const rejectedReviewReasons = useMemo(() => {
    const reasons = new Map<string, string>();
    auditEvents.forEach(event => {
      if (
        event.action === "review_update" &&
        event.after.reviewStatus === "rejected" &&
        !reasons.has(event.productId)
      ) {
        reasons.set(event.productId, event.reason);
      }
    });
    return reasons;
  }, [auditEvents]);
  const contentQuality = useMemo(() => {
    if (!contentEditor) return undefined;
    return contentQualityFromForm(contentEditor.id, contentForm);
  }, [contentEditor, contentForm]);
  const hasPreviousPage = Boolean(meta && meta.page > 1);
  const hasNextPage = Boolean(meta && meta.page < meta.totalPages);

  if (isAuthSyncing || !isLoggedIn || !catalogPermissions.canRead) {
    return null;
  }

  return (
    <div className="text-[#243B35]">
      <section className="flex flex-col gap-4 border-b border-[#E1D7C8] pb-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B7E6D]">
            课程商品
          </p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
            商品列表与状态
          </h1>
          <p className="mt-3 max-w-[760px] text-sm leading-6 text-[#6F7771]">
            统一管理课程商品的基础信息、详情内容、审核流、上架状态、价格和审计记录，已联动前台发布可见性，支持搜索、分类、排序和分页核对。
          </p>
        </div>
        <button
          onClick={() => void loadProducts()}
          disabled={isLoading}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-lg border border-[#CFC4B5] bg-[#FFFDF8] px-4 text-sm font-semibold text-[#355F51] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          刷新
        </button>
      </section>

      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-[#EDCDBF] bg-[#FFF4EF] px-4 py-3 text-sm text-[#A65F48]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {actionError && (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-[#EDCDBF] bg-[#FFF4EF] px-4 py-3 text-sm text-[#A65F48]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}
      {actionMessage && (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-[#C8D8C8] bg-[#EEF6ED] px-4 py-3 text-sm text-[#41675A]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 grid border-y border-[#E1D7C8] bg-[#FFFDF8] md:grid-cols-4"
      >
        {metricItems(data).map(item => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center justify-between border-b border-[#E8DED0] px-4 py-4 md:border-b-0 md:border-r last:md:border-r-0"
            >
              <div>
                <p className="text-xs text-[#8A8176]">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold text-[#243B35]">
                  {item.value}
                </p>
              </div>
              <Icon className="h-5 w-5 text-[#6F8F83]" />
            </div>
          );
        })}
      </motion.section>

      <AuditTrail events={auditEvents} />

      <CourseProductAssetGovernancePanel
        governance={assetGovernance}
        history={assetGovernanceHistory}
        batchDraft={assetGovernanceBatchDraft}
        batchTasks={assetGovernanceBatchTasks}
        filter={assetGovernanceFilter}
        historyFilters={assetGovernanceHistoryFilters}
        canEdit={catalogPermissions.canEdit}
        canReview={catalogPermissions.canReview}
        mutatingAssetId={mutatingAssetId}
        isBatchTaskMutating={Boolean(mutatingBatchTaskId)}
        onFilterChange={setAssetGovernanceFilter}
        onHistoryFiltersChange={updateAssetGovernanceHistoryFilters}
        onRefreshGovernanceData={() => void loadProducts()}
        onLocateAsset={locateGovernanceAsset}
        onOpenGovernanceAction={openGovernanceAction}
        onOpenBatchTaskDraft={openAssetGovernanceBatchTaskDraft}
        onOpenBatchTaskReview={openAssetGovernanceBatchTaskReview}
        onOpenBatchTaskCancel={openAssetGovernanceBatchTaskCancel}
      />

      <section className="mt-6 overflow-hidden rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] shadow-sm shadow-[#243B35]/5">
        <form
          onSubmit={event => {
            event.preventDefault();
            setQuery(current => ({
              ...current,
              keyword: keywordDraft,
              page: 1,
            }));
          }}
          className="grid gap-3 border-b border-[#E8DED0] px-4 py-4 lg:grid-cols-[minmax(240px,1fr)_180px_150px_170px_auto] lg:items-center lg:px-5"
        >
          <label className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8176]" />
            <input
              value={keywordDraft}
              onChange={event => setKeywordDraft(event.target.value)}
              placeholder="搜索课程、讲师、分类或 ID"
              className="h-10 w-full rounded-lg border border-[#D8CEC0] bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
            />
          </label>

          <select
            value={query.category}
            onChange={event =>
              setQuery(current => ({
                ...current,
                category: event.target.value as CourseProductCategoryFilter,
                page: 1,
              }))
            }
            className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm text-[#41524B] outline-none transition focus:border-[#6F8F83]"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={query.status}
            onChange={event =>
              setQuery(current => ({
                ...current,
                status: event.target.value as CourseProductStatusFilter,
                page: 1,
              }))
            }
            className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm text-[#41524B] outline-none transition focus:border-[#6F8F83]"
          >
            {statusFilters.map(item => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            value={query.sort}
            onChange={event =>
              setQuery(current => ({
                ...current,
                sort: event.target.value as CourseProductListQuery["sort"],
                page: 1,
              }))
            }
            className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm text-[#41524B] outline-none transition focus:border-[#6F8F83]"
          >
            {sortOptions.map(item => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047]">
            <ListFilter className="h-4 w-4" />
            筛选
          </button>
        </form>

        {isLoading && !data ? (
          <div className="flex min-h-[420px] items-center justify-center text-sm text-[#6F7771]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            正在读取课程商品
          </div>
        ) : items.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1320px] text-left">
                <thead className="bg-[#F8F3EA] text-xs text-[#8A8176]">
                  <tr>
                    <th className="px-5 py-3 font-semibold">商品</th>
                    <th className="px-5 py-3 font-semibold">分类</th>
                    <th className="px-5 py-3 font-semibold">讲师与学习</th>
                    <th className="px-5 py-3 font-semibold">价格</th>
                    <th className="px-5 py-3 font-semibold">状态</th>
                    <th className="px-5 py-3 font-semibold">更新时间</th>
                    <th className="px-5 py-3 font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <CourseProductRow
                      key={item.id}
                      item={item}
                      index={index}
                      isMutating={Boolean(mutatingProductId)}
                      contentQuality={contentQualityByProductId[item.id]}
                      canEdit={catalogPermissions.canEdit}
                      canReview={catalogPermissions.canReview}
                      canPublish={catalogPermissions.canPublish}
                      canPrice={catalogPermissions.canPrice}
                      reviewBlockReason={rejectedReviewReasons.get(item.id)}
                      onEditInfo={openInfoEditor}
                      onEditContent={openContentEditor}
                      onEditPrice={openPriceEditor}
                      onRequestReviewAction={openReviewAction}
                      onRequestStatusChange={openStatusAction}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#E8DED0] px-4 py-4 text-sm text-[#6F7771] md:flex-row md:items-center md:justify-between md:px-5">
              <span>
                第 {meta?.page ?? 1} / {meta?.totalPages ?? 1} 页，共{" "}
                {meta?.total ?? 0} 个商品
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setQuery(current => ({
                      ...current,
                      page: Math.max(1, current.page - 1),
                    }))
                  }
                  disabled={!hasPreviousPage || isLoading}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一页
                </button>
                <button
                  onClick={() =>
                    setQuery(current => ({
                      ...current,
                      page: current.page + 1,
                    }))
                  }
                  disabled={!hasNextPage || isLoading}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  下一页
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
            <BadgeCheck className="h-8 w-8 text-[#7C9288]" />
            <h2 className="mt-4 text-lg font-semibold">暂无匹配商品</h2>
            <p className="mt-2 max-w-[420px] text-sm leading-6 text-[#6F7771]">
              调整搜索关键词、分类或状态后重新筛选。
            </p>
          </div>
        )}
      </section>

      {statusAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18231F]/45 px-4">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-[520px] rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#8A8176]">状态动作</p>
                <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                  {statusAction.targetStatus === "published"
                    ? "上架课程商品"
                    : "下架课程商品"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6F7771]">
                  {statusAction.product.title}
                </p>
              </div>
              <button
                onClick={() => setStatusAction(undefined)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7D746B] transition hover:bg-[#F1E8DC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-5 block text-sm font-semibold text-[#41524B]">
              操作原因
              <textarea
                value={statusReason}
                onChange={event => setStatusReason(event.target.value)}
                placeholder="例如：内容完成复核，允许本周活动曝光"
                className="mt-2 min-h-[96px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
              />
            </label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setStatusAction(undefined)}
                className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-4 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
              >
                取消
              </button>
              <button
                onClick={() => void submitStatusAction()}
                disabled={
                  statusReason.trim().length < 4 || Boolean(mutatingProductId)
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutatingProductId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : statusAction.targetStatus === "published" ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                确认
                {statusAction.targetStatus === "published" ? "上架" : "下架"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {reviewAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18231F]/45 px-4">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-[520px] rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#8A8176]">审核动作</p>
                <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                  {reviewActionCopy[reviewAction.action]}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6F7771]">
                  {reviewAction.product.title} ·{" "}
                  {reviewCopy[reviewAction.product.reviewStatus]} {"->"}{" "}
                  {reviewCopy[reviewAction.targetReviewStatus]}
                </p>
              </div>
              <button
                onClick={() => setReviewAction(undefined)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7D746B] transition hover:bg-[#F1E8DC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-5 block text-sm font-semibold text-[#41524B]">
              审核原因
              <textarea
                value={reviewReason}
                onChange={event => setReviewReason(event.target.value)}
                placeholder={
                  reviewAction.action === "reject"
                    ? "例如：章节素材缺少课后练习说明"
                    : "例如：课程内容和素材已完成审核确认"
                }
                className="mt-2 min-h-[96px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
              />
            </label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setReviewAction(undefined)}
                className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-4 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
              >
                取消
              </button>
              <button
                onClick={() => void submitReviewAction()}
                disabled={
                  reviewReason.trim().length < 4 || Boolean(mutatingProductId)
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutatingProductId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardCheck className="h-4 w-4" />
                )}
                确认{reviewActionCopy[reviewAction.action]}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {governanceAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18231F]/45 px-4">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-[540px] rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#8A8176]">
                  素材治理动作
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                  {assetGovernanceActionCopy[governanceAction.action]}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6F7771]">
                  {governanceAction.item.asset.title} ·{" "}
                  {assetGovernanceIssueCopy[governanceAction.issueType]}
                </p>
              </div>
              <button
                onClick={() => setGovernanceAction(undefined)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7D746B] transition hover:bg-[#F1E8DC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {governanceAction.primaryAssetId && (
              <div className="mt-4 rounded-lg border border-[#D8CEC0] bg-[#FBF7EF] px-3 py-2 text-xs leading-5 text-[#6F7771]">
                主素材 ID：{governanceAction.primaryAssetId}
              </div>
            )}

            <label className="mt-5 block text-sm font-semibold text-[#41524B]">
              治理原因
              <textarea
                value={governanceReason}
                onChange={event => setGovernanceReason(event.target.value)}
                placeholder="例如：重复素材已确认保留该主素材，后续合并引用"
                className="mt-2 min-h-[88px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold text-[#41524B]">
              处理备注
              <textarea
                value={governanceNote}
                onChange={event => setGovernanceNote(event.target.value)}
                placeholder="可补充后续动作、引用合并计划或软删除确认依据"
                className="mt-2 min-h-[72px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
              />
            </label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setGovernanceAction(undefined)}
                className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-4 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
              >
                取消
              </button>
              <button
                onClick={() => void submitGovernanceAction()}
                disabled={
                  governanceReason.trim().length < 4 || Boolean(mutatingAssetId)
                }
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  governanceAction.action === "mark_soft_deleted"
                    ? "bg-[#AD503A] text-white hover:bg-[#9D4935]"
                    : "bg-[#243B35] text-white hover:bg-[#315047]"
                }`}
              >
                {mutatingAssetId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : governanceAction.action === "mark_soft_deleted" ? (
                  <Trash2 className="h-4 w-4" />
                ) : (
                  <ClipboardCheck className="h-4 w-4" />
                )}
                确认{assetGovernanceActionCopy[governanceAction.action]}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {isAssetGovernanceBatchTaskDraftOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18231F]/45 px-4">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-[560px] rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#8A8176]">
                  批量治理草案
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                  保存为待审批任务
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6F7771]">
                  本次仅记录处理草案，不修改素材状态、引用关系或对象文件。
                </p>
              </div>
              <button
                onClick={() => setIsAssetGovernanceBatchTaskDraftOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7D746B] transition hover:bg-[#F1E8DC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-[#E1D7C8] bg-[#FBF7EF] px-3 py-3 text-xs">
              <div>
                <p className="text-[#8A8176]">候选素材</p>
                <p className="mt-1 text-base font-semibold text-[#243B35]">
                  {assetGovernanceBatchDraft?.summary.candidateAssetCount ?? 0}
                </p>
              </div>
              <div>
                <p className="text-[#8A8176]">可记录动作</p>
                <p className="mt-1 text-base font-semibold text-[#243B35]">
                  {assetGovernanceBatchDraft?.summary.eligibleActionCount ?? 0}
                </p>
              </div>
              <div>
                <p className="text-[#8A8176]">需复核</p>
                <p className="mt-1 text-base font-semibold text-[#243B35]">
                  {assetGovernanceBatchDraft?.summary.manualReviewAssetCount ??
                    0}
                </p>
              </div>
            </div>

            <label className="mt-5 block text-sm font-semibold text-[#41524B]">
              草案原因
              <textarea
                value={assetGovernanceBatchTaskReason}
                onChange={event =>
                  setAssetGovernanceBatchTaskReason(event.target.value)
                }
                placeholder="例如：本周先统一记录未引用素材处理意见，待负责人审批后再执行"
                className="mt-2 min-h-[88px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold text-[#41524B]">
              草案备注
              <textarea
                value={assetGovernanceBatchTaskNote}
                onChange={event =>
                  setAssetGovernanceBatchTaskNote(event.target.value)
                }
                placeholder="可补充筛选口径、审批负责人或后续执行边界"
                className="mt-2 min-h-[72px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
              />
            </label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setIsAssetGovernanceBatchTaskDraftOpen(false)}
                className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-4 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
              >
                取消
              </button>
              <button
                onClick={() => void submitAssetGovernanceBatchTaskDraft()}
                disabled={
                  assetGovernanceBatchTaskReason.trim().length < 4 ||
                  Boolean(mutatingBatchTaskId)
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutatingBatchTaskId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardCheck className="h-4 w-4" />
                )}
                保存草案
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {assetGovernanceBatchTaskReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18231F]/45 px-4">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-[560px] rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#8A8176]">
                  批量草案审批
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                  {
                    assetGovernanceBatchTaskReviewActionCopy[
                      assetGovernanceBatchTaskReview.action
                    ]
                  }
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6F7771]">
                  审批会先重新校验候选范围；本步骤仍不修改素材状态、引用关系或对象文件。
                </p>
              </div>
              <button
                onClick={() => setAssetGovernanceBatchTaskReview(undefined)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7D746B] transition hover:bg-[#F1E8DC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-[#E1D7C8] bg-[#FBF7EF] px-3 py-3 text-xs">
              <div>
                <p className="text-[#8A8176]">候选素材</p>
                <p className="mt-1 text-base font-semibold text-[#243B35]">
                  {assetGovernanceBatchTaskReview.task.candidateAssetCount}
                </p>
              </div>
              <div>
                <p className="text-[#8A8176]">可记录动作</p>
                <p className="mt-1 text-base font-semibold text-[#243B35]">
                  {assetGovernanceBatchTaskReview.task.eligibleActionCount}
                </p>
              </div>
              <div>
                <p className="text-[#8A8176]">需复核</p>
                <p className="mt-1 text-base font-semibold text-[#243B35]">
                  {assetGovernanceBatchTaskReview.task.manualReviewAssetCount}
                </p>
              </div>
            </div>

            <label className="mt-5 block text-sm font-semibold text-[#41524B]">
              审批原因
              <textarea
                value={assetGovernanceBatchTaskReviewReason}
                onChange={event =>
                  setAssetGovernanceBatchTaskReviewReason(event.target.value)
                }
                placeholder={
                  assetGovernanceBatchTaskReview.action === "approve"
                    ? "例如：候选范围和处理口径已复核，允许进入后续执行预案"
                    : "例如：候选范围需要重新确认，先驳回当前草案"
                }
                className="mt-2 min-h-[88px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
              />
            </label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setAssetGovernanceBatchTaskReview(undefined)}
                className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-4 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
              >
                取消
              </button>
              <button
                onClick={() => void submitAssetGovernanceBatchTaskReview()}
                disabled={
                  assetGovernanceBatchTaskReviewReason.trim().length < 4 ||
                  Boolean(mutatingBatchTaskId)
                }
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  assetGovernanceBatchTaskReview.action === "approve"
                    ? "bg-[#243B35] text-white hover:bg-[#315047]"
                    : "bg-[#AD503A] text-white hover:bg-[#9D4935]"
                }`}
              >
                {mutatingBatchTaskId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : assetGovernanceBatchTaskReview.action === "approve" ? (
                  <ClipboardCheck className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                确认
                {
                  assetGovernanceBatchTaskReviewActionCopy[
                    assetGovernanceBatchTaskReview.action
                  ]
                }
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {assetGovernanceBatchTaskCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18231F]/45 px-4">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-[520px] rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#8A8176]">
                  取消批量草案
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                  {assetGovernanceBatchTaskCancel.task.candidateAssetCount}{" "}
                  个候选素材
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6F7771]">
                  取消后草案保留历史记录，但不会进入后续审批或执行。
                </p>
              </div>
              <button
                onClick={() => setAssetGovernanceBatchTaskCancel(undefined)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7D746B] transition hover:bg-[#F1E8DC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-5 block text-sm font-semibold text-[#41524B]">
              取消原因
              <textarea
                value={assetGovernanceBatchTaskCancelReason}
                onChange={event =>
                  setAssetGovernanceBatchTaskCancelReason(event.target.value)
                }
                placeholder="例如：筛选口径需要重新确认，先取消当前草案"
                className="mt-2 min-h-[88px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
              />
            </label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setAssetGovernanceBatchTaskCancel(undefined)}
                className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-4 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
              >
                返回
              </button>
              <button
                onClick={() => void submitAssetGovernanceBatchTaskCancel()}
                disabled={
                  assetGovernanceBatchTaskCancelReason.trim().length < 4 ||
                  Boolean(mutatingBatchTaskId)
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#AD503A] px-4 text-sm font-semibold text-white transition hover:bg-[#9D4935] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutatingBatchTaskId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                确认取消
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {infoEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18231F]/45 px-4">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-[680px] rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#8A8176]">基础信息</p>
                <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                  {infoEditor.title}
                </h2>
              </div>
              <button
                onClick={() => setInfoEditor(undefined)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7D746B] transition hover:bg-[#F1E8DC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-[#41524B]">
                课程标题
                <input
                  value={infoForm.title}
                  onChange={event =>
                    setInfoForm(current => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                />
              </label>
              <label className="text-sm font-semibold text-[#41524B]">
                讲师
                <input
                  value={infoForm.instructorName}
                  onChange={event =>
                    setInfoForm(current => ({
                      ...current,
                      instructorName: event.target.value,
                    }))
                  }
                  className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                />
              </label>
            </div>

            <label className="mt-4 block text-sm font-semibold text-[#41524B]">
              封面地址
              <input
                value={infoForm.coverUrl}
                onChange={event =>
                  setInfoForm(current => ({
                    ...current,
                    coverUrl: event.target.value,
                  }))
                }
                className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
              />
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="text-sm font-semibold text-[#41524B]">
                分类
                <select
                  value={infoForm.category}
                  onChange={event =>
                    setInfoForm(current => ({
                      ...current,
                      category: event.target.value as CourseCategory,
                    }))
                  }
                  className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                >
                  {COURSE_CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-[#41524B]">
                类型
                <select
                  value={infoForm.type}
                  onChange={event =>
                    setInfoForm(current => ({
                      ...current,
                      type: event.target.value as CourseType,
                    }))
                  }
                  className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                >
                  {COURSE_TYPES.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-[#41524B]">
                学习人数
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={infoForm.learners}
                  onChange={event =>
                    setInfoForm(current => ({
                      ...current,
                      learners: event.target.value,
                    }))
                  }
                  className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                />
              </label>
            </div>

            <label className="mt-4 block text-sm font-semibold text-[#41524B]">
              更新原因
              <textarea
                value={infoForm.reason}
                onChange={event =>
                  setInfoForm(current => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
                placeholder="例如：课程封面和讲师信息完成校对"
                className="mt-2 min-h-[96px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
              />
            </label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setInfoEditor(undefined)}
                className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-4 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
              >
                取消
              </button>
              <button
                onClick={() => void submitBasicInfoUpdate()}
                disabled={
                  infoForm.title.trim().length < 2 ||
                  infoForm.instructorName.trim().length < 1 ||
                  infoForm.reason.trim().length < 4 ||
                  Boolean(mutatingProductId)
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutatingProductId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Edit3 className="h-4 w-4" />
                )}
                保存信息
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {contentEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18231F]/45 px-4">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="max-h-[92vh] w-full max-w-[900px] overflow-y-auto rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#8A8176]">详情内容</p>
                <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                  {contentEditor.title}
                </h2>
              </div>
              <button
                onClick={() => setContentEditor(undefined)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7D746B] transition hover:bg-[#F1E8DC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isContentLoading ? (
              <div className="mt-6 flex min-h-[260px] items-center justify-center text-sm text-[#6F7771]">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在读取详情内容
              </div>
            ) : (
              <>
                <label className="mt-5 block text-sm font-semibold text-[#41524B]">
                  课程摘要
                  <textarea
                    value={contentForm.summary}
                    onChange={event =>
                      setContentForm(current => ({
                        ...current,
                        summary: event.target.value,
                      }))
                    }
                    className="mt-2 min-h-[104px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                  />
                </label>

                <label className="mt-4 block text-sm font-semibold text-[#41524B]">
                  适合人群
                  <textarea
                    value={contentForm.targetAudienceText}
                    onChange={event =>
                      setContentForm(current => ({
                        ...current,
                        targetAudienceText: event.target.value,
                      }))
                    }
                    className="mt-2 min-h-[92px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                  />
                </label>

                <div className="mt-5 rounded-xl border border-[#E1D7C8] bg-[#FFFDF8] p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#41524B]">
                        成交图文素材
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                        维护课程详情页“课程亮点”区域使用的主视觉、标题、卖点和商品图文资产。
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addMerchandisingAsset}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
                    >
                      <Plus className="h-4 w-4" />
                      添加图文资产
                    </button>
                  </div>

                  <div className="mt-4 rounded-lg border border-[#E8DED0] bg-[#FBF7EF] p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#41524B]">
                          素材资产库
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                          先登记课程素材，合规通过后可一键引用到详情页成交图文。
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#7D746B]">
                        {contentAssets.length} 个素材
                      </span>
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-[0.8fr_130px_150px_minmax(0,1fr)]">
                      <input
                        value={assetForm.title}
                        onChange={event =>
                          setAssetForm(current => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                        placeholder="素材标题"
                        className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83]"
                      />
                      <select
                        value={assetForm.kind}
                        onChange={event =>
                          setAssetForm(current => ({
                            ...current,
                            kind: event.target.value as CourseProductAssetKind,
                            mimeType:
                              current.file?.type ||
                              (event.target.value === "detail_image" ||
                              event.target.value === "proof_image"
                                ? "image/jpeg"
                                : "application/pdf"),
                          }))
                        }
                        className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83]"
                      >
                        {COURSE_PRODUCT_ASSET_KINDS.map(kind => (
                          <option key={kind} value={kind}>
                            {courseProductAssetKindCopy[kind]}
                          </option>
                        ))}
                      </select>
                      <select
                        value={assetForm.chapterId}
                        onChange={event =>
                          setAssetForm(current => ({
                            ...current,
                            chapterId: event.target.value,
                          }))
                        }
                        className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83]"
                      >
                        <option value="">不绑定章节</option>
                        {contentForm.chapters.map(chapter => (
                          <option key={chapter.id} value={chapter.id}>
                            {chapter.title || "未命名章节"}
                          </option>
                        ))}
                      </select>
                      <input
                        value={assetForm.sourceUrl}
                        onChange={event =>
                          setAssetForm(current => ({
                            ...current,
                            sourceUrl: event.target.value,
                            file: undefined,
                          }))
                        }
                        placeholder="素材 URL，或选择下方本地文件上传"
                        className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
                      />
                    </div>

                    <label className="mt-3 flex min-h-[44px] cursor-pointer flex-col justify-center gap-1 rounded-lg border border-dashed border-[#CDBFAE] bg-white px-3 py-2 text-sm text-[#5B6B63] transition hover:border-[#9FB3A9] sm:flex-row sm:items-center sm:justify-between">
                      <span className="inline-flex items-center gap-2 font-semibold">
                        <Upload className="h-4 w-4" />
                        {assetForm.file
                          ? assetForm.file.name
                          : "选择本地素材文件"}
                      </span>
                      <span className="text-xs text-[#8A8176]">
                        文件会写入本地受控素材目录，合规通过后再开放展示或下载
                      </span>
                      <input
                        type="file"
                        className="sr-only"
                        onChange={event => {
                          const file = event.currentTarget.files?.[0];
                          if (!file) return;
                          setAssetForm(current => ({
                            ...current,
                            file,
                            title:
                              current.title.trim() ||
                              file.name.replace(/\.[^.]+$/, ""),
                            sourceUrl: "",
                            mimeType:
                              file.type ||
                              (current.kind === "detail_image" ||
                              current.kind === "proof_image"
                                ? "image/jpeg"
                                : "application/octet-stream"),
                            sizeBytes: String(file.size),
                          }));
                        }}
                      />
                    </label>

                    <div className="mt-3 grid gap-3 lg:grid-cols-[150px_130px_1fr_auto]">
                      <input
                        value={assetForm.mimeType}
                        onChange={event =>
                          setAssetForm(current => ({
                            ...current,
                            mimeType: event.target.value,
                          }))
                        }
                        placeholder="MIME"
                        className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83]"
                      />
                      <input
                        value={assetForm.sizeBytes}
                        onChange={event =>
                          setAssetForm(current => ({
                            ...current,
                            sizeBytes: event.target.value,
                          }))
                        }
                        placeholder="大小 bytes"
                        className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83]"
                      />
                      <input
                        value={assetForm.reason}
                        onChange={event =>
                          setAssetForm(current => ({
                            ...current,
                            reason: event.target.value,
                          }))
                        }
                        placeholder="登记原因"
                        className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83]"
                      />
                      <button
                        type="button"
                        onClick={() => void submitAssetUpload()}
                        disabled={
                          assetForm.title.trim().length < 2 ||
                          (!assetForm.file &&
                            assetForm.sourceUrl.trim().length < 8) ||
                          assetForm.reason.trim().length < 4 ||
                          Boolean(mutatingAssetId)
                        }
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#243B35] px-3 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {mutatingAssetId === "upload" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        {assetForm.file ? "上传" : "登记"}
                      </button>
                    </div>

                    {contentAssets.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {contentAssets.slice(0, 5).map(asset => (
                          <div
                            key={asset.id}
                            className="grid gap-3 rounded-lg bg-white px-3 py-3 text-xs text-[#7D746B] lg:grid-cols-[minmax(0,1fr)_120px_auto] lg:items-center"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#243B35]">
                                {asset.title}
                              </p>
                              <p className="mt-1 truncate">
                                {courseProductAssetKindCopy[asset.kind]} ·{" "}
                                {asset.fileName} ·{" "}
                                {asset.sourceType === "object_storage"
                                  ? "本地文件"
                                  : "外部链接"}{" "}
                                ·{" "}
                                {assetReviewStatusCopy[asset.complianceStatus]}
                              </p>
                            </div>
                            <span
                              className={`w-fit rounded-full px-2.5 py-1 font-semibold ${
                                asset.complianceStatus === "approved"
                                  ? "bg-[#EDF5EF] text-[#41675A]"
                                  : asset.complianceStatus === "rejected"
                                    ? "bg-[#FFF0EA] text-[#AD503A]"
                                    : "bg-[#F3E9D8] text-[#8C6E4A]"
                              }`}
                            >
                              {assetReviewStatusCopy[asset.complianceStatus]}
                            </span>
                            <div className="flex flex-wrap gap-2 lg:justify-end">
                              {asset.sourceType === "object_storage" && (
                                <a
                                  href={`/api/catalog/admin/course-products/${encodeURIComponent(
                                    asset.productId
                                  )}/assets/${encodeURIComponent(asset.id)}/download`}
                                  className="inline-flex h-8 items-center rounded-lg border border-[#D8CEC0] px-2.5 font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
                                >
                                  下载
                                </a>
                              )}
                              {isImageCourseAsset(asset) &&
                                isUsableAssetUrl(asset.publicUrl) && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        applyAssetToMerchandising(
                                          asset,
                                          "showcase"
                                        )
                                      }
                                      className="h-8 rounded-lg border border-[#D8CEC0] px-2.5 font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
                                    >
                                      设主视觉
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        applyAssetToMerchandising(
                                          asset,
                                          asset.kind === "proof_image"
                                            ? "proof"
                                            : "gallery"
                                        )
                                      }
                                      className="h-8 rounded-lg border border-[#D8CEC0] px-2.5 font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
                                    >
                                      加入成交图
                                    </button>
                                  </>
                                )}
                              {catalogPermissions.canReview &&
                                asset.complianceStatus === "pending" && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void updateAssetCompliance(
                                          asset,
                                          "approved"
                                        )
                                      }
                                      disabled={mutatingAssetId === asset.id}
                                      className="h-8 rounded-lg bg-[#41675A] px-2.5 font-semibold text-white transition hover:bg-[#315047] disabled:opacity-50"
                                    >
                                      通过
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void updateAssetCompliance(
                                          asset,
                                          "rejected"
                                        )
                                      }
                                      disabled={mutatingAssetId === asset.id}
                                      className="h-8 rounded-lg bg-[#FFF0EA] px-2.5 font-semibold text-[#AD503A] transition hover:bg-[#FFE8DE] disabled:opacity-50"
                                    >
                                      驳回
                                    </button>
                                  </>
                                )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <label className="text-sm font-semibold text-[#41524B]">
                      成交标题
                      <input
                        value={contentForm.merchandising.headline}
                        onChange={event =>
                          updateMerchandising({
                            headline: event.target.value,
                          })
                        }
                        placeholder="例如：先稳住情绪，再恢复行动感"
                        className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
                      />
                    </label>
                    <label className="text-sm font-semibold text-[#41524B]">
                      主视觉图 URL
                      <input
                        value={contentForm.merchandising.showcaseImageUrl}
                        onChange={event =>
                          updateMerchandising({
                            showcaseImageUrl: event.target.value,
                          })
                        }
                        placeholder="https://..."
                        className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
                      />
                    </label>
                  </div>

                  <label className="mt-3 block text-sm font-semibold text-[#41524B]">
                    副标题 / 购买判断说明
                    <textarea
                      value={contentForm.merchandising.subheadline}
                      onChange={event =>
                        updateMerchandising({
                          subheadline: event.target.value,
                        })
                      }
                      placeholder="说明这门课解决什么、适合谁、为什么现在值得学习"
                      className="mt-2 min-h-[76px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
                    />
                  </label>

                  <div className="mt-3 grid gap-3 md:grid-cols-[1fr_0.8fr]">
                    <label className="text-sm font-semibold text-[#41524B]">
                      成交卖点
                      <textarea
                        value={contentForm.merchandising.sellingPointsText}
                        onChange={event =>
                          updateMerchandising({
                            sellingPointsText: event.target.value,
                          })
                        }
                        placeholder="每行一条，例如：识别情绪触发点"
                        className="mt-2 min-h-[92px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
                      />
                    </label>
                    <label className="text-sm font-semibold text-[#41524B]">
                      主视觉替代文本
                      <textarea
                        value={contentForm.merchandising.showcaseImageAlt}
                        onChange={event =>
                          updateMerchandising({
                            showcaseImageAlt: event.target.value,
                          })
                        }
                        placeholder="用于无障碍说明和素材识别"
                        className="mt-2 min-h-[92px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
                      />
                    </label>
                  </div>

                  {contentForm.merchandising.imageAssets.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {contentForm.merchandising.imageAssets.map(
                        (asset, assetIndex) => (
                          <div
                            key={asset.id}
                            className="rounded-lg bg-[#F8F3EA] p-3"
                          >
                            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_120px_120px_auto]">
                              <input
                                value={asset.title}
                                onChange={event =>
                                  updateMerchandisingAsset(assetIndex, {
                                    title: event.target.value,
                                  })
                                }
                                placeholder="图文资产标题"
                                className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83]"
                              />
                              <select
                                value={asset.usage}
                                onChange={event =>
                                  updateMerchandisingAsset(assetIndex, {
                                    usage: event.target
                                      .value as CourseProductMerchandisingAssetUsage,
                                  })
                                }
                                className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83]"
                              >
                                {COURSE_PRODUCT_MERCHANDISING_ASSET_USAGES.map(
                                  usage => (
                                    <option key={usage} value={usage}>
                                      {merchandisingAssetUsageCopy[usage]}
                                    </option>
                                  )
                                )}
                              </select>
                              <select
                                value={asset.complianceStatus}
                                onChange={event =>
                                  updateMerchandisingAsset(assetIndex, {
                                    complianceStatus: event.target
                                      .value as CourseProductContentAssetReviewStatus,
                                  })
                                }
                                className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83]"
                              >
                                {COURSE_PRODUCT_CONTENT_ASSET_REVIEW_STATUSES.map(
                                  status => (
                                    <option key={status} value={status}>
                                      {assetReviewStatusCopy[status]}
                                    </option>
                                  )
                                )}
                              </select>
                              <button
                                type="button"
                                onClick={() =>
                                  removeMerchandisingAsset(assetIndex)
                                }
                                aria-label="移除图文资产"
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#A65F48] transition hover:bg-[#FFE8DE]"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
                              <input
                                value={asset.imageUrl}
                                onChange={event =>
                                  updateMerchandisingAsset(assetIndex, {
                                    imageUrl: event.target.value,
                                  })
                                }
                                placeholder="图片 URL"
                                className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83]"
                              />
                              <input
                                value={asset.altText}
                                onChange={event =>
                                  updateMerchandisingAsset(assetIndex, {
                                    altText: event.target.value,
                                  })
                                }
                                placeholder="替代文本"
                                className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83]"
                              />
                              <input
                                value={asset.note}
                                onChange={event =>
                                  updateMerchandisingAsset(assetIndex, {
                                    note: event.target.value,
                                  })
                                }
                                placeholder="素材备注"
                                className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83]"
                              />
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>

                {contentQuality && (
                  <div
                    className={`mt-4 rounded-lg border px-4 py-3 ${
                      contentQuality.ready
                        ? "border-[#C8D8C8] bg-[#EEF6ED]"
                        : "border-[#EDCDBF] bg-[#FFF4EF]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        {contentQuality.ready ? (
                          <BadgeCheck className="h-4 w-4 text-[#41675A]" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-[#A65F48]" />
                        )}
                        <span
                          className={
                            contentQuality.ready
                              ? "text-[#41675A]"
                              : "text-[#A65F48]"
                          }
                        >
                          {contentQuality.ready ? "内容校验通过" : "内容待补齐"}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-[#7D746B]">
                        {contentQuality.blockingCount} 个阻塞 ·{" "}
                        {contentQuality.warningCount} 个提醒
                      </span>
                    </div>
                    {contentQuality.issues.length > 0 && (
                      <ul className="mt-3 space-y-1 text-xs leading-5 text-[#7D746B]">
                        {contentQuality.issues.slice(0, 4).map(issue => (
                          <li
                            key={`${issue.code}-${issue.path ?? issue.message}`}
                          >
                            {issue.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div className="mt-5 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-[#41524B]">
                    章节与素材
                  </h3>
                  <button
                    onClick={addContentChapter}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
                  >
                    <Plus className="h-4 w-4" />
                    添加章节
                  </button>
                </div>

                <div className="mt-3 space-y-4">
                  {contentForm.chapters.map((chapter, chapterIndex) => (
                    <div
                      key={chapter.id}
                      className="rounded-lg border border-[#E1D7C8] bg-white p-4"
                    >
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_auto] md:items-end">
                        <label className="text-sm font-semibold text-[#41524B]">
                          章节标题
                          <input
                            value={chapter.title}
                            onChange={event =>
                              updateContentChapter(chapterIndex, {
                                title: event.target.value,
                              })
                            }
                            className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                          />
                        </label>
                        <label className="text-sm font-semibold text-[#41524B]">
                          时长分钟
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={chapter.durationMinutes}
                            onChange={event =>
                              updateContentChapter(chapterIndex, {
                                durationMinutes: event.target.value,
                              })
                            }
                            className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                          />
                        </label>
                        <button
                          onClick={() => removeContentChapter(chapterIndex)}
                          disabled={contentForm.chapters.length <= 1}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#E5C6BA] bg-[#FFF7F2] px-3 text-sm font-semibold text-[#A65F48] transition hover:border-[#DFAE9F] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <Trash2 className="h-4 w-4" />
                          删除
                        </button>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-[#8A8176]">
                          素材占位
                        </p>
                        <button
                          onClick={() => addContentMaterial(chapterIndex)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D8CEC0] bg-[#FFFDF8] px-2.5 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          添加素材
                        </button>
                      </div>

                      <div className="mt-3 space-y-3">
                        {chapter.materialPlaceholders.map(
                          (material, materialIndex) => (
                            <div
                              key={material.id}
                              className="rounded-lg bg-[#F8F3EA] p-3"
                            >
                              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_120px_110px_minmax(0,1fr)_auto]">
                                <input
                                  value={material.title}
                                  onChange={event =>
                                    updateContentMaterial(
                                      chapterIndex,
                                      materialIndex,
                                      { title: event.target.value }
                                    )
                                  }
                                  placeholder="素材标题"
                                  className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83]"
                                />
                                <select
                                  value={material.type}
                                  onChange={event =>
                                    updateContentMaterial(
                                      chapterIndex,
                                      materialIndex,
                                      {
                                        type: event.target
                                          .value as CourseProductContentMaterialType,
                                      }
                                    )
                                  }
                                  className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83]"
                                >
                                  {COURSE_PRODUCT_CONTENT_MATERIAL_TYPES.map(
                                    type => (
                                      <option key={type} value={type}>
                                        {materialTypeCopy[type]}
                                      </option>
                                    )
                                  )}
                                </select>
                                <select
                                  value={material.status}
                                  onChange={event =>
                                    updateContentMaterial(
                                      chapterIndex,
                                      materialIndex,
                                      {
                                        status: event.target
                                          .value as CourseProductContentMaterialStatus,
                                      }
                                    )
                                  }
                                  className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83]"
                                >
                                  {COURSE_PRODUCT_CONTENT_MATERIAL_STATUSES.map(
                                    status => (
                                      <option key={status} value={status}>
                                        {materialStatusCopy[status]}
                                      </option>
                                    )
                                  )}
                                </select>
                                <input
                                  value={material.note}
                                  onChange={event =>
                                    updateContentMaterial(
                                      chapterIndex,
                                      materialIndex,
                                      { note: event.target.value }
                                    )
                                  }
                                  placeholder="备注"
                                  className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83]"
                                />
                                <button
                                  onClick={() =>
                                    removeContentMaterial(
                                      chapterIndex,
                                      materialIndex
                                    )
                                  }
                                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[#A65F48] transition hover:bg-[#FFE8DE]"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_120px_96px]">
                                <input
                                  value={material.assetId}
                                  onChange={event =>
                                    updateContentMaterial(
                                      chapterIndex,
                                      materialIndex,
                                      { assetId: event.target.value }
                                    )
                                  }
                                  placeholder="资料 ID"
                                  className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83]"
                                />
                                <input
                                  value={material.assetUrl}
                                  onChange={event =>
                                    updateContentMaterial(
                                      chapterIndex,
                                      materialIndex,
                                      { assetUrl: event.target.value }
                                    )
                                  }
                                  placeholder="资料地址"
                                  className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83]"
                                />
                                <select
                                  value={material.complianceStatus}
                                  onChange={event =>
                                    updateContentMaterial(
                                      chapterIndex,
                                      materialIndex,
                                      {
                                        complianceStatus: event.target
                                          .value as CourseProductContentAssetReviewStatus,
                                      }
                                    )
                                  }
                                  className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83]"
                                >
                                  {COURSE_PRODUCT_CONTENT_ASSET_REVIEW_STATUSES.map(
                                    status => (
                                      <option key={status} value={status}>
                                        {assetReviewStatusCopy[status]}
                                      </option>
                                    )
                                  )}
                                </select>
                                <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#D8CEC0] bg-white px-3 text-xs font-semibold text-[#41524B]">
                                  <input
                                    type="checkbox"
                                    checked={material.downloadEnabled}
                                    onChange={event =>
                                      updateContentMaterial(
                                        chapterIndex,
                                        materialIndex,
                                        {
                                          downloadEnabled: event.target.checked,
                                        }
                                      )
                                    }
                                    className="h-3.5 w-3.5 accent-[#41675A]"
                                  />
                                  下载
                                </label>
                              </div>
                              <div className="mt-3 rounded-lg border border-[#E1D7C8] bg-white px-3 py-3">
                                <p className="text-xs font-semibold text-[#7D746B]">
                                  绑定已通过资料素材
                                </p>
                                <select
                                  value=""
                                  onChange={event => {
                                    const selectedAsset = contentAssets.find(
                                      asset => asset.id === event.target.value
                                    );
                                    if (!selectedAsset) return;
                                    applyAssetToContentMaterial(
                                      chapterIndex,
                                      materialIndex,
                                      selectedAsset
                                    );
                                  }}
                                  disabled={
                                    !contentAssets.some(isBindableLearningAsset)
                                  }
                                  className="mt-2 h-9 w-full rounded-lg border border-[#D8CEC0] bg-[#FFFDF8] px-3 text-sm outline-none transition focus:border-[#6F8F83] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <option value="">
                                    {contentAssets.some(isBindableLearningAsset)
                                      ? "选择一个已通过且开启下载的素材"
                                      : "暂无可绑定素材"}
                                  </option>
                                  {contentAssets
                                    .filter(isBindableLearningAsset)
                                    .map(asset => (
                                      <option key={asset.id} value={asset.id}>
                                        {asset.title} ·{" "}
                                        {courseProductAssetKindCopy[asset.kind]}
                                      </option>
                                    ))}
                                </select>
                                <p className="mt-2 text-xs leading-5 text-[#8A8176]">
                                  绑定后会自动写入受控下载地址、上传人与合规状态；保存内容后，重新审核上架即可进入学习页。
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <label className="mt-4 block text-sm font-semibold text-[#41524B]">
                  更新原因
                  <textarea
                    value={contentForm.reason}
                    onChange={event =>
                      setContentForm(current => ({
                        ...current,
                        reason: event.target.value,
                      }))
                    }
                    placeholder="例如：章节结构和课后素材完成校对"
                    className="mt-2 min-h-[92px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
                  />
                </label>

                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    onClick={() => setContentEditor(undefined)}
                    className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-4 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => void submitContentUpdate()}
                    disabled={
                      contentForm.summary.trim().length < 20 ||
                      contentForm.reason.trim().length < 4 ||
                      Boolean(mutatingProductId)
                    }
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {mutatingProductId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FilePenLine className="h-4 w-4" />
                    )}
                    保存内容
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {priceEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18231F]/45 px-4">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-[560px] rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#8A8176]">价格编辑</p>
                <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                  {priceEditor.title}
                </h2>
              </div>
              <button
                onClick={() => setPriceEditor(undefined)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7D746B] transition hover:bg-[#F1E8DC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-[#41524B]">
                售价
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceForm.amount}
                  disabled={priceForm.isFree}
                  onChange={event =>
                    setPriceForm(current => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83] disabled:bg-[#F4EFE7] disabled:text-[#9A8F82]"
                />
              </label>
              <label className="text-sm font-semibold text-[#41524B]">
                原价
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceForm.originalAmount}
                  onChange={event =>
                    setPriceForm(current => ({
                      ...current,
                      originalAmount: event.target.value,
                    }))
                  }
                  className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-lg border border-[#E1D7C8] bg-white px-3 py-2 text-sm font-semibold text-[#41524B]">
                <input
                  type="checkbox"
                  checked={priceForm.isFree}
                  onChange={event =>
                    setPriceForm(current => ({
                      ...current,
                      isFree: event.target.checked,
                      amount: event.target.checked ? "0" : current.amount,
                    }))
                  }
                />
                免费课程
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-[#E1D7C8] bg-white px-3 py-2 text-sm font-semibold text-[#41524B]">
                <input
                  type="checkbox"
                  checked={priceForm.memberIncluded}
                  onChange={event =>
                    setPriceForm(current => ({
                      ...current,
                      memberIncluded: event.target.checked,
                    }))
                  }
                />
                会员权益内
              </label>
            </div>

            <label className="mt-4 block text-sm font-semibold text-[#41524B]">
              改价原因
              <textarea
                value={priceForm.reason}
                onChange={event =>
                  setPriceForm(current => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
                placeholder="例如：配合课程专题活动调整本期价格"
                className="mt-2 min-h-[96px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
              />
            </label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setPriceEditor(undefined)}
                className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-4 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
              >
                取消
              </button>
              <button
                onClick={() => void submitPriceUpdate()}
                disabled={
                  priceForm.reason.trim().length < 4 ||
                  Boolean(mutatingProductId)
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutatingProductId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Edit3 className="h-4 w-4" />
                )}
                保存价格
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
