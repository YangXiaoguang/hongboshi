import { describe, expect, it } from "vitest";
import { courses } from "../../../shared/data/mockCourses";
import {
  CourseProductAssetReferenceSchema,
  type CourseProductAssetReference,
} from "../../../shared/domain";
import {
  InMemoryCourseProductStore,
  courseProductFromCourse,
} from "./courseProductStore";
import {
  catalogOperationPermissions,
  applyCourseProductAssetGovernanceActionPayload,
  cancelCourseProductAssetGovernanceBatchTaskPayload,
  createCourseProductPayload,
  createCourseProductAssetGovernanceBatchTaskPayload,
  executeCourseProductAssetGovernanceBatchTaskPayload,
  getCourseProductAdminListPayload,
  getCourseProductAssetBackfillPayload,
  getCourseProductAssetGovernanceBatchActionPlanPayload,
  getCourseProductAssetGovernanceBatchDraftPayload,
  getCourseProductAssetGovernanceBatchTaskQueueObservationPayload,
  getCourseProductAssetGovernanceBatchTaskExecutionDetailPayload,
  getCourseProductAssetGovernanceBatchTaskExecutionPlanPayload,
  getCourseProductAssetGovernanceBatchTasksPayload,
  getCourseProductAssetGovernanceHistoryPayload,
  getCourseProductAssetDownloadPayload,
  getCourseProductAssetGovernancePayload,
  getCourseProductLearningMaterialOperationsReportPayload,
  getCourseProductAssetsPayload,
  reviewCourseProductAssetGovernanceBatchTaskPayload,
  getCourseProductContentQualityPayload,
  getCourseProductContentPayload,
  createCourseProductPublishQueueBatchTaskPayload,
  getCourseProductPublishQueueBatchTasksPayload,
  getCourseProductPublishQueuePayload,
  runCourseProductAssetBackfillPayload,
  updateCourseProductAssetCompliancePayload,
  updateCourseProductBasicInfoPayload,
  updateCourseProductContentPayload,
  updateCourseProductPricePayload,
  updateCourseProductReviewPayload,
  updateCourseProductStatusPayload,
  uploadCourseProductAssetFilePayload,
  uploadCourseProductAssetPayload,
} from "./catalogApi";
import { InMemoryCourseProductContentStore } from "./courseProductContentStore";
import {
  InMemoryCourseProductAssetFileStorage,
  InMemoryCourseProductAssetStore,
  type CourseProductAssetReferenceStore,
} from "./courseProductAssetStore";
import { InMemoryCourseProductAssetGovernanceBatchTaskStore } from "./courseProductAssetGovernanceBatchTaskStore";
import { InMemoryCourseProductAssetGovernanceBatchTaskExecutionQueue } from "./courseProductAssetGovernanceBatchTaskExecutionQueue";
import { InMemoryCourseProductPublishQueueBatchTaskStore } from "./courseProductPublishQueueTaskStore";

const products = courses.slice(0, 4).map(courseProductFromCourse);
const createStore = () => new InMemoryCourseProductStore(products);

class InMemoryBackfillTarget
  extends InMemoryCourseProductAssetStore
  implements CourseProductAssetReferenceStore
{
  private readonly references = new Map<string, CourseProductAssetReference>();

  async listAssetReferences(assetId?: string) {
    return Array.from(this.references.values()).filter(
      reference => !assetId || reference.assetId === assetId
    );
  }

  async saveAssetReference(reference: CourseProductAssetReference) {
    const parsed = CourseProductAssetReferenceSchema.parse(reference);
    this.references.set(parsed.id, parsed);
    return parsed;
  }
}

