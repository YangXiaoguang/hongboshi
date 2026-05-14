import {
  RiskEscalationQueueItemSchema,
  RiskSopTemplateSchema,
  type RiskEscalationQueueItem,
  type RiskSopTemplate,
} from "../../../shared/domain";
import type { DatabaseQueryExecutor } from "../../db/postgres";
import {
  createDefaultRiskSopTemplates,
  type RiskSopAuditContext,
  type RiskSopStore,
} from "./riskSopStore";

type RiskSopTemplateRow = {
  id: string;
  title: string;
  version: string;
  enabled: boolean;
  risk_levels: RiskSopTemplate["riskLevels"];
  sources: RiskSopTemplate["sources"];
  owner_role: string;
  steps: unknown;
  result_templates: unknown;
  updated_at: string | Date;
};

type RiskEscalationQueueRow = {
  id: string;
  risk_event_id: string;
  user_id: string | null;
  priority: RiskEscalationQueueItem["priority"];
  status: RiskEscalationQueueItem["status"];
  owner_id: string | null;
  reason: string;
  created_at: string | Date;
  resolved_at: string | Date | null;
};

function toDateTimeLike(value: string | Date | null | undefined) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function rowToTemplate(row: RiskSopTemplateRow): RiskSopTemplate {
  return RiskSopTemplateSchema.parse({
    id: row.id,
    title: row.title,
    version: row.version,
    enabled: row.enabled,
    riskLevels: row.risk_levels,
    sources: row.sources,
    ownerRole: row.owner_role,
    steps: row.steps,
    resultTemplates: row.result_templates,
    updatedAt: toDateTimeLike(row.updated_at) ?? new Date(0).toISOString(),
  });
}

function rowToEscalation(row: RiskEscalationQueueRow): RiskEscalationQueueItem {
  return RiskEscalationQueueItemSchema.parse({
    id: row.id,
    riskEventId: row.risk_event_id,
    userId: row.user_id ?? undefined,
    priority: row.priority,
    status: row.status,
    ownerId: row.owner_id ?? undefined,
    reason: row.reason,
    createdAt: toDateTimeLike(row.created_at) ?? new Date(0).toISOString(),
    resolvedAt: toDateTimeLike(row.resolved_at),
  });
}

function auditValue(value: unknown) {
  return value === undefined ? null : JSON.stringify(value);
}

const templateReturningSql = `
  id,
  title,
  version,
  enabled,
  risk_levels,
  sources,
  owner_role,
  steps,
  result_templates,
  updated_at
`;

const escalationReturningSql = `
  id,
  risk_event_id,
  user_id,
  priority,
  status,
  owner_id,
  reason,
  created_at,
  resolved_at
`;

export class PostgresRiskSopStore implements RiskSopStore {
  private defaultTemplatesChecked = false;

  constructor(private readonly db: DatabaseQueryExecutor) {}

  async listTemplates() {
    await this.ensureDefaultTemplates();
    const result = await this.db.query<RiskSopTemplateRow>(
      `
        SELECT ${templateReturningSql}
        FROM risk_sop_templates
        ORDER BY id ASC
      `
    );

    return result.rows.map(rowToTemplate);
  }

  async saveTemplate(
    template: RiskSopTemplate,
    auditContext?: RiskSopAuditContext
  ) {
    const normalized = RiskSopTemplateSchema.parse(template);
    const previous =
      auditContext?.before === undefined
        ? await this.getTemplateById(normalized.id)
        : auditContext.before;

    return this.saveTemplateDirect(normalized, {
      ...auditContext,
      before: auditContext?.before ?? previous,
      after: auditContext?.after ?? normalized,
    });
  }

  async listEscalations() {
    const result = await this.db.query<RiskEscalationQueueRow>(
      `
        SELECT ${escalationReturningSql}
        FROM risk_escalation_queue_items
        ORDER BY
          CASE status
            WHEN 'resolved' THEN 1
            ELSE 0
          END ASC,
          CASE priority
            WHEN 'urgent' THEN 3
            WHEN 'high' THEN 2
            ELSE 1
          END DESC,
          created_at DESC
      `
    );

    return result.rows.map(rowToEscalation);
  }

  async upsertEscalation(
    item: RiskEscalationQueueItem,
    auditContext?: RiskSopAuditContext
  ) {
    const normalized = RiskEscalationQueueItemSchema.parse(item);
    const previous =
      auditContext?.before === undefined
        ? await this.getEscalationByRiskEventId(normalized.riskEventId)
        : auditContext.before;
    const context = {
      ...auditContext,
      before: auditContext?.before ?? previous,
      after: auditContext?.after ?? normalized,
    };

    const result = await this.db.query<RiskEscalationQueueRow>(
      `
        INSERT INTO risk_escalation_queue_items (
          id,
          risk_event_id,
          user_id,
          priority,
          status,
          owner_id,
          reason,
          created_at,
          resolved_at,
          audit_resource_type,
          audit_resource_id,
          last_actor_id,
          last_actor_roles,
          last_action,
          before_snapshot,
          after_snapshot,
          audit_updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          'risk_escalation_queue_item',
          $2,
          $10,
          $11,
          $12,
          $13::jsonb,
          $14::jsonb,
          $15
        )
        ON CONFLICT (risk_event_id) DO UPDATE SET
          id = EXCLUDED.id,
          user_id = EXCLUDED.user_id,
          priority = EXCLUDED.priority,
          status = EXCLUDED.status,
          owner_id = EXCLUDED.owner_id,
          reason = EXCLUDED.reason,
          created_at = EXCLUDED.created_at,
          resolved_at = EXCLUDED.resolved_at,
          audit_resource_type = EXCLUDED.audit_resource_type,
          audit_resource_id = EXCLUDED.audit_resource_id,
          last_actor_id = EXCLUDED.last_actor_id,
          last_actor_roles = EXCLUDED.last_actor_roles,
          last_action = EXCLUDED.last_action,
          before_snapshot = EXCLUDED.before_snapshot,
          after_snapshot = EXCLUDED.after_snapshot,
          audit_updated_at = EXCLUDED.audit_updated_at
        RETURNING ${escalationReturningSql}
      `,
      [
        normalized.id,
        normalized.riskEventId,
        normalized.userId ?? null,
        normalized.priority,
        normalized.status,
        normalized.ownerId ?? null,
        normalized.reason,
        normalized.createdAt,
        normalized.resolvedAt ?? null,
        context.actorId ?? null,
        context.actorRoles ?? [],
        context.action ?? null,
        auditValue(context.before),
        auditValue(context.after),
        context.occurredAt ?? normalized.resolvedAt ?? normalized.createdAt,
      ]
    );

    if (!result.rows[0]) throw new Error("RISK_ESCALATION_NOT_SAVED");
    return rowToEscalation(result.rows[0]);
  }

