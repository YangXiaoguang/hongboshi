import {
  CourseProductLearningMaterialOperationsReportSchema,
  type CourseProductAssetGovernanceIssueType,
  type CourseProductAssetGovernanceItem,
  type CourseProductAssetKind,
  type CourseProductAssetReferenceType,
  type CourseProductContentAssetReviewStatus,
} from "../../../shared/domain";
import {
  buildDefaultCourseProductContent,
  getCourseProductContentStore,
  type CourseProductContentStore,
} from "./courseProductContentStore";
import { getCourseProductAssetGovernance } from "./courseProductAssetGovernance";
import {
  getCourseProductAssetStore,
  type CourseProductAssetStore,
} from "./courseProductAssetStore";
import {
  getCourseProductStore,
  type CourseProductStore,
} from "./courseProductStore";

const learningMaterialKinds = new Set<CourseProductAssetKind>([
  "chapter_material",
  "worksheet",
  "audio",
  "video",
]);

export async function getCourseProductLearningMaterialOperationsReport({
  productStore = getCourseProductStore(),
  contentStore = getCourseProductContentStore(),
  assetStore = getCourseProductAssetStore(),
  now = new Date().toISOString(),
}: {
  productStore?: CourseProductStore;
  contentStore?: CourseProductContentStore;
  assetStore?: CourseProductAssetStore;
  now?: string;
} = {}) {
  const [products, governance] = await Promise.all([
    productStore.listProducts(),
    getCourseProductAssetGovernance({
      productStore,
      contentStore,
      assetStore,
      now,
    }),
  ]);
  const learningItems = governance.items.filter(item =>
    isLearningMaterialKind(item.asset.kind)
  );
  const activeLearningItems = learningItems.filter(
    item => !item.asset.deletedAt
  );
  const productRows = await Promise.all(
    products.map(async product => {
      const content =
        (await contentStore.getContent(product.id)) ??
        buildDefaultCourseProductContent(product, now);
      const materialSlotCount = content.chapters.reduce(
        (sum, chapter) => sum + chapter.materialPlaceholders.length,
        0
      );
      const boundMaterialSlotCount = content.chapters.reduce(
        (sum, chapter) =>
          sum +
          chapter.materialPlaceholders.filter(material =>
            Boolean(material.assetId)
          ).length,
        0
      );
      const productLearningItems = learningItems.filter(
        item => item.asset.productId === product.id
      );

      return {
        productId: product.id,
        courseId: product.courseId,
        title: product.title,
        status: product.status,
        reviewStatus: product.reviewStatus,
        chapterCount: content.chapters.length,
        materialSlotCount,
        boundMaterialSlotCount,
        materialBindingRate: ratio(boundMaterialSlotCount, materialSlotCount),
        learningMaterialAssetCount: productLearningItems.length,
        downloadableAssetCount: productLearningItems.filter(
          item => item.asset.downloadEnabled && !item.asset.deletedAt
        ).length,
        issueAssetCount: productLearningItems.filter(
          item => item.issueTypes.length > 0
        ).length,
      };
    })
  );
  const materialSlotCount = productRows.reduce(
    (sum, row) => sum + row.materialSlotCount,
    0
  );
  const boundMaterialSlotCount = productRows.reduce(
    (sum, row) => sum + row.boundMaterialSlotCount,
    0
  );

  return CourseProductLearningMaterialOperationsReportSchema.parse({
    generatedAt: now,
    summary: {
      totalProductCount: products.length,
      productWithMaterialSlotsCount: productRows.filter(
        row => row.materialSlotCount > 0
      ).length,
      chapterCount: productRows.reduce((sum, row) => sum + row.chapterCount, 0),
      materialSlotCount,
      boundMaterialSlotCount,
      materialBindingRate: ratio(boundMaterialSlotCount, materialSlotCount),
      totalAssetCount: governance.summary.totalAssetCount,
      learningMaterialAssetCount: learningItems.length,
      activeLearningMaterialAssetCount: activeLearningItems.length,
      approvedLearningMaterialAssetCount: activeLearningItems.filter(
        item => item.asset.complianceStatus === "approved"
      ).length,
      downloadableLearningMaterialAssetCount: activeLearningItems.filter(
        item => item.asset.downloadEnabled
      ).length,
      downloadDisabledLearningMaterialAssetCount: activeLearningItems.filter(
        item => !item.asset.downloadEnabled
      ).length,
      referencedLearningMaterialAssetCount: activeLearningItems.filter(
        item => item.referenceCount > 0
      ).length,
      unreferencedLearningMaterialAssetCount: activeLearningItems.filter(
        item => item.referenceCount === 0
      ).length,
      pendingComplianceLearningMaterialCount: activeLearningItems.filter(
        item => item.asset.complianceStatus === "pending"
      ).length,
      rejectedComplianceLearningMaterialCount: activeLearningItems.filter(
        item => item.asset.complianceStatus === "rejected"
      ).length,
      softDeleteCandidateLearningMaterialCount: activeLearningItems.filter(
        item => item.issueTypes.includes("soft_delete_candidate")
      ).length,
      governanceIssueLearningMaterialCount: activeLearningItems.filter(
        item => item.issueTypes.length > 0
      ).length,
      referenceSource: governance.summary.referenceSource,
    },
    assetKindDistribution: buildAssetKindDistribution(activeLearningItems),
    complianceStatusDistribution:
      buildComplianceStatusDistribution(activeLearningItems),
    downloadStatusDistribution:
      buildDownloadStatusDistribution(activeLearningItems),
    referenceTypeDistribution:
      buildReferenceTypeDistribution(activeLearningItems),
    issueTypeDistribution: buildIssueTypeDistribution(activeLearningItems),
    productRows: productRows
      .sort((left, right) => {
        if (right.issueAssetCount !== left.issueAssetCount) {
          return right.issueAssetCount - left.issueAssetCount;
        }
        return right.materialSlotCount - left.materialSlotCount;
      })
      .slice(0, 8),
    notes: buildReportNotes({
      bindingRate: ratio(boundMaterialSlotCount, materialSlotCount),
      referenceSource: governance.summary.referenceSource,
      issueCount: activeLearningItems.filter(item => item.issueTypes.length > 0)
        .length,
    }),
  });
}

