import { describe, expect, it } from "vitest";
import { CourseProductListQuerySchema } from "../../../shared/domain";
import { courses } from "../../../shared/data/mockCourses";
import {
  InMemoryCourseProductStore,
  courseProductFromCourse,
  listCourseProductsByQuery,
  summarizeCourseProducts,
  updateCourseProductPrice,
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
});
