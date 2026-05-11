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
  updateCourseProductContent,
} from "./courseProductContentStore";

describe("course product content store", () => {
  it("builds default detail content from a course product", () => {
    const product = courseProductFromCourse(courses[0]);
    const content = buildDefaultCourseProductContent(product);

    expect(content.productId).toBe(product.id);
    expect(content.summary).toContain(product.title);
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
        targetAudience: ["希望提升情绪调节能力的学习者"],
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
      },
      actorId: "operator_1",
      productStore,
      contentStore,
      now: "2026-05-11T11:20:00.000Z",
    });

    expect(result.content.chapters).toHaveLength(1);
    expect(result.product).toMatchObject({
      status: "unpublished",
      reviewStatus: "not_submitted",
    });
    expect(result.auditEvent.action).toBe("content_update");
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
