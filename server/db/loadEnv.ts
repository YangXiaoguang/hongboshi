import fs from "fs";
import path from "path";

export function parseEnvFile(content: string) {
  const entries: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
}

export function loadEnvFiles({
  cwd = process.cwd(),
  fileNames = [".env.local", ".env"],
  override = false,
}: {
  cwd?: string;
  fileNames?: string[];
  override?: boolean;
} = {}) {
  const loaded: string[] = [];

  for (const fileName of fileNames) {
    const filePath = path.resolve(cwd, fileName);
    if (!fs.existsSync(filePath)) continue;

    const entries = parseEnvFile(fs.readFileSync(filePath, "utf8"));
    for (const [key, value] of Object.entries(entries)) {
      if (!override && process.env[key] !== undefined) continue;
      process.env[key] = value;
    }
    loaded.push(filePath);
  }

  return loaded;
}

if (process.env.HONGBOSHI_SKIP_ENV_FILE_LOAD !== "1") {
  loadEnvFiles();
}
