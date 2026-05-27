import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  CourseProductDetailTemplateApplyRequestSchema,
  CourseProductDetailTemplateAuditEventSchema,
  CourseProductDetailTemplateCreateRequestSchema,
  CourseProductDetailTemplateListResultSchema,
  CourseProductDetailTemplateMutationResultSchema,
  CourseProductDetailTemplateShareReviewRequestSchema,
  CourseProductDetailTemplateShareRequestSchema,
  CourseProductDetailTemplateSchema,
  type CourseProductDetailTemplate,
  type CourseProductDetailTemplateApplyRequest,
  type CourseProductDetailTemplateAuditAction,
  type CourseProductDetailTemplateAuditEvent,
  type CourseProductDetailTemplateCreateRequest,
  type CourseProductDetailTemplateListResult,
  type CourseProductDetailTemplateMutationResult,
  type CourseProductDetailTemplateShareReviewRequest,
  type CourseProductDetailTemplateShareRequest,
} from "../../../shared/domain";

const systemTemplateTimestamp = "2026-05-01T00:00:00.000Z";

const CourseProductDetailTemplateStoreFileSchema = z.object({
  version: z.literal(1),
  templates: z.array(CourseProductDetailTemplateSchema),
  auditEvents: z.array(CourseProductDetailTemplateAuditEventSchema).default([]),
});

type CourseProductDetailTemplateStoreFile = z.infer<
  typeof CourseProductDetailTemplateStoreFileSchema
>;

export interface CourseProductDetailTemplateStore {
  listTemplates(): Promise<CourseProductDetailTemplate[]>;
  saveTemplate(
    template: CourseProductDetailTemplate
  ): Promise<CourseProductDetailTemplate>;
  deleteTemplate(
    templateId: string
  ): Promise<CourseProductDetailTemplate | undefined>;
  appendAuditEvent(
    event: CourseProductDetailTemplateAuditEvent
  ): Promise<CourseProductDetailTemplateAuditEvent>;
  listAuditEvents(
    templateId?: string
  ): Promise<CourseProductDetailTemplateAuditEvent[]>;
}

export class InMemoryCourseProductDetailTemplateStore implements CourseProductDetailTemplateStore {
  private templates = new Map<string, CourseProductDetailTemplate>();
  private auditEvents: CourseProductDetailTemplateAuditEvent[] = [];

  constructor({
    templates = [],
    auditEvents = [],
  }: Partial<CourseProductDetailTemplateStoreFile> = {}) {
    templates.forEach(template => {
      const parsed = CourseProductDetailTemplateSchema.parse(template);
      this.templates.set(parsed.id, cloneTemplate(parsed));
    });
    this.auditEvents = auditEvents.map(event =>
      CourseProductDetailTemplateAuditEventSchema.parse(event)
    );
  }

  async listTemplates() {
    return Array.from(this.templates.values()).map(cloneTemplate);
  }

  async saveTemplate(template: CourseProductDetailTemplate) {
    const parsed = CourseProductDetailTemplateSchema.parse(template);
    this.templates.set(parsed.id, cloneTemplate(parsed));
    return cloneTemplate(parsed);
  }

  async deleteTemplate(templateId: string) {
    const template = this.templates.get(templateId);
    if (!template) return undefined;
    this.templates.delete(templateId);
    return cloneTemplate(template);
  }

  async appendAuditEvent(event: CourseProductDetailTemplateAuditEvent) {
    const parsed = CourseProductDetailTemplateAuditEventSchema.parse(event);
    this.auditEvents.push(parsed);
    return cloneAuditEvent(parsed);
  }

  async listAuditEvents(templateId?: string) {
    return this.auditEvents
      .filter(event => !templateId || event.templateId === templateId)
      .map(cloneAuditEvent);
  }
}

export class JsonFileCourseProductDetailTemplateStore implements CourseProductDetailTemplateStore {
  constructor(
    private readonly filePath = resolveCourseProductDetailTemplateStorePath()
  ) {}

  async listTemplates() {
    return this.readFile().templates.map(cloneTemplate);
  }

