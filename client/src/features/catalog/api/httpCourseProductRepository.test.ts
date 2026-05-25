import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CourseProductRepositoryError,
  httpCourseProductRepository,
  parseCourseProductAssetBackfillResponse,
  parseCourseProductAssetGovernanceActionResponse,
  parseCourseProductAssetGovernanceBatchActionPlanResponse,
  parseCourseProductAssetGovernanceBatchDraftResponse,
  parseCourseProductAssetGovernanceBatchTaskExecutionDetailResponse,
  parseCourseProductAssetGovernanceBatchTaskExecutionResponse,
  parseCourseProductAssetGovernanceBatchTaskExecutionPlanResponse,
  parseCourseProductAssetGovernanceBatchTaskListResponse,
  parseCourseProductAssetGovernanceBatchTaskMutationResponse,
  parseCourseProductAssetGovernanceBatchTaskQueueObservationResponse,
  parseCourseProductAssetGovernanceHistoryResponse,
  parseCourseProductAssetGovernanceResponse,
  parseCourseProductAssetListResponse,
  parseCourseProductAssetMutationResponse,
  parseCourseProductContentResponse,
  parseCourseProductDetailTemplateListResponse,
  parseCourseProductDetailTemplateMutationResponse,
  parseCourseProductLearningMaterialOperationsReportResponse,
  parseCourseProductListResponse,
  parseCourseProductMutationResponse,
  parseCourseProductPublishQueueBatchTaskListResponse,
  parseCourseProductPublishQueueBatchTaskMutationResponse,
  parseCourseProductPublishQueueBatchTaskPreflightResponse,
  parseCourseProductPublishQueueResponse,
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
      approvedCount: 0,
      rejectedCount: 0,
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

function batchTaskQueueObservationData() {
  return {
    generatedAt: "2026-05-21T10:02:00.000Z",
    query: {
      taskId: "asset_governance_batch_task_1",
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
        taskId: "asset_governance_batch_task_1",
        task: {
          ...batchTaskData(),
          approvalStatus: "approved",
          executionStatus: "failed",
          executionAttemptCount: 2,
          lastExecutionError: "audit append timeout",
        },
        latestJob: {
          id: "asset_governance_batch_execution_job_1",
          taskId: "asset_governance_batch_task_1",
          status: "failed",
          requestedBy: "operator_1",
          enqueuedAt: "2026-05-21T10:01:00.000Z",
          startedAt: "2026-05-21T10:01:00.000Z",
          finishedAt: "2026-05-21T10:01:01.000Z",
          attemptCount: 1,
          lastError: "audit append timeout",
        },
        approvalStatus: "approved",
        executionStatus: "failed",
        executionAttemptCount: 2,
        lastExecutionError: "audit append timeout",
        retryRecommended: true,
        operatorHint: "检查失败原因后，可重新打开执行面板重试",
      },
    ],
    notes: ["当前队列观测基于内存 job 状态，服务重启后只保留任务执行字段"],
  };
}

function publishQueueCandidateData() {
  return {
    productId: "course_product_1",
    courseId: 1,
    title: "情绪管理入门",
    coverUrl: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88",
    status: "published",
    reviewStatus: "approved",
    queueGroup: "published_watch",
    recommendedAction: "quality_recheck",
    risk: "medium",
    reason: "课程详情建议配置成交主视觉，提升商品介绍的吸引力。",
    contentReady: true,
    contentBlockingCount: 0,
    contentWarningCount: 1,
    updatedAt: "2026-05-23T09:00:00.000Z",
  };
}

