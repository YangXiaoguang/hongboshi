import {
  AssessmentResultSchema,
  type AssessmentResult,
} from "../../../shared/domain";
import type { DatabaseQueryExecutor } from "../../db/postgres";

type AssessmentReportRow = {
  id: string;
  user_id: string;
  dimensions: unknown;
  risk_level: AssessmentResult["report"]["riskLevel"];
  summary: string;
  recommendations: unknown;
  risk_event_id: string | null;
  created_at: string | Date;
};

function toDateTimeLike(value: string | Date) {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function resolveFlowId(result: AssessmentResult) {
  const match = result.report.id.match(/^report_(.+)_\d+$/);
  return match?.[1] ?? "unknown";
}

export function assessmentReportRowToDomain(
  row: AssessmentReportRow
): AssessmentResult {
  return AssessmentResultSchema.parse({
    report: {
      id: row.id,
      userId: row.user_id,
      dimensions: row.dimensions,
      riskLevel: row.risk_level,
      summary: row.summary,
      recommendations: row.recommendations,
      createdAt: toDateTimeLike(row.created_at),
    },
  });
}

export class PostgresAssessmentResultStore {
  constructor(private readonly db: DatabaseQueryExecutor) {}

  async save(
    userId: string,
    result: AssessmentResult
  ): Promise<AssessmentResult> {
    const normalized = AssessmentResultSchema.parse(result);
    const report = normalized.report;
    const dbUserId = report.userId ?? userId;

    const saved = await this.db.query<AssessmentReportRow>(
      `
        INSERT INTO assessment_reports (
          id,
          user_id,
          flow_id,
          dimensions,
          risk_level,
          summary,
          recommendations,
          risk_event_id,
          created_at
        )
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          flow_id = EXCLUDED.flow_id,
          dimensions = EXCLUDED.dimensions,
          risk_level = EXCLUDED.risk_level,
          summary = EXCLUDED.summary,
          recommendations = EXCLUDED.recommendations,
          risk_event_id = EXCLUDED.risk_event_id
        RETURNING
          id,
          user_id,
          dimensions,
          risk_level,
          summary,
          recommendations,
          risk_event_id,
          created_at
      `,
      [
        report.id,
        dbUserId,
        resolveFlowId(normalized),
        JSON.stringify(report.dimensions),
        report.riskLevel,
        report.summary,
        JSON.stringify(report.recommendations),
        normalized.riskEvent?.id ?? null,
        report.createdAt,
      ]
    );

    const row = saved.rows[0];
    if (!row) throw new Error("Assessment report save did not return a row");
    const savedResult = assessmentReportRowToDomain(row);
    return AssessmentResultSchema.parse({
      ...savedResult,
      riskEvent: normalized.riskEvent,
    });
  }

  async latest(userId: string): Promise<AssessmentResult | undefined> {
    const result = await this.db.query<AssessmentReportRow>(
      `
        SELECT
          id,
          user_id,
          dimensions,
          risk_level,
          summary,
          recommendations,
          risk_event_id,
          created_at
        FROM assessment_reports
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [userId]
    );

    const row = result.rows[0];
    return row ? assessmentReportRowToDomain(row) : undefined;
  }

  async listByUser(userId: string): Promise<AssessmentResult[]> {
    const result = await this.db.query<AssessmentReportRow>(
      `
        SELECT
          id,
          user_id,
          dimensions,
          risk_level,
          summary,
          recommendations,
          risk_event_id,
          created_at
        FROM assessment_reports
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
      [userId]
    );

    return result.rows.map(assessmentReportRowToDomain);
  }

  async clear(): Promise<void> {
    await this.db.query("DELETE FROM assessment_reports");
  }
}
