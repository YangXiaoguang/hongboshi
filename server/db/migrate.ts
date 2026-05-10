import "./loadEnv";
import { createPostgresPool, getDatabaseUrl } from "./postgres";
import { loadMigrationFiles, runMigrations } from "./migrationRunner";

async function main() {
  if (!getDatabaseUrl()) {
    throw new Error("DATABASE_URL is required to run database migrations");
  }

  const pool = createPostgresPool();
  try {
    const migrations = loadMigrationFiles();
    const result = await runMigrations(pool, migrations);

    if (result.applied.length === 0) {
      console.log(
        `Database is up to date. ${result.skipped.length} migration(s) already applied.`
      );
      return;
    }

    console.log(`Applied ${result.applied.length} migration(s):`);
    for (const migrationId of result.applied) {
      console.log(`- ${migrationId}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
