import { describe, expect, it } from "vitest";
import {
  parseCounselingAppointmentActionResponse,
  parseCounselingAppointmentCreateResponse,
  parseCounselingAppointmentListResponse,
  parseCounselingAdminScheduleConsoleResponse,
  parseCounselingAdminScheduleMutationResponse,
  parseCounselingAvailabilityResponse,
  parseCounselingCancellationPolicyUpdateResponse,
  parseCounselingOperationsConsoleResponse,
  parseCounselingServiceRecordConsoleResponse,
  parseCounselingWorkbenchResponse,
  parseCounselorAdminProfileConsoleResponse,
  parseCounselorAdminProfileMutationResponse,
} from "./httpCounselingRepository";

const counselor = {
  id: "counselor_lin",
  name: "林若安",
  title: "国家二级心理咨询师",
  introduction: "擅长情绪与自我成长议题。",
  specialties: ["emotion", "personal_growth"],
  licenseSummary: "执业 9 年",
  yearsOfPractice: 9,
  sessionPrice: 399,
  rating: 4.9,
};

const slot = {
  id: "slot_1",
  counselorId: "counselor_lin",
  startsAt: "2026-05-11T10:00:00.000Z",
  endsAt: "2026-05-11T10:50:00.000Z",
  channel: "video",
  available: true,
};

const order = {
  id: "order_counseling_appointment_1",
  userId: "user_1",
  status: "pending_payment",
  items: [
    {
      type: "counseling_session",
      targetId: "appointment_1",
      title: "林若安 咨询服务",
      unitPrice: 399,
      quantity: 1,
    },
  ],
  subtotal: 399,
  discountAmount: 0,
  payableAmount: 399,
  createdAt: "2026-05-10T00:00:00.000Z",
};