  async saveTemplate(template: CourseProductDetailTemplate) {
    const parsed = CourseProductDetailTemplateSchema.parse(template);
    const file = this.readFile();
    const existingIndex = file.templates.findIndex(
      item => item.id === parsed.id
    );

    if (existingIndex >= 0) {
      file.templates[existingIndex] = parsed;
    } else {
      file.templates.push(parsed);
    }

    this.writeFile(file);
    return cloneTemplate(parsed);
  }

  async deleteTemplate(templateId: string) {
    const file = this.readFile();
    const existingIndex = file.templates.findIndex(
      item => item.id === templateId
    );
    if (existingIndex < 0) return undefined;

    const [template] = file.templates.splice(existingIndex, 1);
    this.writeFile(file);
    return template ? cloneTemplate(template) : undefined;
  }

  async appendAuditEvent(event: CourseProductDetailTemplateAuditEvent) {
    const parsed = CourseProductDetailTemplateAuditEventSchema.parse(event);
    const file = this.readFile();
    file.auditEvents.push(parsed);
    this.writeFile(file);
    return cloneAuditEvent(parsed);
  }

  async listAuditEvents(templateId?: string) {
    return this.readFile()
      .auditEvents.filter(
        event => !templateId || event.templateId === templateId
      )
      .map(cloneAuditEvent);
  }

  clear() {
    this.writeFile(emptyCourseProductDetailTemplateStoreFile());
  }

  private readFile(): CourseProductDetailTemplateStoreFile {
    if (!fs.existsSync(this.filePath)) {
      return emptyCourseProductDetailTemplateStoreFile();
    }

    try {
      return normalizeCourseProductDetailTemplateStoreFile(
        JSON.parse(fs.readFileSync(this.filePath, "utf8"))
      );
    } catch {
      return emptyCourseProductDetailTemplateStoreFile();
    }
  }

  private writeFile(file: CourseProductDetailTemplateStoreFile) {
    const normalized = normalizeCourseProductDetailTemplateStoreFile(file);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(normalized, null, 2), "utf8");
    fs.renameSync(tmpPath, this.filePath);
  }
}

let defaultDetailTemplateStore: CourseProductDetailTemplateStore | undefined;

export function getCourseProductDetailTemplateStore() {
  defaultDetailTemplateStore ??=
    createDefaultCourseProductDetailTemplateStore();
  return defaultDetailTemplateStore;
}

export function setCourseProductDetailTemplateStore(
  store: CourseProductDetailTemplateStore
) {
  defaultDetailTemplateStore = store;
}

export function createDefaultCourseProductDetailTemplateStore(): CourseProductDetailTemplateStore {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST ||
    process.env.HONGBOSHI_COURSE_PRODUCT_DETAIL_TEMPLATE_STORE === "memory"
  ) {
    return new InMemoryCourseProductDetailTemplateStore();
  }

  return new JsonFileCourseProductDetailTemplateStore();
}

export function resolveCourseProductDetailTemplateStorePath() {
  return path.resolve(
    process.cwd(),
    process.env.HONGBOSHI_COURSE_PRODUCT_DETAIL_TEMPLATE_FILE ??
      ".hongboshi-data/course-product-detail-templates.json"
  );
}

export async function listCourseProductDetailTemplates({
  actorId,
  store = getCourseProductDetailTemplateStore(),
}: {
  actorId: string;
  store?: CourseProductDetailTemplateStore;
}): Promise<CourseProductDetailTemplateListResult> {
  const storedTemplates = await store.listTemplates();
  const visibleTemplates = [
    ...defaultSystemDetailTemplates(),
    ...storedTemplates.filter(template =>
      templateVisibleToActor(template, actorId)
    ),
  ].sort(compareDetailTemplates);

  return CourseProductDetailTemplateListResultSchema.parse({
    items: visibleTemplates,
    summary: summarizeTemplates(visibleTemplates),
    auditEvents: await store.listAuditEvents(),
  });
}