function publishQueueData() {
  return {
    generatedAt: "2026-05-23T10:00:00.000Z",
    query: {
      keyword: "",
      category: "全部",
      status: "all",
      sort: "updated_desc",
      page: 1,
      pageSize: 50,
    },
    previewOnly: true,
    executable: false,
    summary: {
      totalScannedCount: 1,
      totalInScope: 1,
      archivedCount: 0,
      candidateCount: 1,
      blockerCount: 0,
      riskSummary: {
        low: 0,
        medium: 1,
        high: 0,
      },
    },
    groups: [
      {
        id: "published_watch",
        label: "已上架复查",
        description: "已前台可售但仍有内容提醒，建议复查成交素材。",
        workspaceStep: "publish",
        risk: "medium",
        totalCount: 1,
        previewItems: [publishQueueCandidateData()],
      },
    ],
    actions: [
      {
        id: "quality_recheck",
        label: "已发布复查草案",
        description: "保存已上架商品的内容提醒快照，不改变发布状态。",
        candidateCount: 1,
        blockerCount: 0,
        risk: "low",
      },
    ],
    candidates: [publishQueueCandidateData()],
    safetyNotes: ["当前发布队列为服务端聚合预案"],
  };
}

function publishQueueBatchTaskData() {
  return {
    id: "publish_queue_batch_task_1",
    action: "quality_recheck",
    status: "draft",
    query: publishQueueData().query,
    reason: "月度上架前队列复核",
    previewOnly: true,
    executable: false,
    createdBy: "catalog_operator_1",
    createdByRoles: ["catalog_operator"],
    candidateCount: 1,
    blockerCount: 0,
    riskSummary: {
      low: 0,
      medium: 1,
      high: 0,
    },
    candidateSnapshot: [publishQueueCandidateData()],
    safetyNotes: ["草案不会修改课程商品"],
    createdAt: "2026-05-23T10:01:00.000Z",
    updatedAt: "2026-05-23T10:01:00.000Z",
  };
}

function publishQueueBatchTaskListData() {
  return {
    generatedAt: "2026-05-23T10:01:00.000Z",
    query: {
      status: "all",
      action: "all",
      page: 1,
      pageSize: 5,
    },
    summary: {
      totalTaskCount: 1,
      draftCount: 1,
      pendingApprovalCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      canceledCount: 0,
    },
    items: [publishQueueBatchTaskData()],
    meta: {
      page: 1,
      pageSize: 5,
      total: 1,
      totalPages: 1,
    },
  };
}

function publishQueueBatchTaskPreflightData() {
  return {
    task: {
      ...publishQueueBatchTaskData(),
      approvalPreflight: {
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
          low: 0,
          medium: 1,
          high: 0,
        },
        requiresRecreate: false,
        notes: ["审批前预检通过"],
      },
    },
    preflight: {
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
        low: 0,
        medium: 1,
        high: 0,
      },
      requiresRecreate: false,
      notes: ["审批前预检通过"],
    },
  };
}

