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
  CourseProductAssetGovernanceBatchDraftQuerySchema,
  CourseProductAssetGovernanceBatchDraftResultSchema,
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
  CourseProductListQuerySchema,
  CourseProductListResultSchema,
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

    const backfillResult =
      CourseProductAssetBackfillMutationResultSchema.parse({
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
      });
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
            objectKey: "course-assets/course_product_1/asset_worksheet_1/file.pdf",
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
      notes: ["当前素材 Store 不支持引用表读取，引用数量由课程章节素材占位推导"],
    });

    expect(parsed.summary.referenceSource).toBe(
      "content_material_placeholders"
    );
    expect(parsed.items[0]?.issueTypes).toContain("pending_compliance");

    const actionRequest = CourseProductAssetGovernanceActionRequestSchema.parse({
      action: "mark_duplicate_primary",
      issueType: "duplicate_content_hash",
      primaryAssetId: "asset_worksheet_1",
      reason: "确认重复素材后保留主素材",
      note: "后续合并章节引用",
    });
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

    const batchDraft =
      CourseProductAssetGovernanceBatchDraftResultSchema.parse({
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
      });
    expect(batchDraft.willModifyAssetStore).toBe(false);
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
      reason: "课程详情内容完成校对",
    });

    expect(parsed.chapters[0]?.durationMinutes).toBe(36);
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
