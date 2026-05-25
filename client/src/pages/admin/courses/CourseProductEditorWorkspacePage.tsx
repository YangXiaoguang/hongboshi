import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useRoute } from "wouter";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  ChevronLeft,
  ClipboardCheck,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileImage,
  FilePenLine,
  ImagePlus,
  Layers3,
  Loader2,
  PanelRight,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Smartphone,
  Target,
  Trash2,
  Undo2,
  Upload,
  XCircle,
} from "lucide-react";
import {
  COURSE_PRODUCT_ASSET_MAX_SIZE_BYTES,
  COURSE_CATEGORIES,
  COURSE_TYPES,
  CourseProductContentQualityResultSchema,
  CourseProductContentUpdateRequestSchema,
  evaluateCourseProductContentQuality,
  type CourseCategory,
  type CourseProductAsset,
  type CourseProductContentQualityIssue,
  type CourseProductContentQualityResult,
  type CourseProductContentUpdateRequest,
  type CourseProductCreateRequest,
  type CourseProductDetailContent,
  type CourseProductDetailTemplate,
  type CourseProductListItem,
  type CourseProductMerchandisingAssetUsage,
  type CourseProductPriceUpdateRequest,
  type CourseProductReviewAction,
  type CourseProductReviewStatus,
  type CourseProductRichTextBlockType,
  type CourseProductStatus,
  type CourseType,
} from "@shared/domain";
import { useAuth } from "@/contexts/AuthContext";
import {
  CourseProductRepositoryError,
  httpCourseProductRepository,
} from "@/features/catalog";
import { getCourseProductAdminPermissions } from "@/features/catalog/model/courseProductAdminPermissions";
import {
  courseProductReviewActionCopy,
  courseProductReviewCopy,
  courseProductStatusCopy,
} from "./courseProductAdminLabels";
import {
  CourseProductDetailStructurePanel,
  CourseProductDetailStylePanel,
} from "./CourseProductDetailDesignerPanels";
import {
  applyCourseProductDetailTemplateToForm,
  applyDetailContentTemplate,
  cloneH5BlockForm,
  createCourseProductDetailTemplateContent,
  createDefaultContentWorkbenchForm,
  createDetailDraftId,
  createH5BlockForm,
  detailBlockStyleDefaults,
  detailBlockStyleFromValue,
  detailContentTemplateDefinitions,
  detailImageAspectClass,
  detailImageFitClass,
  detailStylePaddingClass,
  detailStyleRadiusClass,
  detailStyleToneClass,
  h5BlockFormsForSave,
  h5BlockTypeOptions,
  insertH5BlockAfter,
  merchandisingAssetUsageOptions,
  moveH5BlockForm,
  optionalText,
  removeH5BlockForm,
  splitLines,
  type ContentWorkbenchFormState,
  type DetailBlockStyleState,
  type DetailContentTemplateId,
  type DetailDesignerSelection,
  type H5BlockFormState,
  type MediaAssetFormState,
} from "./courseProductDetailDesigner";

type WorkspaceStepId = "basic" | "media" | "price" | "content" | "publish";

type BasicFormState = {
  title: string;
  coverUrl: string;
  category: CourseCategory;
  type: CourseType;
  instructorName: string;
  learners: string;
};

type PriceFormState = {
  amount: string;
  originalAmount: string;
  isFree: boolean;
  memberIncluded: boolean;
};

const defaultCoverUrl =
  "https://images.unsplash.com/photo-1499209974431-9dddcece7f88";
const defaultAssetUploadReason = "商品图片上传";
const defaultContentUpdateReason = "课程商品内容更新";

const assetComplianceStatusCopy = {
  not_required: "免审",
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
} satisfies Record<MediaAssetFormState["complianceStatus"], string>;

const workspaceSteps: {
  id: WorkspaceStepId;
  label: string;
  description: string;
}[] = [
  {
    id: "basic",
    label: "基础信息",
    description: "标题、分类、讲师和学习人数",
  },
  {
    id: "media",
    label: "商品图片",
    description: "主图、详情图和证明图资产",
  },
  {
    id: "price",
    label: "价格权益",
    description: "售价、原价、会员权益",
  },
  {
    id: "content",
    label: "图文内容",
    description: "摘要、卖点和移动端预览",
  },
  {
    id: "publish",
    label: "发布审核",
    description: "完整度、审核和上架状态",
  },
];

function workspaceStepFromUrl(): WorkspaceStepId {
  if (typeof window === "undefined") return "basic";
  const rawStep = new URLSearchParams(window.location.search).get("step");
  return workspaceSteps.some(step => step.id === rawStep)
    ? (rawStep as WorkspaceStepId)
    : "basic";
}

function defaultBasicForm(): BasicFormState {
  return {
    title: "",
    coverUrl: defaultCoverUrl,
    category: COURSE_CATEGORIES[0],
    type: COURSE_TYPES[0],
    instructorName: "",
    learners: "0",
  };
}

function defaultPriceForm(): PriceFormState {
  return {
    amount: "199",
    originalAmount: "399",
    isFree: false,
    memberIncluded: false,
  };
}

function defaultContentWorkbenchForm(): ContentWorkbenchFormState {
  return createDefaultContentWorkbenchForm(defaultCoverUrl);
}

function basicFormFromProduct(product: CourseProductListItem): BasicFormState {
  return {
    title: product.title,
    coverUrl: product.coverUrl,
    category: product.category,
    type: product.type,
    instructorName: product.instructorName,
    learners: String(product.learners),
  };
}

function priceFormFromProduct(product: CourseProductListItem): PriceFormState {
  return {
    amount: String(product.price.amount),
    originalAmount: String(product.price.originalAmount),
    isFree: product.price.isFree,
    memberIncluded: product.price.memberIncluded,
  };
}

function contentFormFromContent(
  content: CourseProductDetailContent
): ContentWorkbenchFormState {
  return {
    summary: content.summary,
    targetAudienceText: content.targetAudience.join("\n"),
    headline: content.merchandising.headline ?? "",
    subheadline: content.merchandising.subheadline ?? "",
    showcaseImageUrl: content.merchandising.showcaseImageUrl ?? defaultCoverUrl,
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
      style: detailBlockStyleFromValue(asset.style),
    })),
    richTextBlocks:
      content.merchandising.richTextBlocks.length > 0
        ? content.merchandising.richTextBlocks.map(block => ({
            id: block.id,
            type: block.type,
            title: block.title ?? "",
            body: block.body ?? "",
            imageUrl: block.imageUrl ?? "",
            altText: block.altText ?? "",
            itemsText: block.items.join("\n"),
            question: block.question ?? "",
            answer: block.answer ?? "",
            style: detailBlockStyleFromValue(block.style),
          }))
        : [
            createH5BlockForm("section_heading"),
            createH5BlockForm("paragraph"),
            createH5BlockForm("purchase_note"),
          ],
  };
}

function parseLearners(value: string) {
  const learners = Number(value);
  return Number.isInteger(learners) && learners >= 0 ? learners : undefined;
}

function parsePrice(form: PriceFormState) {
  const amount = form.isFree ? 0 : Number(form.amount);
  const originalAmount = Number(form.originalAmount || amount);
  if (!Number.isFinite(amount) || !Number.isFinite(originalAmount)) {
    return undefined;
  }
  return {
    amount,
    originalAmount,
    isFree: form.isFree,
    memberIncluded: form.memberIncluded,
  };
}

function createMediaAssetForm(
  usage: CourseProductMerchandisingAssetUsage = "gallery",
  imageUrl = ""
): MediaAssetFormState {
  return {
    id: createDetailDraftId("merch_asset"),
    title: usage === "proof" ? "学习反馈证明图" : "课程详情图",
    imageUrl,
    altText: "",
    usage,
    complianceStatus: "not_required",
    note: "",
    style: detailBlockStyleFromValue(
      usage === "showcase"
        ? { imageAspectRatio: "16:9", radius: "large", tone: "warm" }
        : undefined
    ),
  };
}

function isMerchandisingImageAsset(asset: CourseProductAsset) {
  return (
    !asset.deletedAt &&
    Boolean(asset.publicUrl) &&
    (asset.kind === "detail_image" || asset.kind === "proof_image")
  );
}

function isStorefrontReadyAsset(asset: CourseProductAsset) {
  return (
    asset.complianceStatus === "approved" ||
    asset.complianceStatus === "not_required"
  );
}

function usageFromCourseProductAsset(
  asset: CourseProductAsset
): CourseProductMerchandisingAssetUsage {
  return asset.usage ?? (asset.kind === "proof_image" ? "proof" : "gallery");
}

function mediaAssetFormFromCourseProductAsset(
  asset: CourseProductAsset,
  usage: CourseProductMerchandisingAssetUsage = usageFromCourseProductAsset(
    asset
  )
): MediaAssetFormState | undefined {
  if (!asset.publicUrl) return undefined;
  return {
    id: asset.id,
    title: asset.title,
    imageUrl: asset.publicUrl,
    altText: asset.altText ?? asset.title,
    usage,
    complianceStatus: asset.complianceStatus,
    note: asset.note ?? "",
    style: detailBlockStyleFromValue(
      usage === "showcase"
        ? { imageAspectRatio: "16:9", radius: "large", tone: "warm" }
        : undefined
    ),
  };
}

function upsertMediaAssetForm(
  assets: MediaAssetFormState[],
  nextAsset: MediaAssetFormState
) {
  const existingIndex = assets.findIndex(asset => asset.id === nextAsset.id);
  if (existingIndex < 0) return [nextAsset, ...assets];
  return assets.map((asset, index) =>
    index === existingIndex ? nextAsset : asset
  );
}

function formatWorkspacePrice(form: PriceFormState) {
  const price = parsePrice(form);
  if (!price) return "价格待校验";
  if (price.isFree || price.amount === 0) return "免费";
  return `¥${price.amount.toFixed(Number.isInteger(price.amount) ? 0 : 2)}`;
}

function buildPublishPreflightWarnings({
  product,
  content,
  form,
  reason,
}: {
  product?: CourseProductListItem;
  content?: CourseProductDetailContent;
  form: ContentWorkbenchFormState;
  reason: string;
}) {
  const warnings: string[] = [];
  if (!product) warnings.push("课程商品尚未创建");
  if (!content) warnings.push("课程详情内容尚未读取");
  if (!optionalText(form.showcaseImageUrl)) warnings.push("缺少成交主视觉");
  if (form.imageAssets.length < 1) warnings.push("缺少详情图或证明图");
  if (splitLines(form.sellingPointsText).length < 2)
    warnings.push("成交卖点少于 2 条");
  const effectiveRichTextBlocks = h5BlockFormsForSave(form, true);
  if (effectiveRichTextBlocks.length < 3) warnings.push("H5 内容块少于 3 个");
  if (
    effectiveRichTextBlocks.some(
      block => block.type === "image" && !block.imageUrl
    )
  ) {
    warnings.push("存在未选择图片的 H5 图片块");
  }
  if (
    form.imageAssets.some(
      asset =>
        asset.complianceStatus === "pending" ||
        asset.complianceStatus === "rejected"
    )
  ) {
    warnings.push("存在待审核或已驳回的商品图片素材");
  }
  if (reason.trim().length < 4) warnings.push("操作原因至少需要 4 个字");
  if (product?.status === "archived") warnings.push("归档商品不能发布");
  return warnings;
}

