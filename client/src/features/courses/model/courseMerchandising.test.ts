import { describe, expect, it } from "vitest";
import { courses } from "@shared/data/mockCourses";
import { buildCourseDetail } from "./courseDetail";
import { getLearningPathForCourse } from "./coursePath";
import {
  createCourseMerchandisingProfile,
  getCourseMerchandisingImage,
  selectFeaturedCourseProducts,
} from "./courseMerchandising";

describe("courseMerchandising", () => {
  it("prioritizes purchasable, high-intent course products for shelves", () => {
    const featured = selectFeaturedCourseProducts(courses, 3);

    expect(featured).toHaveLength(3);
    expect(featured.every(course => course.price > 0)).toBe(true);
    expect(featured[0].learners).toBeGreaterThan(9000);
  });

  it("builds a course detail merchandising profile from course content", () => {
    const detail = buildCourseDetail(courses[0]);
    const learningPath = getLearningPathForCourse(detail);
    const totalDuration = detail.chapters.reduce(
      (sum, chapter) => sum + chapter.durationMinutes,
      0
    );
    const totalLessons = detail.chapters.reduce(
      (sum, chapter) => sum + chapter.lessonCount,
      0
    );

    const profile = createCourseMerchandisingProfile({
      course: detail,
      learningPath,
      totalDuration,
      totalLessons,
    });

    expect(profile.promise).toContain("情绪");
    expect(profile.buyerQuestion).toContain(detail.suitableFor[0].title);
    expect(profile.proofPoints.map(item => item.label)).toContain("内容规模");
    expect(profile.sellingPoints).toEqual(detail.outcomes.slice(0, 4));
  });

  it("uses category-specific visual assets before falling back to cover art", () => {
    const imageUrl = getCourseMerchandisingImage(courses[0]);

    expect(imageUrl).toContain("images.unsplash.com");
    expect(imageUrl).not.toBe(courses[0].coverUrl);
  });
});
