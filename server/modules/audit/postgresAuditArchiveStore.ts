import {
  AuditCenterArchiveEventSchema,
  type AuditCenterArchiveEvent,
} from "../../../shared/domain";
import type { DatabaseQueryExecutor } from "../../db/postgres";
import type {
  AuditArchiveListQuery,
  AuditArchiveStore,
  AuditArchiveUpsertResult,
} from "./auditArchiveStore";

type AuditArchiveRow = {
  id: string;
  idempotency_key: string;
  source_module: AuditCenterArchiveEvent["source"]["module"];
  source_event_id: string;
  source_store: string;
  source_table: string | null;
  source_record_id: string | null;
  module: AuditCenterArchiveEvent["module"];
  action: string;
  resource_type: string;
  resource_id: string | null;
  resource_label: string | null;
  actor_id: string | null;
  actor_roles: string[];
  reason: string | null;
  summary: string;
  before_summary: unknown;
  after_summary: unknown;
  occurred_at: string | Date;
  archived_at: string | Date;
  schema_version: string;
  policy_version: string;
  privacy_level: AuditCenterArchiveEvent["privacyLevel"];
  backfill_batch_id: string | null;
};

type CountRow = {
  count: string | number | bigint;
};

function toDateTimeLike(value: string | Date | null | undefined) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function countFromRow(row: CountRow | undefined) {
  if (!row) return 0;
  if (typeof row.count === "bigint") return Number(row.count);
  if (typeof row.count === "number") return row.count;
  return Number.parseInt(row.count, 10) || 0;
}

function rowToArchiveEvent(row: AuditArchiveRow) {
  return AuditCenterArchiveEventSchema.parse({
    id: row.id,
    idempotencyKey: row.idempotency_key,
    source: {
      module: row.source_module,
      sourceEventId: row.source_event_id,
      sourceStore: row.source_store,
      sourceTable: row.source_table ?? undefined,
      sourceRecordId: row.source_record_id ?? undefined,
      sourceOccurredAt: toDateTimeLike(row.occurred_at),
    },
    module: row.module,
    action: row.action,
    resource: {
      type: row.resource_type,
      id: row.resource_id ?? undefined,
      label: row.resource_label ?? undefined,
    },
    actor: {
      id: row.actor_id ?? undefined,
      roles: row.actor_roles,
    },
    reason: row.reason ?? undefined,
    summary: row.summary,
    beforeSummary: row.before_summary,
    afterSummary: row.after_summary,
    occurredAt: toDateTimeLike(row.occurred_at) ?? new Date(0).toISOString(),
    archivedAt: toDateTimeLike(row.archived_at) ?? new Date(0).toISOString(),
    schemaVersion: row.schema_version,
    policyVersion: row.policy_version,
    privacyLevel: row.privacy_level,
    backfillBatchId: row.backfill_batch_id ?? undefined,
  });
}

const archiveReturningSql = `
  id,
  idempotency_key,
  source_module,
  source_event_id,
  source_store,
  source_table,
  source_record_id,
  module,
  action,
  resource_type,
  resource_id,
  resource_label,
  actor_id,
  actor_roles,
  reason,
  summary,
  before_summary,
  after_summary,
  occurred_at,
  archived_at,
  schema_version,
  policy_version,
  privacy_level,
  backfill_batch_id
`;

function listWhereClause(query: AuditArchiveListQuery | undefined) {
  return {
    text: `
      WHERE ($1::text IS NULL OR module = $1)
        AND ($2::text IS NULL OR backfill_batch_id = $2)
    `,
    values: [query?.module ?? null, query?.batchId ?? null] as const,
  };
}

export class PostgresAuditArchiveStore implements AuditArchiveStore {
  constructor(private readonly db: DatabaseQueryExecutor) {}

  async upsertArchivedEvents(
    events: AuditCenterArchiveEvent[]
  ): Promise<AuditArchiveUpsertResult> {
    let archivedCount = 0;
    let skippedCount = 0;

    for (const event of events) {
      const normalized = AuditCenterArchiveEventSchema.parse(event);
      const result = await this.db.query<AuditArchiveRow>(
        `
          INSERT INTO audit_center_archived_events (
            id,
            idempotency_key,
            source_module,
            source_event_id,
            source_store,
            source_table,
            source_record_id,
            module,
            action,
            resource_type,
            resource_id,
            resource_label,
            actor_id,
            actor_roles,
            reason,
            summary,
            before_summary,
            after_summary,
            occurred_at,
            archived_at,
            schema_version,
            policy_version,
            privacy_level,
            backfill_batch_id
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14, $15, $16,
            $17, $18, $19, $20, $21, $22, $23, $24
          )
          ON CONFLICT (idempotency_key) DO NOTHING
          RETURNING ${archiveReturningSql}
        `,
        [
          normalized.id,
          normalized.idempotencyKey,
          normalized.source.module,
          normalized.source.sourceEventId,
          normalized.source.sourceStore,
          normalized.source.sourceTable ?? null,
          normalized.source.sourceRecordId ?? null,
          normalized.module,
          normalized.action,
          normalized.resource.type,
          normalized.resource.id ?? null,
          normalized.resource.label ?? null,
          normalized.actor.id ?? null,
          normalized.actor.roles,
          normalized.reason ?? null,
          normalized.summary,
          JSON.stringify(normalized.beforeSummary),
          JSON.stringify(normalized.afterSummary),
          normalized.occurredAt,
          normalized.archivedAt,
          normalized.schemaVersion,
          normalized.policyVersion,
          normalized.privacyLevel,
          normalized.backfillBatchId ?? null,
        ]
      );

      if (result.rowCount && result.rowCount > 0) archivedCount += 1;
      else skippedCount += 1;
    }

    return {
      archivedCount,
      skippedCount,
    };
  }

  async listArchivedEvents(query?: AuditArchiveListQuery) {
    const where = listWhereClause(query);
    const limit = query?.limit ?? 100;
    const orderColumn =
      query?.sortBy === "archivedAt" ? "archived_at" : "occurred_at";
    const result = await this.db.query<AuditArchiveRow>(
      `
        SELECT ${archiveReturningSql}
        FROM audit_center_archived_events
        ${where.text}
        ORDER BY ${orderColumn} DESC, id DESC
        LIMIT $3
      `,
      [...where.values, limit]
    );

    return result.rows.map(rowToArchiveEvent);
  }

  async countArchivedEvents(query?: AuditArchiveListQuery) {
    const where = listWhereClause(query);
    const result = await this.db.query<CountRow>(
      `
        SELECT COUNT(*) AS count
        FROM audit_center_archived_events
        ${where.text}
      `,
      [...where.values]
    );

    return countFromRow(result.rows[0]);
  }

  async clear() {
    await this.db.query("DELETE FROM audit_center_archived_events");
  }
}
