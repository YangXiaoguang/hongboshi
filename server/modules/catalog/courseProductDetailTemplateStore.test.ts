import { describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import {
  InMemoryCourseProductDetailTemplateStore,
  JsonFileCourseProductDetailTemplateStore,
  applyCourseProductDetailTemplate,
  createCourseProductDetailTemplate,
  deleteCourseProductDetailTemplate,
  listCourseProductDetailTemplates,
  requestCourseProductDetailTemplateTeamShare,
} from "./courseProductDetailTemplateStore";

const templateContent = {
  summary: "用于心理课程商品详情页的成交内容结构。",
  targetAudience: ["希望买前快速判断适配度的用户"],
  headline: "先看清问题，再开始练习",
  subheadline: "把适合人群、课程收获和购买须知放在详情页前半屏。",
  sellingPoints: ["适合人群清晰", "课程收获明确"],
  richTextBlocks: [
    {
      id: "block_heading_1",
      type: "section_heading" as const,
      title: "适合先从一个可练习的改变开始",
      style: { tone: "fresh" as const, radius: "large" as const },
    },
  ],
};

describe("course product detail template store", () => {
  it("lists system templates and creates personal templates with audit", async () => {
    const store = new InMemoryCourseProductDetailTemplateStore();

    const initial = await listCourseProductDetailTemplates({
      actorId: "operator_1",
      store,
    });
    expect(initial.summary.systemCount).toBeGreaterThan(0);
    expect(initial.summary.personalCount).toBe(0);

    const result = await createCourseProductDetailTemplate({
      actorId: "operator_1",
      store,
      now: "2026-05-25T10:00:00.000Z",
      request: {
        name: "情绪课程成交模板",
        scope: "personal",
        sourceProductId: "product_1",
        content: templateContent,
        reason: "沉淀可复用详情模板",
      },
    });

    expect(result.template).toMatchObject({
      name: "情绪课程成交模板",
      scope: "personal",
      shareStatus: "private",
      ownerId: "operator_1",
    });
    expect(result.auditEvent.action).toBe("template_create");
    expect(result.templates.summary.personalCount).toBe(1);
  });

  it("requests team share review for personal templates", async () => {
    const store = new InMemoryCourseProductDetailTemplateStore();
    const created = await createCourseProductDetailTemplate({
      actorId: "operator_1",
      store,
      now: "2026-05-25T10:00:00.000Z",
      request: {
        name: "情绪课程成交模板",
        scope: "personal",
        content: templateContent,
        reason: "沉淀可复用详情模板",
      },
    });

    const requested = await requestCourseProductDetailTemplateTeamShare({
      actorId: "operator_1",
      templateId: created.template.id,
      store,
      now: "2026-05-25T10:05:00.000Z",
      request: { reason: "申请团队共享该成交模板" },
    });

    expect(requested.template).toMatchObject({
      id: created.template.id,
      shareStatus: "pending_team_review",
      teamShareRequestedBy: "operator_1",
      teamShareRequestedAt: "2026-05-25T10:05:00.000Z",
    });
    expect(requested.auditEvent.action).toBe("template_share_request");
    expect(requested.templates.summary.pendingShareRequestCount).toBe(1);

    const systemTemplate = requested.templates.items.find(
      template => template.scope === "system"
    );
    await expect(
      requestCourseProductDetailTemplateTeamShare({
        actorId: "operator_1",
        templateId: systemTemplate!.id,
        store,
        request: { reason: "系统模板不能重复申请共享" },
      })
    ).rejects.toThrow("COURSE_PRODUCT_DETAIL_TEMPLATE_SHARE_UNAVAILABLE");
  });

  it("records apply audit and prevents deleting system templates", async () => {
    const store = new InMemoryCourseProductDetailTemplateStore();
    const list = await listCourseProductDetailTemplates({
      actorId: "operator_1",
      store,
    });
    const systemTemplate = list.items.find(
      template => template.scope === "system"
    );
    expect(systemTemplate).toBeDefined();

    await expect(
      deleteCourseProductDetailTemplate({
        actorId: "operator_1",
        templateId: systemTemplate!.id,
        store,
        request: { reason: "尝试删除系统模板" },
      })
    ).rejects.toThrow("COURSE_PRODUCT_DETAIL_TEMPLATE_SYSTEM_READONLY");

    const applied = await applyCourseProductDetailTemplate({
      actorId: "operator_1",
      templateId: systemTemplate!.id,
      store,
      now: "2026-05-25T10:10:00.000Z",
      request: {
        productId: "course_product_1",
        reason: "套用系统详情模板",
      },
    });

    expect(applied.auditEvent).toMatchObject({
      action: "template_apply",
      productId: "course_product_1",
    });
  });

  it("deletes personal templates and persists JSON data", async () => {
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "hongboshi-detail-template-")
    );
    const filePath = path.join(tempDir, "detail-templates.json");

    try {
      const store = new JsonFileCourseProductDetailTemplateStore(filePath);
      const created = await createCourseProductDetailTemplate({
        actorId: "operator_1",
        store,
        now: "2026-05-25T10:20:00.000Z",
        request: {
          name: "关系课程图文模板",
          scope: "personal",
          content: templateContent,
          reason: "保存个人详情模板",
        },
      });

      const reloaded = new JsonFileCourseProductDetailTemplateStore(filePath);
      const list = await listCourseProductDetailTemplates({
        actorId: "operator_1",
        store: reloaded,
      });
      expect(list.items.some(item => item.id === created.template.id)).toBe(
        true
      );

      const deleted = await deleteCourseProductDetailTemplate({
        actorId: "operator_1",
        templateId: created.template.id,
        store: reloaded,
        request: { reason: "清理个人详情模板" },
      });
      expect(
        deleted.templates.items.some(item => item.id === created.template.id)
      ).toBe(false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