function batchActionPlanData() {
  return {
    generatedAt: "2026-05-21T10:02:30.000Z",
    requestedBy: "operator_1",
    previewOnly: true,
    executable: false,
    willModifyAssetStore: false,
    willWriteAuditEvents: false,
    query: {
      action: "all",
      previewSize: 6,
    },
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
        assetIds: ["asset_a", "asset_b"],
        suggestedPrimaryAssetId: "asset_a",
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
            assetId: "asset_a",
            productId: "course_product_1",
            productTitle: "情绪管理入门",
            assetTitle: "详情主图",
            assetKind: "detail_image",
            contentHash:
              "sha256:9b6f0c37f2ad11858dd6ca056f3027e1dc856d08e88cef7a0381c3a4ac00d0d1",
            complianceStatus: "approved",
            downloadEnabled: false,
            referenceCount: 1,
            references: [],
            frontStageUsage: true,
            frontStageUsageReasons: ["成交主视觉"],
            riskLevel: "high",
            reviewReasons: ["当前建议作为主素材"],
          },
          {
            assetId: "asset_b",
            productId: "course_product_1",
            productTitle: "情绪管理入门",
            assetTitle: "重复主图",
            assetKind: "detail_image",
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
        referencesToMerge: [],
      },
    ],
    softDeleteCandidates: [
      {
        asset: {
          assetId: "asset_unused",
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
  };
}

function learningMaterialReportData() {
  return {
    generatedAt: "2026-05-21T10:03:00.000Z",
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
      referenceSource: "content_material_placeholders",
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
  };
}

function executionPlanData() {
  const task = {
    ...batchTaskData(),
    approvalStatus: "approved",
    reviewedBy: "operator_2",
    reviewedByRoles: ["catalog_operator"],
    reviewedAt: "2026-05-21T10:02:00.000Z",
    reviewAction: "approve",
    reviewReason: "候选范围和处理口径已完成交叉复核",
    approvalPreflight: {
      generatedAt: "2026-05-21T10:02:00.000Z",
      originalCandidateAssetCount: 1,
      currentCandidateAssetCount: 1,
      candidateDeltaCount: 0,
      disappearedAssetIds: [],
      newCandidateAssetIds: [],
      changedIssueTypeAssetIds: [],
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
    },
  };
  return {
    generatedAt: "2026-05-21T10:03:00.000Z",
    requestedBy: "operator_2",
    previewOnly: true,
    willModifyAssetStore: false,
    willWriteAuditEvents: false,
    task,
    summary: {
      taskId: task.id,
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
        assetId: "asset_pending_1",
        productId: "course_product_1",
        productTitle: "情绪管理入门",
        assetTitle: "待审核素材",
        assetKind: "worksheet",
        issueTypes: ["pending_compliance"],
        referenceCount: 0,
        duplicateContentHashAssetIds: [],
        plannedAction: "acknowledge_issue",
        plannedIssueType: "pending_compliance",
        status: "planned",
        riskLevel: "medium",
        notes: ["真实执行前仍需复核本预案，当前不会写入审计或修改素材。"],
      },
    ],
    safetyNotes: ["当前为已审批批量治理任务的执行预案，只读模拟。"],
  };
}

function executionResultData() {
  const executionPlan = executionPlanData();
  const executionItem = {
    assetId: "asset_pending_1",
    productId: "course_product_1",
    productTitle: "情绪管理入门",
    assetTitle: "待审核素材",
    plannedAction: "acknowledge_issue",
    issueType: "pending_compliance",
    status: "executed",
    auditEventId: "audit_asset_governance_batch_1",
  };
  const summary = {
    taskId: executionPlan.task.id,
    executionStatus: "completed",
    plannedActionCount: 1,
    executedActionCount: 1,
    skippedActionCount: 0,
    failedActionCount: 0,
    auditEventCount: 1,
  };
  return {
    task: {
      ...executionPlan.task,
      executionStatus: "completed",
      executionRequestedBy: "operator_2",
      executionRequestedByRoles: ["catalog_operator"],
      executionStartedAt: "2026-05-21T10:04:00.000Z",
      executionCompletedAt: "2026-05-21T10:04:00.000Z",
      executionReason: "审批通过后执行记录处理审计",
      executionSummary: summary,
      executionItems: [executionItem],
      executionAuditEventIds: ["audit_asset_governance_batch_1"],
    },
    tasks: {
      ...batchTaskListData(),
      summary: {
        ...batchTaskListData().summary,
        pendingApprovalCount: 0,
        approvedCount: 1,
        executionCompletedCount: 1,
      },
    },
    executionPlan,
    summary,
    items: [executionItem],
    auditEvents: [
      {
        id: "audit_asset_governance_batch_1",
        productId: "course_product_1",
        productTitle: "情绪管理入门",
        actorId: "operator_2",
        action: "asset_governance",
        reason: "审批通过后执行记录处理审计",
        before: {
          assetId: "asset_pending_1",
          batchTaskId: executionPlan.task.id,
        },
        after: {
          assetId: "asset_pending_1",
          batchTaskId: executionPlan.task.id,
          batchExecution: true,
        },
        createdAt: "2026-05-21T10:04:00.000Z",
      },
    ],
    idempotentReplay: false,
  };
}

