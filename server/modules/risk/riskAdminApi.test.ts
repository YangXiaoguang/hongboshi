import { beforeEach, describe, expect, it } from "vitest";
import { LoginSessionSchema, type RiskEvent } from "../../../shared/domain";
import {
  InMemoryAssessmentResultStore,
  type AssessmentResultStore,
} from "../assessments/assessmentResultStore";
import { setAssessmentResultStore } from "../assessments/assessmentApi";
import {
  InMemoryAuthSessionStore,
  type AuthSessionStore,
} from "../auth/authSessionStore";
import { setAuthSessionStore } from "../auth/authSessionApi";
import {
  InMemoryCounselingAppointmentStore,
  type CounselingAppointmentStore,
} from "../counseling/counselingAppointmentStore";
import { setCounselingAppointmentStore } from "../counseling/counselingApi";
import {
  InMemoryRiskEventStore,
  setRiskEventStore,
  type RiskEventStore,
} from "./riskEventStore";
import {
  getRiskAdminDetailPayload,
  getRiskAdminListPayload,
  getRiskSopConsolePayload,
  setRiskReviewStore,
  setRiskSopStore,
  updateRiskAdminEventPayload,
  updateRiskSopTemplatePayload,
} from "./riskAdminApi";
import {
  InMemoryRiskReviewStore,
  type RiskReviewStore,
} from "./riskReviewStore";
import { InMemoryRiskSopStore, type RiskSopStore } from "./riskSopStore";

const operator = { id: "operator_1", roles: ["operator" as const] };
const admin = { id: "admin_1", roles: ["admin" as const] };
const member = { id: "member_1", roles: ["member" as const] };
const now = "2026-05-13T10:00:00.000Z";

let authStore: AuthSessionStore;
let assessmentStore: AssessmentResultStore;
let counselingStore: CounselingAppointmentStore;
let riskStore: RiskEventStore;
let reviewStore: RiskReviewStore;
let riskSopStore: RiskSopStore;

beforeEach(async () => {
  authStore = new InMemoryAuthSessionStore();
  assessmentStore = new InMemoryAssessmentResultStore();
  counselingStore = new InMemoryCounselingAppointmentStore(new Date(now));
  riskStore = new InMemoryRiskEventStore();
  reviewStore = new InMemoryRiskReviewStore();
  riskSopStore = new InMemoryRiskSopStore();

  setAuthSessionStore(authStore);
  setAssessmentResultStore(assessmentStore);
  setCounselingAppointmentStore(counselingStore);
  setRiskEventStore(riskStore);
  setRiskReviewStore(reviewStore);
  setRiskSopStore(riskSopStore);

  await authStore.saveSession(
    "session_risk_user",
    LoginSessionSchema.parse({
      provider: "phone",
      accessTokenExpiresAt: "2026-05-20T10:00:00.000Z",
      user: {
        id: "u_risk_1",
        displayName: "风险复核用户",
        phoneMasked: "138****2049",
        roles: ["member"],
        isMinor: false,
        createdAt: "2026-05-10T09:00:00.000Z",
        updatedAt: "2026-05-13T09:00:00.000Z",
      },
      consents: [],
    })
  );
});

function riskEvent(overrides: Partial<RiskEvent> = {}): RiskEvent {
  return {
    id: "risk_urgent_1",
    userId: "u_risk_1",
    source: "assessment",
    riskLevel: "urgent",
    signal: "原始敏感风险信号不应该暴露给前端",
    status: "open",
    createdAt: "2026-05-13T09:00:00.000Z",
    ...overrides,
  };
}

