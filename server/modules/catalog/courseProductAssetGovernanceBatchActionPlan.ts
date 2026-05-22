import {
  CourseProductAssetGovernanceBatchActionPlanQuerySchema,
  CourseProductAssetGovernanceBatchActionPlanResultSchema,
  type CourseProductAsset,
  type CourseProductAssetGovernanceBatchActionPlanAsset,
  type CourseProductAssetGovernanceBatchActionPlanQuery,
  type CourseProductAssetGovernanceBatchTaskExecutionPlanRiskLevel,
  type CourseProductAssetGovernanceDuplicateGroupPlan,
  type CourseProductAssetGovernanceItem,
  type CourseProductAssetGovernanceSoftDeleteImpactPlan,
  type CourseProductAssetReference,
  type CourseProductDetailContent,
} from "../../../shared/domain";
import {
  getCourseProductAssetStore,
  type CourseProductAssetStore,
} from "./courseProductAssetStore";
import {
  getCourseProductContentStore,
  type CourseProductContentStore,
} from "./courseProductContentStore";
import {
  getCourseProductStore,
  type CourseProductStore,
} from "./courseProductStore";
import { getCourseProductAssetGovernance } from "./courseProductAssetGovernance";

type FrontStageUsageMap = Map<string, string[]>;

export async function previewCourseProductAssetGovernanceBatchActionPlan({
  query = {},
  requestedBy,
  productStore = getCourseProductStore(),
  contentStore = getCourseProductContentStore(),
  assetStore = getCourseProductAssetStore(),
  now = new Date().toISOString(),
}: {
  query?: Partial<CourseProductAssetGovernanceBatchActionPlanQuery>;
  requestedBy: string;
  productStore?: CourseProductStore;
  contentStore?: CourseProductContentStore;
  assetStore?: CourseProductAssetStore;
  now?: string;
}) {
  const parsedQuery =
    CourseProductAssetGovernanceBatchActionPlanQuerySchema.parse(query);
  const governance = await getCourseProductAssetGovernance({
    productStore,
    contentStore,
    assetStore,
    now,
  });
  const scopedItems = governance.items.filter(
    item =>
      !parsedQuery.productId || item.asset.productId === parsedQuery.productId
  );
  const frontStageUsageByAssetId = await buildFrontStageUsageMap({
    items: scopedItems,
    contentStore,
  });
  const duplicateGroups =
    parsedQuery.action === "mark_soft_deleted"
      ? []
      : buildDuplicateGroupPlans({
          items: scopedItems,
          frontStageUsageByAssetId,
          previewSize: parsedQuery.previewSize,
        });
  const softDeleteCandidates =
    parsedQuery.action === "mark_duplicate_primary"
      ? []
      : buildSoftDeletePlans({
          items: scopedItems,
          frontStageUsageByAssetId,
          previewSize: parsedQuery.previewSize,
        });
  const allPlanRisks = [
    ...duplicateGroups.map(group => group.riskLevel),
    ...softDeleteCandidates.map(item => item.asset.riskLevel),
  ];

  return CourseProductAssetGovernanceBatchActionPlanResultSchema.parse({
    generatedAt: now,
    requestedBy,
    previewOnly: true,
    executable: false,
    willModifyAssetStore: false,
    willWriteAuditEvents: false,
    query: parsedQuery,
    summary: {
      duplicateGroupCount: duplicateGroups.length,
      duplicateAssetCount: duplicateGroups.reduce(
        (sum, group) => sum + group.duplicateAssetCount,
        0
      ),
      suggestedPrimaryAssetCount: duplicateGroups.filter(
        group => group.suggestedPrimaryAssetId
      ).length,
      affectedReferenceCount: duplicateGroups.reduce(
        (sum, group) => sum + group.affectedReferenceCount,
        0
      ),
      mergeCandidateReferenceCount: duplicateGroups.reduce(
        (sum, group) => sum + group.mergeCandidateReferenceCount,
        0
      ),
      softDeleteCandidateCount: softDeleteCandidates.length,
      safeSoftDeleteCandidateCount: softDeleteCandidates.filter(
        item => item.canSoftDeleteSafely
      ).length,
      blockedSoftDeleteCandidateCount: softDeleteCandidates.filter(
        item => !item.canSoftDeleteSafely
      ).length,
      frontStageUsageAssetCount: countFrontStageUsageAssets({
        duplicateGroups,
        softDeleteCandidates,
      }),
      highRiskItemCount: allPlanRisks.filter(risk => risk === "high").length,
      mediumRiskItemCount: allPlanRisks.filter(risk => risk === "medium")
        .length,
      lowRiskItemCount: allPlanRisks.filter(risk => risk === "low").length,
    },
    duplicateGroups,
    softDeleteCandidates,
    safetyNotes: buildSafetyNotes(governance.summary.referenceSource),
  });
}

