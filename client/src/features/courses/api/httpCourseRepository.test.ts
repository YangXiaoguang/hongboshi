import { describe, expect, it } from "vitest";
import {
  parseCourseListResponse,
  parseCourseProductContentResponse,
  parseCourseResponse,
} from "./httpCourseRepository";

const course = {
  id: 1,
  title: "情绪管理入门",
  coverUrl: "https://example.com/course.jpg",
  category: "情绪管理",
  type: "录播",
  teacher: "李静博士",
  learners: 1200,
  price: 199,
  originalPrice: 399,
  isFree: false,
  isVip: true,
  createdAt: "2026-03-01",
};

describe("http course repository parsing", () => {
  it("parses a successful course list response", () => {
    expect(
      parseCourseListResponse({
        ok: true,
        data: {
          items: [course],
          paginatedItems: [course],
          totalCount: 1,
          totalPages: 1,
          page: 1,
          pageSize: 12,
        },
      })
    ).toMatchObject({
      items: [course],
      totalCount: 1,
      totalPages: 1,
    });
  });

  it("parses a successful single course response", () => {
    expect(parseCourseResponse({ ok: true, data: course })).toEqual(course);
  });

  it("returns undefined for not found course response", () => {
    expect(
      parseCourseResponse({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "课程不存在",
        },
      })
    ).toBeUndefined();
  });

  it("parses course product detail content responses", () => {
    const content = parseCourseProductContentResponse({
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
    });

    expect(content?.chapters[0]?.title).toBe("认识情绪反应");
  });
});