describe("risk admin api payloads", () => {
  it("requires risk read and review permissions", async () => {
    expect((await getRiskAdminListPayload(null, {}, now)).status).toBe(401);
    expect((await getRiskAdminListPayload(member, {}, now)).status).toBe(403);
    expect((await getRiskAdminListPayload(operator, {}, now)).status).toBe(200);

    await riskStore.save(riskEvent());
    expect(
      (
        await updateRiskAdminEventPayload(
          member,
          "risk_urgent_1",
          {
            action: "start_review",
            note: "开始复核",
          },
          now
        )
      ).status
    ).toBe(403);
    expect(
      (
        await updateRiskAdminEventPayload(
          admin,
          "risk_urgent_1",
          {
            action: "start_review",
            note: "开始复核",
          },
          now
        )
      ).status
    ).toBe(200);
  });

  it("lists risk events with summarized signals and no raw sensitive signal", async () => {
    await riskStore.save(riskEvent());
    await riskStore.save(
      riskEvent({
        id: "risk_reviewing_1",
        riskLevel: "high",
        source: "operator",
        signal: "运营内部记录也不直接暴露",
        status: "reviewing",
        createdAt: "2026-05-13T09:30:00.000Z",
      })
    );
    await riskStore.save(
      riskEvent({
        id: "risk_resolved_1",
        riskLevel: "medium",
        source: "chat",
        signal: "已解决事件原文",
        status: "resolved",
        createdAt: "2026-05-13T09:40:00.000Z",
        resolvedAt: "2026-05-13T09:50:00.000Z",
      })
    );

    const payload = await getRiskAdminListPayload(operator, {}, now);

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (!payload.body.ok) throw new Error("expected risk list payload");

    expect(payload.body.data.summary).toMatchObject({
      totalCount: 3,
      needsActionCount: 2,
      urgentCount: 1,
      resolvedCount: 1,
    });
    expect(payload.body.data.items[0]).toMatchObject({
      id: "risk_urgent_1",
      user: {
        displayName: "风险复核用户",
        phoneMasked: "138****2049",
      },
      signalSummary: "心理测评触发紧急风险复核",
    });
    expect(JSON.stringify(payload.body)).not.toContain(
      "原始敏感风险信号不应该暴露给前端"
    );
  });

  it("filters list by level, status, source and keyword", async () => {
    await riskStore.save(riskEvent());
    await riskStore.save(
      riskEvent({
        id: "risk_medium_1",
        riskLevel: "medium",
        source: "operator",
        status: "resolved",
        signal: "普通复核信号",
        createdAt: "2026-05-13T08:00:00.000Z",
      })
    );

    const payload = await getRiskAdminListPayload(
      operator,
      {
        riskLevel: "urgent",
        status: "open",
        source: "assessment",
        keyword: "风险复核用户",
      },
      now
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (payload.body.ok) {
      expect(payload.body.data.items.map(item => item.id)).toEqual([
        "risk_urgent_1",
      ]);
    }
  });

  it("returns detail and appends review records through status actions", async () => {
    await riskStore.save(riskEvent());

    const detail = await getRiskAdminDetailPayload(
      operator,
      "risk_urgent_1",
      now
    );
    expect(detail.status).toBe(200);
    expect(detail.body.ok).toBe(true);
    if (detail.body.ok) {
      expect(detail.body.data.sopTemplate?.id).toBe("sop_urgent_crisis_review");
      expect(detail.body.data.sopHints.length).toBeGreaterThan(0);
      expect(detail.body.data.sopHints[0]).toContain("安全状态");
      expect(detail.body.data.records).toEqual([]);
    }

    const started = await updateRiskAdminEventPayload(
      operator,
      "risk_urgent_1",
      {
        action: "start_review",
        note: "已开始人工复核",
      },
      now
    );

    expect(started.status).toBe(200);
    expect(started.body.ok).toBe(true);
    if (!started.body.ok) throw new Error("expected mutation payload");
    expect(started.body.data.record).toMatchObject({
      action: "start_review",
      previousStatus: "open",
      nextStatus: "reviewing",
      actorId: "operator_1",
    });
    expect(started.body.data.detail.event.status).toBe("reviewing");

    const resolved = await updateRiskAdminEventPayload(
      operator,
      "risk_urgent_1",
      {
        action: "resolve",
        note: "已完成风险复核并记录后续安排",
      },
      "2026-05-13T10:10:00.000Z"
    );

    expect(resolved.status).toBe(200);
    expect(resolved.body.ok).toBe(true);
    if (resolved.body.ok) {
      expect(resolved.body.data.detail.event).toMatchObject({
        status: "resolved",
        resolvedAt: "2026-05-13T10:10:00.000Z",
      });
      expect(resolved.body.data.detail.records).toHaveLength(2);
    }

    const conflict = await updateRiskAdminEventPayload(
      operator,
      "risk_urgent_1",
      {
        action: "start_review",
        note: "再次开始复核",
      },
      "2026-05-13T10:20:00.000Z"
    );

    expect(conflict.status).toBe(409);
  });

  it("loads SOP console and restricts SOP template mutations to admins", async () => {
    const consolePayload = await getRiskSopConsolePayload(operator, now);

    expect(consolePayload.status).toBe(200);
    expect(consolePayload.body.ok).toBe(true);
    if (!consolePayload.body.ok) throw new Error("expected SOP console");
    expect(consolePayload.body.data.templates.length).toBeGreaterThanOrEqual(3);
    expect(consolePayload.body.data.escalationQueue).toEqual([]);

    expect(
      (
        await updateRiskSopTemplatePayload(
          operator,
          "sop_high_followup_review",
          {
            enabled: false,
            reason: "运营账号不能修改 SOP",
          },
          now
        )
      ).status
    ).toBe(403);

    const mutation = await updateRiskSopTemplatePayload(
      admin,
      "sop_high_followup_review",
      {
        enabled: false,
        reason: "暂停高风险 SOP 测试",
      },
      "2026-05-13T10:30:00.000Z"
    );

    expect(mutation.status).toBe(200);
    expect(mutation.body.ok).toBe(true);
    if (mutation.body.ok) {
      expect(mutation.body.data.template).toMatchObject({
        id: "sop_high_followup_review",
        enabled: false,
        version: "2026.05.2",
      });
    }
  });

  it("creates escalation queue entries through SOP result templates", async () => {
    await riskStore.save(riskEvent({ id: "risk_escalate_1" }));

    const mutation = await updateRiskAdminEventPayload(
      admin,
      "risk_escalate_1",
      {
        action: "escalate",
        note: "风险需要负责人继续跟进",
        sopTemplateId: "sop_urgent_crisis_review",
        resultTemplateId: "result_urgent_escalate",
        escalation: {
          priority: "urgent",
          ownerId: "admin_1",
          reason: "需要具备危机干预资质的负责人确认安全状态",
        },
      },
      now
    );

    expect(mutation.status).toBe(200);
    expect(mutation.body.ok).toBe(true);
    if (!mutation.body.ok) throw new Error("expected escalation mutation");
    expect(mutation.body.data.record).toMatchObject({
      action: "escalate",
      nextStatus: "escalated",
      sopTemplateId: "sop_urgent_crisis_review",
      sopTemplateVersion: "2026.05.1",
      resultTemplateId: "result_urgent_escalate",
      escalation: {
        priority: "urgent",
        status: "assigned",
        ownerId: "admin_1",
      },
    });
    expect(mutation.body.data.detail.escalation).toMatchObject({
      riskEventId: "risk_escalate_1",
      status: "assigned",
    });

    const consolePayload = await getRiskSopConsolePayload(operator, now);
    expect(consolePayload.body.ok).toBe(true);
    if (consolePayload.body.ok) {
      expect(consolePayload.body.data.escalationQueue[0]).toMatchObject({
        riskEventId: "risk_escalate_1",
        priority: "urgent",
      });
    }
  });

  it("rejects invalid queries and missing events", async () => {
    expect(
      (await getRiskAdminListPayload(operator, { page: 0 }, now)).status
    ).toBe(400);
    expect(
      (await getRiskAdminDetailPayload(operator, "missing_risk", now)).status
    ).toBe(404);
    expect(
      (
        await updateRiskAdminEventPayload(
          operator,
          "missing_risk",
          {
            action: "resolve",
            note: "处理缺失事件",
          },
          now
        )
      ).status
    ).toBe(404);
  });
});
