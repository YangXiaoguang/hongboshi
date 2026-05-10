import { Pool, type PoolConfig, type QueryResultRow } from "pg";

export type DatabaseQueryResult<Row extends QueryResultRow = QueryResultRow> = {
  rows: Row[];
  rowCount: number | null;
};

export interface DatabaseQueryExecutor {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[]
  ): Promise<DatabaseQueryResult<Row>>;
}

let sharedPool: Pool | undefined;

function parsePoolSize(value: string | undefined) {
  if (!value) return 5;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

export function getDatabaseUrl(env = process.env) {
  const url = env.DATABASE_URL?.trim();
  return url ? url : undefined;
}

export function createPostgresPool(
  config: Pick<PoolConfig, "connectionString" | "max" | "ssl"> = {}
) {
  const connectionString = config.connectionString ?? getDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to create a PostgreSQL pool");
  }

  return new Pool({
    connectionString,
    max: config.max ?? parsePoolSize(process.env.DATABASE_POOL_MAX),
    ssl: config.ssl,
  });
}

export function getSharedPostgresPool() {
  if (!sharedPool) sharedPool = createPostgresPool();
  return sharedPool;
}

export async function closeSharedPostgresPool() {
  if (!sharedPool) return;
  const pool = sharedPool;
  sharedPool = undefined;
  await pool.end();
}
