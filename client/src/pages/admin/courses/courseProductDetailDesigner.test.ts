import { describe, expect, it } from "vitest";
import {
  applyCourseProductDetailTemplateToForm,
  applyDetailContentTemplate,
  applyDetailDesignerSavedTemplate,
  cloneH5BlockForm,
  createCourseProductDetailTemplateContent,
  createDetailDesignerSavedTemplate,
  createDefaultContentWorkbenchForm,
  createH5BlockForm,
  detailBlockStyleDefaults,
  h5BlockFormsForSave,
  insertH5BlockAfter,
  moveH5BlockForm,
  parseDetailDesignerSavedTemplates,
  removeH5BlockForm,
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

  it("moves, duplicates, inserts and removes controlled H5 blocks", () => {
    const heading = { ...createH5BlockForm("section_heading"), id: "heading" };
    const paragraph = { ...createH5BlockForm("paragraph"), id: "paragraph" };
    const note = { ...createH5BlockForm("purchase_note"), id: "note" };

    expect(
      moveH5BlockForm([heading, paragraph, note], "paragraph", "up").map(
        block => block.id
      )
    ).toEqual(["paragraph", "heading", "note"]);
    expect(
      moveH5BlockForm([heading, paragraph, note], "heading", "up").map(
        block => block.id
      )
    ).toEqual(["heading", "paragraph", "note"]);

    const copy = cloneH5BlockForm(paragraph);
    expect(copy.id).not.toBe(paragraph.id);
    expect(copy.body).toBe(paragraph.body);

    expect(
      insertH5BlockAfter([heading, paragraph], "heading", note).map(
        block => block.id
      )
    ).toEqual(["heading", "note", "paragraph"]);
    expect(
      removeH5BlockForm([heading, paragraph, note], "paragraph").map(
        block => block.id
      )
    ).toEqual(["heading", "note"]);
  });

  it("stores and reapplies a local detail template draft safely", () => {
    const form = createDefaultContentWorkbenchForm("https://example.com/a.jpg");
    const template = createDetailDesignerSavedTemplate(
      {
        ...form,
        summary: "用于保存的摘要",
        headline: "保存后的标题",
        richTextBlocks: [
          { ...createH5BlockForm("section_heading"), id: "source_heading" },
          { ...createH5BlockForm("faq"), id: "source_faq" },
        ],
      },
      "情绪课程模板",
      { id: "template_1", now: "2026-05-25T09:00:00.000Z" }
    );

    const parsed = parseDetailDesignerSavedTemplates(
      JSON.stringify([template, { id: "broken" }])
    );
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.name).toBe("情绪课程模板");

    const applied = applyDetailDesignerSavedTemplate(form, parsed[0]!);
    expect(applied.summary).toBe("用于保存的摘要");
    expect(applied.headline).toBe("保存后的标题");
    expect(applied.richTextBlocks.map(block => block.type)).toEqual([
      "section_heading",
      "faq",
    ]);
    expect(applied.richTextBlocks[0]?.id).not.toBe("source_heading");
  });

  it("converts server detail templates to and from the editor form", () => {
    const form = {
      ...createDefaultContentWorkbenchForm("https://example.com/a.jpg"),
      summary: "服务端模板摘要",
      targetAudienceText:
        "希望快速判断课程是否适合的人\n需要购买前看清权益的人",
      headline: "服务端模板标题",
      subheadline: "服务端模板副标题",
      sellingPointsText: "适合人群清晰\n购买权益明确",
      richTextBlocks: [
        {
          ...createH5BlockForm("bullet_list"),
          id: "source_points",
          title: "你将获得",
          itemsText: "清晰学习路径\n低压力练习",
        },
      ],
    };
    const content = createCourseProductDetailTemplateContent(form);

    expect(content.targetAudience).toEqual([
      "希望快速判断课程是否适合的人",
      "需要购买前看清权益的人",
    ]);
    expect(content.richTextBlocks[0]?.items).toEqual([
      "清晰学习路径",
      "低压力练习",
    ]);

    const applied = applyCourseProductDetailTemplateToForm(
      createDefaultContentWorkbenchForm("https://example.com/a.jpg"),
      {
        id: "template_1",
        name: "服务端成交模板",
        scope: "personal",
        ownerId: "operator_1",
        content,
        createdAt: "2026-05-25T09:00:00.000Z",
        updatedAt: "2026-05-25T09:00:00.000Z",
      }
    );

    expect(applied.headline).toBe("服务端模板标题");
    expect(applied.targetAudienceText).toContain("购买前看清权益");
    expect(applied.richTextBlocks[0]?.id).not.toBe("source_points");
    expect(applied.richTextBlocks[0]?.itemsText).toContain("低压力练习");
  });
});
