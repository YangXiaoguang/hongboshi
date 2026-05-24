import { describe, expect, it } from "vitest";
import {
  applyDetailContentTemplate,
  createDefaultContentWorkbenchForm,
  detailBlockStyleDefaults,
  h5BlockFormsForSave,
} from "./courseProductDetailDesigner";

describe("course product detail designer", () => {
  it("applies an image-led template with controlled block styles", () => {
    const form = createDefaultContentWorkbenchForm("https://example.com/a.jpg");
    const updated = applyDetailContentTemplate(
      {
        ...form,
        imageAssets: [
          {
            id: "asset_1",
            title: "课程主视觉",
            imageUrl: "https://example.com/showcase.jpg",
            altText: "课程主视觉说明",
            usage: "showcase",
            complianceStatus: "approved",
            note: "",
            style: detailBlockStyleDefaults,
          },
          {
            id: "asset_2",
            title: "学习反馈图",
            imageUrl: "https://example.com/proof.jpg",
            altText: "学习反馈说明",
            usage: "proof",
            complianceStatus: "approved",
            note: "",
            style: detailBlockStyleDefaults,
          },
        ],
      },
      {
        title: "情绪管理入门",
        instructorName: "李静博士",
        category: "情绪管理",
        type: "录播",
      },
      "image_story"
    );

    expect(updated.headline).toContain("情绪管理入门");
    expect(updated.imageAssets[0]?.style.captionMode).toBe("overlay");
    expect(updated.imageAssets[1]?.style.imageAspectRatio).toBe("long");
    expect(updated.richTextBlocks.map(block => block.type)).toEqual([
      "section_heading",
      "image",
      "paragraph",
      "image",
      "bullet_list",
      "purchase_note",
    ]);
    expect(updated.richTextBlocks[1]?.imageUrl).toBe(
      "https://example.com/showcase.jpg"
    );
    expect(h5BlockFormsForSave(updated, false)).toHaveLength(6);
  });
});
