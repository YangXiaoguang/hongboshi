import { describe, expect, it } from "vitest";
import type {
  CourseProductAssetGovernanceBatchTaskExecutionPlanResult,
  CourseProductAssetGovernanceIssueType,
  CourseProductAssetGovernanceItem,
} from "@shared/domain";
import {
  assetGovernanceBatchIssueFilterFromPanelFilter,
  assetGovernanceBatchTaskCreateRequestFromPanelFilter,
  assetGovernanceBatchTaskExecutionPlanSummaryText,
  assetGovernanceBatchTaskReviewRequestFromAction,
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
      filterCourseProductAssetGovernanceItems(items, "compliance_status").map(
        item => item.asset.id
      )
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

    expect(
      assetGovernanceBatchTaskReviewRequestFromAction(
        "approve",
        "  候选范围和处理口径已完成交叉复核  "
      )
    ).toEqual({
      action: "approve",
      reason: "候选范围和处理口径已完成交叉复核",
    });
  });

  it("summarizes execution plans for approved batch tasks", () => {
    const plan = {
      generatedAt: "2026-05-21T10:03:00.000Z",
      requestedBy: "operator_2",
      previewOnly: true,
      willModifyAssetStore: false,
      willWriteAuditEvents: false,
      task: {
        id: "asset_governance_batch_task_1",
        action: "acknowledge_issue",
        approvalStatus: "approved",
        query: {
          issueFilter: "pending_compliance",
          previewSize: 5,
        },
        candidateAssetCount: 2,
        previewItemCount: 2,
        eligibleActionCount: 2,
        manualReviewAssetCount: 0,
        softDeleteCandidateCount: 0,
        issueTypeDistribution: [
          { key: "pending_compliance", label: "待审核", count: 2 },
        ],
        proposedActionDistribution: [
          { key: "acknowledge_issue", label: "记录处理", count: 2 },
        ],
        safetyNotes: ["待审批任务不会修改素材 Store"],
        createdBy: "operator_1",
        createdByRoles: ["catalog_operator"],
        reason: "统一记录待审核素材处理计划",
        createdAt: "2026-05-21T10:00:00.000Z",
        updatedAt: "2026-05-21T10:02:00.000Z",
        reviewedBy: "operator_2",
        reviewedByRoles: ["catalog_operator"],
        reviewedAt: "2026-05-21T10:02:00.000Z",
        reviewAction: "approve",
        reviewReason: "候选范围和处理口径已完成交叉复核",
      },
      summary: {
        taskId: "asset_governance_batch_task_1",
        originalCandidateAssetCount: 2,
        currentCandidateAssetCount: 2,
        newCandidateAssetCount: 0,
        disappearedAssetCount: 0,
        changedIssueTypeCount: 0,
        plannedActionCount: 2,
        skippedActionCount: 1,
        estimatedAuditEventCount: 2,
        highRiskItemCount: 0,
        mediumRiskItemCount: 2,
        lowRiskItemCount: 0,
      },
      items: [],
      safetyNotes: ["当前为已审批批量治理任务的执行预案，只读模拟。"],
    } satisfies CourseProductAssetGovernanceBatchTaskExecutionPlanResult;

    expect(assetGovernanceBatchTaskExecutionPlanSummaryText(plan)).toBe(
      "计划 2 个动作，跳过 1 个，预计审计 2 条"
    );
  });
});
