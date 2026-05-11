import { describe, expect, it } from "vitest";
import { CourseProductListQuerySchema } from "../../../shared/domain";
import { courses } from "../../../shared/data/mockCourses";
import {
  courseProductFromCourse,
  listCourseProductsByQuery,
  summarizeCourseProducts,
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
});
