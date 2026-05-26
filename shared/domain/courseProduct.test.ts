import { describe, expect, it } from "vitest";
import {
  ALL_COURSE_PRODUCT_CATEGORY,
  ALL_COURSE_PRODUCT_STATUS,
  CourseProductPriceUpdateRequestSchema,
  CourseProductAssetComplianceUpdateRequestSchema,
  CourseProductAssetBackfillMutationResultSchema,
  CourseProductAssetBackfillPlanSchema,
  CourseProductAssetBackfillRequestSchema,
  CourseProductAssetFileUploadRequestSchema,
  CourseProductAssetGovernanceActionRequestSchema,
  CourseProductAssetGovernanceActionResultSchema,
  CourseProductAssetGovernanceBatchActionPlanQuerySchema,
  CourseProductAssetGovernanceBatchActionPlanResultSchema,
  CourseProductAssetGovernanceBatchDraftQuerySchema,
  CourseProductAssetGovernanceBatchDraftResultSchema,
  CourseProductAssetGovernanceBatchTaskCreateRequestSchema,
  CourseProductAssetGovernanceBatchTaskApprovalPreflightSchema,
  CourseProductAssetGovernanceBatchTaskExecuteRequestSchema,
  CourseProductAssetGovernanceBatchTaskExecutionDetailResultSchema,
  CourseProductAssetGovernanceBatchTaskExecutionJobSchema,
  CourseProductAssetGovernanceBatchTaskExecutionResultSchema,
  CourseProductAssetGovernanceBatchTaskExecutionPlanResultSchema,
  CourseProductAssetGovernanceBatchTaskListQuerySchema,
  CourseProductAssetGovernanceBatchTaskListResultSchema,
  CourseProductAssetGovernanceBatchTaskMutationResultSchema,
  CourseProductAssetGovernanceBatchTaskQueueObservationResultSchema,
  CourseProductAssetGovernanceBatchTaskReviewRequestSchema,
  CourseProductAssetGovernanceHistoryQuerySchema,
  CourseProductAssetGovernanceHistoryResultSchema,
  CourseProductAssetGovernanceResultSchema,
  CourseProductAssetListResultSchema,
  CourseProductAssetObjectDescriptorSchema,
  CourseProductAssetReferenceSchema,
  CourseProductAssetSignedReadUrlSchema,
  CourseProductAssetUploadRequestSchema,
  CourseProductBasicInfoUpdateRequestSchema,
  CourseProductContentUpdateRequestSchema,
  CourseProductDetailContentSchema,
  CourseProductLearningMaterialOperationsReportSchema,
  CourseProductListQuerySchema,
  CourseProductListResultSchema,
  CourseProductPublishQueueBatchTaskCreateRequestSchema,
  CourseProductPublishQueueBatchTaskApprovalPreflightSchema,
  CourseProductPublishQueueBatchTaskCancelRequestSchema,
  CourseProductPublishQueueBatchTaskListResultSchema,
  CourseProductPublishQueueBatchTaskMutationResultSchema,
  CourseProductPublishQueueBatchTaskPreflightResultSchema,
  CourseProductPublishQueueBatchTaskReviewRequestSchema,
  CourseProductPublishQueueBatchTaskSubmitRequestSchema,
  CourseProductPublishQueueResultSchema,
  CourseProductReviewActionRequestSchema,
  evaluateCourseProductContentQuality,
} from "./courseProduct";

