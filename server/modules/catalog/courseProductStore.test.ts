import { describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { CourseProductListQuerySchema } from "../../../shared/domain";
import { courses } from "../../../shared/data/mockCourses";
import {
  InMemoryCourseProductStore,
  JsonFileCourseProductStore,
  courseFromCourseProduct,
  courseProductFromCourse,
  coursesFromPublishedProducts,
  listCourseProductsByQuery,
  summarizeCourseProducts,
  updateCourseProductPrice,
  updateCourseProductBasicInfo,
  updateCourseProductStatus,
} from "./courseProductStore";

describe("course product store mapping", () => {
  it("maps seed courses into course product snapshots", () => {
    const product = courseProductFromCourse(courses[0]);

    expect(product).toMatchObject({
      id: `course_product_${courses[0].id}`,
      courseId: courses[0].id,
      title: courses[0].title,
      status: "published",
      reviewStatus: "approved",
      source: "seed",
    });
    expect(product.price.amount).toBe(courses[0].price);
  });

  it("maps course product price and visibility back to public courses", () => {
    const [first, second] = courses.slice(0, 2).map(courseProductFromCourse);
    const publicCourses = coursesFromPublishedProducts([
      {
        ...first,
        price: {
          ...first.price,
          amount: 88,
          originalAmount: 188,
          memberIncluded: false,
        },
      },
      { ...second, status: "unpublished" },
    ]);

    expect(publicCourses).toHaveLength(1);
    expect(publicCourses[0]).toMatchObject({
      id: first.courseId,
      price: 88,
      originalPrice: 188,
      isVip: false,
    });
    expect(courseFromCourseProduct(first).createdAt).toMatch(
      /^\d{4}-\d{2}-\d{2}$/
    );
  });

  it("filters, sorts and paginates course products", () => {
    const products = courses.slice(0, 5).map(courseProductFromCourse);
    const query = CourseProductListQuerySchema.parse({
      keyword: products[0].instructorName,
      status: "published",
      page: 1,
      pageSize: 1,
      sort: "learners_desc",
    });

    const result = listCourseProductsByQuery(products, query);

    expect(result.meta.pageSize).toBe(1);
    expect(result.meta.total).toBeGreaterThan(0);
    expect(result.items[0]?.status).toBe("published");
  });

  it("summarizes status and entitlement counts", () => {
    const [first, second] = courses.slice(0, 2).map(courseProductFromCourse);
    const summary = summarizeCourseProducts([
      { ...first, status: "unpublished" },
      { ...second, price: { ...second.price, isFree: true } },
    ]);

    expect(summary.totalCount).toBe(2);
    expect(summary.publishedCount).toBe(1);
    expect(summary.unpublishedCount).toBe(1);
    expect(summary.freeCount).toBeGreaterThanOrEqual(1);
  });

  it("updates status and writes an audit event", async () => {
    const store = new InMemoryCourseProductStore([
      courseProductFromCourse(courses[0]),
    ]);
    const product = courseProductFromCourse(courses[0]);

    const result = await updateCourseProductStatus({
      productId: product.id,
      request: {
        status: "unpublished",
        reason: "本周活动结束下架",
      },
      actorId: "operator_1",
      store,
      now: "2026-05-11T10:00:00.000Z",
    });

    expect(result.product.status).toBe("unpublished");
    expect(result.auditEvent).toMatchObject({
      productId: product.id,
      actorId: "operator_1",
      action: "status_update",
    });
    expect((await store.listAuditEvents(product.id))[0]?.reason).toBe(
      "本周活动结束下架"
    );
  });

  it("updates price and keeps the operation auditable", async () => {
    const store = new InMemoryCourseProductStore([
      courseProductFromCourse(courses[0]),
    ]);
    const product = courseProductFromCourse(courses[0]);

    const result = await updateCourseProductPrice({
      productId: product.id,
      request: {
        amount: 99,
        originalAmount: 199,
        isFree: false,
        memberIncluded: true,
        reason: "专题活动价格调整",
      },
      actorId: "operator_1",
      store,
      now: "2026-05-11T10:10:00.000Z",
    });

    expect(result.product.price).toMatchObject({
      amount: 99,
      originalAmount: 199,
      memberIncluded: true,
    });
    expect(result.auditEvent.action).toBe("price_update");
  });

  it("updates basic information and keeps the operation auditable", async () => {
    const store = new InMemoryCourseProductStore([
      courseProductFromCourse(courses[0]),
    ]);
    const product = courseProductFromCourse(courses[0]);

    const result = await updateCourseProductBasicInfo({
      productId: product.id,
      request: {
        title: "婚姻关系沟通训练",
        coverUrl: product.coverUrl,
        category: "婚姻关系",
        type: "直播",
        instructorName: "林若安",
        learners: 1888,
        reason: "运营校对课程基础信息",
      },
      actorId: "operator_1",
      store,
      now: "2026-05-11T10:20:00.000Z",
    });

    expect(result.product).toMatchObject({
      title: "婚姻关系沟通训练",
      category: "婚姻关系",
      type: "直播",
      learners: 1888,
    });
    expect(result.auditEvent).toMatchObject({
      action: "info_update",
      productTitle: "婚姻关系沟通训练",
    });
  });

  it("persists products and audit events in the JSON store", async () => {
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "hongboshi-products-")
    );
    const filePath = path.join(tempDir, "course-products.json");

    try {
      const product = courseProductFromCourse(courses[0]);
      const store = new JsonFileCourseProductStore(filePath);
      await updateCourseProductStatus({
        productId: product.id,
        request: {
          status: "unpublished",
          reason: "重启恢复状态",
        },
        actorId: "operator_1",
        store,
        now: "2026-05-11T11:00:00.000Z",
      });

      const reloaded = new JsonFileCourseProductStore(filePath);

      expect((await reloaded.getProduct(product.id))?.status).toBe(
        "unpublished"
      );
      expect((await reloaded.listAuditEvents(product.id))[0]).toMatchObject({
        reason: "重启恢复状态",
        action: "status_update",
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
