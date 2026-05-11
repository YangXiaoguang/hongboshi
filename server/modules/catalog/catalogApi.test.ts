import { describe, expect, it } from "vitest";
import { courses } from "../../../shared/data/mockCourses";
import {
  InMemoryCourseProductStore,
  courseProductFromCourse,
} from "./courseProductStore";
import {
  getCourseProductAdminListPayload,
  updateCourseProductBasicInfoPayload,
  updateCourseProductPricePayload,
  updateCourseProductReviewPayload,
  updateCourseProductStatusPayload,
} from "./catalogApi";

const products = courses.slice(0, 4).map(courseProductFromCourse);
const createStore = () => new InMemoryCourseProductStore(products);

describe("catalog admin api payloads", () => {
  it("requires admin management permission", async () => {
    const store = createStore();
    const anonymous = await getCourseProductAdminListPayload(null, {}, store);
    expect(anonymous.status).toBe(401);

    const forbidden = await getCourseProductAdminListPayload(
      { id: "user_1", roles: ["member"] },
      {},
      store
    );
    expect(forbidden.status).toBe(403);
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
