import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { coreDatabaseTables, requiredDatabaseIndexes } from "./schema";

const migrationsDir = path.resolve(process.cwd(), "server/db/migrations");
const migrationSql = fs
  .readdirSync(migrationsDir)
  .filter(fileName => fileName.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b))
  .map(fileName => fs.readFileSync(path.join(migrationsDir, fileName), "utf8"))
  .join("\n");

function tableBlock(tableName: string) {
  const match = migrationSql.match(
    new RegExp(
      `CREATE TABLE IF NOT EXISTS ${tableName}\\s*\\(([\\s\\S]*?)\\);`,
      "i"
    )
  );
  const alterBlocks = Array.from(
    migrationSql.matchAll(
      new RegExp(
        `ALTER TABLE ${tableName}\\s+ADD COLUMN IF NOT EXISTS\\s+([^;]+);`,
        "gi"
      )
    )
  ).map(item => item[1] ?? "");

  return [match?.[1] ?? "", ...alterBlocks].join("\n");
}

describe("database schema contract", () => {
  it("declares every core table in migrations", () => {
    for (const table of coreDatabaseTables) {
      expect(migrationSql).toMatch(
        new RegExp(`CREATE TABLE IF NOT EXISTS ${table.name}\\s*\\(`, "i")
      );
    }
  });

  it("keeps required columns in sync with the migration", () => {
    for (const table of coreDatabaseTables) {
      const block = tableBlock(table.name);
      expect(block, `missing table block for ${table.name}`).not.toBe("");

      for (const column of table.requiredColumns) {
        expect(block, `${table.name}.${column}`).toMatch(
          new RegExp(`\\b${column}\\b`, "i")
        );
      }
    }
  });

  it("declares key query indexes", () => {
    for (const indexName of requiredDatabaseIndexes) {
      expect(migrationSql).toContain(indexName);
    }
  });

  it("keeps the audit center archive append-only, idempotent and summary-only", () => {
    const block = tableBlock("audit_center_archived_events");

    expect(block).toMatch(/\bidempotency_key\b/i);
    expect(migrationSql).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS uniq_audit_center_archived_events_idempotency_key[\s\S]*\(idempotency_key\)/i
    );
    expect(block).toMatch(/\bsummary\b/i);
    expect(block).toMatch(/\bbefore_summary\b/i);
    expect(block).toMatch(/\bafter_summary\b/i);
    expect(block).toMatch(/\bprivacy_level\b/i);
    expect(block).toContain("summary_only");
    expect(block).toMatch(/\bpolicy_version\b/i);
    expect(migrationSql).toContain(
      "idx_audit_center_archived_events_module_occurred_at"
    );
    expect(migrationSql).toContain(
      "idx_audit_center_archived_events_action_occurred_at"
    );
    expect(migrationSql).toContain("idx_audit_center_archived_events_resource");
    expect(migrationSql).toContain(
      "idx_audit_center_archived_events_actor_occurred_at"
    );
  });
});
