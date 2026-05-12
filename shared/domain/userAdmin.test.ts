import { describe, expect, it } from "vitest";
import {
  ALL_USER_ADMIN_MEMBERSHIP_STATUS,
  ALL_USER_ADMIN_ROLE,
  UserAdminDetailSchema,
  UserAdminListQuerySchema,
  UserAdminListResultSchema,
  UserAdminMembershipActionRequestSchema,
  UserAdminMembershipMutationResultSchema,
} from "./user";

describe("user admin domain contract", () => {
  it("normalizes user admin list query defaults", () => {
    expect(UserAdminListQuerySchema.parse({})).toMatchObject({
      keyword: "",
      role: ALL_USER_ADMIN_ROLE,
      membershipStatus: ALL_USER_ADMIN_MEMBERSHIP_STATUS,
      sort: "last_activity_desc",
      page: 1,
      pageSize: 12,
    });
  });

  it("validates privacy-minimized user admin list results", () => {
    const parsed = UserAdminListResultSchema.parse({
      items: [
        {
          id: "u_member_1",
          displayName: "测试会员",
          phoneMasked: "138****2049",
          roles: ["member"],
          membershipStatus: "active",
          membershipPlanName: "成长会员",
          membershipExpiresAt: "2027-05-12T10:00:00+08:00",
          ownedCourseCount: 2,
          orderCount: 1,
          counselingAppointmentCount: 1,
          activeRiskCount: 0,
          latestOrderStatus: "paid",
          lastActivityAt: "2026-05-12T10:00:00+08:00",
          createdAt: "2026-05-10T10:00:00+08:00",
          updatedAt: "2026-05-12T10:00:00+08:00",
          privacyFlags: {
            isMinor: false,
            guardianVerified: false,
            phoneMasked: true,
          },
        },
      ],
      meta: {
        page: 1,
        pageSize: 12,
        total: 1,
        totalPages: 1,
      },
      summary: {
        totalCount: 1,
        activeMembershipCount: 1,
        expiredMembershipCount: 0,
        minorCount: 0,
        activeRiskCount: 0,
      },
      filters: {
        roles: ["member"],
        membershipStatuses: ["active"],
      },
      query: {},
      serverTime: "2026-05-12T10:00:00+08:00",
    });

    expect(parsed.items[0]?.phoneMasked).toContain("****");
    expect(parsed.query.pageSize).toBe(12);
  });

  it("validates detail summaries without sensitive risk signal text", () => {
    const parsed = UserAdminDetailSchema.parse({
      user: {
        id: "u_member_1",
        displayName: "测试会员",
        phoneMasked: "138****2049",
        roles: ["member"],
        membershipStatus: "active",
        ownedCourseCount: 1,
        orderCount: 1,
        counselingAppointmentCount: 1,
        activeRiskCount: 1,
        createdAt: "2026-05-10T10:00:00+08:00",
        updatedAt: "2026-05-12T10:00:00+08:00",
        privacyFlags: {
          isMinor: false,
          guardianVerified: false,
          phoneMasked: true,
        },
      },
      consents: [
        {
          type: "privacy",
          version: "2026.05",
          acceptedAt: "2026-05-10T10:00:00+08:00",
        },
      ],
      membership: {
        status: "active",
        planName: "成长会员",
        activatedAt: "2026-05-10T10:00:00+08:00",
        expiresAt: "2027-05-10T10:00:00+08:00",
        activeNow: true,
      },
      membershipAuditEvents: [],
      courseAccess: {
        ownedCourseIds: [1],
        ownedCourseCount: 1,
        orderCount: 1,
        recentOrders: [
          {
            id: "order_1",
            status: "paid",
            itemTypes: ["course"],
            title: "情绪管理入门",
            payableAmount: 199,
            createdAt: "2026-05-11T10:00:00+08:00",
            paidAt: "2026-05-11T10:01:00+08:00",
          },
        ],
      },
      counseling: {
        totalCount: 1,
        upcomingCount: 1,
        recentAppointments: [
          {
            appointmentId: "appointment_1",
            status: "scheduled",
            counselorName: "林若安",
            channel: "video",
            startsAt: "2026-05-13T10:00:00+08:00",
            createdAt: "2026-05-12T10:00:00+08:00",
            orderStatus: "paid",
            riskLevel: "high",
          },
        ],
      },
      risk: {
        openCount: 1,
        highestRiskLevel: "high",
        recentEvents: [
          {
            id: "risk_1",
            source: "assessment",
            riskLevel: "high",
            status: "open",
            createdAt: "2026-05-12T10:00:00+08:00",
          },
        ],
      },
      privacyNotice:
        "用户后台仅展示运营所需摘要，手机号为脱敏值，不展示敏感原文。",
      generatedAt: "2026-05-12T10:00:00+08:00",
    });

    expect(parsed.risk.recentEvents[0]).not.toHaveProperty("signal");
  });

  it("validates membership admin actions and audit mutation results", () => {
    const action = UserAdminMembershipActionRequestSchema.parse({
      action: "extend",
      durationDays: 30,
      reason: "客服补偿延期",
    });

    const parsed = UserAdminMembershipMutationResultSchema.parse({
      detail: {
        user: {
          id: "u_member_1",
          displayName: "测试会员",
          roles: ["member"],
          membershipStatus: "active",
          ownedCourseCount: 0,
          orderCount: 0,
          counselingAppointmentCount: 0,
          activeRiskCount: 0,
          createdAt: "2026-05-10T10:00:00+08:00",
          updatedAt: "2026-05-12T10:00:00+08:00",
          privacyFlags: {
            isMinor: false,
            guardianVerified: false,
            phoneMasked: false,
          },
        },
        consents: [],
        membership: {
          status: "active",
          planName: "成长会员",
          activatedAt: "2026-05-10T10:00:00+08:00",
          expiresAt: "2027-06-09T10:00:00+08:00",
          activeNow: true,
        },
        membershipAuditEvents: [
          {
            id: "audit_1",
            userId: "u_member_1",
            actorId: "operator_1",
            actorRoles: ["operator"],
            action: action.action,
            reason: action.reason,
            before: {
              status: "active",
              planName: "成长会员",
              activatedAt: "2026-05-10T10:00:00+08:00",
              expiresAt: "2027-05-10T10:00:00+08:00",
            },
            after: {
              status: "active",
              planName: "成长会员",
              activatedAt: "2026-05-10T10:00:00+08:00",
              expiresAt: "2027-06-09T10:00:00+08:00",
            },
            createdAt: "2026-05-12T10:00:00+08:00",
          },
        ],
        courseAccess: {
          ownedCourseIds: [],
          ownedCourseCount: 0,
          orderCount: 0,
          recentOrders: [],
        },
        counseling: {
          totalCount: 0,
          upcomingCount: 0,
          recentAppointments: [],
        },
        risk: {
          openCount: 0,
          recentEvents: [],
        },
        privacyNotice: "用户后台仅展示运营所需摘要。",
        generatedAt: "2026-05-12T10:00:00+08:00",
      },
      auditEvent: {
        id: "audit_1",
        userId: "u_member_1",
        actorId: "operator_1",
        actorRoles: ["operator"],
        action: "extend",
        reason: "客服补偿延期",
        before: {
          status: "active",
          planName: "成长会员",
          activatedAt: "2026-05-10T10:00:00+08:00",
          expiresAt: "2027-05-10T10:00:00+08:00",
        },
        after: {
          status: "active",
          planName: "成长会员",
          activatedAt: "2026-05-10T10:00:00+08:00",
          expiresAt: "2027-06-09T10:00:00+08:00",
        },
        createdAt: "2026-05-12T10:00:00+08:00",
      },
      auditEvents: [
        {
          id: "audit_1",
          userId: "u_member_1",
          actorId: "operator_1",
          actorRoles: ["operator"],
          action: "extend",
          reason: "客服补偿延期",
          before: {
            status: "active",
            planName: "成长会员",
            activatedAt: "2026-05-10T10:00:00+08:00",
            expiresAt: "2027-05-10T10:00:00+08:00",
          },
          after: {
            status: "active",
            planName: "成长会员",
            activatedAt: "2026-05-10T10:00:00+08:00",
            expiresAt: "2027-06-09T10:00:00+08:00",
          },
          createdAt: "2026-05-12T10:00:00+08:00",
        },
      ],
      serverTime: "2026-05-12T10:00:00+08:00",
    });

    expect(parsed.auditEvent.action).toBe("extend");
    expect(parsed.auditEvents[0]?.before.status).toBe("active");
  });
});