function buildDuplicateGroupPlans({
  items,
  frontStageUsageByAssetId,
  previewSize,
}: {
  items: CourseProductAssetGovernanceItem[];
  frontStageUsageByAssetId: FrontStageUsageMap;
  previewSize: number;
}): CourseProductAssetGovernanceDuplicateGroupPlan[] {
  const groupsByHash = items.reduce((groups, item) => {
    if (!item.asset.contentHash || item.asset.deletedAt) return groups;
    const group = groups.get(item.asset.contentHash) ?? [];
    group.push(item);
    groups.set(item.asset.contentHash, group);
    return groups;
  }, new Map<string, CourseProductAssetGovernanceItem[]>());

  return Array.from(groupsByHash.entries())
    .filter(([, group]) => group.length >= 2)
    .map(([contentHash, group]) => {
      const primary = choosePrimaryAsset(group, frontStageUsageByAssetId);
      const referencesToMerge = group
        .filter(item => item.asset.id !== primary?.asset.id)
        .flatMap(item =>
          item.references.map(reference => ({
            fromAssetId: item.asset.id,
            toAssetId: primary?.asset.id ?? item.asset.id,
            reference,
            action: "retarget_to_primary" as const,
            requiresManualReview: true,
            reason: buildReferenceMergeReason({
              item,
              primary,
              reference,
            }),
          }))
        );
      const productIds = new Set(group.map(item => item.asset.productId));
      const crossProduct = productIds.size > 1;
      const affectedReferenceCount = group.reduce(
        (sum, item) => sum + item.referenceCount,
        0
      );
      const materialReferenceCount = group.reduce(
        (sum, item) =>
          sum +
          item.references.filter(reference =>
            reference.referenceType.startsWith("chapter_")
          ).length,
        0
      );
      const frontStageUsageAssetCount = group.filter(
        item => (frontStageUsageByAssetId.get(item.asset.id)?.length ?? 0) > 0
      ).length;
      const reviewReasons = duplicateGroupReviewReasons({
        group,
        crossProduct,
        affectedReferenceCount,
        frontStageUsageAssetCount,
      });
      const riskLevel = duplicateGroupRiskLevel({
        crossProduct,
        affectedReferenceCount,
        frontStageUsageAssetCount,
      });

      return {
        contentHash,
        assetIds: group.map(item => item.asset.id),
        suggestedPrimaryAssetId: primary?.asset.id,
        primarySelectionReason: primary
          ? primarySelectionReason(primary, frontStageUsageByAssetId)
          : undefined,
        duplicateAssetCount: group.length,
        affectedReferenceCount,
        mergeCandidateReferenceCount: referencesToMerge.length,
        materialPlaceholderReferenceCount: materialReferenceCount,
        frontStageUsageAssetCount,
        crossProduct,
        riskLevel,
        reviewReasons,
        assets: group.map(item =>
          planAssetFromGovernanceItem({
            item,
            frontStageUsageReasons:
              frontStageUsageByAssetId.get(item.asset.id) ?? [],
            riskLevel: duplicateAssetRiskLevel({
              item,
              frontStageUsageByAssetId,
              crossProduct,
            }),
            reviewReasons: duplicateAssetReviewReasons({
              item,
              frontStageUsageByAssetId,
              primaryAssetId: primary?.asset.id,
              crossProduct,
            }),
          })
        ),
        referencesToMerge,
      };
    })
    .sort((a, b) => {
      if (riskWeight(b.riskLevel) !== riskWeight(a.riskLevel)) {
        return riskWeight(b.riskLevel) - riskWeight(a.riskLevel);
      }
      return b.mergeCandidateReferenceCount - a.mergeCandidateReferenceCount;
    })
    .slice(0, previewSize);
}

