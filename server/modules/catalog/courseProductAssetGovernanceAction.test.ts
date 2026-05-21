import { describe, expect, it } from "vitest";
import { courses } from "../../../shared/data/mockCourses";
import type { CourseProductAsset } from "../../../shared/domain";
import { InMemoryCourseProductContentStore } from "./courseProductContentStore";
import {
  InMemoryCourseProductStore,
  courseProductFromCourse,
} from "./courseProductStore";
import { InMemoryCourseProductAssetStore } from "./courseProductAssetStore";
import { applyCourseProductAssetGovernanceAction } from "./courseProductAssetGovernanceAction";

const product = courseProductFromCourse(courses[0]);
const now = "2026-05-21T09:00:00.000Z";

describe("course product asset governance actions", () => {
  it("marks a duplicate asset as the primary copy and writes audit", async () => {
    const productStore = new InMemoryCourseProductStore([product]);
    const assetStore = new InMemoryCourseProductAssetStore(buildAssets());

    const result = await applyCourseProductAssetGovernanceAction({
      productId: product.id,
      assetId: "asset_worksheet_1",
      actorId: "operator_1",
      request: {
        action: "mark_duplicate_primary",
        issueType: "duplicate_content_hash",
        primaryAssetId: "asset_worksheet_1",
        reason: "确认重复素材后保留该主素材",
        note: "后续把重复引用合并到主素材",
      },
      productStore,
      contentStore: new InMemoryCourseProductContentStore([]),
      assetStore,
      now,
    });

    expect(result.asset.note).toContain("保留主素材:asset_worksheet_1");
    expect(result.auditEvent.action).toBe("asset_governance");
    expect(result.auditEvent.after).toMatchObject({
      governanceAction: "mark_duplicate_primary",
      issueType: "duplicate_content_hash",
      primaryAssetId: "asset_worksheet_1",
    });
    expect(await productStore.listAuditEvents(product.id)).toHaveLength(1);
  });

  it("soft deletes only unreferenced soft-delete candidates", async () => {
    const productStore = new InMemoryCourseProductStore([product]);
    const assetStore = new InMemoryCourseProductAssetStore(buildAssets());

    const result = await applyCourseProductAssetGovernanceAction({
      productId: product.id,
      assetId: "asset_worksheet_2",
      actorId: "operator_1",
      request: {
        action: "mark_soft_deleted",
        issueType: "soft_delete_candidate",
        reason: "确认该素材无前台引用，进入软删除确认",
      },
      productStore,
      contentStore: new InMemoryCourseProductContentStore([]),
      assetStore,
      now,
    });

    expect(result.asset.deletedAt).toBe(now);
    expect(result.asset.downloadEnabled).toBe(false);
    expect(result.governance.summary.activeAssetCount).toBe(2);
    expect(result.auditEvent.before.deletedAt).toBeUndefined();
    expect(result.auditEvent.after.deletedAt).toBe(now);
  });

  it("rejects stale issue types and invalid duplicate primary assets", async () => {
    const productStore = new InMemoryCourseProductStore([product]);
    const assetStore = new InMemoryCourseProductAssetStore(buildAssets());
    const contentStore = new InMemoryCourseProductContentStore([]);

    await expect(
      applyCourseProductAssetGovernanceAction({
        productId: product.id,
        assetId: "asset_worksheet_1",
        actorId: "operator_1",
        request: {
          action: "acknowledge_issue",
          issueType: "pending_compliance",
          reason: "错误的问题类型",
        },
        productStore,
        contentStore,
        assetStore,
        now,
      })
    ).rejects.toThrow("COURSE_PRODUCT_ASSET_GOVERNANCE_ISSUE_MISMATCH");

    await expect(
      applyCourseProductAssetGovernanceAction({
        productId: product.id,
        assetId: "asset_worksheet_1",
        actorId: "operator_1",
        request: {
          action: "mark_duplicate_primary",
          issueType: "duplicate_content_hash",
          primaryAssetId: "asset_not_same_hash",
          reason: "重复素材主素材选择错误",
        },
        productStore,
        contentStore,
        assetStore,
        now,
      })
    ).rejects.toThrow("COURSE_PRODUCT_ASSET_GOVERNANCE_PRIMARY_INVALID");
  });
});

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
      downloadEnabled: true,
      uploadedBy: "operator_1",
      uploadedAt: now,
      updatedAt: now,
    },
    {
      id: "asset_pending",
      productId: product.id,
      kind: "detail_image",
      title: "待审核图",
      fileName: "pending.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 188000,
      sourceType: "external_url",
      publicUrl: "https://cdn.example.com/pending.jpg",
      complianceStatus: "pending",
      downloadEnabled: false,
      uploadedBy: "operator_1",
      uploadedAt: now,
      updatedAt: now,
    },
  ];
}
