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
    expect(profile.richTextBlocks).toEqual([]);
  });

  it("lets admin-managed merchandising content override the default sales copy", () => {
    const detail = buildCourseDetail(courses[0]);
    const learningPath = getLearningPathForCourse(detail);

    const profile = createCourseMerchandisingProfile({
      course: detail,
      learningPath,
      merchandising: {
        headline: "后台维护的课程成交标题",
        subheadline: "后台维护的课程副标题，用来说明适合状态和购买价值。",
        showcaseImageUrl: "https://example.com/showcase.jpg",
        showcaseImageAlt: "后台维护的课程主视觉",
        sellingPoints: ["后台卖点一", "后台卖点二"],
        imageAssets: [
          {
            id: "asset_proof_1",
            title: "练习卡片示例",
            imageUrl: "https://example.com/proof.jpg",
            usage: "proof",
            complianceStatus: "approved",
            altText: "课程练习卡片预览",
          },
          {
            id: "asset_pending_1",
            title: "待审核素材",
            imageUrl: "https://example.com/pending.jpg",
            usage: "gallery",
            complianceStatus: "pending",
          },
        ],
        richTextBlocks: [
          {
            id: "h5_heading_1",
            type: "section_heading",
            title: "后台维护的 H5 标题",
            items: [],
          },
          {
            id: "h5_paragraph_1",
            type: "paragraph",
            body: "后台维护的图文详情正文。",
            items: [],
          },
          {
            id: "h5_image_1",
            type: "image",
            title: "后台维护的图文图片",
            imageUrl: "https://example.com/h5.jpg",
            altText: "图文详情图片",
            items: [],
          },
        ],
      },
      totalDuration: 136,
      totalLessons: 13,
    });

    expect(profile).toMatchObject({
      promise: "后台维护的课程成交标题",
      buyerQuestion: "后台维护的课程副标题，用来说明适合状态和购买价值。",
      showcaseImageUrl: "https://example.com/showcase.jpg",
      showcaseImageAlt: "后台维护的课程主视觉",
      sellingPoints: ["后台卖点一", "后台卖点二"],
    });
    expect(profile.visualAssets).toEqual([
      {
        id: "asset_proof_1",
        title: "练习卡片示例",
        imageUrl: "https://example.com/proof.jpg",
        usage: "proof",
        altText: "课程练习卡片预览",
      },
      {
        id: "asset_pending_1",
        title: "待审核素材",
        imageUrl: "https://example.com/pending.jpg",
        usage: "gallery",
        altText: "待审核素材",
      },
    ]);
    expect(profile.richTextBlocks.map(block => block.id)).toEqual([
      "h5_heading_1",
      "h5_paragraph_1",
      "h5_image_1",
    ]);
  });

  it("uses category-specific visual assets before falling back to cover art", () => {
    const imageUrl = getCourseMerchandisingImage(courses[0]);

    expect(imageUrl).toContain("images.unsplash.com");
    expect(imageUrl).not.toBe(courses[0].coverUrl);
  });
});
