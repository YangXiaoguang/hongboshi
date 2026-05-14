import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  RiskAdminReviewRecordSchema,
  type RiskAdminReviewRecord,
} from "../../../shared/domain";

type MaybePromise<T> = T | Promise<T>;

const RiskReviewStoreFileSchema = z.object({
  version: z.literal(1),
  records: z
    .record(z.string().min(1), z.array(RiskAdminReviewRecordSchema))
    .default({}),
});

type RiskReviewStoreFile = z.infer<typeof RiskReviewStoreFileSchema>;

export interface RiskReviewStore {
  listRecords(riskEventId: string): MaybePromise<RiskAdminReviewRecord[]>;
  listAllRecords(): MaybePromise<RiskAdminReviewRecord[]>;
  appendRecord(
    record: RiskAdminReviewRecord
  ): MaybePromise<RiskAdminReviewRecord>;
  clear(): MaybePromise<void>;
}

function cloneRecord(record: RiskAdminReviewRecord): RiskAdminReviewRecord {
  return RiskAdminReviewRecordSchema.parse(JSON.parse(JSON.stringify(record)));
}

function sortRecords(records: RiskAdminReviewRecord[]) {
  return [...records].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

function emptyStoreFile(): RiskReviewStoreFile {
  return {
    version: 1,
    records: {},
  };
}

function normalizeStoreFile(payload: unknown): RiskReviewStoreFile {
  const parsed = RiskReviewStoreFileSchema.safeParse(payload);
  if (!parsed.success) return emptyStoreFile();

  return {
    version: 1,
    records: Object.fromEntries(
      Object.entries(parsed.data.records).map(([riskEventId, records]) => [
        riskEventId,
        sortRecords(records.map(cloneRecord)),
      ])
    ),
  };
}

export class InMemoryRiskReviewStore implements RiskReviewStore {
  private records = new Map<string, RiskAdminReviewRecord[]>();

  listRecords(riskEventId: string): RiskAdminReviewRecord[] {
    return sortRecords(this.records.get(riskEventId) ?? []).map(cloneRecord);
  }

  listAllRecords(): RiskAdminReviewRecord[] {
    return sortRecords(Array.from(this.records.values()).flat()).map(
      cloneRecord
    );
  }

  appendRecord(record: RiskAdminReviewRecord): RiskAdminReviewRecord {
    const normalized = cloneRecord(record);
    const records = this.records.get(normalized.riskEventId) ?? [];
    this.records.set(
      normalized.riskEventId,
      sortRecords([normalized, ...records])
    );
    return cloneRecord(normalized);
  }

  clear() {
    this.records.clear();
  }
}

export class JsonFileRiskReviewStore implements RiskReviewStore {
  constructor(private readonly filePath = resolveRiskReviewStorePath()) {}

  listRecords(riskEventId: string): RiskAdminReviewRecord[] {
    return sortRecords(this.readFile().records[riskEventId] ?? []).map(
      cloneRecord
    );
  }

  listAllRecords(): RiskAdminReviewRecord[] {
    return sortRecords(Object.values(this.readFile().records).flat()).map(
      cloneRecord
    );
  }

  appendRecord(record: RiskAdminReviewRecord): RiskAdminReviewRecord {
    const normalized = cloneRecord(record);
    const file = this.readFile();
    const records = file.records[normalized.riskEventId] ?? [];
    file.records[normalized.riskEventId] = sortRecords([
      normalized,
      ...records,
    ]);
    this.writeFile(file);
    return cloneRecord(normalized);
  }

  clear() {
    this.writeFile(emptyStoreFile());
  }

  private readFile(): RiskReviewStoreFile {
    if (!fs.existsSync(this.filePath)) return emptyStoreFile();

    try {
      return normalizeStoreFile(
        JSON.parse(fs.readFileSync(this.filePath, "utf8"))
      );
    } catch {
      return emptyStoreFile();
    }
  }

  private writeFile(file: RiskReviewStoreFile) {
    const normalized = normalizeStoreFile(file);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(normalized, null, 2), "utf8");
    fs.renameSync(tmpPath, this.filePath);
  }
}

export function resolveRiskReviewStorePath() {
  return path.resolve(
    process.cwd(),
    process.env.HONGBOSHI_RISK_REVIEW_FILE ??
      ".hongboshi-data/risk-reviews.json"
  );
}

export function createDefaultRiskReviewStore(): RiskReviewStore {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST ||
    process.env.HONGBOSHI_RISK_REVIEW_STORE === "memory"
  ) {
    return new InMemoryRiskReviewStore();
  }

  return new JsonFileRiskReviewStore();
}
