import { describe, expect, it } from "vitest";
import { courses } from "../../../shared/data/mockCourses";
import {
  CourseProductAssetReferenceSchema,
  type CourseProductAsset,
  type CourseProductAssetReference,
} from "../../../shared/domain";
import {
  InMemoryCourseProductContentStore,
  type CourseProductContentStore,
} from "./courseProductContentStore";
import {
  InMemoryCourseProductStore,
  courseProductFromCourse,
} from "./courseProductStore";
import {
  InMemoryCourseProductAssetStore,
  type CourseProductAssetReferenceStore,
} from "./courseProductAssetStore";
import { previewCourseProductAssetGovernanceBatchActionPlan } from "./courseProductAssetGovernanceBatchActionPlan";

const product = courseProductFromCourse(courses[0]);
const now = "2026-05-22T11:00:00.000Z";
const duplicateHash =
  "sha256:9b6f0c37f2ad11858dd6ca056f3027e1dc856d08e88cef7a0381c3a4ac00d0d1";

class ReadOnlyReferenceAssetStore
  extends InMemoryCourseProductAssetStore
  implements CourseProductAssetReferenceStore
{
  saveAttemptCount = 0;

  constructor(
    assets: CourseProductAsset[],
    private readonly references: CourseProductAssetReference[]
  ) {
    super(assets);
  }

  async listAssetReferences(assetId?: string) {
    return this.references.filter(
      reference => !assetId || reference.assetId === assetId
    );
  }

  async saveAsset(asset: CourseProductAsset) {
    this.saveAttemptCount += 1;
    return super.saveAsset(asset);
  }

  async saveAssetReference(reference: CourseProductAssetReference) {
    return CourseProductAssetReferenceSchema.parse(reference);
  }
}

describe("course product asset governance batch action plan", () => {
  it("builds duplicate merge and soft-delete impact plans without writing assets", async () => {
    const assetStore = new ReadOnlyReferenceAssetStore(buildAssets(), [
      assetReference("asset_duplicate_primary", "material_primary"),
      assetReference("asset_duplicate_secondary", "material_secondary"),
    ]);

    const result = await previewCourseProductAssetGovernanceBatchActionPlan({
      requestedBy: "operator_1",
      query: {
        action: "all",
        previewSize: 6,
      },
      productStore: new InMemoryCourseProductStore([product]),
      contentStore: buildContentStore(),
      assetStore,
      now,
    });

    expect(result).toMatchObject({
      previewOnly: true,
      executable: false,
      willModifyAssetStore: false,
      willWriteAuditEvents: false,
    });
    expect(result.summary).toMatchObject({
      duplicateGroupCount: 1,
      duplicateAssetCount: 2,
      suggestedPrimaryAssetCount: 1,
      mergeCandidateReferenceCount: 1,
      softDeleteCandidateCount: 2,
      safeSoftDeleteCandidateCount: 1,
      blockedSoftDeleteCandidateCount: 1,
    });
    expect(result.duplicateGroups[0]).toMatchObject({
      contentHash: duplicateHash,
      suggestedPrimaryAssetId: "asset_duplicate_primary",
      affectedReferenceCount: 2,
      materialPlaceholderReferenceCount: 2,
      frontStageUsageAssetCount: 2,
      riskLevel: "high",
    });
    expect(result.duplicateGroups[0]?.referencesToMerge[0]).toMatchObject({
      fromAssetId: "asset_duplicate_secondary",
      toAssetId: "asset_duplicate_primary",
      action: "retarget_to_primary",
    });
    expect(
      result.softDeleteCandidates.find(
        item => item.asset.assetId === "asset_unused_rejected"
      )?.canSoftDeleteSafely
    ).toBe(true);
    expect(
      result.softDeleteCandidates.find(
        item => item.asset.assetId === "asset_unused_detail"
      )?.frontStageUsage
    ).toBe(true);
    expect(assetStore.saveAttemptCount).toBe(0);
  });

  it("can return only soft-delete plans for a scoped product", async () => {
    const result = await previewCourseProductAssetGovernanceBatchActionPlan({
      requestedBy: "operator_1",
      query: {
        action: "mark_soft_deleted",
        productId: product.id,
        previewSize: 2,
      },
      productStore: new InMemoryCourseProductStore([product]),
      contentStore: buildContentStore(),
      assetStore: new InMemoryCourseProductAssetStore(buildAssets()),
      now,
    });

    expect(result.duplicateGroups).toEqual([]);
    expect(result.softDeleteCandidates).toHaveLength(2);
    expect(result.summary.duplicateGroupCount).toBe(0);
  });
});

