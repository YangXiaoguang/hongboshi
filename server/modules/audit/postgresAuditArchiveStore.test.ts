import { describe, expect, it } from "vitest";
import type { AuditCenterArchiveEvent } from "../../../shared/domain";
import type {
  DatabaseQueryExecutor,
  DatabaseQueryResult,
} from "../../db/postgres";
import { PostgresAuditArchiveStore } from "./postgresAuditArchiveStore";

type CapturedQuery = {
  text: string;
  values?: readonly unknown[];
};

class FakeAuditArchiveExecutor implements DatabaseQueryExecutor {
  readonly queries: CapturedQuery[] = [];

  constructor(private readonly rows: Record<string, unknown[]> = {}) {}

  async query<Row>(
    text: string,
    values?: readonly unknown[]
  ): Promise<DatabaseQueryResult<Row>> {
    this.queries.push({ text, values });

    if (text.includes("INSERT INTO audit_center_archived_events")) {
      return {
        rows: (this.rows.savedArchiveEvents ?? []) as Row[],
        rowCount: this.rows.savedArchiveEvents?.length ?? 0,
      };
    }

    if (text.includes("COUNT(*)")) {
      return {
        rows: (this.rows.countRows ?? [{ count: "0" }]) as Row[],
        rowCount: this.rows.countRows?.length ?? 1,
      };
    }

    if (text.includes("FROM audit_center_archived_events")) {
      return {
        rows: (this.rows.archiveEvents ?? []) as Row[],
        rowCount: this.rows.archiveEvents?.length ?? 0,
      };
    }

    return { rows: [] as Row[], rowCount: 0 };
  }
}

const archiveEvent: AuditCenterArchiveEvent = {
  id: "transaction:transaction_audit_1",
  idempotencyKey: "transaction:transaction_audit_1",
  source: {
    module: "transaction",
    sourceEventId: "transaction_audit_1",
    sourceStore: "TransactionOperationStore",
    sourceTable: "transaction_admin_audit_events",
    sourceRecordId: "transaction_audit_1",
    sourceOccurredAt: "2026-05-14T09:30:00.000Z",
  },
  module: "transaction",
  action: "request_refund",
  resource: {
    type: "transaction",
    id: "txn_1",
    label: "交易 txn_1",
  },
  actor: {
    id: "operator_1",
    roles: ["operator"],
  },
  reason: "用户提交退款申请",
  summary: "交易 txn_1 执行 request_refund",
  beforeSummary: {
    orderStatus: "paid",
  },
  afterSummary: {
    orderStatus: "refunding",
  },
  occurredAt: "2026-05-14T09:30:00.000Z",
  archivedAt: "2026-05-14T12:00:00.000Z",
  schemaVersion: "audit-center-archive-v1",
  policyVersion: "audit-center-privacy-v1",
  privacyLevel: "summary_only",
  backfillBatchId: "audit_archive_20260514120000",
};

const archiveRow = {
  id: archiveEvent.id,
  idempotency_key: archiveEvent.idempotencyKey,
  source_module: archiveEvent.source.module,
  source_event_id: archiveEvent.source.sourceEventId,
  source_store: archiveEvent.source.sourceStore,
  source_table: archiveEvent.source.sourceTable,
  source_record_id: archiveEvent.source.sourceRecordId,
  module: archiveEvent.module,
  action: archiveEvent.action,
  resource_type: archiveEvent.resource.type,
  resource_id: archiveEvent.resource.id,
  resource_label: archiveEvent.resource.label,
  actor_id: archiveEvent.actor.id,
  actor_roles: archiveEvent.actor.roles,
  reason: archiveEvent.reason,
  summary: archiveEvent.summary,
  before_summary: archiveEvent.beforeSummary,
  after_summary: archiveEvent.afterSummary,
  occurred_at: new Date(archiveEvent.occurredAt),
  archived_at: new Date(archiveEvent.archivedAt),
  schema_version: archiveEvent.schemaVersion,
  policy_version: archiveEvent.policyVersion,
  privacy_level: archiveEvent.privacyLevel,
  backfill_batch_id: archiveEvent.backfillBatchId,
};

describe("postgres audit archive store", () => {
  it("upserts archived events with an idempotency key", async () => {
    const db = new FakeAuditArchiveExecutor({
      savedArchiveEvents: [archiveRow],
    });
    const store = new PostgresAuditArchiveStore(db);

    const result = await store.upsertArchivedEvents([archiveEvent]);

    expect(result).toEqual({
      archivedCount: 1,
      skippedCount: 0,
    });
    expect(db.queries[0]?.text).toContain(
      "INSERT INTO audit_center_archived_events"
    );
    expect(db.queries[0]?.text).toContain(
      "ON CONFLICT (idempotency_key) DO NOTHING"
    );
    expect(db.queries[0]?.values?.[1]).toBe("transaction:transaction_audit_1");
    expect(db.queries[0]?.values?.[16]).toBe(
      JSON.stringify({ orderStatus: "paid" })
    );
  });

  it("counts duplicate upserts as skipped", async () => {
    const db = new FakeAuditArchiveExecutor({
      savedArchiveEvents: [],
    });
    const store = new PostgresAuditArchiveStore(db);

    expect(await store.upsertArchivedEvents([archiveEvent])).toEqual({
      archivedCount: 0,
      skippedCount: 1,
    });
  });

  it("lists and counts archived events by module and batch", async () => {
    const db = new FakeAuditArchiveExecutor({
      archiveEvents: [archiveRow],
      countRows: [{ count: "1" }],
    });
    const store = new PostgresAuditArchiveStore(db);

    const events = await store.listArchivedEvents({
      module: "transaction",
      batchId: "audit_archive_20260514120000",
      limit: 10,
    });
    const count = await store.countArchivedEvents({
      module: "transaction",
      batchId: "audit_archive_20260514120000",
    });

    expect(events).toMatchObject([
      {
        id: "transaction:transaction_audit_1",
        source: {
          sourceStore: "TransactionOperationStore",
        },
      },
    ]);
    expect(count).toBe(1);
    expect(db.queries[0]?.values).toEqual([
      "transaction",
      "audit_archive_20260514120000",
      10,
    ]);
    expect(db.queries[1]?.values).toEqual([
      "transaction",
      "audit_archive_20260514120000",
    ]);
  });

  it("clears archived events during tests or manual rollback", async () => {
    const db = new FakeAuditArchiveExecutor();
    const store = new PostgresAuditArchiveStore(db);

    await store.clear();

    expect(db.queries.map(query => query.text)).toEqual([
      "DELETE FROM audit_center_archived_events",
    ]);
  });
});
