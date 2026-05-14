import { describe, expect, it } from "vitest";
import type { RiskAdminReviewRecord } from "../../../shared/domain";
import type {
  DatabaseQueryExecutor,
  DatabaseQueryResult,
} from "../../db/postgres";
import { PostgresRiskReviewStore } from "./postgresRiskReviewStore";

type CapturedQuery = {
  text: string;
  values?: readonly unknown[];
};

class FakeRiskReviewExecutor implements DatabaseQueryExecutor {
  readonly queries: CapturedQuery[] = [];

  constructor(private readonly rows: Record<string, unknown[]> = {}) {}

  async query<Row>(
    text: string,
    values?: readonly unknown[]
  ): Promise<DatabaseQueryResult<Row>> {
    this.queries.push({ text, values });

    if (text.includes("INSERT INTO risk_admin_review_records")) {
      return {
        rows: (this.rows.savedReviewRecords ?? []) as Row[],
        rowCount: this.rows.savedReviewRecords?.length ?? 0,
      };
    }

    if (text.includes("FROM risk_admin_review_records")) {
      return {
        rows: (this.rows.reviewRecords ?? []) as Row[],
        rowCount: this.rows.reviewRecords?.length ?? 0,
      };
    }

    return { rows: [] as Row[], rowCount: 0 };
  }
}

const escalation = {
  id: "risk_escalation_1",
  riskEventId: "risk_1",
  userId: "user_1",
  priority: "urgent" as const,
  status: "assigned" as const,
  ownerId: "admin_1",
  reason: "需要负责人确认安全状态",
  createdAt: "2026-05-14T09:00:00.000Z",
};

const reviewRecord: RiskAdminReviewRecord = {
  id: "risk_review_1",
  riskEventId: "risk_1",
  userId: "user_1",
  action: "escalate",
  actorId: "operator_1",
  actorRoles: ["operator"],
  previousStatus: "reviewing",
  nextStatus: "escalated",
  note: "已升级至负责人队列",
  sopTemplateId: "sop_urgent_crisis_review",
  sopTemplateVersion: "2026.05.1",
  resultTemplateId: "result_urgent_escalate",
  escalation,
  createdAt: "2026-05-14T09:00:01.000Z",
};

const reviewRecordRow = {
  id: reviewRecord.id,
  risk_event_id: reviewRecord.riskEventId,
  user_id: reviewRecord.userId,
  action: reviewRecord.action,
  actor_id: reviewRecord.actorId,
  actor_roles: reviewRecord.actorRoles,
  previous_status: reviewRecord.previousStatus,
  next_status: reviewRecord.nextStatus,
  note: reviewRecord.note,
  sop_template_id: reviewRecord.sopTemplateId,
  sop_template_version: reviewRecord.sopTemplateVersion,
  result_template_id: reviewRecord.resultTemplateId,
  escalation_snapshot: escalation,
  created_at: new Date(reviewRecord.createdAt),
};

describe("postgres risk review store", () => {
  it("appends review records with audit projection snapshots", async () => {
    const db = new FakeRiskReviewExecutor({
      savedReviewRecords: [reviewRecordRow],
    });
    const store = new PostgresRiskReviewStore(db);

    const saved = await store.appendRecord(reviewRecord);

    expect(saved).toMatchObject({
      id: "risk_review_1",
      action: "escalate",
      nextStatus: "escalated",
      escalation: {
        status: "assigned",
      },
    });
    expect(db.queries[0]?.text).toContain("audit_resource_type");
    expect(db.queries[0]?.text).toContain("before_snapshot");
    expect(db.queries[0]?.text).toContain("after_snapshot");
    expect(JSON.parse(String(db.queries[0]?.values?.[13]))).toEqual({
      status: "reviewing",
    });
    expect(JSON.parse(String(db.queries[0]?.values?.[14]))).toMatchObject({
      status: "escalated",
      sopTemplateId: "sop_urgent_crisis_review",
      resultTemplateId: "result_urgent_escalate",
    });
  });

  it("maps review records from postgres rows", async () => {
    const db = new FakeRiskReviewExecutor({
      reviewRecords: [reviewRecordRow],
    });
    const store = new PostgresRiskReviewStore(db);

    expect(await store.listRecords("risk_1")).toMatchObject([
      {
        riskEventId: "risk_1",
        actorId: "operator_1",
        createdAt: "2026-05-14T09:00:01.000Z",
      },
    ]);
    expect(await store.listAllRecords()).toHaveLength(1);
  });

  it("clears persisted review records", async () => {
    const db = new FakeRiskReviewExecutor();
    const store = new PostgresRiskReviewStore(db);

    await store.clear();

    expect(db.queries.map(query => query.text)).toEqual([
      "DELETE FROM risk_admin_review_records",
    ]);
  });
});