describe("catalog admin api payloads", () => {
  it("requires catalog read permission", async () => {
    const store = createStore();
    const anonymous = await getCourseProductAdminListPayload(null, {}, store);
    expect(anonymous.status).toBe(401);

    const forbidden = await getCourseProductAdminListPayload(
      { id: "user_1", roles: ["member"] },
      {},
      store
    );
    expect(forbidden.status).toBe(403);

    const catalogViewer = await getCourseProductAdminListPayload(
      { id: "catalog_viewer_1", roles: ["catalog_viewer"] },
      {},
      store
    );
    expect(catalogViewer.status).toBe(200);
  });

  it("keeps catalog operation permissions explicit", () => {
    expect(catalogOperationPermissions).toMatchObject({
      list: "catalog:read",
      contentRead: "catalog:read",
      contentQualityRead: "catalog:read",
      publishQueueRead: "catalog:read",
      publishQueueBatchTaskRead: "catalog:review",
      publishQueueBatchTaskManage: "catalog:review",
      assetRead: "catalog:read",
      assetUpload: "catalog:edit",
      assetReview: "catalog:review",
      assetBackfillRead: "catalog:read",
      assetBackfillWrite: "catalog:review",
      assetGovernanceRead: "catalog:read",
      assetGovernanceManage: "catalog:review",
      assetGovernanceBatchDraft: "catalog:review",
      assetGovernanceBatchTaskRead: "catalog:review",
      assetGovernanceBatchTaskManage: "catalog:review",
      assetGovernanceBatchActionPlanRead: "catalog:review",
      basicInfoUpdate: "catalog:edit",
      contentUpdate: "catalog:edit",
      reviewUpdate: "catalog:review",
      statusUpdate: "catalog:publish",
      priceUpdate: "catalog:price",
    });
  });

  it("returns filtered course products to operators", async () => {
    const store = createStore();
    const payload = await getCourseProductAdminListPayload(
      { id: "operator_1", roles: ["operator"] },
      {
        category: products[0].category,
        status: "published",
        page: 1,
        pageSize: 2,
      },
      store
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (payload.body.ok) {
      expect(payload.body.data.items.length).toBeGreaterThan(0);
      expect(payload.body.data.items[0]?.category).toBe(products[0].category);
      expect(payload.body.data.meta.pageSize).toBe(2);
      expect(payload.body.data.summary.totalCount).toBe(products.length);
      expect(payload.body.data.auditEvents).toEqual([]);
    }
  });

  it("allows read-only catalog actors to inspect but not mutate products", async () => {
    const productStore = createStore();
    const contentStore = new InMemoryCourseProductContentStore();
    const actor = {
      id: "catalog_viewer_1",
      roles: ["catalog_viewer" as const],
    };

    const list = await getCourseProductAdminListPayload(
      actor,
      {},
      productStore
    );
    const content = await getCourseProductContentPayload(
      actor,
      products[0].id,
      productStore,
      contentStore
    );
    const quality = await getCourseProductContentQualityPayload(
      actor,
      productStore,
      contentStore
    );

    expect(list.status).toBe(200);
    expect(content.status).toBe(200);
    expect(quality.status).toBe(200);

    const deniedStatus = await updateCourseProductStatusPayload(
      actor,
      products[0].id,
      {
        status: "unpublished",
        reason: "只读账号不能上下架",
      },
      productStore
    );
    const deniedPrice = await updateCourseProductPricePayload(
      actor,
      products[0].id,
      {
        amount: 99,
        originalAmount: 199,
        isFree: false,
        reason: "只读账号不能改价",
      },
      productStore
    );
    const deniedInfo = await updateCourseProductBasicInfoPayload(
      actor,
      products[0].id,
      {
        title: "婚姻关系沟通训练",
        coverUrl: products[0].coverUrl,
        category: "婚姻关系",
        type: "直播",
        instructorName: "林若安",
        learners: 1888,
        reason: "只读账号不能编辑信息",
      },
      productStore
    );
    const deniedReview = await updateCourseProductReviewPayload(
      actor,
      products[0].id,
      {
        action: "approve",
        reason: "只读账号不能审核",
      },
      productStore
    );
    const deniedContent = await updateCourseProductContentPayload(
      actor,
      products[0].id,
      {
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
        reason: "只读账号不能编辑内容",
      },
      productStore,
      contentStore
    );

    expect([
      deniedStatus.status,
      deniedPrice.status,
      deniedInfo.status,
      deniedReview.status,
      deniedContent.status,
    ]).toEqual([403, 403, 403, 403, 403]);
  });

  it("serves publish queue aggregation and saves draft tasks without mutating products", async () => {
    const productStore = createStore();
    const contentStore = new InMemoryCourseProductContentStore();
    const taskStore = new InMemoryCourseProductPublishQueueBatchTaskStore();
    const beforeProducts = await productStore.listProducts();

    const queue = await getCourseProductPublishQueuePayload(
      { id: "catalog_viewer_1", roles: ["catalog_viewer"] },
      { pageSize: 10 },
      {
        productStore,
        contentStore,
        now: "2026-05-23T10:00:00.000Z",
      }
    );
    expect(queue.status).toBe(200);
    expect(queue.body).toMatchObject({
      ok: true,
      data: {
        previewOnly: true,
        executable: false,
        summary: {
          totalScannedCount: beforeProducts.length,
          candidateCount: beforeProducts.length,
        },
      },
    });

    const deniedTasks = await getCourseProductPublishQueueBatchTasksPayload(
      { id: "catalog_viewer_1", roles: ["catalog_viewer"] },
      {},
      {
        taskStore,
        now: "2026-05-23T10:01:00.000Z",
      }
    );
    expect(deniedTasks.status).toBe(403);

    const created = await createCourseProductPublishQueueBatchTaskPayload(
      { id: "catalog_operator_1", roles: ["catalog_operator"] },
      {
        action: "quality_recheck",
        query: { pageSize: 10 },
        reason: "月度上架前队列复核",
      },
      {
        productStore,
        contentStore,
        taskStore,
        now: "2026-05-23T10:02:00.000Z",
      }
    );

    expect(created.status).toBe(200);
    expect(created.body).toMatchObject({
      ok: true,
      data: {
        task: {
          action: "quality_recheck",
          status: "draft",
          previewOnly: true,
          executable: false,
          candidateCount: beforeProducts.length,
          createdBy: "catalog_operator_1",
        },
      },
    });
    expect(await productStore.listProducts()).toEqual(beforeProducts);
  });

  it("rejects invalid list query values", async () => {
    const store = createStore();
    const payload = await getCourseProductAdminListPayload(
      { id: "operator_1", roles: ["operator"] },
      { status: "deleted" },
      store
    );

    expect(payload.status).toBe(400);
    expect(payload.body.ok).toBe(false);
  });

  it("creates course product drafts and records creation audit", async () => {
    const store = createStore();
    const forbidden = await createCourseProductPayload(
      { id: "user_1", roles: ["member"] },
      {
        title: "压力管理进阶训练",
        coverUrl:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
        category: "情绪管理",
        type: "录播",
        instructorName: "周老师",
        price: {
          amount: 199,
          originalAmount: 399,
          isFree: false,
          memberIncluded: false,
        },
        reason: "新增压力管理课程商品草稿",
      },
      store
    );
    expect(forbidden.status).toBe(403);

    const payload = await createCourseProductPayload(
      { id: "operator_1", roles: ["operator"] },
      {
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
        reason: "新增压力管理课程商品草稿",
      },
      store,
      "2026-05-23T10:00:00.000Z"
    );

    expect(payload.status).toBe(201);
    expect(payload.body.ok).toBe(true);
    if (payload.body.ok) {
      expect(payload.body.data.product).toMatchObject({
        status: "draft",
        reviewStatus: "not_submitted",
        source: "manual",
      });
      expect(payload.body.data.auditEvent.action).toBe("product_create");
    }
  });

  it("updates course product status and records audit events", async () => {
    const store = createStore();
    const payload = await updateCourseProductStatusPayload(
      { id: "operator_1", roles: ["operator"] },
      products[0].id,
      {
        status: "unpublished",
        reason: "课程内容需要重新排期",
      },
      store,
      "2026-05-11T10:00:00.000Z"
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (payload.body.ok) {
      expect(payload.body.data.product.status).toBe("unpublished");
      expect(payload.body.data.auditEvent.action).toBe("status_update");
    }
  });

  it("updates course product price and rejects invalid actors", async () => {
    const store = createStore();
    const forbidden = await updateCourseProductPricePayload(
      { id: "user_1", roles: ["member"] },
      products[0].id,
      {
        amount: 99,
        originalAmount: 199,
        isFree: false,
        reason: "专题活动价格调整",
      },
      store
    );
    expect(forbidden.status).toBe(403);

    const payload = await updateCourseProductPricePayload(
      { id: "operator_1", roles: ["operator"] },
      products[0].id,
      {
        amount: 99,
        originalAmount: 199,
        isFree: false,
        reason: "专题活动价格调整",
      },
      store,
      "2026-05-11T10:10:00.000Z"
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (payload.body.ok) {
      expect(payload.body.data.product.price.amount).toBe(99);
      expect(payload.body.data.auditEvent.action).toBe("price_update");
    }
  });

  it("updates course product basic information and records audit events", async () => {
    const store = createStore();
    const payload = await updateCourseProductBasicInfoPayload(
      { id: "operator_1", roles: ["operator"] },
      products[0].id,
      {
        title: "婚姻关系沟通训练",
        coverUrl: products[0].coverUrl,
        category: "婚姻关系",
        type: "直播",
        instructorName: "林若安",
        learners: 1888,
        reason: "运营校对课程基础信息",
      },
      store,
      "2026-05-11T10:20:00.000Z"
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (payload.body.ok) {
      expect(payload.body.data.product).toMatchObject({
        title: "婚姻关系沟通训练",
        category: "婚姻关系",
        type: "直播",
        learners: 1888,
      });
      expect(payload.body.data.auditEvent.action).toBe("info_update");
    }
  });

  it("updates course product review status and records audit events", async () => {
    const store = new InMemoryCourseProductStore([
      {
        ...products[0],
        status: "unpublished",
        reviewStatus: "not_submitted",
        publishedAt: undefined,
      },
    ]);

    const submitted = await updateCourseProductReviewPayload(
      { id: "operator_1", roles: ["operator"] },
      products[0].id,
      {
        action: "submit",
        reason: "课程内容和素材已完成自检",
      },
      store,
      "2026-05-11T10:30:00.000Z"
    );
    expect(submitted.status).toBe(200);
    expect(submitted.body.ok).toBe(true);
    if (submitted.body.ok) {
      expect(submitted.body.data.product.reviewStatus).toBe("pending");
      expect(submitted.body.data.auditEvent.action).toBe("review_update");
    }

    const approved = await updateCourseProductReviewPayload(
      { id: "operator_2", roles: ["operator"] },
      products[0].id,
      {
        action: "approve",
        reason: "课程内容符合上架标准",
      },
      store,
      "2026-05-11T10:35:00.000Z"
    );
    expect(approved.status).toBe(200);
    expect(approved.body.ok).toBe(true);
    if (approved.body.ok) {
      expect(approved.body.data.product.reviewStatus).toBe("approved");
    }
  });

  it("blocks review submission when detail content quality has blocking issues", async () => {
    const store = new InMemoryCourseProductStore([
      {
        ...products[0],
        status: "unpublished",
        reviewStatus: "not_submitted",
        publishedAt: undefined,
      },
    ]);
    const contentStore = new InMemoryCourseProductContentStore([
      {
        productId: products[0].id,
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
        updatedAt: "2026-05-12T09:00:00.000Z",
      },
    ]);

    const blocked = await updateCourseProductReviewPayload(
      { id: "operator_1", roles: ["operator"] },
      products[0].id,
      {
        action: "submit",
        reason: "提交审核前进行内容校验",
      },
      store,
      "2026-05-12T09:10:00.000Z",
      contentStore
    );

    expect(blocked.status).toBe(409);
    expect(blocked.body.ok).toBe(false);
    if (!blocked.body.ok) {
      expect(blocked.body.error.message).toContain("校验未通过");
      expect(blocked.body.error.details).toMatchObject({
        quality: {
          ready: false,
          blockingCount: expect.any(Number),
          issues: expect.arrayContaining([
            expect.objectContaining({
              code: "audience_too_few",
              path: "targetAudience",
            }),
            expect.objectContaining({
              code: "chapter_duration_too_short",
              path: "chapters.0.durationMinutes",
            }),
          ]),
        },
      });
    }
  });

  it("returns batch content quality results to operators", async () => {
    const productStore = createStore();
    const contentStore = new InMemoryCourseProductContentStore();

    const payload = await getCourseProductContentQualityPayload(
      { id: "operator_1", roles: ["operator"] },
      productStore,
      contentStore
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (payload.body.ok) {
      expect(payload.body.data.summary.totalCount).toBe(products.length);
      expect(payload.body.data.items[0]?.quality.ready).toBe(true);
    }
  });

  it("manages product asset upload and compliance review with permissions", async () => {
    const productStore = createStore();
    const assetStore = new InMemoryCourseProductAssetStore();

    const anonymous = await getCourseProductAssetsPayload(
      null,
      products[0].id,
      productStore,
      assetStore
    );
    expect(anonymous.status).toBe(401);

    const uploaded = await uploadCourseProductAssetPayload(
      { id: "operator_1", roles: ["operator"] },
      products[0].id,
      {
        kind: "detail_image",
        title: "详情主视觉",
        sourceUrl: "https://cdn.example.com/course/detail.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 188000,
        usage: "showcase",
        reason: "新增课程详情主视觉",
      },
      productStore,
      assetStore,
      "2026-05-20T09:00:00.000Z"
    );

    expect(uploaded.status).toBe(200);
    expect(uploaded.body.ok).toBe(true);
    if (!uploaded.body.ok) return;
    expect(uploaded.body.data.asset.complianceStatus).toBe("pending");
    expect(uploaded.body.data.auditEvent.action).toBe("asset_upload");

    const list = await getCourseProductAssetsPayload(
      { id: "catalog_viewer_1", roles: ["catalog_viewer"] },
      products[0].id,
      productStore,
      assetStore
    );
    expect(list.status).toBe(200);
    expect(list.body.ok && list.body.data.summary.pendingCount).toBe(1);

    const deniedReview = await updateCourseProductAssetCompliancePayload(
      { id: "member_1", roles: ["member"] },
      products[0].id,
      uploaded.body.data.asset.id,
      {
        complianceStatus: "approved",
        reason: "只读审核权限不足",
      },
      productStore,
      assetStore
    );
    expect(deniedReview.status).toBe(403);

    const reviewed = await updateCourseProductAssetCompliancePayload(
      { id: "operator_2", roles: ["operator"] },
      products[0].id,
      uploaded.body.data.asset.id,
      {
        complianceStatus: "approved",
        reason: "图片来源和内容已完成合规确认",
      },
      productStore,
      assetStore,
      "2026-05-20T10:00:00.000Z"
    );

    expect(reviewed.status).toBe(200);
    expect(reviewed.body.ok).toBe(true);
    if (reviewed.body.ok) {
      expect(reviewed.body.data.asset.complianceStatus).toBe("approved");
      expect(reviewed.body.data.auditEvent.action).toBe("asset_review");
    }
  });

  it("uploads object-storage asset files and serves them to catalog readers", async () => {
    const productStore = createStore();
    const assetStore = new InMemoryCourseProductAssetStore();
    const fileStorage = new InMemoryCourseProductAssetFileStorage();

    const uploaded = await uploadCourseProductAssetFilePayload(
      { id: "operator_1", roles: ["operator"] },
      products[0].id,
      {
        kind: "worksheet",
        title: "课后练习表",
        fileName: "worksheet.pdf",
        mimeType: "application/pdf",
        fileBase64: Buffer.from("course worksheet").toString("base64"),
        sizeBytes: 16,
        reason: "上传课程练习资料",
      },
      productStore,
      assetStore,
      fileStorage,
      "2026-05-20T09:00:00.000Z"
    );

    expect(uploaded.status).toBe(200);
    expect(uploaded.body.ok).toBe(true);
    if (!uploaded.body.ok) return;
    expect(uploaded.body.data.asset.sourceType).toBe("object_storage");

    const deniedDownload = await getCourseProductAssetDownloadPayload(
      { id: "member_1", roles: ["member"] },
      products[0].id,
      uploaded.body.data.asset.id,
      productStore,
      assetStore,
      fileStorage
    );
    expect(deniedDownload.status).toBe(403);

    const downloaded = await getCourseProductAssetDownloadPayload(
      { id: "catalog_viewer_1", roles: ["catalog_viewer"] },
      products[0].id,
      uploaded.body.data.asset.id,
      productStore,
      assetStore,
      fileStorage
    );

    expect(downloaded.status).toBe(200);
    if ("file" in downloaded) {
      expect(downloaded.file.bytes.toString("utf8")).toBe("course worksheet");
    }
  });

  it("reads and updates course product detail content", async () => {
    const productStore = createStore();
    const contentStore = new InMemoryCourseProductContentStore();
    const contentPayload = await getCourseProductContentPayload(
      { id: "operator_1", roles: ["operator"] },
      products[0].id,
      productStore,
      contentStore
    );

    expect(contentPayload.status).toBe(200);
    expect(contentPayload.body.ok).toBe(true);
    if (contentPayload.body.ok) {
      expect(contentPayload.body.data.productId).toBe(products[0].id);
      expect(contentPayload.body.data.chapters.length).toBeGreaterThan(0);
    }

    const updated = await updateCourseProductContentPayload(
      { id: "operator_1", roles: ["operator"] },
      products[0].id,
      {
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
      },
      productStore,
      contentStore,
      "2026-05-11T11:20:00.000Z"
    );

    expect(updated.status).toBe(200);
    expect(updated.body.ok).toBe(true);
    if (updated.body.ok) {
      expect(updated.body.data.content.chapters).toHaveLength(1);
      expect(updated.body.data.product.reviewStatus).toBe("not_submitted");
      expect(updated.body.data.auditEvent.action).toBe("content_update");
    }
  });

  it("allows catalog viewers to read a course asset backfill preview", async () => {
    const payload = await getCourseProductAssetBackfillPayload(
      { id: "catalog_viewer_1", roles: ["catalog_viewer"] },
      {
        productStore: new InMemoryCourseProductStore([products[0]]),
        contentStore: new InMemoryCourseProductContentStore(),
        sourceAssetStore: buildBackfillSourceAssetStore(),
        now: "2026-05-20T11:00:00.000Z",
      }
    );

    expect(payload.status).toBe(200);
    expect(payload.body).toMatchObject({
      ok: true,
      data: {
        mode: "dry_run",
        writtenAssetCount: 0,
        plan: {
          assetCount: 1,
          dryRun: true,
        },
      },
    });
  });

  it("allows catalog viewers to read course asset governance summaries", async () => {
    const anonymous = await getCourseProductAssetGovernancePayload(null, {
      productStore: new InMemoryCourseProductStore([products[0]]),
      contentStore: buildBackfillContentStore(),
      assetStore: buildBackfillSourceAssetStore(),
      now: "2026-05-21T09:00:00.000Z",
    });
    expect(anonymous.status).toBe(401);

    const member = await getCourseProductAssetGovernancePayload(
      { id: "member_1", roles: ["member"] },
      {
        productStore: new InMemoryCourseProductStore([products[0]]),
        contentStore: buildBackfillContentStore(),
        assetStore: buildBackfillSourceAssetStore(),
        now: "2026-05-21T09:00:00.000Z",
      }
    );
    expect(member.status).toBe(403);

    const payload = await getCourseProductAssetGovernancePayload(
      { id: "catalog_viewer_1", roles: ["catalog_viewer"] },
      {
        productStore: new InMemoryCourseProductStore([products[0]]),
        contentStore: buildBackfillContentStore(),
        assetStore: buildBackfillSourceAssetStore(),
        now: "2026-05-21T09:00:00.000Z",
      }
    );

    expect(payload.status).toBe(200);
    expect(payload.body).toMatchObject({
      ok: true,
      data: {
        summary: {
          totalAssetCount: 1,
          referencedAssetCount: 1,
          referenceSource: "content_material_placeholders",
        },
      },
    });
  });

  it("applies single asset governance actions for catalog reviewers", async () => {
    const productStore = new InMemoryCourseProductStore([products[0]]);
    const assetStore = new InMemoryCourseProductAssetStore([
      {
        id: "asset_unused_1",
        productId: products[0].id,
        kind: "worksheet",
        title: "未引用练习表",
        fileName: "worksheet.pdf",
        mimeType: "application/pdf",
        sizeBytes: 16,
        sourceType: "object_storage",
        objectKey:
          "course-assets/course_product_1/asset_unused_1/hash-worksheet.pdf",
        contentHash:
          "sha256:9b6f0c37f2ad11858dd6ca056f3027e1dc856d08e88cef7a0381c3a4ac00d0d1",
        complianceStatus: "approved",
        downloadEnabled: true,
        uploadedBy: "operator_1",
        uploadedAt: "2026-05-20T09:00:00.000Z",
        updatedAt: "2026-05-20T09:00:00.000Z",
      },
    ]);
    const contentStore = new InMemoryCourseProductContentStore([]);

    const denied = await applyCourseProductAssetGovernanceActionPayload(
      { id: "catalog_viewer_1", roles: ["catalog_viewer"] },
      products[0].id,
      "asset_unused_1",
      {
        action: "mark_soft_deleted",
        issueType: "soft_delete_candidate",
        reason: "确认无前台引用，进入软删除确认",
      },
      { productStore, contentStore, assetStore }
    );
    expect(denied.status).toBe(403);

    const payload = await applyCourseProductAssetGovernanceActionPayload(
      { id: "catalog_operator_1", roles: ["catalog_operator"] },
      products[0].id,
      "asset_unused_1",
      {
        action: "mark_soft_deleted",
        issueType: "soft_delete_candidate",
        reason: "确认无前台引用，进入软删除确认",
      },
      {
        productStore,
        contentStore,
        assetStore,
        now: "2026-05-21T09:10:00.000Z",
      }
    );

    expect(payload.status).toBe(200);
    expect(payload.body).toMatchObject({
      ok: true,
      data: {
        asset: {
          id: "asset_unused_1",
          deletedAt: "2026-05-21T09:10:00.000Z",
        },
        auditEvent: {
          action: "asset_governance",
        },
      },
    });
  });

  it("reads governance action history and protects batch draft preview", async () => {
    const productStore = new InMemoryCourseProductStore([products[0]]);
    await productStore.appendAuditEvent({
      id: "audit_asset_governance_ack_pending",
      productId: products[0].id,
      productTitle: products[0].title,
      actorId: "catalog_operator_1",
      action: "asset_governance",
      reason: "记录待审核素材处理计划",
      before: {
        assetId: "asset_pending_1",
        productId: products[0].id,
        title: "待审核素材",
        kind: "worksheet",
        governanceAction: "acknowledge_issue",
        issueType: "pending_compliance",
        actorRoles: ["catalog_operator"],
      },
      after: {
        assetId: "asset_pending_1",
        productId: products[0].id,
        title: "待审核素材",
        kind: "worksheet",
        governanceAction: "acknowledge_issue",
        issueType: "pending_compliance",
        actorRoles: ["catalog_operator"],
      },
      createdAt: "2026-05-21T09:30:00.000Z",
    });
    const assetStore = new InMemoryCourseProductAssetStore([
      {
        id: "asset_pending_1",
        productId: products[0].id,
        kind: "worksheet",
        title: "待审核素材",
        fileName: "pending.pdf",
        mimeType: "application/pdf",
        sizeBytes: 16,
        sourceType: "object_storage",
        objectKey: "course-assets/course_product_1/asset_pending_1/pending.pdf",
        contentHash:
          "sha256:8b6f0c37f2ad11858dd6ca056f3027e1dc856d08e88cef7a0381c3a4ac00d0d1",
        complianceStatus: "pending",
        downloadEnabled: false,
        uploadedBy: "operator_1",
        uploadedAt: "2026-05-20T09:00:00.000Z",
        updatedAt: "2026-05-20T09:00:00.000Z",
      },
    ]);
    const contentStore = new InMemoryCourseProductContentStore([]);

    const history = await getCourseProductAssetGovernanceHistoryPayload(
      { id: "catalog_viewer_1", roles: ["catalog_viewer"] },
      {
        action: "acknowledge_issue",
        issueType: "pending_compliance",
      },
      {
        productStore,
        now: "2026-05-21T10:00:00.000Z",
      }
    );
    expect(history.status).toBe(200);
    expect(history.body).toMatchObject({
      ok: true,
      data: {
        summary: {
          filteredEventCount: 1,
        },
        items: [
          {
            assetId: "asset_pending_1",
            actorId: "catalog_operator_1",
            action: "acknowledge_issue",
          },
        ],
      },
    });

    const deniedLearningReport =
      await getCourseProductLearningMaterialOperationsReportPayload(
        { id: "member_1", roles: ["member"] },
        {
          productStore,
          contentStore,
          assetStore,
          now: "2026-05-21T10:00:30.000Z",
        }
      );
    expect(deniedLearningReport.status).toBe(403);

    const learningReport =
      await getCourseProductLearningMaterialOperationsReportPayload(
        { id: "catalog_viewer_1", roles: ["catalog_viewer"] },
        {
          productStore,
          contentStore,
          assetStore,
          now: "2026-05-21T10:01:00.000Z",
        }
      );
    expect(learningReport.status).toBe(200);
    expect(learningReport.body).toMatchObject({
      ok: true,
      data: {
        summary: {
          totalProductCount: 1,
          learningMaterialAssetCount: 1,
          pendingComplianceLearningMaterialCount: 1,
          governanceIssueLearningMaterialCount: 1,
        },
      },
    });

    const deniedDraft = await getCourseProductAssetGovernanceBatchDraftPayload(
      { id: "catalog_viewer_1", roles: ["catalog_viewer"] },
      { issueFilter: "pending_compliance" },
      {
        productStore,
        contentStore,
        assetStore,
        now: "2026-05-21T10:00:00.000Z",
      }
    );
    expect(deniedDraft.status).toBe(403);

    const deniedBatchActionPlan =
      await getCourseProductAssetGovernanceBatchActionPlanPayload(
        { id: "catalog_viewer_1", roles: ["catalog_viewer"] },
        { action: "all" },
        {
          productStore,
          contentStore,
          assetStore,
          now: "2026-05-21T10:00:30.000Z",
        }
      );
    expect(deniedBatchActionPlan.status).toBe(403);

    const batchActionPlan =
      await getCourseProductAssetGovernanceBatchActionPlanPayload(
        { id: "catalog_operator_1", roles: ["catalog_operator"] },
        { action: "mark_soft_deleted", previewSize: 5 },
        {
          productStore,
          contentStore,
          assetStore,
          now: "2026-05-21T10:00:45.000Z",
        }
      );
    expect(batchActionPlan.status).toBe(200);
    expect(batchActionPlan.body).toMatchObject({
      ok: true,
      data: {
        previewOnly: true,
        executable: false,
        willModifyAssetStore: false,
        willWriteAuditEvents: false,
      },
    });

    const before = await assetStore.getAsset("asset_pending_1");
    const draft = await getCourseProductAssetGovernanceBatchDraftPayload(
      { id: "catalog_operator_1", roles: ["catalog_operator"] },
      { issueFilter: "pending_compliance", previewSize: 5 },
      {
        productStore,
        contentStore,
        assetStore,
        now: "2026-05-21T10:00:00.000Z",
      }
    );
    const after = await assetStore.getAsset("asset_pending_1");

    expect(draft.status).toBe(200);
    expect(draft.body).toMatchObject({
      ok: true,
      data: {
        previewOnly: true,
        willModifyAssetStore: false,
        summary: {
          candidateAssetCount: 1,
        },
      },
    });
    expect(after).toEqual(before);

    const taskStore = new InMemoryCourseProductAssetGovernanceBatchTaskStore();
    const deniedTasks = await getCourseProductAssetGovernanceBatchTasksPayload(
      { id: "catalog_viewer_1", roles: ["catalog_viewer"] },
      {},
      {
        taskStore,
        now: "2026-05-21T10:00:00.000Z",
      }
    );
    expect(deniedTasks.status).toBe(403);

    const createTask = await createCourseProductAssetGovernanceBatchTaskPayload(
      { id: "catalog_operator_1", roles: ["catalog_operator"] },
      {
        action: "acknowledge_issue",
        query: {
          issueFilter: "pending_compliance",
          previewSize: 5,
        },
        reason: "统一记录待审核素材处理计划",
      },
      {
        productStore,
        contentStore,
        assetStore,
        taskStore,
        now: "2026-05-21T10:05:00.000Z",
      }
    );
    expect(createTask.status).toBe(200);
    expect(createTask.body).toMatchObject({
      ok: true,
      data: {
        task: {
          approvalStatus: "pending_approval",
          candidateAssetCount: 1,
          createdBy: "catalog_operator_1",
        },
      },
    });

    const taskId = createTask.body.ok
      ? createTask.body.data.task.id
      : "missing_task";
    const listed = await getCourseProductAssetGovernanceBatchTasksPayload(
      { id: "catalog_operator_1", roles: ["catalog_operator"] },
      {
        approvalStatus: "pending_approval",
        pageSize: 5,
      },
      {
        taskStore,
        now: "2026-05-21T10:06:00.000Z",
      }
    );
    expect(listed.body).toMatchObject({
      ok: true,
      data: {
        summary: {
          pendingApprovalCount: 1,
        },
        items: [
          {
            id: taskId,
          },
        ],
      },
    });

    const forbiddenSelfReview =
      await reviewCourseProductAssetGovernanceBatchTaskPayload(
        { id: "catalog_operator_1", roles: ["catalog_operator"] },
        taskId,
        {
          action: "approve",
          reason: "自己创建的草案不能自己审批",
        },
        {
          productStore,
          contentStore,
          assetStore,
          taskStore,
          now: "2026-05-21T10:06:30.000Z",
        }
      );
    expect(forbiddenSelfReview.status).toBe(403);

    const forbiddenCancel =
      await cancelCourseProductAssetGovernanceBatchTaskPayload(
        { id: "catalog_operator_2", roles: ["catalog_operator"] },
        taskId,
        {
          reason: "非创建人尝试取消",
        },
        {
          taskStore,
          now: "2026-05-21T10:07:00.000Z",
        }
      );
    expect(forbiddenCancel.status).toBe(403);

    const canceled = await cancelCourseProductAssetGovernanceBatchTaskPayload(
      { id: "catalog_operator_1", roles: ["catalog_operator"] },
      taskId,
      {
        reason: "筛选口径需要重新确认",
      },
      {
        taskStore,
        now: "2026-05-21T10:08:00.000Z",
      }
    );
    expect(canceled.body).toMatchObject({
      ok: true,
      data: {
        task: {
          approvalStatus: "canceled",
          cancelReason: "筛选口径需要重新确认",
        },
        tasks: {
          summary: {
            canceledCount: 1,
          },
        },
      },
    });

    const reviewDraft =
      await createCourseProductAssetGovernanceBatchTaskPayload(
        { id: "catalog_operator_1", roles: ["catalog_operator"] },
        {
          action: "acknowledge_issue",
          query: {
            issueFilter: "pending_compliance",
            previewSize: 5,
          },
          reason: "重新提交待审核素材处理计划",
        },
        {
          productStore,
          contentStore,
          assetStore,
          taskStore,
          now: "2026-05-21T10:09:00.000Z",
        }
      );
    const reviewTaskId = reviewDraft.body.ok
      ? reviewDraft.body.data.task.id
      : "missing_task";
    const reviewed = await reviewCourseProductAssetGovernanceBatchTaskPayload(
      { id: "catalog_operator_2", roles: ["catalog_operator"] },
      reviewTaskId,
      {
        action: "approve",
        reason: "候选范围和处理口径已完成交叉复核",
      },
      {
        productStore,
        contentStore,
        assetStore,
        taskStore,
        now: "2026-05-21T10:10:00.000Z",
      }
    );
    expect(reviewed.body).toMatchObject({
      ok: true,
      data: {
        task: {
          approvalStatus: "approved",
          reviewedBy: "catalog_operator_2",
          approvalPreflight: {
            requiresRecreate: false,
          },
        },
        tasks: {
          summary: {
            approvedCount: 1,
          },
        },
      },
    });

    const deniedPlan =
      await getCourseProductAssetGovernanceBatchTaskExecutionPlanPayload(
        { id: "catalog_viewer_1", roles: ["catalog_viewer"] },
        reviewTaskId,
        {
          productStore,
          contentStore,
          assetStore,
          taskStore,
          now: "2026-05-21T10:10:30.000Z",
        }
      );
    expect(deniedPlan.status).toBe(403);

    const approvedPlan =
      await getCourseProductAssetGovernanceBatchTaskExecutionPlanPayload(
        { id: "catalog_operator_2", roles: ["catalog_operator"] },
        reviewTaskId,
        {
          productStore,
          contentStore,
          assetStore,
          taskStore,
          now: "2026-05-21T10:11:00.000Z",
        }
      );
    expect(approvedPlan.body).toMatchObject({
      ok: true,
      data: {
        previewOnly: true,
        willModifyAssetStore: false,
        willWriteAuditEvents: false,
        summary: {
          plannedActionCount: 1,
          estimatedAuditEventCount: 1,
        },
      },
    });

    const deniedExecute =
      await executeCourseProductAssetGovernanceBatchTaskPayload(
        { id: "catalog_viewer_1", roles: ["catalog_viewer"] },
        reviewTaskId,
        {
          confirmExecution: true,
          reason: "只读账号不能执行批量治理",
        },
        {
          productStore,
          contentStore,
          assetStore,
          taskStore,
          now: "2026-05-21T10:11:10.000Z",
        }
      );
    expect(deniedExecute.status).toBe(403);

    const badExecute =
      await executeCourseProductAssetGovernanceBatchTaskPayload(
        { id: "catalog_operator_2", roles: ["catalog_operator"] },
        reviewTaskId,
        {
          confirmExecution: false,
          reason: "缺少明确执行确认",
        },
        {
          productStore,
          contentStore,
          assetStore,
          taskStore,
          now: "2026-05-21T10:11:20.000Z",
        }
      );
    expect(badExecute.status).toBe(400);

    const beforeExecute = await assetStore.getAsset("asset_pending_1");
    const executed = await executeCourseProductAssetGovernanceBatchTaskPayload(
      { id: "catalog_operator_2", roles: ["catalog_operator"] },
      reviewTaskId,
      {
        confirmExecution: true,
        reason: "审批通过后执行记录处理审计",
      },
      {
        productStore,
        contentStore,
        assetStore,
        taskStore,
        now: "2026-05-21T10:11:30.000Z",
      }
    );
    const afterExecute = await assetStore.getAsset("asset_pending_1");
    expect(executed.status).toBe(200);
    expect(executed.body).toMatchObject({
      ok: true,
      data: {
        summary: {
          executionStatus: "completed",
          auditEventCount: 1,
          executedActionCount: 1,
        },
        task: {
          executionStatus: "completed",
        },
      },
    });
    expect(afterExecute).toEqual(beforeExecute);
    expect(await productStore.listAuditEvents()).toHaveLength(2);

    const deniedDetail =
      await getCourseProductAssetGovernanceBatchTaskExecutionDetailPayload(
        { id: "catalog_viewer_1", roles: ["catalog_viewer"] },
        reviewTaskId,
        {
          productStore,
          contentStore,
          assetStore,
          taskStore,
          now: "2026-05-21T10:11:40.000Z",
        }
      );
    expect(deniedDetail.status).toBe(403);

    const detail =
      await getCourseProductAssetGovernanceBatchTaskExecutionDetailPayload(
        { id: "catalog_operator_2", roles: ["catalog_operator"] },
        reviewTaskId,
        {
          productStore,
          contentStore,
          assetStore,
          taskStore,
          now: "2026-05-21T10:11:50.000Z",
        }
      );
    expect(detail.body).toMatchObject({
      ok: true,
      data: {
        idempotentReplay: true,
        summary: {
          executionStatus: "completed",
          auditEventCount: 1,
        },
        items: [
          {
            assetId: "asset_pending_1",
            status: "executed",
          },
        ],
      },
    });

    const filteredTasks =
      await getCourseProductAssetGovernanceBatchTasksPayload(
        { id: "catalog_operator_2", roles: ["catalog_operator"] },
        {
          executionStatus: "completed",
          executionRequestedBy: "catalog_operator_2",
          issueFilter: "pending_compliance",
          action: "acknowledge_issue",
          dateFrom: "2026-05-21T10:11:00.000Z",
          dateTo: "2026-05-21T10:12:00.000Z",
          pageSize: 8,
        },
        {
          taskStore,
          now: "2026-05-21T10:11:55.000Z",
        }
      );
    expect(filteredTasks.body).toMatchObject({
      ok: true,
      data: {
        meta: {
          total: 1,
        },
      },
    });

    const deniedQueueObservation =
      await getCourseProductAssetGovernanceBatchTaskQueueObservationPayload(
        { id: "catalog_viewer_1", roles: ["catalog_viewer"] },
        {},
        {
          taskStore,
          queue:
            new InMemoryCourseProductAssetGovernanceBatchTaskExecutionQueue(),
          now: "2026-05-21T10:11:57.000Z",
        }
      );
    expect(deniedQueueObservation.status).toBe(403);

    const queue =
      new InMemoryCourseProductAssetGovernanceBatchTaskExecutionQueue();
    await queue.runNow(
      {
        taskId: reviewTaskId,
        requestedBy: "catalog_operator_2",
        now: "2026-05-21T10:11:58.000Z",
      },
      async () => ({
        summary: executed.body.ok
          ? executed.body.data.summary
          : {
              taskId: reviewTaskId,
              executionStatus: "completed" as const,
              plannedActionCount: 1,
              executedActionCount: 1,
              skippedActionCount: 0,
              failedActionCount: 0,
              auditEventCount: 1,
            },
      })
    );
    const queueObservation =
      await getCourseProductAssetGovernanceBatchTaskQueueObservationPayload(
        { id: "catalog_operator_2", roles: ["catalog_operator"] },
        { taskId: reviewTaskId, limit: 5 },
        {
          taskStore,
          queue,
          now: "2026-05-21T10:11:59.000Z",
        }
      );
    expect(queueObservation.body).toMatchObject({
      ok: true,
      data: {
        summary: {
          observedTaskCount: 1,
          succeededJobCount: 1,
        },
        items: [
          {
            taskId: reviewTaskId,
            latestJob: {
              status: "succeeded",
            },
          },
        ],
      },
    });

    const pendingPlan =
      await getCourseProductAssetGovernanceBatchTaskExecutionPlanPayload(
        { id: "catalog_operator_2", roles: ["catalog_operator"] },
        taskId,
        {
          productStore,
          contentStore,
          assetStore,
          taskStore,
          now: "2026-05-21T10:12:00.000Z",
        }
      );
    expect(pendingPlan.status).toBe(409);
  });

  it("requires review permission before committing course asset backfill writes", async () => {
    const payload = await runCourseProductAssetBackfillPayload(
      { id: "catalog_viewer_1", roles: ["catalog_viewer"] },
      {
        action: "commit",
        confirmWrite: true,
        reason: "运营确认课程素材回填",
      },
      {
        productStore: new InMemoryCourseProductStore([products[0]]),
        contentStore: buildBackfillContentStore(),
        sourceAssetStore: buildBackfillSourceAssetStore(),
        targetAssetStore: new InMemoryBackfillTarget(),
        now: "2026-05-20T11:00:00.000Z",
      }
    );

    expect(payload.status).toBe(403);
    expect(payload.body).toMatchObject({
      ok: false,
      error: {
        code: "FORBIDDEN",
      },
    });
  });

  it("commits course asset backfill assets and references for catalog operators", async () => {
    const targetAssetStore = new InMemoryBackfillTarget();
    const payload = await runCourseProductAssetBackfillPayload(
      { id: "catalog_operator_1", roles: ["catalog_operator"] },
      {
        action: "commit",
        confirmWrite: true,
        reason: "运营确认课程素材回填",
      },
      {
        productStore: new InMemoryCourseProductStore([products[0]]),
        contentStore: buildBackfillContentStore(),
        sourceAssetStore: buildBackfillSourceAssetStore(),
        targetAssetStore,
        now: "2026-05-20T11:00:00.000Z",
      }
    );

    const references =
      await targetAssetStore.listAssetReferences("asset_worksheet_1");

    expect(payload.status).toBe(200);
    expect(payload.body).toMatchObject({
      ok: true,
      data: {
        mode: "commit",
        writtenAssetCount: 1,
        writtenReferenceCount: 1,
        confirmedBy: "catalog_operator_1",
      },
    });
    expect(references).toHaveLength(1);
  });

  it("rejects invalid status transitions and invalid price payloads", async () => {
    const store = createStore();
    const unchanged = await updateCourseProductStatusPayload(
      { id: "operator_1", roles: ["operator"] },
      products[0].id,
      {
        status: "published",
        reason: "重复上架",
      },
      store
    );
    expect(unchanged.status).toBe(409);

    const invalidPrice = await updateCourseProductPricePayload(
      { id: "operator_1", roles: ["operator"] },
      products[0].id,
      {
        amount: 99,
        originalAmount: 199,
        isFree: true,
        reason: "免费活动",
      },
      store
    );
    expect(invalidPrice.status).toBe(400);

    const invalidReview = await updateCourseProductReviewPayload(
      { id: "operator_1", roles: ["operator"] },
      products[0].id,
      {
        action: "approve",
        reason: "跳过待审状态",
      },
      store
    );
    expect(invalidReview.status).toBe(409);
  });
});

function buildBackfillSourceAssetStore() {
  const product = products[0];
  return new InMemoryCourseProductAssetStore([
    {
      id: "asset_worksheet_1",
      productId: product.id,
      chapterId: "chapter_1",
      kind: "worksheet",
      title: "课后练习表",
      fileName: "worksheet.pdf",
      mimeType: "application/pdf",
      sizeBytes: 16,
      sourceType: "object_storage",
      storageKey:
        "course-assets/course_product_1/asset_worksheet_1/hash-worksheet.pdf",
      objectKey:
        "course-assets/course_product_1/asset_worksheet_1/hash-worksheet.pdf",
      contentHash:
        "sha256:9b6f0c37f2ad11858dd6ca056f3027e1dc856d08e88cef7a0381c3a4ac00d0d1",
      complianceStatus: "approved",
      downloadEnabled: true,
      uploadedBy: "operator_1",
      uploadedAt: "2026-05-20T09:00:00.000Z",
      updatedAt: "2026-05-20T09:00:00.000Z",
    },
  ]);
}

function buildBackfillContentStore() {
  const product = products[0];
  return new InMemoryCourseProductContentStore([
    {
      productId: product.id,
      summary: "这门课程帮助学习者识别压力来源，并通过练习建立稳定行动。",
      targetAudience: ["希望提升情绪稳定性的学习者"],
      chapters: [
        {
          id: "chapter_1",
          title: "识别压力反应",
          durationMinutes: 30,
          materialPlaceholders: [
            {
              id: "material_1",
              title: "课后练习表",
              type: "exercise",
              status: "ready",
              assetId: "asset_worksheet_1",
            },
          ],
        },
      ],
      updatedAt: "2026-05-20T09:00:00.000Z",
    },
  ]);
}