function buildSoftDeletePlans({
  items,
  frontStageUsageByAssetId,
  previewSize,
}: {
  items: CourseProductAssetGovernanceItem[];
  frontStageUsageByAssetId: FrontStageUsageMap;
  previewSize: number;
}): CourseProductAssetGovernanceSoftDeleteImpactPlan[] {
  return items
    .filter(item => item.issueTypes.includes("soft_delete_candidate"))
    .map(item => {
      const frontStageUsageReasons =
        frontStageUsageByAssetId.get(item.asset.id) ?? [];
      const frontStageUsage = frontStageUsageReasons.length > 0;
      const hasReferences = item.referenceCount > 0;
      const isApproved = item.asset.complianceStatus === "approved";
      const downloadEnabled = item.asset.downloadEnabled;
      const riskLevel = softDeleteRiskLevel({
        hasReferences,
        isApproved,
        downloadEnabled,
        frontStageUsage,
      });
      const reviewReasons = softDeleteReviewReasons({
        item,
        hasReferences,
        isApproved,
        downloadEnabled,
        frontStageUsage,
      });
      const canSoftDeleteSafely =
        !hasReferences && !downloadEnabled && !frontStageUsage;

      return {
        asset: planAssetFromGovernanceItem({
          item,
          frontStageUsageReasons,
          riskLevel,
          reviewReasons,
        }),
        canSoftDeleteSafely,
        hasReferences,
        isApproved,
        downloadEnabled,
        frontStageUsage,
        willHideLearningDownload:
          isLearningMaterialAsset(item.asset) && downloadEnabled,
        reviewReasons,
      };
    })
    .sort((a, b) => {
      if (riskWeight(b.asset.riskLevel) !== riskWeight(a.asset.riskLevel)) {
        return riskWeight(b.asset.riskLevel) - riskWeight(a.asset.riskLevel);
      }
      return Number(a.canSoftDeleteSafely) - Number(b.canSoftDeleteSafely);
    })
    .slice(0, previewSize);
}

async function buildFrontStageUsageMap({
  items,
  contentStore,
}: {
  items: CourseProductAssetGovernanceItem[];
  contentStore: CourseProductContentStore;
}): Promise<FrontStageUsageMap> {
  const usageByAssetId: FrontStageUsageMap = new Map();
  const assetByProductId = items.reduce((groups, item) => {
    const group = groups.get(item.asset.productId) ?? [];
    group.push(item.asset);
    groups.set(item.asset.productId, group);
    return groups;
  }, new Map<string, CourseProductAsset[]>());

  for (const [productId, assets] of Array.from(assetByProductId.entries())) {
    const content = await contentStore.getContent(productId);
    if (!content) continue;
    assets.forEach((asset: CourseProductAsset) => {
      const reasons = frontStageUsageReasons(asset, content);
      if (reasons.length) usageByAssetId.set(asset.id, reasons);
    });
  }

  items.forEach(item => {
    const referenceReasons = item.references
      .filter(reference => reference.referenceType.startsWith("merchandising_"))
      .map(reference => `引用表:${reference.referenceType}`);
    if (!referenceReasons.length) return;
    usageByAssetId.set(item.asset.id, [
      ...(usageByAssetId.get(item.asset.id) ?? []),
      ...referenceReasons,
    ]);
  });

  return usageByAssetId;
}

function frontStageUsageReasons(
  asset: CourseProductAsset,
  content: CourseProductDetailContent
) {
  const reasons: string[] = [];
  if (asset.usage) reasons.push(`素材用途:${asset.usage}`);
  if (asset.kind === "detail_image") reasons.push("素材类型:详情主图");
  if (asset.kind === "proof_image") reasons.push("素材类型:证明图片");
  if (content.merchandising.showcaseImageUrl) {
    if (matchesAssetUrl(content.merchandising.showcaseImageUrl, asset)) {
      reasons.push("成交主视觉");
    }
  }
  content.merchandising.imageAssets.forEach(item => {
    if (item.id === asset.id || matchesAssetUrl(item.imageUrl, asset)) {
      reasons.push(`成交图库:${item.usage}`);
    }
  });
  return Array.from(new Set(reasons)).slice(0, 4);
}

function matchesAssetUrl(value: string, asset: CourseProductAsset) {
  if (asset.publicUrl && value === asset.publicUrl) return true;
  return value.includes(`/assets/${encodeURIComponent(asset.id)}/`);
}

function choosePrimaryAsset(
  group: CourseProductAssetGovernanceItem[],
  frontStageUsageByAssetId: FrontStageUsageMap
) {
  return [...group].sort((a, b) => {
    const referenceDelta = b.referenceCount - a.referenceCount;
    if (referenceDelta !== 0) return referenceDelta;
    const frontStageDelta =
      Number((frontStageUsageByAssetId.get(b.asset.id)?.length ?? 0) > 0) -
      Number((frontStageUsageByAssetId.get(a.asset.id)?.length ?? 0) > 0);
    if (frontStageDelta !== 0) return frontStageDelta;
    const approvalDelta =
      Number(b.asset.complianceStatus === "approved") -
      Number(a.asset.complianceStatus === "approved");
    if (approvalDelta !== 0) return approvalDelta;
    const downloadDelta =
      Number(b.asset.downloadEnabled) - Number(a.asset.downloadEnabled);
    if (downloadDelta !== 0) return downloadDelta;
    return a.asset.uploadedAt.localeCompare(b.asset.uploadedAt);
  })[0];
}

