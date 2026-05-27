import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type {
  CourseProductDetailTemplate,
  CourseProductDetailTemplateAuditEvent,
} from "@shared/domain";
import { CourseProductDetailTemplateManagerDialog } from "./CourseProductDetailDesignerPanels";

const pendingTemplate = {
  id: "template_pending_share",
  name: "情绪课程成交模板",
  scope: "personal",
  shareStatus: "pending_team_review",
  ownerId: "operator_1",
  teamShareRequestedBy: "operator_1",
  teamShareRequestedAt: "2026-05-25T10:00:00.000Z",
  content: {
    summary: "适合情绪管理课程的成交页结构。",
    targetAudience: ["需要情绪练习的人"],
    headline: "先看清情绪，再开始练习",
    subheadline: "用结构化详情降低购买前的不确定感",
    sellingPoints: ["适合人群清晰", "练习路径明确"],
    richTextBlocks: [
      {
        id: "block_1",
        type: "paragraph",
        body: "把课程价值讲清楚。",
        items: [],
      },
    ],
  },
  createdAt: "2026-05-25T09:55:00.000Z",
  updatedAt: "2026-05-25T10:00:00.000Z",
} satisfies CourseProductDetailTemplate;

const auditEvents = [
  {
    id: "audit_share_request",
    templateId: pendingTemplate.id,
    templateName: pendingTemplate.name,
    actorId: "operator_1",
    action: "template_share_request",
    reason: "申请团队共享模板",
    createdAt: "2026-05-25T10:00:00.000Z",
  },
] satisfies CourseProductDetailTemplateAuditEvent[];

function noop() {
  return undefined;
}

describe("course product detail designer panels", () => {
  it("renders pending template review controls for reviewers", () => {
    const html = renderToStaticMarkup(
      <CourseProductDetailTemplateManagerDialog
        isOpen
        templates={[pendingTemplate]}
        auditEvents={auditEvents}
        isTemplateLoading={false}
        canReviewTemplates
        onClose={noop}
        onTemplateApply={noop}
        onTemplateDelete={noop}
        onTemplateShareRequest={noop}
        onTemplateShareReview={noop}
      />
    );

    expect(html).toContain("详情模板库");
    expect(html).toContain("待审核");
    expect(html).toContain("共享审核");
    expect(html).toContain("operator_1");
    expect(html).toContain("驳回");
    expect(html).toContain("通过");
    expect(html).toContain("申请共享");
  });

  it("keeps review actions hidden without review permission", () => {
    const html = renderToStaticMarkup(
      <CourseProductDetailTemplateManagerDialog
        isOpen
        templates={[pendingTemplate]}
        auditEvents={auditEvents}
        isTemplateLoading={false}
        canReviewTemplates={false}
        onClose={noop}
        onTemplateApply={noop}
        onTemplateDelete={noop}
        onTemplateShareRequest={noop}
      />
    );

    expect(html).toContain("当前账号可查看申请");
    expect(html).not.toContain("填写审核意见");
  });
});
