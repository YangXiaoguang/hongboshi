import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  RiskEscalationQueueItemSchema,
  RiskSopTemplateSchema,
  type RiskEscalationQueueItem,
  type RiskEvent,
  type RiskSopTemplate,
} from "../../../shared/domain";

type MaybePromise<T> = T | Promise<T>;

const RiskSopStoreFileSchema = z.object({
  version: z.literal(1),
  templates: z.array(RiskSopTemplateSchema).default([]),
  escalationQueue: z.array(RiskEscalationQueueItemSchema).default([]),
});

type RiskSopStoreFile = z.infer<typeof RiskSopStoreFileSchema>;

const allRiskSources = [
  "assessment",
  "counseling_intake",
  "chat",
  "operator",
] as const;

export interface RiskSopStore {
  listTemplates(): MaybePromise<RiskSopTemplate[]>;
  saveTemplate(template: RiskSopTemplate): MaybePromise<RiskSopTemplate>;
  listEscalations(): MaybePromise<RiskEscalationQueueItem[]>;
  upsertEscalation(
    item: RiskEscalationQueueItem
  ): MaybePromise<RiskEscalationQueueItem>;
  clear(): MaybePromise<void>;
}

function cloneTemplate(template: RiskSopTemplate): RiskSopTemplate {
  return RiskSopTemplateSchema.parse(JSON.parse(JSON.stringify(template)));
}

function cloneEscalation(
  item: RiskEscalationQueueItem
): RiskEscalationQueueItem {
  return RiskEscalationQueueItemSchema.parse(JSON.parse(JSON.stringify(item)));
}

function sortTemplates(templates: RiskSopTemplate[]) {
  return [...templates].sort((left, right) =>
    left.id.localeCompare(right.id, "zh-CN")
  );
}

function sortEscalations(items: RiskEscalationQueueItem[]) {
  const priorityRank = {
    medium: 1,
    high: 2,
    urgent: 3,
  } satisfies Record<RiskEscalationQueueItem["priority"], number>;

  return [...items].sort((left, right) => {
    if (left.status !== right.status) {
      if (left.status === "resolved") return 1;
      if (right.status === "resolved") return -1;
    }
    const priorityDelta =
      priorityRank[right.priority] - priorityRank[left.priority];
    if (priorityDelta !== 0) return priorityDelta;
    return Date.parse(right.createdAt) - Date.parse(left.createdAt);
  });
}

export function createDefaultRiskSopTemplates(
  updatedAt = "2026-05-14T00:00:00.000Z"
): RiskSopTemplate[] {
  return [
    RiskSopTemplateSchema.parse({
      id: "sop_urgent_crisis_review",
      title: "紧急风险安全确认 SOP",
      version: "2026.05.1",
      enabled: true,
      riskLevels: ["urgent"],
      sources: ["assessment", "counseling_intake"],
      ownerRole: "危机干预负责人",
      updatedAt,
      steps: [
        {
          id: "step_confirm_safety",
          title: "确认当前安全状态",
          description:
            "优先通过合规联系方式确认用户当前安全状态、所在环境和是否需要线下急救资源。",
          required: true,
        },
        {
          id: "step_reduce_sensitive_spread",
          title: "控制敏感信息扩散",
          description:
            "复核记录只写处理摘要，不复制测评答案、咨询前说明全文或风险信号原文。",
          required: true,
        },
        {
          id: "step_escalate_owner",
          title: "升级给负责人",
          description:
            "无法确认安全状态或风险持续升高时，升级给具备危机干预资质的负责人。",
          required: true,
        },
      ],
      resultTemplates: [
        {
          id: "result_urgent_contacted",
          action: "mark_contacted",
          label: "已完成安全确认",
          noteTemplate:
            "已完成安全状态确认，用户当前可继续沟通，后续建议安排专业咨询支持。",
        },
        {
          id: "result_urgent_escalate",
          action: "escalate",
          label: "需负责人跟进",
          noteTemplate:
            "风险仍需负责人复核，已升级至危机干预队列并等待分配负责人。",
        },
      ],
    }),
    RiskSopTemplateSchema.parse({
      id: "sop_high_followup_review",
      title: "高风险持续跟进 SOP",
      version: "2026.05.1",
      enabled: true,
      riskLevels: ["high"],
      sources: [...allRiskSources],
      ownerRole: "高级运营",
      updatedAt,
      steps: [
        {
          id: "step_review_context",
          title: "核对近期服务状态",
          description:
            "核对风险来源、近期测评或咨询预约摘要，判断是否需要推荐咨询或升级处理。",
          required: true,
        },
        {
          id: "step_contact_or_recommend",
          title: "完成首次跟进",
          description:
            "优先在工作时间内完成首次跟进，记录联系结果或推荐咨询的原因。",
          required: true,
        },
      ],
      resultTemplates: [
        {
          id: "result_high_recommend",
          action: "recommend_counseling",
          label: "建议预约咨询",
          noteTemplate:
            "已根据风险摘要建议用户预约咨询服务，并保留后续跟进观察。",
        },
        {
          id: "result_high_resolve",
          action: "resolve",
          label: "阶段性完成",
          noteTemplate:
            "已完成高风险事件复核，当前无需升级处理，后续通过成长档案持续观察。",
        },
      ],
    }),
    RiskSopTemplateSchema.parse({
      id: "sop_medium_observation_review",
      title: "中风险观察复核 SOP",
      version: "2026.05.1",
      enabled: true,
      riskLevels: ["medium"],
      sources: [...allRiskSources],
      ownerRole: "运营",
      updatedAt,
      steps: [
        {
          id: "step_observe_context",
          title: "观察风险上下文",
          description:
            "核对风险来源和用户近期服务状态，判断是否需要继续观察或建议咨询。",
          required: true,
        },
        {
          id: "step_close_with_summary",
          title: "摘要化关闭",
          description:
            "如风险已明确可控，可记录摘要并标记解决，避免扩散敏感原文。",
          required: true,
        },
      ],
      resultTemplates: [
        {
          id: "result_medium_resolve",
          action: "resolve",
          label: "观察后关闭",
          noteTemplate: "已完成中风险复核，当前进入观察状态，无需升级处理。",
        },
      ],
    }),
  ];
}