export async function createCourseProductDetailTemplate({
  actorId,
  request,
  store = getCourseProductDetailTemplateStore(),
  now = new Date().toISOString(),
}: {
  actorId: string;
  request: CourseProductDetailTemplateCreateRequest;
  store?: CourseProductDetailTemplateStore;
  now?: string;
}): Promise<CourseProductDetailTemplateMutationResult> {
  const parsedRequest =
    CourseProductDetailTemplateCreateRequestSchema.parse(request);
  const storedTemplates = await store.listTemplates();
  const existingTemplate = storedTemplates.find(
    template =>
      template.scope === "personal" &&
      template.ownerId === actorId &&
      template.name === parsedRequest.name
  );
  const template = CourseProductDetailTemplateSchema.parse({
    id:
      existingTemplate?.id ??
      createDetailTemplateId("detail_template", actorId, now),
    name: parsedRequest.name,
    description: parsedRequest.description,
    scope: "personal",
    shareStatus: existingTemplate?.shareStatus ?? "private",
    ownerId: actorId,
    sourceProductId: parsedRequest.sourceProductId,
    teamShareRequestedBy: existingTemplate?.teamShareRequestedBy,
    teamShareRequestedAt: existingTemplate?.teamShareRequestedAt,
    content: parsedRequest.content,
    createdAt: existingTemplate?.createdAt ?? now,
    updatedAt: now,
  });
  const savedTemplate = await store.saveTemplate(template);
  const auditEvent = await store.appendAuditEvent(
    createDetailTemplateAuditEvent({
      action: "template_create",
      actorId,
      template: savedTemplate,
      reason: parsedRequest.reason,
      now,
    })
  );

  return CourseProductDetailTemplateMutationResultSchema.parse({
    template: savedTemplate,
    templates: await listCourseProductDetailTemplates({ actorId, store }),
    auditEvent,
  });
}

export async function deleteCourseProductDetailTemplate({
  actorId,
  templateId,
  request,
  store = getCourseProductDetailTemplateStore(),
  now = new Date().toISOString(),
}: {
  actorId: string;
  templateId: string;
  request: { reason: string };
  store?: CourseProductDetailTemplateStore;
  now?: string;
}): Promise<CourseProductDetailTemplateMutationResult> {
  const reason = z.string().trim().min(4).max(240).parse(request.reason);
  const template = await getVisibleDetailTemplate(templateId, actorId, store);
  if (template.scope === "system") {
    throw new Error("COURSE_PRODUCT_DETAIL_TEMPLATE_SYSTEM_READONLY");
  }
  if (template.scope === "personal" && template.ownerId !== actorId) {
    throw new Error("COURSE_PRODUCT_DETAIL_TEMPLATE_FORBIDDEN");
  }

  const deletedTemplate = await store.deleteTemplate(templateId);
  if (!deletedTemplate)
    throw new Error("COURSE_PRODUCT_DETAIL_TEMPLATE_NOT_FOUND");

  const auditEvent = await store.appendAuditEvent(
    createDetailTemplateAuditEvent({
      action: "template_delete",
      actorId,
      template: deletedTemplate,
      reason,
      now,
    })
  );

  return CourseProductDetailTemplateMutationResultSchema.parse({
    template: deletedTemplate,
    templates: await listCourseProductDetailTemplates({ actorId, store }),
    auditEvent,
  });
}

export async function applyCourseProductDetailTemplate({
  actorId,
  templateId,
  request,
  store = getCourseProductDetailTemplateStore(),
  now = new Date().toISOString(),
}: {
  actorId: string;
  templateId: string;
  request: CourseProductDetailTemplateApplyRequest;
  store?: CourseProductDetailTemplateStore;
  now?: string;
}): Promise<CourseProductDetailTemplateMutationResult> {
  const parsedRequest =
    CourseProductDetailTemplateApplyRequestSchema.parse(request);
  const template = await getVisibleDetailTemplate(templateId, actorId, store);
  const auditEvent = await store.appendAuditEvent(
    createDetailTemplateAuditEvent({
      action: "template_apply",
      actorId,
      template,
      productId: parsedRequest.productId,
      reason: parsedRequest.reason,
      now,
    })
  );

  return CourseProductDetailTemplateMutationResultSchema.parse({
    template,
    templates: await listCourseProductDetailTemplates({ actorId, store }),
    auditEvent,
  });
}

