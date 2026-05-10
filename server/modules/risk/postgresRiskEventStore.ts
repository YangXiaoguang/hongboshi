import {
  RiskEventSchema,
  type RiskEvent,
  type RiskEventSource,
  type RiskEventStatus,
} from "../../../shared/domain";
import type { DatabaseQueryExecutor } from "../../db/postgres";

type RiskEventRow = {
  id: string;
  user_id: string | null;
  source: RiskEventSource;
  risk_level: RiskEvent["riskLevel"];
  signal: string;
  status: RiskEventStatus;
  reviewer_id: string | null;
  created_at: string | Date;
  resolved_at: string | Date | null;
};

function toDateTimeLike(value: string | Date | null | undefined) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function riskEventRowToDomain(row: RiskEventRow): RiskEvent {
  return RiskEventSchema.parse({
    id: row.id,
    userId: row.user_id ?? undefined,
    source: row.source,
    riskLevel: row.risk_level,
    signal: row.signal,
    status: row.status,
    reviewerId: row.reviewer_id ?? undefined,
    createdAt: toDateTimeLike(row.created_at),
    resolvedAt: toDateTimeLike(row.resolved_at),
  });
}

export class PostgresRiskEventStore {
  constructor(private readonly db: DatabaseQueryExecutor) {}

  async save(event: RiskEvent): Promise<RiskEvent> {
    const normalized = RiskEventSchema.parse(event);
    const result = await this.db.query<RiskEventRow>(
      `
        INSERT INTO risk_events (
          id,
          user_id,
          source,
          risk_level,
          signal,
          status,
          reviewer_id,
          created_at,
          resolved_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          source = EXCLUDED.source,
          risk_level = EXCLUDED.risk_level,
          signal = EXCLUDED.signal,
          status = EXCLUDED.status,
          reviewer_id = EXCLUDED.reviewer_id,
          resolved_at = EXCLUDED.resolved_at
        RETURNING
          id,
          user_id,
          source,
          risk_level,
          signal,
          status,
          reviewer_id,
          created_at,
          resolved_at
      `,
      [
        normalized.id,
        normalized.userId ?? null,
        normalized.source,
        normalized.riskLevel,
        normalized.signal,
        normalized.status,
        normalized.reviewerId ?? null,
        normalized.createdAt,
        normalized.resolvedAt ?? null,
      ]
    );

    const row = result.rows[0];
    if (!row) throw new Error("Risk event save did not return a row");
    return riskEventRowToDomain(row);
  }

  async get(eventId: string): Promise<RiskEvent | undefined> {
    const result = await this.db.query<RiskEventRow>(
      `
        SELECT
          id,
          user_id,
          source,
          risk_level,
          signal,
          status,
          reviewer_id,
          created_at,
          resolved_at
        FROM risk_events
        WHERE id = $1
        LIMIT 1
      `,
      [eventId]
    );

    const row = result.rows[0];
    return row ? riskEventRowToDomain(row) : undefined;
  }

  async listByUser(userId: string): Promise<RiskEvent[]> {
    const result = await this.db.query<RiskEventRow>(
      `
        SELECT
          id,
          user_id,
          source,
          risk_level,
          signal,
          status,
          reviewer_id,
          created_at,
          resolved_at
        FROM risk_events
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
      [userId]
    );

    return result.rows.map(riskEventRowToDomain);
  }

  async clear(): Promise<void> {
    await this.db.query("DELETE FROM risk_events");
  }
}