function isLearningMaterialKind(kind: CourseProductAssetKind) {
  return learningMaterialKinds.has(kind);
}

function buildAssetKindDistribution(items: CourseProductAssetGovernanceItem[]) {
  return distribution(
    items.map(item => item.asset.kind),
    assetKindLabel
  );
}

function buildComplianceStatusDistribution(
  items: CourseProductAssetGovernanceItem[]
) {
  return distribution(
    items.map(item => item.asset.complianceStatus),
    complianceStatusLabel
  );
}

function buildDownloadStatusDistribution(
  items: CourseProductAssetGovernanceItem[]
) {
  return distribution(
    items.map(item =>
      item.asset.downloadEnabled ? "download_enabled" : "download_disabled"
    ),
    downloadStatusLabel
  );
}

function buildReferenceTypeDistribution(
  items: CourseProductAssetGovernanceItem[]
) {
  return distribution(
    items.flatMap(item =>
      item.references.map(reference => reference.referenceType)
    ),
    referenceTypeLabel
  );
}

function buildIssueTypeDistribution(items: CourseProductAssetGovernanceItem[]) {
  return distribution(
    items.flatMap(item => item.issueTypes),
    issueTypeLabel
  );
}

function distribution(keys: string[], labeler: (key: string) => string) {
  const countByKey = keys.reduce((result, key) => {
    result.set(key, (result.get(key) ?? 0) + 1);
    return result;
  }, new Map<string, number>());

  return Array.from(countByKey.entries())
    .map(([key, count]) => ({
      key,
      label: labeler(key),
      count,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      return left.label.localeCompare(right.label);
    });
}

function buildReportNotes({
  bindingRate,
  referenceSource,
  issueCount,
}: {
  bindingRate: number;
  referenceSource: string;
  issueCount: number;
}) {
  const notes: string[] = [];
  if (referenceSource === "content_material_placeholders") {
    notes.push("当前引用来自章节素材占位推导，后续可切换到引用表口径");
  }
  if (bindingRate < 0.6) {
    notes.push("章节资料绑定率偏低，建议优先补齐已发布课程的讲义和练习表");
  }
  if (issueCount > 0) {
    notes.push(`发现 ${issueCount} 个学习资料素材仍有治理问题`);
  }
  if (!notes.length) {
    notes.push("学习资料绑定和素材治理指标暂未发现明显异常");
  }
  return notes;
}

function assetKindLabel(key: string) {
  return (
    (
      {
        chapter_material: "章节资料",
        worksheet: "练习表",
        audio: "音频",
        video: "视频",
        detail_image: "详情图",
        proof_image: "证明图",
      } satisfies Record<CourseProductAssetKind, string>
    )[key as CourseProductAssetKind] ?? key
  );
}

function complianceStatusLabel(key: string) {
  return (
    (
      {
        not_required: "无需审核",
        pending: "待审核",
        approved: "已通过",
        rejected: "已驳回",
      } satisfies Record<CourseProductContentAssetReviewStatus, string>
    )[key as CourseProductContentAssetReviewStatus] ?? key
  );
}

function downloadStatusLabel(key: string) {
  if (key === "download_enabled") return "已开放下载";
  if (key === "download_disabled") return "下载关闭";
  return key;
}

function referenceTypeLabel(key: string) {
  return (
    (
      {
        merchandising_showcase: "成交主视觉",
        merchandising_proof: "成交证明",
        merchandising_gallery: "成交图库",
        chapter_material: "章节资料",
        chapter_exercise: "章节练习",
        chapter_audio: "章节音频",
        chapter_video: "章节视频",
      } satisfies Record<CourseProductAssetReferenceType, string>
    )[key as CourseProductAssetReferenceType] ?? key
  );
}

function issueTypeLabel(key: string) {
  return (
    (
      {
        missing_product: "商品缺失",
        unreferenced: "未引用",
        duplicate_content_hash: "重复内容",
        pending_compliance: "待审核",
        rejected_compliance: "已驳回",
        download_disabled_material: "下载关闭",
        soft_delete_candidate: "软删候选",
      } satisfies Record<CourseProductAssetGovernanceIssueType, string>
    )[key as CourseProductAssetGovernanceIssueType] ?? key
  );
}

function ratio(part: number, total: number) {
  if (total <= 0) return 0;
  return Number((part / total).toFixed(4));
}
