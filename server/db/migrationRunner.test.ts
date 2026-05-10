import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import type { DatabaseQueryExecutor, DatabaseQueryResult } from "./postgres";
import {
  emptyQueryResult,
  loadMigrationFiles,
  runMigrations,
} from "./migrationRunner";

type CapturedQuery = {
  text: string;
  values?: readonly unknown[];
};

class FakeMigrationExecutor implements DatabaseQueryExecutor {
  readonly queries: CapturedQuery[] = [];

  constructor(private readonly appliedIds: string[] = []) {}

  async query<Row>(
    text: string,
    values?: readonly unknown[]
  ): Promise<DatabaseQueryResult<Row>> {
    this.queries.push({ text, values });

    if (text.includes("SELECT id") && text.includes("schema_migrations")) {
      return {
        rows: this.appliedIds.map(id => ({ id }) as Row),
        rowCount: this.appliedIds.length,
      };
    }

    return emptyQueryResult<Row>();
  }
}

const tempDirs: string[] = [];

function createMigrationDir(files: Record<string, string>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hongboshi-migrations-"));
  tempDirs.push(dir);

  for (const [fileName, sql] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, fileName), sql, "utf8");
  }

  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("database migration runner", () => {
  it("loads SQL migrations in filename order", () => {
    const dir = createMigrationDir({
      "0002_second.sql": "SELECT 2;",
      "0001_first.sql": "SELECT 1;",
      "README.md": "ignore",
    });

    expect(loadMigrationFiles(dir).map(migration => migration.id)).toEqual([
      "0001_first",
      "0002_second",
    ]);
  });

  it("applies pending migrations and records applied ids", async () => {
    const db = new FakeMigrationExecutor(["0001_first"]);

    const result = await runMigrations(db, [
      {
        id: "0001_first",
        filePath: "/tmp/0001_first.sql",
        sql: "SELECT 1;",
      },
      {
        id: "0002_second",
        filePath: "/tmp/0002_second.sql",
        sql: "SELECT 2;",
      },
    ]);

    expect(result).toEqual({
      applied: ["0002_second"],
      skipped: ["0001_first"],
    });
    expect(db.queries.some(query => query.text === "SELECT 2;")).toBe(true);
    expect(db.queries.some(query => query.values?.[0] === "0002_second")).toBe(
      true
    );
  });
});
