import { describe, expect, it } from "vitest";
import type {
  CourseProductContentQualityResult,
  CourseProductListItem,
} from "@shared/domain";
import {
  buildCourseProductPublishQueue,
  courseProductPublishQueueGroupForItem,
} from "./courseProductPublishQueueModel";

function product(
  id: string,
  overrides: Partial<CourseProductListItem> = {}
): CourseProductListItem {
  return {
    id,
    courseId: Number(id.replace(/\D/g, "")) || 1,
    title: `课程商品 ${id}`,
    coverUrl: "https://example.com/course.jpg",
    category: "情绪管理",
    type: "录播",
    instructorName: "李静博士",
    learners: 100,
    price: {
      currency: "CNY",
      amount: 199,
      originalAmount: 399,
      isFree: false,
      memberIncluded: false,
    },
    status: "unpublished",
    reviewStatus: "not_submitted",
    source: "manual",
    createdAt: "2026-05-20T10:00:00.000Z",
    updatedAt: "2026-05-21T10:00:00.000Z",
    ...overrides,
  };
}

function quality(
  overrides: Partial<CourseProductContentQualityResult> = {}
): CourseProductContentQualityResult {
  return {
    ready: true,
    issueCount: 0,
    blockingCount: 0,
    warningCount: 0,
    issues: [],
    ...overrides,
  };
}

describe("course product publish queue model", () => {
  it("groups products by content quality, review status, and publish state", () => {
    const blocked = product("course_product_1");
    const ready = product("course_product_2");
    const pending = product("course_product_3", {
      reviewStatus: "pending",
    });
    const approvedUnpublished = product("course_product_4", {
      reviewStatus: "approved",
      status: "unpublished",
    });
    const publishedWithWarning = product("course_product_5", {
      reviewStatus: "approved",
      status: "published",
    });
    const archived = product("course_product_6", {
      status: "archived",
      reviewStatus: "approved",
    });

    expect(
      courseProductPublishQueueGroupForItem(
        blocked,
        quality({
          ready: false,
          issueCount: 1,
          blockingCount: 1,
          issues: [
            {
              code: "summary_too_short",
              severity: "blocking",
              message: "课程摘要需要至少 40 个字。",
              path: "summary",
            },
          ],
        })
      )
    ).toBe("content_blocked");

    const queue = buildCourseProductPublishQueue({
      items: [
        blocked,
        ready,
        pending,
        approvedUnpublished,
        publishedWithWarning,
        archived,
      ],
      contentQualityByProductId: {
        [blocked.id]: quality({
          ready: false,
          issueCount: 1,
          blockingCount: 1,
          issues: [
            {
              code: "summary_too_short",
              severity: "blocking",
              message: "课程摘要需要至少 40 个字。",
              path: "summary",
            },
          ],
        }),
        [ready.id]: quality(),
        [pending.id]: quality(),
        [approvedUnpublished.id]: quality(),
        [publishedWithWarning.id]: quality({
          issueCount: 1,
          warningCount: 1,
          issues: [
            {
              code: "rich_text_blocks_missing",
              severity: "warning",
              message: "课程详情建议至少配置 3 个 H5 内容块。",
              path: "merchandising.richTextBlocks",
            },
          ],
        }),
        [archived.id]: quality(),
      },
    });

    expect(queue.totalInScope).toBe(5);
    expect(queue.archivedCount).toBe(1);
    expect(
      Object.fromEntries(
        queue.groups.map(group => [group.id, group.items.length])
      )
    ).toEqual({
      content_blocked: 1,
      ready_to_submit: 1,
      pending_review: 1,
      approved_unpublished: 1,
      published_watch: 1,
    });
  });

  it("keeps batch operation plans preview-only and non-executable", () => {
    const queue = buildCourseProductPublishQueue({
      items: [
        product("course_product_1"),
        product("course_product_2", {
          reviewStatus: "approved",
          status: "unpublished",
        }),
      ],
      contentQualityByProductId: {
        course_product_1: quality(),
        course_product_2: quality(),
      },
    });

    expect(queue.batchPlan.previewOnly).toBe(true);
    expect(queue.batchPlan.executable).toBe(false);
    expect(queue.batchPlan.totalCandidates).toBe(2);
    expect(
      queue.batchPlan.actions.map(action => [
        action.id,
        action.candidateCount,
        action.risk,
      ])
    ).toEqual([
      ["submit_review", 1, "medium"],
      ["review_followup", 0, "medium"],
      ["publish", 1, "high"],
      ["quality_recheck", 0, "low"],
    ]);
  });
});
