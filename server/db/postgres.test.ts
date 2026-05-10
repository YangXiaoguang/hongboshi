import { describe, expect, it } from "vitest";
import { getDatabaseUrl } from "./postgres";

describe("postgres connection config", () => {
  it("normalizes empty database urls", () => {
    expect(getDatabaseUrl({ DATABASE_URL: "" } as NodeJS.ProcessEnv)).toBeUndefined();
    expect(
      getDatabaseUrl({ DATABASE_URL: "  postgres://localhost/db  " } as NodeJS.ProcessEnv)
    ).toBe("postgres://localhost/db");
  });
});
