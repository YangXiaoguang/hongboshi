import { afterEach, describe, expect, it, vi } from "vitest";
import {
  httpCourseProductRepository,
  parseCourseProductAssetBackfillResponse,
  parseCourseProductAssetGovernanceActionResponse,
  parseCourseProductAssetGovernanceBatchDraftResponse,
  parseCourseProductAssetGovernanceBatchTaskListResponse,
  parseCourseProductAssetGovernanceBatchTaskMutationResponse,
  parseCourseProductAssetGovernanceHistoryResponse,
  parseCourseProductAssetGovernanceResponse,
  parseCourseProductAssetListResponse,
  parseCourseProductAssetMutationResponse,
  parseCourseProductContentResponse,
  parseCourseProductListResponse,
  parseCourseProductMutationResponse,
} from "./httpCourseProductRepository";

function batchTaskData() {
  return {
    id: "asset_governance_batch_task_1",
    action: "acknowledge_issue",
    approvalStatus: "pending_approval",
    query: {
      issueFilter: "pending_compliance",
      previewSize: 5,
    },
    candidateAssetCount: 1,
    previewItemCount: 1,
    eligibleActionCount: 1,
    manualReviewAssetCount: 0,
    softDeleteCandidateCount: 0,
    issueTypeDistribution: [
      { key: "pending_compliance", label: "待审核", count: 1 },
    ],
    proposedActionDistribution: [
      { key: "acknowledge_issue", label: "记录处理", count: 1 },
    ],
    safetyNotes: ["待审批任务不会修改素材 Store"],
    createdBy: "operator_1",
    createdByRoles: ["catalog_operator"],
    reason: "统一记录待审核素材处理计划",
    createdAt: "2026-05-21T10:00:00.000Z",
    updatedAt: "2026-05-21T10:00:00.000Z",
  };
}

function batchTaskListData() {
  return {
    generatedAt: "2026-05-21T10:01:00.000Z",
    query: {
      approvalStatus: "all",
      page: 1,
      pageSize: 5,
    },
    summary: {
      totalTaskCount: 1,
      pendingApprovalCount: 1,
      canceledCount: 0,
    },
    items: [batchTaskData()],
    meta: {
      page: 1,
      pageSize: 5,
      total: 1,
      totalPages: 1,
    },
  };
}

