import { describe, expect, it } from "vitest";
import type {
  CourseProductAssetGovernanceIssueType,
  CourseProductAssetGovernanceItem,
} from "@shared/domain";
import {
  assetGovernanceBatchIssueFilterFromPanelFilter,
  assetGovernanceBatchTaskCreateRequestFromPanelFilter,
  assetGovernanceHistoryQueryFromFilters,
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

  it("keeps governance suggestions tied to controlled actions", () => {
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
    ).toContain("不触发物理删除");
  });

  it("maps panel filters to server-side history and batch draft queries", () => {
    expect(
      assetGovernanceBatchIssueFilterFromPanelFilter("compliance_status")
    ).toBe("compliance_status");
    expect(
      assetGovernanceBatchIssueFilterFromPanelFilter("soft_delete_candidate")
    ).toBe("soft_delete_candidate");

    expect(
      assetGovernanceBatchTaskCreateRequestFromPanelFilter(
        "soft_delete_candidate",
        "  统一记录软删候选处理计划  ",
        "  审批后再执行  "
      )
    ).toEqual({
      action: "acknowledge_issue",
      query: {
        issueFilter: "soft_delete_candidate",
        previewSize: 8,
      },
      reason: "统一记录软删候选处理计划",
      note: "审批后再执行",
    });

    expect(
      assetGovernanceHistoryQueryFromFilters({
        assetId: " asset_1 ",
        productId: "course_product_1",
        actorId: "operator_1",
        action: "mark_soft_deleted",
        issueType: "soft_delete_candidate",
        dateFrom: "2026-05-20",
        dateTo: "2026-05-21",
      })
    ).toEqual({
      assetId: "asset_1",
      productId: "course_product_1",
      actorId: "operator_1",
      action: "mark_soft_deleted",
      issueType: "soft_delete_candidate",
      dateFrom: "2026-05-20T00:00:00.000+08:00",
      dateTo: "2026-05-21T23:59:59.999+08:00",
      page: 1,
      pageSize: 5,
    });
  });
});
