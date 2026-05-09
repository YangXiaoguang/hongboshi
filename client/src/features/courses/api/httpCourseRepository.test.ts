import { describe, expect, it } from "vitest";
import {
  parseCourseListResponse,
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
    expect(parseCourseListResponse({ ok: true, data: [course] })).toEqual([course]);
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
});