  async clear() {
    await this.db.query("DELETE FROM risk_escalation_queue_items");
    await this.db.query("DELETE FROM risk_sop_templates");
    this.defaultTemplatesChecked = false;
  }

  private async ensureDefaultTemplates() {
    if (this.defaultTemplatesChecked) return;

    const countResult = await this.db.query<{ count: number | string }>(
      "SELECT COUNT(*)::int AS count FROM risk_sop_templates"
    );
    const count = Number(countResult.rows[0]?.count ?? 0);
    if (count === 0) {
      for (const template of createDefaultRiskSopTemplates()) {
        await this.saveTemplateDirect(template, {
          action: "seed",
          reason: "初始化默认风险 SOP 模板",
          before: undefined,
          after: template,
          occurredAt: template.updatedAt,
        });
      }
    }

    this.defaultTemplatesChecked = true;
  }

  private async getTemplateById(templateId: string) {
    const result = await this.db.query<RiskSopTemplateRow>(
      `
        SELECT ${templateReturningSql}
        FROM risk_sop_templates
        WHERE id = $1
        LIMIT 1
      `,
      [templateId]
    );

    return result.rows[0] ? rowToTemplate(result.rows[0]) : undefined;
  }

  private async getEscalationByRiskEventId(riskEventId: string) {
    const result = await this.db.query<RiskEscalationQueueRow>(
      `
        SELECT ${escalationReturningSql}
        FROM risk_escalation_queue_items
        WHERE risk_event_id = $1
        LIMIT 1
      `,
      [riskEventId]
    );

    return result.rows[0] ? rowToEscalation(result.rows[0]) : undefined;
  }

  private async saveTemplateDirect(
    template: RiskSopTemplate,
    auditContext?: RiskSopAuditContext
  ) {
    const normalized = RiskSopTemplateSchema.parse(template);
    const result = await this.db.query<RiskSopTemplateRow>(
      `
        INSERT INTO risk_sop_templates (
          id,
          title,
          version,
          enabled,
          risk_levels,
          sources,
          owner_role,
          steps,
          result_templates,
          updated_at,
          audit_resource_type,
          audit_resource_id,
          last_actor_id,
          last_actor_roles,
          last_action,
          last_reason,
          before_snapshot,
          after_snapshot,
          audit_updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8::jsonb,
          $9::jsonb,
          $10,
          'risk_sop_template',
          $1,
          $11,
          $12,
          $13,
          $14,
          $15::jsonb,
          $16::jsonb,
          $17
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          version = EXCLUDED.version,
          enabled = EXCLUDED.enabled,
          risk_levels = EXCLUDED.risk_levels,
          sources = EXCLUDED.sources,
          owner_role = EXCLUDED.owner_role,
          steps = EXCLUDED.steps,
          result_templates = EXCLUDED.result_templates,
          updated_at = EXCLUDED.updated_at,
          audit_resource_type = EXCLUDED.audit_resource_type,
          audit_resource_id = EXCLUDED.audit_resource_id,
          last_actor_id = EXCLUDED.last_actor_id,
          last_actor_roles = EXCLUDED.last_actor_roles,
          last_action = EXCLUDED.last_action,
          last_reason = EXCLUDED.last_reason,
          before_snapshot = EXCLUDED.before_snapshot,
          after_snapshot = EXCLUDED.after_snapshot,
          audit_updated_at = EXCLUDED.audit_updated_at
        RETURNING ${templateReturningSql}
      `,
      [
        normalized.id,
        normalized.title,
        normalized.version,
        normalized.enabled,
        normalized.riskLevels,
        normalized.sources,
        normalized.ownerRole,
        JSON.stringify(normalized.steps),
        JSON.stringify(normalized.resultTemplates),
        normalized.updatedAt,
        auditContext?.actorId ?? null,
        auditContext?.actorRoles ?? [],
        auditContext?.action ?? null,
        auditContext?.reason ?? null,
        auditValue(auditContext?.before),
        auditValue(auditContext?.after),
        auditContext?.occurredAt ?? normalized.updatedAt,
      ]
    );

    if (!result.rows[0]) throw new Error("RISK_SOP_TEMPLATE_NOT_SAVED");
    return rowToTemplate(result.rows[0]);
  }
}
