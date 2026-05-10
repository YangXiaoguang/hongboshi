import { describe, expect, it } from "vitest";
import type {
  DatabaseQueryExecutor,
  DatabaseQueryResult,
} from "../../db/postgres";
import type { AssessmentResult } from "../../../shared/domain";
import { PostgresAssessmentResultStore } from "./postgresAssessmentResultStore";

type CapturedQuery = {
  text: string;
  values?: readonly unknown[];
};

const dimensions: AssessmentResult["report"]["dimensions"] = {
  emotion: 80,
  sleep: 20,
  relationship: 10,
  parent_child: 0,
  workplace: 100,
  self_growth: 30,
  risk: 0,
};

const recommendations: AssessmentResult["report"]["recommendations"] = [
  {
    target: "counseling",
    title: "预约咨询",
    reason: "需要专业支持",
    priority: 100,
  },
];

class FakeAssessmentResultExecutor implements DatabaseQueryExecutor {
  readonly queries: CapturedQuery[] = [];

  constructor(private readonly rows: Record<string, unknown[]> = {}) {}

  async query<Row>(
    text: string,
    values?: readonly unknown[]
  ): Promise<DatabaseQueryResult<Row>> {
    this.queries.push({ text, values });

    if (text.includes("INSERT INTO assessment_reports")) {
      return {
        rows: [
          {
            id: values?.[0],
            user_id: values?.[1],
            dimensions: JSON.parse(String(values?.[3])),
            risk_level: values?.[4],
            summary: values?.[5],
            recommendations: JSON.parse(String(values?.[6])),
            risk_event_id: values?.[7],
            created_at: values?.[8],
          } as Row,
        ],
        rowCount: 1,
      };
    }

    if (text.includes("LIMIT 1")) {
      return {
        rows: (this.rows.latest ?? []) as Row[],
        rowCount: this.rows.latest?.length ?? 0,
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

describe("postgres assessment result store", () => {
  it("maps saved assessment results to the assessment_reports table", async () => {
    const db = new FakeAssessmentResultExecutor();
    const store = new PostgresAssessmentResultStore(db);

    const saved = await store.save("user_1", {
      report: {
        id: "report_quick_psychological_check_1778400000000",
        userId: "user_1",
        dimensions,
        riskLevel: "high",
        summary: "当前状态建议获得专业支持。",
        recommendations,
        createdAt: "2026-05-10T08:00:00.000Z",
      },
      riskEvent: {
        id: "risk_quick_psychological_check_1778400000000",
        userId: "user_1",
        source: "assessment",
        riskLevel: "high",
        signal: "当前状态建议获得专业支持。",
        status: "open",
        createdAt: "2026-05-10T08:00:00.000Z",
      },
    });

    expect(saved.report).toMatchObject({
      id: "report_quick_psychological_check_1778400000000",
      userId: "user_1",
      riskLevel: "high",
    });
    expect(saved.riskEvent?.id).toBe(
      "risk_quick_psychological_check_1778400000000"
    );
    expect(db.queries[0]?.text).toContain("INSERT INTO assessment_reports");
    expect(db.queries[0]?.values).toEqual([
      "report_quick_psychological_check_1778400000000",
      "user_1",
      "quick_psychological_check",
      JSON.stringify(dimensions),
      "high",
      "当前状态建议获得专业支持。",
      JSON.stringify(recommendations),
      "risk_quick_psychological_check_1778400000000",
      "2026-05-10T08:00:00.000Z",
    ]);
  });

  it("converts PostgreSQL timestamp rows into domain datetime strings", async () => {
    const db = new FakeAssessmentResultExecutor({
      latest: [
        {
          id: "report_1",
          user_id: "user_1",
          dimensions,
          risk_level: "medium",
          summary: "建议持续观察情绪与睡眠。",
          recommendations,
          risk_event_id: null,
          created_at: new Date("2026-05-10T09:00:00.000Z"),
        },
      ],
    });
    const store = new PostgresAssessmentResultStore(db);

    const result = await store.latest("user_1");

    expect(result?.report).toMatchObject({
      id: "report_1",
      userId: "user_1",
      createdAt: "2026-05-10T09:00:00.000Z",
    });
    expect(db.queries[0]?.text).toContain("ORDER BY created_at DESC");
    expect(db.queries[0]?.values).toEqual(["user_1"]);
  });
});
