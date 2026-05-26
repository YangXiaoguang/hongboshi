import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import {
  AlertTriangle,
  BadgeCheck,
  ChevronLeft,
  FilePenLine,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  COURSE_PRODUCT_ASSET_KINDS,
  COURSE_PRODUCT_CONTENT_ASSET_REVIEW_STATUSES,
  COURSE_PRODUCT_CONTENT_MATERIAL_STATUSES,
  COURSE_PRODUCT_CONTENT_MATERIAL_TYPES,
  COURSE_PRODUCT_MERCHANDISING_ASSET_USAGES,
  CourseProductDetailContentSchema,
  evaluateCourseProductContentQuality,
  type CourseProductAsset,
  type CourseProductAssetKind,
  type CourseProductContentAssetReviewStatus,
  type CourseProductContentMaterialStatus,
  type CourseProductContentMaterialType,
  type CourseProductContentQualityResult,
  type CourseProductContentUpdateRequest,
  type CourseProductDetailContent,
  type CourseProductListItem,
  type CourseProductMerchandisingAssetUsage,
} from "@shared/domain";
import { useAuth } from "@/contexts/AuthContext";
import { httpCourseProductRepository } from "@/features/catalog";
import { getCourseProductAdminPermissions } from "@/features/catalog/model/courseProductAdminPermissions";

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
  style?: CourseProductDetailContent["merchandising"]["imageAssets"][number]["style"];
};
type ContentMerchandisingFormState = {
  headline: string;
  subheadline: string;
  showcaseImageUrl: string;
  showcaseImageAlt: string;
  sellingPointsText: string;
  imageAssets: ContentMerchandisingAssetFormState[];
  richTextBlocks: CourseProductDetailContent["merchandising"]["richTextBlocks"];
};
type ContentFormState = {
  summary: string;
  summaryRichText: CourseProductDetailContent["summaryRichText"];
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

function contentFormFromDetail(
  content: CourseProductDetailContent
): ContentFormState {
  return {
    summary: content.summary,
    summaryRichText: content.summaryRichText,
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
        style: asset.style,
      })),
      richTextBlocks: content.merchandising.richTextBlocks,
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
      style: asset.style,
    })),
    richTextBlocks: merchandising.richTextBlocks,
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

function defaultContentForm(): ContentFormState {
  return {
    summary: "",
    summaryRichText: { blocks: [] },
    targetAudienceText: "",
    merchandising: {
      headline: "",
      subheadline: "",
      showcaseImageUrl: "",
      showcaseImageAlt: "",
      sellingPointsText: "",
      imageAssets: [],
      richTextBlocks: [],
    },
    chapters: [],
    reason: "",
  };
}

function safeReturnTo() {
  if (typeof window === "undefined") return "/admin/courses";
  const returnTo = new URLSearchParams(window.location.search).get("returnTo");
  return returnTo?.startsWith("/admin/courses") ? returnTo : "/admin/courses";
}

