import { describe, expect, it } from "vitest";
import { courses } from "../../../shared/data/mockCourses";
import { InMemoryCourseProductAssetStore } from "./courseProductAssetStore";
import {
  dryRunCourseProductAssetBackfill,
  getReferenceTypeForMaterial,
  summarizeCourseProductAssetForBackfill,
} from "./courseProductAssetBackfill";
import { InMemoryCourseProductContentStore } from "./courseProductContentStore";
import {
  InMemoryCourseProductStore,
  courseProductFromCourse,
} from "./courseProductStore";

const product = courseProductFromCourse(courses[0]);

describe("course product asset backfill dry run", () => {
  it("scans asset metadata and content placeholders without writing", async () => {
    const assetStore = new InMemoryCourseProductAssetStore([
      {
        id: "asset_worksheet_1",
        productId: product.id,
        chapterId: "chapter_1",
        kind: "worksheet",
        title: "课后练习表",
        fileName: "worksheet.pdf",
        mimeType: "application/pdf",
        sizeBytes: 16,
        sourceType: "object_storage",
        storageKey:
          "course-assets/course_product_1/asset_worksheet_1/hash-worksheet.pdf",
        objectKey:
          "course-assets/course_product_1/asset_worksheet_1/hash-worksheet.pdf",
        contentHash:
          "sha256:9b6f0c37f2ad11858dd6ca056f3027e1dc856d08e88cef7a0381c3a4ac00d0d1",
        complianceStatus: "approved",
        downloadEnabled: true,
        uploadedBy: "operator_1",
        uploadedAt: "2026-05-20T09:00:00.000Z",
        updatedAt: "2026-05-20T09:00:00.000Z",
      },
      {
        id: "asset_detail_1",
        productId: product.id,
        kind: "detail_image",
        title: "课程详情主视觉",
        fileName: "detail.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 188000,
        sourceType: "external_url",
        storageKey: "course-assets/course_product_1/detail",
        publicUrl: "https://cdn.example.com/course/detail.jpg",
        usage: "showcase",
        complianceStatus: "approved",
        downloadEnabled: false,
        uploadedBy: "operator_1",
        uploadedAt: "2026-05-20T09:00:00.000Z",
        updatedAt: "2026-05-20T09:00:00.000Z",
      },
    ]);
    const contentStore = new InMemoryCourseProductContentStore([
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
                assetId: "asset_worksheet_1",
              },
              {
                id: "material_missing",
                title: "待补讲义",
                type: "document",
                status: "ready",
                assetId: "asset_missing",
              },
            ],
          },
        ],
        updatedAt: "2026-05-20T09:00:00.000Z",
      },
    ]);
    const productStore = new InMemoryCourseProductStore([product]);

    const plan = await dryRunCourseProductAssetBackfill({
      assetStore,
      contentStore,
      productStore,
      now: "2026-05-20T11:00:00.000Z",
    });

    expect(plan).toMatchObject({
      source: "json_asset_store_and_content_placeholders",
      dryRun: true,
      scannedCount: 4,
      assetCount: 2,
      referenceCount: 1,
      skippedCount: 1,
      startedAt: "2026-05-20T11:00:00.000Z",
      finishedAt: "2026-05-20T11:00:00.000Z",
    });
    expect(plan.notes).toEqual(
      expect.arrayContaining([
        "素材 asset_detail_1 是 external_url，dry-run 不强制转存对象",
        "课程商品 course_product_1 章节 chapter_1 的素材占位 material_missing 引用了不存在的素材 asset_missing",
      ])
    );
  });

  it("maps material types and summarizes assets for backfill reporting", () => {
    expect(getReferenceTypeForMaterial({ type: "exercise" })).toBe(
      "chapter_exercise"
    );
    expect(getReferenceTypeForMaterial({ type: "live_replay" })).toBe(
      "chapter_video"
    );
    expect(
      summarizeCourseProductAssetForBackfill({
        id: "asset_detail_1",
        productId: product.id,
        kind: "detail_image",
        title: "课程详情主视觉",
        fileName: "detail.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 188000,
        sourceType: "external_url",
        publicUrl: "https://cdn.example.com/course/detail.jpg",
        complianceStatus: "approved",
        downloadEnabled: false,
        uploadedBy: "operator_1",
        uploadedAt: "2026-05-20T09:00:00.000Z",
        updatedAt: "2026-05-20T09:00:00.000Z",
      })
    ).toMatchObject({
      id: "asset_detail_1",
      sourceType: "external_url",
      objectKey: undefined,
    });
  });
});
