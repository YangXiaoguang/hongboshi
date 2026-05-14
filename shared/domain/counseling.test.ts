import { describe, expect, it } from "vitest";
import {
  applyCounselingAppointmentAction,
  applyCounselingAppointmentReschedule,
  CounselingCancellationPolicyUpdateRequestSchema,
  CounselingAdminScheduleActionRequestSchema,
  CounselingAdminScheduleConsoleSchema,
  CounselorAdminProfileConsoleSchema,
  CounselorAdminProfileUpdateRequestSchema,
  CounselingOperationAuditEventSchema,
  CounselingServiceRecordConsoleSchema,
  CounselingServiceRecordFilterSchema,
  evaluateCounselingCancellation,
  expireOverdueCounselingAppointmentPayment,
  getCounselingPaymentDeadline,
  getNextCounselingAppointmentStatus,
  isCounselingPaymentExpired,
  type CounselingAppointment,
} from "./counseling";

const appointment: CounselingAppointment = {
  id: "appointment_1",
  userId: "user_1",
  counselorId: "counselor_1",
  slotId: "slot_1",
  channel: "video",
  status: "pending_payment",
  concernTags: ["emotion"],
  createdAt: "2026-05-10T10:00:00.000Z",
  updatedAt: "2026-05-10T10:00:00.000Z",
};

