import { describe, expect, it } from "vitest";
import { courses } from "../../../shared/data/mockCourses";
import {
  InMemoryCourseProductStore,
  courseProductFromCourse,
} from "./courseProductStore";
import {
  InMemoryCourseProductAssetStore,
  listCourseProductAssets,
  updateCourseProductAssetCompliance,
  uploadCourseProductAsset,
} from "./courseProductAssetStore";

const products = courses.slice(0, 2).map(courseProductFromCourse);

describe("course product asset store", () => {
  it("uploads assets and records audit events", async () => {
    const productStore = new InMemoryCourseProductStore(products);
    const assetStore = new InMemoryCourseProductAssetStore();

    const result = await uploadCourseProductAsset({
      productId: products[0].id,
      actorId: "operator_1",
      productStore,
      assetStore,
      now: "2026-05-20T09:00:00.000Z",
      request: {
        kind: "detail_image",
        title: "详情主视觉",
        sourceUrl: "https://cdn.example.com/course/detail.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 188000,
        usage: "showcase",
        reason: "新增课程详情主视觉",
      },
    });

    expect(result.asset).toMatchObject({
      productId: products[0].id,
      kind: "detail_image",
      sourceType: "external_url",
      complianceStatus: "pending",
      uploadedBy: "operator_1",
    });
    expect(result.auditEvent.action).toBe("asset_upload");
    expect(await assetStore.listAssets(products[0].id)).toHaveLength(1);
  });

  it("updates asset compliance state and enables approved downloads", async () => {
    const productStore = new InMemoryCourseProductStore(products);
    const assetStore = new InMemoryCourseProductAssetStore();
    const uploaded = await uploadCourseProductAsset({
      productId: products[0].id,
      actorId: "operator_1",
      productStore,
      assetStore,
      now: "2026-05-20T09:00:00.000Z",
      request: {
        kind: "worksheet",
        title: "课后练习表",
        sourceUrl: "https://cdn.example.com/course/worksheet.pdf",
        mimeType: "application/pdf",
        sizeBytes: 288000,
        reason: "新增章节练习资料",
      },
    });

    const reviewed = await updateCourseProductAssetCompliance({
      productId: products[0].id,
      assetId: uploaded.asset.id,
      actorId: "operator_2",
      productStore,
      assetStore,
      now: "2026-05-20T10:00:00.000Z",
      request: {
        complianceStatus: "approved",
        reason: "练习资料来源和内容已完成合规确认",
      },
    });

    expect(reviewed.asset).toMatchObject({
      complianceStatus: "approved",
      downloadEnabled: true,
      reviewedBy: "operator_2",
    });
    expect(reviewed.auditEvent.action).toBe("asset_review");
  });

  it("builds product-scoped asset list summaries", async () => {
    const productStore = new InMemoryCourseProductStore(products);
    const assetStore = new InMemoryCourseProductAssetStore();
    await uploadCourseProductAsset({
      productId: products[0].id,
      actorId: "operator_1",
      productStore,
      assetStore,
      now: "2026-05-20T09:00:00.000Z",
      request: {
        kind: "proof_image",
        title: "学习反馈截图",
        sourceUrl: "https://cdn.example.com/course/proof.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 128000,
        reason: "新增详情页证明素材",
      },
    });

    const list = await listCourseProductAssets({
      productId: products[0].id,
      productStore,
      assetStore,
    });

    expect(list.summary).toMatchObject({
      totalCount: 1,
      pendingCount: 1,
    });
    expect(list.items[0]?.productId).toBe(products[0].id);
  });
});