function buildAssets(): CourseProductAsset[] {
  return [
    asset({
      id: "asset_duplicate_primary",
      title: "成交主图 A",
      kind: "detail_image",
      fileName: "hero-a.png",
      contentHash: duplicateHash,
      publicUrl: `/api/courses/${product.courseId}/assets/asset_duplicate_primary/view`,
      complianceStatus: "approved",
      downloadEnabled: false,
    }),
    asset({
      id: "asset_duplicate_secondary",
      title: "成交主图 B",
      kind: "detail_image",
      fileName: "hero-b.png",
      contentHash: duplicateHash,
      publicUrl: `/api/courses/${product.courseId}/assets/asset_duplicate_secondary/view`,
      complianceStatus: "approved",
      downloadEnabled: false,
    }),
    asset({
      id: "asset_unused_rejected",
      title: "已驳回旧资料",
      kind: "worksheet",
      fileName: "old.pdf",
      contentHash:
        "sha256:8b6f0c37f2ad11858dd6ca056f3027e1dc856d08e88cef7a0381c3a4ac00d0d2",
      complianceStatus: "rejected",
      downloadEnabled: false,
    }),
    asset({
      id: "asset_unused_detail",
      title: "未引用详情图",
      kind: "detail_image",
      fileName: "unused.png",
      contentHash:
        "sha256:7b6f0c37f2ad11858dd6ca056f3027e1dc856d08e88cef7a0381c3a4ac00d0d3",
      complianceStatus: "approved",
      downloadEnabled: false,
      usage: "gallery",
    }),
  ];
}

function asset(
  patch: Partial<CourseProductAsset> & {
    id: string;
    title: string;
    kind: CourseProductAsset["kind"];
    fileName: string;
    contentHash: string;
  }
): CourseProductAsset {
  return {
    id: patch.id,
    productId: product.id,
    kind: patch.kind,
    title: patch.title,
    fileName: patch.fileName,
    mimeType: patch.fileName.endsWith(".pdf") ? "application/pdf" : "image/png",
    sizeBytes: 1200,
    sourceType: "object_storage",
    objectKey: `course-assets/${product.id}/${patch.id}/${patch.fileName}`,
    contentHash: patch.contentHash,
    publicUrl: patch.publicUrl,
    usage: patch.usage,
    complianceStatus: patch.complianceStatus ?? "pending",
    downloadEnabled: patch.downloadEnabled ?? false,
    uploadedBy: "operator_1",
    uploadedAt: now,
    updatedAt: now,
  };
}

function assetReference(assetId: string, materialId: string) {
  return CourseProductAssetReferenceSchema.parse({
    id: `asset_ref_${assetId}`,
    assetId,
    productId: product.id,
    courseId: product.courseId,
    chapterId: "chapter_1",
    referenceType: "chapter_material",
    materialPlaceholderId: materialId,
    materialPlaceholderIndex: materialId === "material_primary" ? 0 : 1,
    createdBy: "operator_1",
    createdAt: now,
  });
}

function buildContentStore(): CourseProductContentStore {
  return new InMemoryCourseProductContentStore([
    {
      productId: product.id,
      summary: "这门课程帮助学习者识别压力来源，并通过练习建立稳定行动。",
      targetAudience: ["希望提升情绪稳定性的学习者"],
      merchandising: {
        headline: "系统学习情绪管理",
        subheadline: "用清晰方法理解情绪反应，建立稳定行动节奏。",
        showcaseImageUrl: `/api/courses/${product.courseId}/assets/asset_duplicate_primary/view`,
        showcaseImageAlt: "情绪管理课程主图",
        sellingPoints: ["识别情绪触发点", "练习稳定表达"],
        imageAssets: [],
      },
      chapters: [
        {
          id: "chapter_1",
          title: "识别压力反应",
          durationMinutes: 30,
          materialPlaceholders: [
            {
              id: "material_primary",
              title: "主图引用占位",
              type: "document",
              status: "ready",
              assetId: "asset_duplicate_primary",
            },
            {
              id: "material_secondary",
              title: "重复图引用占位",
              type: "document",
              status: "ready",
              assetId: "asset_duplicate_secondary",
            },
          ],
        },
      ],
      updatedAt: now,
    },
  ]);
}
