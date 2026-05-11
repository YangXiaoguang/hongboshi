import { describe, expect, it } from "vitest";
import {
  assertPersistenceConfig,
  resolvePersistenceConfig,
} from "./runtimeConfig";

describe("database runtime persistence config", () => {
  it("keeps local fallback modes without a database url", () => {
    const config = resolvePersistenceConfig({} as NodeJS.ProcessEnv);

    expect(config.databaseUrl).toBeUndefined();
    expect(config.usesPostgres).toBe(false);
    expect(
      Object.fromEntries(
        config.stores.map(store => [store.envName, store.mode])
      )
    ).toMatchObject({
      HONGBOSHI_AUTH_SESSION_STORE: "memory",
      HONGBOSHI_COURSE_ACCESS_STORE: "file",
      HONGBOSHI_COURSE_PRODUCT_STORE: "file",
      HONGBOSHI_RISK_EVENT_STORE: "memory",
    });
    expect(config.issues).toEqual([]);
  });

  it("auto-selects postgres stores when DATABASE_URL is present", () => {
    const config = resolvePersistenceConfig({
      DATABASE_URL: "postgres://localhost/hongboshi",
    } as NodeJS.ProcessEnv);

    expect(config.usesPostgres).toBe(true);
    expect(
      config.stores
        .filter(store => store.autoPostgresWithDatabaseUrl)
        .every(store => store.mode === "postgres")
    ).toBe(true);
    expect(
      config.stores.find(
        store => store.envName === "HONGBOSHI_COURSE_PRODUCT_STORE"
      )?.mode
    ).toBe("file");
  });

  it("reports invalid modes and missing database urls", () => {
    const config = resolvePersistenceConfig({
      HONGBOSHI_AUTH_SESSION_STORE: "postgres",
      HONGBOSHI_RISK_EVENT_STORE: "pg",
    } as NodeJS.ProcessEnv);

    expect(config.issues).toEqual(
      expect.arrayContaining([
        "HONGBOSHI_AUTH_SESSION_STORE=postgres 需要配置 DATABASE_URL",
        expect.stringContaining("HONGBOSHI_RISK_EVENT_STORE=pg 不受支持"),
      ])
    );
    expect(() =>
      assertPersistenceConfig({
        HONGBOSHI_AUTH_SESSION_STORE: "postgres",
      } as NodeJS.ProcessEnv)
    ).toThrow("持久化配置不合法");
  });
});
