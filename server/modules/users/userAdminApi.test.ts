import { beforeEach, describe, expect, it } from "vitest";
import {
  CourseAccessStateSchema,
  LoginSessionSchema,
  RiskEventSchema,
} from "../../../shared/domain";
import {
  InMemoryAuthSessionStore,
  type AuthSessionStore,
} from "../auth/authSessionStore";
import { setAuthSessionStore } from "../auth/authSessionApi";
import {
  InMemoryCourseAccessStore,
  type CourseAccessStore,
} from "../courses/courseAccessStore";
import { setCourseAccessStore } from "../courses/courseAccessApi";
import {
  InMemoryCounselingAppointmentStore,
  type CounselingAppointmentStore,
} from "../counseling/counselingAppointmentStore";
import { setCounselingAppointmentStore } from "../counseling/counselingApi";
import {
  InMemoryRiskEventStore,
  type RiskEventStore,
} from "../risk/riskEventStore";
import { setRiskEventStore, saveRiskEvent } from "../risk/riskEventStore";
import {
  getAdminUserDetailPayload,
  getAdminUserListPayload,
  updateAdminUserMembershipPayload,
} from "./userAdminApi";

const operator = { id: "operator_1", roles: ["operator" as const] };
const member = { id: "member_1", roles: ["member" as const] };

let authStore: AuthSessionStore;
let courseAccessStore: CourseAccessStore;
let counselingStore: CounselingAppointmentStore;
let riskStore: RiskEventStore;

beforeEach(() => {
  authStore = new InMemoryAuthSessionStore();
  courseAccessStore = new InMemoryCourseAccessStore();
  counselingStore = new InMemoryCounselingAppointmentStore(
    new Date("2026-05-12T00:00:00.000Z")
  );
  riskStore = new InMemoryRiskEventStore();

  setAuthSessionStore(authStore);
  setCourseAccessStore(courseAccessStore);
  setCounselingAppointmentStore(counselingStore);
  setRiskEventStore(riskStore);
});