export async function requestCourseProductDetailTemplateTeamShare({
  actorId,
  templateId,
  request,
  store = getCourseProductDetailTemplateStore(),
  now = new Date().toISOString(),
}: {
  actorId: string;
  templateId: string;
  request: CourseProductDetailTemplateShareRequest;
  store?: CourseProductDetailTemplateStore;
  now?: string;
}): Promise<CourseProductDetailTemplateMutationResult> {
  const parsedRequest =
    CourseProductDetailTemplateShareRequestSchema.parse(request);
  const template = await getVisibleDetailTemplate(templateId, actorId, store);
  if (template.scope !== "personal") {
    throw new Error("COURSE_PRODUCT_DETAIL_TEMPLATE_SHARE_UNAVAILABLE");
  }
  if (template.ownerId !== actorId) {
    throw new Error("COURSE_PRODUCT_DETAIL_TEMPLATE_FORBIDDEN");
  }

  const nextTemplate = CourseProductDetailTemplateSchema.parse({
    ...template,
    shareStatus: "pending_team_review",
    teamShareRequestedBy: actorId,
    teamShareRequestedAt: now,
    updatedAt: now,
  });
  const savedTemplate = await store.saveTemplate(nextTemplate);
  const auditEvent = await store.appendAuditEvent(
    createDetailTemplateAuditEvent({
      action: "template_share_request",
      actorId,
      template: savedTemplate,
      reason: parsedRequest.reason,
      now,
    })
  );

  return CourseProductDetailTemplateMutationResultSchema.parse({
    template: savedTemplate,
    templates: await listCourseProductDetailTemplates({ actorId, store }),
    auditEvent,
  });
}

export async function reviewCourseProductDetailTemplateTeamShare({
  actorId,
  templateId,
  request,
  store = getCourseProductDetailTemplateStore(),
  now = new Date().toISOString(),
}: {
  actorId: string;
  templateId: string;
  request: CourseProductDetailTemplateShareReviewRequest;
  store?: CourseProductDetailTemplateStore;
  now?: string;
}): Promise<CourseProductDetailTemplateMutationResult> {
  const parsedRequest =
    CourseProductDetailTemplateShareReviewRequestSchema.parse(request);
  const template = (await store.listTemplates()).find(
    item => item.id === templateId
  );
  if (!template) throw new Error("COURSE_PRODUCT_DETAIL_TEMPLATE_NOT_FOUND");
  if (
    template.scope !== "personal" ||
    template.shareStatus !== "pending_team_review"
  ) {
    throw new Error("COURSE_PRODUCT_DETAIL_TEMPLATE_SHARE_REVIEW_UNAVAILABLE");
  }

  if (parsedRequest.action === "reject") {
    const rejectedTemplate = CourseProductDetailTemplateSchema.parse({
      ...template,
      shareStatus: "private",
      teamShareReviewedBy: actorId,
      teamShareReviewedAt: now,
      teamShareReviewReason: parsedRequest.reason,
      updatedAt: now,
    });
    const savedTemplate = await store.saveTemplate(rejectedTemplate);
    const auditEvent = await store.appendAuditEvent(
      createDetailTemplateAuditEvent({
        action: "template_share_reject",
        actorId,
        template: savedTemplate,
        reason: parsedRequest.reason,
        now,
      })
    );

    return CourseProductDetailTemplateMutationResultSchema.parse({
      template: savedTemplate,
      templates: await listCourseProductDetailTemplates({ actorId, store }),
      auditEvent,
    });
  }

  const teamTemplate = CourseProductDetailTemplateSchema.parse({
    id: createDetailTemplateId("team_detail_template", actorId, now),
    name: template.name,
    description: template.description,
    scope: "team",
    shareStatus: "team_shared",
    ownerId: template.ownerId,
    sourceProductId: template.sourceProductId,
    teamShareRequestedBy: template.teamShareRequestedBy,
    teamShareRequestedAt: template.teamShareRequestedAt,
    teamShareReviewedBy: actorId,
    teamShareReviewedAt: now,
    teamShareReviewReason: parsedRequest.reason,
    content: template.content,
    createdAt: now,
    updatedAt: now,
  });
  const approvedTemplate = CourseProductDetailTemplateSchema.parse({
    ...template,
    shareStatus: "team_shared",
    teamShareReviewedBy: actorId,
    teamShareReviewedAt: now,
    teamShareReviewReason: parsedRequest.reason,
    teamSharedTemplateId: teamTemplate.id,
    updatedAt: now,
  });

  await store.saveTemplate(approvedTemplate);
  const savedTeamTemplate = await store.saveTemplate(teamTemplate);
  const auditEvent = await store.appendAuditEvent(
    createDetailTemplateAuditEvent({
      action: "template_share_approve",
      actorId,
      template: approvedTemplate,
      reason: parsedRequest.reason,
      now,
    })
  );

  return CourseProductDetailTemplateMutationResultSchema.parse({
    template: savedTeamTemplate,
    templates: await listCourseProductDetailTemplates({ actorId, store }),
    auditEvent,
  });
}

