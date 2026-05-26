import { describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { courses } from "../../../shared/data/mockCourses";
import {
  InMemoryCourseProductStore,
  courseProductFromCourse,
} from "./courseProductStore";
import {
  InMemoryCourseProductContentStore,
  JsonFileCourseProductContentStore,
  buildDefaultCourseProductContent,
  getCourseProductContentForProduct,
  listCourseProductContentQuality,
  updateCourseProductContent,
} from "./courseProductContentStore";

describe("course product content store", () => {
  it("builds default detail content from a course product", () => {
    const product = courseProductFromCourse(courses[0]);
    const content = buildDefaultCourseProductContent(product);

    expect(content.productId).toBe(product.id);
    expect(content.summary).toContain(product.title);
    expect(content.summaryRichText.blocks[0]?.text).toContain(product.title);
    expect(content.merchandising.showcaseImageUrl).toBe(product.coverUrl);
    expect(content.merchandising.sellingPoints.length).toBeGreaterThan(1);
    expect(content.merchandising.richTextBlocks).toHaveLength(3);
    expect(content.chapters).toHaveLength(3);
  });

  it("returns default content when no custom content is saved", async () => {
    const product = courseProductFromCourse(courses[0]);
    const productStore = new InMemoryCourseProductStore([product]);
    const contentStore = new InMemoryCourseProductContentStore();

    const content = await getCourseProductContentForProduct({
      productId: product.id,
      productStore,
      contentStore,
    });

    expect(content.productId).toBe(product.id);
    expect(content.targetAudience.length).toBeGreaterThan(0);
  });

  it("updates content, writes audit and resets review status", async () => {
    const product = courseProductFromCourse(courses[0]);
    const productStore = new InMemoryCourseProductStore([product]);
    const contentStore = new InMemoryCourseProductContentStore();

    const result = await updateCourseProductContent({
      productId: product.id,
      request: {
        summary: "适合希望系统学习情绪识别、调节和沟通表达的用户。",
        summaryRichText: {
          blocks: [
            {
              id: "summary_block_1",
              type: "paragraph",
              text: "适合希望系统学习情绪识别、调节和沟通表达的用户。",
              emphasis: true,
            },
            {
              id: "summary_block_2",
              type: "bullet",
              text: "先看清触发点，再进入练习。",
              emphasis: false,
            },
          ],
        },
        targetAudience: ["希望提升情绪调节能力的学习者"],
        merchandising: {
          headline: "情绪调节成交主视觉",
          subheadline: "用更清晰的图文介绍帮助用户理解课程适合什么状态。",
          showcaseImageUrl: "https://example.com/emotion-showcase.jpg",
          sellingPoints: ["先识别情绪触发点", "再完成一组课后练习"],
          imageAssets: [
            {
              id: "sales_asset_1",
              title: "课程主视觉",
              imageUrl: "https://example.com/emotion-showcase.jpg",
              usage: "showcase",
              complianceStatus: "approved",
            },
          ],
        },
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
        reason: "课程详情内容完成校对",
        sourceTemplate: {
          id: "warm_course",
          name: "温暖课程型",
          source: "quick_template",
          appliedAt: "2026-05-11T11:10:00.000Z",
        },
      },
      actorId: "operator_1",
      productStore,
      contentStore,
      now: "2026-05-11T11:20:00.000Z",
    });

    expect(result.content.chapters).toHaveLength(1);
    expect(result.content.summaryRichText.blocks).toHaveLength(2);
    expect(result.product).toMatchObject({
      status: "unpublished",
      reviewStatus: "not_submitted",
    });
    expect(result.auditEvent.action).toBe("content_update");
    expect(result.auditEvent.after.sourceTemplate).toMatchObject({
      id: "warm_course",
      source: "quick_template",
    });
  });

  it("evaluates content quality for all course products", async () => {
    const product = courseProductFromCourse(courses[0]);
    const productStore = new InMemoryCourseProductStore([product]);
    const contentStore = new InMemoryCourseProductContentStore([
      {
        productId: product.id,
        summary: "这是一段达到契约最低长度但还不足以支撑审核判断的摘要。",
        targetAudience: ["学习者"],
        merchandising: {
          sellingPoints: [],
          imageAssets: [],
        },
        chapters: [
          {
            id: "chapter_1",
            title: "短章",
            durationMinutes: 5,
            materialPlaceholders: [],
          },
        ],
        updatedAt: "2026-05-12T09:00:00.000Z",
      },
    ]);

    const result = await listCourseProductContentQuality({
      productStore,
      contentStore,
    });

    expect(result.summary).toMatchObject({
      totalCount: 1,
      readyCount: 0,
      blockedCount: 1,
    });
    expect(result.items[0]?.quality.ready).toBe(false);
  });

  it("persists content in the JSON store", async () => {
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "hongboshi-content-")
    );
    const filePath = path.join(tempDir, "course-product-content.json");

    try {
      const product = courseProductFromCourse(courses[0]);
      const store = new JsonFileCourseProductContentStore(filePath);
      await store.saveContent(
        buildDefaultCourseProductContent(product, "2026-05-11T11:30:00.000Z")
      );

      const reloaded = new JsonFileCourseProductContentStore(filePath);

      expect((await reloaded.getContent(product.id))?.chapters).toHaveLength(3);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
