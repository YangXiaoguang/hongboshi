import { describe, expect, it } from "vitest";
import { CourseDetailSchema, type Course } from "@shared/domain";
import { buildCourseDetail, getRelatedCourses } from "./courseDetail";

const courses: Course[] = [
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
    title: "情绪急救手册",
    coverUrl: "https://example.com/emotion-aid.jpg",
    category: "情绪管理",
    type: "专栏",
    teacher: "赵老师",
    learners: 2200,
    price: 99,
    originalPrice: 199,
    isFree: false,
    isVip: false,
    createdAt: "2026-02-01",
  },
  {
    id: 3,
    title: "职场压力管理",
    coverUrl: "https://example.com/workplace.jpg",
    category: "职场心理",
    type: "直播",
    teacher: "陈老师",
    learners: 5800,
    price: 299,
    originalPrice: 499,
    isFree: false,
    isVip: true,
    createdAt: "2026-01-01",
  },
];

describe("course detail model", () => {
  it("builds a valid course detail contract from a course", () => {
    const detail = buildCourseDetail(courses[0]);

    expect(CourseDetailSchema.safeParse(detail).success).toBe(true);
    expect(detail.subtitle).toContain("情绪");
    expect(detail.suitableFor).toHaveLength(3);
    expect(detail.chapters).toHaveLength(3);
  });

  it("prefers same-category related courses and excludes the current course", () => {
    expect(getRelatedCourses(courses, courses[0]).map((course) => course.id)).toEqual([
      2,
    ]);
  });

  it("falls back to other courses when no same-category course exists", () => {
    expect(getRelatedCourses(courses, courses[2], 2).map((course) => course.id)).toEqual([
      1,
      2,
    ]);
  });
});
