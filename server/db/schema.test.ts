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
  return match?.[1] ?? "";
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
});
