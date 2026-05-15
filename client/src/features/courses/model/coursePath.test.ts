import { describe, expect, it } from "vitest";
import type { Course } from "@shared/domain";
import {
  courseLearningPaths,
  getCourseLearningPath,
  getLearningPathForCourse,
  getCoursesForLearningPath,
  getNextCoursesInLearningPath,
} from "./coursePath";

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
    id: 5,
    title: "职场压力管理",
    coverUrl: "https://example.com/workplace.jpg",
    category: "职场心理",
    type: "直播",
    teacher: "陈老师",
    learners: 12000,
    price: 599,
    originalPrice: 899,
    isFree: false,
    isVip: false,
    createdAt: "2026-01-01",
  },
  {
    id: 6,
    title: "亲密关系心理学",
    coverUrl: "https://example.com/relation.jpg",
    category: "婚姻关系",
    type: "录播",
    teacher: "刘老师",
    learners: 6000,
    price: 299,
    originalPrice: 599,
    isFree: false,
    isVip: true,
    createdAt: "2026-01-02",
  },
];

describe("course learning paths", () => {
  it("provides stable path ids for user-facing recommendations", () => {
    expect(courseLearningPaths.map(path => path.id)).toEqual([
      "emotion-reset",
      "relationship-repair",
      "family-connection",
      "workplace-resilience",
      "self-growth",
    ]);
  });

  it("falls back to the default path for unknown ids", () => {
    expect(getCourseLearningPath("missing").id).toBe("emotion-reset");
  });

  it("prioritizes curated course ids, then related categories and hot fallback", () => {
    expect(
      getCoursesForLearningPath(fixtureCourses, "emotion-reset", 3).map(
        course => course.id
      )
    ).toEqual([1, 2, 5]);

    expect(
      getCoursesForLearningPath(fixtureCourses, "relationship-repair", 2).map(
        course => course.id
      )
    ).toEqual([6, 5]);
  });

  it("finds the user-facing path for a course and returns next path courses", () => {
    expect(getLearningPathForCourse(fixtureCourses[0]).id).toBe(
      "emotion-reset"
    );
    expect(
      getNextCoursesInLearningPath(fixtureCourses, fixtureCourses[0], 2).map(
        course => course.id
      )
    ).toEqual([2, 5]);
  });
});
