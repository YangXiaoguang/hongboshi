import { describe, expect, it } from "vitest";
import type {
  RiskEscalationQueueItem,
  RiskSopTemplate,
} from "../../../shared/domain";
import type {
  DatabaseQueryExecutor,
  DatabaseQueryResult,
} from "../../db/postgres";
import {
  createDefaultRiskSopTemplates,
  type RiskSopAuditContext,
} from "./riskSopStore";
import { PostgresRiskSopStore } from "./postgresRiskSopStore";

type CapturedQuery = {
  text: string;
  values?: readonly unknown[];
};

function jsonValue<T>(value: unknown): T {
  return typeof value === "string" ? JSON.parse(value) : (value as T);
}

function rowFromTemplate(template: RiskSopTemplate) {
  return {
    id: template.id,
    title: template.title,
    version: template.version,
    enabled: template.enabled,
    risk_levels: template.riskLevels,
    sources: template.sources,
    owner_role: template.ownerRole,
    steps: template.steps,
    result_templates: template.resultTemplates,
    updated_at: new Date(template.updatedAt),
  };
}

function rowFromEscalation(item: RiskEscalationQueueItem) {
  return {
    id: item.id,
    risk_event_id: item.riskEventId,
    user_id: item.userId ?? null,
    priority: item.priority,
    status: item.status,
    owner_id: item.ownerId ?? null,
    reason: item.reason,
    created_at: new Date(item.createdAt),
    resolved_at: item.resolvedAt ? new Date(item.resolvedAt) : null,
  };
}

class FakeRiskSopExecutor implements DatabaseQueryExecutor {
  readonly queries: CapturedQuery[] = [];
  private templateRows: unknown[];
  private escalationRows: unknown[];

  constructor(private readonly seededRows: Record<string, unknown[]> = {}) {
    this.templateRows = [...(seededRows.templateRows ?? [])];
    this.escalationRows = [...(seededRows.escalationRows ?? [])];
  }

  async query<Row>(
    text: string,
    values?: readonly unknown[]
  ): Promise<DatabaseQueryResult<Row>> {
    this.queries.push({ text, values });

    if (
      text.includes("SELECT COUNT(*)::int AS count FROM risk_sop_templates")
    ) {
      return {
        rows: [{ count: this.templateRows.length }] as Row[],
        rowCount: 1,
      };
    }

    if (text.includes("INSERT INTO risk_sop_templates")) {
      const row =
        this.seededRows.savedTemplates?.[0] ??
        rowFromTemplate({
          id: String(values?.[0]),
          title: String(values?.[1]),
          version: String(values?.[2]),
          enabled: Boolean(values?.[3]),
          riskLevels: values?.[4] as RiskSopTemplate["riskLevels"],
          sources: values?.[5] as RiskSopTemplate["sources"],
          ownerRole: String(values?.[6]),
          steps: jsonValue<RiskSopTemplate["steps"]>(values?.[7]),
          resultTemplates: jsonValue<RiskSopTemplate["resultTemplates"]>(
            values?.[8]
          ),
          updatedAt: String(values?.[9]),
        });

      this.templateRows = [
        ...this.templateRows.filter(
          item => (item as { id: string }).id !== (row as { id: string }).id
        ),
        row,
      ];

      return { rows: [row] as Row[], rowCount: 1 };
    }

    if (
      text.includes("FROM risk_sop_templates") &&
      text.includes("WHERE id = $1")
    ) {
      const row =
        this.seededRows.templateById?.[0] ??
        this.templateRows.find(
          item => (item as { id: string }).id === values?.[0]
        );
      return {
        rows: (row ? [row] : []) as Row[],
        rowCount: row ? 1 : 0,
      };
    }

    if (text.includes("FROM risk_sop_templates")) {
      const rows = [...this.templateRows].sort((left, right) =>
        String((left as { id: string }).id).localeCompare(
          String((right as { id: string }).id)
        )
      );
      return { rows: rows as Row[], rowCount: rows.length };
    }

    if (text.includes("INSERT INTO risk_escalation_queue_items")) {
      const row =
        this.seededRows.savedEscalations?.[0] ??
        rowFromEscalation({
          id: String(values?.[0]),
          riskEventId: String(values?.[1]),
          userId: values?.[2] ? String(values[2]) : undefined,
          priority: values?.[3] as RiskEscalationQueueItem["priority"],
          status: values?.[4] as RiskEscalationQueueItem["status"],
          ownerId: values?.[5] ? String(values[5]) : undefined,
          reason: String(values?.[6]),
          createdAt: String(values?.[7]),
          resolvedAt: values?.[8] ? String(values[8]) : undefined,
        });

      this.escalationRows = [
        ...this.escalationRows.filter(
          item =>
            (item as { risk_event_id: string }).risk_event_id !==
            (row as { risk_event_id: string }).risk_event_id
        ),
        row,
      ];

      return { rows: [row] as Row[], rowCount: 1 };
    }

    if (
      text.includes("FROM risk_escalation_queue_items") &&
      text.includes("WHERE risk_event_id = $1")
    ) {
      const row =
        this.seededRows.escalationByRiskEventId?.[0] ??
        this.escalationRows.find(
          item =>
            (item as { risk_event_id: string }).risk_event_id === values?.[0]
        );
      return {
        rows: (row ? [row] : []) as Row[],
        rowCount: row ? 1 : 0,
      };
    }

    if (text.includes("FROM risk_escalation_queue_items")) {
      return {
        rows: this.escalationRows as Row[],
        rowCount: this.escalationRows.length,
      };
    }

    if (text === "DELETE FROM risk_escalation_queue_items") {
      this.escalationRows = [];
    }

    if (text === "DELETE FROM risk_sop_templates") {
      this.templateRows = [];
    }

    return { rows: [] as Row[], rowCount: 0 };
  }
}

