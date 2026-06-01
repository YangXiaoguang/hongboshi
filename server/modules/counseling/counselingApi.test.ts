import { beforeEach, describe, expect, it } from "vitest";
import {
  createCounselingAdminCounselorProfilePayload,
  createCounselingAppointmentPayload,
  deleteCounselingAdminCounselorProfilePayload,
  expireOverdueCounselingPayments,
  fulfillCounselingAppointmentPayload,
  getCounselingAdminCounselorProfilesPayload,
  getCounselingAdminServiceRecordsPayload,
  getCounselingAdminSchedulesPayload,
  getCounselingOperationsConsolePayload,
  getCounselingAvailabilityPayload,
  listCounselingAppointmentsPayload,
  listCounselingWorkbenchPayload,
  processCounselingRefundWebhookEvent,
  resetCounselingAppointmentStore,
  updateCounselingAdminSchedulePayload,
  updateCounselingAdminCounselorProfilePayload,
  updateCounselingCancellationPolicyPayload,
  updateCounselingAppointmentPayload,
} from "./counselingApi";
import { createSimulatedRefundSucceededEvent } from "../../../shared/domain";
import {
  getCourseAccessPayload,
  resetCourseAccessStore,
} from "../courses/courseAccessApi";

const fixedNow = new Date("2026-05-10T00:00:00.000Z");