export default function CourseProductContentEditorPage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/admin/courses/:courseId");
  const { user, isLoggedIn, isAuthSyncing } = useAuth();
  const returnTo = useMemo(safeReturnTo, []);
  const courseId = Number(params?.courseId);
  const [contentEditor, setContentEditor] = useState<CourseProductListItem>();
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [contentAssets, setContentAssets] = useState<CourseProductAsset[]>([]);
  const [mutatingAssetId, setMutatingAssetId] = useState<string>();
  const [mutatingProductId, setMutatingProductId] = useState<string>();
  const [assetForm, setAssetForm] =
    useState<AssetFormState>(createAssetFormState);
  const [contentForm, setContentForm] =
    useState<ContentFormState>(defaultContentForm);
  const [error, setError] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [actionMessage, setActionMessage] = useState<string>();

  const catalogPermissions = useMemo(
    () => getCourseProductAdminPermissions(user),
    [user]
  );

  const loadProductWorkspace = useCallback(async () => {
    if (!Number.isInteger(courseId) || courseId < 1) {
      setError("课程商品地址不正确");
      return;
    }

    setIsContentLoading(true);
    setError(undefined);
    try {
      const products = await httpCourseProductRepository.loadCourseProducts({
        keyword: String(courseId),
        page: 1,
        pageSize: 50,
      });
      const product = products.items.find(item => item.courseId === courseId);
      if (!product) {
        throw new Error("未找到对应课程商品");
      }

      setContentEditor(product);
      setContentAssets([]);
      setAssetForm(createAssetFormState());
      const [content, assets] = await Promise.all([
        httpCourseProductRepository.loadCourseProductContent(product.id),
        httpCourseProductRepository.loadCourseProductAssets(product.id),
      ]);
      setContentForm(contentFormFromDetail(content));
      setContentAssets(assets.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "课程商品详情内容读取失败");
    } finally {
      setIsContentLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (isAuthSyncing || !isLoggedIn || !catalogPermissions.canRead) return;
    void loadProductWorkspace();
  }, [
    catalogPermissions.canRead,
    isAuthSyncing,
    isLoggedIn,
    loadProductWorkspace,
  ]);

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
      summaryRichText: contentForm.summaryRichText,
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
      await loadProductWorkspace();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "课程商品详情内容更新失败"
      );
    } finally {
      setMutatingProductId(undefined);
    }
  }, [
    catalogPermissions.canEdit,
    contentEditor,
    contentForm,
    loadProductWorkspace,
  ]);

  const contentQuality = useMemo(() => {
    if (!contentEditor) return undefined;
    return contentQualityFromForm(contentEditor.id, contentForm);
  }, [contentEditor, contentForm]);

  if (isAuthSyncing || !isLoggedIn || !catalogPermissions.canRead) {
    return null;
  }

  if (!catalogPermissions.canEdit) {
    return (
      <div className="text-[#243B35]">
        <button
          onClick={() => navigate(returnTo)}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#D8CEC0] bg-[#FFFDF8] px-3 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
        >
          <ChevronLeft className="h-4 w-4" />
          返回商品列表
        </button>
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-[#EDCDBF] bg-[#FFF4EF] px-4 py-3 text-sm text-[#A65F48]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>当前账号暂无课程商品编辑权限</span>
        </div>
      </div>
    );
  }

  return (
    <div className="text-[#243B35]">
      <section className="flex flex-col gap-4 border-b border-[#E1D7C8] pb-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <button
            onClick={() => navigate(returnTo)}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#D8CEC0] bg-[#FFFDF8] px-3 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
          >
            <ChevronLeft className="h-4 w-4" />
            返回商品列表
          </button>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B7E6D]">
            课程商品详情
          </p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
            内容与成交素材
          </h1>
          <p className="mt-3 max-w-[760px] text-sm leading-6 text-[#6F7771]">
            独立维护课程详情文案、成交图文、章节资料和素材资产，避免商品列表页承载过重的编辑流程。
          </p>
        </div>
        <button
          onClick={() => void loadProductWorkspace()}
          disabled={isContentLoading}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-lg border border-[#CFC4B5] bg-[#FFFDF8] px-4 text-sm font-semibold text-[#355F51] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isContentLoading ? (
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

      {contentEditor ? (
        <section className="mt-6 rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-sm shadow-[#243B35]/5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#8A8176]">详情内容</p>
              <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                {contentEditor.title}
              </h2>
            </div>
            <button
              onClick={() => navigate(returnTo)}
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
                              · {assetReviewStatusCopy[asset.complianceStatus]}
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
                  onClick={() => navigate(returnTo)}
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
        </section>
      ) : (
        <section className="mt-6 flex min-h-[420px] items-center justify-center rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] text-sm text-[#6F7771]">
          {isContentLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              正在读取课程商品详情
            </>
          ) : (
            <span>未读取到课程商品详情</span>
          )}
        </section>
      )}
    </div>
  );
}
