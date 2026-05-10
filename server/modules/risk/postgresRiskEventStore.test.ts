import { describe, expect, it } from "vitest";
import type {
  DatabaseQueryExecutor,
  DatabaseQueryResult,
} from "../../db/postgres";
import { PostgresRiskEventStore } from "./postgresRiskEventStore";

type CapturedQuery = {
  text: string;
  values?: readonly unknown[];
};

class FakeRiskEventExecutor implements DatabaseQueryExecutor {
  readonly queries: CapturedQuery[] = [];

  constructor(private readonly rows: Record<string, unknown[]> = {}) {}

  async query<Row>(
    text: string,
    values?: readonly unknown[]
  ): Promise<DatabaseQueryResult<Row>> {
    this.queries.push({ text, values });

    if (text.includes("INSERT INTO risk_events")) {
      return {
        rows: [
          {
            id: values?.[0],
            user_id: values?.[1],
            source: values?.[2],
            risk_level: values?.[3],
            signal: values?.[4],
            status: values?.[5],
            reviewer_id: values?.[6],
            created_at: values?.[7],
            resolved_at: values?.[8],
          } as Row,
        ],
        rowCount: 1,
      };
    }

    if (text.includes("WHERE id = $1")) {
      return {
        rows: (this.rows.get ?? []) as Row[],
        rowCount: this.rows.get?.length ?? 0,
      };
    }

    if (text.includes("WHERE user_id = $1")) {
      return {
        rows: (this.rows.list ?? []) as Row[],
        rowCount: this.rows.list?.length ?? 0,
      };
    }

    return { rows: [] as Row[], rowCount: 0 };
  }
}

describe("postgres risk event store", () => {
  it("maps saved risk events to the risk_events table", async () => {
    const db = new FakeRiskEventExecutor();
    const store = new PostgresRiskEventStore(db);

    const saved = await store.save({
      id: "risk_1",
      userId: "user_1",
      source: "assessment",
      riskLevel: "high",
      signal: "高风险测评结果",
      status: "open",
      createdAt: "2026-05-10T08:00:00.000Z",
    });

    expect(saved).toMatchObject({
      id: "risk_1",
      userId: "user_1",
      source: "assessment",
      riskLevel: "high",
    });
    expect(db.queries[0]?.text).toContain("INSERT INTO risk_events");
    expect(db.queries[0]?.values).toEqual([
      "risk_1",
      "user_1",
      "assessment",
      "high",
      "高风险测评结果",
      "open",
      null,
      "2026-05-10T08:00:00.000Z",
      null,
    ]);
  });

  it("converts PostgreSQL timestamp rows into domain datetime strings", async () => {
    const db = new FakeRiskEventExecutor({
      list: [
        {
          id: "risk_2",
          user_id: "user_1",
          source: "counseling_intake",
          risk_level: "urgent",
          signal: "咨询前信息包含危机支持诉求",
          status: "reviewing",
          reviewer_id: "operator_1",
          created_at: new Date("2026-05-10T09:00:00.000Z"),
          resolved_at: null,
        },
      ],
    });
    const store = new PostgresRiskEventStore(db);

    const events = await store.listByUser("user_1");

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: "risk_2",
      reviewerId: "operator_1",
      createdAt: "2026-05-10T09:00:00.000Z",
    });
    expect(db.queries[0]?.text).toContain("ORDER BY created_at DESC");
    expect(db.queries[0]?.values).toEqual(["user_1"]);
  });
});
