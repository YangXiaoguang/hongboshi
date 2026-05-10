import "./loadEnv";
import { createPostgresPool } from "./postgres";
import { assertPersistenceConfig } from "./runtimeConfig";

async function main() {
  const config = assertPersistenceConfig();

  console.log("Persistence configuration:");
  for (const store of config.stores) {
    console.log(`- ${store.label}: ${store.mode} (${store.envName})`);
  }

  if (!config.databaseUrl) {
    console.log(
      "DATABASE_URL is not configured; PostgreSQL connection skipped."
    );
    return;
  }

  const pool = createPostgresPool();
  try {
    await pool.query("SELECT 1");
    console.log("PostgreSQL connection: ok");
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