describe("course product domain contract", () => {
  it("normalizes course product list query defaults", () => {
    expect(CourseProductListQuerySchema.parse({})).toMatchObject({
      keyword: "",
      category: ALL_COURSE_PRODUCT_CATEGORY,
      status: ALL_COURSE_PRODUCT_STATUS,
      sort: "updated_desc",
      page: 1,
      pageSize: 10,
    });
  });

  it("validates a paginated course product admin list", () => {
    const parsed = CourseProductListResultSchema.parse({
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
    });

    expect(parsed.query.category).toBe(ALL_COURSE_PRODUCT_CATEGORY);
    expect(parsed.items[0]?.price.currency).toBe("CNY");
  });

  it("validates course product publish queue contracts", () => {
    const queue = CourseProductPublishQueueResultSchema.parse({
      generatedAt: "2026-05-23T10:00:00.000Z",
      query: {},
      previewOnly: true,
      executable: false,
      summary: {
        totalScannedCount: 1,
        totalInScope: 1,
        archivedCount: 0,
        candidateCount: 1,
        blockerCount: 0,
        riskSummary: {
          low: 1,
          medium: 0,
          high: 0,
        },
      },
      groups: [
        {
          id: "ready_to_submit",
          label: "待提交审核",
          description: "内容已达标，可进入提交审核候选池。",
          workspaceStep: "publish",
          risk: "low",
          totalCount: 1,
          previewItems: [
            {
              productId: "course_product_1",
              courseId: 1,
              title: "情绪管理入门",
              coverUrl:
                "https://images.unsplash.com/photo-1499209974431-9dddcece7f88",
              status: "draft",
              reviewStatus: "not_submitted",
              queueGroup: "ready_to_submit",
              recommendedAction: "submit_review",
              risk: "low",
              reason: "内容质量已达标",
              contentReady: true,
              contentBlockingCount: 0,
              contentWarningCount: 0,
              updatedAt: "2026-05-23T09:00:00.000Z",
            },
          ],
        },
      ],
      actions: [
        {
          id: "submit_review",
          label: "批量提交审核草案",
          description: "保存内容达标商品的提交审核候选快照。",
          candidateCount: 1,
          blockerCount: 0,
          risk: "medium",
        },
      ],
      candidates: [],
    });
    const request = CourseProductPublishQueueBatchTaskCreateRequestSchema.parse(
      {
        action: "submit_review",
        reason: "月度上架前队列复核",
      }
    );
    const submitRequest =
      CourseProductPublishQueueBatchTaskSubmitRequestSchema.parse({
        reason: "提交审批前已完成候选复核",
      });
    const reviewRequest =
      CourseProductPublishQueueBatchTaskReviewRequestSchema.parse({
        action: "approve",
        reason: "候选快照与发布边界一致",
      });
    const cancelRequest =
      CourseProductPublishQueueBatchTaskCancelRequestSchema.parse({
        reason: "本轮暂缓发布队列处理",
      });
    const approvalPreflight =
      CourseProductPublishQueueBatchTaskApprovalPreflightSchema.parse({
        taskId: "publish_queue_batch_task_1",
        generatedAt: "2026-05-23T10:02:00.000Z",
        originalCandidateCount: 1,
        currentCandidateCount: 1,
        candidateDeltaCount: 0,
        disappearedProductIds: [],
        newCandidateProductIds: [],
        statusChangedProductIds: [],
        qualityChangedProductIds: [],
        riskChangedProductIds: [],
        currentRiskSummary: {
          low: 1,
          medium: 0,
          high: 0,
        },
        requiresRecreate: false,
        notes: ["审批前预检通过"],
      });
    const mutation =
      CourseProductPublishQueueBatchTaskMutationResultSchema.parse({
        task: {
          id: "publish_queue_batch_task_1",
          action: "submit_review",
          status: "draft",
          query: {},
          reason: "月度上架前队列复核",
          previewOnly: true,
          executable: false,
          createdBy: "catalog_operator_1",
          createdByRoles: ["catalog_operator"],
          candidateCount: 1,
          blockerCount: 0,
          riskSummary: {
            low: 1,
            medium: 0,
            high: 0,
          },
          candidateSnapshot: queue.groups[0]?.previewItems ?? [],
          safetyNotes: ["草案不会修改课程商品"],
          createdAt: "2026-05-23T10:01:00.000Z",
          updatedAt: "2026-05-23T10:01:00.000Z",
          submittedBy: "catalog_operator_1",
          submittedAt: "2026-05-23T10:02:00.000Z",
          submitReason: submitRequest.reason,
          reviewedBy: "admin_1",
          reviewedAt: "2026-05-23T10:03:00.000Z",
          reviewAction: reviewRequest.action,
          reviewReason: reviewRequest.reason,
          approvalPreflight,
        },
        tasks: {
          generatedAt: "2026-05-23T10:01:00.000Z",
          query: {},
          summary: {
            totalTaskCount: 1,
            draftCount: 1,
            pendingApprovalCount: 0,
            approvedCount: 0,
            rejectedCount: 0,
            canceledCount: 0,
          },
          items: [],
          meta: {
            page: 1,
            pageSize: 10,
            total: 1,
            totalPages: 1,
          },
        },
      });

    expect(queue.previewOnly).toBe(true);
    expect(request.query.pageSize).toBe(10);
    expect(cancelRequest.reason).toContain("暂缓");
    expect(
      CourseProductPublishQueueBatchTaskListResultSchema.parse(mutation.tasks)
        .summary.draftCount
    ).toBe(1);
    expect(
      CourseProductPublishQueueBatchTaskPreflightResultSchema.parse({
        task: mutation.task,
        preflight: approvalPreflight,
      }).preflight.requiresRecreate
    ).toBe(false);
  });

  it("rejects invalid price update requests", () => {
    expect(
      CourseProductPriceUpdateRequestSchema.safeParse({
        amount: 99,
        originalAmount: 199,
        isFree: true,
        reason: "免费活动调整",
      }).success
    ).toBe(false);

    expect(
      CourseProductPriceUpdateRequestSchema.safeParse({
        amount: 199,
        originalAmount: 99,
        isFree: false,
        reason: "活动价格调整",
      }).success
    ).toBe(false);
  });

  it("validates basic information update requests", () => {
    const parsed = CourseProductBasicInfoUpdateRequestSchema.parse({
      title: "婚姻关系沟通课",
      coverUrl: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88",
      category: "婚姻关系",
      type: "直播",
      instructorName: "林若安",
      learners: 1800,
      reason: "课程基础信息校对完成",
    });

    expect(parsed.title).toBe("婚姻关系沟通课");
    expect(
      CourseProductBasicInfoUpdateRequestSchema.safeParse({
        ...parsed,
        reason: "短",
      }).success
    ).toBe(false);
  });

  it("validates review action requests", () => {
    expect(
      CourseProductReviewActionRequestSchema.parse({
        action: "submit",
        reason: "课程内容和定价信息已完成自检",
      }).action
    ).toBe("submit");

    expect(
      CourseProductReviewActionRequestSchema.safeParse({
        action: "reject",
        reason: "短",
      }).success
    ).toBe(false);
  });

  it("validates course product asset upload and compliance contracts", () => {
    const uploadRequest = CourseProductAssetUploadRequestSchema.parse({
      kind: "detail_image",
      title: "课程详情主视觉",
      sourceUrl: "https://cdn.example.com/course/detail.jpg",
      fileName: "detail.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 188000,
      usage: "showcase",
      altText: "课程详情图",
      reason: "新增课程详情成交主视觉",
    });

    expect(uploadRequest.usage).toBe("showcase");
    expect(
      CourseProductAssetUploadRequestSchema.safeParse({
        ...uploadRequest,
        mimeType: "application/pdf",
      }).success
    ).toBe(false);

    const compliance = CourseProductAssetComplianceUpdateRequestSchema.parse({
      complianceStatus: "approved",
      downloadEnabled: false,
      reason: "图片来源和内容已完成合规确认",
    });

    expect(compliance.complianceStatus).toBe("approved");
  });

  it("validates course product asset file upload contracts", () => {
    const fileRequest = CourseProductAssetFileUploadRequestSchema.parse({
      kind: "worksheet",
      title: "课后练习表",
      fileName: "worksheet.pdf",
      mimeType: "application/pdf",
      fileBase64: Buffer.from("course worksheet").toString("base64"),
      sizeBytes: 16,
      reason: "上传课程练习资料",
    });

    expect(fileRequest.fileName).toBe("worksheet.pdf");
    expect(
      CourseProductAssetFileUploadRequestSchema.safeParse({
        ...fileRequest,
        kind: "detail_image",
        mimeType: "application/pdf",
      }).success
    ).toBe(false);
  });

  it("validates course product asset list summaries", () => {
    const parsed = CourseProductAssetListResultSchema.parse({
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
          storageKey: "course-assets/course_product_1/detail.jpg",
          publicUrl: "https://cdn.example.com/course/detail.jpg",
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
    });

    expect(parsed.items[0]?.complianceStatus).toBe("pending");
    expect(parsed.summary.pendingCount).toBe(1);
  });

  it("validates formal asset object storage and backfill contracts", () => {
    const object = CourseProductAssetObjectDescriptorSchema.parse({
      objectKey:
        "course-assets/course_product_1/asset_1/9b6f0c37f2ad-worksheet.pdf",
      provider: "oss",
      bucket: "hongboshi-course-assets",
      region: "cn-shanghai",
      mimeType: "application/pdf",
      sizeBytes: 188000,
      contentHash:
        "sha256:9b6f0c37f2ad11858dd6ca056f3027e1dc856d08e88cef7a0381c3a4ac00d0d1",
      originalFileName: "worksheet.pdf",
      createdBy: "operator_1",
      createdAt: "2026-05-20T09:00:00+08:00",
    });

    expect(object.provider).toBe("oss");
    expect(
      CourseProductAssetSignedReadUrlSchema.parse({
        objectKey: object.objectKey,
        url: "/api/course-assets/local-signed/course-assets%2Fcourse_product_1",
        expiresAt: "2026-05-20T09:10:00+08:00",
      }).method
    ).toBe("GET");

    const reference = CourseProductAssetReferenceSchema.parse({
      id: "asset_ref_1",
      assetId: "asset_1",
      productId: "course_product_1",
      courseId: 1,
      chapterId: "chapter_1",
      referenceType: "chapter_exercise",
      materialPlaceholderId: "material_1",
      materialPlaceholderIndex: 0,
      createdBy: "operator_1",
      createdAt: "2026-05-20T09:00:00+08:00",
    });
    expect(reference.referenceType).toBe("chapter_exercise");

    const backfillPlan = CourseProductAssetBackfillPlanSchema.parse({
      id: "asset_backfill_20260520",
      source: "content_material_placeholders",
      scannedCount: 24,
      assetCount: 18,
      referenceCount: 20,
      skippedCount: 4,
      startedAt: "2026-05-20T09:00:00+08:00",
    });
    expect(backfillPlan.dryRun).toBe(true);

    expect(
      CourseProductAssetBackfillRequestSchema.safeParse({
        action: "commit",
        reason: "运营确认课程素材回填",
      }).success
    ).toBe(false);

    const commitRequest = CourseProductAssetBackfillRequestSchema.parse({
      action: "commit",
      confirmWrite: true,
      reason: "运营确认课程素材回填",
    });
    expect(commitRequest.action).toBe("commit");

    const backfillResult = CourseProductAssetBackfillMutationResultSchema.parse(
      {
        mode: "commit",
        plan: {
          ...backfillPlan,
          dryRun: false,
        },
        writtenAssetCount: 18,
        writtenObjectCount: 12,
        writtenReferenceCount: 20,
        confirmedBy: "operator_1",
        reason: "运营确认课程素材回填",
        createdAt: "2026-05-20T09:10:00+08:00",
      }
    );
    expect(backfillResult.writtenReferenceCount).toBe(20);
  });

  it("validates course product asset governance contracts", () => {
    const parsed = CourseProductAssetGovernanceResultSchema.parse({
      generatedAt: "2026-05-21T09:00:00.000Z",
      summary: {
        totalAssetCount: 2,
        activeAssetCount: 2,
        referencedAssetCount: 1,
        unreferencedAssetCount: 1,
        duplicateContentHashGroupCount: 1,
        duplicateContentHashAssetCount: 2,
        pendingComplianceCount: 1,
        rejectedComplianceCount: 0,
        downloadDisabledMaterialCount: 1,
        softDeleteCandidateCount: 0,
        missingProductAssetCount: 0,
        referenceCount: 1,
        referenceSource: "content_material_placeholders",
      },
      items: [
        {
          asset: {
            id: "asset_worksheet_1",
            productId: "course_product_1",
            chapterId: "chapter_1",
            kind: "worksheet",
            title: "课后练习表",
            fileName: "worksheet.pdf",
            mimeType: "application/pdf",
            sizeBytes: 188000,
            sourceType: "object_storage",
            objectKey:
              "course-assets/course_product_1/asset_worksheet_1/file.pdf",
            contentHash:
              "sha256:9b6f0c37f2ad11858dd6ca056f3027e1dc856d08e88cef7a0381c3a4ac00d0d1",
            complianceStatus: "pending",
            downloadEnabled: false,
            uploadedBy: "operator_1",
            uploadedAt: "2026-05-20T09:00:00.000Z",
            updatedAt: "2026-05-20T09:00:00.000Z",
          },
          product: {
            id: "course_product_1",
            courseId: 1,
            title: "情绪管理入门",
            status: "published",
            reviewStatus: "approved",
          },
          referenceCount: 1,
          inferredReferenceCount: 1,
          referenceSource: "content_material_placeholders",
          references: [
            {
              id: "asset_ref_1",
              assetId: "asset_worksheet_1",
              productId: "course_product_1",
              courseId: 1,
              chapterId: "chapter_1",
              referenceType: "chapter_exercise",
              materialPlaceholderId: "material_1",
              materialPlaceholderIndex: 0,
              createdBy: "system_asset_governance",
              createdAt: "2026-05-21T09:00:00.000Z",
            },
          ],
          duplicateContentHashAssetIds: ["asset_worksheet_2"],
          issueTypes: [
            "duplicate_content_hash",
            "pending_compliance",
            "download_disabled_material",
          ],
        },
      ],
      notes: [
        "当前素材 Store 不支持引用表读取，引用数量由课程章节素材占位推导",
      ],
    });

    expect(parsed.summary.referenceSource).toBe(
      "content_material_placeholders"
    );
    expect(parsed.items[0]?.issueTypes).toContain("pending_compliance");

    const actionRequest = CourseProductAssetGovernanceActionRequestSchema.parse(
      {
        action: "mark_duplicate_primary",
        issueType: "duplicate_content_hash",
        primaryAssetId: "asset_worksheet_1",
        reason: "确认重复素材后保留主素材",
        note: "后续合并章节引用",
      }
    );
    expect(actionRequest.primaryAssetId).toBe("asset_worksheet_1");

    expect(
      CourseProductAssetGovernanceActionRequestSchema.safeParse({
        action: "mark_soft_deleted",
        issueType: "unreferenced",
        reason: "问题类型不匹配",
      }).success
    ).toBe(false);

    const actionResult = CourseProductAssetGovernanceActionResultSchema.parse({
      asset: parsed.items[0]?.asset,
      governance: parsed,
      auditEvent: {
        id: "audit_asset_governance_course_product_1_asset_worksheet_1",
        productId: "course_product_1",
        productTitle: "情绪管理入门",
        actorId: "operator_1",
        action: "asset_governance",
        reason: "确认重复素材后保留主素材",
        before: { issueType: "duplicate_content_hash" },
        after: {
          issueType: "duplicate_content_hash",
          governanceAction: "mark_duplicate_primary",
        },
        createdAt: "2026-05-21T09:10:00.000Z",
      },
    });
    expect(actionResult.auditEvent.action).toBe("asset_governance");

    const historyQuery = CourseProductAssetGovernanceHistoryQuerySchema.parse({
      action: "mark_duplicate_primary",
      issueType: "duplicate_content_hash",
      actorId: "operator_1",
      dateFrom: "2026-05-21T00:00:00.000Z",
      dateTo: "2026-05-21T23:59:59.999Z",
    });
    expect(historyQuery.pageSize).toBe(10);
    expect(
      CourseProductAssetGovernanceHistoryQuerySchema.safeParse({
        dateFrom: "2026-05-22T00:00:00.000Z",
        dateTo: "2026-05-21T00:00:00.000Z",
      }).success
    ).toBe(false);

    const history = CourseProductAssetGovernanceHistoryResultSchema.parse({
      generatedAt: "2026-05-21T09:20:00.000Z",
      query: historyQuery,
      summary: {
        totalEventCount: 1,
        filteredEventCount: 1,
        actorCount: 1,
        actionDistribution: [
          { key: "mark_duplicate_primary", label: "设为主素材", count: 1 },
        ],
        issueTypeDistribution: [
          { key: "duplicate_content_hash", label: "重复内容", count: 1 },
        ],
      },
      items: [
        {
          id: actionResult.auditEvent.id,
          productId: "course_product_1",
          productTitle: "情绪管理入门",
          assetId: "asset_worksheet_1",
          assetTitle: "课后练习表",
          assetKind: "worksheet",
          action: "mark_duplicate_primary",
          issueType: "duplicate_content_hash",
          actorId: "operator_1",
          actorRoles: ["operator"],
          reason: "确认重复素材后保留主素材",
          primaryAssetId: "asset_worksheet_1",
          referenceCount: 1,
          before: { assetId: "asset_worksheet_1" },
          after: {
            assetId: "asset_worksheet_1",
            governanceAction: "mark_duplicate_primary",
            issueType: "duplicate_content_hash",
          },
          createdAt: "2026-05-21T09:10:00.000Z",
        },
      ],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    });
    expect(history.summary.actorCount).toBe(1);

    const draftQuery = CourseProductAssetGovernanceBatchDraftQuerySchema.parse({
      issueFilter: "compliance_status",
    });
    expect(draftQuery.previewSize).toBe(8);

    const batchDraft = CourseProductAssetGovernanceBatchDraftResultSchema.parse(
      {
        generatedAt: "2026-05-21T09:30:00.000Z",
        requestedBy: "operator_1",
        query: draftQuery,
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
            assetId: "asset_worksheet_1",
            productId: "course_product_1",
            productTitle: "情绪管理入门",
            assetTitle: "课后练习表",
            assetKind: "worksheet",
            issueTypes: ["pending_compliance"],
            referenceCount: 1,
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
      }
    );
    expect(batchDraft.willModifyAssetStore).toBe(false);

    const batchTaskCreate =
      CourseProductAssetGovernanceBatchTaskCreateRequestSchema.parse({
        action: "acknowledge_issue",
        query: {
          issueFilter: "compliance_status",
          previewSize: 8,
        },
        reason: "统一记录待审核素材处理计划",
        note: "进入审批前不执行素材写入",
      });
    expect(batchTaskCreate.action).toBe("acknowledge_issue");
    expect(
      CourseProductAssetGovernanceBatchTaskCreateRequestSchema.safeParse({
        action: "mark_soft_deleted",
        query: {
          issueFilter: "soft_delete_candidate",
          previewSize: 8,
        },
        reason: "尝试批量软删",
      }).success
    ).toBe(false);

    const batchTask = {
      id: "asset_governance_batch_task_1",
      action: "acknowledge_issue" as const,
      approvalStatus: "pending_approval" as const,
      query: batchTaskCreate.query,
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
      candidateAssetIds: ["asset_worksheet_1"],
      candidateIssueTypeByAssetId: {
        asset_worksheet_1: ["pending_compliance"],
      },
      safetyNotes: ["待审批任务不会修改素材 Store"],
      createdBy: "operator_1",
      createdByRoles: ["catalog_operator"],
      reason: batchTaskCreate.reason,
      note: batchTaskCreate.note,
      createdAt: "2026-05-21T09:40:00.000Z",
      updatedAt: "2026-05-21T09:40:00.000Z",
    };
    const batchTaskList =
      CourseProductAssetGovernanceBatchTaskListResultSchema.parse({
        generatedAt: "2026-05-21T09:41:00.000Z",
        query: {
          approvalStatus: "all",
          page: 1,
          pageSize: 5,
        },
        summary: {
          totalTaskCount: 1,
          pendingApprovalCount: 1,
          approvedCount: 0,
          rejectedCount: 0,
          canceledCount: 0,
        },
        items: [batchTask],
        meta: {
          page: 1,
          pageSize: 5,
          total: 1,
          totalPages: 1,
        },
      });
    const mutation =
      CourseProductAssetGovernanceBatchTaskMutationResultSchema.parse({
        task: batchTask,
        tasks: batchTaskList,
      });
    expect(mutation.tasks.summary.pendingApprovalCount).toBe(1);

    expect(
      CourseProductAssetGovernanceBatchTaskReviewRequestSchema.parse({
        action: "approve",
        reason: "审批前候选范围和处理口径已复核",
      }).action
    ).toBe("approve");
    expect(
      CourseProductAssetGovernanceBatchTaskReviewRequestSchema.safeParse({
        action: "reject",
        reason: "短",
      }).success
    ).toBe(false);

    const preflight =
      CourseProductAssetGovernanceBatchTaskApprovalPreflightSchema.parse({
        generatedAt: "2026-05-21T09:42:00.000Z",
        originalCandidateAssetCount: 1,
        currentCandidateAssetCount: 1,
        candidateDeltaCount: 0,
        stillEligibleActionCount: 1,
        currentManualReviewAssetCount: 0,
        currentSoftDeleteCandidateCount: 0,
        currentIssueTypeDistribution: [
          { key: "pending_compliance", label: "待审核", count: 1 },
        ],
        currentProposedActionDistribution: [
          { key: "acknowledge_issue", label: "记录处理", count: 1 },
        ],
        requiresRecreate: false,
        notes: ["审批前预检通过，后续仍需单独执行批量处理任务。"],
      });
    expect(preflight.disappearedAssetIds).toEqual([]);

    const executionPlan =
      CourseProductAssetGovernanceBatchTaskExecutionPlanResultSchema.parse({
        generatedAt: "2026-05-21T09:43:00.000Z",
        requestedBy: "operator_2",
        previewOnly: true,
        willModifyAssetStore: false,
        willWriteAuditEvents: false,
        task: {
          ...batchTask,
          approvalStatus: "approved",
          reviewedBy: "operator_2",
          reviewedAt: "2026-05-21T09:42:00.000Z",
          reviewAction: "approve",
          reviewReason: "候选范围和处理口径已完成交叉复核",
          approvalPreflight: preflight,
        },
        summary: {
          taskId: batchTask.id,
          originalCandidateAssetCount: 1,
          currentCandidateAssetCount: 1,
          newCandidateAssetCount: 0,
          disappearedAssetCount: 0,
          changedIssueTypeCount: 0,
          plannedActionCount: 1,
          skippedActionCount: 0,
          estimatedAuditEventCount: 1,
          highRiskItemCount: 0,
          mediumRiskItemCount: 1,
          lowRiskItemCount: 0,
        },
        items: [
          {
            assetId: "asset_worksheet_1",
            productId: "course_product_1",
            productTitle: "情绪管理入门",
            assetTitle: "课后练习表",
            assetKind: "worksheet",
            issueTypes: ["pending_compliance"],
            referenceCount: 1,
            duplicateContentHashAssetIds: [],
            plannedAction: "acknowledge_issue",
            plannedIssueType: "pending_compliance",
            status: "planned",
            riskLevel: "medium",
            auditEventPreview: {
              action: "acknowledge_issue",
              issueType: "pending_compliance",
              reason: "统一记录待审核素材处理计划",
              before: {
                assetId: "asset_worksheet_1",
                productId: "course_product_1",
                title: "课后练习表",
                kind: "worksheet",
                governanceAction: "acknowledge_issue",
                issueType: "pending_compliance",
                referenceCount: 1,
                duplicateContentHashAssetIds: [],
                complianceStatus: "pending",
                downloadEnabled: false,
              },
              after: {
                assetId: "asset_worksheet_1",
                productId: "course_product_1",
                title: "课后练习表",
                kind: "worksheet",
                governanceAction: "acknowledge_issue",
                issueType: "pending_compliance",
                referenceCount: 1,
                duplicateContentHashAssetIds: [],
                complianceStatus: "pending",
                downloadEnabled: false,
                note: "进入审批前不执行素材写入",
              },
            },
            notes: ["真实执行前仍需复核本预案，当前不会写入审计或修改素材。"],
          },
        ],
        safetyNotes: ["当前为已审批批量治理任务的执行预案，只读模拟。"],
      });
    expect(executionPlan.willWriteAuditEvents).toBe(false);

    const executeRequest =
      CourseProductAssetGovernanceBatchTaskExecuteRequestSchema.parse({
        confirmExecution: true,
        reason: "审批通过后执行记录处理审计",
        note: "只写审计，不修改素材",
      });
    expect(executeRequest.confirmExecution).toBe(true);
    expect(
      CourseProductAssetGovernanceBatchTaskExecuteRequestSchema.safeParse({
        confirmExecution: false,
        reason: "缺少确认",
      }).success
    ).toBe(false);

    const executionResult =
      CourseProductAssetGovernanceBatchTaskExecutionResultSchema.parse({
        task: {
          ...executionPlan.task,
          executionStatus: "completed",
          executionRequestedBy: "operator_3",
          executionRequestedByRoles: ["catalog_operator"],
          executionStartedAt: "2026-05-21T09:44:00.000Z",
          executionCompletedAt: "2026-05-21T09:44:00.000Z",
          executionReason: executeRequest.reason,
          executionSummary: {
            taskId: batchTask.id,
            executionStatus: "completed",
            plannedActionCount: 1,
            executedActionCount: 1,
            skippedActionCount: 0,
            failedActionCount: 0,
            auditEventCount: 1,
          },
          executionItems: [
            {
              assetId: "asset_worksheet_1",
              productId: "course_product_1",
              productTitle: "情绪管理入门",
              assetTitle: "课后练习表",
              plannedAction: "acknowledge_issue",
              issueType: "pending_compliance",
              status: "executed",
              auditEventId: "audit_asset_governance_batch_1",
            },
          ],
          executionAuditEventIds: ["audit_asset_governance_batch_1"],
        },
        tasks: {
          ...batchTaskList,
          summary: {
            ...batchTaskList.summary,
            executionCompletedCount: 1,
          },
        },
        executionPlan,
        summary: {
          taskId: batchTask.id,
          executionStatus: "completed",
          plannedActionCount: 1,
          executedActionCount: 1,
          skippedActionCount: 0,
          failedActionCount: 0,
          auditEventCount: 1,
        },
        items: [
          {
            assetId: "asset_worksheet_1",
            productId: "course_product_1",
            productTitle: "情绪管理入门",
            assetTitle: "课后练习表",
            plannedAction: "acknowledge_issue",
            issueType: "pending_compliance",
            status: "executed",
            auditEventId: "audit_asset_governance_batch_1",
          },
        ],
        auditEvents: [
          {
            id: "audit_asset_governance_batch_1",
            productId: "course_product_1",
            productTitle: "情绪管理入门",
            actorId: "operator_3",
            action: "asset_governance",
            reason: executeRequest.reason,
            before: {
              assetId: "asset_worksheet_1",
              batchTaskId: batchTask.id,
            },
            after: {
              assetId: "asset_worksheet_1",
              batchTaskId: batchTask.id,
              batchExecution: true,
            },
            createdAt: "2026-05-21T09:44:00.000Z",
          },
        ],
      });
    expect(executionResult.summary.auditEventCount).toBe(1);

    const detail =
      CourseProductAssetGovernanceBatchTaskExecutionDetailResultSchema.parse({
        task: executionResult.task,
        executionPlan,
        summary: executionResult.summary,
        items: executionResult.items,
        auditEvents: executionResult.auditEvents,
        idempotentReplay: true,
      });
    expect(detail.items[0]?.auditEventId).toBe(
      "audit_asset_governance_batch_1"
    );
    const retryableTask =
      CourseProductAssetGovernanceBatchTaskMutationResultSchema.parse({
        task: {
          ...executionResult.task,
          executionStatus: "failed",
          executionAttemptCount: 2,
          lastExecutionError: "audit append timeout",
          lastExecutionFailedAt: "2026-05-21T09:45:00.000Z",
        },
        tasks: batchTaskList,
      }).task;
    expect(retryableTask).toMatchObject({
      executionStatus: "failed",
      executionAttemptCount: 2,
      lastExecutionError: "audit append timeout",
    });
    const job = CourseProductAssetGovernanceBatchTaskExecutionJobSchema.parse({
      id: "asset_governance_batch_execution_job_1",
      taskId: batchTask.id,
      status: "failed",
      requestedBy: "operator_3",
      enqueuedAt: "2026-05-21T09:45:00.000Z",
      startedAt: "2026-05-21T09:45:00.000Z",
      finishedAt: "2026-05-21T09:45:01.000Z",
      attemptCount: 1,
      lastError: "audit append timeout",
    });
    expect(job.status).toBe("failed");

    const queueObservation =
      CourseProductAssetGovernanceBatchTaskQueueObservationResultSchema.parse({
        generatedAt: "2026-05-21T09:46:00.000Z",
        query: {
          taskId: batchTask.id,
          limit: 5,
        },
        summary: {
          observedTaskCount: 1,
          observedJobCount: 1,
          queuedJobCount: 0,
          runningJobCount: 0,
          succeededJobCount: 0,
          failedJobCount: 1,
          runningTaskCount: 0,
          failedTaskCount: 1,
          retryableTaskCount: 1,
          totalExecutionAttemptCount: 2,
        },
        items: [
          {
            taskId: batchTask.id,
            task: retryableTask,
            latestJob: job,
            approvalStatus: "approved",
            executionStatus: "failed",
            executionAttemptCount: 2,
            lastExecutionError: "audit append timeout",
            lastExecutionFailedAt: "2026-05-21T09:45:00.000Z",
            retryRecommended: true,
            operatorHint: "检查失败原因后，可重新打开执行面板重试",
          },
        ],
        notes: ["当前队列观测基于内存 job 状态，服务重启后只保留任务执行字段"],
      });
    expect(queueObservation.summary.retryableTaskCount).toBe(1);

    const batchActionPlanQuery =
      CourseProductAssetGovernanceBatchActionPlanQuerySchema.parse({
        action: "all",
        previewSize: 6,
      });
    expect(batchActionPlanQuery.action).toBe("all");

    const batchActionPlan =
      CourseProductAssetGovernanceBatchActionPlanResultSchema.parse({
        generatedAt: "2026-05-21T09:46:30.000Z",
        requestedBy: "operator_3",
        previewOnly: true,
        executable: false,
        willModifyAssetStore: false,
        willWriteAuditEvents: false,
        query: batchActionPlanQuery,
        summary: {
          duplicateGroupCount: 1,
          duplicateAssetCount: 2,
          suggestedPrimaryAssetCount: 1,
          affectedReferenceCount: 2,
          mergeCandidateReferenceCount: 1,
          softDeleteCandidateCount: 1,
          safeSoftDeleteCandidateCount: 1,
          blockedSoftDeleteCandidateCount: 0,
          frontStageUsageAssetCount: 1,
          highRiskItemCount: 1,
          mediumRiskItemCount: 0,
          lowRiskItemCount: 1,
        },
        duplicateGroups: [
          {
            contentHash:
              "sha256:9b6f0c37f2ad11858dd6ca056f3027e1dc856d08e88cef7a0381c3a4ac00d0d1",
            assetIds: ["asset_worksheet_1", "asset_worksheet_2"],
            suggestedPrimaryAssetId: "asset_worksheet_1",
            primarySelectionReason: "建议保留：引用数 1、合规已通过",
            duplicateAssetCount: 2,
            affectedReferenceCount: 2,
            mergeCandidateReferenceCount: 1,
            materialPlaceholderReferenceCount: 2,
            frontStageUsageAssetCount: 1,
            crossProduct: false,
            riskLevel: "high",
            reviewReasons: ["重复素材需要人工确认主素材后再合并引用"],
            assets: [
              {
                assetId: "asset_worksheet_1",
                productId: "course_product_1",
                productTitle: "情绪管理入门",
                assetTitle: "课后练习表",
                assetKind: "worksheet",
                contentHash:
                  "sha256:9b6f0c37f2ad11858dd6ca056f3027e1dc856d08e88cef7a0381c3a4ac00d0d1",
                complianceStatus: "approved",
                downloadEnabled: true,
                referenceCount: 1,
                references: [
                  {
                    id: "asset_ref_1",
                    assetId: "asset_worksheet_1",
                    productId: "course_product_1",
                    courseId: 1,
                    chapterId: "chapter_1",
                    referenceType: "chapter_exercise",
                    materialPlaceholderId: "material_1",
                    materialPlaceholderIndex: 0,
                    createdBy: "system_asset_governance",
                    createdAt: "2026-05-21T09:00:00.000Z",
                  },
                ],
                frontStageUsage: true,
                frontStageUsageReasons: ["成交主视觉"],
                riskLevel: "high",
                reviewReasons: ["当前建议作为主素材"],
              },
              {
                assetId: "asset_worksheet_2",
                productId: "course_product_1",
                productTitle: "情绪管理入门",
                assetTitle: "课后练习表 B",
                assetKind: "worksheet",
                contentHash:
                  "sha256:9b6f0c37f2ad11858dd6ca056f3027e1dc856d08e88cef7a0381c3a4ac00d0d1",
                complianceStatus: "approved",
                downloadEnabled: false,
                referenceCount: 1,
                references: [],
                frontStageUsage: false,
                riskLevel: "medium",
                reviewReasons: ["已有引用 1"],
              },
            ],
            referencesToMerge: [
              {
                fromAssetId: "asset_worksheet_2",
                toAssetId: "asset_worksheet_1",
                reference: {
                  id: "asset_ref_2",
                  assetId: "asset_worksheet_2",
                  productId: "course_product_1",
                  courseId: 1,
                  chapterId: "chapter_1",
                  referenceType: "chapter_exercise",
                  materialPlaceholderId: "material_2",
                  materialPlaceholderIndex: 1,
                  createdBy: "system_asset_governance",
                  createdAt: "2026-05-21T09:00:00.000Z",
                },
                action: "retarget_to_primary",
                requiresManualReview: true,
                reason: "章节素材占位可在后续写入阶段改指向主素材",
              },
            ],
          },
        ],
        softDeleteCandidates: [
          {
            asset: {
              assetId: "asset_unused_1",
              productId: "course_product_1",
              productTitle: "情绪管理入门",
              assetTitle: "旧练习表",
              assetKind: "worksheet",
              complianceStatus: "rejected",
              downloadEnabled: false,
              referenceCount: 0,
              references: [],
              frontStageUsage: false,
              riskLevel: "low",
              reviewReasons: ["素材已驳回且无引用，可优先清理"],
            },
            canSoftDeleteSafely: true,
            hasReferences: false,
            isApproved: false,
            downloadEnabled: false,
            frontStageUsage: false,
            willHideLearningDownload: false,
            reviewReasons: ["素材已驳回且无引用，可优先清理"],
          },
        ],
        safetyNotes: [
          "当前预案只读展示影响范围，不保存批量任务、不写审计、不修改素材 Store。",
        ],
      });
    expect(batchActionPlan.executable).toBe(false);

    expect(
      CourseProductAssetGovernanceBatchTaskListQuerySchema.parse({
        approvalStatus: "approved",
        executionStatus: "completed",
        issueFilter: "pending_compliance",
        action: "acknowledge_issue",
        createdBy: "operator_1",
        executionRequestedBy: "operator_3",
        dateFrom: "2026-05-21T00:00:00.000+08:00",
        dateTo: "2026-05-21T23:59:59.999+08:00",
        pageSize: 8,
      })
    ).toMatchObject({
      executionStatus: "completed",
      issueFilter: "pending_compliance",
      pageSize: 8,
    });

    const learningReport =
      CourseProductLearningMaterialOperationsReportSchema.parse({
        generatedAt: "2026-05-21T09:47:00.000Z",
        summary: {
          totalProductCount: 1,
          productWithMaterialSlotsCount: 1,
          chapterCount: 3,
          materialSlotCount: 6,
          boundMaterialSlotCount: 4,
          materialBindingRate: 0.6667,
          totalAssetCount: 8,
          learningMaterialAssetCount: 4,
          activeLearningMaterialAssetCount: 4,
          approvedLearningMaterialAssetCount: 3,
          downloadableLearningMaterialAssetCount: 2,
          downloadDisabledLearningMaterialAssetCount: 2,
          referencedLearningMaterialAssetCount: 3,
          unreferencedLearningMaterialAssetCount: 1,
          pendingComplianceLearningMaterialCount: 1,
          rejectedComplianceLearningMaterialCount: 0,
          softDeleteCandidateLearningMaterialCount: 1,
          governanceIssueLearningMaterialCount: 2,
          referenceSource: "reference_table",
        },
        assetKindDistribution: [
          { key: "worksheet", label: "练习表", count: 2 },
          { key: "audio", label: "音频", count: 1 },
        ],
        complianceStatusDistribution: [
          { key: "approved", label: "已通过", count: 3 },
          { key: "pending", label: "待审核", count: 1 },
        ],
        downloadStatusDistribution: [
          { key: "download_enabled", label: "已开放下载", count: 2 },
          { key: "download_disabled", label: "下载关闭", count: 2 },
        ],
        referenceTypeDistribution: [
          { key: "chapter_exercise", label: "章节练习", count: 2 },
        ],
        issueTypeDistribution: [
          { key: "download_disabled_material", label: "下载关闭", count: 2 },
        ],
        productRows: [
          {
            productId: "course_product_1",
            courseId: 1,
            title: "情绪管理入门",
            status: "published",
            reviewStatus: "approved",
            chapterCount: 3,
            materialSlotCount: 6,
            boundMaterialSlotCount: 4,
            materialBindingRate: 0.6667,
            learningMaterialAssetCount: 4,
            downloadableAssetCount: 2,
            issueAssetCount: 2,
          },
        ],
        notes: ["发现 2 个学习资料素材仍有治理问题"],
      });
    expect(learningReport.summary.materialBindingRate).toBe(0.6667);
  });

  it("validates the first course detail content contract", () => {
    const parsed = CourseProductDetailContentSchema.parse({
      productId: "course_product_1",
      summary: "适合希望系统学习情绪识别、调节和沟通表达的用户。",
      targetAudience: [
        "希望提升情绪调节能力的学习者",
        "需要关系沟通练习的用户",
      ],
      chapters: [
        {
          id: "chapter_1",
          title: "认识情绪反应",
          durationMinutes: 36,
          materialPlaceholders: [
            {
              id: "material_1",
              title: "课前练习表",
              type: "exercise",
              assetId: "asset_emotion_intro_1",
              assetUrl: "/api/courses/1/assets/asset_emotion_intro_1/download",
              uploadedBy: "operator_1",
              uploadedAt: "2026-05-11T10:30:00+08:00",
              complianceStatus: "approved",
              downloadEnabled: true,
            },
          ],
        },
      ],
      updatedAt: "2026-05-11T10:40:00+08:00",
    });

    expect(parsed.merchandising.imageAssets).toEqual([]);
    expect(parsed.merchandising.richTextBlocks).toEqual([]);
    expect(parsed.summaryRichText.blocks).toEqual([]);
    expect(parsed.chapters[0]?.materialPlaceholders[0]?.status).toBe("pending");
    expect(parsed.chapters[0]?.materialPlaceholders[0]?.assetId).toBe(
      "asset_emotion_intro_1"
    );
    expect(parsed.chapters[0]?.materialPlaceholders[0]?.assetUrl).toBe(
      "/api/courses/1/assets/asset_emotion_intro_1/download"
    );
    expect(parsed.chapters[0]?.materialPlaceholders[0]?.complianceStatus).toBe(
      "approved"
    );
    expect(
      CourseProductDetailContentSchema.safeParse({
        ...parsed,
        chapters: [],
      }).success
    ).toBe(false);
  });

  it("validates course detail content update requests", () => {
    const parsed = CourseProductContentUpdateRequestSchema.parse({
      summary: "适合希望系统学习情绪识别、调节和沟通表达的用户。",
      summaryRichText: {
        blocks: [
          {
            id: "summary_block_1",
            type: "paragraph",
            text: "适合希望系统学习情绪识别、调节和沟通表达的用户。",
            emphasis: true,
          },
          {
            id: "summary_block_2",
            type: "bullet",
            text: "购买前先看清适配人群和学习路径。",
            emphasis: false,
          },
        ],
      },
      targetAudience: ["希望提升情绪调节能力的学习者"],
      merchandising: {
        imageAssets: [
          {
            id: "sales_asset_1",
            title: "课程详情图",
            imageUrl: "https://cdn.example.com/assets/emotion-detail.jpg",
            usage: "gallery",
            complianceStatus: "approved",
            style: {
              tone: "warm",
              spacing: "relaxed",
              radius: "large",
              imageAspectRatio: "16:9",
              imageFit: "cover",
              captionMode: "overlay",
            },
          },
        ],
        richTextBlocks: [
          {
            id: "h5_heading_1",
            type: "section_heading",
            title: "先理解情绪，再开始练习",
            style: {
              tone: "fresh",
              spacing: "normal",
              radius: "medium",
            },
          },
          {
            id: "h5_paragraph_1",
            type: "paragraph",
            body: "课程会通过短讲和练习，帮助学习者建立日常可持续的调节路径。",
          },
          {
            id: "h5_faq_1",
            type: "faq",
            question: "购买后可以反复学习吗？",
            answer: "课程权益有效期内可以反复进入学习页查看章节和资料。",
          },
        ],
      },
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
      reason: "课程详情内容完成校对",
      sourceTemplate: {
        id: "warm_course",
        name: "温暖课程型",
        source: "quick_template",
        appliedAt: "2026-05-11T10:30:00.000Z",
      },
    });

    expect(parsed.chapters[0]?.durationMinutes).toBe(36);
    expect(parsed.summaryRichText.blocks[0]?.emphasis).toBe(true);
    expect(parsed.sourceTemplate?.source).toBe("quick_template");
    expect(parsed.merchandising.imageAssets[0]?.style?.captionMode).toBe(
      "overlay"
    );
    expect(parsed.merchandising.richTextBlocks[0]?.style?.tone).toBe("fresh");
    expect(parsed.merchandising.richTextBlocks[2]?.type).toBe("faq");
    expect(
      CourseProductContentUpdateRequestSchema.safeParse({
        ...parsed,
        merchandising: {
          richTextBlocks: [
            {
              id: "h5_image_1",
              type: "image",
              title: "缺少图片地址",
            },
          ],
        },
      }).success
    ).toBe(false);
    expect(
      CourseProductContentUpdateRequestSchema.safeParse({
        ...parsed,
        chapters: [
          {
            ...parsed.chapters[0],
            durationMinutes: 0,
          },
        ],
      }).success
    ).toBe(false);
  });

  it("evaluates content quality separately from schema validity", () => {
    const readyWithWarnings = CourseProductDetailContentSchema.parse({
      productId: "course_product_1",
      summary:
        "这门课程围绕情绪识别、调节练习和日常沟通展开，帮助学习者把困扰拆成可执行的行动计划。",
      targetAudience: [
        "希望提升情绪调节能力的学习者",
        "需要关系沟通练习的用户",
      ],
      merchandising: {
        headline: "先稳住情绪，再恢复行动感",
        subheadline:
          "用真实课程主视觉和清晰卖点，帮助用户快速判断这门课是否适合自己。",
        showcaseImageUrl: "https://cdn.example.com/assets/emotion-showcase.jpg",
        sellingPoints: ["识别情绪触发点", "完成日常稳定练习"],
        imageAssets: [
          {
            id: "sales_asset_1",
            title: "课程成交主视觉",
            imageUrl: "https://cdn.example.com/assets/emotion-showcase.jpg",
            usage: "showcase",
            complianceStatus: "approved",
          },
        ],
        richTextBlocks: [
          {
            id: "h5_heading_1",
            type: "section_heading",
            title: "先稳住，再行动",
          },
          {
            id: "h5_paragraph_1",
            type: "paragraph",
            body: "课程将情绪调节拆成识别、停顿、表达和复盘四个动作。",
          },
          {
            id: "h5_note_1",
            type: "purchase_note",
            body: "适合希望用碎片时间建立稳定练习节奏的学习者。",
          },
        ],
      },
      chapters: [
        {
          id: "chapter_1",
          title: "认识情绪反应",
          durationMinutes: 36,
          materialPlaceholders: [
            {
              id: "material_1",
              title: "课前练习表",
              type: "exercise",
              status: "pending",
            },
          ],
        },
        {
          id: "chapter_2",
          title: "建立日常练习",
          durationMinutes: 42,
          materialPlaceholders: [
            {
              id: "material_2",
              title: "章节讲义",
              type: "document",
              status: "ready",
            },
          ],
        },
      ],
      updatedAt: "2026-05-12T09:00:00+08:00",
    });

    expect(
      evaluateCourseProductContentQuality(readyWithWarnings)
    ).toMatchObject({
      ready: true,
      blockingCount: 0,
      warningCount: 1,
    });

    const blocked = CourseProductDetailContentSchema.parse({
      productId: "course_product_1",
      summary: "这是一段达到契约最低长度但还不足以支撑审核判断的摘要。",
      targetAudience: ["学习者"],
      chapters: [
        {
          id: "chapter_1",
          title: "短章",
          durationMinutes: 5,
          materialPlaceholders: [],
        },
      ],
      updatedAt: "2026-05-12T09:00:00+08:00",
    });

    const quality = evaluateCourseProductContentQuality(blocked);
    expect(quality.ready).toBe(false);
    expect(quality.issues.map(issue => issue.code)).toEqual(
      expect.arrayContaining([
        "audience_too_few",
        "chapters_too_few",
        "chapter_duration_too_short",
        "chapter_material_missing",
      ])
    );
  });
});
