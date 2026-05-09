import { describe, expect, it } from "vitest";
import type { Course } from "@shared/domain";
import {
  ALL_COURSE_CATEGORY,
  ALL_COURSE_TYPE,
  COURSE_PAGE_SIZE,
  filterCourses,
  getPageNumbers,
  getRecommendedCourses,
  listCoursesByQuery,
  searchCourses,
} from "./courseCatalog";

const fixtureCourses: Course[] = [
  {
    id: 1,
    title: "情绪管理入门",
    coverUrl: "https://example.com/emotion.jpg",
    category: "情绪管理",
    type: "录播",
    teacher: "李老师",
    learners: 3000,
    price: 199,
    originalPrice: 399,
    isFree: false,
    isVip: true,
    createdAt: "2026-03-01",
  },
  {
    id: 2,
    title: "正念睡眠练习",
    coverUrl: "https://example.com/mindfulness.jpg",
    category: "正念冥想",
    type: "直播",
    teacher: "王老师",
    learners: 9000,
    price: 0,
    originalPrice: 0,
    isFree: true,
    isVip: false,
    createdAt: "2026-02-01",
  },
  {
    id: 3,
    title: "关系沟通工作坊",
    coverUrl: "https://example.com/relation.jpg",
    category: "婚姻关系",
    type: "专栏",
    teacher: "刘老师",
    learners: 1200,
    price: 299,
    originalPrice: 599,
    isFree: false,
    isVip: true,
    createdAt: "2026-01-01",
  },
];

const baseQuery = {
  category: ALL_COURSE_CATEGORY,
  type: ALL_COURSE_TYPE,
  sort: "comprehensive" as const,
  keyword: "",
  vipOnly: false,
  page: 1,
  pageSize: COURSE_PAGE_SIZE,
};

describe("course catalog model", () => {
  it("filters courses by category, type, vip and keyword", () => {
    expect(
      filterCourses(fixtureCourses, {
        ...baseQuery,
        category: "情绪管理",
        type: "录播",
        vipOnly: true,
        keyword: "入门",
      }).map((course) => course.id)
    ).toEqual([1]);
  });

  it("sorts courses by newest, hottest and price", () => {
    expect(
      filterCourses(fixtureCourses, { ...baseQuery, sort: "newest" }).map(
        (course) => course.id
      )
    ).toEqual([1, 2, 3]);

    expect(
      filterCourses(fixtureCourses, { ...baseQuery, sort: "hottest" }).map(
        (course) => course.id
      )
    ).toEqual([2, 1, 3]);

    expect(
      filterCourses(fixtureCourses, { ...baseQuery, sort: "price" }).map(
        (course) => course.id
      )
    ).toEqual([2, 1, 3]);
  });

  it("paginates after filtering", () => {
    const result = listCoursesByQuery(fixtureCourses, {
      ...baseQuery,
      page: 2,
      pageSize: 2,
    });

    expect(result.totalCount).toBe(3);
    expect(result.totalPages).toBe(2);
    expect(result.page).toBe(2);
    expect(result.paginatedItems.map((course) => course.id)).toEqual([3]);
  });

  it("searches against title, teacher and category", () => {
    expect(searchCourses(fixtureCourses, "王老师").map((course) => course.id)).toEqual([
      2,
    ]);
    expect(searchCourses(fixtureCourses, "婚姻").map((course) => course.id)).toEqual([
      3,
    ]);
  });

  it("returns recommendations by category with fallback", () => {
    expect(
      getRecommendedCourses(fixtureCourses, "婚姻关系").map((course) => course.id)
    ).toEqual([3]);

    expect(
      getRecommendedCourses(fixtureCourses, "心理咨询师", 2).map((course) => course.id)
    ).toEqual([1, 2]);
  });

  it("builds compact page number ranges", () => {
    expect(getPageNumbers(4, 1)).toEqual([1, 2, 3, 4]);
    expect(getPageNumbers(10, 5)).toEqual([1, "...", 4, 5, 6, "...", 10]);
  });
});
