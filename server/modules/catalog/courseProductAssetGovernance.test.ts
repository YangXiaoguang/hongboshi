import { describe, expect, it } from "vitest";
import { courses } from "../../../shared/data/mockCourses";
import {
  CourseProductAssetReferenceSchema,
  type CourseProductAsset,
  type CourseProductAssetReference,
} from "../../../shared/domain";
import { InMemoryCourseProductContentStore } from "./courseProductContentStore";
import {
  InMemoryCourseProductStore,
  courseProductFromCourse,
} from "./courseProductStore";
import {
  InMemoryCourseProductAssetStore,
  type CourseProductAssetReferenceStore,
} from "./courseProductAssetStore";
import { getCourseProductAssetGovernance } from "./courseProductAssetGovernance";

const product = courseProductFromCourse(courses[0]);
const now = "2026-05-21T09:00:00.000Z";

class InMemoryAssetReferenceStore
  extends InMemoryCourseProductAssetStore
  implements CourseProductAssetReferenceStore
{
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

  async saveAssetReference(reference: CourseProductAssetReference) {
    return CourseProductAssetReferenceSchema.parse(reference);
  }
}

describe("course product asset governance", () => {
  it("infers governance references from content placeholders for JSON-like stores", async () => {
    const result = await getCourseProductAssetGovernance({
      productStore: new InMemoryCourseProductStore([product]),
      contentStore: buildContentStore("asset_worksheet_1"),
      assetStore: new InMemoryCourseProductAssetStore(buildAssets()),
      now,
    });

    expect(result.summary).toMatchObject({
      totalAssetCount: 4,
      referencedAssetCount: 1,
      unreferencedAssetCount: 3,
      duplicateContentHashGroupCount: 1,
      duplicateContentHashAssetCount: 2,
      pendingComplianceCount: 1,
      downloadDisabledMaterialCount: 1,
      missingProductAssetCount: 1,
      referenceSource: "content_material_placeholders",
    });
    expect(result.notes).toContain(
      "当前素材 Store 不支持引用表读取，引用数量由课程章节素材占位推导"
    );
    expect(
      result.items.find(item => item.asset.id === "asset_worksheet_1")
        ?.referenceCount
    ).toBe(1);
    expect(
      result.items.find(item => item.asset.id === "asset_worksheet_2")
        ?.issueTypes
    ).toEqual(
      expect.arrayContaining([
        "unreferenced",
        "duplicate_content_hash",
        "download_disabled_material",
        "soft_delete_candidate",
      ])
    );
  });

  it("uses persisted reference tables when the asset store supports them", async () => {
    const result = await getCourseProductAssetGovernance({
      productStore: new InMemoryCourseProductStore([product]),
      contentStore: buildContentStore("asset_worksheet_1"),
      assetStore: new InMemoryAssetReferenceStore(buildAssets(), [
        CourseProductAssetReferenceSchema.parse({
          id: "asset_ref_table_1",
          assetId: "asset_worksheet_2",
          productId: product.id,
          courseId: product.courseId,
          chapterId: "chapter_1",
          referenceType: "chapter_exercise",
          materialPlaceholderId: "material_2",
          materialPlaceholderIndex: 0,
          createdBy: "operator_1",
          createdAt: now,
        }),
      ]),
      now,
    });

    expect(result.summary.referenceSource).toBe("reference_table");
    expect(
      result.items.find(item => item.asset.id === "asset_worksheet_1")
        ?.referenceCount
    ).toBe(0);
    expect(
      result.items.find(item => item.asset.id === "asset_worksheet_2")
        ?.persistedReferenceCount
    ).toBe(1);
  });
});

function buildContentStore(assetId: string) {
  return new InMemoryCourseProductContentStore([
    {
      productId: product.id,
      summary: "这门课程帮助学习者识别压力来源，并通过练习建立稳定行动。",
      targetAudience: ["希望提升情绪稳定性的学习者"],
      chapters: [
        {
          id: "chapter_1",
          title: "识别压力反应",
          durationMinutes: 30,
          materialPlaceholders: [
            {
              id: "material_1",
              title: "课后练习表",
              type: "exercise",
              status: "ready",
              assetId,
            },
          ],
        },
      ],
      updatedAt: now,
    },
  ]);
}

function buildAssets(): CourseProductAsset[] {
  const duplicateHash =
    "sha256:9b6f0c37f2ad11858dd6ca056f3027e1dc856d08e88cef7a0381c3a4ac00d0d1";

  return [
    {
      id: "asset_worksheet_1",
      productId: product.id,
      chapterId: "chapter_1",
      kind: "worksheet",
      title: "课后练习表 A",
      fileName: "worksheet-a.pdf",
      mimeType: "application/pdf",
      sizeBytes: 16,
      sourceType: "object_storage",
      objectKey: "course-assets/course_product_1/asset_worksheet_1/a.pdf",
      contentHash: duplicateHash,
      complianceStatus: "approved",
      downloadEnabled: true,
      uploadedBy: "operator_1",
      uploadedAt: now,
      updatedAt: now,
    },
    {
      id: "asset_worksheet_2",
      productId: product.id,
      chapterId: "chapter_1",
      kind: "worksheet",
      title: "课后练习表 B",
      fileName: "worksheet-b.pdf",
      mimeType: "application/pdf",
      sizeBytes: 16,
      sourceType: "object_storage",
      objectKey: "course-assets/course_product_1/asset_worksheet_2/b.pdf",
      contentHash: duplicateHash,
      complianceStatus: "approved",
      downloadEnabled: false,
      uploadedBy: "operator_1",
      uploadedAt: now,
      updatedAt: now,
    },
    {
      id: "asset_detail_pending",
      productId: product.id,
      kind: "detail_image",
      title: "待审详情图",
      fileName: "detail.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 188000,
      sourceType: "external_url",
      publicUrl: "https://cdn.example.com/detail.jpg",
      complianceStatus: "pending",
      downloadEnabled: false,
      uploadedBy: "operator_1",
      uploadedAt: now,
      updatedAt: now,
    },
    {
      id: "asset_missing_product",
      productId: "course_product_missing",
      kind: "proof_image",
      title: "孤立证明图",
      fileName: "proof.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 188000,
      sourceType: "external_url",
      publicUrl: "https://cdn.example.com/proof.jpg",
      complianceStatus: "approved",
      downloadEnabled: false,
      uploadedBy: "operator_1",
      uploadedAt: now,
      updatedAt: now,
    },
  ];
}