function primarySelectionReason(
  item: CourseProductAssetGovernanceItem,
  frontStageUsageByAssetId: FrontStageUsageMap
) {
  const reasons = [
    item.referenceCount > 0 ? `引用数 ${item.referenceCount}` : undefined,
    (frontStageUsageByAssetId.get(item.asset.id)?.length ?? 0) > 0
      ? "仍在成交素材位使用"
      : undefined,
    item.asset.complianceStatus === "approved" ? "合规已通过" : undefined,
    item.asset.downloadEnabled ? "下载已开放" : undefined,
  ].filter(Boolean);
  return reasons.length
    ? `建议保留：${reasons.join("、")}`
    : "建议保留上传时间最早的素材，仍需人工复核";
}

function planAssetFromGovernanceItem({
  item,
  frontStageUsageReasons,
  riskLevel,
  reviewReasons,
}: {
  item: CourseProductAssetGovernanceItem;
  frontStageUsageReasons: string[];
  riskLevel: CourseProductAssetGovernanceBatchTaskExecutionPlanRiskLevel;
  reviewReasons: string[];
}): CourseProductAssetGovernanceBatchActionPlanAsset {
  return {
    assetId: item.asset.id,
    productId: item.asset.productId,
    productTitle: item.product?.title,
    assetTitle: item.asset.title,
    assetKind: item.asset.kind,
    contentHash: item.asset.contentHash,
    complianceStatus: item.asset.complianceStatus,
    downloadEnabled: item.asset.downloadEnabled,
    deletedAt: item.asset.deletedAt,
    referenceCount: item.referenceCount,
    references: item.references,
    frontStageUsage: frontStageUsageReasons.length > 0,
    frontStageUsageReasons,
    riskLevel,
    reviewReasons,
  };
}

function duplicateGroupReviewReasons({
  group,
  crossProduct,
  affectedReferenceCount,
  frontStageUsageAssetCount,
}: {
  group: CourseProductAssetGovernanceItem[];
  crossProduct: boolean;
  affectedReferenceCount: number;
  frontStageUsageAssetCount: number;
}) {
  const reasons = ["重复素材需要人工确认主素材后再合并引用"];
  if (crossProduct) reasons.push("重复内容跨课程商品，不能自动合并");
  if (affectedReferenceCount > 0) {
    reasons.push(`涉及 ${affectedReferenceCount} 条现有引用`);
  }
  if (frontStageUsageAssetCount > 0) {
    reasons.push(`有 ${frontStageUsageAssetCount} 个素材仍在成交展示位使用`);
  }
  if (
    group.some(item => item.asset.complianceStatus !== "approved") &&
    group.some(item => item.asset.complianceStatus === "approved")
  ) {
    reasons.push("同组素材合规状态不一致");
  }
  return reasons;
}

function duplicateAssetReviewReasons({
  item,
  frontStageUsageByAssetId,
  primaryAssetId,
  crossProduct,
}: {
  item: CourseProductAssetGovernanceItem;
  frontStageUsageByAssetId: FrontStageUsageMap;
  primaryAssetId?: string;
  crossProduct: boolean;
}) {
  const reasons: string[] = [];
  if (item.asset.id === primaryAssetId) reasons.push("当前建议作为主素材");
  if ((frontStageUsageByAssetId.get(item.asset.id)?.length ?? 0) > 0) {
    reasons.push("仍在成交展示位使用");
  }
  if (item.referenceCount > 0) reasons.push(`已有引用 ${item.referenceCount}`);
  if (item.asset.complianceStatus !== "approved") {
    reasons.push(`合规状态为 ${item.asset.complianceStatus}`);
  }
  if (crossProduct) reasons.push("跨课程商品重复，需人工确认归属");
  return reasons.length ? reasons : ["可作为重复组候选，仍需人工确认"];
}

function duplicateGroupRiskLevel({
  crossProduct,
  affectedReferenceCount,
  frontStageUsageAssetCount,
}: {
  crossProduct: boolean;
  affectedReferenceCount: number;
  frontStageUsageAssetCount: number;
}): CourseProductAssetGovernanceBatchTaskExecutionPlanRiskLevel {
  if (crossProduct || frontStageUsageAssetCount > 0) return "high";
  if (affectedReferenceCount > 0) return "medium";
  return "low";
}