describe("http counseling repository parsing", () => {
  it("parses availability response", () => {
    expect(
      parseCounselingAvailabilityResponse({
        ok: true,
        data: {
          counselors: [counselor],
          slots: [slot],
          serverTime: "2026-05-10T00:00:00.000Z",
        },
      })
    ).toMatchObject({
      counselors: [counselor],
      slots: [slot],
    });
  });

  it("parses appointment creation response", () => {
    const appointment = {
      id: "appointment_1",
      userId: "user_1",
      counselorId: counselor.id,
      slotId: slot.id,
      orderId: order.id,
      channel: "video",
      status: "pending_payment",
      concernTags: ["emotion"],
      assessmentReportId: "report_1",
      createdAt: "2026-05-10T00:00:00.000Z",
      updatedAt: "2026-05-10T00:00:00.000Z",
    };

    expect(
      parseCounselingAppointmentCreateResponse({
        ok: true,
        data: {
          appointment,
          counselor,
          slot,
          order,
          nextSteps: ["请在 30 分钟内完成支付以保留时段。"],
        },
      })
    ).toMatchObject({
      appointment,
      counselor,
    });
  });

  it("parses appointment list response", () => {
    const appointment = {
      id: "appointment_1",
      userId: "user_1",
      counselorId: counselor.id,
      slotId: slot.id,
      channel: "video",
      status: "pending_payment",
      concernTags: ["emotion"],
      assessmentReportId: "report_1",
      createdAt: "2026-05-10T00:00:00.000Z",
      updatedAt: "2026-05-10T00:00:00.000Z",
    };

    expect(
      parseCounselingAppointmentListResponse({
        ok: true,
        data: {
          appointments: [{ appointment, counselor, slot }],
          serverTime: "2026-05-10T00:00:00.000Z",
        },
      }).appointments
    ).toHaveLength(1);
  });

  it("parses appointment action response", () => {
    const appointment = {
      id: "appointment_1",
      userId: "user_1",
      counselorId: counselor.id,
      slotId: slot.id,
      channel: "video",
      status: "scheduled",
      concernTags: ["emotion"],
      createdAt: "2026-05-10T00:00:00.000Z",
      updatedAt: "2026-05-10T00:10:00.000Z",
    };

    expect(
      parseCounselingAppointmentActionResponse({
        ok: true,
        data: {
          appointment,
          counselor,
          slot: {
            ...slot,
            available: false,
          },
          nextSteps: ["预约已确认。"],
        },
      }).appointment.status
    ).toBe("scheduled");
  });

  it("parses counselor workbench response", () => {
    const appointment = {
      id: "appointment_1",
      userId: "user_1",
      counselorId: counselor.id,
      slotId: slot.id,
      orderId: order.id,
      channel: "video",
      status: "scheduled",
      concernTags: ["emotion"],
      createdAt: "2026-05-10T00:00:00.000Z",
      updatedAt: "2026-05-10T00:10:00.000Z",
    };

    expect(
      parseCounselingWorkbenchResponse({
        ok: true,
        data: {
          appointments: [
            {
              appointment,
              counselor,
              slot: {
                ...slot,
                available: false,
              },
              order: {
                ...order,
                status: "paid",
                paidAt: "2026-05-10T00:10:00.000Z",
              },
            },
          ],
          summary: {
            scheduledCount: 1,
            pendingPaymentCount: 0,
            refundingCount: 0,
            completedCount: 0,
            noShowCount: 0,
          },
          serverTime: "2026-05-10T00:10:00.000Z",
        },
      }).summary.scheduledCount
    ).toBe(1);
  });

  it("parses operations console and policy update responses", () => {
    const auditEvent = {
      id: "audit_1",
      action: "cancellation_policy_updated",
      actorId: "operator_1",
      actorRoles: ["operator"],
      policyBefore: {
        scheduledRefundCutoffMinutesBeforeStart: 0,
        allowPendingPaymentCancellation: true,
      },
      policyAfter: {
        scheduledRefundCutoffMinutesBeforeStart: 120,
        allowPendingPaymentCancellation: false,
      },
      note: "节假日前调整",
      createdAt: "2026-05-10T00:00:00.000Z",
    };

    const cancellationPolicy = {
      scheduledRefundCutoffMinutesBeforeStart: 120,
      allowPendingPaymentCancellation: false,
    };

    expect(
      parseCounselingOperationsConsoleResponse({
        ok: true,
        data: {
          cancellationPolicy,
          auditEvents: [auditEvent],
          serverTime: "2026-05-10T00:00:00.000Z",
        },
      }).auditEvents
    ).toHaveLength(1);

    expect(
      parseCounselingCancellationPolicyUpdateResponse({
        ok: true,
        data: {
          cancellationPolicy,
          auditEvent,
          serverTime: "2026-05-10T00:01:00.000Z",
        },
      }).cancellationPolicy.allowPendingPaymentCancellation
    ).toBe(false);
  });

  it("parses admin schedule console and mutation responses", () => {
    const scheduleConsole = {
      counselors: [
        {
          counselor,
          serviceStatus: "active",
          nextAvailableAt: slot.startsAt,
          summary: {
            availableCount: 1,
            lockedCount: 0,
            scheduledCount: 0,
            closedCount: 1,
          },
          slots: [
            {
              ...slot,
              counselorName: counselor.name,
              status: "available",
            },
            {
              ...slot,
              id: "slot_closed",
              counselorName: counselor.name,
              status: "closed",
              conflictHint: "该时段已关闭",
            },
          ],
        },
      ],
      windowStart: "2026-05-10T00:00:00.000Z",
      windowEnd: "2026-06-09T00:00:00.000Z",
      serverTime: "2026-05-10T00:00:00.000Z",
    };
    const auditEvent = {
      id: "audit_schedule_1",
      action: "schedule_slot_added",
      actorId: "operator_1",
      actorRoles: ["operator"],
      counselorId: counselor.id,
      note: "新增可预约时段 slot_1",
      createdAt: "2026-05-10T00:00:00.000Z",
    };

    expect(
      parseCounselingAdminScheduleConsoleResponse({
        ok: true,
        data: scheduleConsole,
      }).counselors[0]?.serviceStatus
    ).toBe("active");

    expect(
      parseCounselingAdminScheduleMutationResponse({
        ok: true,
        data: {
          scheduleConsole,
          slot: scheduleConsole.counselors[0].slots[0],
          auditEvent,
          serverTime: "2026-05-10T00:01:00.000Z",
        },
      }).auditEvent?.action
    ).toBe("schedule_slot_added");
  });

  it("parses service record console responses", () => {
    expect(
      parseCounselingServiceRecordConsoleResponse({
        ok: true,
        data: {
          counselors: [
            {
              ...counselor,
            },
          ],
          filters: {
            anomalyType: "payment_hold_expiring",
            limit: 50,
          },
          records: [
            {
              appointmentId: "appointment_1",
              userId: "user_1",
              counselorId: counselor.id,
              counselorName: counselor.name,
              slotId: slot.id,
              startsAt: slot.startsAt,
              endsAt: slot.endsAt,
              channel: "video",
              appointmentStatus: "pending_payment",
              orderId: order.id,
              orderStatus: "pending_payment",
              payableAmount: 399,
              paymentDeadlineAt: "2026-05-10T00:30:00.000Z",
              minutesUntilStart: 2040,
              riskLevel: "high",
              anomalies: ["payment_hold_expiring"],
              latestAuditAction: "schedule_slot_added",
              latestAuditAt: "2026-05-10T00:10:00.000Z",
              operationHint: "支付锁位即将到期，请提醒用户或释放资源。",
              createdAt: "2026-05-10T00:00:00.000Z",
              updatedAt: "2026-05-10T00:00:00.000Z",
            },
          ],
          summary: {
            totalCount: 1,
            anomalyCount: 1,
            pendingPaymentCount: 1,
            scheduledCount: 0,
            completedCount: 0,
            cancelledCount: 0,
            noShowCount: 0,
            refundingCount: 0,
            paymentHoldExpiringCount: 1,
            paymentHoldExpiredCount: 0,
            upcomingUnconfirmedCount: 0,
          },
          serverTime: "2026-05-10T00:25:00.000Z",
        },
      }).records[0]?.anomalies
    ).toContain("payment_hold_expiring");
  });

  it("parses counselor profile console and mutation responses", () => {
    const profile = {
      counselor,
      serviceStatus: "active",
      acceptsNewClients: true,
      credentialStatus: "expiring_soon",
      credentialExpiresAt: "2026-08-10T00:00:00.000Z",
      scheduleSummary: {
        availableCount: 2,
        lockedCount: 1,
        scheduledCount: 3,
        closedCount: 0,
      },
      serviceSummary: {
        totalAppointments: 4,
        scheduledCount: 2,
        completedCount: 1,
        noShowCount: 0,
        anomalyCount: 1,
      },
      nextAvailableAt: slot.startsAt,
      updatedAt: "2026-05-10T00:00:00.000Z",
      updatedBy: "operator_1",
    };
    const consolePayload = {
      filters: {
        serviceStatus: "active",
        limit: 50,
      },
      profiles: [profile],
      summary: {
        totalCount: 1,
        activeCount: 1,
        pausedCount: 0,
        acceptingNewClientsCount: 1,
        pendingReviewCount: 0,
        expiringSoonCount: 1,
        expiredCredentialCount: 0,
      },
      serverTime: "2026-05-10T00:00:00.000Z",
    };
    const auditEvent = {
      id: "audit_counselor_1",
      action: "counselor_service_status_updated",
      actorId: "operator_1",
      actorRoles: ["operator"],
      counselorId: counselor.id,
      note: "暂停咨询师接单",
      createdAt: "2026-05-10T00:01:00.000Z",
    };

    expect(
      parseCounselorAdminProfileConsoleResponse({
        ok: true,
        data: consolePayload,
      }).profiles[0]?.credentialStatus
    ).toBe("expiring_soon");

    expect(
      parseCounselorAdminProfileMutationResponse({
        ok: true,
        data: {
          profile,
          console: consolePayload,
          auditEvent,
          serverTime: "2026-05-10T00:01:00.000Z",
        },
      }).auditEvent.action
    ).toBe("counselor_service_status_updated");
  });

  it("throws on error response", () => {
    expect(() =>
      parseCounselingAvailabilityResponse({
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "咨询服务暂时不可用",
        },
      })
    ).toThrow("咨询服务暂时不可用");
  });
});
