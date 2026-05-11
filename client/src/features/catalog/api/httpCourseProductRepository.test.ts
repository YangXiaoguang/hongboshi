import { describe, expect, it } from "vitest";
import {
  parseCourseProductListResponse,
  parseCourseProductMutationResponse,
} from "./httpCourseProductRepository";

describe("http course product repository parsing", () => {
  it("parses course product list responses", () => {
    const parsed = parseCourseProductListResponse({
      ok: true,
      data: {
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
      },
    });

    expect(parsed.items[0]?.status).toBe("published");
    expect(parsed.query.pageSize).toBe(10);
  });

  it("throws with API error messages", () => {
    expect(() =>
      parseCourseProductListResponse({
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "当前账号暂无课程商品管理权限",
        },
      })
    ).toThrow("当前账号暂无课程商品管理权限");
  });

  it("parses course product mutation responses", () => {
    const parsed = parseCourseProductMutationResponse({
      ok: true,
      data: {
        product: {
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
            amount: 99,
            originalAmount: 199,
            isFree: false,
            memberIncluded: true,
          },
          status: "published",
          reviewStatus: "approved",
          source: "seed",
          createdAt: "2026-05-10T09:00:00+08:00",
          updatedAt: "2026-05-11T10:00:00+08:00",
          publishedAt: "2026-05-10T09:00:00+08:00",
        },
        auditEvent: {
          id: "audit_price_course_product_1",
          productId: "course_product_1",
          productTitle: "情绪管理入门",
          actorId: "operator_1",
          action: "price_update",
          reason: "专题活动价格调整",
          before: {
            price: {
              amount: 199,
            },
          },
          after: {
            price: {
              amount: 99,
            },
          },
          createdAt: "2026-05-11T10:00:00+08:00",
        },
        auditEvents: [],
      },
    });

    expect(parsed.product.price.amount).toBe(99);
    expect(parsed.auditEvent.action).toBe("price_update");
  });
});