function reviewActionsForProduct(product?: CourseProductListItem) {
  if (!product || product.status === "archived") {
    return [] satisfies {
      action: CourseProductReviewAction;
      targetReviewStatus: CourseProductReviewStatus;
    }[];
  }

  if (
    product.reviewStatus === "not_submitted" ||
    product.reviewStatus === "rejected"
  ) {
    return [
      {
        action: "submit" as const,
        targetReviewStatus: "pending" as const,
      },
    ];
  }

  if (product.reviewStatus === "pending") {
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

function iconForReviewAction(action: CourseProductReviewAction) {
  if (action === "reject") return XCircle;
  if (action === "withdraw") return Undo2;
  return ClipboardCheck;
}

function statusActionForProduct(product?: CourseProductListItem):
  | {
      targetStatus: CourseProductStatus;
      label: string;
      description: string;
    }
  | undefined {
  if (!product || product.status === "archived") return undefined;
  if (product.status === "published") {
    return {
      targetStatus: "unpublished",
      label: "下架商品",
      description: "下架后前台课程货架和详情购买入口会停止曝光。",
    };
  }
  if (product.reviewStatus === "approved") {
    return {
      targetStatus: "published",
      label: "上架商品",
      description: "上架后前台只会展示审核通过且已上架的课程商品。",
    };
  }
  return undefined;
}

function publishFlowItems(product?: CourseProductListItem) {
  const hasProduct = Boolean(product);
  const reviewPassed = product?.reviewStatus === "approved";
  const published = product?.status === "published";
  return [
    {
      label: "商品草稿",
      value: hasProduct ? "已创建" : "待创建",
      active: hasProduct,
    },
    {
      label: "内容审核",
      value: product ? courseProductReviewCopy[product.reviewStatus] : "待创建",
      active: reviewPassed,
    },
    {
      label: "上架状态",
      value: product ? courseProductStatusCopy[product.status] : "待创建",
      active: published,
    },
    {
      label: "前台可售",
      value: reviewPassed && published ? "可展示" : "未展示",
      active: reviewPassed && published,
    },
  ];
}

function contentQualityIssueTarget(issue: CourseProductContentQualityIssue): {
  step: WorkspaceStepId;
  label: string;
  externalContent?: boolean;
} {
  if (
    issue.code === "merchandising_image_missing" ||
    issue.code === "merchandising_asset_pending" ||
    issue.path?.startsWith("merchandising.imageAssets") ||
    issue.path?.startsWith("merchandising.showcaseImageUrl")
  ) {
    return { step: "media", label: "商品图片" };
  }

  if (
    issue.code === "chapters_too_few" ||
    issue.code === "chapter_duration_too_short" ||
    issue.code === "chapter_material_missing" ||
    issue.code === "material_pending" ||
    issue.path?.startsWith("chapters")
  ) {
    return {
      step: "content",
      label: "章节与资料",
      externalContent: true,
    };
  }

  return { step: "content", label: "图文内容" };
}

function contentQualityFromError(
  err: unknown
): CourseProductContentQualityResult | undefined {
  if (!(err instanceof CourseProductRepositoryError)) return undefined;
  const details = err.details;
  const quality =
    details && typeof details === "object" && "quality" in details
      ? (details as { quality?: unknown }).quality
      : undefined;
  const parsed = CourseProductContentQualityResultSchema.safeParse(quality);
  return parsed.success ? parsed.data : undefined;
}

function normalizedOperationReason(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed.length >= 4 ? trimmed : fallback;
}

function imageMimeTypeFromFileName(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  return undefined;
}

function resolveImageMimeType(file: File) {
  if (file.type.startsWith("image/")) return file.type;
  return imageMimeTypeFromFileName(file.name);
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function buildContentUpdateRequest(
  content: CourseProductDetailContent,
  form: ContentWorkbenchFormState,
  reason: string,
  useSimpleContentMode: boolean
): CourseProductContentUpdateRequest | undefined {
  const targetAudience = splitLines(form.targetAudienceText);
  const sellingPoints = splitLines(form.sellingPointsText);
  const richTextBlocks = h5BlockFormsForSave(form, useSimpleContentMode);
  const request = {
    summary: form.summary,
    targetAudience,
    merchandising: {
      headline: optionalText(form.headline),
      subheadline: optionalText(form.subheadline),
      showcaseImageUrl: optionalText(form.showcaseImageUrl),
      showcaseImageAlt: optionalText(form.showcaseImageAlt),
      sellingPoints,
      imageAssets: form.imageAssets.map(asset => ({
        id: asset.id,
        title: asset.title,
        imageUrl: asset.imageUrl,
        altText: optionalText(asset.altText),
        usage: asset.usage,
        complianceStatus: asset.complianceStatus,
        note: optionalText(asset.note),
        style: asset.style,
      })),
      richTextBlocks: richTextBlocks.map(block => ({
        id: block.id,
        type: block.type,
        title: optionalText(block.title),
        body: optionalText(block.body),
        imageUrl: optionalText(block.imageUrl),
        altText: optionalText(block.altText),
        items: splitLines(block.itemsText),
        question: optionalText(block.question),
        answer: optionalText(block.answer),
        style: block.style,
      })),
    },
    chapters: content.chapters,
    reason: normalizedOperationReason(reason, defaultContentUpdateReason),
  };

  const parsed = CourseProductContentUpdateRequestSchema.safeParse(request);
  return parsed.success ? parsed.data : undefined;
}

function contentWorkbenchCompleteness(
  product?: CourseProductListItem,
  content?: CourseProductDetailContent,
  form?: ContentWorkbenchFormState
) {
  if (!product || !content || !form)
    return { completed: 0, total: 8, label: "0/8" };
  const checks = [
    product.title.trim().length >= 2,
    product.coverUrl.trim().length > 8,
    product.instructorName.trim().length >= 1,
    product.price.isFree || product.price.amount > 0,
    product.status !== "archived",
    Boolean(optionalText(form.showcaseImageUrl)),
    form.imageAssets.length >= 1,
    h5BlockFormsForSave(form, true).length >= 3,
  ];
  const completed = checks.filter(Boolean).length;
  return {
    completed,
    total: checks.length,
    label: `${completed}/${checks.length}`,
  };
}

function SectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-[#E5DCCF] bg-[#FFFDF8] px-5 py-5 last:border-b-0 sm:px-6 lg:px-7">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[#243B35]">{title}</h2>
        <p className="mt-1 max-w-[860px] text-sm leading-6 text-[#6F7771]">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

export default function CourseProductEditorWorkspacePage() {
  const [, navigate] = useLocation();
  const [isNewRoute] = useRoute("/admin/courses/new");
  const [, editParams] = useRoute("/admin/courses/:courseId/edit");
  const { user, isLoggedIn, isAuthSyncing } = useAuth();
  const [activeStep, setActiveStep] =
    useState<WorkspaceStepId>(workspaceStepFromUrl);
  const [isPublishSummaryOpen, setIsPublishSummaryOpen] = useState(false);
  const [product, setProduct] = useState<CourseProductListItem>();
  const [content, setContent] = useState<CourseProductDetailContent>();
  const [serverContentQuality, setServerContentQuality] =
    useState<CourseProductContentQualityResult>();
  const [basicForm, setBasicForm] = useState<BasicFormState>(defaultBasicForm);
  const [priceForm, setPriceForm] = useState<PriceFormState>(defaultPriceForm);
  const [contentForm, setContentForm] = useState<ContentWorkbenchFormState>(
    defaultContentWorkbenchForm
  );
  const [assetLibrary, setAssetLibrary] = useState<CourseProductAsset[]>([]);
  const [isAssetLibraryLoading, setIsAssetLibraryLoading] = useState(false);
  const [isAssetUploading, setIsAssetUploading] = useState(false);
  const [assetUploadFile, setAssetUploadFile] = useState<File>();
  const [assetUploadTitle, setAssetUploadTitle] = useState("");
  const [assetUploadUsage, setAssetUploadUsage] =
    useState<CourseProductMerchandisingAssetUsage>("gallery");
  const [assetUploadInputKey, setAssetUploadInputKey] = useState(0);
  const [reason, setReason] = useState("新增课程商品草稿");
  const [isAdvancedH5Editing, setIsAdvancedH5Editing] = useState(false);
  const [detailDesignerSelection, setDetailDesignerSelection] =
    useState<DetailDesignerSelection>({ kind: "overview" });
  const [activeDetailTemplateId, setActiveDetailTemplateId] =
    useState<DetailContentTemplateId>();
  const [savedDetailTemplates, setSavedDetailTemplates] = useState<
    CourseProductDetailTemplate[]
  >([]);
  const [templateDraftName, setTemplateDraftName] = useState("");
  const [isDetailTemplateLoading, setIsDetailTemplateLoading] = useState(false);
  const [isDetailTemplateSaving, setIsDetailTemplateSaving] = useState(false);
  const [pendingBlockDelete, setPendingBlockDelete] =
    useState<H5BlockFormState>();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [actionMessage, setActionMessage] = useState<string>();
  const [actionError, setActionError] = useState<string>();

  const courseId = editParams?.courseId;
  const isNew = Boolean(isNewRoute);
  const catalogPermissions = useMemo(
    () => getCourseProductAdminPermissions(user),
    [user]
  );
  const completeness = contentWorkbenchCompleteness(
    product,
    content,
    contentForm
  );
  const previewRichTextBlocks = useMemo(
    () => h5BlockFormsForSave(contentForm, !isAdvancedH5Editing),
    [contentForm, isAdvancedH5Editing]
  );
  const selectedDesignerAsset =
    detailDesignerSelection.kind === "asset"
      ? contentForm.imageAssets.find(
          asset => asset.id === detailDesignerSelection.id
        )
      : undefined;
  const selectedDesignerBlock =
    detailDesignerSelection.kind === "block"
      ? contentForm.richTextBlocks.find(
          block => block.id === detailDesignerSelection.id
        )
      : undefined;
  const selectedDesignerStyle =
    selectedDesignerAsset?.style ??
    selectedDesignerBlock?.style ??
    detailBlockStyleDefaults;
  const selectedDesignerIsImage = Boolean(
    selectedDesignerAsset || selectedDesignerBlock?.type === "image"
  );
  const selectedDesignerTitle =
    selectedDesignerAsset?.title ??
    selectedDesignerBlock?.title ??
    (detailDesignerSelection.kind === "overview" ? "整体详情" : "已选模块");
  const merchandisingImageAssets = useMemo(
    () => assetLibrary.filter(isMerchandisingImageAsset),
    [assetLibrary]
  );
  const storefrontReadyImageAssets = useMemo(
    () => merchandisingImageAssets.filter(isStorefrontReadyAsset),
    [merchandisingImageAssets]
  );
  const storefrontReadyAssetCount = useMemo(
    () => storefrontReadyImageAssets.length,
    [storefrontReadyImageAssets]
  );
  const publishPreflightWarnings = useMemo(
    () =>
      buildPublishPreflightWarnings({
        product,
        content,
        form: contentForm,
        reason,
      }),
    [content, contentForm, product, reason]
  );
  const pendingMerchandisingAssetCount = useMemo(
    () =>
      contentForm.imageAssets.filter(
        asset =>
          asset.complianceStatus === "pending" ||
          asset.complianceStatus === "rejected"
      ).length,
    [contentForm.imageAssets]
  );
  const availableReviewActions = useMemo(
    () => reviewActionsForProduct(product),
    [product]
  );
  const availableStatusAction = useMemo(
    () => statusActionForProduct(product),
    [product]
  );
  const publishFlow = useMemo(() => publishFlowItems(product), [product]);
  const detailTemplateContext = useMemo(
    () => ({
      title: basicForm.title.trim() || product?.title || "这门课程",
      instructorName:
        basicForm.instructorName.trim() || product?.instructorName || "讲师",
      category: basicForm.category || product?.category || "心理成长",
      type: basicForm.type || product?.type || "课程",
    }),
    [
      basicForm.category,
      basicForm.instructorName,
      basicForm.title,
      basicForm.type,
      product?.category,
      product?.instructorName,
      product?.title,
      product?.type,
    ]
  );

  const loadProduct = useCallback(async () => {
    if (!courseId) return;
    setIsLoading(true);
    setError(undefined);
    try {
      const result = await httpCourseProductRepository.loadCourseProducts({
        keyword: courseId,
        page: 1,
        pageSize: 50,
      });
      const matched = result.items.find(
        item => String(item.courseId) === String(courseId)
      );
      if (!matched) {
        setError("未找到对应课程商品");
        return;
      }
      setProduct(matched);
      setBasicForm(basicFormFromProduct(matched));
      setPriceForm(priceFormFromProduct(matched));
      setIsAssetLibraryLoading(true);
      const [loadedContent, loadedAssets] = await Promise.all([
        httpCourseProductRepository.loadCourseProductContent(matched.id),
        httpCourseProductRepository.loadCourseProductAssets(matched.id),
      ]);
      setContent(loadedContent);
      setContentForm(contentFormFromContent(loadedContent));
      setIsAdvancedH5Editing(false);
      setDetailDesignerSelection({ kind: "overview" });
      setActiveDetailTemplateId(undefined);
      setServerContentQuality(
        evaluateCourseProductContentQuality(loadedContent)
      );
      setAssetLibrary(loadedAssets.items);
      setReason("运营工作台更新课程商品");
    } catch (err) {
      setError(err instanceof Error ? err.message : "课程商品读取失败");
    } finally {
      setIsAssetLibraryLoading(false);
      setIsLoading(false);
    }
  }, [courseId]);

  const loadDetailTemplates = useCallback(async () => {
    setIsDetailTemplateLoading(true);
    try {
      const result =
        await httpCourseProductRepository.loadCourseProductDetailTemplates();
      setSavedDetailTemplates(result.items);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "课程详情模板读取失败"
      );
    } finally {
      setIsDetailTemplateLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthSyncing || !isLoggedIn || !catalogPermissions.canRead) return;
    void loadDetailTemplates();
  }, [
    catalogPermissions.canRead,
    isAuthSyncing,
    isLoggedIn,
    loadDetailTemplates,
  ]);

  useEffect(() => {
    if (isAuthSyncing || !isLoggedIn || !catalogPermissions.canRead) return;
    if (isNew) {
      setProduct(undefined);
      setContent(undefined);
      setServerContentQuality(undefined);
      setBasicForm(defaultBasicForm());
      setPriceForm(defaultPriceForm());
      setContentForm(defaultContentWorkbenchForm());
      setAssetLibrary([]);
      setAssetUploadFile(undefined);
      setAssetUploadTitle("");
      setAssetUploadUsage("gallery");
      setDetailDesignerSelection({ kind: "overview" });
      setActiveDetailTemplateId(undefined);
      setReason("新增课程商品草稿");
      return;
    }
    void loadProduct();
  }, [
    catalogPermissions.canRead,
    isAuthSyncing,
    isLoggedIn,
    isNew,
    loadProduct,
  ]);

  const submitCreate = useCallback(async () => {
    if (!catalogPermissions.canEdit) {
      setActionError("当前账号暂无课程商品编辑权限");
      return;
    }
    const learners = parseLearners(basicForm.learners);
    const price = parsePrice(priceForm);
    if (learners === undefined) {
      setActionError("请填写有效的学习人数");
      return;
    }
    if (!price) {
      setActionError("请填写有效的课程价格");
      return;
    }
    const request: CourseProductCreateRequest = {
      ...basicForm,
      learners,
      price,
      reason,
    };
    setIsSaving(true);
    setActionError(undefined);
    setActionMessage(undefined);
    try {
      const result =
        await httpCourseProductRepository.createCourseProduct(request);
      setActionMessage("课程商品草稿已创建");
      navigate(`/admin/courses/${result.product.courseId}/edit?created=1`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "课程商品创建失败");
    } finally {
      setIsSaving(false);
    }
  }, [basicForm, catalogPermissions.canEdit, navigate, priceForm, reason]);

  const submitBasicUpdate = useCallback(async () => {
    if (!product) return;
    if (!catalogPermissions.canEdit) {
      setActionError("当前账号暂无课程商品编辑权限");
      return;
    }
    const learners = parseLearners(basicForm.learners);
    if (learners === undefined) {
      setActionError("请填写有效的学习人数");
      return;
    }
    setIsSaving(true);
    setActionError(undefined);
    setActionMessage(undefined);
    try {
      const result =
        await httpCourseProductRepository.updateCourseProductBasicInfo(
          product.id,
          {
            ...basicForm,
            learners,
            reason,
          }
        );
      setProduct(result.product);
      setActionMessage("课程商品基础信息已保存");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "课程商品基础信息保存失败"
      );
    } finally {
      setIsSaving(false);
    }
  }, [basicForm, catalogPermissions.canEdit, product, reason]);

  const submitPriceUpdate = useCallback(async () => {
    if (!product) return;
    if (!catalogPermissions.canPrice) {
      setActionError("当前账号暂无课程商品价格权限");
      return;
    }
    const price = parsePrice(priceForm);
    if (!price) {
      setActionError("请填写有效的课程价格");
      return;
    }
    const request: CourseProductPriceUpdateRequest = {
      ...price,
      reason,
    };
    setIsSaving(true);
    setActionError(undefined);
    setActionMessage(undefined);
    try {
      const result = await httpCourseProductRepository.updateCourseProductPrice(
        product.id,
        request
      );
      setProduct(result.product);
      setActionMessage("课程商品价格权益已保存");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "课程商品价格保存失败"
      );
    } finally {
      setIsSaving(false);
    }
  }, [catalogPermissions.canPrice, priceForm, product, reason]);

  const submitContentUpdate = useCallback(
    async (successLabel: string) => {
      if (!product || !content) {
        setActionError("请先创建并读取课程商品后再维护详情内容");
        return;
      }
      if (!catalogPermissions.canEdit) {
        setActionError("当前账号暂无课程商品编辑权限");
        return;
      }
      const request = buildContentUpdateRequest(
        content,
        contentForm,
        reason,
        !isAdvancedH5Editing
      );
      if (!request) {
        setActionError("请检查商品摘要、适合人群、卖点和图片是否填写完整");
        return;
      }

      setIsSaving(true);
      setActionError(undefined);
      setActionMessage(undefined);
      try {
        const result =
          await httpCourseProductRepository.updateCourseProductContent(
            product.id,
            request
          );
        setProduct(result.product);
        setContent(result.content);
        setContentForm(contentFormFromContent(result.content));
        setServerContentQuality(
          evaluateCourseProductContentQuality(result.content)
        );
        setActionMessage(`${successLabel}已保存，课程商品需重新审核`);
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "课程商品详情内容保存失败"
        );
      } finally {
        setIsSaving(false);
      }
    },
    [
      catalogPermissions.canEdit,
      content,
      contentForm,
      isAdvancedH5Editing,
      product,
      reason,
    ]
  );

  const refreshAssetLibrary = useCallback(async () => {
    if (!product) return;
    setIsAssetLibraryLoading(true);
    setActionError(undefined);
    try {
      const result = await httpCourseProductRepository.loadCourseProductAssets(
        product.id
      );
      setAssetLibrary(result.items);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "课程素材读取失败");
    } finally {
      setIsAssetLibraryLoading(false);
    }
  }, [product]);

  const applyAssetToContentForm = useCallback(
    (
      asset: CourseProductAsset,
      usage: CourseProductMerchandisingAssetUsage
    ) => {
      const formAsset = mediaAssetFormFromCourseProductAsset(asset, usage);
      if (!formAsset) {
        setActionError("该素材缺少可用于前台展示的读取地址");
        return;
      }
      if (usage === "showcase" && !isStorefrontReadyAsset(asset)) {
        setActionError("待审核或驳回素材不能直接设为成交主视觉");
        return;
      }

      setContentForm(current => ({
        ...current,
        showcaseImageUrl:
          usage === "showcase" ? formAsset.imageUrl : current.showcaseImageUrl,
        showcaseImageAlt:
          usage === "showcase" ? formAsset.altText : current.showcaseImageAlt,
        imageAssets: upsertMediaAssetForm(current.imageAssets, formAsset),
      }));
      setActionError(undefined);
      setActionMessage(
        usage === "showcase"
          ? "已选择成交主视觉，保存商品图片后生效"
          : "已加入详情图草稿，保存商品图片后生效"
      );
    },
    []
  );

  const applyAssetToH5ImageBlock = useCallback(
    (blockIndex: number, asset: CourseProductAsset) => {
      if (!isStorefrontReadyAsset(asset)) {
        setActionError("H5 图片块只能选择已通过或免审素材");
        return;
      }
      if (!asset.publicUrl) {
        setActionError("该素材缺少可用于前台展示的读取地址");
        return;
      }

      setContentForm(current => ({
        ...current,
        richTextBlocks: current.richTextBlocks.map((block, index) =>
          index === blockIndex
            ? {
                ...block,
                title: block.title || asset.title,
                imageUrl: asset.publicUrl ?? block.imageUrl,
                altText: asset.altText ?? asset.title,
              }
            : block
        ),
      }));
      setActionError(undefined);
      setActionMessage("已将素材填入 H5 图片块，保存 H5 详情后生效");
    },
    []
  );

  const applyDesignerTemplate = useCallback(
    (templateId: DetailContentTemplateId) => {
      setContentForm(current =>
        applyDetailContentTemplate(current, detailTemplateContext, templateId)
      );
      setIsAdvancedH5Editing(true);
      setDetailDesignerSelection({ kind: "overview" });
      setActiveDetailTemplateId(templateId);
      setReason(current =>
        normalizedOperationReason(current, "课程商品详情模板更新")
      );
      setActionError(undefined);
      const templateLabel =
        detailContentTemplateDefinitions.find(
          template => template.id === templateId
        )?.label ?? "详情模板";
      setActionMessage(`已套用${templateLabel}，可继续局部调整后保存`);
    },
    [detailTemplateContext]
  );

  const applyCommerceContentTemplate = useCallback(() => {
    applyDesignerTemplate("warm_course");
  }, [applyDesignerTemplate]);

  const updateSelectedDesignerStyle = useCallback(
    (patch: Partial<DetailBlockStyleState>) => {
      setContentForm(current => {
        if (detailDesignerSelection.kind === "asset") {
          return {
            ...current,
            imageAssets: current.imageAssets.map(asset =>
              asset.id === detailDesignerSelection.id
                ? {
                    ...asset,
                    style: detailBlockStyleFromValue({
                      ...asset.style,
                      ...patch,
                    }),
                  }
                : asset
            ),
          };
        }

        if (detailDesignerSelection.kind === "block") {
          return {
            ...current,
            richTextBlocks: current.richTextBlocks.map(block =>
              block.id === detailDesignerSelection.id
                ? {
                    ...block,
                    style: detailBlockStyleFromValue({
                      ...block.style,
                      ...patch,
                    }),
                  }
                : block
            ),
          };
        }

        return current;
      });
    },
    [detailDesignerSelection]
  );

  const addDesignerBlock = useCallback(
    (type: CourseProductRichTextBlockType) => {
      const nextBlock = createH5BlockForm(type);
      setContentForm(current => ({
        ...current,
        richTextBlocks: [...current.richTextBlocks, nextBlock],
      }));
      setIsAdvancedH5Editing(true);
      setDetailDesignerSelection({ kind: "block", id: nextBlock.id });
    },
    []
  );

  const moveDesignerBlock = useCallback(
    (blockId: string, direction: "up" | "down") => {
      setContentForm(current => ({
        ...current,
        richTextBlocks: moveH5BlockForm(
          current.richTextBlocks,
          blockId,
          direction
        ),
      }));
      setIsAdvancedH5Editing(true);
      setDetailDesignerSelection({ kind: "block", id: blockId });
      setActiveDetailTemplateId(undefined);
      setActionError(undefined);
      setActionMessage(direction === "up" ? "内容块已上移" : "内容块已下移");
    },
    []
  );

  const duplicateDesignerBlock = useCallback(
    (blockId: string) => {
      const sourceBlock = contentForm.richTextBlocks.find(
        block => block.id === blockId
      );
      if (!sourceBlock) return;
      const duplicatedBlock = cloneH5BlockForm(sourceBlock);
      setContentForm(current => ({
        ...current,
        richTextBlocks: insertH5BlockAfter(
          current.richTextBlocks,
          blockId,
          duplicatedBlock
        ),
      }));
      setIsAdvancedH5Editing(true);
      setDetailDesignerSelection({ kind: "block", id: duplicatedBlock.id });
      setActiveDetailTemplateId(undefined);
      setActionError(undefined);
      setActionMessage("内容块已复制，可继续编辑副本");
    },
    [contentForm.richTextBlocks]
  );

  const requestRemoveDesignerBlock = useCallback((block: H5BlockFormState) => {
    setPendingBlockDelete(block);
  }, []);

  const confirmRemoveDesignerBlock = useCallback(() => {
    if (!pendingBlockDelete) return;
    const removedBlockId = pendingBlockDelete.id;
    setContentForm(current => ({
      ...current,
      richTextBlocks: removeH5BlockForm(current.richTextBlocks, removedBlockId),
    }));
    setIsAdvancedH5Editing(true);
    setActiveDetailTemplateId(undefined);
    setDetailDesignerSelection(current =>
      current.kind === "block" && current.id === removedBlockId
        ? { kind: "overview" }
        : current
    );
    setPendingBlockDelete(undefined);
    setActionError(undefined);
    setActionMessage("内容块已删除，保存图文内容后生效");
  }, [pendingBlockDelete]);

  const saveCurrentDetailTemplate = useCallback(async () => {
    if (!catalogPermissions.canEdit) {
      setActionError("当前账号暂无课程详情模板编辑权限");
      return;
    }
    const trimmedName =
      templateDraftName.trim() ||
      `${basicForm.title.trim() || product?.title || "课程详情"}模板`;
    setIsDetailTemplateSaving(true);
    try {
      const result =
        await httpCourseProductRepository.createCourseProductDetailTemplate({
          name: trimmedName,
          scope: "personal",
          sourceProductId: product?.id,
          content: createCourseProductDetailTemplateContent(contentForm),
          reason: normalizedOperationReason(reason, "保存课程详情运营模板"),
        });
      setSavedDetailTemplates(result.templates.items);
      setTemplateDraftName("");
      setActionError(undefined);
      setActionMessage("运营模板已保存到服务端模板库，可跨设备继续套用");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "课程详情模板保存失败"
      );
    } finally {
      setIsDetailTemplateSaving(false);
    }
  }, [
    basicForm.title,
    catalogPermissions.canEdit,
    contentForm,
    product?.title,
    product?.id,
    reason,
    templateDraftName,
  ]);

  const applySavedDetailTemplate = useCallback(
    async (templateId: string) => {
      if (!catalogPermissions.canEdit) {
        setActionError("当前账号暂无课程详情模板套用权限");
        return;
      }
      const template = savedDetailTemplates.find(
        item => item.id === templateId
      );
      if (!template) {
        setActionError("未找到该课程详情模板");
        return;
      }
      try {
        const result =
          await httpCourseProductRepository.applyCourseProductDetailTemplate(
            template.id,
            {
              productId: product?.id,
              reason: normalizedOperationReason(
                reason,
                `套用课程详情模板「${template.name}」`
              ),
            }
          );
        setSavedDetailTemplates(result.templates.items);
        setContentForm(current =>
          applyCourseProductDetailTemplateToForm(current, result.template)
        );
        setIsAdvancedH5Editing(true);
        setDetailDesignerSelection({ kind: "overview" });
        setActiveDetailTemplateId(undefined);
        setReason(current =>
          normalizedOperationReason(current, "课程商品详情模板更新")
        );
        setActionError(undefined);
        setActionMessage(`已套用「${template.name}」，保存图文内容后生效`);
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "课程详情模板套用失败"
        );
      }
    },
    [catalogPermissions.canEdit, product?.id, reason, savedDetailTemplates]
  );

  const deleteSavedDetailTemplate = useCallback(
    async (templateId: string) => {
      if (!catalogPermissions.canEdit) {
        setActionError("当前账号暂无课程详情模板删除权限");
        return;
      }
      const template = savedDetailTemplates.find(
        item => item.id === templateId
      );
      if (template?.scope === "system") {
        setActionError("系统模板不能删除");
        return;
      }
      if (
        template &&
        typeof window !== "undefined" &&
        !window.confirm(`确认删除模板草案「${template.name}」吗？`)
      ) {
        return;
      }
      try {
        const result =
          await httpCourseProductRepository.deleteCourseProductDetailTemplate(
            templateId,
            {
              reason: normalizedOperationReason(
                reason,
                `删除课程详情模板「${template?.name ?? templateId}」`
              ),
            }
          );
        setSavedDetailTemplates(result.templates.items);
        setActionError(undefined);
        setActionMessage("模板草案已删除");
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "课程详情模板删除失败"
        );
      }
    },
    [catalogPermissions.canEdit, reason, savedDetailTemplates]
  );

  const uploadMerchandisingAsset = useCallback(async () => {
    if (!product) {
      setActionError("请先创建课程商品后再上传素材");
      return;
    }
    if (!catalogPermissions.canEdit) {
      setActionError("当前账号暂无课程商品编辑权限");
      return;
    }
    if (!assetUploadFile) {
      setActionError("请先选择一张图片文件");
      return;
    }
    const resolvedMimeType = resolveImageMimeType(assetUploadFile);
    if (!resolvedMimeType) {
      setActionError("商品图文素材仅支持图片文件");
      return;
    }
    if (assetUploadFile.size > COURSE_PRODUCT_ASSET_MAX_SIZE_BYTES) {
      setActionError(
        `图片大小不能超过 ${formatFileSize(COURSE_PRODUCT_ASSET_MAX_SIZE_BYTES)}`
      );
      return;
    }

    setIsAssetUploading(true);
    setActionError(undefined);
    setActionMessage(undefined);
    try {
      const title =
        assetUploadTitle.trim() ||
        assetUploadFile.name.replace(/\.[^.]+$/, "") ||
        "课程商品图片";
      const result =
        await httpCourseProductRepository.uploadCourseProductAssetFile(
          product.id,
          {
            kind: assetUploadUsage === "proof" ? "proof_image" : "detail_image",
            title,
            fileName: assetUploadFile.name,
            mimeType: resolvedMimeType,
            sizeBytes: assetUploadFile.size,
            file: assetUploadFile,
            usage: assetUploadUsage,
            altText: title,
            note: "商品工作台上传",
            reason: normalizedOperationReason(reason, defaultAssetUploadReason),
          }
        );
      setAssetLibrary(result.assets);
      const formAsset = mediaAssetFormFromCourseProductAsset(
        result.asset,
        assetUploadUsage
      );
      if (formAsset) {
        setContentForm(current => ({
          ...current,
          imageAssets: upsertMediaAssetForm(current.imageAssets, formAsset),
          showcaseImageUrl:
            assetUploadUsage === "showcase" && result.asset.publicUrl
              ? result.asset.publicUrl
              : current.showcaseImageUrl,
          showcaseImageAlt:
            assetUploadUsage === "showcase" ? title : current.showcaseImageAlt,
        }));
      }
      setAssetUploadFile(undefined);
      setAssetUploadTitle("");
      setAssetUploadInputKey(current => current + 1);
      setActionMessage(
        "素材已上传并加入商品图片草稿，审核通过后会在前台详情中展示"
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "课程素材上传失败");
    } finally {
      setIsAssetUploading(false);
    }
  }, [
    assetUploadFile,
    assetUploadTitle,
    assetUploadUsage,
    catalogPermissions.canEdit,
    product,
    reason,
  ]);

  const submitReviewAction = useCallback(
    async (action: CourseProductReviewAction) => {
      if (!product) {
        setActionError("请先创建课程商品后再提交审核动作");
        return;
      }
      if (!catalogPermissions.canReview) {
        setActionError("当前账号暂无课程商品审核权限");
        return;
      }

      setIsSaving(true);
      setActionError(undefined);
      setActionMessage(undefined);
      try {
        const result =
          await httpCourseProductRepository.updateCourseProductReview(
            product.id,
            {
              action,
              reason,
            }
          );
        setProduct(result.product);
        if (content) {
          setServerContentQuality(evaluateCourseProductContentQuality(content));
        }
        setActionMessage(
          `${result.product.title} 已${courseProductReviewActionCopy[action]}`
        );
      } catch (err) {
        const quality = contentQualityFromError(err);
        if (quality) {
          setServerContentQuality(quality);
          setIsPublishSummaryOpen(true);
        }
        setActionError(
          err instanceof Error ? err.message : "课程商品审核状态更新失败"
        );
      } finally {
        setIsSaving(false);
      }
    },
    [catalogPermissions.canReview, content, product, reason]
  );

  const submitStatusAction = useCallback(
    async (targetStatus: CourseProductStatus) => {
      if (!product) {
        setActionError("请先创建课程商品后再执行上架动作");
        return;
      }
      if (!catalogPermissions.canPublish) {
        setActionError("当前账号暂无课程商品发布权限");
        return;
      }

      setIsSaving(true);
      setActionError(undefined);
      setActionMessage(undefined);
      try {
        const result =
          await httpCourseProductRepository.updateCourseProductStatus(
            product.id,
            {
              status: targetStatus,
              reason,
            }
          );
        setProduct(result.product);
        setActionMessage(
          `${result.product.title} 已${targetStatus === "published" ? "上架" : "下架"}`
        );
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "课程商品上架状态更新失败"
        );
      } finally {
        setIsSaving(false);
      }
    },
    [catalogPermissions.canPublish, product, reason]
  );

  if (isAuthSyncing || !isLoggedIn || !catalogPermissions.canRead) {
    return null;
  }

  const savePrimaryAction = isNew ? submitCreate : submitBasicUpdate;
  const activeStepIndex = Math.max(
    0,
    workspaceSteps.findIndex(step => step.id === activeStep)
  );

  return (
    <div className="text-[#243B35]">
      <section className="flex flex-col gap-4 border-b border-[#E1D7C8] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <button
            onClick={() => navigate("/admin/courses")}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#D8CEC0] bg-[#FFFDF8] px-3 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
          >
            <ChevronLeft className="h-4 w-4" />
            返回商品中心
          </button>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B7E6D]">
            课程商品工作台
          </p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
            {isNew ? "新增课程商品" : product?.title || "编辑课程商品"}
          </h1>
          <p className="mt-3 max-w-[760px] text-sm leading-6 text-[#6F7771]">
            按电商商品发布链路维护基础资料、商品图片、价格权益、H5
            详情和发布审核。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {product && (
            <button
              onClick={() => navigate(`/admin/courses/${product.courseId}`)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#CFC4B5] bg-[#FFFDF8] px-4 text-sm font-semibold text-[#355F51] transition hover:border-[#9FB3A9]"
            >
              <FilePenLine className="h-4 w-4" />
              内容详情
            </button>
          )}
          <button
            onClick={() => void savePrimaryAction()}
            disabled={
              isSaving ||
              !catalogPermissions.canEdit ||
              basicForm.title.trim().length < 2 ||
              basicForm.instructorName.trim().length < 1 ||
              reason.trim().length < 4
            }
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isNew ? (
              <Plus className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isNew ? "创建草稿" : "保存基础信息"}
          </button>
        </div>
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

      {isLoading ? (
        <div className="mt-8 flex min-h-[420px] items-center justify-center text-sm text-[#6F7771]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          正在读取课程商品
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <section className="rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] px-3 py-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#243B35]">
                <Layers3 className="h-4 w-4 text-[#6F8F83]" />
                编辑流程
              </div>
              <p className="text-xs text-[#8A8176]">
                当前第 {activeStepIndex + 1} 步 / 共 {workspaceSteps.length} 步
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {workspaceSteps.map((step, index) => {
                const isActive = activeStep === step.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveStep(step.id)}
                    className={`min-h-[62px] rounded-lg border px-3 py-2 text-left transition ${
                      isActive
                        ? "border-[#7FA394] bg-[#EEF6ED] shadow-sm"
                        : "border-[#E8DED0] bg-white hover:border-[#B8C7BC]"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          isActive
                            ? "bg-[#243B35] text-white"
                            : "bg-[#F2EADF] text-[#6F7771]"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="min-w-0 truncate text-sm font-semibold text-[#243B35]">
                        {step.label}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-xs leading-5 text-[#8A8176]">
                      {step.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] px-4 py-3">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,460px)_auto] xl:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={basicForm.coverUrl}
                  alt={basicForm.title || "课程商品主图"}
                  className="h-14 w-20 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-semibold text-[#243B35]">
                    {basicForm.title || "未命名课程商品"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-[#8A8176]">
                    <span>{basicForm.category}</span>
                    <span>·</span>
                    <span>{basicForm.type}</span>
                    <span>·</span>
                    <span>完整度 {completeness.label}</span>
                  </div>
                </div>
              </div>

              <label className="block text-xs font-semibold text-[#41524B]">
                操作原因
                <input
                  value={reason}
                  onChange={event => setReason(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
                />
              </label>

              <button
                onClick={() => setIsPublishSummaryOpen(current => !current)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#CFC4B5] bg-white px-4 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
              >
                <PanelRight className="h-4 w-4" />
                {isPublishSummaryOpen ? "收起发布信息" : "查看发布信息"}
              </button>
            </div>

            {isPublishSummaryOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="mt-3 grid gap-3 border-t border-[#E5DCCF] pt-3 text-xs leading-5 text-[#6F7771] md:grid-cols-5"
              >
                <p>
                  <span className="block text-[#8A8176]">课程 ID</span>
                  <span className="font-semibold text-[#243B35]">
                    {product?.courseId ?? "创建后生成"}
                  </span>
                </p>
                <p>
                  <span className="block text-[#8A8176]">商品状态</span>
                  <span className="font-semibold text-[#243B35]">
                    {product
                      ? courseProductStatusCopy[product.status]
                      : "草稿待创建"}
                  </span>
                </p>
                <p>
                  <span className="block text-[#8A8176]">审核状态</span>
                  <span className="font-semibold text-[#243B35]">
                    {product
                      ? courseProductReviewCopy[product.reviewStatus]
                      : "未提交"}
                  </span>
                </p>
                <p>
                  <span className="block text-[#8A8176]">商品图片</span>
                  <span className="font-semibold text-[#243B35]">
                    {contentForm.imageAssets.length} 张详情/证明图
                  </span>
                </p>
                <p>
                  <span className="block text-[#8A8176]">H5 内容</span>
                  <span className="font-semibold text-[#243B35]">
                    {previewRichTextBlocks.length} 个内容段落
                  </span>
                </p>
              </motion.div>
            )}
          </section>

          <motion.main
            key={activeStep}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden rounded-lg border border-[#E1D7C8] bg-[#FFFDF8]"
          >
            {activeStep === "basic" && (
              <SectionShell
                title="基础信息"
                description="面向课程货架、搜索、订单和详情页使用的核心商品资料。"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-semibold text-[#41524B]">
                    课程标题
                    <input
                      value={basicForm.title}
                      onChange={event =>
                        setBasicForm(current => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      placeholder="例如：压力管理进阶训练"
                      className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
                    />
                  </label>
                  <label className="text-sm font-semibold text-[#41524B]">
                    讲师
                    <input
                      value={basicForm.instructorName}
                      onChange={event =>
                        setBasicForm(current => ({
                          ...current,
                          instructorName: event.target.value,
                        }))
                      }
                      placeholder="例如：周老师"
                      className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
                    />
                  </label>
                </div>
                <label className="mt-4 block text-sm font-semibold text-[#41524B]">
                  封面图 URL
                  <input
                    value={basicForm.coverUrl}
                    onChange={event =>
                      setBasicForm(current => ({
                        ...current,
                        coverUrl: event.target.value,
                      }))
                    }
                    className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                  />
                </label>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <label className="text-sm font-semibold text-[#41524B]">
                    分类
                    <select
                      value={basicForm.category}
                      onChange={event =>
                        setBasicForm(current => ({
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
                      value={basicForm.type}
                      onChange={event =>
                        setBasicForm(current => ({
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
                      value={basicForm.learners}
                      onChange={event =>
                        setBasicForm(current => ({
                          ...current,
                          learners: event.target.value,
                        }))
                      }
                      className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                    />
                  </label>
                </div>
              </SectionShell>
            )}

            {activeStep === "media" && (
              <SectionShell
                title="商品图片"
                description="维护商品封面、成交主视觉、详情图和证明图，支撑移动端购买决策。"
              >
                <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
                  <div>
                    <div className="overflow-hidden rounded-lg border border-[#E1D7C8] bg-[#F8F3EA]">
                      <img
                        src={basicForm.coverUrl}
                        alt={basicForm.title || "课程商品主图"}
                        className="aspect-[4/3] w-full object-cover"
                      />
                    </div>
                    <p className="mt-3 text-xs leading-5 text-[#8A8176]">
                      封面图来自基础信息，会用于货架卡片和订单摘要；成交主视觉用于详情页首屏。
                    </p>
                    <button
                      onClick={() =>
                        setContentForm(current => ({
                          ...current,
                          showcaseImageUrl: basicForm.coverUrl,
                          showcaseImageAlt: basicForm.title,
                        }))
                      }
                      className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-[#CFC4B5] bg-white px-3 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
                    >
                      <FileImage className="h-4 w-4" />
                      同步为成交主视觉
                    </button>
                  </div>

                  <div className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-sm font-semibold text-[#41524B]">
                        成交主视觉 URL
                        <input
                          value={contentForm.showcaseImageUrl}
                          onChange={event =>
                            setContentForm(current => ({
                              ...current,
                              showcaseImageUrl: event.target.value,
                            }))
                          }
                          className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                        />
                      </label>
                      <label className="text-sm font-semibold text-[#41524B]">
                        主视觉说明
                        <input
                          value={contentForm.showcaseImageAlt}
                          onChange={event =>
                            setContentForm(current => ({
                              ...current,
                              showcaseImageAlt: event.target.value,
                            }))
                          }
                          placeholder="用于图片无障碍与素材备注"
                          className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
                        />
                      </label>
                    </div>

                    <div className="rounded-lg border border-[#E1D7C8] bg-[#FBF7EF] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-[#41524B]">
                            <ImagePlus className="h-4 w-4 text-[#6F8F83]" />
                            商品素材选择器
                          </div>
                          <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                            复用课程素材库图片，已审核素材可直接设为主视觉或加入详情图。
                          </p>
                        </div>
                        <button
                          onClick={() => void refreshAssetLibrary()}
                          disabled={!product || isAssetLibraryLoading}
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#CFC4B5] bg-white px-3 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isAssetLibraryLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          刷新素材
                        </button>
                      </div>

                      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                        <div>
                          {isAssetLibraryLoading ? (
                            <div className="flex min-h-[136px] items-center justify-center rounded-lg border border-dashed border-[#D8CEC0] bg-white text-sm text-[#6F7771]">
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              正在读取素材库
                            </div>
                          ) : merchandisingImageAssets.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-[#D8CEC0] bg-white px-4 py-5 text-sm text-[#6F7771]">
                              暂无可用于商品展示的图片素材，可以先上传一张课程场景图。
                            </div>
                          ) : (
                            <div className="grid gap-3 md:grid-cols-2">
                              {merchandisingImageAssets
                                .slice(0, 6)
                                .map(asset => {
                                  const ready = isStorefrontReadyAsset(asset);
                                  return (
                                    <div
                                      key={asset.id}
                                      className="grid gap-3 rounded-lg border border-[#E1D7C8] bg-white p-3 sm:grid-cols-[96px_minmax(0,1fr)]"
                                    >
                                      <div className="overflow-hidden rounded-lg bg-[#F8F3EA]">
                                        <img
                                          src={asset.publicUrl}
                                          alt={asset.altText || asset.title}
                                          className="aspect-[4/3] w-full object-cover"
                                        />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                          <p className="line-clamp-2 text-sm font-semibold leading-5 text-[#243B35]">
                                            {asset.title}
                                          </p>
                                          <span
                                            className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
                                              ready
                                                ? "bg-[#EEF6ED] text-[#41675A]"
                                                : "bg-[#FFF4EF] text-[#A65F48]"
                                            }`}
                                          >
                                            {
                                              assetComplianceStatusCopy[
                                                asset.complianceStatus
                                              ]
                                            }
                                          </span>
                                        </div>
                                        <p className="mt-1 text-xs text-[#8A8176]">
                                          {asset.kind === "proof_image"
                                            ? "证明图"
                                            : "详情图"}{" "}
                                          · {asset.fileName}
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                          <button
                                            onClick={() =>
                                              applyAssetToContentForm(
                                                asset,
                                                "gallery"
                                              )
                                            }
                                            className="inline-flex h-8 items-center rounded-lg border border-[#D8CEC0] px-2.5 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
                                          >
                                            加入详情图
                                          </button>
                                          <button
                                            onClick={() =>
                                              applyAssetToContentForm(
                                                asset,
                                                "showcase"
                                              )
                                            }
                                            disabled={!ready}
                                            className="inline-flex h-8 items-center rounded-lg bg-[#243B35] px-2.5 text-xs font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-45"
                                          >
                                            设为主视觉
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                          <p className="mt-3 text-xs text-[#8A8176]">
                            素材库共 {merchandisingImageAssets.length} 张图片，
                            {storefrontReadyAssetCount} 张已可前台展示。
                          </p>
                        </div>

                        <div className="rounded-lg border border-[#E1D7C8] bg-white p-3">
                          <p className="text-sm font-semibold text-[#41524B]">
                            上传商品图片
                          </p>
                          <input
                            key={assetUploadInputKey}
                            type="file"
                            accept="image/*"
                            onChange={event => {
                              const file = event.target.files?.[0];
                              setAssetUploadFile(file);
                              if (file && !assetUploadTitle.trim()) {
                                setAssetUploadTitle(
                                  file.name.replace(/\.[^.]+$/, "")
                                );
                              }
                            }}
                            className="mt-3 w-full rounded-lg border border-[#D8CEC0] bg-[#FFFDF8] px-3 py-2 text-xs text-[#6F7771] file:mr-3 file:rounded-md file:border-0 file:bg-[#243B35] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                          />
                          <input
                            value={assetUploadTitle}
                            onChange={event =>
                              setAssetUploadTitle(event.target.value)
                            }
                            placeholder="素材标题"
                            className="mt-3 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
                          />
                          <select
                            value={assetUploadUsage}
                            onChange={event =>
                              setAssetUploadUsage(
                                event.target
                                  .value as CourseProductMerchandisingAssetUsage
                              )
                            }
                            className="mt-3 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83]"
                          >
                            {merchandisingAssetUsageOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => void uploadMerchandisingAsset()}
                            disabled={
                              !product ||
                              !assetUploadFile ||
                              isAssetUploading ||
                              !catalogPermissions.canEdit
                            }
                            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isAssetUploading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            上传并加入草稿
                          </button>
                          <p className="mt-3 text-xs leading-5 text-[#8A8176]">
                            新上传素材默认待审核，保存商品图片后会进入内容复审。
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-[#41524B]">
                          <ImagePlus className="h-4 w-4 text-[#6F8F83]" />
                          详情图与证明图
                        </div>
                        <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                          支持手动 URL、已审核素材和工作台上传素材。
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setContentForm(current => ({
                            ...current,
                            imageAssets: [
                              ...current.imageAssets,
                              createMediaAssetForm("gallery"),
                            ],
                          }))
                        }
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#CFC4B5] bg-white px-3 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
                      >
                        <Plus className="h-4 w-4" />
                        添加图片
                      </button>
                    </div>

                    <div className="space-y-3">
                      {contentForm.imageAssets.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-[#D8CEC0] bg-[#FBF7EF] px-4 py-5 text-sm text-[#6F7771]">
                          还没有详情图。建议至少添加一张课程场景图或学习反馈证明图。
                        </div>
                      ) : (
                        contentForm.imageAssets.map((asset, assetIndex) => (
                          <div
                            key={asset.id}
                            className="grid gap-3 rounded-lg border border-[#E1D7C8] bg-white p-3 md:grid-cols-[120px_minmax(0,1fr)_auto]"
                          >
                            <div className="overflow-hidden rounded-lg bg-[#F8F3EA]">
                              {asset.imageUrl ? (
                                <img
                                  src={asset.imageUrl}
                                  alt={asset.altText || asset.title}
                                  className="aspect-[4/3] w-full object-cover"
                                />
                              ) : (
                                <div className="flex aspect-[4/3] items-center justify-center text-[#A39A90]">
                                  <FileImage className="h-6 w-6" />
                                </div>
                              )}
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <input
                                value={asset.title}
                                onChange={event =>
                                  setContentForm(current => ({
                                    ...current,
                                    imageAssets: current.imageAssets.map(
                                      (item, index) =>
                                        index === assetIndex
                                          ? {
                                              ...item,
                                              title: event.target.value,
                                            }
                                          : item
                                    ),
                                  }))
                                }
                                placeholder="图片标题"
                                className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
                              />
                              <select
                                value={asset.usage}
                                onChange={event =>
                                  setContentForm(current => ({
                                    ...current,
                                    imageAssets: current.imageAssets.map(
                                      (item, index) =>
                                        index === assetIndex
                                          ? {
                                              ...item,
                                              usage: event.target
                                                .value as CourseProductMerchandisingAssetUsage,
                                            }
                                          : item
                                    ),
                                  }))
                                }
                                className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83]"
                              >
                                {merchandisingAssetUsageOptions.map(option => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <input
                                value={asset.imageUrl}
                                onChange={event =>
                                  setContentForm(current => ({
                                    ...current,
                                    imageAssets: current.imageAssets.map(
                                      (item, index) =>
                                        index === assetIndex
                                          ? {
                                              ...item,
                                              imageUrl: event.target.value,
                                            }
                                          : item
                                    ),
                                  }))
                                }
                                placeholder="https://... 或 /api/..."
                                className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83] md:col-span-2"
                              />
                              <input
                                value={asset.altText}
                                onChange={event =>
                                  setContentForm(current => ({
                                    ...current,
                                    imageAssets: current.imageAssets.map(
                                      (item, index) =>
                                        index === assetIndex
                                          ? {
                                              ...item,
                                              altText: event.target.value,
                                            }
                                          : item
                                    ),
                                  }))
                                }
                                placeholder="图片说明"
                                className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83] md:col-span-2"
                              />
                              <div className="md:col-span-2">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    asset.complianceStatus === "approved" ||
                                    asset.complianceStatus === "not_required"
                                      ? "bg-[#EEF6ED] text-[#41675A]"
                                      : "bg-[#FFF4EF] text-[#A65F48]"
                                  }`}
                                >
                                  {
                                    assetComplianceStatusCopy[
                                      asset.complianceStatus
                                    ]
                                  }
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                setContentForm(current => ({
                                  ...current,
                                  imageAssets: current.imageAssets.filter(
                                    item => item.id !== asset.id
                                  ),
                                }))
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E1D7C8] text-[#A65F48] transition hover:bg-[#FFF4EF]"
                              aria-label="删除图片"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => void submitContentUpdate("商品图片")}
                        disabled={
                          isSaving ||
                          !product ||
                          !content ||
                          !catalogPermissions.canEdit
                        }
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        保存商品图片
                      </button>
                      <button
                        onClick={() =>
                          product
                            ? navigate(`/admin/courses/${product.courseId}`)
                            : setActiveStep("basic")
                        }
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#CFC4B5] bg-white px-4 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
                      >
                        <Layers3 className="h-4 w-4" />
                        {product ? "打开素材库" : "创建后管理素材"}
                      </button>
                    </div>
                  </div>
                </div>
              </SectionShell>
            )}

            {activeStep === "price" && (
              <SectionShell
                title="价格权益"
                description="课程商品售卖金额、划线价和会员权益入口。"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-semibold text-[#41524B]">
                    售价
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={priceForm.isFree}
                      value={priceForm.amount}
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
                <div className="mt-4 grid gap-3 md:grid-cols-2">
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
                {!isNew && (
                  <button
                    onClick={() => void submitPriceUpdate()}
                    disabled={
                      isSaving ||
                      !catalogPermissions.canPrice ||
                      reason.trim().length < 4
                    }
                    className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    保存价格权益
                  </button>
                )}
              </SectionShell>
            )}

            {activeStep === "content" && (
              <SectionShell
                title="详情装修器"
                description="按区块编辑课程商品详情，左侧管理结构，中间维护内容，右侧调整所选图片或段落样式。"
              >
                <div className="grid gap-5 xl:grid-cols-[248px_minmax(0,1fr)_320px]">
                  <CourseProductDetailStructurePanel
                    selection={detailDesignerSelection}
                    imageAssets={contentForm.imageAssets}
                    richTextBlocks={contentForm.richTextBlocks}
                    onSelectionChange={setDetailDesignerSelection}
                    onAddBlock={addDesignerBlock}
                    onMoveBlock={moveDesignerBlock}
                    onDuplicateBlock={duplicateDesignerBlock}
                    onRequestRemoveBlock={requestRemoveDesignerBlock}
                  />

                  <div className="space-y-5">
                    <div className="flex flex-col gap-3 border border-[#E1D7C8] bg-[#FBF7EF] p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[#243B35]">
                          <Target className="h-4 w-4 text-[#6F8F83]" />
                          运营快填
                        </div>
                        <p className="mt-1 text-xs leading-5 text-[#6F7771]">
                          按课程标题、分类、讲师自动补齐摘要、适合人群、成交卖点和移动端详情结构。
                        </p>
                      </div>
                      <button
                        onClick={applyCommerceContentTemplate}
                        className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047]"
                      >
                        生成成交内容
                      </button>
                    </div>

                    <label className="block text-sm font-semibold text-[#41524B]">
                      商品摘要
                      <textarea
                        value={contentForm.summary}
                        onChange={event =>
                          setContentForm(current => ({
                            ...current,
                            summary: event.target.value,
                          }))
                        }
                        className="mt-2 min-h-[96px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal leading-6 outline-none transition focus:border-[#6F8F83]"
                      />
                    </label>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-semibold text-[#41524B]">
                        适合人群
                        <textarea
                          value={contentForm.targetAudienceText}
                          onChange={event =>
                            setContentForm(current => ({
                              ...current,
                              targetAudienceText: event.target.value,
                            }))
                          }
                          className="mt-2 min-h-[112px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal leading-6 outline-none transition focus:border-[#6F8F83]"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-[#41524B]">
                        成交卖点
                        <textarea
                          value={contentForm.sellingPointsText}
                          onChange={event =>
                            setContentForm(current => ({
                              ...current,
                              sellingPointsText: event.target.value,
                            }))
                          }
                          className="mt-2 min-h-[112px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal leading-6 outline-none transition focus:border-[#6F8F83]"
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-sm font-semibold text-[#41524B]">
                        H5 标题
                        <input
                          value={contentForm.headline}
                          onChange={event =>
                            setContentForm(current => ({
                              ...current,
                              headline: event.target.value,
                            }))
                          }
                          className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                        />
                      </label>
                      <label className="text-sm font-semibold text-[#41524B]">
                        H5 副标题
                        <input
                          value={contentForm.subheadline}
                          onChange={event =>
                            setContentForm(current => ({
                              ...current,
                              subheadline: event.target.value,
                            }))
                          }
                          className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5DCCF] pt-5">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-[#41524B]">
                          <PanelRight className="h-4 w-4 text-[#6F8F83]" />
                          详情内容
                        </div>
                        <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                          默认根据摘要、适合人群和卖点自动生成移动端详情。
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setIsAdvancedH5Editing(current => !current)
                        }
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#CFC4B5] bg-white px-3 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
                      >
                        <PanelRight className="h-4 w-4" />
                        {isAdvancedH5Editing ? "使用简化编辑" : "高级内容块"}
                      </button>
                    </div>

                    {!isAdvancedH5Editing && (
                      <div className="border border-[#E1D7C8] bg-[#FBF7EF] px-4 py-3">
                        <p className="text-sm font-semibold text-[#243B35]">
                          简化编辑已开启
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#6F7771]">
                          保存时系统会生成标题、正文、要点和购买须知 4
                          个详情段落；运营只需要维护上方字段和商品图片。
                        </p>
                      </div>
                    )}

                    {isAdvancedH5Editing && (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5DCCF] pt-5">
                          <div>
                            <div className="flex items-center gap-2 text-sm font-semibold text-[#41524B]">
                              <PanelRight className="h-4 w-4 text-[#6F8F83]" />
                              H5 内容块
                            </div>
                            <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                              支持标题、正文、图片、要点、FAQ、讲师介绍和购买须知。
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => addDesignerBlock("paragraph")}
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#CFC4B5] bg-white px-3 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
                            >
                              <Plus className="h-4 w-4" />
                              添加内容块
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {contentForm.richTextBlocks.map(
                            (block, blockIndex) => (
                              <div
                                key={block.id}
                                className="rounded-lg border border-[#E1D7C8] bg-white p-4"
                              >
                                <div className="flex flex-wrap items-center gap-3">
                                  <select
                                    value={block.type}
                                    onChange={event =>
                                      setContentForm(current => ({
                                        ...current,
                                        richTextBlocks:
                                          current.richTextBlocks.map(
                                            (item, index) =>
                                              index === blockIndex
                                                ? {
                                                    ...createH5BlockForm(
                                                      event.target
                                                        .value as CourseProductRichTextBlockType
                                                    ),
                                                    id: item.id,
                                                    style: item.style,
                                                  }
                                                : item
                                          ),
                                      }))
                                    }
                                    className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83]"
                                  >
                                    {h5BlockTypeOptions.map(option => (
                                      <option
                                        key={option.value}
                                        value={option.value}
                                      >
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="ml-auto flex items-center gap-1">
                                    <button
                                      onClick={() =>
                                        moveDesignerBlock(block.id, "up")
                                      }
                                      disabled={blockIndex === 0}
                                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E1D7C8] text-[#6F7771] transition hover:border-[#9FB3A9] hover:text-[#243B35] disabled:cursor-not-allowed disabled:opacity-35"
                                      aria-label="上移内容块"
                                      title="上移"
                                    >
                                      <ArrowUp className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        moveDesignerBlock(block.id, "down")
                                      }
                                      disabled={
                                        blockIndex ===
                                        contentForm.richTextBlocks.length - 1
                                      }
                                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E1D7C8] text-[#6F7771] transition hover:border-[#9FB3A9] hover:text-[#243B35] disabled:cursor-not-allowed disabled:opacity-35"
                                      aria-label="下移内容块"
                                      title="下移"
                                    >
                                      <ArrowDown className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        duplicateDesignerBlock(block.id)
                                      }
                                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E1D7C8] text-[#6F7771] transition hover:border-[#9FB3A9] hover:text-[#243B35]"
                                      aria-label="复制内容块"
                                      title="复制"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        requestRemoveDesignerBlock(block)
                                      }
                                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E1D7C8] text-[#A65F48] transition hover:bg-[#FFF4EF]"
                                      aria-label="删除内容块"
                                      title="删除"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>

                                {block.type !== "paragraph" &&
                                  block.type !== "purchase_note" &&
                                  block.type !== "faq" && (
                                    <input
                                      value={block.title}
                                      onChange={event =>
                                        setContentForm(current => ({
                                          ...current,
                                          richTextBlocks:
                                            current.richTextBlocks.map(
                                              (item, index) =>
                                                index === blockIndex
                                                  ? {
                                                      ...item,
                                                      title: event.target.value,
                                                    }
                                                  : item
                                            ),
                                        }))
                                      }
                                      placeholder="内容块标题"
                                      className="mt-3 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
                                    />
                                  )}

                                {[
                                  "paragraph",
                                  "instructor_intro",
                                  "purchase_note",
                                ].includes(block.type) && (
                                  <textarea
                                    value={block.body}
                                    onChange={event =>
                                      setContentForm(current => ({
                                        ...current,
                                        richTextBlocks:
                                          current.richTextBlocks.map(
                                            (item, index) =>
                                              index === blockIndex
                                                ? {
                                                    ...item,
                                                    body: event.target.value,
                                                  }
                                                : item
                                          ),
                                      }))
                                    }
                                    placeholder="正文内容"
                                    className="mt-3 min-h-[96px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm leading-6 outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
                                  />
                                )}

                                {block.type === "image" && (
                                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                                    <div className="md:col-span-2 rounded-lg border border-[#E1D7C8] bg-[#FBF7EF] p-3">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                          <p className="text-xs font-semibold text-[#41524B]">
                                            从素材库选择图片
                                          </p>
                                          <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                                            仅展示已通过或免审素材，避免 H5
                                            图片绕过合规。
                                          </p>
                                        </div>
                                        <button
                                          onClick={() =>
                                            void refreshAssetLibrary()
                                          }
                                          disabled={
                                            !product || isAssetLibraryLoading
                                          }
                                          className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#CFC4B5] bg-white px-2.5 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          {isAssetLibraryLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <RefreshCw className="h-4 w-4" />
                                          )}
                                          刷新
                                        </button>
                                      </div>
                                      {storefrontReadyImageAssets.length ===
                                      0 ? (
                                        <div className="mt-3 rounded-lg border border-dashed border-[#D8CEC0] bg-white px-3 py-4 text-xs leading-5 text-[#6F7771]">
                                          还没有已通过图片素材。可先在“商品图片”步骤上传并完成合规处理。
                                        </div>
                                      ) : (
                                        <div className="mt-3 grid gap-2 lg:grid-cols-2">
                                          {storefrontReadyImageAssets
                                            .slice(0, 4)
                                            .map(asset => (
                                              <button
                                                key={asset.id}
                                                onClick={() =>
                                                  applyAssetToH5ImageBlock(
                                                    blockIndex,
                                                    asset
                                                  )
                                                }
                                                className="grid gap-2 rounded-lg border border-[#E1D7C8] bg-white p-2 text-left transition hover:border-[#9FB3A9] sm:grid-cols-[72px_minmax(0,1fr)]"
                                              >
                                                <span className="overflow-hidden rounded-md bg-[#F8F3EA]">
                                                  <img
                                                    src={asset.publicUrl}
                                                    alt={
                                                      asset.altText ||
                                                      asset.title
                                                    }
                                                    className="aspect-[4/3] w-full object-cover"
                                                  />
                                                </span>
                                                <span className="min-w-0">
                                                  <span className="line-clamp-1 text-xs font-semibold text-[#243B35]">
                                                    {asset.title}
                                                  </span>
                                                  <span className="mt-1 block text-[11px] text-[#8A8176]">
                                                    点击使用此图
                                                  </span>
                                                </span>
                                              </button>
                                            ))}
                                        </div>
                                      )}
                                    </div>
                                    <input
                                      value={block.imageUrl}
                                      onChange={event =>
                                        setContentForm(current => ({
                                          ...current,
                                          richTextBlocks:
                                            current.richTextBlocks.map(
                                              (item, index) =>
                                                index === blockIndex
                                                  ? {
                                                      ...item,
                                                      imageUrl:
                                                        event.target.value,
                                                    }
                                                  : item
                                            ),
                                        }))
                                      }
                                      placeholder="图片 URL"
                                      className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
                                    />
                                    <input
                                      value={block.altText}
                                      onChange={event =>
                                        setContentForm(current => ({
                                          ...current,
                                          richTextBlocks:
                                            current.richTextBlocks.map(
                                              (item, index) =>
                                                index === blockIndex
                                                  ? {
                                                      ...item,
                                                      altText:
                                                        event.target.value,
                                                    }
                                                  : item
                                            ),
                                        }))
                                      }
                                      placeholder="图片说明"
                                      className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
                                    />
                                  </div>
                                )}

                                {block.type === "bullet_list" && (
                                  <textarea
                                    value={block.itemsText}
                                    onChange={event =>
                                      setContentForm(current => ({
                                        ...current,
                                        richTextBlocks:
                                          current.richTextBlocks.map(
                                            (item, index) =>
                                              index === blockIndex
                                                ? {
                                                    ...item,
                                                    itemsText:
                                                      event.target.value,
                                                  }
                                                : item
                                          ),
                                      }))
                                    }
                                    placeholder="每行一条要点"
                                    className="mt-3 min-h-[96px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm leading-6 outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
                                  />
                                )}

                                {block.type === "faq" && (
                                  <div className="mt-3 grid gap-3">
                                    <input
                                      value={block.question}
                                      onChange={event =>
                                        setContentForm(current => ({
                                          ...current,
                                          richTextBlocks:
                                            current.richTextBlocks.map(
                                              (item, index) =>
                                                index === blockIndex
                                                  ? {
                                                      ...item,
                                                      question:
                                                        event.target.value,
                                                    }
                                                  : item
                                            ),
                                        }))
                                      }
                                      placeholder="用户常见问题"
                                      className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
                                    />
                                    <textarea
                                      value={block.answer}
                                      onChange={event =>
                                        setContentForm(current => ({
                                          ...current,
                                          richTextBlocks:
                                            current.richTextBlocks.map(
                                              (item, index) =>
                                                index === blockIndex
                                                  ? {
                                                      ...item,
                                                      answer:
                                                        event.target.value,
                                                    }
                                                  : item
                                            ),
                                        }))
                                      }
                                      placeholder="回答"
                                      className="min-h-[80px] rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm leading-6 outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
                                    />
                                  </div>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => void submitContentUpdate("图文内容")}
                        disabled={
                          isSaving ||
                          !product ||
                          !content ||
                          !catalogPermissions.canEdit
                        }
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        保存图文内容
                      </button>
                      <button
                        onClick={() =>
                          product
                            ? navigate(`/admin/courses/${product.courseId}`)
                            : setActiveStep("basic")
                        }
                        className="inline-flex h-10 w-fit items-center gap-2 rounded-lg border border-[#CFC4B5] bg-white px-4 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
                      >
                        <FilePenLine className="h-4 w-4" />
                        {product ? "打开章节资料" : "创建后编辑详情"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <CourseProductDetailStylePanel
                      selection={detailDesignerSelection}
                      selectedTitle={selectedDesignerTitle}
                      selectedStyle={selectedDesignerStyle}
                      selectedIsImage={selectedDesignerIsImage}
                      activeTemplateId={activeDetailTemplateId}
                      savedTemplates={savedDetailTemplates}
                      templateDraftName={templateDraftName}
                      isTemplateLoading={isDetailTemplateLoading}
                      isTemplateSaving={isDetailTemplateSaving}
                      onStyleChange={updateSelectedDesignerStyle}
                      onTemplateApply={applyDesignerTemplate}
                      onTemplateDraftNameChange={setTemplateDraftName}
                      onTemplateSave={saveCurrentDetailTemplate}
                      onSavedTemplateApply={applySavedDetailTemplate}
                      onSavedTemplateDelete={deleteSavedDetailTemplate}
                    />

                    <div className="h-fit rounded-[28px] border border-[#D8CEC0] bg-[#243B35] p-3">
                      <div className="overflow-hidden rounded-[22px] bg-[#FFFDF8]">
                        <div className="flex items-center gap-2 border-b border-[#E5DCCF] px-4 py-3 text-xs font-semibold text-[#6F7771]">
                          <Smartphone className="h-4 w-4" />
                          移动端预览
                        </div>
                        <img
                          src={
                            contentForm.showcaseImageUrl || basicForm.coverUrl
                          }
                          alt={contentForm.showcaseImageAlt || basicForm.title}
                          className="aspect-[4/3] w-full object-cover"
                        />
                        <div className="space-y-3 px-4 py-4">
                          <p className="text-lg font-semibold leading-7 text-[#243B35]">
                            {contentForm.headline ||
                              basicForm.title ||
                              "H5 标题"}
                          </p>
                          <p className="text-xs leading-5 text-[#6F7771]">
                            {contentForm.subheadline ||
                              "这里展示移动端商品详情的副标题。"}
                          </p>
                          {contentForm.imageAssets.slice(0, 3).map(asset => (
                            <figure
                              key={asset.id}
                              className={`${detailStyleToneClass(asset.style)} ${detailStylePaddingClass(asset.style)} ${detailStyleRadiusClass(asset.style)} overflow-hidden border`}
                            >
                              {asset.imageUrl ? (
                                <img
                                  src={asset.imageUrl}
                                  alt={asset.altText || asset.title}
                                  className={`${detailImageAspectClass(asset.style)} w-full ${detailImageFitClass(asset.style)} bg-[#F8F3EA]`}
                                />
                              ) : (
                                <div
                                  className={`${detailImageAspectClass(asset.style)} flex w-full items-center justify-center bg-[#F8F3EA] text-[#A39A90]`}
                                >
                                  <FileImage className="h-5 w-5" />
                                </div>
                              )}
                              {asset.style.captionMode !== "hidden" && (
                                <figcaption
                                  className={`mt-2 text-xs leading-5 ${
                                    asset.style.tone === "deep"
                                      ? "text-white/72"
                                      : "text-[#6F7771]"
                                  }`}
                                >
                                  {asset.altText || asset.title}
                                </figcaption>
                              )}
                            </figure>
                          ))}
                          {previewRichTextBlocks.slice(0, 4).map(block => (
                            <div
                              key={block.id}
                              className={`${detailStyleToneClass(block.style)} ${detailStylePaddingClass(block.style)} ${detailStyleRadiusClass(block.style)} border`}
                            >
                              {block.type === "section_heading" && (
                                <p
                                  className={`text-sm font-semibold ${
                                    block.style.tone === "deep"
                                      ? "text-white"
                                      : "text-[#243B35]"
                                  }`}
                                >
                                  {block.title || "段落标题"}
                                </p>
                              )}
                              {block.type === "paragraph" && (
                                <p
                                  className={`text-xs leading-5 ${
                                    block.style.tone === "deep"
                                      ? "text-white/72"
                                      : "text-[#6F7771]"
                                  }`}
                                >
                                  {block.body || "正文内容预览"}
                                </p>
                              )}
                              {block.type === "purchase_note" && (
                                <p
                                  className={`text-xs leading-5 ${
                                    block.style.tone === "deep"
                                      ? "text-white/72"
                                      : "text-[#8B7E6D]"
                                  }`}
                                >
                                  {block.body || "购买须知预览"}
                                </p>
                              )}
                              {block.type === "bullet_list" && (
                                <ul className="space-y-1 text-xs text-[#6F7771]">
                                  {splitLines(block.itemsText).map(item => (
                                    <li key={item}>· {item}</li>
                                  ))}
                                </ul>
                              )}
                              {block.type === "faq" && (
                                <div className="text-xs leading-5">
                                  <p className="font-semibold text-[#243B35]">
                                    {block.question || "常见问题"}
                                  </p>
                                  <p className="mt-1 text-[#6F7771]">
                                    {block.answer || "问题回答预览"}
                                  </p>
                                </div>
                              )}
                              {block.type === "image" && (
                                <figure className="overflow-hidden">
                                  {block.imageUrl ? (
                                    <img
                                      src={block.imageUrl}
                                      alt={block.altText || block.title}
                                      className={`${detailImageAspectClass(block.style)} w-full ${detailImageFitClass(block.style)} bg-[#F8F3EA]`}
                                    />
                                  ) : (
                                    <div
                                      className={`${detailImageAspectClass(block.style)} flex w-full items-center justify-center bg-[#F8F3EA] text-[#A39A90]`}
                                    >
                                      <FileImage className="h-5 w-5" />
                                    </div>
                                  )}
                                  {block.style.captionMode !== "hidden" && (
                                    <figcaption
                                      className={`mt-2 text-xs leading-5 ${
                                        block.style.tone === "deep"
                                          ? "text-white/72"
                                          : "text-[#6F7771]"
                                      }`}
                                    >
                                      {block.altText ||
                                        block.title ||
                                        "课程详情图"}
                                    </figcaption>
                                  )}
                                </figure>
                              )}
                              {block.type === "instructor_intro" && (
                                <p
                                  className={`text-xs leading-5 ${
                                    block.style.tone === "deep"
                                      ? "text-white/72"
                                      : "text-[#6F7771]"
                                  }`}
                                >
                                  {block.body || "讲师介绍预览"}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </SectionShell>
            )}

            {activeStep === "publish" && (
              <SectionShell
                title="发布审核"
                description="商品创建后默认进入草稿和未提交审核，发布前必须完成内容与素材校验。"
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="border border-[#E1D7C8] bg-[#FBF7EF] px-4 py-3">
                    <p className="text-xs text-[#8A8176]">商品完整度</p>
                    <p className="mt-2 text-xl font-semibold text-[#243B35]">
                      {completeness.label}
                    </p>
                  </div>
                  <div className="border border-[#E1D7C8] bg-[#FBF7EF] px-4 py-3">
                    <p className="text-xs text-[#8A8176]">上架状态</p>
                    <p className="mt-2 text-xl font-semibold text-[#243B35]">
                      {product
                        ? courseProductStatusCopy[product.status]
                        : "待创建"}
                    </p>
                  </div>
                  <div className="border border-[#E1D7C8] bg-[#FBF7EF] px-4 py-3">
                    <p className="text-xs text-[#8A8176]">审核状态</p>
                    <p className="mt-2 text-xl font-semibold text-[#243B35]">
                      {product
                        ? courseProductReviewCopy[product.reviewStatus]
                        : "待创建"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
                  <div className="h-fit rounded-[28px] border border-[#D8CEC0] bg-[#243B35] p-3">
                    <div className="overflow-hidden rounded-[22px] bg-[#FFFDF8]">
                      <div className="flex items-center justify-between border-b border-[#E5DCCF] px-4 py-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#6F7771]">
                          <Smartphone className="h-4 w-4" />
                          移动成交页预览
                        </div>
                        <span className="rounded-full bg-[#EEF6ED] px-2 py-1 text-[11px] font-semibold text-[#41675A]">
                          发布前
                        </span>
                      </div>
                      <img
                        src={contentForm.showcaseImageUrl || basicForm.coverUrl}
                        alt={contentForm.showcaseImageAlt || basicForm.title}
                        className="aspect-[4/3] w-full object-cover"
                      />
                      <div className="space-y-4 px-4 py-4">
                        <div>
                          <p className="text-lg font-semibold leading-7 text-[#243B35]">
                            {contentForm.headline ||
                              basicForm.title ||
                              "课程商品标题"}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-[#6F7771]">
                            {contentForm.subheadline ||
                              contentForm.summary ||
                              "这里展示课程详情页首屏副标题。"}
                          </p>
                        </div>
                        <div className="flex items-end justify-between rounded-lg bg-[#F8F3EA] px-3 py-3">
                          <div>
                            <p className="text-[11px] font-semibold text-[#8A8176]">
                              售卖价格
                            </p>
                            <p className="mt-1 text-xl font-semibold text-[#A65F48]">
                              {formatWorkspacePrice(priceForm)}
                            </p>
                          </div>
                          <p className="text-[11px] font-semibold text-[#41675A]">
                            {priceForm.memberIncluded
                              ? "会员权益内"
                              : "单课购买"}
                          </p>
                        </div>
                        <div className="space-y-2">
                          {splitLines(contentForm.sellingPointsText)
                            .slice(0, 3)
                            .map((point, index) => (
                              <div
                                key={point}
                                className="flex items-start gap-2 text-xs leading-5 text-[#394A44]"
                              >
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#DDE8D9] text-[10px] font-semibold text-[#41675A]">
                                  {index + 1}
                                </span>
                                {point}
                              </div>
                            ))}
                        </div>
                        {contentForm.imageAssets.slice(0, 2).length > 0 && (
                          <div className="grid gap-2 grid-cols-2">
                            {contentForm.imageAssets.slice(0, 2).map(asset => (
                              <div
                                key={asset.id}
                                className="overflow-hidden rounded-lg bg-[#F8F3EA]"
                              >
                                {asset.imageUrl ? (
                                  <img
                                    src={asset.imageUrl}
                                    alt={asset.altText || asset.title}
                                    className="aspect-[4/3] w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex aspect-[4/3] items-center justify-center text-[#A39A90]">
                                    <FileImage className="h-5 w-5" />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="space-y-3 border-t border-[#EFE7DA] pt-3">
                          {previewRichTextBlocks.slice(0, 5).map(block => (
                            <div key={block.id} className="text-xs leading-5">
                              {block.type === "section_heading" && (
                                <p className="font-semibold text-[#243B35]">
                                  {block.title || "段落标题"}
                                </p>
                              )}
                              {[
                                "paragraph",
                                "instructor_intro",
                                "purchase_note",
                              ].includes(block.type) && (
                                <p className="text-[#6F7771]">
                                  {block.body || "正文内容预览"}
                                </p>
                              )}
                              {block.type === "image" && (
                                <div className="overflow-hidden rounded-lg bg-[#F8F3EA]">
                                  {block.imageUrl ? (
                                    <img
                                      src={block.imageUrl}
                                      alt={block.altText || block.title}
                                      className="aspect-[16/9] w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex aspect-[16/9] items-center justify-center text-[#A39A90]">
                                      <FileImage className="h-5 w-5" />
                                    </div>
                                  )}
                                </div>
                              )}
                              {block.type === "bullet_list" && (
                                <ul className="space-y-1 text-[#6F7771]">
                                  {splitLines(block.itemsText).map(item => (
                                    <li key={item}>· {item}</li>
                                  ))}
                                </ul>
                              )}
                              {block.type === "faq" && (
                                <div>
                                  <p className="font-semibold text-[#243B35]">
                                    {block.question || "常见问题"}
                                  </p>
                                  <p className="mt-1 text-[#6F7771]">
                                    {block.answer || "问题回答预览"}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-lg border border-[#E1D7C8] bg-[#FBF7EF] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#243B35]">
                            发布前预检
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                            聚合商品信息、图文内容、素材合规和操作原因，减少发布后返工。
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                            publishPreflightWarnings.length === 0
                              ? "bg-[#EEF6ED] text-[#41675A]"
                              : "bg-[#FFF4EF] text-[#A65F48]"
                          }`}
                        >
                          {publishPreflightWarnings.length === 0
                            ? "可提交审核"
                            : `${publishPreflightWarnings.length} 项提醒`}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg border border-[#E1D7C8] bg-white px-4 py-3">
                          <p className="text-xs text-[#8A8176]">商品图片</p>
                          <p className="mt-2 text-lg font-semibold text-[#243B35]">
                            {contentForm.imageAssets.length} 张
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                            {pendingMerchandisingAssetCount > 0
                              ? `${pendingMerchandisingAssetCount} 张需处理合规`
                              : "素材合规状态正常"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-[#E1D7C8] bg-white px-4 py-3">
                          <p className="text-xs text-[#8A8176]">H5 内容</p>
                          <p className="mt-2 text-lg font-semibold text-[#243B35]">
                            {previewRichTextBlocks.length} 个内容段落
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                            {
                              previewRichTextBlocks.filter(
                                block => block.type === "image"
                              ).length
                            }{" "}
                            个图片块
                          </p>
                        </div>
                        <div className="rounded-lg border border-[#E1D7C8] bg-white px-4 py-3">
                          <p className="text-xs text-[#8A8176]">成交卖点</p>
                          <p className="mt-2 text-lg font-semibold text-[#243B35]">
                            {splitLines(contentForm.sellingPointsText).length}{" "}
                            条
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                            建议保留 2-6 条，移动端更易扫读
                          </p>
                        </div>
                        <div className="rounded-lg border border-[#E1D7C8] bg-white px-4 py-3">
                          <p className="text-xs text-[#8A8176]">价格权益</p>
                          <p className="mt-2 text-lg font-semibold text-[#243B35]">
                            {formatWorkspacePrice(priceForm)}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                            {priceForm.memberIncluded
                              ? "已纳入会员权益"
                              : "单课售卖商品"}
                          </p>
                        </div>
                      </div>

                      {publishPreflightWarnings.length > 0 ? (
                        <div className="mt-4 space-y-2">
                          {publishPreflightWarnings.map(warning => (
                            <div
                              key={warning}
                              className="flex items-start gap-2 rounded-lg border border-[#EDCDBF] bg-white px-3 py-2 text-xs leading-5 text-[#A65F48]"
                            >
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                              {warning}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#C8D8C8] bg-white px-3 py-2 text-xs leading-5 text-[#41675A]">
                          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                          当前商品内容、图片和操作原因已满足工作台发布前检查。
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-[#E1D7C8] bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#243B35]">
                            服务端内容质量
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                            提交审核会读取服务端已保存内容，阻塞项会定位到对应工作区。
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                            serverContentQuality?.ready
                              ? "bg-[#EEF6ED] text-[#41675A]"
                              : "bg-[#FFF4EF] text-[#A65F48]"
                          }`}
                        >
                          {serverContentQuality
                            ? serverContentQuality.ready
                              ? "内容可审"
                              : `${serverContentQuality.blockingCount} 个阻塞`
                            : "待提交校验"}
                        </span>
                      </div>

                      {serverContentQuality ? (
                        serverContentQuality.issues.length > 0 ? (
                          <div className="mt-4 space-y-2">
                            {serverContentQuality.issues.map(issue => {
                              const target = contentQualityIssueTarget(issue);
                              return (
                                <div
                                  key={`${issue.code}-${issue.path ?? "root"}`}
                                  className="grid gap-3 rounded-lg border border-[#E5DCCF] bg-[#FBF7EF] px-3 py-3 text-xs leading-5 md:grid-cols-[minmax(0,1fr)_auto]"
                                >
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className={`rounded-full px-2 py-0.5 font-semibold ${
                                          issue.severity === "blocking"
                                            ? "bg-[#FFF4EF] text-[#A65F48]"
                                            : "bg-[#FFF7E5] text-[#8F6B1C]"
                                        }`}
                                      >
                                        {issue.severity === "blocking"
                                          ? "阻塞"
                                          : "提醒"}
                                      </span>
                                      <span className="font-semibold text-[#243B35]">
                                        {target.label}
                                      </span>
                                    </div>
                                    <p className="mt-2 text-[#5F6B64]">
                                      {issue.message}
                                    </p>
                                    {issue.path && (
                                      <p className="mt-1 text-[#9A8F82]">
                                        字段：{issue.path}
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => {
                                      if (target.externalContent && product) {
                                        navigate(
                                          `/admin/courses/${product.courseId}`
                                        );
                                        return;
                                      }
                                      setActiveStep(target.step);
                                    }}
                                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#CFC4B5] bg-white px-3 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
                                  >
                                    {target.externalContent ? (
                                      <ExternalLink className="h-4 w-4" />
                                    ) : (
                                      <Target className="h-4 w-4" />
                                    )}
                                    {target.externalContent
                                      ? "打开内容详情"
                                      : "去处理"}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#C8D8C8] bg-[#EEF6ED] px-3 py-2 text-xs leading-5 text-[#41675A]">
                            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                            服务端已保存内容没有质量问题。
                          </div>
                        )
                      ) : (
                        <div className="mt-4 rounded-lg border border-dashed border-[#D8CEC0] bg-[#FBF7EF] px-3 py-3 text-xs leading-5 text-[#6F7771]">
                          首次提交审核后会返回结构化质量问题；保存 H5
                          详情后也会刷新本地质量判断。
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-[#E1D7C8] bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#243B35]">
                            审核动作
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                            在工作台直接提交、通过、驳回或撤回审核；操作原因复用顶部输入。
                          </p>
                        </div>
                        <span className="rounded-full bg-[#F1E8DC] px-3 py-1.5 text-xs font-semibold text-[#756B60]">
                          {product
                            ? courseProductReviewCopy[product.reviewStatus]
                            : "待创建"}
                        </span>
                      </div>

                      {availableReviewActions.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {availableReviewActions.map(action => {
                            const ReviewIcon = iconForReviewAction(
                              action.action
                            );
                            return (
                              <button
                                key={action.action}
                                onClick={() =>
                                  void submitReviewAction(action.action)
                                }
                                disabled={
                                  !product ||
                                  isSaving ||
                                  !catalogPermissions.canReview ||
                                  reason.trim().length < 4
                                }
                                className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                  action.action === "reject"
                                    ? "border border-[#EDCDBF] bg-[#FFF4EF] text-[#A65F48] hover:border-[#D9A995]"
                                    : action.action === "submit"
                                      ? "bg-[#243B35] text-white hover:bg-[#315047]"
                                      : "border border-[#CFC4B5] bg-[#FFFDF8] text-[#41524B] hover:border-[#9FB3A9]"
                                }`}
                              >
                                {isSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ReviewIcon className="h-4 w-4" />
                                )}
                                {courseProductReviewActionCopy[action.action]}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-lg border border-dashed border-[#D8CEC0] bg-[#FBF7EF] px-3 py-3 text-xs leading-5 text-[#6F7771]">
                          当前审核状态暂无可执行动作。若已通过审核，可回到商品中心执行上架/下架。
                        </div>
                      )}

                      {publishPreflightWarnings.length > 0 && (
                        <p className="mt-3 text-xs leading-5 text-[#A65F48]">
                          工作台预检仍有提醒，提交后服务端会按已保存内容拦截阻塞项。
                        </p>
                      )}
                    </div>

                    <div className="rounded-lg border border-[#E1D7C8] bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#243B35]">
                            上架状态
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                            审核通过后可在工作台执行上架或下架；操作原因复用顶部输入。
                          </p>
                        </div>
                        <span className="rounded-full bg-[#F1E8DC] px-3 py-1.5 text-xs font-semibold text-[#756B60]">
                          {product
                            ? courseProductStatusCopy[product.status]
                            : "待创建"}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-4">
                        {publishFlow.map(item => (
                          <div
                            key={item.label}
                            className={`border-l-2 py-1.5 pl-3 ${
                              item.active
                                ? "border-[#6F8F83]"
                                : "border-[#E5DCCF]"
                            }`}
                          >
                            <p className="text-[11px] font-semibold text-[#8A8176]">
                              {item.label}
                            </p>
                            <p
                              className={`mt-1 text-sm font-semibold ${
                                item.active
                                  ? "text-[#243B35]"
                                  : "text-[#7B817C]"
                              }`}
                            >
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>

                      {availableStatusAction ? (
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <button
                            onClick={() =>
                              void submitStatusAction(
                                availableStatusAction.targetStatus
                              )
                            }
                            disabled={
                              isSaving ||
                              !catalogPermissions.canPublish ||
                              reason.trim().length < 4
                            }
                            className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              availableStatusAction.targetStatus === "published"
                                ? "bg-[#243B35] text-white hover:bg-[#315047]"
                                : "border border-[#D8CEC0] bg-[#FFFDF8] text-[#41524B] hover:border-[#9FB3A9]"
                            }`}
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : availableStatusAction.targetStatus ===
                              "published" ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                            {availableStatusAction.label}
                          </button>
                          <p className="max-w-[520px] text-xs leading-5 text-[#6F7771]">
                            {availableStatusAction.description}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-lg border border-dashed border-[#D8CEC0] bg-[#FBF7EF] px-3 py-3 text-xs leading-5 text-[#6F7771]">
                          {product?.status === "archived"
                            ? "归档商品不能再执行上架状态动作。"
                            : product?.reviewStatus === "approved"
                              ? "当前上架状态暂无可执行动作。"
                              : "内容审核通过后才会出现上架动作。"}
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-[#E1D7C8] bg-white p-4">
                      <p className="text-sm font-semibold text-[#243B35]">
                        合规与复审边界
                      </p>
                      <div className="mt-3 space-y-2 text-xs leading-5 text-[#6F7771]">
                        <p>
                          · 商品图片、H5
                          内容和价格信息仍需保存后再执行审核动作。
                        </p>
                        <p>
                          · 待审核或驳回素材不会被允许作为 H5
                          图片块快速选择来源。
                        </p>
                        <p>
                          ·
                          审核和上架动作复用既有权限、状态机和审计，不绕过运营复核。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-start gap-3 rounded-lg border border-[#C8D8C8] bg-[#EEF6ED] px-4 py-3 text-sm text-[#41675A]">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    审核与上架动作已接入商品工作台；商品中心继续作为筛选和队列入口。
                  </span>
                </div>
              </SectionShell>
            )}
          </motion.main>
        </div>
      )}

      {pendingBlockDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18231F]/45 px-4">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-[460px] rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFF4EF] text-[#A65F48]">
                <Trash2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#A65F48]">
                  删除内容块
                </p>
                <h2 className="mt-2 text-lg font-semibold text-[#243B35]">
                  确认删除这个详情区块吗？
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6F7771]">
                  {pendingBlockDelete.title ||
                    pendingBlockDelete.question ||
                    pendingBlockDelete.body ||
                    "未命名内容块"}
                </p>
                <p className="mt-2 text-xs leading-5 text-[#8A8176]">
                  删除只会修改当前草稿，点击“保存图文内容”后才会同步到商品详情。
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setPendingBlockDelete(undefined)}
                className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-4 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
              >
                取消
              </button>
              <button
                onClick={confirmRemoveDesignerBlock}
                className="h-10 rounded-lg bg-[#A65F48] px-4 text-sm font-semibold text-white transition hover:bg-[#8E4E3C]"
              >
                确认删除
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
