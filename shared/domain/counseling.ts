import { z } from "zod";
import {
  DateTimeLikeSchema,
  EntityIdSchema,
  MoneyAmountSchema,
} from "./common";
import { AssessmentRiskLevelSchema } from "./assessment";
import { RiskEventSchema } from "./risk";
import { OrderSchema } from "./order";

export const CounselorSpecialtySchema = z.enum([
  "emotion",
  "relationship",
  "family",
  "adolescent",
  "workplace",
  "trauma",
  "personal_growth",
]);

export const CounselingConcernTagSchema = z.enum([
  "emotion",
  "sleep",
  "relationship",
  "family",
  "adolescent",
  "workplace",
  "self_growth",
  "crisis",
]);

export const CounselorSchema = z.object({
  id: EntityIdSchema,
  name: z.string().min(1),
  avatarUrl: z.string().url().optional(),
  title: z.string().min(1),
  introduction: z.string().min(1),
  specialties: z.array(CounselorSpecialtySchema).min(1),
  licenseSummary: z.string().min(1),
  yearsOfPractice: z.number().int().nonnegative(),
  sessionPrice: MoneyAmountSchema,
  rating: z.number().min(0).max(5).optional(),
});

export const CounselorAdminServiceStatusSchema = z.enum(["active", "paused"]);

export const CounselorCredentialStatusSchema = z.enum([
  "verified",
  "pending_review",
  "expiring_soon",
  "expired",
]);

export const CounselingChannelSchema = z.enum(["video", "voice", "offline"]);

export const AppointmentStatusSchema = z.enum([
  "pending_payment",
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
  "refunded",
]);

export const CounselingSlotSchema = z.object({
  id: EntityIdSchema,
  counselorId: EntityIdSchema,
  startsAt: DateTimeLikeSchema,
  endsAt: DateTimeLikeSchema,
  channel: CounselingChannelSchema,
  available: z.boolean(),
});

export const CounselingUrgencySchema = z.enum([
  "flexible",
  "this_week",
  "within_24h",
  "immediate",
]);

export const CounselingAppointmentSchema = z.object({
  id: EntityIdSchema,
  userId: EntityIdSchema,
  counselorId: EntityIdSchema,
  slotId: EntityIdSchema,
  orderId: EntityIdSchema.optional(),
  channel: CounselingChannelSchema,
  status: AppointmentStatusSchema,
  concernTags: z.array(CounselingConcernTagSchema).default([]),
  noteForCounselor: z.string().max(500).optional(),
  assessmentReportId: EntityIdSchema.optional(),
  createdAt: DateTimeLikeSchema,
  updatedAt: DateTimeLikeSchema,
});

export const CounselingAvailabilitySchema = z.object({
  counselors: z.array(CounselorSchema),
  slots: z.array(CounselingSlotSchema),
  serverTime: DateTimeLikeSchema,
});

export const CounselingScheduleSlotStatusSchema = z.enum([
  "available",
  "locked",
  "scheduled",
  "closed",
]);

export const CounselorOperationServiceStatusSchema = z.enum([
  "active",
  "full",
  "paused",
]);

export const CounselingAdminScheduleSlotSchema = z.object({
  id: EntityIdSchema,
  counselorId: EntityIdSchema,
  counselorName: z.string().min(1),
  startsAt: DateTimeLikeSchema,
  endsAt: DateTimeLikeSchema,
  channel: CounselingChannelSchema,
  status: CounselingScheduleSlotStatusSchema,
  appointmentId: EntityIdSchema.optional(),
  appointmentStatus: AppointmentStatusSchema.optional(),
  conflictHint: z.string().max(200).optional(),
});

export const CounselingAdminScheduleSummarySchema = z.object({
  availableCount: z.number().int().nonnegative(),
  lockedCount: z.number().int().nonnegative(),
  scheduledCount: z.number().int().nonnegative(),
  closedCount: z.number().int().nonnegative(),
});

export const CounselingAdminCounselorScheduleSchema = z.object({
  counselor: CounselorSchema,
  serviceStatus: CounselorOperationServiceStatusSchema,
  nextAvailableAt: DateTimeLikeSchema.optional(),
  summary: CounselingAdminScheduleSummarySchema,
  slots: z.array(CounselingAdminScheduleSlotSchema),
});

