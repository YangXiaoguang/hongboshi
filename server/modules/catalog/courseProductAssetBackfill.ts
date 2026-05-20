import {
  CourseProductAssetBackfillMutationResultSchema,
  CourseProductAssetBackfillPlanSchema,
  CourseProductAssetReferenceSchema,
  CourseProductAssetSchema,
  type CourseProductAsset,
  type CourseProductAssetBackfillMutationResult,
  type CourseProductAssetBackfillPlan,
  type CourseProductAssetReference,
  type CourseProductAssetReferenceType,
  type CourseProductContentMaterial,
} from "../../../shared/domain";
import { getDatabaseUrl, getSharedPostgresPool } from "../../db/postgres";
import {
  getCourseProductAssetStore,
  JsonFileCourseProductAssetStore,
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
import { PostgresCourseProductAssetStore } from "./postgresCourseProductAssetStore";

type CourseProductAssetBackfillCollection = {
  plan: CourseProductAssetBackfillPlan;
  assets: CourseProductAsset[];
  references: CourseProductAssetReference[];
  referenceCountByAssetId: Map<string, number>;
};

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
  return (
    await collectCourseProductAssetBackfill({
      assetStore,
      contentStore,
      productStore,
      now,
      dryRun: true,
    })
  ).plan;
}

export async function previewCourseProductAssetBackfill({
  assetStore = getCourseProductAssetStore(),
  contentStore = getCourseProductContentStore(),
  productStore = getCourseProductStore(),
  actorId,
  now = new Date().toISOString(),
}: {
  assetStore?: CourseProductAssetStore;
  contentStore?: CourseProductContentStore;
  productStore?: CourseProductStore;
  actorId?: string;
  now?: string;
} = {}): Promise<CourseProductAssetBackfillMutationResult> {
  const plan = await dryRunCourseProductAssetBackfill({
    assetStore,
    contentStore,
    productStore,
    now,
  });

  return CourseProductAssetBackfillMutationResultSchema.parse({
    mode: "dry_run",
    plan,
    writtenAssetCount: 0,
    writtenObjectCount: 0,
    writtenReferenceCount: 0,
    confirmedBy: actorId,
    createdAt: now,
  });
}

export async function commitCourseProductAssetBackfill({
  sourceAssetStore = getCourseProductAssetStore(),
  targetAssetStore,
  contentStore = getCourseProductContentStore(),
  productStore = getCourseProductStore(),
  actorId,
  confirmWrite,
  reason,
  now = new Date().toISOString(),
}: {
  sourceAssetStore?: CourseProductAssetStore;
  targetAssetStore?: CourseProductAssetStore;
  contentStore?: CourseProductContentStore;
  productStore?: CourseProductStore;
  actorId: string;
  confirmWrite: boolean;
  reason: string;
  now?: string;
}): Promise<CourseProductAssetBackfillMutationResult> {
  if (!confirmWrite) {
    throw new Error("COURSE_PRODUCT_ASSET_BACKFILL_CONFIRMATION_REQUIRED");
  }

  const resolvedTargetStore =
    targetAssetStore ?? createDefaultCourseProductAssetBackfillTargetStore();

  if (!isCourseProductAssetReferenceStore(resolvedTargetStore)) {
    throw new Error("COURSE_PRODUCT_ASSET_BACKFILL_TARGET_UNSUPPORTED");
  }

  const collection = await collectCourseProductAssetBackfill({
    assetStore: sourceAssetStore,
    contentStore,
    productStore,
    actorId,
    now,
    dryRun: false,
  });

  let writtenAssetCount = 0;
  let writtenObjectCount = 0;
  let writtenReferenceCount = 0;

  for (const asset of collection.assets) {
    const referenceCount =
      collection.referenceCountByAssetId.get(asset.id) ?? asset.referenceCount;
    const saved = await resolvedTargetStore.saveAsset(
      CourseProductAssetSchema.parse({
        ...asset,
        referenceCount,
      })
    );
    writtenAssetCount += 1;
    if (
      saved.sourceType === "object_storage" &&
      saved.objectKey &&
      saved.contentHash
    ) {
      writtenObjectCount += 1;
    }
  }

  for (const reference of collection.references) {
    await resolvedTargetStore.saveAssetReference(reference);
    writtenReferenceCount += 1;
  }

  return CourseProductAssetBackfillMutationResultSchema.parse({
    mode: "commit",
    plan: collection.plan,
    writtenAssetCount,
    writtenObjectCount,
    writtenReferenceCount,
    confirmedBy: actorId,
    reason,
    createdAt: now,
  });
}