function duplicateAssetRiskLevel({
  item,
  frontStageUsageByAssetId,
  crossProduct,
}: {
  item: CourseProductAssetGovernanceItem;
  frontStageUsageByAssetId: FrontStageUsageMap;
  crossProduct: boolean;
}): CourseProductAssetGovernanceBatchTaskExecutionPlanRiskLevel {
  if (
    crossProduct ||
    (frontStageUsageByAssetId.get(item.asset.id)?.length ?? 0)
  ) {
    return "high";
  }
  if (item.referenceCount > 0 || item.asset.complianceStatus !== "approved") {
    return "medium";
  }
  return "low";
}

function softDeleteRiskLevel({
  hasReferences,
  isApproved,
  downloadEnabled,
  frontStageUsage,
}: {
  hasReferences: boolean;
  isApproved: boolean;
  downloadEnabled: boolean;
  frontStageUsage: boolean;
}): CourseProductAssetGovernanceBatchTaskExecutionPlanRiskLevel {
  if (hasReferences || frontStageUsage) return "high";
  if (isApproved || downloadEnabled) return "medium";
  return "low";
}

function softDeleteReviewReasons({
  item,
  hasReferences,
  isApproved,
  downloadEnabled,
  frontStageUsage,
}: {
  item: CourseProductAssetGovernanceItem;
  hasReferences: boolean;
  isApproved: boolean;
  downloadEnabled: boolean;
  frontStageUsage: boolean;
}) {
  const reasons: string[] = [];
  if (hasReferences) reasons.push("仍存在引用，不能直接软删除");
  if (frontStageUsage) reasons.push("仍可能被前台成交展示使用");
  if (downloadEnabled) reasons.push("下载开关仍开启，需先关闭或复核");
  if (isApproved) reasons.push("素材已审核通过，删除前需确认不影响成交/学习");
  if (item.asset.complianceStatus === "rejected") {
    reasons.push("素材已驳回且无引用，可优先清理");
  }
  if (!reasons.length) reasons.push("无引用且未开放下载，可作为低风险软删候选");
  return reasons;
}

function buildReferenceMergeReason({
  item,
  primary,
  reference,
}: {
  item: CourseProductAssetGovernanceItem;
  primary?: CourseProductAssetGovernanceItem;
  reference: CourseProductAssetReference;
}) {
  if (!primary) return "未选出主素材，引用合并需人工处理";
  if (primary.asset.productId !== item.asset.productId) {
    return "引用和建议主素材分属不同课程商品，必须人工复核";
  }
  if (reference.referenceType.startsWith("chapter_")) {
    return "章节素材占位可在后续写入阶段改指向主素材";
  }
  return "成交素材引用需人工确认展示位是否可合并";
}

function countFrontStageUsageAssets({
  duplicateGroups,
  softDeleteCandidates,
}: {
  duplicateGroups: CourseProductAssetGovernanceDuplicateGroupPlan[];
  softDeleteCandidates: CourseProductAssetGovernanceSoftDeleteImpactPlan[];
}) {
  const assetIds = new Set<string>();
  duplicateGroups.forEach(group => {
    group.assets.forEach(asset => {
      if (asset.frontStageUsage) assetIds.add(asset.assetId);
    });
  });
  softDeleteCandidates.forEach(item => {
    if (item.asset.frontStageUsage) assetIds.add(item.asset.assetId);
  });
  return assetIds.size;
}

function isLearningMaterialAsset(asset: Pick<CourseProductAsset, "kind">) {
  return ["chapter_material", "worksheet", "audio", "video"].includes(
    asset.kind
  );
}

function riskWeight(
  riskLevel: CourseProductAssetGovernanceBatchTaskExecutionPlanRiskLevel
) {
  if (riskLevel === "high") return 3;
  if (riskLevel === "medium") return 2;
  return 1;
}

function buildSafetyNotes(referenceSource: string) {
  return [
    "当前预案只读展示影响范围，不保存批量任务、不写审计、不修改素材 Store。",
    "mark_duplicate_primary 与 mark_soft_deleted 仍保持批量执行灰度关闭，后续需单独审批和开关。",
    referenceSource === "content_material_placeholders"
      ? "当前引用由章节素材占位推导，正式合并引用前建议先完成引用表回填。"
      : "当前引用来自引用表，可作为后续合并引用写入预检基础。",
  ];
}
