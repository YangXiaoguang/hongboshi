import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  JsonFileFinanceRuleStore,
  InMemoryFinanceRuleStore,
  buildFinanceAccountingPeriod,
  createDefaultFinanceRuleConfig,
} from "./financeRuleStore";

describe("finance rule store", () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("builds natural-month accounting periods in China business time", () => {
    expect(
      buildFinanceAccountingPeriod("2026-05-12T10:00:00.000Z")
    ).toMatchObject({
      periodId: "2026-05",
      label: "2026年05月",
      startsAt: "2026-04-30T16:00:00.000Z",
      endsAt: "2026-05-31T15:59:59.999Z",
      strategy: "natural_month",
    });

    expect(
      buildFinanceAccountingPeriod("2026-05-31T17:00:00.000Z").periodId
    ).toBe("2026-06");
  });

  it("persists channel fee rules in memory and refreshes active period", () => {
    const store = new InMemoryFinanceRuleStore();
    const mayRules = createDefaultFinanceRuleConfig("2026-05-12T10:00:00.000Z");
    const saved = store.saveRules({
      ...mayRules,
      channelFeeRules: mayRules.channelFeeRules.map(rule =>
        rule.channel === "manual" ? { ...rule, rate: 0.01 } : rule
      ),
    });

    expect(saved.activePeriod.periodId).toBe("2026-05");
    const juneRules = store.getRules("2026-06-02T10:00:00.000Z");
    expect(juneRules.activePeriod.periodId).toBe("2026-06");
    expect(
      juneRules.channelFeeRules.find(rule => rule.channel === "manual")?.rate
    ).toBe(0.01);
  });

  it("persists channel fee rules to JSON file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hongboshi-finance-"));
    tmpDirs.push(dir);
    const filePath = path.join(dir, "finance-rules.json");
    const store = new JsonFileFinanceRuleStore(filePath);
    const rules = createDefaultFinanceRuleConfig("2026-05-12T10:00:00.000Z");

    store.saveRules({
      ...rules,
      notes: "测试保存",
      channelFeeRules: rules.channelFeeRules.map(rule =>
        rule.channel === "wechat_pay"
          ? { ...rule, rate: 0.008, fixedFeeAmount: 0.2 }
          : rule
      ),
    });

    const restored = new JsonFileFinanceRuleStore(filePath).getRules(
      "2026-05-13T10:00:00.000Z"
    );
    expect(restored.notes).toBe("测试保存");
    expect(
      restored.channelFeeRules.find(rule => rule.channel === "wechat_pay")
    ).toMatchObject({
      rate: 0.008,
      fixedFeeAmount: 0.2,
    });
  });
});
