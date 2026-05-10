import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { loadEnvFiles, parseEnvFile } from "./loadEnv";

const tempDirs: string[] = [];

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hongboshi-env-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  delete process.env.HONGBOSHI_TEST_ENV_VALUE;
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("server env file loader", () => {
  it("parses simple dotenv files", () => {
    expect(
      parseEnvFile(`
        # comment
        DATABASE_URL="postgres://localhost/hongboshi"
        HONGBOSHI_TEST_ENV_VALUE=hello
      `)
    ).toMatchObject({
      DATABASE_URL: "postgres://localhost/hongboshi",
      HONGBOSHI_TEST_ENV_VALUE: "hello",
    });
  });

  it("loads env files without overriding existing process env by default", () => {
    const dir = makeTempDir();
    fs.writeFileSync(
      path.join(dir, ".env.local"),
      "HONGBOSHI_TEST_ENV_VALUE=file\n",
      "utf8"
    );
    process.env.HONGBOSHI_TEST_ENV_VALUE = "existing";

    const loaded = loadEnvFiles({ cwd: dir });

    expect(loaded).toHaveLength(1);
    expect(process.env.HONGBOSHI_TEST_ENV_VALUE).toBe("existing");
  });
});