describe("http course product repository parsing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses course product list responses", () => {
    const parsed = parseCourseProductListResponse({
      ok: true,
      data: {
        items: [
          {
            id: "course_product_1",
            courseId: 1,
            title: "情绪管理入门",
            coverUrl:
              "https://images.unsplash.com/photo-1499209974431-9dddcece7f88",
            category: "情绪管理",
            type: "录播",
            instructorName: "林若安",
            learners: 1200,
            price: {
              amount: 199,
              originalAmount: 299,
              isFree: false,
              memberIncluded: true,
            },
            status: "published",
            reviewStatus: "approved",
            source: "seed",
            createdAt: "2026-05-10T09:00:00+08:00",
            updatedAt: "2026-05-10T18:00:00+08:00",
            publishedAt: "2026-05-10T09:00:00+08:00",
          },
        ],
        meta: {
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
        },
        summary: {
          totalCount: 1,
          publishedCount: 1,
          unpublishedCount: 0,
          draftCount: 0,
          archivedCount: 0,
          freeCount: 0,
          memberIncludedCount: 1,
        },
        filters: {
          categories: ["情绪管理"],
          types: ["录播"],
          statuses: ["published"],
        },
        auditEvents: [],
        query: {},
      },
    });

    expect(parsed.items[0]?.status).toBe("published");
    expect(parsed.query.pageSize).toBe(10);
  });

  it("throws with API error messages", () => {
    expect(() =>
      parseCourseProductListResponse({
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "当前账号暂无课程商品管理权限",
        },
      })
    ).toThrow("当前账号暂无课程商品管理权限");
  });

  it("parses course product asset responses", () => {
    const list = parseCourseProductAssetListResponse({
      ok: true,
      data: {
        productId: "course_product_1",
        items: [
          {
            id: "asset_course_product_1_detail_image_20260520",
            productId: "course_product_1",
            kind: "detail_image",
            title: "课程详情主视觉",
            fileName: "detail.jpg",
            mimeType: "image/jpeg",
            sizeBytes: 188000,
            sourceType: "external_url",
            publicUrl: "https://cdn.example.com/detail.jpg",
            usage: "showcase",
            complianceStatus: "pending",
            downloadEnabled: false,
            uploadedBy: "operator_1",
            uploadedAt: "2026-05-20T09:00:00+08:00",
            updatedAt: "2026-05-20T09:00:00+08:00",
          },
        ],
        summary: {
          totalCount: 1,
          pendingCount: 1,
          approvedCount: 0,
          rejectedCount: 0,
        },
      },
    });

    expect(list.summary.pendingCount).toBe(1);

    const mutation = parseCourseProductAssetMutationResponse({
      ok: true,
      data: {
        asset: list.items[0],
        assets: list.items,
        auditEvent: {
          id: "audit_asset_upload_course_product_1",
          productId: "course_product_1",
          productTitle: "情绪管理入门",
          actorId: "operator_1",
          action: "asset_upload",
          reason: "新增课程详情主视觉",
          before: {},
          after: {
            id: "asset_course_product_1_detail_image_20260520",
          },
          createdAt: "2026-05-20T09:00:00+08:00",
        },
        auditEvents: [],
      },
    });

    expect(mutation.auditEvent.action).toBe("asset_upload");
  });

  it("parses course product asset backfill responses", () => {
    const parsed = parseCourseProductAssetBackfillResponse({
      ok: true,
      data: {
        mode: "dry_run",
        plan: {
          id: "asset_backfill_dry_run_20260520T110000000Z",
          source: "json_asset_store_and_content_placeholders",
          dryRun: true,
          scannedCount: 2,
          assetCount: 1,
          referenceCount: 1,
          skippedCount: 0,
          startedAt: "2026-05-20T11:00:00.000Z",
          finishedAt: "2026-05-20T11:00:00.000Z",
          notes: [],
        },
        writtenAssetCount: 0,
        writtenObjectCount: 0,
        writtenReferenceCount: 0,
        confirmedBy: "operator_1",
        createdAt: "2026-05-20T11:00:00.000Z",
      },
    });

    expect(parsed.mode).toBe("dry_run");
    expect(parsed.plan.referenceCount).toBe(1);
  });

  it("parses course product asset governance responses", () => {
    const parsed = parseCourseProductAssetGovernanceResponse({
      ok: true,
      data: {
        generatedAt: "2026-05-21T09:00:00.000Z",
        summary: {
          totalAssetCount: 1,
          activeAssetCount: 1,
          referencedAssetCount: 0,
          unreferencedAssetCount: 1,
          duplicateContentHashGroupCount: 0,
          duplicateContentHashAssetCount: 0,
          pendingComplianceCount: 1,
          rejectedComplianceCount: 0,
          downloadDisabledMaterialCount: 0,
          softDeleteCandidateCount: 0,
          missingProductAssetCount: 0,
          referenceCount: 0,
          referenceSource: "content_material_placeholders",
        },
        items: [
          {
            asset: {
              id: "asset_course_product_1_detail_image_20260521",
              productId: "course_product_1",
              kind: "detail_image",
              title: "课程详情主视觉",
              fileName: "detail.jpg",
              mimeType: "image/jpeg",
              sizeBytes: 188000,
              sourceType: "external_url",
              publicUrl: "https://cdn.example.com/detail.jpg",
              complianceStatus: "pending",
              downloadEnabled: false,
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
            referenceCount: 0,
            inferredReferenceCount: 0,
            referenceSource: "content_material_placeholders",
            references: [],
            issueTypes: ["unreferenced", "pending_compliance"],
          },
        ],
        notes: ["当前素材 Store 不支持引用表读取，引用数量由课程章节素材占位推导"],
      },
    });

    expect(parsed.summary.unreferencedAssetCount).toBe(1);
    expect(parsed.items[0]?.issueTypes).toContain("pending_compliance");
  });

  it("throws course product asset governance API errors", () => {
    expect(() =>
      parseCourseProductAssetGovernanceResponse({
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "当前账号暂无课程素材治理读取权限",
        },
      })
    ).toThrow("当前账号暂无课程素材治理读取权限");
  });

  it("parses course product asset governance action responses", () => {
    const parsed = parseCourseProductAssetGovernanceActionResponse({
      ok: true,
      data: {
        asset: {
          id: "asset_course_product_1_worksheet_20260521",
          productId: "course_product_1",
          kind: "worksheet",
          title: "课后练习表",
          fileName: "worksheet.pdf",
          mimeType: "application/pdf",
          sizeBytes: 188000,
          sourceType: "object_storage",
          objectKey: "course-assets/course_product_1/asset_worksheet/file.pdf",
          contentHash:
            "sha256:9b6f0c37f2ad11858dd6ca056f3027e1dc856d08e88cef7a0381c3a4ac00d0d1",
          complianceStatus: "approved",
          downloadEnabled: false,
          uploadedBy: "operator_1",
          uploadedAt: "2026-05-21T09:00:00.000Z",
          deletedAt: "2026-05-21T09:10:00.000Z",
          updatedAt: "2026-05-21T09:10:00.000Z",
        },
        governance: {
          generatedAt: "2026-05-21T09:10:00.000Z",
          summary: {
            totalAssetCount: 1,
            activeAssetCount: 0,
            referencedAssetCount: 0,
            unreferencedAssetCount: 0,
            duplicateContentHashGroupCount: 0,
            duplicateContentHashAssetCount: 0,
            pendingComplianceCount: 0,
            rejectedComplianceCount: 0,
            downloadDisabledMaterialCount: 0,
            softDeleteCandidateCount: 0,
            missingProductAssetCount: 0,
            referenceCount: 0,
            referenceSource: "content_material_placeholders",
          },
          items: [],
          notes: [],
        },
        auditEvent: {
          id: "audit_asset_governance_course_product_1",
          productId: "course_product_1",
          productTitle: "情绪管理入门",
          actorId: "operator_1",
          action: "asset_governance",
          reason: "确认无前台引用，进入软删除确认",
          before: {
            issueType: "soft_delete_candidate",
          },
          after: {
            issueType: "soft_delete_candidate",
            governanceAction: "mark_soft_deleted",
          },
          createdAt: "2026-05-21T09:10:00.000Z",
        },
      },
    });

    expect(parsed.auditEvent.action).toBe("asset_governance");
    expect(parsed.asset.deletedAt).toBe("2026-05-21T09:10:00.000Z");
  });

  it("parses course product asset governance history responses", () => {
    const parsed = parseCourseProductAssetGovernanceHistoryResponse({
      ok: true,
      data: {
        generatedAt: "2026-05-21T09:20:00.000Z",
        query: {
          action: "acknowledge_issue",
          page: 1,
          pageSize: 5,
        },
        summary: {
          totalEventCount: 1,
          filteredEventCount: 1,
          actorCount: 1,
          actionDistribution: [
            { key: "acknowledge_issue", label: "记录处理", count: 1 },
          ],
          issueTypeDistribution: [
            { key: "pending_compliance", label: "待审核", count: 1 },
          ],
        },
        items: [
          {
            id: "audit_asset_governance_pending",
            productId: "course_product_1",
            productTitle: "情绪管理入门",
            assetId: "asset_pending_1",
            assetTitle: "待审核素材",
            assetKind: "worksheet",
            action: "acknowledge_issue",
            issueType: "pending_compliance",
            actorId: "operator_1",
            actorRoles: ["operator"],
            reason: "记录待审核素材处理计划",
            before: { assetId: "asset_pending_1" },
            after: {
              assetId: "asset_pending_1",
              governanceAction: "acknowledge_issue",
              issueType: "pending_compliance",
            },
            createdAt: "2026-05-21T09:10:00.000Z",
          },
        ],
        meta: {
          page: 1,
          pageSize: 5,
          total: 1,
          totalPages: 1,
        },
      },
    });

    expect(parsed.items[0]?.action).toBe("acknowledge_issue");
    expect(parsed.summary.filteredEventCount).toBe(1);
  });

  it("parses course product asset governance batch draft responses", () => {
    const parsed = parseCourseProductAssetGovernanceBatchDraftResponse({
      ok: true,
      data: {
        generatedAt: "2026-05-21T09:30:00.000Z",
        requestedBy: "operator_1",
        query: {
          issueFilter: "compliance_status",
          previewSize: 8,
        },
        previewOnly: true,
        willModifyAssetStore: false,
        summary: {
          candidateAssetCount: 1,
          previewItemCount: 1,
          eligibleActionCount: 1,
          manualReviewAssetCount: 0,
          softDeleteCandidateCount: 0,
          issueTypeDistribution: [
            { key: "pending_compliance", label: "待审核", count: 1 },
          ],
          proposedActionDistribution: [
            { key: "acknowledge_issue", label: "记录处理", count: 1 },
          ],
        },
        items: [
          {
            assetId: "asset_pending_1",
            productId: "course_product_1",
            productTitle: "情绪管理入门",
            assetTitle: "待审核素材",
            assetKind: "worksheet",
            issueTypes: ["pending_compliance"],
            referenceCount: 0,
            duplicateContentHashAssetIds: [],
            proposedActions: [
              {
                action: "acknowledge_issue",
                issueType: "pending_compliance",
                eligible: true,
                reason: "可作为后续批量记录处理草稿，当前不执行写入",
              },
            ],
          },
        ],
        safetyNotes: ["当前为批量处理草稿预览，不会修改素材元数据"],
      },
    });

    expect(parsed.previewOnly).toBe(true);
    expect(parsed.willModifyAssetStore).toBe(false);
  });

  it("parses course product asset governance batch task responses", () => {
    const list = parseCourseProductAssetGovernanceBatchTaskListResponse({
      ok: true,
      data: batchTaskListData(),
    });
    const mutation =
      parseCourseProductAssetGovernanceBatchTaskMutationResponse({
        ok: true,
        data: {
          task: batchTaskData(),
          tasks: batchTaskListData(),
        },
      });

    expect(list.summary.pendingApprovalCount).toBe(1);
    expect(mutation.task.approvalStatus).toBe("pending_approval");
  });

  it("parses course product mutation responses", () => {
    const parsed = parseCourseProductMutationResponse({
      ok: true,
      data: {
        product: {
          id: "course_product_1",
          courseId: 1,
          title: "情绪管理入门",
          coverUrl:
            "https://images.unsplash.com/photo-1499209974431-9dddcece7f88",
          category: "情绪管理",
          type: "录播",
          instructorName: "林若安",
          learners: 1200,
          price: {
            amount: 99,
            originalAmount: 199,
            isFree: false,
            memberIncluded: true,
          },
          status: "published",
          reviewStatus: "approved",
          source: "seed",
          createdAt: "2026-05-10T09:00:00+08:00",
          updatedAt: "2026-05-11T10:00:00+08:00",
          publishedAt: "2026-05-10T09:00:00+08:00",
        },
        auditEvent: {
          id: "audit_price_course_product_1",
          productId: "course_product_1",
          productTitle: "情绪管理入门",
          actorId: "operator_1",
          action: "price_update",
          reason: "专题活动价格调整",
          before: {
            price: {
              amount: 199,
            },
          },
          after: {
            price: {
              amount: 99,
            },
          },
          createdAt: "2026-05-11T10:00:00+08:00",
        },
        auditEvents: [],
      },
    });

    expect(parsed.product.price.amount).toBe(99);
    expect(parsed.auditEvent.action).toBe("price_update");
  });

  it("sends basic information update mutations to the admin endpoint", async () => {
    const responsePayload = {
      ok: true,
      data: {
        product: {
          id: "course_product_1",
          courseId: 1,
          title: "婚姻关系沟通训练",
          coverUrl:
            "https://images.unsplash.com/photo-1499209974431-9dddcece7f88",
          category: "婚姻关系",
          type: "直播",
          instructorName: "林若安",
          learners: 1888,
          price: {
            amount: 99,
            originalAmount: 199,
            isFree: false,
            memberIncluded: true,
          },
          status: "published",
          reviewStatus: "approved",
          source: "seed",
          createdAt: "2026-05-10T09:00:00+08:00",
          updatedAt: "2026-05-11T10:20:00+08:00",
          publishedAt: "2026-05-10T09:00:00+08:00",
        },
        auditEvent: {
          id: "audit_info_course_product_1",
          productId: "course_product_1",
          productTitle: "婚姻关系沟通训练",
          actorId: "operator_1",
          action: "info_update",
          reason: "运营校对课程基础信息",
          before: { title: "情绪管理入门" },
          after: { title: "婚姻关系沟通训练" },
          createdAt: "2026-05-11T10:20:00+08:00",
        },
        auditEvents: [],
      },
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(responsePayload)));

    const result =
      await httpCourseProductRepository.updateCourseProductBasicInfo(
        "course_product_1",
        {
          title: "婚姻关系沟通训练",
          coverUrl:
            "https://images.unsplash.com/photo-1499209974431-9dddcece7f88",
          category: "婚姻关系",
          type: "直播",
          instructorName: "林若安",
          learners: 1888,
          reason: "运营校对课程基础信息",
        }
      );

    expect(result.auditEvent.action).toBe("info_update");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog/admin/course-products/course_product_1/info",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining("婚姻关系沟通训练"),
      })
    );
  });

  it("sends review workflow mutations to the admin endpoint", async () => {
    const responsePayload = {
      ok: true,
      data: {
        product: {
          id: "course_product_1",
          courseId: 1,
          title: "情绪管理入门",
          coverUrl:
            "https://images.unsplash.com/photo-1499209974431-9dddcece7f88",
          category: "情绪管理",
          type: "录播",
          instructorName: "林若安",
          learners: 1200,
          price: {
            amount: 99,
            originalAmount: 199,
            isFree: false,
            memberIncluded: true,
          },
          status: "unpublished",
          reviewStatus: "pending",
          source: "seed",
          createdAt: "2026-05-10T09:00:00+08:00",
          updatedAt: "2026-05-11T10:30:00+08:00",
        },
        auditEvent: {
          id: "audit_review_course_product_1",
          productId: "course_product_1",
          productTitle: "情绪管理入门",
          actorId: "operator_1",
          action: "review_update",
          reason: "课程内容和素材已完成自检",
          before: { reviewStatus: "not_submitted" },
          after: { reviewStatus: "pending" },
          createdAt: "2026-05-11T10:30:00+08:00",
        },
        auditEvents: [],
      },
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(responsePayload)));

    const result = await httpCourseProductRepository.updateCourseProductReview(
      "course_product_1",
      {
        action: "submit",
        reason: "课程内容和素材已完成自检",
      }
    );

    expect(result.product.reviewStatus).toBe("pending");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog/admin/course-products/course_product_1/review",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining("submit"),
      })
    );
  });

  it("parses and updates course product detail content", async () => {
    const contentPayload = {
      ok: true,
      data: {
        productId: "course_product_1",
        summary: "适合希望系统学习情绪识别、调节和沟通表达的用户。",
        targetAudience: ["希望提升情绪调节能力的学习者"],
        chapters: [
          {
            id: "chapter_1",
            title: "认识情绪反应",
            durationMinutes: 36,
            materialPlaceholders: [
              {
                id: "material_1",
                title: "课后练习表",
                type: "exercise",
                status: "ready",
              },
            ],
          },
        ],
        updatedAt: "2026-05-11T11:20:00+08:00",
      },
    };

    expect(
      parseCourseProductContentResponse(contentPayload).chapters
    ).toHaveLength(1);
  });

  it("sends detail content update mutations to the admin endpoint", async () => {
    const responsePayload = {
      ok: true,
      data: {
        product: {
          id: "course_product_1",
          courseId: 1,
          title: "情绪管理入门",
          coverUrl:
            "https://images.unsplash.com/photo-1499209974431-9dddcece7f88",
          category: "情绪管理",
          type: "录播",
          instructorName: "林若安",
          learners: 1200,
          price: {
            amount: 99,
            originalAmount: 199,
            isFree: false,
            memberIncluded: true,
          },
          status: "unpublished",
          reviewStatus: "not_submitted",
          source: "seed",
          createdAt: "2026-05-10T09:00:00+08:00",
          updatedAt: "2026-05-11T11:20:00+08:00",
        },
        content: {
          productId: "course_product_1",
          summary: "适合希望系统学习情绪识别、调节和沟通表达的用户。",
          targetAudience: ["希望提升情绪调节能力的学习者"],
          chapters: [
            {
              id: "chapter_1",
              title: "认识情绪反应",
              durationMinutes: 36,
              materialPlaceholders: [],
            },
          ],
          updatedAt: "2026-05-11T11:20:00+08:00",
        },
        auditEvent: {
          id: "audit_content_course_product_1",
          productId: "course_product_1",
          productTitle: "情绪管理入门",
          actorId: "operator_1",
          action: "content_update",
          reason: "课程详情内容完成校对",
          before: { chapterCount: 3 },
          after: { chapterCount: 1 },
          createdAt: "2026-05-11T11:20:00+08:00",
        },
        auditEvents: [],
      },
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(responsePayload)));

    const result = await httpCourseProductRepository.updateCourseProductContent(
      "course_product_1",
      {
        summary: "适合希望系统学习情绪识别、调节和沟通表达的用户。",
        targetAudience: ["希望提升情绪调节能力的学习者"],
        chapters: [
          {
            id: "chapter_1",
            title: "认识情绪反应",
            durationMinutes: 36,
            materialPlaceholders: [],
          },
        ],
        reason: "课程详情内容完成校对",
      }
    );

    expect(result.auditEvent.action).toBe("content_update");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog/admin/course-products/course_product_1/content",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining("认识情绪反应"),
      })
    );
  });

  it("sends asset backfill commit requests to the admin endpoint", async () => {
    const responsePayload = {
      ok: true,
      data: {
        mode: "commit",
        plan: {
          id: "asset_backfill_commit_20260520T110000000Z",
          source: "json_asset_store_and_content_placeholders",
          dryRun: false,
          scannedCount: 2,
          assetCount: 1,
          referenceCount: 1,
          skippedCount: 0,
          startedAt: "2026-05-20T11:00:00.000Z",
          finishedAt: "2026-05-20T11:00:00.000Z",
          notes: [],
        },
        writtenAssetCount: 1,
        writtenObjectCount: 1,
        writtenReferenceCount: 1,
        confirmedBy: "operator_1",
        reason: "运营确认课程素材回填",
        createdAt: "2026-05-20T11:00:00.000Z",
      },
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(responsePayload)));

    const result =
      await httpCourseProductRepository.runCourseProductAssetBackfill({
        action: "commit",
        confirmWrite: true,
        reason: "运营确认课程素材回填",
      });

    expect(result.writtenReferenceCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog/admin/course-products/assets/backfill",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("confirmWrite"),
      })
    );
  });

  it("loads course product asset governance summaries", async () => {
    const responsePayload = {
      ok: true,
      data: {
        generatedAt: "2026-05-21T09:00:00.000Z",
        summary: {
          totalAssetCount: 0,
          activeAssetCount: 0,
          referencedAssetCount: 0,
          unreferencedAssetCount: 0,
          duplicateContentHashGroupCount: 0,
          duplicateContentHashAssetCount: 0,
          pendingComplianceCount: 0,
          rejectedComplianceCount: 0,
          downloadDisabledMaterialCount: 0,
          softDeleteCandidateCount: 0,
          missingProductAssetCount: 0,
          referenceCount: 0,
          referenceSource: "content_material_placeholders",
        },
        items: [],
        notes: [],
      },
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(responsePayload)));

    const result =
      await httpCourseProductRepository.loadCourseProductAssetGovernance();

    expect(result.summary.totalAssetCount).toBe(0);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog/admin/course-products/assets/governance",
      expect.objectContaining({
        credentials: "same-origin",
      })
    );
  });

  it("loads course product asset governance history with filters", async () => {
    const responsePayload = {
      ok: true,
      data: {
        generatedAt: "2026-05-21T09:20:00.000Z",
        query: {
          action: "acknowledge_issue",
          actorId: "operator_1",
          page: 1,
          pageSize: 5,
        },
        summary: {
          totalEventCount: 1,
          filteredEventCount: 1,
          actorCount: 1,
          actionDistribution: [
            { key: "acknowledge_issue", label: "记录处理", count: 1 },
          ],
          issueTypeDistribution: [
            { key: "pending_compliance", label: "待审核", count: 1 },
          ],
        },
        items: [
          {
            id: "audit_asset_governance_pending",
            productId: "course_product_1",
            productTitle: "情绪管理入门",
            assetId: "asset_pending_1",
            action: "acknowledge_issue",
            issueType: "pending_compliance",
            actorId: "operator_1",
            reason: "记录待审核素材处理计划",
            before: {},
            after: {
              governanceAction: "acknowledge_issue",
              issueType: "pending_compliance",
            },
            createdAt: "2026-05-21T09:10:00.000Z",
          },
        ],
        meta: {
          page: 1,
          pageSize: 5,
          total: 1,
          totalPages: 1,
        },
      },
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(responsePayload)));

    const result =
      await httpCourseProductRepository.loadCourseProductAssetGovernanceHistory({
        action: "acknowledge_issue",
        actorId: "operator_1",
        pageSize: 5,
      });

    expect(result.summary.filteredEventCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog/admin/course-products/assets/governance/history?action=acknowledge_issue&actorId=operator_1&pageSize=5",
      expect.objectContaining({
        credentials: "same-origin",
      })
    );
  });

  it("loads course product asset governance batch draft previews", async () => {
    const responsePayload = {
      ok: true,
      data: {
        generatedAt: "2026-05-21T09:30:00.000Z",
        requestedBy: "operator_1",
        query: {
          issueFilter: "soft_delete_candidate",
          previewSize: 8,
        },
        previewOnly: true,
        willModifyAssetStore: false,
        summary: {
          candidateAssetCount: 2,
          previewItemCount: 2,
          eligibleActionCount: 2,
          manualReviewAssetCount: 2,
          softDeleteCandidateCount: 2,
          issueTypeDistribution: [
            { key: "soft_delete_candidate", label: "软删候选", count: 2 },
          ],
          proposedActionDistribution: [
            { key: "acknowledge_issue", label: "记录处理", count: 2 },
            { key: "mark_soft_deleted", label: "软删除确认", count: 2 },
          ],
        },
        items: [],
        safetyNotes: ["当前为批量处理草稿预览，不会修改素材元数据"],
      },
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(responsePayload)));

    const result =
      await httpCourseProductRepository.loadCourseProductAssetGovernanceBatchDraft({
        issueFilter: "soft_delete_candidate",
        previewSize: 8,
      });

    expect(result.willModifyAssetStore).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog/admin/course-products/assets/governance/batch-draft?issueFilter=soft_delete_candidate&previewSize=8",
      expect.objectContaining({
        credentials: "same-origin",
      })
    );
  });

  it("loads course product asset governance batch tasks", async () => {
    const responsePayload = {
      ok: true,
      data: batchTaskListData(),
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(responsePayload)));

    const result =
      await httpCourseProductRepository.loadCourseProductAssetGovernanceBatchTasks(
        {
          approvalStatus: "pending_approval",
          pageSize: 5,
        }
      );

    expect(result.items[0]?.id).toBe("asset_governance_batch_task_1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog/admin/course-products/assets/governance/batch-tasks?approvalStatus=pending_approval&pageSize=5",
      expect.objectContaining({
        credentials: "same-origin",
      })
    );
  });

  it("creates course product asset governance batch task drafts", async () => {
    const responsePayload = {
      ok: true,
      data: {
        task: batchTaskData(),
        tasks: batchTaskListData(),
      },
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(responsePayload)));

    const result =
      await httpCourseProductRepository.createCourseProductAssetGovernanceBatchTask(
        {
          action: "acknowledge_issue",
          query: {
            issueFilter: "pending_compliance",
            previewSize: 5,
          },
          reason: "统一记录待审核素材处理计划",
        }
      );

    expect(result.task.candidateAssetCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog/admin/course-products/assets/governance/batch-tasks",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("acknowledge_issue"),
      })
    );
  });

  it("cancels course product asset governance batch task drafts", async () => {
    const canceledTask = {
      ...batchTaskData(),
      approvalStatus: "canceled",
      canceledBy: "operator_1",
      canceledAt: "2026-05-21T10:10:00.000Z",
      cancelReason: "筛选口径需要重新确认",
      updatedAt: "2026-05-21T10:10:00.000Z",
    };
    const responsePayload = {
      ok: true,
      data: {
        task: canceledTask,
        tasks: {
          ...batchTaskListData(),
          summary: {
            totalTaskCount: 1,
            pendingApprovalCount: 0,
            canceledCount: 1,
          },
          items: [canceledTask],
        },
      },
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(responsePayload)));

    const result =
      await httpCourseProductRepository.cancelCourseProductAssetGovernanceBatchTask(
        "asset_governance_batch_task_1",
        {
          reason: "筛选口径需要重新确认",
        }
      );

    expect(result.task.approvalStatus).toBe("canceled");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog/admin/course-products/assets/governance/batch-tasks/asset_governance_batch_task_1/cancel",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining("筛选口径需要重新确认"),
      })
    );
  });

  it("sends asset governance actions to the admin endpoint", async () => {
    const responsePayload = {
      ok: true,
      data: {
        asset: {
          id: "asset_course_product_1_worksheet_20260521",
          productId: "course_product_1",
          kind: "worksheet",
          title: "课后练习表",
          fileName: "worksheet.pdf",
          mimeType: "application/pdf",
          sizeBytes: 188000,
          sourceType: "object_storage",
          objectKey: "course-assets/course_product_1/asset_worksheet/file.pdf",
          contentHash:
            "sha256:9b6f0c37f2ad11858dd6ca056f3027e1dc856d08e88cef7a0381c3a4ac00d0d1",
          complianceStatus: "approved",
          downloadEnabled: false,
          uploadedBy: "operator_1",
          uploadedAt: "2026-05-21T09:00:00.000Z",
          deletedAt: "2026-05-21T09:10:00.000Z",
          updatedAt: "2026-05-21T09:10:00.000Z",
        },
        governance: {
          generatedAt: "2026-05-21T09:10:00.000Z",
          summary: {
            totalAssetCount: 1,
            activeAssetCount: 0,
            referencedAssetCount: 0,
            unreferencedAssetCount: 0,
            duplicateContentHashGroupCount: 0,
            duplicateContentHashAssetCount: 0,
            pendingComplianceCount: 0,
            rejectedComplianceCount: 0,
            downloadDisabledMaterialCount: 0,
            softDeleteCandidateCount: 0,
            missingProductAssetCount: 0,
            referenceCount: 0,
            referenceSource: "content_material_placeholders",
          },
          items: [],
          notes: [],
        },
        auditEvent: {
          id: "audit_asset_governance_course_product_1",
          productId: "course_product_1",
          productTitle: "情绪管理入门",
          actorId: "operator_1",
          action: "asset_governance",
          reason: "确认无前台引用，进入软删除确认",
          before: {},
          after: {
            governanceAction: "mark_soft_deleted",
          },
          createdAt: "2026-05-21T09:10:00.000Z",
        },
      },
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(responsePayload)));

    const result =
      await httpCourseProductRepository.applyCourseProductAssetGovernanceAction(
        "course_product_1",
        "asset_course_product_1_worksheet_20260521",
        {
          action: "mark_soft_deleted",
          issueType: "soft_delete_candidate",
          reason: "确认无前台引用，进入软删除确认",
        }
      );

    expect(result.auditEvent.action).toBe("asset_governance");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog/admin/course-products/course_product_1/assets/asset_course_product_1_worksheet_20260521/governance-actions",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("mark_soft_deleted"),
      })
    );
  });
});