describe("user admin api payloads", () => {
  it("requires user read permission", async () => {
    expect((await getAdminUserListPayload(null, {})).status).toBe(401);
    expect((await getAdminUserListPayload(member, {})).status).toBe(403);
    expect((await getAdminUserListPayload(operator, {})).status).toBe(200);
  });

  it("requires membership operation permission for manual member actions", async () => {
    expect(
      (
        await updateAdminUserMembershipPayload(null, "u_demo_active_member", {
          action: "extend",
          durationDays: 30,
          reason: "客服补偿延期",
        })
      ).status
    ).toBe(401);
    expect(
      (
        await updateAdminUserMembershipPayload(member, "u_demo_active_member", {
          action: "extend",
          durationDays: 30,
          reason: "客服补偿延期",
        })
      ).status
    ).toBe(403);
  });

  it("returns development fallback users with masked phone data", async () => {
    const payload = await getAdminUserListPayload(
      operator,
      { membershipStatus: "active" },
      "2026-05-12T10:00:00.000Z"
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (payload.body.ok) {
      expect(payload.body.data.items.length).toBeGreaterThan(0);
      expect(payload.body.data.summary.activeMembershipCount).toBeGreaterThan(
        0
      );
      expect(payload.body.data.items[0]?.phoneMasked).toContain("****");
      expect(JSON.stringify(payload.body.data)).not.toContain("13800132049");
    }
  });

  it("aggregates course access, counseling and risk summaries for real users", async () => {
    const now = "2026-05-12T10:00:00.000Z";
    const userId = "u_real_member";
    await authStore.saveSession(
      "session_real_member",
      LoginSessionSchema.parse({
        provider: "phone",
        accessTokenExpiresAt: "2026-05-19T10:00:00.000Z",
        user: {
          id: userId,
          displayName: "真实会员",
          phoneMasked: "139****8899",
          roles: ["member"],
          isMinor: false,
          createdAt: "2026-05-10T09:00:00.000Z",
          updatedAt: "2026-05-12T09:00:00.000Z",
        },
        consents: [
          {
            userId,
            type: "privacy",
            version: "2026.05",
            acceptedAt: "2026-05-10T09:00:00.000Z",
          },
        ],
      })
    );
    await courseAccessStore.save(
      userId,
      CourseAccessStateSchema.parse({
        ownedCourseIds: [1],
        membership: {
          status: "active",
          planName: "成长会员",
          activatedAt: "2026-05-10T09:10:00.000Z",
          expiresAt: "2027-05-10T09:10:00.000Z",
        },
        orders: [
          {
            id: "order_real_course_1",
            userId,
            status: "paid",
            items: [
              {
                type: "course",
                targetId: "1",
                title: "情绪管理入门",
                unitPrice: 199,
                quantity: 1,
              },
            ],
            subtotal: 199,
            discountAmount: 0,
            payableAmount: 199,
            createdAt: "2026-05-11T10:00:00.000Z",
            paidAt: "2026-05-11T10:02:00.000Z",
          },
        ],
      })
    );

    const slot = (await counselingStore.listSlots(new Date(now)))[0];
    if (!slot) throw new Error("missing counseling slot");
    const riskEvent = RiskEventSchema.parse({
      id: "risk_real_1",
      userId,
      source: "counseling_intake",
      riskLevel: "high",
      signal: "测试风险原文不应出现在用户后台详情",
      status: "open",
      createdAt: "2026-05-12T09:30:00.000Z",
    });
    await counselingStore.saveAppointment(
      {
        id: "appointment_real_1",
        userId,
        counselorId: slot.counselorId,
        slotId: slot.id,
        orderId: "order_real_course_1",
        channel: slot.channel,
        status: "scheduled",
        concernTags: ["emotion"],
        createdAt: "2026-05-12T09:20:00.000Z",
        updatedAt: "2026-05-12T09:25:00.000Z",
      },
      riskEvent
    );
    await saveRiskEvent(riskEvent);

    const list = await getAdminUserListPayload(operator, {}, now);
    expect(list.status).toBe(200);
    expect(list.body.ok).toBe(true);
    if (list.body.ok) {
      expect(list.body.data.items[0]).toMatchObject({
        id: userId,
        membershipStatus: "active",
        ownedCourseCount: 1,
        counselingAppointmentCount: 1,
        activeRiskCount: 1,
      });
    }

    const detail = await getAdminUserDetailPayload(operator, userId, now);
    expect(detail.status).toBe(200);
    expect(detail.body.ok).toBe(true);
    if (detail.body.ok) {
      expect(detail.body.data.courseAccess.recentOrders[0]).toMatchObject({
        id: "order_real_course_1",
        status: "paid",
      });
      expect(detail.body.data.counseling.recentAppointments[0]).toMatchObject({
        appointmentId: "appointment_real_1",
        riskLevel: "high",
      });
      expect(detail.body.data.risk.highestRiskLevel).toBe("high");
      expect(JSON.stringify(detail.body.data)).not.toContain(
        "测试风险原文不应出现在用户后台详情"
      );
    }
  });

  it("updates fallback user membership and records audit events", async () => {
    const now = "2026-05-12T10:00:00.000Z";
    const payload = await updateAdminUserMembershipPayload(
      operator,
      "u_demo_active_member",
      {
        action: "extend",
        durationDays: 30,
        reason: "客服补偿延期",
      },
      now
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (payload.body.ok) {
      expect(payload.body.data.auditEvent).toMatchObject({
        userId: "u_demo_active_member",
        actorId: "operator_1",
        action: "extend",
        reason: "客服补偿延期",
        before: {
          status: "active",
          expiresAt: "2027-05-01T09:10:00+08:00",
        },
        after: {
          status: "active",
          expiresAt: "2027-05-31T01:10:00.000Z",
          sourceType: "admin_manual",
          sourceActorId: "operator_1",
        },
      });
      expect(payload.body.data.detail.membershipAuditEvents[0]).toMatchObject({
        action: "extend",
        reason: "客服补偿延期",
      });
    }

    const storedState = await courseAccessStore.load("u_demo_active_member");
    expect(storedState.membership).toMatchObject({
      status: "active",
      expiresAt: "2027-05-31T01:10:00.000Z",
      sourceType: "admin_manual",
      sourceActorId: "operator_1",
      sourceUpdatedAt: now,
    });

    const detail = await getAdminUserDetailPayload(
      operator,
      "u_demo_active_member",
      now
    );
    expect(detail.status).toBe(200);
    expect(detail.body.ok).toBe(true);
    if (detail.body.ok) {
      expect(detail.body.data.membershipAuditEvents[0]?.actorRoles).toContain(
        "operator"
      );
    }
  });
});