export const CounselingAdminScheduleConsoleSchema = z.object({
  counselors: z.array(CounselingAdminCounselorScheduleSchema),
  windowStart: DateTimeLikeSchema,
  windowEnd: DateTimeLikeSchema,
  serverTime: DateTimeLikeSchema,
});

export const CounselingAdminScheduleActionRequestSchema = z.discriminatedUnion(
  "action",
  [
    z.object({
      action: z.literal("add_available_slot"),
      counselorId: EntityIdSchema,
      startsAt: DateTimeLikeSchema,
      endsAt: DateTimeLikeSchema,
      channel: CounselingChannelSchema.default("video"),
      reason: z.string().max(200).optional(),
    }),
    z.object({
      action: z.literal("close_slot"),
      slotId: EntityIdSchema,
      reason: z.string().max(200).optional(),
    }),
    z.object({
      action: z.literal("restore_slot"),
      slotId: EntityIdSchema,
      reason: z.string().max(200).optional(),
    }),
  ]
);

export const CounselingAdminScheduleMutationResultSchema = z.object({
  scheduleConsole: CounselingAdminScheduleConsoleSchema,
  slot: CounselingAdminScheduleSlotSchema,
  auditEvent: z.lazy(() => CounselingOperationAuditEventSchema).optional(),
  serverTime: DateTimeLikeSchema,
});

export const CounselorAdminProfileConfigSchema = z.object({
  counselor: CounselorSchema,
  serviceStatus: CounselorAdminServiceStatusSchema.default("active"),
  acceptsNewClients: z.boolean().default(true),
  credentialStatus: CounselorCredentialStatusSchema.default("verified"),
  credentialExpiresAt: DateTimeLikeSchema.optional(),
  updatedAt: DateTimeLikeSchema,
  updatedBy: EntityIdSchema.optional(),
});

export const CounselorAdminServiceSummarySchema = z.object({
  totalAppointments: z.number().int().nonnegative(),
  scheduledCount: z.number().int().nonnegative(),
  completedCount: z.number().int().nonnegative(),
  noShowCount: z.number().int().nonnegative(),
  anomalyCount: z.number().int().nonnegative(),
});

export const CounselorAdminProfileSchema = z.object({
  counselor: CounselorSchema,
  serviceStatus: CounselorAdminServiceStatusSchema,
  acceptsNewClients: z.boolean(),
  credentialStatus: CounselorCredentialStatusSchema,
  credentialExpiresAt: DateTimeLikeSchema.optional(),
  scheduleSummary: CounselingAdminScheduleSummarySchema,
  serviceSummary: CounselorAdminServiceSummarySchema,
  nextAvailableAt: DateTimeLikeSchema.optional(),
  updatedAt: DateTimeLikeSchema,
  updatedBy: EntityIdSchema.optional(),
});

export const CounselorAdminProfileSummarySchema = z.object({
  totalCount: z.number().int().nonnegative(),
  activeCount: z.number().int().nonnegative(),
  pausedCount: z.number().int().nonnegative(),
  acceptingNewClientsCount: z.number().int().nonnegative(),
  pendingReviewCount: z.number().int().nonnegative(),
  expiringSoonCount: z.number().int().nonnegative(),
  expiredCredentialCount: z.number().int().nonnegative(),
});

