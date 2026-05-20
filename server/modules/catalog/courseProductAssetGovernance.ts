import {
  CourseProductAssetGovernanceResultSchema,
  CourseProductAssetReferenceSchema,
  type CourseProductAsset,
  type CourseProductAssetGovernanceIssueType,
  type CourseProductAssetGovernanceReferenceSource,
  type CourseProductAssetReference,
  type CourseProductAssetReferenceType,
  type CourseProductContentMaterial,
} from "../../../shared/domain";
import {
  getCourseProductAssetStore,
  type CourseProductAssetReferenceStore,
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

export async function getCourseProductAssetGovernance({
  assetStore = getCourseProductAssetStore(),
  contentStore = getCourseProductContentStore(),
  productStore = getCourseProductStore(),
  now = new Date().toISOString(),
}: {
  assetStore?: CourseProductAssetStore;
  contentStore?: CourseProductContentStore;
  productStore?: CourseProductStore;
  now?: string;
} = {}) {
  const [products, assets] = await Promise.all([
    productStore.listProducts(),
    assetStore.listAssets(),
  ]);
  const productById = new Map(products.map(product => [product.id, product]));
  const referenceStore = isCourseProductAssetReferenceStore(assetStore)
    ? assetStore
    : undefined;
  const referenceSource: CourseProductAssetGovernanceReferenceSource =
    referenceStore ? "reference_table" : "content_material_placeholders";
  const references: CourseProductAssetReference[] =
    referenceStore
      ? await referenceStore.listAssetReferences()
      : await inferCourseProductAssetReferencesFromContent({
          assets,
          contentStore,
          productStore,
          now,
        });
  const activeReferences = references.filter(reference => !reference.deletedAt);
  const referencesByAssetId = groupReferencesByAssetId(activeReferences);
  const duplicateAssetIdsByHash = buildDuplicateAssetIdsByHash(assets);
  const items = assets.map(asset => {
    const product = productById.get(asset.productId);
    const assetReferences = referencesByAssetId.get(asset.id) ?? [];
    const duplicateContentHashAssetIds = asset.contentHash
      ? duplicateAssetIdsByHash.get(asset.contentHash)?.filter(id => id !== asset.id) ??
        []
      : [];
    const issueTypes = getCourseProductAssetGovernanceIssueTypes({
      asset,
      productExists: Boolean(product),
      referenceCount: assetReferences.length,
      duplicateContentHashAssetIds,
    });
    const softDeleteCandidate = issueTypes.includes("soft_delete_candidate");

    return {
      asset,
      product: product
        ? {
            id: product.id,
            courseId: product.courseId,
            title: product.title,
            status: product.status,
            reviewStatus: product.reviewStatus,
          }
        : undefined,
      referenceCount: assetReferences.length,
      persistedReferenceCount:
        referenceSource === "reference_table" ? assetReferences.length : undefined,
      inferredReferenceCount:
        referenceSource === "content_material_placeholders"
          ? assetReferences.length
          : undefined,
      referenceSource,
      references: assetReferences,
      duplicateContentHashAssetIds,
      issueTypes,
      softDeleteCandidate,
    };
  });
  const duplicateGroups = Array.from(duplicateAssetIdsByHash.values());
  const notes = buildCourseProductAssetGovernanceNotes({
    referenceSource,
    missingProductAssetCount: items.filter(item =>
      item.issueTypes.includes("missing_product")
    ).length,
    duplicateGroupCount: duplicateGroups.length,
  });

  return CourseProductAssetGovernanceResultSchema.parse({
    generatedAt: now,
    summary: {
      totalAssetCount: assets.length,
      activeAssetCount: assets.filter(asset => !asset.deletedAt).length,
      referencedAssetCount: items.filter(item => item.referenceCount > 0).length,
      unreferencedAssetCount: items.filter(item =>
        item.issueTypes.includes("unreferenced")
      ).length,
      duplicateContentHashGroupCount: duplicateGroups.length,
      duplicateContentHashAssetCount: duplicateGroups.reduce(
        (sum, group) => sum + group.length,
        0
      ),
      pendingComplianceCount: assets.filter(
        asset => asset.complianceStatus === "pending"
      ).length,
      rejectedComplianceCount: assets.filter(
        asset => asset.complianceStatus === "rejected"
      ).length,
      downloadDisabledMaterialCount: items.filter(item =>
        item.issueTypes.includes("download_disabled_material")
      ).length,
      softDeleteCandidateCount: items.filter(item => item.softDeleteCandidate)
        .length,
      missingProductAssetCount: items.filter(item =>
        item.issueTypes.includes("missing_product")
      ).length,
      referenceCount: activeReferences.length,
      referenceSource,
    },
    items,
    notes,
  });
}

function isCourseProductAssetReferenceStore(
  store: CourseProductAssetStore
): store is CourseProductAssetStore & CourseProductAssetReferenceStore {
  return (
    typeof (store as unknown as CourseProductAssetReferenceStore)
      .listAssetReferences === "function"
  );
}

async function inferCourseProductAssetReferencesFromContent({
  assets,
  contentStore,
  productStore,
  now,
}: {
  assets: CourseProductAsset[];
  contentStore: CourseProductContentStore;
  productStore: CourseProductStore;
  now: string;
}) {
  const products = await productStore.listProducts();
  const assetById = new Map(assets.map(asset => [asset.id, asset]));
  const references: CourseProductAssetReference[] = [];

  for (const product of products) {
    const content = await contentStore.getContent(product.id);
    if (!content) continue;

    content.chapters.forEach(chapter => {
      chapter.materialPlaceholders.forEach((material, index) => {
        if (!material.assetId) return;
        const asset = assetById.get(material.assetId);
        if (!asset || asset.productId !== product.id) return;

        references.push(
          CourseProductAssetReferenceSchema.parse({
            id: createAssetReferenceId({
              productId: product.id,
              chapterId: chapter.id,
              materialId: material.id,
              assetId: material.assetId,
            }),
            assetId: material.assetId,
            productId: product.id,
            courseId: product.courseId,
            chapterId: chapter.id,
            referenceType: getReferenceTypeForMaterial(material),
            materialPlaceholderId: material.id,
            materialPlaceholderIndex: index,
            createdBy: "system_asset_governance",
            createdAt: now,
          })
        );
      });
    });
  }

  return references;
}

function groupReferencesByAssetId(references: CourseProductAssetReference[]) {
  return references.reduce((groups, reference) => {
    const group = groups.get(reference.assetId) ?? [];
    group.push(reference);
    groups.set(reference.assetId, group);
    return groups;
  }, new Map<string, CourseProductAssetReference[]>());
}

function buildDuplicateAssetIdsByHash(assets: CourseProductAsset[]) {
  const groups = assets.reduce((result, asset) => {
    if (!asset.contentHash || asset.deletedAt) return result;
    const group = result.get(asset.contentHash) ?? [];
    group.push(asset.id);
    result.set(asset.contentHash, group);
    return result;
  }, new Map<string, string[]>());

  Array.from(groups.entries()).forEach(([hash, assetIds]) => {
    if (assetIds.length < 2) {
      groups.delete(hash);
    }
  });

  return groups;
}

function getCourseProductAssetGovernanceIssueTypes({
  asset,
  productExists,
  referenceCount,
  duplicateContentHashAssetIds,
}: {
  asset: CourseProductAsset;
  productExists: boolean;
  referenceCount: number;
  duplicateContentHashAssetIds: string[];
}) {
  const issueTypes: CourseProductAssetGovernanceIssueType[] = [];

  if (!productExists) issueTypes.push("missing_product");
  if (!asset.deletedAt && referenceCount === 0) issueTypes.push("unreferenced");
  if (duplicateContentHashAssetIds.length > 0) {
    issueTypes.push("duplicate_content_hash");
  }
  if (asset.complianceStatus === "pending") {
    issueTypes.push("pending_compliance");
  }
  if (asset.complianceStatus === "rejected") {
    issueTypes.push("rejected_compliance");
  }
  if (isLearningMaterialAsset(asset) && !asset.downloadEnabled) {
    issueTypes.push("download_disabled_material");
  }
  if (
    !asset.deletedAt &&
    referenceCount === 0 &&
    asset.complianceStatus !== "pending"
  ) {
    issueTypes.push("soft_delete_candidate");
  }

  return issueTypes;
}

function buildCourseProductAssetGovernanceNotes({
  referenceSource,
  missingProductAssetCount,
  duplicateGroupCount,
}: {
  referenceSource: CourseProductAssetGovernanceReferenceSource;
  missingProductAssetCount: number;
  duplicateGroupCount: number;
}) {
  const notes: string[] = [];
  if (referenceSource === "content_material_placeholders") {
    notes.push(
      "当前素材 Store 不支持引用表读取，引用数量由课程章节素材占位推导"
    );
  }
  if (missingProductAssetCount > 0) {
    notes.push(`发现 ${missingProductAssetCount} 个素材指向不存在的课程商品`);
  }
  if (duplicateGroupCount > 0) {
    notes.push(`发现 ${duplicateGroupCount} 组重复 contentHash 素材`);
  }
  return notes;
}

function getReferenceTypeForMaterial(
  material: Pick<CourseProductContentMaterial, "type">
): CourseProductAssetReferenceType {
  if (material.type === "exercise") return "chapter_exercise";
  if (material.type === "audio") return "chapter_audio";
  if (material.type === "video" || material.type === "live_replay") {
    return "chapter_video";
  }
  return "chapter_material";
}

function isLearningMaterialAsset(asset: Pick<CourseProductAsset, "kind">) {
  return ["chapter_material", "worksheet", "audio", "video"].includes(
    asset.kind
  );
}

function createAssetReferenceId({
  productId,
  chapterId,
  materialId,
  assetId,
}: {
  productId: string;
  chapterId: string;
  materialId: string;
  assetId: string;
}) {
  return [
    "asset_ref",
    safeSegment(productId),
    safeSegment(chapterId),
    safeSegment(materialId),
    safeSegment(assetId),
  ].join("_");
}

function safeSegment(value: string) {
  return value.replace(/[^0-9A-Za-z_]/g, "_");
}
