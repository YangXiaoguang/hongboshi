import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  InMemoryRiskReviewStore,
  JsonFileRiskReviewStore,
} from "./riskReviewStore";

const record = {
  id: "risk_review_1",
  riskEventId: "risk_1",
  userId: "user_1",
  action: "start_review" as const,
  actorId: "operator_1",
  actorRoles: ["operator"],
  previousStatus: "open" as const,
  nextStatus: "reviewing" as const,
  note: "已开始人工复核",
  createdAt: "2026-05-13T10:00:00.000Z",
};

let tempDir: string | undefined;

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

describe("risk review store", () => {
  it("stores cloned review records newest first", () => {
    const store = new InMemoryRiskReviewStore();

    const saved = store.appendRecord(record);
    saved.note = "mutated";
    store.appendRecord({
      ...record,
      id: "risk_review_2",
      action: "resolve",
      previousStatus: "reviewing",
      nextStatus: "resolved",
      note: "已完成风险复核",
      createdAt: "2026-05-13T10:10:00.000Z",
    });

    expect(store.listRecords("risk_1").map(item => item.id)).toEqual([
      "risk_review_2",
      "risk_review_1",
    ]);
    expect(store.listRecords("risk_1")[1]?.note).toBe("已开始人工复核");
    expect(store.listAllRecords()).toHaveLength(2);
  });

  it("persists review records in a JSON file", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hongboshi-risk-review-"));
    const filePath = path.join(tempDir, "risk-reviews.json");
    const store = new JsonFileRiskReviewStore(filePath);

    store.appendRecord(record);
    const restored = new JsonFileRiskReviewStore(filePath);

    expect(restored.listRecords("risk_1")[0]).toMatchObject({
      id: "risk_review_1",
      note: "已开始人工复核",
    });
  });
});