export const CounselorAdminProfileFilterSchema = z.object({
  serviceStatus: CounselorAdminServiceStatusSchema.optional(),
  credentialStatus: CounselorCredentialStatusSchema.optional(),
  keyword: z.string().trim().max(80).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const CounselorAdminProfilePatchSchema = z
  .object({
    name: z.string().trim().min(1).max(40).optional(),
    title: z.string().trim().min(1).max(80).optional(),
    introduction: z.string().trim().min(10).max(600).optional(),
    specialties: z.array(CounselorSpecialtySchema).min(1).max(6).optional(),
    licenseSummary: z.string().trim().min(1).max(180).optional(),
    yearsOfPractice: z.number().int().min(0).max(60).optional(),
    sessionPrice: z.number().finite().nonnegative().max(5000).optional(),
    serviceStatus: CounselorAdminServiceStatusSchema.optional(),
    acceptsNewClients: z.boolean().optional(),
    credentialStatus: CounselorCredentialStatusSchema.optional(),
    credentialExpiresAt: DateTimeLikeSchema.optional(),
  })
  .refine(value => Object.keys(value).length > 0, {
    message: "至少需要提交一个咨询师档案字段",
  });

export const CounselorAdminProfileUpdateRequestSchema = z.object({
  counselorId: EntityIdSchema,
  profile: CounselorAdminProfilePatchSchema,
  reason: z.string().trim().min(2).max(200),
});

export const CounselorAdminProfileConsoleSchema = z.object({
  filters: CounselorAdminProfileFilterSchema,
  profiles: z.array(CounselorAdminProfileSchema),
  summary: CounselorAdminProfileSummarySchema,
  serverTime: DateTimeLikeSchema,
});

export const CounselorAdminProfileMutationResultSchema = z.object({
  profile: CounselorAdminProfileSchema,
  console: CounselorAdminProfileConsoleSchema,
  auditEvent: z.lazy(() => CounselingOperationAuditEventSchema),
  serverTime: DateTimeLikeSchema,
});

export const CounselingAppointmentCreateRequestSchema = z.object({
  counselorId: EntityIdSchema,
  slotId: EntityIdSchema,
  channel: CounselingChannelSchema,
  concernTags: z.array(CounselingConcernTagSchema).min(1).max(5),
  urgency: CounselingUrgencySchema.default("this_week"),
  assessmentReportId: EntityIdSchema.optional(),
  assessmentRiskLevel: AssessmentRiskLevelSchema.optional(),
  noteForCounselor: z.string().max(500).optional(),
});

export const CounselingAppointmentCreateResultSchema = z.object({
  appointment: CounselingAppointmentSchema,
  counselor: CounselorSchema,
  slot: CounselingSlotSchema,
  order: OrderSchema,
  riskEvent: RiskEventSchema.optional(),
  nextSteps: z.array(z.string().min(1)).min(1),
});

export const CounselingAppointmentRecordSchema = z.object({
  appointment: CounselingAppointmentSchema,
  counselor: CounselorSchema,
  slot: CounselingSlotSchema,
  order: OrderSchema.optional(),
  riskEvent: RiskEventSchema.optional(),
});

export const CounselingAppointmentListSchema = z.object({
  appointments: z.array(CounselingAppointmentRecordSchema),
  serverTime: DateTimeLikeSchema,
});

export const CounselingWorkbenchSummarySchema = z.object({
  scheduledCount: z.number().int().nonnegative(),
  pendingPaymentCount: z.number().int().nonnegative(),
  refundingCount: z.number().int().nonnegative(),
  completedCount: z.number().int().nonnegative(),
  noShowCount: z.number().int().nonnegative(),
});

export const CounselingWorkbenchSchema = z.object({
  appointments: z.array(CounselingAppointmentRecordSchema),
  summary: CounselingWorkbenchSummarySchema,
  serverTime: DateTimeLikeSchema,
});

export const CounselingAppointmentActionSchema = z.enum([
  "confirm_payment",
  "cancel",
  "reschedule",
  "complete_refund",
  "complete_session",
  "mark_no_show",
]);

export const CounselingAppointmentActionRequestSchema = z.discriminatedUnion(
  "action",
  [
    z.object({ action: z.literal("confirm_payment") }),
    z.object({ action: z.literal("cancel") }),
    z.object({
      action: z.literal("reschedule"),
      slotId: EntityIdSchema,
    }),
    z.object({ action: z.literal("complete_refund") }),
    z.object({ action: z.literal("complete_session") }),
    z.object({ action: z.literal("mark_no_show") }),
  ]
);

export const CounselingAppointmentActionResultSchema = z.object({
  appointment: CounselingAppointmentSchema,
  counselor: CounselorSchema,
  slot: CounselingSlotSchema,
  order: OrderSchema.optional(),
  riskEvent: RiskEventSchema.optional(),
  nextSteps: z.array(z.string().min(1)).min(1),
});

export const COUNSELING_PAYMENT_HOLD_MINUTES = 30;

export const CounselingCancellationPolicySchema = z.object({
  scheduledRefundCutoffMinutesBeforeStart: z.number().int().nonnegative(),
  allowPendingPaymentCancellation: z.boolean(),
});

export const CounselingCancellationOrderTransitionSchema = z.enum([
  "none",
  "close_unpaid",
  "request_refund",
]);

export const CounselingCancellationDecisionSchema = z.object({
  canCancel: z.boolean(),
  releaseSlot: z.boolean(),
  orderTransition: CounselingCancellationOrderTransitionSchema,
  reason: z.string().optional(),
});

export const DEFAULT_COUNSELING_CANCELLATION_POLICY =
  CounselingCancellationPolicySchema.parse({
    scheduledRefundCutoffMinutesBeforeStart: 0,
    allowPendingPaymentCancellation: true,
  });

export const CounselingCancellationPolicyUpdateRequestSchema = z.object({
  policy: CounselingCancellationPolicySchema,
  reason: z.string().max(200).optional(),
});

export const CounselingOperationAuditActionSchema = z.enum([
  "cancellation_policy_updated",
  "complete_session",
  "mark_no_show",
  "schedule_slot_added",
  "schedule_slot_closed",
  "schedule_slot_restored",
  "counselor_profile_updated",
  "counselor_service_status_updated",
]);

export const CounselingOperationAuditEventSchema = z.object({
  id: EntityIdSchema,
  action: CounselingOperationAuditActionSchema,
  actorId: EntityIdSchema,
  actorRoles: z.array(z.string().min(1)).min(1),
  appointmentId: EntityIdSchema.optional(),
  userId: EntityIdSchema.optional(),
  counselorId: EntityIdSchema.optional(),
  previousAppointmentStatus: AppointmentStatusSchema.optional(),
  nextAppointmentStatus: AppointmentStatusSchema.optional(),
  previousOrderStatus: OrderSchema.shape.status.optional(),
  nextOrderStatus: OrderSchema.shape.status.optional(),
  policyBefore: CounselingCancellationPolicySchema.optional(),
  policyAfter: CounselingCancellationPolicySchema.optional(),
  note: z.string().max(500).optional(),
  createdAt: DateTimeLikeSchema,
});

export const CounselingOperationsConsoleSchema = z.object({
  cancellationPolicy: CounselingCancellationPolicySchema,
  auditEvents: z.array(CounselingOperationAuditEventSchema),
  serverTime: DateTimeLikeSchema,
});

export const CounselingCancellationPolicyUpdateResultSchema = z.object({
  cancellationPolicy: CounselingCancellationPolicySchema,
  auditEvent: CounselingOperationAuditEventSchema,
  serverTime: DateTimeLikeSchema,
});

export const CounselingServiceRecordAnomalyTypeSchema = z.enum([
  "payment_hold_expiring",
  "payment_hold_expired",
  "payment_hold_closed",
  "upcoming_unconfirmed",
  "cancelled_pending_refund",
  "refunding",
  "no_show",
]);

export const CounselingServiceRecordFilterSchema = z.object({
  counselorId: EntityIdSchema.optional(),
  appointmentStatus: AppointmentStatusSchema.optional(),
  anomalyType: CounselingServiceRecordAnomalyTypeSchema.optional(),
  keyword: z.string().trim().max(80).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const CounselingServiceRecordSchema = z.object({
  appointmentId: EntityIdSchema,
  userId: EntityIdSchema,
  counselorId: EntityIdSchema,
  counselorName: z.string().min(1),
  slotId: EntityIdSchema,
  startsAt: DateTimeLikeSchema,
  endsAt: DateTimeLikeSchema,
  channel: CounselingChannelSchema,
  appointmentStatus: AppointmentStatusSchema,
  orderId: EntityIdSchema.optional(),
  orderStatus: OrderSchema.shape.status.optional(),
  payableAmount: MoneyAmountSchema.optional(),
  paymentDeadlineAt: DateTimeLikeSchema.optional(),
  minutesUntilStart: z.number().int().optional(),
  riskLevel: RiskEventSchema.shape.riskLevel.optional(),
  anomalies: z.array(CounselingServiceRecordAnomalyTypeSchema),
  latestAuditAction: CounselingOperationAuditActionSchema.optional(),
  latestAuditAt: DateTimeLikeSchema.optional(),
  operationHint: z.string().max(200).optional(),
  createdAt: DateTimeLikeSchema,
  updatedAt: DateTimeLikeSchema,
});

export const CounselingServiceRecordSummarySchema = z.object({
  totalCount: z.number().int().nonnegative(),
  anomalyCount: z.number().int().nonnegative(),
  pendingPaymentCount: z.number().int().nonnegative(),
  scheduledCount: z.number().int().nonnegative(),
  completedCount: z.number().int().nonnegative(),
  cancelledCount: z.number().int().nonnegative(),
  noShowCount: z.number().int().nonnegative(),
  refundingCount: z.number().int().nonnegative(),
  paymentHoldExpiringCount: z.number().int().nonnegative(),
  paymentHoldExpiredCount: z.number().int().nonnegative(),
  upcomingUnconfirmedCount: z.number().int().nonnegative(),
});

export const CounselingServiceRecordConsoleSchema = z.object({
  counselors: z.array(CounselorSchema),
  filters: CounselingServiceRecordFilterSchema,
  records: z.array(CounselingServiceRecordSchema),
  summary: CounselingServiceRecordSummarySchema,
  serverTime: DateTimeLikeSchema,
});

const appointmentActionTransitions: Record<
  CounselingAppointmentAction,
  { from: AppointmentStatus[]; to: AppointmentStatus }
> = {
  confirm_payment: {
    from: ["pending_payment"],
    to: "scheduled",
  },
  cancel: {
    from: ["pending_payment", "scheduled"],
    to: "cancelled",
  },
  reschedule: {
    from: ["scheduled"],
    to: "scheduled",
  },
  complete_refund: {
    from: ["cancelled"],
    to: "refunded",
  },
  complete_session: {
    from: ["scheduled"],
    to: "completed",
  },
  mark_no_show: {
    from: ["scheduled"],
    to: "no_show",
  },
};

export function getNextCounselingAppointmentStatus(
  status: AppointmentStatus,
  action: CounselingAppointmentAction
): AppointmentStatus | undefined {
  const transition = appointmentActionTransitions[action];
  return transition.from.includes(status) ? transition.to : undefined;
}

export function applyCounselingAppointmentAction({
  appointment,
  action,
  now = new Date().toISOString(),
}: {
  appointment: CounselingAppointment;
  action: CounselingAppointmentAction;
  now?: string;
}): CounselingAppointment {
  const normalized = CounselingAppointmentSchema.parse(appointment);
  const nextStatus = getNextCounselingAppointmentStatus(
    normalized.status,
    action
  );

  if (!nextStatus) {
    throw new Error("INVALID_COUNSELING_APPOINTMENT_TRANSITION");
  }

  return CounselingAppointmentSchema.parse({
    ...normalized,
    status: nextStatus,
    updatedAt: now,
  });
}

export function getCounselingPaymentDeadline(
  appointment: CounselingAppointment,
  holdMinutes = COUNSELING_PAYMENT_HOLD_MINUTES
): string {
  const normalized = CounselingAppointmentSchema.parse(appointment);
  return new Date(
    Date.parse(normalized.createdAt) + holdMinutes * 60 * 1000
  ).toISOString();
}

export function isCounselingPaymentExpired({
  appointment,
  now = new Date().toISOString(),
  holdMinutes = COUNSELING_PAYMENT_HOLD_MINUTES,
}: {
  appointment: CounselingAppointment;
  now?: string;
  holdMinutes?: number;
}): boolean {
  const normalized = CounselingAppointmentSchema.parse(appointment);
  if (normalized.status !== "pending_payment") return false;

  return (
    Date.parse(now) >=
    Date.parse(getCounselingPaymentDeadline(normalized, holdMinutes))
  );
}

export function expireOverdueCounselingAppointmentPayment({
  appointment,
  now = new Date().toISOString(),
  holdMinutes = COUNSELING_PAYMENT_HOLD_MINUTES,
}: {
  appointment: CounselingAppointment;
  now?: string;
  holdMinutes?: number;
}): CounselingAppointment | undefined {
  const normalized = CounselingAppointmentSchema.parse(appointment);

  if (
    !isCounselingPaymentExpired({
      appointment: normalized,
      now,
      holdMinutes,
    })
  ) {
    return undefined;
  }

  return CounselingAppointmentSchema.parse({
    ...normalized,
    status: "cancelled",
    updatedAt: now,
  });
}

export function evaluateCounselingCancellation({
  appointment,
  slot,
  now = new Date().toISOString(),
  policy = DEFAULT_COUNSELING_CANCELLATION_POLICY,
}: {
  appointment: CounselingAppointment;
  slot: CounselingSlot;
  now?: string;
  policy?: CounselingCancellationPolicy;
}): CounselingCancellationDecision {
  const normalized = CounselingAppointmentSchema.parse(appointment);
  const normalizedSlot = CounselingSlotSchema.parse(slot);
  const normalizedPolicy = CounselingCancellationPolicySchema.parse(policy);

  if (normalized.status === "pending_payment") {
    if (!normalizedPolicy.allowPendingPaymentCancellation) {
      return CounselingCancellationDecisionSchema.parse({
        canCancel: false,
        releaseSlot: false,
        orderTransition: "none",
        reason: "待支付预约暂不支持取消",
      });
    }

    return CounselingCancellationDecisionSchema.parse({
      canCancel: true,
      releaseSlot: true,
      orderTransition: "close_unpaid",
    });
  }

  if (normalized.status === "scheduled") {
    const cutoffAt =
      Date.parse(normalizedSlot.startsAt) -
      normalizedPolicy.scheduledRefundCutoffMinutesBeforeStart * 60 * 1000;

    if (Date.parse(now) > cutoffAt) {
      return CounselingCancellationDecisionSchema.parse({
        canCancel: false,
        releaseSlot: false,
        orderTransition: "none",
        reason: "已超过可取消时间，请联系平台支持",
      });
    }

    return CounselingCancellationDecisionSchema.parse({
      canCancel: true,
      releaseSlot: true,
      orderTransition: "request_refund",
    });
  }

  return CounselingCancellationDecisionSchema.parse({
    canCancel: false,
    releaseSlot: false,
    orderTransition: "none",
    reason: "当前预约状态不支持取消",
  });
}

export function applyCounselingAppointmentReschedule({
  appointment,
  nextSlot,
  now = new Date().toISOString(),
}: {
  appointment: CounselingAppointment;
  nextSlot: CounselingSlot;
  now?: string;
}): CounselingAppointment {
  const normalized = CounselingAppointmentSchema.parse(appointment);
  const normalizedSlot = CounselingSlotSchema.parse(nextSlot);
  const nextStatus = getNextCounselingAppointmentStatus(
    normalized.status,
    "reschedule"
  );

  if (!nextStatus) {
    throw new Error("INVALID_COUNSELING_APPOINTMENT_TRANSITION");
  }

  if (normalized.slotId === normalizedSlot.id) {
    throw new Error("INVALID_COUNSELING_RESCHEDULE_SLOT");
  }

  if (!normalizedSlot.available) {
    throw new Error("COUNSELING_RESCHEDULE_SLOT_UNAVAILABLE");
  }

  return CounselingAppointmentSchema.parse({
    ...normalized,
    counselorId: normalizedSlot.counselorId,
    slotId: normalizedSlot.id,
    channel: normalizedSlot.channel,
    status: nextStatus,
    updatedAt: now,
  });
}

export type CounselorSpecialty = z.infer<typeof CounselorSpecialtySchema>;
export type CounselingConcernTag = z.infer<typeof CounselingConcernTagSchema>;
export type Counselor = z.infer<typeof CounselorSchema>;
export type CounselorAdminServiceStatus = z.infer<
  typeof CounselorAdminServiceStatusSchema
>;
export type CounselorCredentialStatus = z.infer<
  typeof CounselorCredentialStatusSchema
>;
export type CounselingChannel = z.infer<typeof CounselingChannelSchema>;
export type CounselingSlot = z.infer<typeof CounselingSlotSchema>;
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;
export type CounselingUrgency = z.infer<typeof CounselingUrgencySchema>;
export type CounselingAppointment = z.infer<typeof CounselingAppointmentSchema>;
export type CounselingAvailability = z.infer<
  typeof CounselingAvailabilitySchema
>;
export type CounselingScheduleSlotStatus = z.infer<
  typeof CounselingScheduleSlotStatusSchema
>;
export type CounselorOperationServiceStatus = z.infer<
  typeof CounselorOperationServiceStatusSchema
>;
export type CounselingAdminScheduleSlot = z.infer<
  typeof CounselingAdminScheduleSlotSchema
>;
export type CounselingAdminScheduleSummary = z.infer<
  typeof CounselingAdminScheduleSummarySchema
>;
export type CounselingAdminCounselorSchedule = z.infer<
  typeof CounselingAdminCounselorScheduleSchema
>;
export type CounselingAdminScheduleConsole = z.infer<
  typeof CounselingAdminScheduleConsoleSchema
>;
export type CounselingAdminScheduleActionRequest = z.infer<
  typeof CounselingAdminScheduleActionRequestSchema
>;
export type CounselingAdminScheduleMutationResult = z.infer<
  typeof CounselingAdminScheduleMutationResultSchema
>;
export type CounselorAdminProfileConfig = z.infer<
  typeof CounselorAdminProfileConfigSchema
>;
export type CounselorAdminServiceSummary = z.infer<
  typeof CounselorAdminServiceSummarySchema
>;
export type CounselorAdminProfile = z.infer<typeof CounselorAdminProfileSchema>;
export type CounselorAdminProfileSummary = z.infer<
  typeof CounselorAdminProfileSummarySchema
>;
export type CounselorAdminProfileFilter = z.infer<
  typeof CounselorAdminProfileFilterSchema
>;
export type CounselorAdminProfilePatch = z.infer<
  typeof CounselorAdminProfilePatchSchema
>;
export type CounselorAdminProfileUpdateRequest = z.infer<
  typeof CounselorAdminProfileUpdateRequestSchema
>;
export type CounselorAdminProfileConsole = z.infer<
  typeof CounselorAdminProfileConsoleSchema
>;
export type CounselorAdminProfileMutationResult = z.infer<
  typeof CounselorAdminProfileMutationResultSchema
>;
export type CounselingAppointmentCreateRequest = z.infer<
  typeof CounselingAppointmentCreateRequestSchema
>;
export type CounselingAppointmentCreateResult = z.infer<
  typeof CounselingAppointmentCreateResultSchema
>;
export type CounselingAppointmentRecord = z.infer<
  typeof CounselingAppointmentRecordSchema
>;
export type CounselingAppointmentList = z.infer<
  typeof CounselingAppointmentListSchema
>;
export type CounselingWorkbenchSummary = z.infer<
  typeof CounselingWorkbenchSummarySchema
>;
export type CounselingWorkbench = z.infer<typeof CounselingWorkbenchSchema>;
export type CounselingAppointmentAction = z.infer<
  typeof CounselingAppointmentActionSchema
>;
export type CounselingAppointmentActionRequest = z.infer<
  typeof CounselingAppointmentActionRequestSchema
>;
export type CounselingAppointmentActionResult = z.infer<
  typeof CounselingAppointmentActionResultSchema
>;
export type CounselingCancellationPolicy = z.infer<
  typeof CounselingCancellationPolicySchema
>;
export type CounselingCancellationPolicyUpdateRequest = z.infer<
  typeof CounselingCancellationPolicyUpdateRequestSchema
>;
export type CounselingCancellationOrderTransition = z.infer<
  typeof CounselingCancellationOrderTransitionSchema
>;
export type CounselingCancellationDecision = z.infer<
  typeof CounselingCancellationDecisionSchema
>;
export type CounselingOperationAuditAction = z.infer<
  typeof CounselingOperationAuditActionSchema
>;
export type CounselingOperationAuditEvent = z.infer<
  typeof CounselingOperationAuditEventSchema
>;
export type CounselingOperationsConsole = z.infer<
  typeof CounselingOperationsConsoleSchema
>;
export type CounselingCancellationPolicyUpdateResult = z.infer<
  typeof CounselingCancellationPolicyUpdateResultSchema
>;
export type CounselingServiceRecordAnomalyType = z.infer<
  typeof CounselingServiceRecordAnomalyTypeSchema
>;
export type CounselingServiceRecordFilter = z.infer<
  typeof CounselingServiceRecordFilterSchema
>;
export type CounselingServiceRecord = z.infer<
  typeof CounselingServiceRecordSchema
>;
export type CounselingServiceRecordSummary = z.infer<
  typeof CounselingServiceRecordSummarySchema
>;
export type CounselingServiceRecordConsole = z.infer<
  typeof CounselingServiceRecordConsoleSchema
>;
