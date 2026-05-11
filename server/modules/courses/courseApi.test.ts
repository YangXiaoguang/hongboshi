import { describe, expect, it } from "vitest";
import { courses } from "../../../shared/data/mockCourses";
import {
  InMemoryCourseProductStore,
  courseProductFromCourse,
} from "../catalog/courseProductStore";
import { getCoursePayload, listCoursesPayload } from "./courseApi";

describe("course API payloads", () => {
  it("filters and paginates course list payloads", async () => {
    const payload = await listCoursesPayload({
      category: "情绪管理",
      type: "全部",
      sort: "hottest",
      keyword: "",
      vipOnly: false,
      page: 1,
      pageSize: 1,
    });

    expect(payload.ok).toBe(true);
    if (!payload.ok) return;

    expect(payload.data.totalCount).toBeGreaterThan(1);
    expect(payload.data.paginatedItems).toHaveLength(1);
    expect(payload.data.paginatedItems[0].category).toBe("情绪管理");
  });

  it("uses published course products as the public course source", async () => {
    const [first, second] = courses.slice(0, 2).map(courseProductFromCourse);
    const store = new InMemoryCourseProductStore([
      {
        ...first,
        price: {
          ...first.price,
          amount: 88,
          originalAmount: 188,
        },
      },
      { ...second, status: "unpublished" },
      {
        ...second,
        id: "course_product_pending",
        status: "published",
        reviewStatus: "pending",
      },
    ]);

    const listPayload = await listCoursesPayload(
      {
        category: "全部",
        type: "全部",
        sort: "comprehensive",
        keyword: "",
        vipOnly: false,
        page: 1,
        pageSize: 100,
      },
      store
    );
    const detailPayload = await getCoursePayload(first.courseId, store);
    const hiddenDetailPayload = await getCoursePayload(second.courseId, store);

    expect(listPayload.ok).toBe(true);
    if (listPayload.ok) {
      expect(listPayload.data.items.map(course => course.id)).toEqual([
        first.courseId,
      ]);
      expect(listPayload.data.items[0]?.price).toBe(88);
    }

    expect(detailPayload.body.ok).toBe(true);
    if (detailPayload.body.ok) {
      expect(detailPayload.body.data.price).toBe(88);
    }
    expect(hiddenDetailPayload.status).toBe(404);
  });
});
