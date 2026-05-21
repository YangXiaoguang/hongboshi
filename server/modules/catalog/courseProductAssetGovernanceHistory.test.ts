import { describe, expect, it } from "vitest";
import { courses } from "../../../shared/data/mockCourses";
import type { CourseProductAsset } from "../../../shared/domain";
import { InMemoryCourseProductAssetStore } from "./courseProductAssetStore";
import { InMemoryCourseProductContentStore } from "./courseProductContentStore";
import {
  InMemoryCourseProductStore,
  courseProductFromCourse,
} from "./courseProductStore";
import {
  listCourseProductAssetGovernanceHistory,
  previewCourseProductAssetGovernanceBatchDraft,
} from "./courseProductAssetGovernanceHistory";

const product = courseProductFromCourse(courses[0]);

function createProductStore() {
  return new InMemoryCourseProductStore([product]);
}

function asset(
  patch: Partial<CourseProductAsset> & Pick<CourseProductAsset, "id" | "title">
): CourseProductAsset {
  return {
    id: patch.id,
    productId: product.id,
    kind: "worksheet",
    title: patch.title,
    fileName: `${patch.id}.pdf`,
    mimeType: "application/pdf",
    sizeBytes: 1200,
    sourceType: "object_storage",
    objectKey: `course-assets/${product.id}/${patch.id}.pdf`,
    contentHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    complianceStatus: "approved",
    downloadEnabled: true,
    uploadedBy: "operator_1",
    uploadedAt: "2026-05-21T09:00:00.000Z",
    updatedAt: "2026-05-21T09:00:00.000Z",
    ...patch,
  };
}

describe("course product asset governance history", () => {
  it("filters asset governance audit events by action, issue and actor", async () => {
    const productStore = createProductStore();
    await productStore.appendAuditEvent({
      id: "audit_asset_governance_soft_delete",
      productId: product.id,
      productTitle: product.title,
      actorId: "operator_1",
      action: "asset_governance",
      reason: "确认素材无引用后进入软删除",
      before: {
        assetId: "asset_unused",
        productId: product.id,
        title: "未引用素材",
        kind: "worksheet",
        governanceAction: "mark_soft_deleted",
        issueType: "soft_delete_candidate",
        actorRoles: ["operator"],
        referenceCount: 0,
        objectKey: "course-assets/private/file.pdf",
      },
      after: {
        assetId: "asset_unused",
        productId: product.id,
        title: "未引用素材",
        kind: "worksheet",
        governanceAction: "mark_soft_deleted",
        issueType: "soft_delete_candidate",
        actorRoles: ["operator"],
        referenceCount: 0,
        deletedAt: "2026-05-21T09:10:00.000Z",
        downloadEnabled: false,
      },
      createdAt: "2026-05-21T09:10:00.000Z",
    });
    await productStore.appendAuditEvent({
      id: "audit_asset_governance_ack",
      productId: product.id,
      productTitle: product.title,
      actorId: "operator_2",
      action: "asset_governance",
      reason: "记录待审核素材处理计划",
      before: {
        assetId: "asset_pending",
        productId: product.id,
        title: "待审核素材",
        kind: "worksheet",
        governanceAction: "acknowledge_issue",
        issueType: "pending_compliance",
      },
      after: {
        assetId: "asset_pending",
        productId: product.id,
        title: "待审核素材",
        kind: "worksheet",
        governanceAction: "acknowledge_issue",
        issueType: "pending_compliance",
      },
      createdAt: "2026-05-21T09:20:00.000Z",
    });

    const result = await listCourseProductAssetGovernanceHistory({
      productStore,
      query: {
        action: "mark_soft_deleted",
        issueType: "soft_delete_candidate",
        actorId: "operator_1",
      },
      now: "2026-05-21T10:00:00.000Z",
    });

    expect(result.summary.totalEventCount).toBe(2);
    expect(result.summary.filteredEventCount).toBe(1);
    expect(result.summary.actionDistribution[0]).toMatchObject({
      key: "mark_soft_deleted",
      count: 1,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.assetId).toBe("asset_unused");
    expect(result.items[0]?.actorRoles).toEqual(["operator"]);
    expect("objectKey" in (result.items[0]?.before ?? {})).toBe(false);
  });

  it("previews batch governance candidates without mutating assets", async () => {
    const productStore = createProductStore();
    const contentStore = new InMemoryCourseProductContentStore();
    const duplicateA = asset({
      id: "asset_duplicate_a",
      title: "重复素材 A",
    });
    const duplicateB = asset({
      id: "asset_duplicate_b",
      title: "重复素材 B",
    });
    const pending = asset({
      id: "asset_pending",
      title: "待审核素材",
      contentHash:
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      complianceStatus: "pending",
      downloadEnabled: false,
    });
    const assetStore = new InMemoryCourseProductAssetStore([
      duplicateA,
      duplicateB,
      pending,
    ]);

    const before = await assetStore.getAsset("asset_duplicate_a");
    const draft = await previewCourseProductAssetGovernanceBatchDraft({
      productStore,
      contentStore,
      assetStore,
      requestedBy: "operator_1",
      query: {
        issueFilter: "all",
        previewSize: 2,
      },
      now: "2026-05-21T11:00:00.000Z",
    });
    const after = await assetStore.getAsset("asset_duplicate_a");

    expect(draft.previewOnly).toBe(true);
    expect(draft.willModifyAssetStore).toBe(false);
    expect(draft.summary.candidateAssetCount).toBe(3);
    expect(draft.summary.previewItemCount).toBe(2);
    expect(draft.summary.manualReviewAssetCount).toBeGreaterThan(0);
    expect(draft.summary.softDeleteCandidateCount).toBeGreaterThan(0);
    expect(draft.items[0]?.proposedActions.length).toBeGreaterThan(0);
    expect(after).toEqual(before);
  });
});
