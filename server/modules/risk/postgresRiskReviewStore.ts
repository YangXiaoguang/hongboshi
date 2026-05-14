import {
  RiskAdminReviewRecordSchema,
  type RiskAdminReviewRecord,
} from "../../../shared/domain";
import type { DatabaseQueryExecutor } from "../../db/postgres";
import type { RiskReviewStore } from "./riskReviewStore";

type RiskReviewRecordRow = {
  id: string;
  risk_event_id: string;
  user_id: string | null;
  action: RiskAdminReviewRecord["action"];
  actor_id: string;
  actor_roles: string[];
  previous_status: RiskAdminReviewRecord["previousStatus"];
  next_status: RiskAdminReviewRecord["nextStatus"];
  note: string;
  sop_template_id: string | null;
  sop_template_version: string | null;
  result_template_id: string | null;
  escalation_snapshot: unknown | null;
  created_at: string | Date;
};

function toDateTimeLike(value: string | Date | null | undefined) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function recordBeforeSnapshot(record: RiskAdminReviewRecord) {
  return {
    status: record.previousStatus,
  };
}

function recordAfterSnapshot(record: RiskAdminReviewRecord) {
  return {
    status: record.nextStatus,
    sopTemplateId: record.sopTemplateId,
    sopTemplateVersion: record.sopTemplateVersion,
    resultTemplateId: record.resultTemplateId,
    escalation: record.escalation,
  };
}

function rowToRecord(row: RiskReviewRecordRow): RiskAdminReviewRecord {
  return RiskAdminReviewRecordSchema.parse({
    id: row.id,
    riskEventId: row.risk_event_id,
    userId: row.user_id ?? undefined,
    action: row.action,
    actorId: row.actor_id,
    actorRoles: row.actor_roles,
    previousStatus: row.previous_status,
    nextStatus: row.next_status,
    note: row.note,
    sopTemplateId: row.sop_template_id ?? undefined,
    sopTemplateVersion: row.sop_template_version ?? undefined,
    resultTemplateId: row.result_template_id ?? undefined,
    escalation: row.escalation_snapshot ?? undefined,
    createdAt: toDateTimeLike(row.created_at) ?? new Date(0).toISOString(),
  });
}

const reviewRecordReturningSql = `
  id,
  risk_event_id,
  user_id,
  action,
  actor_id,
  actor_roles,
  previous_status,
  next_status,
  note,
  sop_template_id,
  sop_template_version,
  result_template_id,
  escalation_snapshot,
  created_at
`;

export class PostgresRiskReviewStore implements RiskReviewStore {
  constructor(private readonly db: DatabaseQueryExecutor) {}

  async listRecords(riskEventId: string) {
    const result = await this.db.query<RiskReviewRecordRow>(
      `
        SELECT ${reviewRecordReturningSql}
        FROM risk_admin_review_records
        WHERE risk_event_id = $1
        ORDER BY created_at DESC
      `,
      [riskEventId]
    );

    return result.rows.map(rowToRecord);
  }

  async listAllRecords() {
    const result = await this.db.query<RiskReviewRecordRow>(
      `
        SELECT ${reviewRecordReturningSql}
        FROM risk_admin_review_records
        ORDER BY created_at DESC
      `
    );

    return result.rows.map(rowToRecord);
  }

  async appendRecord(record: RiskAdminReviewRecord) {
    const normalized = RiskAdminReviewRecordSchema.parse(record);
    const result = await this.db.query<RiskReviewRecordRow>(
      `
        INSERT INTO risk_admin_review_records (
          id,
          risk_event_id,
          user_id,
          action,
          actor_id,
          actor_roles,
          previous_status,
          next_status,
          note,
          sop_template_id,
          sop_template_version,
          result_template_id,
          escalation_snapshot,
          audit_resource_type,
          audit_resource_id,
          before_snapshot,
          after_snapshot,
          created_at
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
          $10,
          $11,
          $12,
          $13::jsonb,
          'risk_event',
          $2,
          $14::jsonb,
          $15::jsonb,
          $16
        )
        RETURNING ${reviewRecordReturningSql}
      `,
      [
        normalized.id,
        normalized.riskEventId,
        normalized.userId ?? null,
        normalized.action,
        normalized.actorId,
        normalized.actorRoles,
        normalized.previousStatus,
        normalized.nextStatus,
        normalized.note,
        normalized.sopTemplateId ?? null,
        normalized.sopTemplateVersion ?? null,
        normalized.resultTemplateId ?? null,
        normalized.escalation ? JSON.stringify(normalized.escalation) : null,
        JSON.stringify(recordBeforeSnapshot(normalized)),
        JSON.stringify(recordAfterSnapshot(normalized)),
        normalized.createdAt,
      ]
    );

    if (!result.rows[0]) throw new Error("RISK_REVIEW_RECORD_NOT_SAVED");
    return rowToRecord(result.rows[0]);
  }

  async clear() {
    await this.db.query("DELETE FROM risk_admin_review_records");
  }
}
