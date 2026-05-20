import {
  CourseProductAssetBackfillPlanSchema,
  type CourseProductAsset,
  type CourseProductAssetBackfillPlan,
  type CourseProductAssetReferenceType,
  type CourseProductContentMaterial,
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

export async function dryRunCourseProductAssetBackfill({
  assetStore = getCourseProductAssetStore(),
  contentStore = getCourseProductContentStore(),
  productStore = getCourseProductStore(),
  now = new Date().toISOString(),
}: {
  assetStore?: CourseProductAssetStore;
  contentStore?: CourseProductContentStore;
  productStore?: CourseProductStore;
  now?: string;
} = {}): Promise<CourseProductAssetBackfillPlan> {
  const [products, assets] = await Promise.all([
    productStore.listProducts(),
    assetStore.listAssets(),
  ]);
  const productIds = new Set(products.map(product => product.id));
  const assetIds = new Set(assets.map(asset => asset.id));
  const notes: string[] = [];
  let referenceCount = 0;
  let skippedCount = 0;
  let scannedMaterialCount = 0;

  for (const asset of assets) {
    if (!productIds.has(asset.productId)) {
      skippedCount += 1;
      notes.push(`素材 ${asset.id} 指向不存在的课程商品 ${asset.productId}`);
      continue;
    }

    if (
      asset.sourceType === "object_storage" &&
      (!asset.objectKey || !asset.contentHash)
    ) {
      notes.push(
        `素材 ${asset.id} 缺少 objectKey 或 contentHash，正式回填前需补齐`
      );
    }

    if (asset.sourceType !== "object_storage") {
      notes.push(
        `素材 ${asset.id} 是 ${asset.sourceType}，dry-run 不强制转存对象`
      );
    }
  }

  for (const product of products) {
    const content = await contentStore.getContent(product.id);
    if (!content) continue;

    content.chapters.forEach(chapter => {
      chapter.materialPlaceholders.forEach((material, index) => {
        scannedMaterialCount += 1;
        if (!material.assetId) return;

        if (!assetIds.has(material.assetId)) {
          skippedCount += 1;
          notes.push(
            `课程商品 ${product.id} 章节 ${chapter.id} 的素材占位 ${material.id} 引用了不存在的素材 ${material.assetId}`
          );
          return;
        }

        getReferenceTypeForMaterial(material);
        referenceCount += 1;
      });
    });
  }

  return CourseProductAssetBackfillPlanSchema.parse({
    id: `asset_backfill_dry_run_${safeTimeId(now)}`,
    source: "json_asset_store_and_content_placeholders",
    dryRun: true,
    scannedCount: assets.length + scannedMaterialCount,
    assetCount: assets.filter(asset => productIds.has(asset.productId)).length,
    referenceCount,
    skippedCount,
    startedAt: now,
    finishedAt: now,
    notes: dedupeNotes(notes).slice(0, 30),
  });
}

export function getReferenceTypeForMaterial(
  material: Pick<CourseProductContentMaterial, "type">
): CourseProductAssetReferenceType {
  if (material.type === "exercise") return "chapter_exercise";
  if (material.type === "audio") return "chapter_audio";
  if (material.type === "video" || material.type === "live_replay") {
    return "chapter_video";
  }
  return "chapter_material";
}

export function summarizeCourseProductAssetForBackfill(
  asset: CourseProductAsset
) {
  return {
    id: asset.id,
    productId: asset.productId,
    chapterId: asset.chapterId,
    kind: asset.kind,
    sourceType: asset.sourceType,
    objectKey: asset.objectKey,
    contentHash: asset.contentHash,
    complianceStatus: asset.complianceStatus,
    downloadEnabled: asset.downloadEnabled,
  };
}

function safeTimeId(value: string) {
  return value.replace(/[^0-9A-Za-z]/g, "").slice(0, 24);
}

function dedupeNotes(notes: string[]) {
  return Array.from(new Set(notes));
}