function executionDetailData() {
  const result = executionResultData();
  return {
    task: result.task,
    executionPlan: result.executionPlan,
    summary: result.summary,
    items: result.items,
    auditEvents: result.auditEvents,
    idempotentReplay: true,
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

  it("parses course product detail template responses", () => {
    const list = parseCourseProductDetailTemplateListResponse({
      ok: true,
      data: {
        items: [
          {
            id: "template_1",
            name: "成交模板",
            scope: "personal",
            ownerId: "operator_1",
            content: {
              summary: "用于课程详情成交页的服务端模板。",
              targetAudience: ["希望买前快速判断课程的人"],
              headline: "先看清问题，再开始练习",
              subheadline: "把课程价值和购买权益放在详情页前半段。",
              sellingPoints: ["适合人群清晰"],
              richTextBlocks: [
                {
                  id: "block_1",
                  type: "section_heading",
                  title: "适合先从一个改变开始",
                },
              ],
            },
            createdAt: "2026-05-25T09:00:00.000Z",
            updatedAt: "2026-05-25T09:00:00.000Z",
          },
        ],
        summary: {
          totalCount: 1,
          systemCount: 0,
          teamCount: 0,
          personalCount: 1,
        },
        auditEvents: [],
      },
    });
    expect(list.items[0]?.content.richTextBlocks).toHaveLength(1);

    const mutation = parseCourseProductDetailTemplateMutationResponse({
      ok: true,
      data: {
        template: list.items[0],
        templates: list,
        auditEvent: {
          id: "audit_template_1",
          templateId: "template_1",
          templateName: "成交模板",
          actorId: "operator_1",
          action: "template_apply",
          reason: "套用课程详情模板",
          createdAt: "2026-05-25T09:01:00.000Z",
        },
      },
    });
    expect(mutation.auditEvent.action).toBe("template_apply");
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
        notes: [
          "当前素材 Store 不支持引用表读取，引用数量由课程章节素材占位推导",
        ],
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
    const mutation = parseCourseProductAssetGovernanceBatchTaskMutationResponse(
      {
        ok: true,
        data: {
          task: batchTaskData(),
          tasks: batchTaskListData(),
        },
      }
    );

    expect(list.summary.pendingApprovalCount).toBe(1);
    expect(mutation.task.approvalStatus).toBe("pending_approval");
  });

  it("parses course product publish queue responses", () => {
    const queue = parseCourseProductPublishQueueResponse({
      ok: true,
      data: publishQueueData(),
    });
    const list = parseCourseProductPublishQueueBatchTaskListResponse({
      ok: true,
      data: publishQueueBatchTaskListData(),
    });
    const mutation = parseCourseProductPublishQueueBatchTaskMutationResponse({
      ok: true,
      data: {
        task: publishQueueBatchTaskData(),
        tasks: publishQueueBatchTaskListData(),
      },
    });
    const preflight = parseCourseProductPublishQueueBatchTaskPreflightResponse({
      ok: true,
      data: publishQueueBatchTaskPreflightData(),
    });

    expect(queue.summary.candidateCount).toBe(1);
    expect(list.summary.draftCount).toBe(1);
    expect(mutation.task.status).toBe("draft");
    expect(preflight.preflight.requiresRecreate).toBe(false);
  });

  it("parses course product asset governance queue observations", () => {
    const parsed =
      parseCourseProductAssetGovernanceBatchTaskQueueObservationResponse({
        ok: true,
        data: batchTaskQueueObservationData(),
      });

    expect(parsed.summary.retryableTaskCount).toBe(1);
    expect(parsed.items[0]?.latestJob?.status).toBe("failed");
  });

  it("parses course product asset governance batch action plans", () => {
    const parsed = parseCourseProductAssetGovernanceBatchActionPlanResponse({
      ok: true,
      data: batchActionPlanData(),
    });

    expect(parsed.executable).toBe(false);
    expect(parsed.summary.mergeCandidateReferenceCount).toBe(1);
    expect(parsed.duplicateGroups[0]?.riskLevel).toBe("high");
  });

  it("parses course product learning material operations reports", () => {
    const parsed = parseCourseProductLearningMaterialOperationsReportResponse({
      ok: true,
      data: learningMaterialReportData(),
    });

    expect(parsed.summary.materialBindingRate).toBe(0.6667);
    expect(parsed.productRows[0]?.issueAssetCount).toBe(2);
  });

  it("parses course product asset governance execution plan responses", () => {
    const parsed =
      parseCourseProductAssetGovernanceBatchTaskExecutionPlanResponse({
        ok: true,
        data: executionPlanData(),
      });

    expect(parsed.willModifyAssetStore).toBe(false);
    expect(parsed.willWriteAuditEvents).toBe(false);
    expect(parsed.summary.estimatedAuditEventCount).toBe(1);
  });

  it("parses course product asset governance execution responses", () => {
    const parsed = parseCourseProductAssetGovernanceBatchTaskExecutionResponse({
      ok: true,
      data: executionResultData(),
    });

    expect(parsed.summary.auditEventCount).toBe(1);
    expect(parsed.task.executionStatus).toBe("completed");
  });

  it("parses course product asset governance execution detail responses", () => {
    const parsed =
      parseCourseProductAssetGovernanceBatchTaskExecutionDetailResponse({
        ok: true,
        data: executionDetailData(),
      });

    expect(parsed.idempotentReplay).toBe(true);
    expect(parsed.items[0]?.auditEventId).toBe(
      "audit_asset_governance_batch_1"
    );
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
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify(responsePayload)))
      );

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

  it("creates course product drafts through the admin endpoint", async () => {
    const responsePayload = {
      ok: true,
      data: {
        product: {
          id: "course_product_10001",
          courseId: 10001,
          title: "压力管理进阶训练",
          coverUrl:
            "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
          category: "情绪管理",
          type: "录播",
          instructorName: "周老师",
          learners: 0,
          price: {
            amount: 199,
            originalAmount: 399,
            isFree: false,
            memberIncluded: false,
          },
          status: "draft",
          reviewStatus: "not_submitted",
          source: "manual",
          createdAt: "2026-05-23T10:00:00+08:00",
          updatedAt: "2026-05-23T10:00:00+08:00",
        },
        auditEvent: {
          id: "audit_create_course_product_10001",
          productId: "course_product_10001",
          productTitle: "压力管理进阶训练",
          actorId: "operator_1",
          action: "product_create",
          reason: "新增压力管理课程商品草稿",
          before: {},
          after: { status: "draft" },
          createdAt: "2026-05-23T10:00:00+08:00",
        },
        auditEvents: [],
      },
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify(responsePayload), { status: 201 })
      );

    const result = await httpCourseProductRepository.createCourseProduct({
      title: "压力管理进阶训练",
      coverUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
      category: "情绪管理",
      type: "录播",
      instructorName: "周老师",
      learners: 0,
      price: {
        amount: 199,
        originalAmount: 399,
        isFree: false,
        memberIncluded: false,
      },
      reason: "新增压力管理课程商品草稿",
    });

    expect(result.product.status).toBe("draft");
    expect(result.auditEvent.action).toBe("product_create");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog/admin/course-products",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("压力管理进阶训练"),
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
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify(responsePayload)))
      );

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

  it("preserves structured content quality details from review failures", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "CONFLICT",
            message: "课程详情内容校验未通过，暂不能提交审核",
            details: {
              quality: {
                ready: false,
                issueCount: 1,
                blockingCount: 1,
                warningCount: 0,
                issues: [
                  {
                    code: "summary_too_short",
                    severity: "blocking",
                    message: "课程摘要需要至少 40 个字，才能支撑审核判断。",
                    path: "summary",
                  },
                ],
              },
            },
          },
        }),
        { status: 409 }
      )
    );

    try {
      await httpCourseProductRepository.updateCourseProductReview(
        "course_product_1",
        {
          action: "submit",
          reason: "提交审核前进行内容校验",
        }
      );
      throw new Error("expected review submission to fail");
    } catch (err) {
      expect(err).toBeInstanceOf(CourseProductRepositoryError);
      expect((err as CourseProductRepositoryError).status).toBe(409);
      expect((err as CourseProductRepositoryError).details).toMatchObject({
        quality: {
          ready: false,
          issues: [
            expect.objectContaining({
              code: "summary_too_short",
              path: "summary",
            }),
          ],
        },
      });
    }
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

  it("uses service endpoints for detail template library actions", async () => {
    const responsePayload = {
      ok: true,
      data: {
        template: {
          id: "template_1",
          name: "成交模板",
          scope: "personal",
          ownerId: "operator_1",
          content: {
            summary: "用于课程详情成交页的服务端模板。",
            richTextBlocks: [
              {
                id: "block_1",
                type: "section_heading",
                title: "适合先从一个改变开始",
              },
            ],
          },
          createdAt: "2026-05-25T09:00:00.000Z",
          updatedAt: "2026-05-25T09:00:00.000Z",
        },
        templates: {
          items: [],
          summary: {
            totalCount: 0,
            systemCount: 0,
            teamCount: 0,
            personalCount: 0,
            pendingShareRequestCount: 0,
          },
          auditEvents: [],
        },
        auditEvent: {
          id: "audit_template_1",
          templateId: "template_1",
          templateName: "成交模板",
          actorId: "operator_1",
          action: "template_create",
          reason: "保存课程详情模板",
          createdAt: "2026-05-25T09:01:00.000Z",
        },
      },
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify(responsePayload)))
      );

    await httpCourseProductRepository.createCourseProductDetailTemplate({
      name: "成交模板",
      scope: "personal",
      content: {
        summary: "用于课程详情成交页的服务端模板。",
        richTextBlocks: [
          {
            id: "block_1",
            type: "section_heading",
            title: "适合先从一个改变开始",
          },
        ],
      },
      reason: "保存课程详情模板",
    });
    await httpCourseProductRepository.applyCourseProductDetailTemplate(
      "template_1",
      {
        productId: "course_product_1",
        reason: "套用课程详情模板",
      }
    );
    await httpCourseProductRepository.requestCourseProductDetailTemplateTeamShare(
      "template_1",
      {
        reason: "申请团队共享课程详情模板",
      }
    );
    await httpCourseProductRepository.deleteCourseProductDetailTemplate(
      "template_1",
      {
        reason: "删除课程详情模板",
      }
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/catalog/admin/course-products/detail-templates",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/catalog/admin/course-products/detail-templates/template_1/apply",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/catalog/admin/course-products/detail-templates/template_1/share-request",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/catalog/admin/course-products/detail-templates/template_1",
      expect.objectContaining({ method: "DELETE" })
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

  it("loads course product learning material operations reports", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: learningMaterialReportData(),
        })
      )
    );

    const result =
      await httpCourseProductRepository.loadCourseProductLearningMaterialOperationsReport();

    expect(result.summary.learningMaterialAssetCount).toBe(4);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog/admin/course-products/assets/learning-material-report",
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
      await httpCourseProductRepository.loadCourseProductAssetGovernanceHistory(
        {
          action: "acknowledge_issue",
          actorId: "operator_1",
          pageSize: 5,
        }
      );

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
      await httpCourseProductRepository.loadCourseProductAssetGovernanceBatchDraft(
        {
          issueFilter: "soft_delete_candidate",
          previewSize: 8,
        }
      );

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

  it("loads course product publish queue from server aggregation", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: publishQueueData(),
        })
      )
    );

    const result =
      await httpCourseProductRepository.loadCourseProductPublishQueue({
        status: "published",
        pageSize: 10,
      });

    expect(result.summary.candidateCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog/admin/course-products/publish-queue?status=published&pageSize=10",
      expect.objectContaining({
        credentials: "same-origin",
      })
    );
  });

  it("loads and creates course product publish queue draft tasks", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: publishQueueBatchTaskListData(),
          })
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              task: publishQueueBatchTaskData(),
              tasks: publishQueueBatchTaskListData(),
            },
          })
        )
      );

    const list =
      await httpCourseProductRepository.loadCourseProductPublishQueueBatchTasks(
        {
          status: "draft",
          pageSize: 5,
        }
      );
    const mutation =
      await httpCourseProductRepository.createCourseProductPublishQueueBatchTask(
        {
          action: "quality_recheck",
          query: { status: "published" },
          reason: "月度上架前队列复核",
        }
      );

    expect(list.summary.draftCount).toBe(1);
    expect(mutation.task.candidateCount).toBe(1);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/catalog/admin/course-products/publish-queue/batch-tasks?status=draft&pageSize=5",
      expect.objectContaining({
        credentials: "same-origin",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/catalog/admin/course-products/publish-queue/batch-tasks",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("quality_recheck"),
      })
    );
  });

  it("operates course product publish queue draft approvals", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: publishQueueBatchTaskPreflightData(),
          })
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              task: {
                ...publishQueueBatchTaskData(),
                status: "pending_approval",
              },
              tasks: publishQueueBatchTaskListData(),
            },
          })
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              task: {
                ...publishQueueBatchTaskData(),
                status: "canceled",
              },
              tasks: publishQueueBatchTaskListData(),
            },
          })
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              task: {
                ...publishQueueBatchTaskData(),
                status: "approved",
                approvalPreflight:
                  publishQueueBatchTaskPreflightData().preflight,
              },
              tasks: publishQueueBatchTaskListData(),
            },
          })
        )
      );

    const preflight =
      await httpCourseProductRepository.loadCourseProductPublishQueueBatchTaskPreflight(
        "publish_queue_batch_task_1"
      );
    const submitted =
      await httpCourseProductRepository.submitCourseProductPublishQueueBatchTask(
        "publish_queue_batch_task_1",
        { reason: "提交给管理员进行发布队列审批" }
      );
    const canceled =
      await httpCourseProductRepository.cancelCourseProductPublishQueueBatchTask(
        "publish_queue_batch_task_1",
        { reason: "本轮暂缓发布队列处理" }
      );
    const reviewed =
      await httpCourseProductRepository.reviewCourseProductPublishQueueBatchTask(
        "publish_queue_batch_task_1",
        {
          action: "approve",
          reason: "候选快照与发布边界一致",
          requireFreshPreflight: true,
        }
      );

    expect(preflight.preflight.currentCandidateCount).toBe(1);
    expect(submitted.task.status).toBe("pending_approval");
    expect(canceled.task.status).toBe("canceled");
    expect(reviewed.task.status).toBe("approved");
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/catalog/admin/course-products/publish-queue/batch-tasks/publish_queue_batch_task_1/preflight",
      expect.objectContaining({
        credentials: "same-origin",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/catalog/admin/course-products/publish-queue/batch-tasks/publish_queue_batch_task_1/submit",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining("提交给管理员"),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/catalog/admin/course-products/publish-queue/batch-tasks/publish_queue_batch_task_1/cancel",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining("暂缓"),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/catalog/admin/course-products/publish-queue/batch-tasks/publish_queue_batch_task_1/review",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining("approve"),
      })
    );
  });

  it("loads course product asset governance batch task queue observations", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: batchTaskQueueObservationData(),
        })
      )
    );

    const result =
      await httpCourseProductRepository.loadCourseProductAssetGovernanceBatchTaskQueueObservation(
        {
          taskId: "asset_governance_batch_task_1",
          limit: 5,
        }
      );

    expect(result.summary.failedJobCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog/admin/course-products/assets/governance/batch-tasks/queue-observation?taskId=asset_governance_batch_task_1&limit=5",
      expect.objectContaining({
        credentials: "same-origin",
      })
    );
  });

  it("loads course product asset governance batch action plans", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: batchActionPlanData(),
        })
      )
    );

    const result =
      await httpCourseProductRepository.loadCourseProductAssetGovernanceBatchActionPlan(
        {
          action: "all",
          previewSize: 6,
        }
      );

    expect(result.summary.duplicateGroupCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog/admin/course-products/assets/governance/batch-action-plan?action=all&previewSize=6",
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
            approvedCount: 0,
            rejectedCount: 0,
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

  it("reviews course product asset governance batch task drafts", async () => {
    const approvedTask = {
      ...batchTaskData(),
      approvalStatus: "approved",
      reviewedBy: "operator_2",
      reviewedByRoles: ["catalog_operator"],
      reviewedAt: "2026-05-21T10:10:00.000Z",
      reviewAction: "approve",
      reviewReason: "候选范围和处理口径已完成交叉复核",
      approvalPreflight: {
        generatedAt: "2026-05-21T10:10:00.000Z",
        originalCandidateAssetCount: 1,
        currentCandidateAssetCount: 1,
        candidateDeltaCount: 0,
        disappearedAssetIds: [],
        newCandidateAssetIds: [],
        changedIssueTypeAssetIds: [],
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
      },
      updatedAt: "2026-05-21T10:10:00.000Z",
    };
    const responsePayload = {
      ok: true,
      data: {
        task: approvedTask,
        tasks: {
          ...batchTaskListData(),
          summary: {
            totalTaskCount: 1,
            pendingApprovalCount: 0,
            approvedCount: 1,
            rejectedCount: 0,
            canceledCount: 0,
          },
          items: [approvedTask],
        },
      },
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(responsePayload)));

    const result =
      await httpCourseProductRepository.reviewCourseProductAssetGovernanceBatchTask(
        "asset_governance_batch_task_1",
        {
          action: "approve",
          reason: "候选范围和处理口径已完成交叉复核",
        }
      );

    expect(result.task.approvalStatus).toBe("approved");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog/admin/course-products/assets/governance/batch-tasks/asset_governance_batch_task_1/review",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining("approve"),
      })
    );
  });

  it("loads course product asset governance batch task execution plans", async () => {
    const responsePayload = {
      ok: true,
      data: executionPlanData(),
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(responsePayload)));

    const result =
      await httpCourseProductRepository.loadCourseProductAssetGovernanceBatchTaskExecutionPlan(
        "asset_governance_batch_task_1"
      );

    expect(result.summary.plannedActionCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog/admin/course-products/assets/governance/batch-tasks/asset_governance_batch_task_1/execution-plan",
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
      })
    );
  });

  it("executes course product asset governance batch tasks", async () => {
    const responsePayload = {
      ok: true,
      data: executionResultData(),
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(responsePayload)));

    const result =
      await httpCourseProductRepository.executeCourseProductAssetGovernanceBatchTask(
        "asset_governance_batch_task_1",
        {
          confirmExecution: true,
          reason: "审批通过后执行记录处理审计",
        }
      );

    expect(result.summary.executedActionCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog/admin/course-products/assets/governance/batch-tasks/asset_governance_batch_task_1/execute",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("confirmExecution"),
      })
    );
  });

  it("loads course product asset governance batch task execution details", async () => {
    const responsePayload = {
      ok: true,
      data: executionDetailData(),
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(responsePayload)));

    const result =
      await httpCourseProductRepository.loadCourseProductAssetGovernanceBatchTaskExecutionDetail(
        "asset_governance_batch_task_1"
      );

    expect(result.summary?.auditEventCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog/admin/course-products/assets/governance/batch-tasks/asset_governance_batch_task_1/execution-detail",
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
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