function defaultSystemDetailTemplates(): CourseProductDetailTemplate[] {
  return [
    {
      id: "system_detail_template_decision_first",
      name: "成交决策页",
      description:
        "将适合人群、核心收获、FAQ 和购买须知前置，适合多数课程商品。",
      scope: "system",
      shareStatus: "team_shared",
      content: {
        summary:
          "用买前决策视角快速解释课程适合谁、解决什么问题、购买后会获得什么。",
        targetAudience: [
          "希望先判断课程是否适合自己的用户",
          "关注课程交付、学习路径和购买权益的用户",
        ],
        headline: "先看清问题，再开始练习",
        subheadline: "把课程价值、交付内容和购买须知放在用户最容易决策的位置。",
        sellingPoints: [
          "问题和适合人群前置",
          "学习交付清晰可查",
          "FAQ 降低购买犹豫",
        ],
        richTextBlocks: [
          {
            id: "system_decision_heading",
            type: "section_heading",
            title: "买前先看清：问题、方法和交付",
            style: { tone: "deep", spacing: "relaxed", radius: "large" },
          },
          {
            id: "system_decision_summary",
            type: "paragraph",
            body: "这套详情结构适合把课程定位、适配场景和学习路径讲清楚，让用户在下单前快速判断是否适合自己。",
          },
          {
            id: "system_decision_points",
            type: "bullet_list",
            title: "用户会重点看到",
            items: ["适合人群", "学习路径", "购买权益", "售后和风险边界"],
            style: { tone: "fresh", spacing: "normal", radius: "medium" },
          },
          {
            id: "system_decision_faq",
            type: "faq",
            question: "购买后从哪里开始学习？",
            answer:
              "支付成功后课程权益进入账户，可从课程详情、学习页或个人中心继续学习。",
          },
        ],
      },
      createdAt: systemTemplateTimestamp,
      updatedAt: systemTemplateTimestamp,
    },
    {
      id: "system_detail_template_image_story",
      name: "图文故事页",
      description: "适合素材较充分的课程，用多段图文讲清场景、方法和学习结果。",
      scope: "system",
      shareStatus: "team_shared",
      content: {
        summary:
          "用图文分段展示课程场景、练习路径和预期收获，适合提升移动端停留。",
        targetAudience: [
          "喜欢通过图片快速理解课程的人",
          "需要先看到学习场景的人",
        ],
        headline: "用图文快速了解这门课",
        subheadline: "把图片、场景说明和课程收获组合成更容易浏览的 H5 详情。",
        sellingPoints: ["主视觉承接情绪", "分段阅读压力低", "移动端浏览更顺手"],
        richTextBlocks: [
          {
            id: "system_story_heading",
            type: "section_heading",
            title: "用图文快速了解这门课",
            style: { tone: "fresh", spacing: "normal", radius: "large" },
          },
          {
            id: "system_story_image",
            type: "image",
            title: "课程核心场景",
            style: {
              tone: "warm",
              spacing: "compact",
              radius: "large",
              imageAspectRatio: "16:9",
              captionMode: "overlay",
            },
          },
          {
            id: "system_story_paragraph",
            type: "paragraph",
            body: "先用场景解释用户正在经历的问题，再用课程路径说明如何一步步进入学习和练习。",
          },
          {
            id: "system_story_purchase",
            type: "purchase_note",
            body: "购买后可在学习页查看章节、练习和资料，订单与课程权益会在个人中心持续可查。",
          },
        ],
      },
      createdAt: systemTemplateTimestamp,
      updatedAt: systemTemplateTimestamp,
    },
  ].map(template => CourseProductDetailTemplateSchema.parse(template));
}