export function createDefaultCourseProductAssetBackfillSourceStore() {
  return new JsonFileCourseProductAssetStore();
}

export function createDefaultCourseProductAssetBackfillTargetStore() {
  if (!getDatabaseUrl()) {
    throw new Error("COURSE_PRODUCT_ASSET_BACKFILL_DATABASE_URL_REQUIRED");
  }
  return new PostgresCourseProductAssetStore(getSharedPostgresPool());
}

async function collectCourseProductAssetBackfill({
  assetStore,
  contentStore,
  productStore,
  actorId = "system_asset_backfill",
  now,
  dryRun,
}: {
  assetStore: CourseProductAssetStore;
  contentStore: CourseProductContentStore;
  productStore: CourseProductStore;
  actorId?: string;
  now: string;
  dryRun: boolean;
}): Promise<CourseProductAssetBackfillCollection> {
  const [products, assets] = await Promise.all([
    productStore.listProducts(),
    assetStore.listAssets(),
  ]);
  const productById = new Map(products.map(product => [product.id, product]));
  const productIds = new Set(productById.keys());
  const assetById = new Map(assets.map(asset => [asset.id, asset]));
  const assetIds = new Set(assets.map(asset => asset.id));
  const notes: string[] = [];
  const validAssets: CourseProductAsset[] = [];
  const references = new Map<string, CourseProductAssetReference>();
  let skippedCount = 0;
  let scannedMaterialCount = 0;

  for (const asset of assets) {
    if (!productIds.has(asset.productId)) {
      skippedCount += 1;
      notes.push(`素材 ${asset.id} 指向不存在的课程商品 ${asset.productId}`);
      continue;
    }

    validAssets.push(asset);

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

        const asset = assetById.get(material.assetId);
        if (asset && asset.productId !== product.id) {
          skippedCount += 1;
          notes.push(
            `课程商品 ${product.id} 章节 ${chapter.id} 的素材占位 ${material.id} 引用了其他课程商品素材 ${material.assetId}`
          );
          return;
        }

        const reference = CourseProductAssetReferenceSchema.parse({
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
          createdBy: actorId,
          createdAt: now,
        });
        references.set(reference.id, reference);
      });
    });
  }

  const dedupedReferences = Array.from(references.values());
  const referenceCountByAssetId = dedupedReferences.reduce((counts, item) => {
    counts.set(item.assetId, (counts.get(item.assetId) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());

  return {
    plan: CourseProductAssetBackfillPlanSchema.parse({
      id: `asset_backfill_${dryRun ? "dry_run" : "commit"}_${safeTimeId(now)}`,
      source: "json_asset_store_and_content_placeholders",
      dryRun,
      scannedCount: assets.length + scannedMaterialCount,
      assetCount: validAssets.length,
      referenceCount: dedupedReferences.length,
      skippedCount,
      startedAt: now,
      finishedAt: now,
      notes: dedupeNotes(notes).slice(0, 30),
    }),
    assets: validAssets,
    references: dedupedReferences,
    referenceCountByAssetId,
  };
}

function isCourseProductAssetReferenceStore(
  store: CourseProductAssetStore
): store is CourseProductAssetStore & CourseProductAssetReferenceStore {
  return (
    typeof (store as unknown as CourseProductAssetReferenceStore)
      .saveAssetReference === "function"
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
