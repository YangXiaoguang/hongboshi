import fs from "fs";
import path from "path";
import type { QueryResultRow } from "pg";
import type { DatabaseQueryExecutor, DatabaseQueryResult } from "./postgres";

export type DatabaseMigration = {
  id: string;
  filePath: string;
  sql: string;
};

export type MigrationRunResult = {
  applied: string[];
  skipped: string[];
};

type MigrationRow = {
  id: string;
};

export const schemaMigrationsTableName = "hongboshi_schema_migrations";

export function resolveMigrationsDirectory(cwd = process.cwd()) {
  return path.resolve(cwd, "server/db/migrations");
}

export function loadMigrationFiles(
  migrationsDir = resolveMigrationsDirectory()
): DatabaseMigration[] {
  return fs
    .readdirSync(migrationsDir)
    .filter(fileName => fileName.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b))
    .map(fileName => {
      const filePath = path.join(migrationsDir, fileName);
      return {
        id: path.basename(fileName, ".sql"),
        filePath,
        sql: fs.readFileSync(filePath, "utf8"),
      };
    });
}

export async function ensureSchemaMigrationsTable(db: DatabaseQueryExecutor) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ${schemaMigrationsTableName} (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function listAppliedMigrationIds(db: DatabaseQueryExecutor) {
  const result = await db.query<MigrationRow>(
    `
      SELECT id
      FROM ${schemaMigrationsTableName}
      ORDER BY id ASC
    `
  );

  return new Set(result.rows.map(row => row.id));
}

export async function runMigrations(
  db: DatabaseQueryExecutor,
  migrations = loadMigrationFiles()
): Promise<MigrationRunResult> {
  await ensureSchemaMigrationsTable(db);
  const appliedIds = await listAppliedMigrationIds(db);
  const result: MigrationRunResult = {
    applied: [],
    skipped: [],
  };

  for (const migration of migrations) {
    if (appliedIds.has(migration.id)) {
      result.skipped.push(migration.id);
      continue;
    }

    await db.query(migration.sql);
    await db.query(
      `
        INSERT INTO ${schemaMigrationsTableName} (id)
        VALUES ($1)
        ON CONFLICT (id) DO NOTHING
      `,
      [migration.id]
    );
    result.applied.push(migration.id);
  }

  return result;
}

export function emptyQueryResult<
  Row extends QueryResultRow = QueryResultRow,
>(): DatabaseQueryResult<Row> {
  return {
    rows: [],
    rowCount: 0,
  };
}
