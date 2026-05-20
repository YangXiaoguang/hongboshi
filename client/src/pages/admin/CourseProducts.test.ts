import { describe, expect, it } from "vitest";
import type {
  CourseProductAssetGovernanceIssueType,
  CourseProductAssetGovernanceItem,
} from "@shared/domain";
import {
  courseProductAssetGovernanceSuggestion,
  filterCourseProductAssetGovernanceItems,
} from "./CourseProducts";

function governanceItem({
  id,
  issueTypes,
  duplicateContentHashAssetIds = [],
}: {
  id: string;
  issueTypes: CourseProductAssetGovernanceIssueType[];
  duplicateContentHashAssetIds?: string[];
}): CourseProductAssetGovernanceItem {
  return {
    asset: {
      id,
      productId: "course_product_1",
      kind: "chapter_material",
      title: `素材 ${id}`,
      fileName: `${id}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 1024,
      sourceType: "object_storage",
      objectKey: `course-products/course_product_1/${id}.pdf`,
      contentHash:
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      complianceStatus: issueTypes.includes("pending_compliance")
        ? "pending"
        : issueTypes.includes("rejected_compliance")
          ? "rejected"
          : "approved",
      downloadEnabled: !issueTypes.includes("download_disabled_material"),
      referenceCount: issueTypes.includes("unreferenced") ? 0 : 1,
      uploadedBy: "operator_1",
      uploadedAt: "2026-05-21T09:00:00.000Z",
      updatedAt: "2026-05-21T09:00:00.000Z",
    },
    product: {
      id: "course_product_1",
      courseId: 1,
      title: "情绪管理入门",
      status: "published",
      reviewStatus: "approved",
    },
    referenceCount: issueTypes.includes("unreferenced") ? 0 : 1,
    persistedReferenceCount: issueTypes.includes("unreferenced") ? 0 : 1,
    inferredReferenceCount: issueTypes.includes("unreferenced") ? 0 : 1,
    referenceSource: "reference_table",
    references: [],
    duplicateContentHashAssetIds,
    issueTypes,
    softDeleteCandidate: issueTypes.includes("soft_delete_candidate"),
  };
}

describe("course product asset governance panel helpers", () => {
  it("filters issue rows by governance group", () => {
    const items = [
      governanceItem({ id: "asset_clean", issueTypes: [] }),
      governanceItem({ id: "asset_unref", issueTypes: ["unreferenced"] }),
      governanceItem({
        id: "asset_pending",
        issueTypes: ["pending_compliance"],
      }),
      governanceItem({
        id: "asset_rejected",
        issueTypes: ["rejected_compliance"],
      }),
      governanceItem({
        id: "asset_duplicate",
        issueTypes: ["duplicate_content_hash"],
        duplicateContentHashAssetIds: ["asset_duplicate_peer"],
      }),
    ];

    expect(
      filterCourseProductAssetGovernanceItems(items, "all").map(
        item => item.asset.id
      )
    ).toEqual([
      "asset_unref",
      "asset_pending",
      "asset_rejected",
      "asset_duplicate",
    ]);
    expect(
      filterCourseProductAssetGovernanceItems(
        items,
        "compliance_status"
      ).map(item => item.asset.id)
    ).toEqual(["asset_pending", "asset_rejected"]);
    expect(
      filterCourseProductAssetGovernanceItems(
        items,
        "duplicate_content_hash"
      ).map(item => item.asset.id)
    ).toEqual(["asset_duplicate"]);
  });

  it("keeps governance actions advisory and read-only", () => {
    expect(
      courseProductAssetGovernanceSuggestion(
        governanceItem({
          id: "asset_pending",
          issueTypes: ["pending_compliance"],
        })
      )
    ).toContain("进入素材队列完成合规审核");

    expect(
      courseProductAssetGovernanceSuggestion(
        governanceItem({
          id: "asset_delete",
          issueTypes: ["soft_delete_candidate"],
        })
      )
    ).toContain("不在本面板直接删除");
  });
});
