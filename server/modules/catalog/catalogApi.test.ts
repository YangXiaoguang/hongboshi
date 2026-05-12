import { describe, expect, it } from "vitest";
import { courses } from "../../../shared/data/mockCourses";
import {
  InMemoryCourseProductStore,
  courseProductFromCourse,
} from "./courseProductStore";
import {
  catalogOperationPermissions,
  getCourseProductAdminListPayload,
  getCourseProductContentQualityPayload,
  getCourseProductContentPayload,
  updateCourseProductBasicInfoPayload,
  updateCourseProductContentPayload,
  updateCourseProductPricePayload,
  updateCourseProductReviewPayload,
  updateCourseProductStatusPayload,
} from "./catalogApi";
import { InMemoryCourseProductContentStore } from "./courseProductContentStore";

const products = courses.slice(0, 4).map(courseProductFromCourse);
const createStore = () => new InMemoryCourseProductStore(products);

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
    const actor = { id: "catalog_viewer_1", roles: ["catalog_viewer" as const] };

    const list = await getCourseProductAdminListPayload(actor, {}, productStore);
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