function emptyStoreFile(): RiskSopStoreFile {
  return {
    version: 1,
    templates: createDefaultRiskSopTemplates(),
    escalationQueue: [],
  };
}

function normalizeStoreFile(payload: unknown): RiskSopStoreFile {
  const parsed = RiskSopStoreFileSchema.safeParse(payload);
  if (!parsed.success) return emptyStoreFile();

  return {
    version: 1,
    templates: sortTemplates(parsed.data.templates.map(cloneTemplate)),
    escalationQueue: sortEscalations(
      parsed.data.escalationQueue.map(cloneEscalation)
    ),
  };
}

export function findRiskSopTemplateForEvent(
  event: Pick<RiskEvent, "riskLevel" | "source">,
  templates: RiskSopTemplate[]
) {
  return templates.find(
    template =>
      template.enabled &&
      template.riskLevels.includes(event.riskLevel) &&
      template.sources.includes(event.source)
  );
}

export class InMemoryRiskSopStore implements RiskSopStore {
  private templates = new Map<string, RiskSopTemplate>();
  private escalationQueue = new Map<string, RiskEscalationQueueItem>();

  constructor(templates = createDefaultRiskSopTemplates()) {
    templates.forEach(template => {
      const normalized = cloneTemplate(template);
      this.templates.set(normalized.id, normalized);
    });
  }

  listTemplates(): RiskSopTemplate[] {
    return sortTemplates(Array.from(this.templates.values())).map(
      cloneTemplate
    );
  }

  saveTemplate(template: RiskSopTemplate): RiskSopTemplate {
    const normalized = cloneTemplate(template);
    this.templates.set(normalized.id, normalized);
    return cloneTemplate(normalized);
  }

  listEscalations(): RiskEscalationQueueItem[] {
    return sortEscalations(Array.from(this.escalationQueue.values())).map(
      cloneEscalation
    );
  }

  upsertEscalation(item: RiskEscalationQueueItem): RiskEscalationQueueItem {
    const normalized = cloneEscalation(item);
    this.escalationQueue.set(normalized.riskEventId, normalized);
    return cloneEscalation(normalized);
  }

  clear() {
    this.templates.clear();
    createDefaultRiskSopTemplates().forEach(template => {
      const normalized = cloneTemplate(template);
      this.templates.set(normalized.id, normalized);
    });
    this.escalationQueue.clear();
  }
}

export class JsonFileRiskSopStore implements RiskSopStore {
  constructor(private readonly filePath = resolveRiskSopStorePath()) {}

  listTemplates(): RiskSopTemplate[] {
    return sortTemplates(this.readFile().templates).map(cloneTemplate);
  }

  saveTemplate(template: RiskSopTemplate): RiskSopTemplate {
    const normalized = cloneTemplate(template);
    const file = this.readFile();
    const templates = file.templates.filter(item => item.id !== normalized.id);
    file.templates = sortTemplates([...templates, normalized]);
    this.writeFile(file);
    return cloneTemplate(normalized);
  }

  listEscalations(): RiskEscalationQueueItem[] {
    return sortEscalations(this.readFile().escalationQueue).map(
      cloneEscalation
    );
  }

  upsertEscalation(item: RiskEscalationQueueItem): RiskEscalationQueueItem {
    const normalized = cloneEscalation(item);
    const file = this.readFile();
    const queue = file.escalationQueue.filter(
      entry => entry.riskEventId !== normalized.riskEventId
    );
    file.escalationQueue = sortEscalations([...queue, normalized]);
    this.writeFile(file);
    return cloneEscalation(normalized);
  }

  clear() {
    this.writeFile(emptyStoreFile());
  }

  private readFile(): RiskSopStoreFile {
    if (!fs.existsSync(this.filePath)) return emptyStoreFile();

    try {
      return normalizeStoreFile(
        JSON.parse(fs.readFileSync(this.filePath, "utf8"))
      );
    } catch {
      return emptyStoreFile();
    }
  }

  private writeFile(file: RiskSopStoreFile) {
    const normalized = normalizeStoreFile(file);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(normalized, null, 2), "utf8");
    fs.renameSync(tmpPath, this.filePath);
  }
}

export function resolveRiskSopStorePath() {
  return path.resolve(
    process.cwd(),
    process.env.HONGBOSHI_RISK_SOP_FILE ?? ".hongboshi-data/risk-sop.json"
  );
}

export function createDefaultRiskSopStore(): RiskSopStore {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST ||
    process.env.HONGBOSHI_RISK_SOP_STORE === "memory"
  ) {
    return new InMemoryRiskSopStore();
  }

  return new JsonFileRiskSopStore();
}
