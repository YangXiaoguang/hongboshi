import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  FINANCE_ADMIN_RULE_POLICY_VERSION,
  FinanceAdminAccountingPeriodSchema,
  FinanceAdminRuleConfigSchema,
  type FinanceAdminAccountingPeriod,
  type FinanceAdminRuleConfig,
} from "../../../shared/domain";

type MaybePromise<T> = T | Promise<T>;

const FinanceRuleStoreFileSchema = z.object({
  version: z.literal(1),
  rules: FinanceAdminRuleConfigSchema.optional(),
});

type FinanceRuleStoreFile = z.infer<typeof FinanceRuleStoreFileSchema>;

export interface FinanceRuleStore {
  getRules(now?: string): MaybePromise<FinanceAdminRuleConfig>;
  saveRules(
    rules: FinanceAdminRuleConfig
  ): MaybePromise<FinanceAdminRuleConfig>;
  clear(): MaybePromise<void>;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function buildFinanceAccountingPeriod(
  now = new Date().toISOString()
): FinanceAdminAccountingPeriod {
  const localOffsetMs = 8 * 60 * 60 * 1000;
  const localDate = new Date(Date.parse(now) + localOffsetMs);
  const year = localDate.getUTCFullYear();
  const monthIndex = localDate.getUTCMonth();
  const month = String(monthIndex + 1).padStart(2, "0");
  const startsAt = new Date(Date.UTC(year, monthIndex, 1) - localOffsetMs);
  const endsAt = new Date(
    Date.UTC(year, monthIndex + 1, 1) - localOffsetMs - 1
  );

  return FinanceAdminAccountingPeriodSchema.parse({
    periodId: `${year}-${month}`,
    label: `${year}年${month}月`,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    strategy: "natural_month",
  });
}

export function createDefaultFinanceRuleConfig(
  now = new Date().toISOString()
): FinanceAdminRuleConfig {
  return FinanceAdminRuleConfigSchema.parse({
    version: "finance_rules_default_v1",
    policyVersion: FINANCE_ADMIN_RULE_POLICY_VERSION,
    accountingPeriodStrategy: "natural_month",
    activePeriod: buildFinanceAccountingPeriod(now),
    channelFeeRules: [
      {
        channel: "wechat_pay",
        rate: 0.006,
        fixedFeeAmount: 0,
        minimumFeeAmount: 0,
        effectiveFrom: "2026-01-01T00:00:00.000+08:00",
        description: "微信支付默认试算费率",
      },
      {
        channel: "alipay",
        rate: 0.006,
        fixedFeeAmount: 0,
        minimumFeeAmount: 0,
        effectiveFrom: "2026-01-01T00:00:00.000+08:00",
        description: "支付宝默认试算费率",
      },
      {
        channel: "manual",
        rate: 0,
        fixedFeeAmount: 0,
        minimumFeeAmount: 0,
        effectiveFrom: "2026-01-01T00:00:00.000+08:00",
        description: "人工模拟渠道默认不计手续费",
      },
    ],
    updatedAt: now,
    notes: "默认手续费试算规则",
  });
}

function normalizeRules(
  rules: FinanceAdminRuleConfig,
  now = new Date().toISOString()
): FinanceAdminRuleConfig {
  const cloned = FinanceAdminRuleConfigSchema.parse(
    JSON.parse(JSON.stringify(rules))
  );
  return FinanceAdminRuleConfigSchema.parse({
    ...cloned,
    activePeriod: buildFinanceAccountingPeriod(now),
    channelFeeRules: cloned.channelFeeRules.map(rule => ({
      ...rule,
      fixedFeeAmount: roundMoney(rule.fixedFeeAmount),
      minimumFeeAmount: roundMoney(rule.minimumFeeAmount),
    })),
  });
}

function emptyStoreFile(now = new Date().toISOString()): FinanceRuleStoreFile {
  return {
    version: 1,
    rules: createDefaultFinanceRuleConfig(now),
  };
}

function normalizeStoreFile(
  payload: unknown,
  now = new Date().toISOString()
): FinanceRuleStoreFile {
  const parsed = FinanceRuleStoreFileSchema.safeParse(payload);
  if (!parsed.success || !parsed.data.rules) return emptyStoreFile(now);

  return {
    version: 1,
    rules: normalizeRules(parsed.data.rules, now),
  };
}

export class InMemoryFinanceRuleStore implements FinanceRuleStore {
  private rules: FinanceAdminRuleConfig | undefined;

  getRules(now = new Date().toISOString()): FinanceAdminRuleConfig {
    return normalizeRules(
      this.rules ?? createDefaultFinanceRuleConfig(now),
      now
    );
  }

  saveRules(rules: FinanceAdminRuleConfig): FinanceAdminRuleConfig {
    this.rules = normalizeRules(rules, rules.updatedAt);
    return normalizeRules(this.rules, this.rules.updatedAt);
  }

  clear() {
    this.rules = undefined;
  }
}

export class JsonFileFinanceRuleStore implements FinanceRuleStore {
  constructor(private readonly filePath = resolveFinanceRuleStorePath()) {}

  getRules(now = new Date().toISOString()): FinanceAdminRuleConfig {
    return this.readFile(now).rules ?? createDefaultFinanceRuleConfig(now);
  }

  saveRules(rules: FinanceAdminRuleConfig): FinanceAdminRuleConfig {
    const normalized = normalizeRules(rules, rules.updatedAt);
    this.writeFile({
      version: 1,
      rules: normalized,
    });
    return normalized;
  }

  clear() {
    this.writeFile(emptyStoreFile());
  }

  private readFile(now = new Date().toISOString()): FinanceRuleStoreFile {
    if (!fs.existsSync(this.filePath)) return emptyStoreFile(now);

    try {
      return normalizeStoreFile(
        JSON.parse(fs.readFileSync(this.filePath, "utf8")),
        now
      );
    } catch {
      return emptyStoreFile(now);
    }
  }

  private writeFile(file: FinanceRuleStoreFile) {
    const normalized = normalizeStoreFile(file, file.rules?.updatedAt);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(normalized, null, 2), "utf8");
    fs.renameSync(tmpPath, this.filePath);
  }
}

export function resolveFinanceRuleStorePath() {
  return path.resolve(
    process.cwd(),
    process.env.HONGBOSHI_FINANCE_RULE_FILE ??
      ".hongboshi-data/finance-rules.json"
  );
}

export function createDefaultFinanceRuleStore(): FinanceRuleStore {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST ||
    process.env.HONGBOSHI_FINANCE_RULE_STORE === "memory"
  ) {
    return new InMemoryFinanceRuleStore();
  }

  return new JsonFileFinanceRuleStore();
}

let financeRuleStore: FinanceRuleStore = createDefaultFinanceRuleStore();

export function getFinanceRuleStore() {
  return financeRuleStore;
}

export function setFinanceRuleStore(store: FinanceRuleStore) {
  financeRuleStore = store;
}

export async function resetFinanceRuleStore(
  store: FinanceRuleStore = createDefaultFinanceRuleStore()
) {
  financeRuleStore = store;
  await financeRuleStore.clear();
}