describe("counseling appointment status machine", () => {
  it("confirms payment from pending to scheduled", () => {
    const next = applyCounselingAppointmentAction({
      appointment,
      action: "confirm_payment",
      now: "2026-05-10T10:15:00.000Z",
    });

    expect(next).toMatchObject({
      status: "scheduled",
      updatedAt: "2026-05-10T10:15:00.000Z",
    });
  });

  it("cancels active appointments only", () => {
    expect(getNextCounselingAppointmentStatus("scheduled", "cancel")).toBe(
      "cancelled"
    );
    expect(getNextCounselingAppointmentStatus("completed", "cancel")).toBe(
      undefined
    );
  });

  it("evaluates cancellation policy for unpaid and confirmed appointments", () => {
    const slot = {
      id: "slot_1",
      counselorId: "counselor_1",
      startsAt: "2026-05-11T10:00:00.000Z",
      endsAt: "2026-05-11T11:00:00.000Z",
      channel: "video" as const,
      available: false,
    };

    expect(
      evaluateCounselingCancellation({
        appointment,
        slot,
        now: "2026-05-10T10:00:00.000Z",
      })
    ).toMatchObject({
      canCancel: true,
      orderTransition: "close_unpaid",
    });

    expect(
      evaluateCounselingCancellation({
        appointment: { ...appointment, status: "scheduled" },
        slot,
        now: "2026-05-11T09:30:00.000Z",
        policy: {
          scheduledRefundCutoffMinutesBeforeStart: 60,
          allowPendingPaymentCancellation: true,
        },
      })
    ).toMatchObject({
      canCancel: false,
      orderTransition: "none",
    });

    expect(
      evaluateCounselingCancellation({
        appointment: { ...appointment, status: "scheduled" },
        slot,
        now: "2026-05-11T08:30:00.000Z",
        policy: {
          scheduledRefundCutoffMinutesBeforeStart: 60,
          allowPendingPaymentCancellation: true,
        },
      })
    ).toMatchObject({
      canCancel: true,
      orderTransition: "request_refund",
    });
  });

  it("validates operation policy updates and audit events", () => {
    expect(
      CounselingCancellationPolicyUpdateRequestSchema.parse({
        policy: {
          scheduledRefundCutoffMinutesBeforeStart: 120,
          allowPendingPaymentCancellation: false,
        },
        reason: "节假日前临时收紧取消规则",
      }).policy.scheduledRefundCutoffMinutesBeforeStart
    ).toBe(120);

    expect(
      CounselingOperationAuditEventSchema.parse({
        id: "audit_1",
        action: "complete_session",
        actorId: "counselor_1",
        actorRoles: ["counselor"],
        appointmentId: "appointment_1",
        userId: "user_1",
        counselorId: "counselor_1",
        previousAppointmentStatus: "scheduled",
        nextAppointmentStatus: "completed",
        previousOrderStatus: "paid",
        nextOrderStatus: "paid",
        createdAt: "2026-05-10T11:00:00.000Z",
      }).nextAppointmentStatus
    ).toBe("completed");
  });

  it("validates admin schedule console and slot actions", () => {
    const scheduleConsole = CounselingAdminScheduleConsoleSchema.parse({
      counselors: [
        {
          counselor: {
            id: "counselor_1",
            name: "林若安",
            title: "国家二级心理咨询师",
            introduction: "擅长情绪与自我成长议题。",
            specialties: ["emotion"],
            licenseSummary: "执业 9 年",
            yearsOfPractice: 9,
            sessionPrice: 399,
            rating: 4.9,
          },
          serviceStatus: "active",
          nextAvailableAt: "2026-05-11T10:00:00.000Z",
          summary: {
            availableCount: 1,
            lockedCount: 1,
            scheduledCount: 0,
            closedCount: 1,
          },
          slots: [
            {
              id: "slot_1",
              counselorId: "counselor_1",
              counselorName: "林若安",
              startsAt: "2026-05-11T10:00:00.000Z",
              endsAt: "2026-05-11T10:50:00.000Z",
              channel: "video",
              status: "available",
            },
            {
              id: "slot_2",
              counselorId: "counselor_1",
              counselorName: "林若安",
              startsAt: "2026-05-11T14:00:00.000Z",
              endsAt: "2026-05-11T14:50:00.000Z",
              channel: "voice",
              status: "locked",
              appointmentId: "appointment_1",
              appointmentStatus: "pending_payment",
              conflictHint: "待支付预约正在锁定该时段",
            },
          ],
        },
      ],
      windowStart: "2026-05-10T00:00:00.000Z",
      windowEnd: "2026-06-09T00:00:00.000Z",
      serverTime: "2026-05-10T00:00:00.000Z",
    });

    expect(scheduleConsole.counselors[0]?.summary.availableCount).toBe(1);
    expect(
      CounselingAdminScheduleActionRequestSchema.parse({
        action: "add_available_slot",
        counselorId: "counselor_1",
        startsAt: "2026-05-12T10:00:00.000Z",
        endsAt: "2026-05-12T10:50:00.000Z",
      }).channel
    ).toBe("video");
    expect(
      CounselingAdminScheduleActionRequestSchema.parse({
        action: "close_slot",
        slotId: "slot_1",
        reason: "临时会议",
      }).reason
    ).toBe("临时会议");
  });

  it("reschedules confirmed appointments to an available slot", () => {
    const next = applyCounselingAppointmentReschedule({
      appointment: {
        ...appointment,
        status: "scheduled",
      },
      nextSlot: {
        id: "slot_2",
        counselorId: "counselor_2",
        startsAt: "2026-05-11T10:00:00.000Z",
        endsAt: "2026-05-11T11:00:00.000Z",
        channel: "voice",
        available: true,
      },
      now: "2026-05-10T10:20:00.000Z",
    });

    expect(next).toMatchObject({
      status: "scheduled",
      counselorId: "counselor_2",
      slotId: "slot_2",
      channel: "voice",
      updatedAt: "2026-05-10T10:20:00.000Z",
    });
  });

  it("validates service record console contracts and filters", () => {
    expect(
      CounselingServiceRecordFilterSchema.parse({
        counselorId: "counselor_1",
        appointmentStatus: "pending_payment",
        anomalyType: "payment_hold_expiring",
        keyword: "user_1",
        limit: 20,
      }).anomalyType
    ).toBe("payment_hold_expiring");

    const consolePayload = CounselingServiceRecordConsoleSchema.parse({
      counselors: [
        {
          id: "counselor_1",
          name: "林若安",
          title: "国家二级心理咨询师",
          introduction: "擅长情绪与自我成长议题。",
          specialties: ["emotion"],
          licenseSummary: "执业 9 年",
          yearsOfPractice: 9,
          sessionPrice: 399,
          rating: 4.9,
        },
      ],
      filters: {
        counselorId: "counselor_1",
        appointmentStatus: "pending_payment",
        anomalyType: "payment_hold_expiring",
        keyword: "user_1",
        limit: 20,
      },
      records: [
        {
          appointmentId: "appointment_1",
          userId: "user_1",
          counselorId: "counselor_1",
          counselorName: "林若安",
          slotId: "slot_1",
          startsAt: "2026-05-11T10:00:00.000Z",
          endsAt: "2026-05-11T10:50:00.000Z",
          channel: "video",
          appointmentStatus: "pending_payment",
          orderId: "order_1",
          orderStatus: "pending_payment",
          payableAmount: 399,
          paymentDeadlineAt: "2026-05-10T10:30:00.000Z",
          minutesUntilStart: 1440,
          riskLevel: "medium",
          anomalies: ["payment_hold_expiring"],
          latestAuditAction: "schedule_slot_added",
          latestAuditAt: "2026-05-10T10:05:00.000Z",
          operationHint: "支付锁位即将到期，请提醒用户或释放资源。",
          createdAt: "2026-05-10T10:00:00.000Z",
          updatedAt: "2026-05-10T10:00:00.000Z",
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
      serverTime: "2026-05-10T10:25:00.000Z",
    });

    expect(consolePayload.records[0]?.anomalies).toContain(
      "payment_hold_expiring"
    );
  });

  it("validates counselor admin profile contracts and updates", () => {
    const update = CounselorAdminProfileUpdateRequestSchema.parse({
      counselorId: "counselor_1",
      profile: {
        title: "资深心理咨询师",
        specialties: ["emotion", "personal_growth"],
        serviceStatus: "paused",
        acceptsNewClients: false,
        credentialStatus: "expiring_soon",
      },
      reason: "资质年审前暂停接单",
    });
    expect(update.profile.serviceStatus).toBe("paused");

    const consolePayload = CounselorAdminProfileConsoleSchema.parse({
      filters: {
        serviceStatus: "paused",
        limit: 50,
      },
      profiles: [
        {
          counselor: {
            id: "counselor_1",
            name: "林若安",
            title: "资深心理咨询师",
            introduction: "擅长情绪与自我成长议题。",
            specialties: ["emotion", "personal_growth"],
            licenseSummary: "执业 9 年",
            yearsOfPractice: 9,
            sessionPrice: 399,
            rating: 4.9,
          },
          serviceStatus: "paused",
          acceptsNewClients: false,
          credentialStatus: "expiring_soon",
          credentialExpiresAt: "2026-06-30T00:00:00.000Z",
          scheduleSummary: {
            availableCount: 1,
            lockedCount: 0,
            scheduledCount: 0,
            closedCount: 0,
          },
          serviceSummary: {
            totalAppointments: 2,
            scheduledCount: 1,
            completedCount: 1,
            noShowCount: 0,
            anomalyCount: 1,
          },
          nextAvailableAt: "2026-05-11T10:00:00.000Z",
          updatedAt: "2026-05-10T10:25:00.000Z",
          updatedBy: "operator_1",
        },
      ],
      summary: {
        totalCount: 1,
        activeCount: 0,
        pausedCount: 1,
        acceptingNewClientsCount: 0,
        pendingReviewCount: 0,
        expiringSoonCount: 1,
        expiredCredentialCount: 0,
      },
      serverTime: "2026-05-10T10:25:00.000Z",
    });

    expect(consolePayload.profiles[0]?.credentialStatus).toBe("expiring_soon");
  });

  it("marks cancelled appointments as refunded", () => {
    expect(
      getNextCounselingAppointmentStatus("cancelled", "complete_refund")
    ).toBe("refunded");
    expect(
      getNextCounselingAppointmentStatus("scheduled", "complete_refund")
    ).toBe(undefined);
  });

  it("tracks counselor fulfillment outcomes", () => {
    expect(
      applyCounselingAppointmentAction({
        appointment: {
          ...appointment,
          status: "scheduled",
        },
        action: "complete_session",
        now: "2026-05-10T11:00:00.000Z",
      })
    ).toMatchObject({
      status: "completed",
      updatedAt: "2026-05-10T11:00:00.000Z",
    });

    expect(
      applyCounselingAppointmentAction({
        appointment: {
          ...appointment,
          status: "scheduled",
        },
        action: "mark_no_show",
        now: "2026-05-10T11:00:00.000Z",
      })
    ).toMatchObject({
      status: "no_show",
      updatedAt: "2026-05-10T11:00:00.000Z",
    });
  });

  it("expires unpaid appointments after the payment hold window", () => {
    expect(getCounselingPaymentDeadline(appointment)).toBe(
      "2026-05-10T10:30:00.000Z"
    );
    expect(
      isCounselingPaymentExpired({
        appointment,
        now: "2026-05-10T10:29:59.000Z",
      })
    ).toBe(false);
    expect(
      isCounselingPaymentExpired({
        appointment,
        now: "2026-05-10T10:30:00.000Z",
      })
    ).toBe(true);

    expect(
      expireOverdueCounselingAppointmentPayment({
        appointment,
        now: "2026-05-10T10:31:00.000Z",
      })
    ).toMatchObject({
      status: "cancelled",
      updatedAt: "2026-05-10T10:31:00.000Z",
    });
  });

  it("does not expire confirmed appointments", () => {
    expect(
      expireOverdueCounselingAppointmentPayment({
        appointment: {
          ...appointment,
          status: "scheduled",
        },
        now: "2026-05-10T09:00:00.000Z",
      })
    ).toBeUndefined();
  });
});
