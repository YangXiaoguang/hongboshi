import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createDefaultRiskSopTemplates,
  findRiskSopTemplateForEvent,
  InMemoryRiskSopStore,
  JsonFileRiskSopStore,
} from "./riskSopStore";

const tempDirs: string[] = [];

afterEach(() => {
  tempDirs.splice(0).forEach(dir => {
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

function tempFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hongboshi-risk-sop-"));
  tempDirs.push(dir);
  return path.join(dir, "risk-sop.json");
}

describe("risk SOP store", () => {
  it("ships default SOP templates and matches by risk level and source", () => {
    const templates = createDefaultRiskSopTemplates();

    expect(templates.map(template => template.id)).toEqual([
      "sop_urgent_crisis_review",
      "sop_high_followup_review",
      "sop_medium_observation_review",
    ]);
    expect(
      findRiskSopTemplateForEvent(
        { riskLevel: "urgent", source: "assessment" },
        templates
      )?.id
    ).toBe("sop_urgent_crisis_review");
    expect(
      findRiskSopTemplateForEvent(
        { riskLevel: "high", source: "chat" },
        templates
      )?.id
    ).toBe("sop_high_followup_review");
  });

  it("updates templates and keeps one escalation per risk event", () => {
    const store = new InMemoryRiskSopStore();
    const template = store.listTemplates()[0];
    if (!template) throw new Error("expected default template");

    store.saveTemplate({ ...template, enabled: false, version: "2026.05.2" });
    expect(store.listTemplates()[0]).toMatchObject({
      id: template.id,
      enabled: false,
      version: "2026.05.2",
    });

    store.upsertEscalation({
      id: "escalation_1",
      riskEventId: "risk_1",
      userId: "user_1",
      priority: "high",
      status: "pending_assignment",
      reason: "需要负责人跟进",
      createdAt: "2026-05-13T10:00:00.000Z",
    });
    store.upsertEscalation({
      id: "escalation_2",
      riskEventId: "risk_1",
      userId: "user_1",
      priority: "urgent",
      status: "assigned",
      ownerId: "admin_1",
      reason: "升级给负责人跟进",
      createdAt: "2026-05-13T10:05:00.000Z",
    });

    expect(store.listEscalations()).toEqual([
      expect.objectContaining({
        id: "escalation_2",
        riskEventId: "risk_1",
        priority: "urgent",
        status: "assigned",
      }),
    ]);
  });

  it("persists SOP templates and escalation queue to a JSON file", () => {
    const filePath = tempFile();
    const store = new JsonFileRiskSopStore(filePath);
    const template = store.listTemplates()[0];
    if (!template) throw new Error("expected default template");

    store.saveTemplate({ ...template, enabled: false, version: "2026.05.2" });
    store.upsertEscalation({
      id: "escalation_1",
      riskEventId: "risk_1",
      priority: "high",
      status: "pending_assignment",
      reason: "需要负责人跟进",
      createdAt: "2026-05-13T10:00:00.000Z",
    });

    const reloaded = new JsonFileRiskSopStore(filePath);
    expect(reloaded.listTemplates()[0]).toMatchObject({
      id: template.id,
      enabled: false,
    });
    expect(reloaded.listEscalations()[0]).toMatchObject({
      riskEventId: "risk_1",
      priority: "high",
    });
  });
});
