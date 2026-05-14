import { describe, expect, it } from "vitest";
import { InMemoryRiskEventStore } from "./riskEventStore";

describe("risk event store", () => {
  it("stores risk events by user and returns newest first", () => {
    const store = new InMemoryRiskEventStore();

    store.save({
      id: "risk_1",
      userId: "user_1",
      source: "assessment",
      riskLevel: "high",
      signal: "高风险测评结果",
      status: "open",
      createdAt: "2026-05-10T08:00:00.000Z",
    });
    store.save({
      id: "risk_2",
      userId: "user_1",
      source: "counseling_intake",
      riskLevel: "urgent",
      signal: "咨询前信息包含危机诉求",
      status: "open",
      createdAt: "2026-05-10T09:00:00.000Z",
    });

    expect(store.listByUser("user_1").map(event => event.id)).toEqual([
      "risk_2",
      "risk_1",
    ]);
    expect(store.listAll().map(event => event.id)).toEqual([
      "risk_2",
      "risk_1",
    ]);
    expect(store.listByUser("user_2")).toEqual([]);
  });

  it("returns cloned events so callers cannot mutate store state", () => {
    const store = new InMemoryRiskEventStore();
    const event = store.save({
      id: "risk_1",
      userId: "user_1",
      source: "assessment",
      riskLevel: "high",
      signal: "高风险测评结果",
      status: "open",
      createdAt: "2026-05-10T08:00:00.000Z",
    });

    event.signal = "mutated";

    expect(store.get("risk_1")?.signal).toBe("高风险测评结果");
  });
});