const baseTemplate = createDefaultRiskSopTemplates()[0];
if (!baseTemplate) throw new Error("expected default SOP template");

const updatedTemplate: RiskSopTemplate = {
  ...baseTemplate,
  enabled: false,
  version: "2026.05.2",
  updatedAt: "2026-05-14T10:00:00.000Z",
};

const escalation: RiskEscalationQueueItem = {
  id: "risk_escalation_1",
  riskEventId: "risk_1",
  userId: "user_1",
  priority: "urgent",
  status: "assigned",
  ownerId: "admin_1",
  reason: "需要负责人确认安全状态",
  createdAt: "2026-05-14T10:00:00.000Z",
};

const auditContext: RiskSopAuditContext = {
  actorId: "admin_1",
  actorRoles: ["admin"],
  action: "update",
  reason: "暂停模板测试",
  before: baseTemplate,
  after: updatedTemplate,
  occurredAt: "2026-05-14T10:00:00.000Z",
};

describe("postgres risk SOP store", () => {
  it("seeds default templates before listing postgres templates", async () => {
    const db = new FakeRiskSopExecutor();
    const store = new PostgresRiskSopStore(db);

    const templates = await store.listTemplates();

    expect(templates.map(template => template.id)).toEqual([
      "sop_high_followup_review",
      "sop_medium_observation_review",
      "sop_urgent_crisis_review",
    ]);
    expect(
      db.queries.filter(query =>
        query.text.includes("INSERT INTO risk_sop_templates")
      )
    ).toHaveLength(3);
    expect(db.queries[0]?.text).toContain("COUNT");
  });

  it("upserts templates with audit actor and snapshots", async () => {
    const db = new FakeRiskSopExecutor({
      templateById: [rowFromTemplate(baseTemplate)],
      savedTemplates: [rowFromTemplate(updatedTemplate)],
    });
    const store = new PostgresRiskSopStore(db);

    const saved = await store.saveTemplate(updatedTemplate, auditContext);

    expect(saved).toMatchObject({
      id: baseTemplate.id,
      enabled: false,
      version: "2026.05.2",
    });
    const insertQuery = db.queries.find(query =>
      query.text.includes("INSERT INTO risk_sop_templates")
    );
    expect(insertQuery?.text).toContain("ON CONFLICT (id)");
    expect(insertQuery?.values?.[10]).toBe("admin_1");
    expect(insertQuery?.values?.[11]).toEqual(["admin"]);
    expect(insertQuery?.values?.[12]).toBe("update");
    expect(insertQuery?.values?.[13]).toBe("暂停模板测试");
    expect(JSON.parse(String(insertQuery?.values?.[14]))).toMatchObject({
      id: baseTemplate.id,
      enabled: true,
    });
    expect(JSON.parse(String(insertQuery?.values?.[15]))).toMatchObject({
      id: baseTemplate.id,
      enabled: false,
    });
  });

  it("upserts escalation queue items with audit actor and snapshots", async () => {
    const resolvedEscalation: RiskEscalationQueueItem = {
      ...escalation,
      status: "resolved",
      resolvedAt: "2026-05-14T10:30:00.000Z",
    };
    const db = new FakeRiskSopExecutor({
      escalationByRiskEventId: [rowFromEscalation(escalation)],
      savedEscalations: [rowFromEscalation(resolvedEscalation)],
    });
    const store = new PostgresRiskSopStore(db);

    const saved = await store.upsertEscalation(resolvedEscalation, {
      actorId: "admin_1",
      actorRoles: ["admin"],
      action: "resolve",
      reason: "风险复核完成",
      before: escalation,
      after: resolvedEscalation,
      occurredAt: "2026-05-14T10:30:00.000Z",
    });

    expect(saved).toMatchObject({
      riskEventId: "risk_1",
      status: "resolved",
    });
    const insertQuery = db.queries.find(query =>
      query.text.includes("INSERT INTO risk_escalation_queue_items")
    );
    expect(insertQuery?.text).toContain("ON CONFLICT (risk_event_id)");
    expect(insertQuery?.values?.[9]).toBe("admin_1");
    expect(insertQuery?.values?.[11]).toBe("resolve");
    expect(JSON.parse(String(insertQuery?.values?.[12]))).toMatchObject({
      status: "assigned",
    });
    expect(JSON.parse(String(insertQuery?.values?.[13]))).toMatchObject({
      status: "resolved",
    });
  });

  it("clears escalation queue before SOP templates", async () => {
    const db = new FakeRiskSopExecutor();
    const store = new PostgresRiskSopStore(db);

    await store.clear();

    expect(db.queries.map(query => query.text)).toEqual([
      "DELETE FROM risk_escalation_queue_items",
      "DELETE FROM risk_sop_templates",
    ]);
  });
});