async function getVisibleDetailTemplate(
  templateId: string,
  actorId: string,
  store: CourseProductDetailTemplateStore
) {
  const template = [
    ...defaultSystemDetailTemplates(),
    ...(await store.listTemplates()),
  ].find(item => item.id === templateId);
  if (!template || !templateVisibleToActor(template, actorId)) {
    throw new Error("COURSE_PRODUCT_DETAIL_TEMPLATE_NOT_FOUND");
  }
  return template;
}

function templateVisibleToActor(
  template: CourseProductDetailTemplate,
  actorId: string
) {
  if (template.scope === "system" || template.scope === "team") return true;
  return template.ownerId === actorId;
}

function compareDetailTemplates(
  left: CourseProductDetailTemplate,
  right: CourseProductDetailTemplate
) {
  const scopeRank = { system: 0, team: 1, personal: 2 };
  const scopeDelta = scopeRank[left.scope] - scopeRank[right.scope];
  if (scopeDelta !== 0) return scopeDelta;
  return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
}

function summarizeTemplates(templates: CourseProductDetailTemplate[]) {
  return {
    totalCount: templates.length,
    systemCount: templates.filter(template => template.scope === "system")
      .length,
    teamCount: templates.filter(template => template.scope === "team").length,
    personalCount: templates.filter(template => template.scope === "personal")
      .length,
    pendingShareRequestCount: templates.filter(
      template => template.shareStatus === "pending_team_review"
    ).length,
  };
}

function createDetailTemplateAuditEvent({
  action,
  actorId,
  template,
  productId,
  reason,
  now,
}: {
  action: CourseProductDetailTemplateAuditAction;
  actorId: string;
  template: CourseProductDetailTemplate;
  productId?: string;
  reason: string;
  now: string;
}) {
  return CourseProductDetailTemplateAuditEventSchema.parse({
    id: `audit_detail_template_${template.id}_${action}_${Date.parse(now) || Date.now()}`,
    templateId: template.id,
    templateName: template.name,
    productId,
    actorId,
    action,
    reason,
    createdAt: now,
  });
}

function createDetailTemplateId(prefix: string, actorId: string, now: string) {
  const actorSlug = actorId.replace(/[^a-zA-Z0-9_]+/g, "_").slice(0, 32);
  return `${prefix}_${actorSlug}_${Date.parse(now) || Date.now()}_${Math.round(
    Math.random() * 10000
  )}`;
}

function emptyCourseProductDetailTemplateStoreFile(): CourseProductDetailTemplateStoreFile {
  return {
    version: 1,
    templates: [],
    auditEvents: [],
  };
}

function normalizeCourseProductDetailTemplateStoreFile(
  payload: unknown
): CourseProductDetailTemplateStoreFile {
  const parsed = CourseProductDetailTemplateStoreFileSchema.safeParse(payload);
  if (!parsed.success) return emptyCourseProductDetailTemplateStoreFile();

  return {
    version: 1,
    templates: parsed.data.templates
      .filter(template => template.scope !== "system")
      .map(template => CourseProductDetailTemplateSchema.parse(template)),
    auditEvents: parsed.data.auditEvents.map(event =>
      CourseProductDetailTemplateAuditEventSchema.parse(event)
    ),
  };
}

function cloneTemplate(template: CourseProductDetailTemplate) {
  return CourseProductDetailTemplateSchema.parse(
    JSON.parse(JSON.stringify(template))
  );
}

function cloneAuditEvent(event: CourseProductDetailTemplateAuditEvent) {
  return CourseProductDetailTemplateAuditEventSchema.parse(
    JSON.parse(JSON.stringify(event))
  );
}
