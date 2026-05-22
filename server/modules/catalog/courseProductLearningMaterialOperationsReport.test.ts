import { describe, expect, it } from "vitest";
import { courses } from "../../../shared/data/mockCourses";
import { type CourseProductAsset } from "../../../shared/domain";
import { InMemoryCourseProductContentStore } from "./courseProductContentStore";
import {
  InMemoryCourseProductStore,
  courseProductFromCourse,
} from "./courseProductStore";
import { InMemoryCourseProductAssetStore } from "./courseProductAssetStore";
import { getCourseProductLearningMaterialOperationsReport } from "./courseProductLearningMaterialOperationsReport";

const product = courseProductFromCourse(courses[0]);
const now = "2026-05-22T11:00:00.000Z";

describe("course product learning material operations report", () => {
  it("summarizes material binding, download and governance issue metrics", async () => {
    const report = await getCourseProductLearningMaterialOperationsReport({
      productStore: new InMemoryCourseProductStore([product]),
      contentStore: new InMemoryCourseProductContentStore([
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
                  assetId: "asset_worksheet_bound",
                },
                {
                  id: "material_2",
                  title: "音频练习",
                  type: "audio",
                  status: "pending",
                },
              ],
            },
          ],
          updatedAt: now,
        },
      ]),
      assetStore: new InMemoryCourseProductAssetStore(buildAssets()),
      now,
    });

    expect(report.summary).toMatchObject({
      totalProductCount: 1,
      materialSlotCount: 2,
      boundMaterialSlotCount: 1,
      materialBindingRate: 0.5,
      learningMaterialAssetCount: 2,
      downloadableLearningMaterialAssetCount: 1,
      referencedLearningMaterialAssetCount: 1,
      unreferencedLearningMaterialAssetCount: 1,
      pendingComplianceLearningMaterialCount: 1,
      governanceIssueLearningMaterialCount: 1,
      referenceSource: "content_material_placeholders",
    });
    expect(report.assetKindDistribution).toEqual(
      expect.arrayContaining([
        { key: "worksheet", label: "练习表", count: 1 },
        { key: "audio", label: "音频", count: 1 },
      ])
    );
    expect(report.productRows[0]).toMatchObject({
      productId: product.id,
      materialSlotCount: 2,
      boundMaterialSlotCount: 1,
      issueAssetCount: 1,
    });
  });
});

function buildAssets(): CourseProductAsset[] {
  return [
    {
      id: "asset_worksheet_bound",
      productId: product.id,
      chapterId: "chapter_1",
      kind: "worksheet",
      title: "课后练习表",
      fileName: "worksheet.pdf",
      mimeType: "application/pdf",
      sizeBytes: 16,
      sourceType: "object_storage",
      objectKey: "course-assets/course_product_1/asset_worksheet_bound/a.pdf",
      contentHash:
        "sha256:9b6f0c37f2ad11858dd6ca056f3027e1dc856d08e88cef7a0381c3a4ac00d0d1",
      complianceStatus: "approved",
      downloadEnabled: true,
      uploadedBy: "operator_1",
      uploadedAt: now,
      updatedAt: now,
    },
    {
      id: "asset_audio_pending",
      productId: product.id,
      chapterId: "chapter_1",
      kind: "audio",
      title: "音频练习",
      fileName: "practice.mp3",
      mimeType: "audio/mpeg",
      sizeBytes: 1024,
      sourceType: "object_storage",
      objectKey: "course-assets/course_product_1/asset_audio_pending/a.mp3",
      contentHash:
        "sha256:8b6f0c37f2ad11858dd6ca056f3027e1dc856d08e88cef7a0381c3a4ac00d0d2",
      complianceStatus: "pending",
      downloadEnabled: false,
      uploadedBy: "operator_1",
      uploadedAt: now,
      updatedAt: now,
    },
    {
      id: "asset_detail_image",
      productId: product.id,
      kind: "detail_image",
      title: "课程详情图",
      fileName: "detail.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 188000,
      sourceType: "external_url",
      publicUrl: "https://cdn.example.com/detail.jpg",
      complianceStatus: "approved",
      downloadEnabled: false,
      uploadedBy: "operator_1",
      uploadedAt: now,
      updatedAt: now,
    },
  ];
}
