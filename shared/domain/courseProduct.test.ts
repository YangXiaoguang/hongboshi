import { describe, expect, it } from "vitest";
import {
  ALL_COURSE_PRODUCT_CATEGORY,
  ALL_COURSE_PRODUCT_STATUS,
  CourseProductPriceUpdateRequestSchema,
  CourseProductBasicInfoUpdateRequestSchema,
  CourseProductDetailContentSchema,
  CourseProductListQuerySchema,
  CourseProductListResultSchema,
  CourseProductReviewActionRequestSchema,
} from "./courseProduct";

describe("course product domain contract", () => {
  it("normalizes course product list query defaults", () => {
    expect(CourseProductListQuerySchema.parse({})).toMatchObject({
      keyword: "",
      category: ALL_COURSE_PRODUCT_CATEGORY,
      status: ALL_COURSE_PRODUCT_STATUS,
      sort: "updated_desc",
      page: 1,
      pageSize: 10,
    });
  });

  it("validates a paginated course product admin list", () => {
    const parsed = CourseProductListResultSchema.parse({
      items: [
        {
          id: "course_product_1",
          courseId: 1,
          title: "情绪管理入门",
          coverUrl:
            "https://images.unsplash.com/photo-1499209974431-9dddcece7f88",
          category: "情绪管理",
          type: "录播",
          instructorName: "林若安",
          learners: 1200,
          price: {
            amount: 199,
            originalAmount: 299,
            isFree: false,
            memberIncluded: true,
          },
          status: "published",
          reviewStatus: "approved",
          source: "seed",
          createdAt: "2026-05-10T09:00:00+08:00",
          updatedAt: "2026-05-10T18:00:00+08:00",
          publishedAt: "2026-05-10T09:00:00+08:00",
        },
      ],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
      summary: {
        totalCount: 1,
        publishedCount: 1,
        unpublishedCount: 0,
        draftCount: 0,
        archivedCount: 0,
        freeCount: 0,
        memberIncludedCount: 1,
      },
      filters: {
        categories: ["情绪管理"],
        types: ["录播"],
        statuses: ["published"],
      },
      auditEvents: [],
      query: {},
    });

    expect(parsed.query.category).toBe(ALL_COURSE_PRODUCT_CATEGORY);
    expect(parsed.items[0]?.price.currency).toBe("CNY");
  });

  it("rejects invalid price update requests", () => {
    expect(
      CourseProductPriceUpdateRequestSchema.safeParse({
        amount: 99,
        originalAmount: 199,
        isFree: true,
        reason: "免费活动调整",
      }).success
    ).toBe(false);

    expect(
      CourseProductPriceUpdateRequestSchema.safeParse({
        amount: 199,
        originalAmount: 99,
        isFree: false,
        reason: "活动价格调整",
      }).success
    ).toBe(false);
  });

  it("validates basic information update requests", () => {
    const parsed = CourseProductBasicInfoUpdateRequestSchema.parse({
      title: "婚姻关系沟通课",
      coverUrl: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88",
      category: "婚姻关系",
      type: "直播",
      instructorName: "林若安",
      learners: 1800,
      reason: "课程基础信息校对完成",
    });

    expect(parsed.title).toBe("婚姻关系沟通课");
    expect(
      CourseProductBasicInfoUpdateRequestSchema.safeParse({
        ...parsed,
        reason: "短",
      }).success
    ).toBe(false);
  });

  it("validates review action requests", () => {
    expect(
      CourseProductReviewActionRequestSchema.parse({
        action: "submit",
        reason: "课程内容和定价信息已完成自检",
      }).action
    ).toBe("submit");

    expect(
      CourseProductReviewActionRequestSchema.safeParse({
        action: "reject",
        reason: "短",
      }).success
    ).toBe(false);
  });

  it("validates the first course detail content contract", () => {
    const parsed = CourseProductDetailContentSchema.parse({
      productId: "course_product_1",
      summary: "适合希望系统学习情绪识别、调节和沟通表达的用户。",
      targetAudience: [
        "希望提升情绪调节能力的学习者",
        "需要关系沟通练习的用户",
      ],
      chapters: [
        {
          id: "chapter_1",
          title: "认识情绪反应",
          durationMinutes: 36,
          materialPlaceholders: [
            {
              id: "material_1",
              title: "课前练习表",
              type: "exercise",
            },
          ],
        },
      ],
      updatedAt: "2026-05-11T10:40:00+08:00",
    });

    expect(parsed.chapters[0]?.materialPlaceholders[0]?.status).toBe("pending");
    expect(
      CourseProductDetailContentSchema.safeParse({
        ...parsed,
        chapters: [],
      }).success
    ).toBe(false);
  });
});
