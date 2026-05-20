import { afterEach, describe, expect, it, vi } from "vitest";
import {
  httpCourseProductRepository,
  parseCourseProductAssetBackfillResponse,
  parseCourseProductAssetListResponse,
  parseCourseProductAssetMutationResponse,
  parseCourseProductContentResponse,
  parseCourseProductListResponse,
  parseCourseProductMutationResponse,
} from "./httpCourseProductRepository";

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
});