describe("counseling api payloads", () => {
  beforeEach(async () => {
    await resetCourseAccessStore();
    await resetCounselingAppointmentStore(fixedNow);
  });

  it("returns counselors and available slots", async () => {
    const payload = await getCounselingAvailabilityPayload(
      fixedNow.toISOString()
    );

    expect(payload.ok).toBe(true);
    if (!payload.ok) return;

    expect(payload.data.counselors.length).toBeGreaterThan(1);
    expect(payload.data.slots.length).toBeGreaterThan(4);
    expect(payload.data.slots.every(slot => slot.available)).toBe(true);
  });

  it("creates a pending payment appointment and reserves the slot", async () => {
    const availability = await getCounselingAvailabilityPayload(
      fixedNow.toISOString()
    );
    if (!availability.ok) throw new Error("expected availability");

    const slot = availability.data.slots[0];
    const payload = await createCounselingAppointmentPayload(
      {
        counselorId: slot.counselorId,
        slotId: slot.id,
        channel: slot.channel,
        concernTags: ["emotion", "sleep"],
        urgency: "this_week",
        assessmentReportId: "report_quick_state_check_1",
        noteForCounselor: "最近睡眠和情绪波动比较明显。",
      },
      "user_1",
      fixedNow.toISOString()
    );

    expect(payload.status).toBe(200);
    if (payload.body.ok) {
      expect(payload.body.data.appointment.userId).toBe("user_1");
      expect(payload.body.data.appointment.status).toBe("pending_payment");
      expect(payload.body.data.appointment.orderId).toBe(
        payload.body.data.order.id
      );
      expect(payload.body.data.order).toMatchObject({
        status: "pending_payment",
        items: [
          {
            type: "counseling_session",
            targetId: payload.body.data.appointment.id,
          },
        ],
      });
      expect(payload.body.data.appointment.assessmentReportId).toBe(
        "report_quick_state_check_1"
      );
      expect(payload.body.data.slot.available).toBe(false);
    }

    const duplicate = await createCounselingAppointmentPayload(
      {
        counselorId: slot.counselorId,
        slotId: slot.id,
        channel: slot.channel,
        concernTags: ["emotion"],
        urgency: "this_week",
      },
      "user_2",
      fixedNow.toISOString()
    );
    expect(duplicate.status).toBe(409);

    const listPayload = await listCounselingAppointmentsPayload(
      "user_1",
      fixedNow.toISOString()
    );
    expect(listPayload.status).toBe(200);
    if (listPayload.body.ok) {
      expect(listPayload.body.data.appointments).toHaveLength(1);
      expect(listPayload.body.data.appointments[0].slot.available).toBe(false);
      expect(listPayload.body.data.appointments[0].order?.status).toBe(
        "pending_payment"
      );
    }
  });

  it("confirms payment, reschedules and refunds appointments through the status machine", async () => {
    const availability = await getCounselingAvailabilityPayload(
      fixedNow.toISOString()
    );
    if (!availability.ok) throw new Error("expected availability");

    const slot = availability.data.slots[2];
    const created = await createCounselingAppointmentPayload(
      {
        counselorId: slot.counselorId,
        slotId: slot.id,
        channel: slot.channel,
        concernTags: ["emotion"],
        urgency: "this_week",
      },
      "user_1",
      fixedNow.toISOString()
    );
    if (!created.body.ok) throw new Error("expected created appointment");

    const appointmentId = created.body.data.appointment.id;
    const confirmed = await updateCounselingAppointmentPayload(
      appointmentId,
      { action: "confirm_payment" },
      "user_1",
      "2026-05-10T00:10:00.000Z"
    );

    expect(confirmed.status).toBe(200);
    if (confirmed.body.ok) {
      expect(confirmed.body.data.appointment.status).toBe("scheduled");
      expect(confirmed.body.data.slot.available).toBe(false);
      expect(confirmed.body.data.order?.status).toBe("paid");
      expect(confirmed.body.data.order?.paidAt).toBe(
        "2026-05-10T00:10:00.000Z"
      );
    }

    const newSlot = availability.data.slots[4];
    const rescheduled = await updateCounselingAppointmentPayload(
      appointmentId,
      { action: "reschedule", slotId: newSlot.id },
      "user_1",
      "2026-05-10T00:15:00.000Z"
    );

    expect(rescheduled.status).toBe(200);
    if (rescheduled.body.ok) {
      expect(rescheduled.body.data.appointment.status).toBe("scheduled");
      expect(rescheduled.body.data.appointment.slotId).toBe(newSlot.id);
      expect(rescheduled.body.data.slot.available).toBe(false);
      expect(rescheduled.body.data.order?.status).toBe("paid");
    }

    const availabilityAfterReschedule = await getCounselingAvailabilityPayload(
      "2026-05-10T00:16:00.000Z"
    );
    if (!availabilityAfterReschedule.ok) {
      throw new Error("expected availability after reschedule");
    }
    expect(
      availabilityAfterReschedule.data.slots.find(item => item.id === slot.id)
        ?.available
    ).toBe(true);
    expect(
      availabilityAfterReschedule.data.slots.find(
        item => item.id === newSlot.id
      )?.available
    ).toBe(false);

    const cancelled = await updateCounselingAppointmentPayload(
      appointmentId,
      { action: "cancel" },
      "user_1",
      "2026-05-10T00:20:00.000Z"
    );

    expect(cancelled.status).toBe(200);
    if (cancelled.body.ok) {
      expect(cancelled.body.data.appointment.status).toBe("cancelled");
      expect(cancelled.body.data.slot.available).toBe(true);
      expect(cancelled.body.data.order?.status).toBe("refunding");
    }

    const userRefundCompletion = await updateCounselingAppointmentPayload(
      appointmentId,
      { action: "complete_refund" },
      "user_1",
      "2026-05-10T00:24:00.000Z"
    );
    expect(userRefundCompletion.status).toBe(403);

    if (!cancelled.body.ok || !cancelled.body.data.order) {
      throw new Error("expected refunding order");
    }
    const refunded = await processCounselingRefundWebhookEvent(
      createSimulatedRefundSucceededEvent({
        order: cancelled.body.data.order,
        now: "2026-05-10T00:25:00.000Z",
      })
    );

    expect(refunded.status).toBe(200);
    if (refunded.body.ok) {
      expect(refunded.body.data.appointment.status).toBe("refunded");
      expect(refunded.body.data.slot.available).toBe(true);
      expect(refunded.body.data.order?.status).toBe("refunded");
    }

    const repeated = await updateCounselingAppointmentPayload(
      appointmentId,
      { action: "confirm_payment" },
      "user_1",
      "2026-05-10T00:30:00.000Z"
    );
    expect(repeated.status).toBe(409);
  });

  it("lets the assigned counselor complete fulfillment outcomes", async () => {
    const availability = await getCounselingAvailabilityPayload(
      fixedNow.toISOString()
    );
    if (!availability.ok) throw new Error("expected availability");

    const slot = availability.data.slots[5];
    const created = await createCounselingAppointmentPayload(
      {
        counselorId: slot.counselorId,
        slotId: slot.id,
        channel: slot.channel,
        concernTags: ["emotion"],
        urgency: "this_week",
      },
      "user_1",
      fixedNow.toISOString()
    );
    if (!created.body.ok) throw new Error("expected created appointment");

    const appointmentId = created.body.data.appointment.id;
    const confirmed = await updateCounselingAppointmentPayload(
      appointmentId,
      { action: "confirm_payment" },
      "user_1",
      "2026-05-10T00:10:00.000Z"
    );
    expect(confirmed.status).toBe(200);

    const forbidden = await updateCounselingAppointmentPayload(
      appointmentId,
      { action: "complete_session" },
      "user_1",
      "2026-05-10T01:00:00.000Z"
    );
    expect(forbidden.status).toBe(403);

    const completed = await fulfillCounselingAppointmentPayload(
      appointmentId,
      { action: "complete_session" },
      { id: slot.counselorId, roles: ["counselor"] },
      "2026-05-10T01:00:00.000Z"
    );

    expect(completed.status).toBe(200);
    if (completed.body.ok) {
      expect(completed.body.data.appointment.status).toBe("completed");
      expect(completed.body.data.order?.status).toBe("paid");
    }

    const operations = await getCounselingOperationsConsolePayload(
      { id: "operator_1", roles: ["operator"] },
      "2026-05-10T01:01:00.000Z"
    );
    expect(operations.status).toBe(200);
    if (operations.body.ok) {
      expect(operations.body.data.auditEvents[0]).toMatchObject({
        action: "complete_session",
        actorId: slot.counselorId,
        appointmentId,
        previousAppointmentStatus: "scheduled",
        nextAppointmentStatus: "completed",
      });
    }
  });

  it("lists counselor workbench appointments with status summary", async () => {
    const availability = await getCounselingAvailabilityPayload(
      fixedNow.toISOString()
    );
    if (!availability.ok) throw new Error("expected availability");

    const slot = availability.data.slots[6];
    const created = await createCounselingAppointmentPayload(
      {
        counselorId: slot.counselorId,
        slotId: slot.id,
        channel: slot.channel,
        concernTags: ["emotion"],
        urgency: "this_week",
      },
      "user_1",
      fixedNow.toISOString()
    );
    if (!created.body.ok) throw new Error("expected created appointment");

    const confirmed = await updateCounselingAppointmentPayload(
      created.body.data.appointment.id,
      { action: "confirm_payment" },
      "user_1",
      "2026-05-10T00:10:00.000Z"
    );
    expect(confirmed.status).toBe(200);

    const forbidden = await listCounselingWorkbenchPayload(
      { id: "user_1", roles: ["member"] },
      "2026-05-10T00:11:00.000Z"
    );
    expect(forbidden.status).toBe(403);

    const workbench = await listCounselingWorkbenchPayload(
      { id: slot.counselorId, roles: ["counselor"] },
      "2026-05-10T00:11:00.000Z"
    );

    expect(workbench.status).toBe(200);
    if (workbench.body.ok) {
      expect(workbench.body.data.appointments).toHaveLength(1);
      expect(workbench.body.data.appointments[0]?.appointment.status).toBe(
        "scheduled"
      );
      expect(workbench.body.data.summary).toMatchObject({
        scheduledCount: 1,
        pendingPaymentCount: 0,
      });
    }
  });

  it("builds admin service records with fulfillment anomalies and privacy guards", async () => {
    const forbidden = await getCounselingAdminServiceRecordsPayload(
      { id: "counselor_lin", roles: ["counselor"] },
      {},
      "2026-05-10T00:25:00.000Z"
    );
    expect(forbidden.status).toBe(403);

    const availability = await getCounselingAvailabilityPayload(
      fixedNow.toISOString()
    );
    if (!availability.ok) throw new Error("expected availability");

    const pendingSlot = availability.data.slots[0];
    const pending = await createCounselingAppointmentPayload(
      {
        counselorId: pendingSlot.counselorId,
        slotId: pendingSlot.id,
        channel: pendingSlot.channel,
        concernTags: ["emotion"],
        urgency: "within_24h",
        noteForCounselor: "这段咨询备注不应展示给运营后台。",
      },
      "user_1",
      fixedNow.toISOString()
    );
    if (!pending.body.ok) throw new Error("expected pending appointment");

    const noShowSlot = availability.data.slots[1];
    const noShowCreated = await createCounselingAppointmentPayload(
      {
        counselorId: noShowSlot.counselorId,
        slotId: noShowSlot.id,
        channel: noShowSlot.channel,
        concernTags: ["sleep"],
        urgency: "this_week",
      },
      "user_2",
      "2026-05-10T00:01:00.000Z"
    );
    if (!noShowCreated.body.ok) throw new Error("expected no-show setup");

    const confirmedNoShow = await updateCounselingAppointmentPayload(
      noShowCreated.body.data.appointment.id,
      { action: "confirm_payment" },
      "user_2",
      "2026-05-10T00:02:00.000Z"
    );
    expect(confirmedNoShow.status).toBe(200);

    const markedNoShow = await fulfillCounselingAppointmentPayload(
      noShowCreated.body.data.appointment.id,
      { action: "mark_no_show" },
      { id: noShowSlot.counselorId, roles: ["counselor"] },
      "2026-05-10T00:03:00.000Z"
    );
    expect(markedNoShow.status).toBe(200);

    const refundSlot = availability.data.slots[2];
    const refundCreated = await createCounselingAppointmentPayload(
      {
        counselorId: refundSlot.counselorId,
        slotId: refundSlot.id,
        channel: refundSlot.channel,
        concernTags: ["self_growth"],
        urgency: "this_week",
      },
      "user_3",
      "2026-05-10T00:04:00.000Z"
    );
    if (!refundCreated.body.ok) throw new Error("expected refund setup");

    const confirmedRefund = await updateCounselingAppointmentPayload(
      refundCreated.body.data.appointment.id,
      { action: "confirm_payment" },
      "user_3",
      "2026-05-10T00:05:00.000Z"
    );
    expect(confirmedRefund.status).toBe(200);

    const cancelledRefund = await updateCounselingAppointmentPayload(
      refundCreated.body.data.appointment.id,
      { action: "cancel" },
      "user_3",
      "2026-05-10T00:06:00.000Z"
    );
    expect(cancelledRefund.status).toBe(200);

    const consolePayload = await getCounselingAdminServiceRecordsPayload(
      { id: "operator_1", roles: ["operator"] },
      {},
      "2026-05-10T00:25:00.000Z"
    );
    expect(consolePayload.status).toBe(200);
    if (!consolePayload.body.ok) throw new Error("expected service records");

    const records = consolePayload.body.data.records;
    const pendingRecord = records.find(
      record => record.appointmentId === pending.body.data.appointment.id
    );
    const noShowRecord = records.find(
      record => record.appointmentId === noShowCreated.body.data.appointment.id
    );
    const refundRecord = records.find(
      record => record.appointmentId === refundCreated.body.data.appointment.id
    );

    expect(pendingRecord?.anomalies).toContain("payment_hold_expiring");
    expect(pendingRecord?.riskLevel).toBe("medium");
    expect(JSON.stringify(pendingRecord)).not.toContain("这段咨询备注");
    expect(JSON.stringify(pendingRecord)).not.toContain("咨询预约前信息");
    expect(noShowRecord?.anomalies).toContain("no_show");
    expect(refundRecord?.anomalies).toContain("cancelled_pending_refund");
    expect(consolePayload.body.data.summary).toMatchObject({
      totalCount: 3,
      anomalyCount: 3,
      pendingPaymentCount: 1,
      noShowCount: 1,
      refundingCount: 1,
      paymentHoldExpiringCount: 1,
    });

    const noShowOnly = await getCounselingAdminServiceRecordsPayload(
      { id: "operator_1", roles: ["operator"] },
      { anomalyType: "no_show" },
      "2026-05-10T00:25:00.000Z"
    );
    expect(noShowOnly.status).toBe(200);
    if (noShowOnly.body.ok) {
      expect(noShowOnly.body.data.records).toHaveLength(1);
      expect(noShowOnly.body.data.records[0]?.appointmentId).toBe(
        noShowCreated.body.data.appointment.id
      );
    }

    const invalid = await getCounselingAdminServiceRecordsPayload(
      { id: "operator_1", roles: ["operator"] },
      { anomalyType: "unknown_anomaly" },
      "2026-05-10T00:25:00.000Z"
    );
    expect(invalid.status).toBe(400);
  });

  it("lets operators maintain counselor profiles and service status safely", async () => {
    const forbidden = await getCounselingAdminCounselorProfilesPayload(
      { id: "counselor_lin", roles: ["counselor"] },
      {},
      fixedNow.toISOString()
    );
    expect(forbidden.status).toBe(403);

    const profiles = await getCounselingAdminCounselorProfilesPayload(
      { id: "operator_1", roles: ["operator"] },
      {},
      fixedNow.toISOString()
    );
    expect(profiles.status).toBe(200);
    if (!profiles.body.ok) throw new Error("expected counselor profiles");

    const firstProfile = profiles.body.data.profiles[0];
    expect(firstProfile?.counselor.name).toBeTruthy();
    if (!firstProfile) throw new Error("expected first profile");

    const updated = await updateCounselingAdminCounselorProfilePayload(
      {
        counselorId: firstProfile.counselor.id,
        profile: {
          title: "资深心理咨询师",
          serviceStatus: "paused",
          acceptsNewClients: false,
          credentialStatus: "expiring_soon",
        },
        reason: "资质年审前暂停接单",
      },
      { id: "operator_1", roles: ["operator"] },
      "2026-05-10T00:10:00.000Z"
    );
    expect(updated.status).toBe(200);
    if (!updated.body.ok) throw new Error("expected profile updated");
    expect(updated.body.data.profile).toMatchObject({
      counselor: {
        id: firstProfile.counselor.id,
        title: "资深心理咨询师",
      },
      serviceStatus: "paused",
      acceptsNewClients: false,
      credentialStatus: "expiring_soon",
    });
    expect(updated.body.data.auditEvent).toMatchObject({
      action: "counselor_service_status_updated",
      counselorId: firstProfile.counselor.id,
      note: "资质年审前暂停接单",
    });

    const availability = await getCounselingAvailabilityPayload(
      "2026-05-10T00:11:00.000Z"
    );
    if (!availability.ok) throw new Error("expected availability");
    expect(
      availability.data.counselors.some(
        counselor => counselor.id === firstProfile.counselor.id
      )
    ).toBe(false);

    const pausedSlot = availability.data.slots.find(
      slot => slot.counselorId === firstProfile.counselor.id
    );
    expect(pausedSlot).toBeUndefined();

    const pendingReview = await updateCounselingAdminCounselorProfilePayload(
      {
        counselorId: firstProfile.counselor.id,
        profile: {
          serviceStatus: "active",
          credentialStatus: "pending_review",
        },
        reason: "恢复服务但等待资质复核",
      },
      { id: "operator_1", roles: ["operator"] },
      "2026-05-10T00:11:30.000Z"
    );
    expect(pendingReview.status).toBe(200);
    if (!pendingReview.body.ok) throw new Error("expected profile updated");
    expect(pendingReview.body.data.profile).toMatchObject({
      serviceStatus: "active",
      acceptsNewClients: true,
      credentialStatus: "pending_review",
    });

    const pendingAvailability = await getCounselingAvailabilityPayload(
      "2026-05-10T00:11:45.000Z"
    );
    if (!pendingAvailability.ok) throw new Error("expected availability");
    expect(
      pendingAvailability.data.counselors.some(
        counselor => counselor.id === firstProfile.counselor.id
      )
    ).toBe(false);

    const invalid = await updateCounselingAdminCounselorProfilePayload(
      {
        counselorId: firstProfile.counselor.id,
        profile: {},
        reason: "缺少修改字段",
      },
      { id: "operator_1", roles: ["operator"] },
      "2026-05-10T00:12:00.000Z"
    );
    expect(invalid.status).toBe(400);
  });

  it("lets operators create and delete counselor profiles with audit", async () => {
    const created = await createCounselingAdminCounselorProfilePayload(
      {
        profile: {
          name: "周明",
          title: "心理咨询师",
          introduction: "擅长情绪压力与个人成长议题的稳定陪伴。",
          specialties: ["emotion", "personal_growth"],
          licenseSummary: "心理咨询服务 5 年",
          yearsOfPractice: 5,
          sessionPrice: 329,
          serviceStatus: "active",
          acceptsNewClients: true,
          credentialStatus: "verified",
        },
        reason: "新增咨询师档案",
      },
      { id: "operator_1", roles: ["operator"] },
      "2026-05-10T01:00:00.000Z"
    );

    expect(created.status).toBe(201);
    if (!created.body.ok) throw new Error("expected profile created");
    expect(created.body.data.profile.counselor.name).toBe("周明");
    expect(created.body.data.auditEvent.action).toBe(
      "counselor_profile_created"
    );

    const counselorId = created.body.data.profile.counselor.id;
    const availability = await getCounselingAvailabilityPayload(
      "2026-05-10T01:01:00.000Z"
    );
    if (!availability.ok) throw new Error("expected availability");
    expect(
      availability.data.counselors.some(
        counselor => counselor.id === counselorId
      )
    ).toBe(true);

    const deleted = await deleteCounselingAdminCounselorProfilePayload(
      {
        counselorId,
        reason: "误建咨询师档案",
      },
      { id: "operator_1", roles: ["operator"] },
      "2026-05-10T01:02:00.000Z"
    );

    expect(deleted.status).toBe(200);
    if (!deleted.body.ok) throw new Error("expected profile deleted");
    expect(deleted.body.data.auditEvent.action).toBe(
      "counselor_profile_deleted"
    );
    expect(
      deleted.body.data.console.profiles.some(
        profile => profile.counselor.id === counselorId
      )
    ).toBe(false);
  });

  it("lets operators configure cancellation policy and records policy audit", async () => {
    const forbidden = await updateCounselingCancellationPolicyPayload(
      {
        policy: {
          scheduledRefundCutoffMinutesBeforeStart: 120,
          allowPendingPaymentCancellation: false,
        },
      },
      { id: "counselor_lin", roles: ["counselor"] },
      "2026-05-10T00:05:00.000Z"
    );
    expect(forbidden.status).toBe(403);

    const updated = await updateCounselingCancellationPolicyPayload(
      {
        policy: {
          scheduledRefundCutoffMinutesBeforeStart: 120,
          allowPendingPaymentCancellation: false,
        },
        reason: "测试取消规则配置",
      },
      { id: "operator_1", roles: ["operator"] },
      "2026-05-10T00:05:00.000Z"
    );

    expect(updated.status).toBe(200);
    if (updated.body.ok) {
      expect(
        updated.body.data.cancellationPolicy
          .scheduledRefundCutoffMinutesBeforeStart
      ).toBe(120);
      expect(updated.body.data.auditEvent).toMatchObject({
        action: "cancellation_policy_updated",
        actorId: "operator_1",
        note: "测试取消规则配置",
      });
    }

    const availability = await getCounselingAvailabilityPayload(
      fixedNow.toISOString()
    );
    if (!availability.ok) throw new Error("expected availability");
    const slot = availability.data.slots[0];
    const created = await createCounselingAppointmentPayload(
      {
        counselorId: slot.counselorId,
        slotId: slot.id,
        channel: slot.channel,
        concernTags: ["emotion"],
        urgency: "this_week",
      },
      "user_1",
      fixedNow.toISOString()
    );
    if (!created.body.ok) throw new Error("expected created appointment");

    const cancelled = await updateCounselingAppointmentPayload(
      created.body.data.appointment.id,
      { action: "cancel" },
      "user_1",
      "2026-05-10T00:06:00.000Z"
    );
    expect(cancelled.status).toBe(409);

    const operations = await getCounselingOperationsConsolePayload(
      { id: "admin_1", roles: ["admin"] },
      "2026-05-10T00:07:00.000Z"
    );
    expect(operations.status).toBe(200);
    if (operations.body.ok) {
      expect(operations.body.data.auditEvents).toHaveLength(1);
      expect(operations.body.data.cancellationPolicy).toMatchObject({
        scheduledRefundCutoffMinutesBeforeStart: 120,
        allowPendingPaymentCancellation: false,
      });
    }
  });

  it("lets operators manage counselor schedule slots safely", async () => {
    const forbidden = await getCounselingAdminSchedulesPayload(
      { id: "counselor_lin", roles: ["counselor"] },
      fixedNow.toISOString()
    );
    expect(forbidden.status).toBe(403);

    const schedules = await getCounselingAdminSchedulesPayload(
      { id: "operator_1", roles: ["operator"] },
      fixedNow.toISOString()
    );
    expect(schedules.status).toBe(200);
    if (!schedules.body.ok) throw new Error("expected schedule console");

    const availableSlot = schedules.body.data.counselors
      .flatMap(schedule => schedule.slots)
      .find(slot => slot.status === "available");
    if (!availableSlot) throw new Error("expected available slot");

    const closed = await updateCounselingAdminSchedulePayload(
      {
        action: "close_slot",
        slotId: availableSlot.id,
        reason: "测试关闭时段",
      },
      { id: "operator_1", roles: ["operator"] },
      "2026-05-10T00:05:00.000Z"
    );
    expect(closed.status).toBe(200);
    if (!closed.body.ok) throw new Error("expected closed schedule slot");
    expect(closed.body.data.slot.status).toBe("closed");
    expect(closed.body.data.auditEvent.action).toBe("schedule_slot_closed");

    const unavailable = await createCounselingAppointmentPayload(
      {
        counselorId: availableSlot.counselorId,
        slotId: availableSlot.id,
        channel: availableSlot.channel,
        concernTags: ["emotion"],
        urgency: "this_week",
      },
      "user_1",
      "2026-05-10T00:06:00.000Z"
    );
    expect(unavailable.status).toBe(409);

    const restored = await updateCounselingAdminSchedulePayload(
      {
        action: "restore_slot",
        slotId: availableSlot.id,
        reason: "测试恢复时段",
      },
      { id: "operator_1", roles: ["operator"] },
      "2026-05-10T00:07:00.000Z"
    );
    expect(restored.status).toBe(200);
    if (!restored.body.ok) throw new Error("expected restored schedule slot");
    expect(restored.body.data.slot.status).toBe("available");

    const locked = await createCounselingAppointmentPayload(
      {
        counselorId: availableSlot.counselorId,
        slotId: availableSlot.id,
        channel: availableSlot.channel,
        concernTags: ["emotion"],
        urgency: "this_week",
      },
      "user_2",
      "2026-05-10T00:08:00.000Z"
    );
    expect(locked.status).toBe(200);

    const closeLocked = await updateCounselingAdminSchedulePayload(
      {
        action: "close_slot",
        slotId: availableSlot.id,
      },
      { id: "operator_1", roles: ["operator"] },
      "2026-05-10T00:09:00.000Z"
    );
    expect(closeLocked.status).toBe(409);

    const added = await updateCounselingAdminSchedulePayload(
      {
        action: "add_available_slot",
        counselorId: availableSlot.counselorId,
        startsAt: "2026-05-20T09:00:00.000Z",
        endsAt: "2026-05-20T09:50:00.000Z",
        channel: "video",
        reason: "测试新增时段",
      },
      { id: "operator_1", roles: ["operator"] },
      "2026-05-10T00:10:00.000Z"
    );
    expect(added.status).toBe(200);
    if (!added.body.ok) throw new Error("expected added schedule slot");
    expect(added.body.data.slot).toMatchObject({
      counselorId: availableSlot.counselorId,
      startsAt: "2026-05-20T09:00:00.000Z",
      status: "available",
    });
    expect(
      added.body.data.scheduleConsole.counselors
        .flatMap(schedule => schedule.slots)
        .some(slot => slot.id === added.body.data.slot.id)
    ).toBe(true);

    const duplicate = await updateCounselingAdminSchedulePayload(
      {
        action: "add_available_slot",
        counselorId: availableSlot.counselorId,
        startsAt: "2026-05-20T09:10:00.000Z",
        endsAt: "2026-05-20T09:40:00.000Z",
        channel: "video",
      },
      { id: "operator_1", roles: ["operator"] },
      "2026-05-10T00:11:00.000Z"
    );
    expect(duplicate.status).toBe(409);

    const operations = await getCounselingOperationsConsolePayload(
      { id: "operator_1", roles: ["operator"] },
      "2026-05-10T00:12:00.000Z"
    );
    expect(operations.status).toBe(200);
    if (operations.body.ok) {
      expect(operations.body.data.auditEvents[0]?.action).toBe(
        "schedule_slot_added"
      );
    }
  });

  it("expires overdue payment holds and releases the reserved slot", async () => {
    const availability = await getCounselingAvailabilityPayload(
      fixedNow.toISOString()
    );
    if (!availability.ok) throw new Error("expected availability");

    const slot = availability.data.slots[3];
    const created = await createCounselingAppointmentPayload(
      {
        counselorId: slot.counselorId,
        slotId: slot.id,
        channel: slot.channel,
        concernTags: ["sleep"],
        urgency: "this_week",
      },
      "user_1",
      "2026-05-10T08:00:00.000Z"
    );
    if (!created.body.ok) throw new Error("expected created appointment");

    const beforeDeadline = await expireOverdueCounselingPayments(
      "2026-05-10T08:29:00.000Z"
    );
    expect(beforeDeadline.expiredAppointments).toHaveLength(0);

    const expired = await expireOverdueCounselingPayments(
      "2026-05-10T08:31:00.000Z"
    );

    expect(expired.releasedSlotIds).toEqual([slot.id]);
    expect(expired.expiredAppointments[0]?.appointment.status).toBe(
      "cancelled"
    );
    expect(expired.expiredAppointments[0]?.slot.available).toBe(true);
    expect(expired.expiredAppointments[0]?.order?.status).toBe("closed");

    const listPayload = await listCounselingAppointmentsPayload(
      "user_1",
      "2026-05-10T08:31:00.000Z"
    );
    expect(listPayload.status).toBe(200);
    if (listPayload.body.ok) {
      expect(listPayload.body.data.appointments[0]?.appointment.status).toBe(
        "cancelled"
      );
      expect(listPayload.body.data.appointments[0]?.slot.available).toBe(true);
      expect(listPayload.body.data.appointments[0]?.order?.status).toBe(
        "closed"
      );
    }

    const confirmAfterExpiry = await updateCounselingAppointmentPayload(
      created.body.data.appointment.id,
      { action: "confirm_payment" },
      "user_1",
      "2026-05-10T08:32:00.000Z"
    );
    expect(confirmAfterExpiry.status).toBe(409);

    const accessPayload = await getCourseAccessPayload("user_1");
    expect(accessPayload.ok).toBe(true);
    if (accessPayload.ok) {
      expect(accessPayload.data.orders[0]?.status).toBe("closed");
    }
  });

  it("creates a risk event for urgent intake", async () => {
    const availability = await getCounselingAvailabilityPayload(
      fixedNow.toISOString()
    );
    if (!availability.ok) throw new Error("expected availability");

    const slot = availability.data.slots[1];
    const payload = await createCounselingAppointmentPayload(
      {
        counselorId: slot.counselorId,
        slotId: slot.id,
        channel: slot.channel,
        concernTags: ["crisis"],
        urgency: "immediate",
        assessmentRiskLevel: "urgent",
      },
      "user_1",
      fixedNow.toISOString()
    );

    expect(payload.status).toBe(200);
    if (payload.body.ok) {
      expect(payload.body.data.riskEvent?.riskLevel).toBe("urgent");
      expect(payload.body.data.nextSteps[0]).toContain("危险正在发生");
    }
  });

  it("requires login before creating an appointment", async () => {
    const payload = await createCounselingAppointmentPayload({
      counselorId: "counselor_lin",
      slotId: "slot_missing",
      channel: "video",
      concernTags: ["emotion"],
      urgency: "this_week",
    });

    expect(payload.status).toBe(401);
    expect(payload.body.ok).toBe(false);

    const listPayload = await listCounselingAppointmentsPayload();
    expect(listPayload.status).toBe(401);
    expect(listPayload.body.ok).toBe(false);
  });
});
