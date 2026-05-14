import { randomUUID } from "crypto";
import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { z } from "zod";
import { counselorProfiles } from "../../../shared/data/counselingSeed";
import {
  ApiResponseSchema,
  applyCounselingAppointmentAction,
  applyCounselingAppointmentReschedule,
  applyPaymentSucceededWebhookToOrder,
  applyRefundSucceededWebhookToOrder,
  closeUnpaidOrder,
  COUNSELING_PAYMENT_HOLD_MINUTES,
  CounselingAppointmentActionRequestSchema,
  CounselingAppointmentActionResultSchema,
  CounselingAdminScheduleActionRequestSchema,
  CounselingAdminScheduleConsoleSchema,
  CounselingAdminScheduleMutationResultSchema,
  CounselingAppointmentCreateRequestSchema,
  CounselingAppointmentCreateResultSchema,
  CounselingAppointmentListSchema,
  CounselingAvailabilitySchema,
  CounselingCancellationPolicyUpdateRequestSchema,
  CounselingCancellationPolicyUpdateResultSchema,
  CounselingOperationAuditEventSchema,
  CounselingOperationsConsoleSchema,
  CounselingServiceRecordConsoleSchema,
  CounselingServiceRecordFilterSchema,
  CounselingWorkbenchSchema,
  createCounselingSessionOrder,
  createSimulatedPaymentSucceededEvent,
  evaluateCounselingCancellation,
  expireOverdueCounselingAppointmentPayment,
  findCourseAccessOrder,
  getCounselingPaymentDeadline,
  PaymentSucceededWebhookEventSchema,
  PaymentBusinessOrderSnapshotSchema,
  PaymentSchema,
  RefundSchema,
  RefundSucceededWebhookEventSchema,
  RiskEventSchema,
  markOrderRefunded,
  requestOrderRefund,
  upsertCourseAccessOrder,
  userCan,
  type CourseAccessState,
  type CounselingAdminScheduleActionRequest,
  type CounselingAdminScheduleConsole,
  type CounselingAdminScheduleSlot,
  type CounselingAppointment,
  type CounselingAppointmentAction,
  type CounselingAppointmentCreateRequest,
  type CounselingAppointmentRecord,
  type CounselingCancellationDecision,
  type CounselingCancellationPolicy,
  type CounselingOperationAuditAction,
  type CounselingOperationAuditEvent,
  type CounselingServiceRecord,
  type CounselingServiceRecordAnomalyType,
  type CounselingServiceRecordFilter,
  type CounselingServiceRecordSummary,
  type CounselingSlot,
  type CounselingWorkbenchSummary,
  type LoginSession,
  type Order,
  type Payment,
  type PaymentBusinessOrderSnapshot,
  type PaymentSucceededWebhookEvent,
  type Refund,
  type RefundSucceededWebhookEvent,
  type RiskEvent,
} from "../../../shared/domain";
import { getLoginSessionFromRequest } from "../auth/authSessionApi";
import {
  createDefaultCounselingAppointmentStore,
  type CounselingAppointmentStore,
} from "./counselingAppointmentStore";
import {
  createDefaultCounselingOperationStore,
  type CounselingOperationStore,
} from "./counselingOperationStore";
import {
  loadCourseAccessState,
  saveCourseAccessState,
} from "../courses/courseAccessApi";
import { resetRiskEventStore, saveRiskEvent } from "../risk/riskEventStore";

const CounselingAvailabilityResponseSchema = ApiResponseSchema(
  CounselingAvailabilitySchema
);
const CounselingAppointmentCreateResponseSchema = ApiResponseSchema(
  CounselingAppointmentCreateResultSchema
);
const CounselingAppointmentListResponseSchema = ApiResponseSchema(
  CounselingAppointmentListSchema
);
const CounselingWorkbenchResponseSchema = ApiResponseSchema(
  CounselingWorkbenchSchema
);
const CounselingOperationsConsoleResponseSchema = ApiResponseSchema(
  CounselingOperationsConsoleSchema
);
const CounselingServiceRecordConsoleResponseSchema = ApiResponseSchema(
  CounselingServiceRecordConsoleSchema
);
const CounselingAdminScheduleConsoleResponseSchema = ApiResponseSchema(
  CounselingAdminScheduleConsoleSchema
);
const CounselingAdminScheduleMutationResponseSchema = ApiResponseSchema(
  CounselingAdminScheduleMutationResultSchema
);
const CounselingCancellationPolicyUpdateResponseSchema = ApiResponseSchema(
  CounselingCancellationPolicyUpdateResultSchema
);
const CounselingAppointmentActionResponseSchema = ApiResponseSchema(
  CounselingAppointmentActionResultSchema
);
export const CounselingPaymentWebhookResultSchema = z.object({
  event: PaymentSucceededWebhookEventSchema,
  payment: PaymentSchema,
  appointment: CounselingAppointmentActionResultSchema.shape.appointment,
  counselor: CounselingAppointmentActionResultSchema.shape.counselor,
  slot: CounselingAppointmentActionResultSchema.shape.slot,
  order: CounselingAppointmentActionResultSchema.shape.order,
  riskEvent: CounselingAppointmentActionResultSchema.shape.riskEvent,
  nextSteps: z.array(z.string().min(1)).min(1),
});
export const CounselingRefundWebhookResultSchema = z.object({
  event: RefundSucceededWebhookEventSchema,
  refund: RefundSchema,
  appointment: CounselingAppointmentActionResultSchema.shape.appointment,
  counselor: CounselingAppointmentActionResultSchema.shape.counselor,
  slot: CounselingAppointmentActionResultSchema.shape.slot,
  order: CounselingAppointmentActionResultSchema.shape.order,
  riskEvent: CounselingAppointmentActionResultSchema.shape.riskEvent,
  nextSteps: z.array(z.string().min(1)).min(1),
});
const CounselingPaymentWebhookResponseSchema = ApiResponseSchema(
  CounselingPaymentWebhookResultSchema
);
const CounselingRefundWebhookResponseSchema = ApiResponseSchema(
  CounselingRefundWebhookResultSchema
);

let counselingAppointmentStore = createDefaultCounselingAppointmentStore();
let counselingOperationStore = createDefaultCounselingOperationStore();

function reportStoreError(err: unknown) {
  console.error(err instanceof Error ? err.message : "咨询预约持久化失败");
}

function isActiveSlotConflict(err: unknown) {
  if (!err || typeof err !== "object") return false;
  const error = err as {
    code?: unknown;
    constraint?: unknown;
    message?: unknown;
  };
  return (
    error.code === "23505" ||
    error.constraint === "uniq_active_counseling_slot" ||
    (typeof error.message === "string" &&
      error.message.includes("uniq_active_counseling_slot"))
  );
}

function sendJson(
  res: Response | ServerResponse,
  status: number,
  payload: unknown
) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function errorPayload(
  code:
    | "BAD_REQUEST"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "INTERNAL_ERROR",
  message: string
) {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  } as const;
}

function readRequestBody(req: IncomingMessage): Promise<unknown> {
  return new Promise(resolve => {
    let body = "";
    req.on("data", chunk => {
      body += chunk.toString();
    });
    req.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        resolve(undefined);
      }
    });
  });
}

function resolveRiskEvent({
  request,
  userId,
  now,
}: {
  request: CounselingAppointmentCreateRequest;
  userId: string;
  now: string;
}): RiskEvent | undefined {
  const hasCrisisSignal = request.concernTags.includes("crisis");
  const isUrgent =
    request.urgency === "immediate" ||
    request.assessmentRiskLevel === "urgent" ||
    hasCrisisSignal;
  const isHigh = request.assessmentRiskLevel === "high";
  const isMedium = request.urgency === "within_24h";

  if (!isUrgent && !isHigh && !isMedium) return undefined;

  return RiskEventSchema.parse({
    id: `risk_counseling_${Date.parse(now)}_${randomUUID().slice(0, 8)}`,
    userId,
    source: "counseling_intake",
    riskLevel: isUrgent ? "urgent" : isHigh ? "high" : "medium",
    signal: hasCrisisSignal
      ? "咨询预约前信息包含危机支持诉求"
      : `咨询预约前信息提示 ${request.assessmentRiskLevel ?? request.urgency} 风险`,
    status: "open",
    createdAt: now,
  });
}

function buildNextSteps(riskEvent: RiskEvent | undefined) {
  if (riskEvent?.riskLevel === "urgent") {
    return [
      "如果危险正在发生，请优先联系身边可信任的人或当地紧急服务。",
      "平台会把本次预约标记为优先支持，咨询师会在服务前查看你的重点信息。",
      "在等待咨询前，请尽量不要独处，并把当前状态告诉一个现实中的人。",
    ];
  }

  if (riskEvent) {
    return [
      "本次预约已进入重点关注队列，咨询师会在服务前查看你的重点信息。",
      `请在 ${COUNSELING_PAYMENT_HOLD_MINUTES} 分钟内完成支付以保留时段，后续可继续接入改期与取消流程。`,
      "若状态突然恶化，请优先获得现实中的即时帮助。",
    ];
  }

  return [
    `请在 ${COUNSELING_PAYMENT_HOLD_MINUTES} 分钟内完成支付以保留时段，支付能力会在后续迭代接入。`,
    "咨询师会在服务前查看你填写的困扰重点和补充说明。",
    "预约确认后，可在个人中心查看咨询记录和后续跟进建议。",
  ];
}

function buildActionNextSteps(
  action: CounselingAppointmentAction,
  options: { orderStatus?: Order["status"] } = {}
) {
  if (action === "confirm_payment") {
    return [
      "预约已确认，咨询师会在服务前查看你的咨询前信息。",
      "请提前 10 分钟进入对应咨询渠道，给自己留出安静空间。",
      "如果时间需要调整，可以在服务开始前申请取消或改期。",
    ];
  }

  if (action === "reschedule") {
    return [
      "预约时间已更新，原咨询时段已释放。",
      "请按新的时间提前 10 分钟进入对应咨询渠道。",
      "如果状态出现明显波动，请及时补充说明或联系平台支持。",
    ];
  }

  if (action === "complete_refund") {
    return [
      "退款已完成，预约记录已归档为已退款。",
      "如果仍需要支持，可以重新选择合适的咨询时段。",
    ];
  }

  if (action === "complete_session") {
    return [
      "本次咨询已完成，建议在咨询后整理 1-2 个可执行的小行动。",
      "后续可以在成长空间查看咨询记录，并按需继续预约支持。",
    ];
  }

  if (action === "mark_no_show") {
    return [
      "本次预约已标记为未到访，咨询师工作台会保留履约记录。",
      "如需继续服务，请根据平台规则重新预约或联系运营支持。",
    ];
  }

  if (options.orderStatus === "refunding") {
    return [
      "预约已取消，原咨询时段已释放。",
      "退款申请已进入处理流程，完成后订单会更新为已退款。",
      "如果当前状态仍需要支持，建议尽快重新预约或联系现实中的可信任支持。",
    ];
  }

  return [
    "预约已取消，原咨询时段已释放，可以重新选择更合适的时间。",
    "如果当前状态仍需要支持，建议尽快重新预约或联系现实中的可信任支持。",
  ];
}

function transitionConflictMessage(
  status: CounselingAppointment["status"],
  action: CounselingAppointmentAction
) {
  if (action === "confirm_payment") {
    if (status === "scheduled") return "该预约已确认，无需重复支付";
    if (status === "cancelled") return "该预约已取消，如需咨询请重新选择时段";
    return "当前预约状态不支持确认支付";
  }

  if (action === "reschedule") {
    if (status === "pending_payment") return "待支付预约需要先确认支付后再改期";
    if (status === "cancelled") return "已取消预约不能改期";
    if (status === "refunded") return "已退款预约不能改期";
    return "当前预约状态不支持改期";
  }

  if (action === "complete_refund") {
    if (status === "refunded") return "该预约已退款，无需重复处理";
    return "当前预约状态不支持完成退款";
  }

  if (action === "complete_session") {
    if (status === "completed") return "该预约已完成，无需重复处理";
    return "当前预约状态不支持标记完成";
  }

  if (action === "mark_no_show") {
    if (status === "no_show") return "该预约已标记未到访，无需重复处理";
    return "当前预约状态不支持标记未到访";
  }

  if (status === "cancelled") return "该预约已取消，无需重复取消";
  if (status === "refunded") return "该预约已退款，无需取消";
  return "当前预约状态不支持取消";
}

async function rollbackCourseAccessState(
  userId: string,
  previousState: CourseAccessState | undefined
) {
  if (!previousState) return;

  try {
    await saveCourseAccessState(userId, previousState);
  } catch (err) {
    reportStoreError(err);
  }
}

async function getAppointmentOrder(appointment: CounselingAppointment) {
  if (!appointment.orderId) return undefined;

  const accessState = await loadCourseAccessState(appointment.userId);
  return findCourseAccessOrder(accessState, appointment.orderId);
}

export async function getCounselingPaymentOrderSnapshot(
  orderId: string
): Promise<PaymentBusinessOrderSnapshot | undefined> {
  const appointment =
    await counselingAppointmentStore.getAppointmentByOrderId(orderId);
  if (!appointment) return undefined;

  const order = await getAppointmentOrder(appointment);
  return PaymentBusinessOrderSnapshotSchema.parse({
    domain: "counseling",
    orderId,
    userId: appointment.userId,
    orderStatus: order?.status,
    appointmentId: appointment.id,
    appointmentStatus: appointment.status,
    counselorId: appointment.counselorId,
    payableAmount: order?.payableAmount,
    paidAt: order?.paidAt,
  });
}

async function saveAppointmentOrderUpdate({
  appointment,
  updateOrder,
}: {
  appointment: CounselingAppointment;
  updateOrder: (order: Order) => Order;
}) {
  if (!appointment.orderId) {
    throw new Error("COUNSELING_APPOINTMENT_ORDER_MISSING");
  }

  const previousState = await loadCourseAccessState(appointment.userId);
  const currentOrder = findCourseAccessOrder(
    previousState,
    appointment.orderId
  );
  if (!currentOrder) {
    throw new Error("COUNSELING_APPOINTMENT_ORDER_NOT_FOUND");
  }

  const nextOrder = updateOrder(currentOrder);
  await saveCourseAccessState(
    appointment.userId,
    upsertCourseAccessOrder(previousState, nextOrder)
  );

  return {
    previousState,
    order: nextOrder,
  };
}

function paymentWebhookConflictMessage(err: unknown) {
  if (!(err instanceof Error)) return "支付回调暂时无法处理";

  if (err.message === "PAYMENT_WEBHOOK_ORDER_MISMATCH") {
    return "支付回调订单不匹配";
  }
  if (err.message === "PAYMENT_WEBHOOK_AMOUNT_MISMATCH") {
    return "支付金额与订单应付金额不一致";
  }
  if (err.message === "INVALID_ORDER_PAYMENT_TRANSITION") {
    return "当前订单状态不支持确认支付";
  }
  if (err.message === "INVALID_COUNSELING_APPOINTMENT_TRANSITION") {
    return "当前预约状态不支持确认支付";
  }

  return "支付回调暂时无法处理";
}

function refundWebhookConflictMessage(err: unknown) {
  if (!(err instanceof Error)) return "退款回调暂时无法处理";

  if (err.message === "REFUND_WEBHOOK_ORDER_MISMATCH") {
    return "退款回调订单不匹配";
  }
  if (err.message === "REFUND_WEBHOOK_AMOUNT_MISMATCH") {
    return "退款金额与订单应付金额不一致";
  }
  if (err.message === "INVALID_ORDER_REFUND_TRANSITION") {
    return "当前订单状态不支持完成退款";
  }
  if (err.message === "INVALID_COUNSELING_APPOINTMENT_TRANSITION") {
    return "当前预约状态不支持完成退款";
  }

  return "退款回调暂时无法处理";
}

export async function processCounselingPaymentWebhookEvent(
  event: PaymentSucceededWebhookEvent,
  expectedUserId?: string
) {
  const paymentEvent = PaymentSucceededWebhookEventSchema.parse(event);
  await expireOverdueCounselingPayments(paymentEvent.occurredAt);

  const appointment = await counselingAppointmentStore.getAppointmentByOrderId(
    paymentEvent.orderId
  );
  if (
    !appointment ||
    (expectedUserId && appointment.userId !== expectedUserId)
  ) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "支付回调关联的预约不存在"),
    } as const;
  }

  const slot = await counselingAppointmentStore.getSlot(appointment.slotId);
  const counselor = counselorProfiles.find(
    item => item.id === appointment.counselorId
  );
  if (!slot || !counselor) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "支付回调关联资源不存在"),
    } as const;
  }

  const previousAccessState = await loadCourseAccessState(appointment.userId);
  const currentOrder = findCourseAccessOrder(
    previousAccessState,
    paymentEvent.orderId
  );
  if (!currentOrder) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "支付回调关联的订单不存在"),
    } as const;
  }

  let webhookResult: { payment: Payment; order: Order };
  try {
    webhookResult = applyPaymentSucceededWebhookToOrder(
      currentOrder,
      paymentEvent
    );
  } catch (err) {
    return {
      status: 409,
      body: errorPayload("CONFLICT", paymentWebhookConflictMessage(err)),
    } as const;
  }

  const riskEvent = await counselingAppointmentStore.getRiskEventForAppointment(
    appointment.id
  );

  if (appointment.status === "scheduled" && currentOrder.status === "paid") {
    return {
      status: 200,
      body: CounselingPaymentWebhookResponseSchema.parse({
        ok: true,
        data: {
          event: paymentEvent,
          payment: webhookResult.payment,
          appointment,
          counselor,
          slot,
          order: currentOrder,
          riskEvent,
          nextSteps: buildActionNextSteps("confirm_payment"),
        },
      }),
    } as const;
  }

  let nextAppointment: CounselingAppointment;
  try {
    nextAppointment = applyCounselingAppointmentAction({
      appointment,
      action: "confirm_payment",
      now: paymentEvent.occurredAt,
    });
  } catch (err) {
    return {
      status: 409,
      body: errorPayload("CONFLICT", paymentWebhookConflictMessage(err)),
    } as const;
  }

  const nextSlot: CounselingSlot = {
    ...slot,
    available: false,
  };

  let orderUpdated = false;
  try {
    await saveCourseAccessState(
      appointment.userId,
      upsertCourseAccessOrder(previousAccessState, webhookResult.order)
    );
    orderUpdated = true;

    const savedAppointment = await counselingAppointmentStore.saveAppointment(
      nextAppointment,
      riskEvent
    );
    const savedSlot = await counselingAppointmentStore.saveSlot(nextSlot);

    return {
      status: 200,
      body: CounselingPaymentWebhookResponseSchema.parse({
        ok: true,
        data: {
          event: paymentEvent,
          payment: webhookResult.payment,
          appointment: savedAppointment,
          counselor,
          slot: savedSlot,
          order: webhookResult.order,
          riskEvent,
          nextSteps: buildActionNextSteps("confirm_payment"),
        },
      }),
    } as const;
  } catch (err) {
    if (orderUpdated) {
      await rollbackCourseAccessState(appointment.userId, previousAccessState);
    }
    reportStoreError(err);
    return {
      status: 500,
      body: errorPayload("INTERNAL_ERROR", "支付回调处理失败，请稍后重试"),
    } as const;
  }
}

export async function processCounselingRefundWebhookEvent(
  event: RefundSucceededWebhookEvent
) {
  const refundEvent = RefundSucceededWebhookEventSchema.parse(event);
  const appointment = await counselingAppointmentStore.getAppointmentByOrderId(
    refundEvent.orderId
  );
  if (!appointment) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "退款回调关联的预约不存在"),
    } as const;
  }

  const slot = await counselingAppointmentStore.getSlot(appointment.slotId);
  const counselor = counselorProfiles.find(
    item => item.id === appointment.counselorId
  );
  if (!slot || !counselor) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "退款回调关联资源不存在"),
    } as const;
  }

  const previousAccessState = await loadCourseAccessState(appointment.userId);
  const currentOrder = findCourseAccessOrder(
    previousAccessState,
    refundEvent.orderId
  );
  if (!currentOrder) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "退款回调关联的订单不存在"),
    } as const;
  }

  let webhookResult: { refund: Refund; order: Order };
  try {
    webhookResult = applyRefundSucceededWebhookToOrder(
      currentOrder,
      refundEvent
    );
  } catch (err) {
    return {
      status: 409,
      body: errorPayload("CONFLICT", refundWebhookConflictMessage(err)),
    } as const;
  }

  const riskEvent = await counselingAppointmentStore.getRiskEventForAppointment(
    appointment.id
  );

  if (appointment.status === "refunded" && currentOrder.status === "refunded") {
    return {
      status: 200,
      body: CounselingRefundWebhookResponseSchema.parse({
        ok: true,
        data: {
          event: refundEvent,
          refund: webhookResult.refund,
          appointment,
          counselor,
          slot,
          order: currentOrder,
          riskEvent,
          nextSteps: buildActionNextSteps("complete_refund"),
        },
      }),
    } as const;
  }

  let nextAppointment: CounselingAppointment;
  try {
    nextAppointment = applyCounselingAppointmentAction({
      appointment,
      action: "complete_refund",
      now: refundEvent.occurredAt,
    });
  } catch (err) {
    return {
      status: 409,
      body: errorPayload("CONFLICT", refundWebhookConflictMessage(err)),
    } as const;
  }

  let orderUpdated = false;
  try {
    await saveCourseAccessState(
      appointment.userId,
      upsertCourseAccessOrder(previousAccessState, webhookResult.order)
    );
    orderUpdated = true;

    const savedAppointment = await counselingAppointmentStore.saveAppointment(
      nextAppointment,
      riskEvent
    );

    return {
      status: 200,
      body: CounselingRefundWebhookResponseSchema.parse({
        ok: true,
        data: {
          event: refundEvent,
          refund: webhookResult.refund,
          appointment: savedAppointment,
          counselor,
          slot,
          order: webhookResult.order,
          riskEvent,
          nextSteps: buildActionNextSteps("complete_refund"),
        },
      }),
    } as const;
  } catch (err) {
    if (orderUpdated) {
      await rollbackCourseAccessState(appointment.userId, previousAccessState);
    }
    reportStoreError(err);
    return {
      status: 500,
      body: errorPayload("INTERNAL_ERROR", "退款回调处理失败，请稍后重试"),
    } as const;
  }
}

export async function expireOverdueCounselingPayments(
  now = new Date().toISOString()
) {
  const pendingAppointments =
    await counselingAppointmentStore.listPendingPaymentAppointments();
  const expiredRecords: CounselingAppointmentRecord[] = [];

  for (const appointment of pendingAppointments) {
    const expiredAppointment = expireOverdueCounselingAppointmentPayment({
      appointment,
      now,
    });
    if (!expiredAppointment) continue;

    const slot = await counselingAppointmentStore.getSlot(appointment.slotId);
    const counselor = counselorProfiles.find(
      item => item.id === appointment.counselorId
    );
    if (!slot || !counselor) continue;

    const riskEvent =
      await counselingAppointmentStore.getRiskEventForAppointment(
        appointment.id
      );
    const releasedSlot: CounselingSlot = {
      ...slot,
      available: true,
    };

    let previousAccessState: CourseAccessState | undefined;
    let orderUpdated = false;
    try {
      if (appointment.orderId) {
        const orderUpdate = await saveAppointmentOrderUpdate({
          appointment,
          updateOrder: closeUnpaidOrder,
        });
        previousAccessState = orderUpdate.previousState;
        orderUpdated = true;
      }

      const savedAppointment = await counselingAppointmentStore.saveAppointment(
        expiredAppointment,
        riskEvent
      );
      const savedSlot = await counselingAppointmentStore.saveSlot(releasedSlot);
      const order = await getAppointmentOrder(savedAppointment);

      expiredRecords.push({
        appointment: savedAppointment,
        counselor,
        slot: savedSlot,
        order,
        riskEvent,
      });
    } catch (err) {
      if (orderUpdated) {
        await rollbackCourseAccessState(
          appointment.userId,
          previousAccessState
        );
      }
      reportStoreError(err);
    }
  }

  return {
    expiredAppointments: expiredRecords,
    releasedSlotIds: expiredRecords.map(record => record.slot.id),
    serverTime: now,
  };
}

export function resetCounselingAppointmentStore(now = new Date()) {
  return Promise.all([
    Promise.resolve(counselingAppointmentStore.reset(now)),
    Promise.resolve(counselingOperationStore.clear()),
    resetRiskEventStore(),
  ]).then(() => undefined);
}

export function setCounselingAppointmentStore(
  store: CounselingAppointmentStore
) {
  counselingAppointmentStore = store;
}

export function setCounselingOperationStore(store: CounselingOperationStore) {
  counselingOperationStore = store;
}

export async function getCounselingAvailabilityPayload(
  now = new Date().toISOString()
) {
  await expireOverdueCounselingPayments(now);

  return CounselingAvailabilityResponseSchema.parse({
    ok: true,
    data: {
      counselors: counselorProfiles,
      slots: await counselingAppointmentStore.listSlots(new Date(now)),
      serverTime: now,
    },
  });
}

export async function createCounselingAppointmentPayload(
  body: unknown,
  userId?: string,
  now = new Date().toISOString()
) {
  if (!userId) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", "请先登录后再预约咨询"),
    } as const;
  }

  const parsed = CounselingAppointmentCreateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "咨询预约信息不完整或格式不合法"),
    } as const;
  }

  const request = parsed.data;
  await expireOverdueCounselingPayments(now);

  const counselor = counselorProfiles.find(
    item => item.id === request.counselorId
  );
  if (!counselor) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "咨询师不存在"),
    } as const;
  }

  const slot = await counselingAppointmentStore.getSlot(request.slotId);
  if (!slot || slot.counselorId !== request.counselorId) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "咨询时段不存在"),
    } as const;
  }

  if (!slot.available) {
    return {
      status: 409,
      body: errorPayload("CONFLICT", "该咨询时段已被占用，请选择其他时间"),
    } as const;
  }

  if (slot.channel !== request.channel) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "咨询渠道与所选时段不匹配"),
    } as const;
  }

  const reservedSlot: CounselingSlot = {
    ...slot,
    available: false,
  };

  const appointmentId = `appointment_${randomUUID()}`;
  const order = createCounselingSessionOrder({
    appointmentId,
    userId,
    counselorName: counselor.name,
    sessionPrice: counselor.sessionPrice,
    now,
  });
  const appointment: CounselingAppointment = {
    id: appointmentId,
    userId,
    counselorId: counselor.id,
    slotId: slot.id,
    orderId: order.id,
    channel: request.channel,
    status: "pending_payment",
    concernTags: request.concernTags,
    noteForCounselor: request.noteForCounselor,
    assessmentReportId: request.assessmentReportId,
    createdAt: now,
    updatedAt: now,
  };
  const riskEvent = resolveRiskEvent({ request, userId, now });
  let slotReserved = false;
  let orderCreated = false;
  let previousAccessState: CourseAccessState | undefined;
  try {
    if (riskEvent) await saveRiskEvent(riskEvent);
    await counselingAppointmentStore.saveSlot(reservedSlot);
    slotReserved = true;
    previousAccessState = await loadCourseAccessState(userId);
    await saveCourseAccessState(
      userId,
      upsertCourseAccessOrder(previousAccessState, order)
    );
    orderCreated = true;
    await counselingAppointmentStore.saveAppointment(appointment, riskEvent);
  } catch (err) {
    if (slotReserved) {
      try {
        await counselingAppointmentStore.saveSlot(slot);
      } catch (releaseErr) {
        reportStoreError(releaseErr);
      }
    }
    if (orderCreated) {
      await rollbackCourseAccessState(userId, previousAccessState);
    }
    if (isActiveSlotConflict(err)) {
      return {
        status: 409,
        body: errorPayload("CONFLICT", "该咨询时段已被占用，请选择其他时间"),
      } as const;
    }

    reportStoreError(err);
    return {
      status: 500,
      body: errorPayload("INTERNAL_ERROR", "咨询预约创建失败，请稍后重试"),
    } as const;
  }

  return {
    status: 200,
    body: CounselingAppointmentCreateResponseSchema.parse({
      ok: true,
      data: {
        appointment,
        counselor,
        slot: reservedSlot,
        order,
        riskEvent,
        nextSteps: buildNextSteps(riskEvent),
      },
    }),
  } as const;
}

async function appointmentToRecord(
  appointment: CounselingAppointment
): Promise<CounselingAppointmentRecord | undefined> {
  const counselor = counselorProfiles.find(
    item => item.id === appointment.counselorId
  );
  const slot = await counselingAppointmentStore.getSlot(appointment.slotId);
  if (!counselor || !slot) return undefined;

  return {
    appointment,
    counselor,
    slot,
    order: await getAppointmentOrder(appointment),
    riskEvent: await counselingAppointmentStore.getRiskEventForAppointment(
      appointment.id
    ),
  };
}

export async function listCounselingAppointmentRecords(
  userId: string,
  now = new Date().toISOString()
) {
  await expireOverdueCounselingPayments(now);

  const appointments =
    await counselingAppointmentStore.listAppointmentsByUser(userId);
  const records = await Promise.all(appointments.map(appointmentToRecord));
  return records.filter((record): record is CounselingAppointmentRecord =>
    Boolean(record)
  );
}

export async function listCounselingAppointmentUserIds(
  now = new Date().toISOString()
) {
  await expireOverdueCounselingPayments(now);
  const appointments = await counselingAppointmentStore.listAppointments();
  return Array.from(
    new Set(appointments.map(appointment => appointment.userId))
  );
}

export async function listCounselingAppointmentsPayload(
  userId?: string,
  now = new Date().toISOString()
) {
  if (!userId) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", "请先登录后查看咨询预约"),
    } as const;
  }

  const appointments = await listCounselingAppointmentRecords(userId, now);

  return {
    status: 200,
    body: CounselingAppointmentListResponseSchema.parse({
      ok: true,
      data: {
        appointments,
        serverTime: now,
      },
    }),
  } as const;
}

type FulfillmentActor = Pick<LoginSession["user"], "id" | "roles">;

function saveCounselingOperationAuditEvent({
  action,
  actor,
  now,
  appointment,
  nextAppointment,
  previousOrder,
  nextOrder,
  policyBefore,
  policyAfter,
  counselorId,
  note,
}: {
  action: CounselingOperationAuditAction;
  actor: FulfillmentActor;
  now: string;
  appointment?: CounselingAppointment;
  nextAppointment?: CounselingAppointment;
  previousOrder?: Order;
  nextOrder?: Order;
  policyBefore?: CounselingCancellationPolicy;
  policyAfter?: CounselingCancellationPolicy;
  counselorId?: string;
  note?: string;
}): Promise<CounselingOperationAuditEvent> {
  const event = CounselingOperationAuditEventSchema.parse({
    id: `audit_counseling_${Date.parse(now)}_${randomUUID().slice(0, 8)}`,
    action,
    actorId: actor.id,
    actorRoles: actor.roles,
    appointmentId: appointment?.id ?? nextAppointment?.id,
    userId: appointment?.userId ?? nextAppointment?.userId,
    counselorId:
      appointment?.counselorId ?? nextAppointment?.counselorId ?? counselorId,
    previousAppointmentStatus: appointment?.status,
    nextAppointmentStatus: nextAppointment?.status,
    previousOrderStatus: previousOrder?.status,
    nextOrderStatus: nextOrder?.status,
    policyBefore,
    policyAfter,
    note,
    createdAt: now,
  });

  return Promise.resolve(counselingOperationStore.saveAuditEvent(event));
}

const COUNSELING_ADMIN_SCHEDULE_WINDOW_DAYS = 30;
const COUNSELING_ADMIN_MIN_SLOT_MINUTES = 15;
const COUNSELING_ADMIN_MAX_SLOT_MINUTES = 180;

const scheduleOccupyingStatuses = new Set<CounselingAppointment["status"]>([
  "pending_payment",
  "scheduled",
  "completed",
  "no_show",
]);

function buildAppointmentBySlotId(appointments: CounselingAppointment[]) {
  const appointmentPriority: Record<CounselingAppointment["status"], number> = {
    pending_payment: 1,
    scheduled: 2,
    completed: 3,
    no_show: 4,
    cancelled: 5,
    refunded: 6,
  };
  const appointmentsBySlotId = new Map<string, CounselingAppointment>();

  appointments.forEach(appointment => {
    if (!scheduleOccupyingStatuses.has(appointment.status)) return;

    const previous = appointmentsBySlotId.get(appointment.slotId);
    if (
      !previous ||
      appointmentPriority[appointment.status] <
        appointmentPriority[previous.status]
    ) {
      appointmentsBySlotId.set(appointment.slotId, appointment);
    }
  });

  return appointmentsBySlotId;
}

function getAdminScheduleSlotStatus(
  slot: CounselingSlot,
  appointment?: CounselingAppointment
) {
  if (appointment?.status === "pending_payment") return "locked" as const;
  if (appointment && scheduleOccupyingStatuses.has(appointment.status)) {
    return "scheduled" as const;
  }

  return slot.available ? ("available" as const) : ("closed" as const);
}

function buildScheduleConflictHint(
  status: CounselingAdminScheduleSlot["status"],
  appointment?: CounselingAppointment
) {
  if (status === "available") return undefined;
  if (status === "locked") return "待支付预约正在锁定该时段，超时后会自动释放";
  if (status === "scheduled") {
    return appointment?.id
      ? `已有预约 ${appointment.id}，不能直接关闭或覆盖`
      : "已有预约，不能直接关闭或覆盖";
  }

  return "该时段已关闭，不会出现在用户可预约列表";
}

function toAdminScheduleSlot({
  slot,
  counselor,
  appointment,
}: {
  slot: CounselingSlot;
  counselor: (typeof counselorProfiles)[number];
  appointment?: CounselingAppointment;
}): CounselingAdminScheduleSlot {
  const status = getAdminScheduleSlotStatus(slot, appointment);

  return {
    id: slot.id,
    counselorId: slot.counselorId,
    counselorName: counselor.name,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    channel: slot.channel,
    status,
    appointmentId: appointment?.id,
    appointmentStatus: appointment?.status,
    conflictHint: buildScheduleConflictHint(status, appointment),
  };
}

function buildCounselorServiceStatus(
  summary: CounselingAdminScheduleConsole["counselors"][number]["summary"]
): CounselingAdminScheduleConsole["counselors"][number]["serviceStatus"] {
  if (summary.availableCount > 0) return "active";
  if (summary.lockedCount + summary.scheduledCount > 0) return "full";
  return "paused";
}

async function buildCounselingAdminScheduleConsole(
  now = new Date().toISOString()
): Promise<CounselingAdminScheduleConsole> {
  const windowStartMs = Date.parse(now);
  const safeWindowStart = Number.isNaN(windowStartMs)
    ? new Date().toISOString()
    : new Date(windowStartMs).toISOString();
  const safeWindowStartMs = Date.parse(safeWindowStart);
  const windowEnd = new Date(
    safeWindowStartMs +
      COUNSELING_ADMIN_SCHEDULE_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const windowEndMs = Date.parse(windowEnd);
  const [slots, appointments] = await Promise.all([
    counselingAppointmentStore.listSlots(new Date(safeWindowStart)),
    counselingAppointmentStore.listAppointments(),
  ]);
  const appointmentsBySlotId = buildAppointmentBySlotId(appointments);

  const slotsByCounselorId = new Map<string, CounselingAdminScheduleSlot[]>();
  slots
    .filter(slot => {
      const startsAt = Date.parse(slot.startsAt);
      return (
        !Number.isNaN(startsAt) &&
        startsAt >= safeWindowStartMs &&
        startsAt <= windowEndMs
      );
    })
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .forEach(slot => {
      const counselor = counselorProfiles.find(
        item => item.id === slot.counselorId
      );
      if (!counselor) return;

      const adminSlot = toAdminScheduleSlot({
        slot,
        counselor,
        appointment: appointmentsBySlotId.get(slot.id),
      });
      slotsByCounselorId.set(slot.counselorId, [
        ...(slotsByCounselorId.get(slot.counselorId) ?? []),
        adminSlot,
      ]);
    });

  const counselors = counselorProfiles.map(counselor => {
    const scheduleSlots = slotsByCounselorId.get(counselor.id) ?? [];
    const summary = {
      availableCount: scheduleSlots.filter(slot => slot.status === "available")
        .length,
      lockedCount: scheduleSlots.filter(slot => slot.status === "locked")
        .length,
      scheduledCount: scheduleSlots.filter(slot => slot.status === "scheduled")
        .length,
      closedCount: scheduleSlots.filter(slot => slot.status === "closed")
        .length,
    };
    const nextAvailableAt = scheduleSlots.find(
      slot => slot.status === "available"
    )?.startsAt;

    return {
      counselor,
      serviceStatus: buildCounselorServiceStatus(summary),
      nextAvailableAt,
      summary,
      slots: scheduleSlots,
    };
  });

  return CounselingAdminScheduleConsoleSchema.parse({
    counselors,
    windowStart: safeWindowStart,
    windowEnd,
    serverTime: safeWindowStart,
  });
}

function validateScheduleRange({
  startsAt,
  endsAt,
  now,
}: {
  startsAt: string;
  endsAt: string;
  now: string;
}) {
  const startsAtMs = Date.parse(startsAt);
  const endsAtMs = Date.parse(endsAt);
  const nowMs = Date.parse(now);

  if (
    Number.isNaN(startsAtMs) ||
    Number.isNaN(endsAtMs) ||
    Number.isNaN(nowMs)
  ) {
    return "排班时间格式不合法";
  }
  if (startsAtMs < nowMs) return "不能新增过去时间的咨询时段";
  if (endsAtMs <= startsAtMs) return "结束时间必须晚于开始时间";

  const durationMinutes = (endsAtMs - startsAtMs) / 60 / 1000;
  if (durationMinutes < COUNSELING_ADMIN_MIN_SLOT_MINUTES) {
    return `咨询时段至少需要 ${COUNSELING_ADMIN_MIN_SLOT_MINUTES} 分钟`;
  }
  if (durationMinutes > COUNSELING_ADMIN_MAX_SLOT_MINUTES) {
    return `单个咨询时段不能超过 ${COUNSELING_ADMIN_MAX_SLOT_MINUTES} 分钟`;
  }

  return undefined;
}

function scheduleSlotsOverlap(
  slot: Pick<CounselingSlot, "startsAt" | "endsAt">,
  startsAt: string,
  endsAt: string
) {
  const slotStart = Date.parse(slot.startsAt);
  const slotEnd = Date.parse(slot.endsAt);
  const nextStart = Date.parse(startsAt);
  const nextEnd = Date.parse(endsAt);

  if (
    Number.isNaN(slotStart) ||
    Number.isNaN(slotEnd) ||
    Number.isNaN(nextStart) ||
    Number.isNaN(nextEnd)
  ) {
    return false;
  }

  return slotStart < nextEnd && nextStart < slotEnd;
}

async function findOverlappingScheduleSlot({
  counselorId,
  startsAt,
  endsAt,
  excludeSlotId,
}: {
  counselorId: string;
  startsAt: string;
  endsAt: string;
  excludeSlotId?: string;
}) {
  const slots = await counselingAppointmentStore.listSlots(new Date(startsAt));
  return slots.find(
    slot =>
      slot.counselorId === counselorId &&
      slot.id !== excludeSlotId &&
      scheduleSlotsOverlap(slot, startsAt, endsAt)
  );
}

async function getScheduleSlotStatus(slot: CounselingSlot) {
  const appointments = await counselingAppointmentStore.listAppointments();
  return getAdminScheduleSlotStatus(
    slot,
    buildAppointmentBySlotId(appointments).get(slot.id)
  );
}

function findScheduleSlotInConsole(
  scheduleConsole: CounselingAdminScheduleConsole,
  slotId: string
) {
  return scheduleConsole.counselors
    .flatMap(counselor => counselor.slots)
    .find(slot => slot.id === slotId);
}

function scheduleAuditNote({
  action,
  slot,
  reason,
}: {
  action: CounselingAdminScheduleActionRequest["action"];
  slot: CounselingSlot;
  reason?: string;
}) {
  const actionCopy: Record<
    CounselingAdminScheduleActionRequest["action"],
    string
  > = {
    add_available_slot: "新增可预约时段",
    close_slot: "关闭未预约时段",
    restore_slot: "恢复可预约时段",
  };
  const reasonCopy = reason?.trim() ? `；原因：${reason.trim()}` : "";
  return `${actionCopy[action]} ${slot.id}（${slot.startsAt} - ${slot.endsAt}）${reasonCopy}`;
}

export async function getCounselingAdminSchedulesPayload(
  actor?: FulfillmentActor,
  now = new Date().toISOString()
) {
  if (!actor) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", "请先登录后查看咨询排班"),
    } as const;
  }

  if (!userCan(actor, "admin:manage")) {
    return {
      status: 403,
      body: errorPayload("FORBIDDEN", "当前账号暂无咨询排班权限"),
    } as const;
  }

  await expireOverdueCounselingPayments(now);

  return {
    status: 200,
    body: CounselingAdminScheduleConsoleResponseSchema.parse({
      ok: true,
      data: await buildCounselingAdminScheduleConsole(now),
    }),
  } as const;
}

export async function updateCounselingAdminSchedulePayload(
  body: unknown,
  actor?: FulfillmentActor,
  now = new Date().toISOString()
) {
  if (!actor) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", "请先登录后维护咨询排班"),
    } as const;
  }

  if (!userCan(actor, "admin:manage")) {
    return {
      status: 403,
      body: errorPayload("FORBIDDEN", "当前账号暂无咨询排班权限"),
    } as const;
  }

  const parsed = CounselingAdminScheduleActionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "咨询排班操作参数不合法"),
    } as const;
  }

  await expireOverdueCounselingPayments(now);

  const request = parsed.data;
  let savedSlot: CounselingSlot;

  if (request.action === "add_available_slot") {
    const counselor = counselorProfiles.find(
      item => item.id === request.counselorId
    );
    if (!counselor) {
      return {
        status: 404,
        body: errorPayload("NOT_FOUND", "咨询师不存在"),
      } as const;
    }

    const rangeError = validateScheduleRange({
      startsAt: request.startsAt,
      endsAt: request.endsAt,
      now,
    });
    if (rangeError) {
      return {
        status: 400,
        body: errorPayload("BAD_REQUEST", rangeError),
      } as const;
    }

    const startsAt = new Date(Date.parse(request.startsAt)).toISOString();
    const endsAt = new Date(Date.parse(request.endsAt)).toISOString();
    const overlapping = await findOverlappingScheduleSlot({
      counselorId: counselor.id,
      startsAt,
      endsAt,
    });
    if (overlapping) {
      return {
        status: 409,
        body: errorPayload(
          "CONFLICT",
          overlapping.available
            ? "该咨询师已有重叠的可预约时段"
            : "该咨询师已有重叠时段，请先处理原时段"
        ),
      } as const;
    }

    savedSlot = await counselingAppointmentStore.saveSlot({
      id: `slot_admin_${counselor.id}_${Date.parse(startsAt)}_${randomUUID().slice(
        0,
        8
      )}`,
      counselorId: counselor.id,
      startsAt,
      endsAt,
      channel: request.channel,
      available: true,
    });
  } else {
    const slot = await counselingAppointmentStore.getSlot(request.slotId);
    if (!slot) {
      return {
        status: 404,
        body: errorPayload("NOT_FOUND", "咨询时段不存在"),
      } as const;
    }

    const status = await getScheduleSlotStatus(slot);
    if (request.action === "close_slot") {
      if (status === "locked" || status === "scheduled") {
        return {
          status: 409,
          body: errorPayload("CONFLICT", "该时段已被锁定或预约，不能直接关闭"),
        } as const;
      }
      if (status === "closed") {
        return {
          status: 409,
          body: errorPayload("CONFLICT", "该时段已关闭，无需重复操作"),
        } as const;
      }

      savedSlot = await counselingAppointmentStore.saveSlot({
        ...slot,
        available: false,
      });
    } else {
      if (status !== "closed") {
        return {
          status: 409,
          body: errorPayload("CONFLICT", "只有已关闭的时段可以恢复"),
        } as const;
      }

      const overlapping = await findOverlappingScheduleSlot({
        counselorId: slot.counselorId,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        excludeSlotId: slot.id,
      });
      if (overlapping) {
        return {
          status: 409,
          body: errorPayload("CONFLICT", "存在重叠时段，暂不能恢复该排班"),
        } as const;
      }

      savedSlot = await counselingAppointmentStore.saveSlot({
        ...slot,
        available: true,
      });
    }
  }

  try {
    const auditEvent = await saveCounselingOperationAuditEvent({
      action:
        request.action === "add_available_slot"
          ? "schedule_slot_added"
          : request.action === "close_slot"
            ? "schedule_slot_closed"
            : "schedule_slot_restored",
      actor,
      now,
      counselorId: savedSlot.counselorId,
      note: scheduleAuditNote({
        action: request.action,
        slot: savedSlot,
        reason: request.reason,
      }),
    });
    const scheduleConsole = await buildCounselingAdminScheduleConsole(now);
    const adminSlot = findScheduleSlotInConsole(scheduleConsole, savedSlot.id);
    if (!adminSlot) {
      throw new Error("COUNSELING_ADMIN_SCHEDULE_SLOT_NOT_IN_WINDOW");
    }

    return {
      status: 200,
      body: CounselingAdminScheduleMutationResponseSchema.parse({
        ok: true,
        data: {
          scheduleConsole,
          slot: adminSlot,
          auditEvent,
          serverTime: now,
        },
      }),
    } as const;
  } catch (err) {
    reportStoreError(err);
    return {
      status: 500,
      body: errorPayload("INTERNAL_ERROR", "咨询排班更新失败，请稍后重试"),
    } as const;
  }
}

export async function getCounselingOperationsConsolePayload(
  actor?: FulfillmentActor,
  now = new Date().toISOString()
) {
  if (!actor) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", "请先登录后查看运营配置"),
    } as const;
  }

  if (!userCan(actor, "admin:manage")) {
    return {
      status: 403,
      body: errorPayload("FORBIDDEN", "当前账号暂无运营配置权限"),
    } as const;
  }

  return {
    status: 200,
    body: CounselingOperationsConsoleResponseSchema.parse({
      ok: true,
      data: {
        cancellationPolicy:
          await counselingOperationStore.getCancellationPolicy(),
        auditEvents: await counselingOperationStore.listAuditEvents(),
        serverTime: now,
      },
    }),
  } as const;
}

export async function updateCounselingCancellationPolicyPayload(
  body: unknown,
  actor?: FulfillmentActor,
  now = new Date().toISOString()
) {
  if (!actor) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", "请先登录后更新取消规则"),
    } as const;
  }

  if (!userCan(actor, "admin:manage")) {
    return {
      status: 403,
      body: errorPayload("FORBIDDEN", "当前账号暂无运营配置权限"),
    } as const;
  }

  const parsed =
    CounselingCancellationPolicyUpdateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "取消规则参数不合法"),
    } as const;
  }

  const previousPolicy = await counselingOperationStore.getCancellationPolicy();
  const nextPolicy = await counselingOperationStore.saveCancellationPolicy(
    parsed.data.policy,
    {
      actorId: actor.id,
      updatedAt: now,
    }
  );
  const auditEvent = await saveCounselingOperationAuditEvent({
    action: "cancellation_policy_updated",
    actor,
    now,
    policyBefore: previousPolicy,
    policyAfter: nextPolicy,
    note: parsed.data.reason,
  });

  return {
    status: 200,
    body: CounselingCancellationPolicyUpdateResponseSchema.parse({
      ok: true,
      data: {
        cancellationPolicy: nextPolicy,
        auditEvent,
        serverTime: now,
      },
    }),
  } as const;
}

const COUNSELING_SERVICE_RECORD_DEFAULT_LIMIT = 50;
const COUNSELING_PAYMENT_HOLD_EXPIRING_MINUTES = 10;
const COUNSELING_UPCOMING_UNCONFIRMED_HOURS = 24;

function firstStringParam(value: unknown) {
  if (Array.isArray(value)) return firstStringParam(value[0]);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function buildServiceRecordFilterCandidate(rawQuery: unknown) {
  const query =
    rawQuery && typeof rawQuery === "object"
      ? (rawQuery as Record<string, unknown>)
      : {};
  const limitValue = firstStringParam(query.limit);
  const parsedLimit = limitValue ? Number(limitValue) : undefined;

  return {
    counselorId: firstStringParam(query.counselorId),
    appointmentStatus: firstStringParam(query.appointmentStatus),
    anomalyType: firstStringParam(query.anomalyType),
    keyword: firstStringParam(query.keyword),
    limit: Number.isFinite(parsedLimit)
      ? parsedLimit
      : COUNSELING_SERVICE_RECORD_DEFAULT_LIMIT,
  };
}

function uniqueAnomalies(
  anomalies: CounselingServiceRecordAnomalyType[]
): CounselingServiceRecordAnomalyType[] {
  return Array.from(new Set(anomalies));
}

function buildServiceRecordAnomalies({
  appointment,
  slot,
  order,
  now,
}: {
  appointment: CounselingAppointment;
  slot: CounselingSlot;
  order?: Order;
  now: string;
}): CounselingServiceRecordAnomalyType[] {
  const anomalies: CounselingServiceRecordAnomalyType[] = [];
  const nowMs = Date.parse(now);
  const startsAtMs = Date.parse(slot.startsAt);
  const paymentDeadlineAt = getCounselingPaymentDeadline(appointment);
  const paymentDeadlineMs = Date.parse(paymentDeadlineAt);

  if (
    appointment.status === "pending_payment" &&
    !Number.isNaN(nowMs) &&
    !Number.isNaN(paymentDeadlineMs)
  ) {
    const minutesUntilDeadline = Math.ceil((paymentDeadlineMs - nowMs) / 60000);
    if (minutesUntilDeadline <= 0) {
      anomalies.push("payment_hold_expired");
    } else if (
      minutesUntilDeadline <= COUNSELING_PAYMENT_HOLD_EXPIRING_MINUTES
    ) {
      anomalies.push("payment_hold_expiring");
    }

    if (!Number.isNaN(startsAtMs)) {
      const hoursUntilStart = (startsAtMs - nowMs) / 60 / 60 / 1000;
      if (
        hoursUntilStart >= 0 &&
        hoursUntilStart <= COUNSELING_UPCOMING_UNCONFIRMED_HOURS
      ) {
        anomalies.push("upcoming_unconfirmed");
      }
    }
  }

  if (appointment.status === "cancelled" && order?.status === "closed") {
    const updatedAtMs = Date.parse(appointment.updatedAt);
    if (
      !Number.isNaN(updatedAtMs) &&
      !Number.isNaN(paymentDeadlineMs) &&
      updatedAtMs >= paymentDeadlineMs
    ) {
      anomalies.push("payment_hold_expired");
    } else {
      anomalies.push("payment_hold_closed");
    }
  }

  if (appointment.status === "cancelled" && order?.status === "refunding") {
    anomalies.push("cancelled_pending_refund");
  } else if (order?.status === "refunding") {
    anomalies.push("refunding");
  }

  if (appointment.status === "no_show") {
    anomalies.push("no_show");
  }

  return uniqueAnomalies(anomalies);
}

function buildServiceRecordOperationHint(
  anomalies: CounselingServiceRecordAnomalyType[]
) {
  if (anomalies.includes("no_show")) {
    return "未到访记录需要运营确认后续补约或客服跟进。";
  }
  if (anomalies.includes("cancelled_pending_refund")) {
    return "已取消并进入退款中，请关注退款回调完成情况。";
  }
  if (anomalies.includes("payment_hold_expired")) {
    return "待支付锁定已关闭，可确认用户是否仍需重新预约。";
  }
  if (anomalies.includes("payment_hold_expiring")) {
    return "待支付锁定即将释放，可提醒用户完成支付。";
  }
  if (anomalies.includes("upcoming_unconfirmed")) {
    return "预约开始临近但仍未确认，需要运营关注。";
  }
  if (anomalies.includes("refunding")) {
    return "关联订单正在退款中，请等待渠道回调。";
  }
  return undefined;
}

function buildLatestAuditEventByAppointmentId(
  auditEvents: CounselingOperationAuditEvent[]
) {
  const eventsByAppointmentId = new Map<
    string,
    CounselingOperationAuditEvent
  >();
  auditEvents.forEach(event => {
    if (!event.appointmentId) return;
    const previous = eventsByAppointmentId.get(event.appointmentId);
    if (
      !previous ||
      Date.parse(event.createdAt) > Date.parse(previous.createdAt)
    ) {
      eventsByAppointmentId.set(event.appointmentId, event);
    }
  });

  return eventsByAppointmentId;
}

function serviceRecordMatchesFilter(
  record: CounselingServiceRecord,
  filters: CounselingServiceRecordFilter
) {
  if (filters.counselorId && record.counselorId !== filters.counselorId) {
    return false;
  }
  if (
    filters.appointmentStatus &&
    record.appointmentStatus !== filters.appointmentStatus
  ) {
    return false;
  }
  if (filters.anomalyType && !record.anomalies.includes(filters.anomalyType)) {
    return false;
  }
  if (filters.keyword) {
    const keyword = filters.keyword.toLowerCase();
    const searchable = [
      record.appointmentId,
      record.orderId,
      record.userId,
      record.counselorName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!searchable.includes(keyword)) return false;
  }

  return true;
}

function buildServiceRecordSummary(
  records: CounselingServiceRecord[]
): CounselingServiceRecordSummary {
  return {
    totalCount: records.length,
    anomalyCount: records.filter(record => record.anomalies.length > 0).length,
    pendingPaymentCount: records.filter(
      record => record.appointmentStatus === "pending_payment"
    ).length,
    scheduledCount: records.filter(
      record => record.appointmentStatus === "scheduled"
    ).length,
    completedCount: records.filter(
      record => record.appointmentStatus === "completed"
    ).length,
    cancelledCount: records.filter(
      record => record.appointmentStatus === "cancelled"
    ).length,
    noShowCount: records.filter(
      record => record.appointmentStatus === "no_show"
    ).length,
    refundingCount: records.filter(record =>
      record.anomalies.some(anomaly =>
        ["cancelled_pending_refund", "refunding"].includes(anomaly)
      )
    ).length,
    paymentHoldExpiringCount: records.filter(record =>
      record.anomalies.includes("payment_hold_expiring")
    ).length,
    paymentHoldExpiredCount: records.filter(record =>
      record.anomalies.includes("payment_hold_expired")
    ).length,
    upcomingUnconfirmedCount: records.filter(record =>
      record.anomalies.includes("upcoming_unconfirmed")
    ).length,
  };
}

async function appointmentToServiceRecord({
  appointment,
  latestAudit,
  now,
}: {
  appointment: CounselingAppointment;
  latestAudit?: CounselingOperationAuditEvent;
  now: string;
}): Promise<CounselingServiceRecord | undefined> {
  const counselor = counselorProfiles.find(
    item => item.id === appointment.counselorId
  );
  const slot = await counselingAppointmentStore.getSlot(appointment.slotId);
  if (!counselor || !slot) return undefined;

  const [order, riskEvent] = await Promise.all([
    getAppointmentOrder(appointment),
    counselingAppointmentStore.getRiskEventForAppointment(appointment.id),
  ]);
  const anomalies = buildServiceRecordAnomalies({
    appointment,
    slot,
    order,
    now,
  });
  const startsAtMs = Date.parse(slot.startsAt);
  const nowMs = Date.parse(now);
  const paymentDeadlineAt = getCounselingPaymentDeadline(appointment);

  return {
    appointmentId: appointment.id,
    userId: appointment.userId,
    counselorId: counselor.id,
    counselorName: counselor.name,
    slotId: slot.id,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    channel: slot.channel,
    appointmentStatus: appointment.status,
    orderId: order?.id,
    orderStatus: order?.status,
    payableAmount: order?.payableAmount,
    paymentDeadlineAt:
      appointment.status === "pending_payment" ||
      (appointment.status === "cancelled" && order?.status === "closed")
        ? paymentDeadlineAt
        : undefined,
    minutesUntilStart:
      Number.isNaN(startsAtMs) || Number.isNaN(nowMs)
        ? undefined
        : Math.ceil((startsAtMs - nowMs) / 60000),
    riskLevel: riskEvent?.riskLevel,
    anomalies,
    latestAuditAction: latestAudit?.action,
    latestAuditAt: latestAudit?.createdAt,
    operationHint: buildServiceRecordOperationHint(anomalies),
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
  };
}

async function buildCounselingServiceRecordConsole({
  filters,
  now,
}: {
  filters: CounselingServiceRecordFilter;
  now: string;
}) {
  const [appointments, auditEvents] = await Promise.all([
    counselingAppointmentStore.listAppointments(),
    counselingOperationStore.listAuditEvents(100),
  ]);
  const auditEventsByAppointmentId =
    buildLatestAuditEventByAppointmentId(auditEvents);
  const records = (
    await Promise.all(
      appointments.map(appointment =>
        appointmentToServiceRecord({
          appointment,
          latestAudit: auditEventsByAppointmentId.get(appointment.id),
          now,
        })
      )
    )
  ).filter((record): record is CounselingServiceRecord => Boolean(record));

  const matchedRecords = records
    .filter(record => serviceRecordMatchesFilter(record, filters))
    .sort((a, b) => {
      const anomalyDelta =
        Number(b.anomalies.length > 0) - Number(a.anomalies.length > 0);
      if (anomalyDelta !== 0) return anomalyDelta;
      return Date.parse(b.startsAt) - Date.parse(a.startsAt);
    });

  return CounselingServiceRecordConsoleSchema.parse({
    counselors: counselorProfiles,
    filters,
    records: matchedRecords.slice(0, filters.limit),
    summary: buildServiceRecordSummary(matchedRecords),
    serverTime: now,
  });
}

export async function getCounselingAdminServiceRecordsPayload(
  actor?: FulfillmentActor,
  rawQuery?: unknown,
  now = new Date().toISOString()
) {
  if (!actor) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", "请先登录后查看咨询服务记录"),
    } as const;
  }

  if (!userCan(actor, "admin:manage")) {
    return {
      status: 403,
      body: errorPayload("FORBIDDEN", "当前账号暂无咨询服务记录权限"),
    } as const;
  }

  const parsedFilters = CounselingServiceRecordFilterSchema.safeParse(
    buildServiceRecordFilterCandidate(rawQuery)
  );
  if (!parsedFilters.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "咨询服务记录筛选参数不合法"),
    } as const;
  }

  await expireOverdueCounselingPayments(now);

  return {
    status: 200,
    body: CounselingServiceRecordConsoleResponseSchema.parse({
      ok: true,
      data: await buildCounselingServiceRecordConsole({
        filters: parsedFilters.data,
        now,
      }),
    }),
  } as const;
}

function buildCounselingWorkbenchSummary(
  records: CounselingAppointmentRecord[]
): CounselingWorkbenchSummary {
  return {
    scheduledCount: records.filter(
      record => record.appointment.status === "scheduled"
    ).length,
    pendingPaymentCount: records.filter(
      record => record.appointment.status === "pending_payment"
    ).length,
    refundingCount: records.filter(
      record => record.order?.status === "refunding"
    ).length,
    completedCount: records.filter(
      record => record.appointment.status === "completed"
    ).length,
    noShowCount: records.filter(
      record => record.appointment.status === "no_show"
    ).length,
  };
}

async function listWorkbenchAppointmentsForActor(actor: FulfillmentActor) {
  const canOperateAny = actor.roles.some(role =>
    ["operator", "admin"].includes(role)
  );

  if (!canOperateAny) {
    return counselingAppointmentStore.listAppointmentsByCounselor(actor.id);
  }

  const appointmentGroups = await Promise.all(
    counselorProfiles.map(counselor =>
      counselingAppointmentStore.listAppointmentsByCounselor(counselor.id)
    )
  );
  const appointmentsById = new Map<string, CounselingAppointment>();
  appointmentGroups.flat().forEach(appointment => {
    appointmentsById.set(appointment.id, appointment);
  });

  return Array.from(appointmentsById.values()).sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

export async function listCounselingWorkbenchPayload(
  actor?: FulfillmentActor,
  now = new Date().toISOString()
) {
  if (!actor) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", "请先登录后查看咨询师工作台"),
    } as const;
  }

  if (!userCan(actor, "counseling:fulfill")) {
    return {
      status: 403,
      body: errorPayload("FORBIDDEN", "当前账号暂无咨询师工作台权限"),
    } as const;
  }

  await expireOverdueCounselingPayments(now);

  const appointments = await listWorkbenchAppointmentsForActor(actor);
  const records = await Promise.all(appointments.map(appointmentToRecord));
  const validRecords = records.filter(
    (record): record is CounselingAppointmentRecord => Boolean(record)
  );

  return {
    status: 200,
    body: CounselingWorkbenchResponseSchema.parse({
      ok: true,
      data: {
        appointments: validRecords,
        summary: buildCounselingWorkbenchSummary(validRecords),
        serverTime: now,
      },
    }),
  } as const;
}

export async function fulfillCounselingAppointmentPayload(
  appointmentId: string,
  body: unknown,
  actor?: FulfillmentActor,
  now = new Date().toISOString()
) {
  if (!actor) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", "请先登录后操作咨询履约"),
    } as const;
  }

  if (!userCan(actor, "counseling:fulfill")) {
    return {
      status: 403,
      body: errorPayload("FORBIDDEN", "当前账号暂无咨询履约权限"),
    } as const;
  }

  const parsed = CounselingAppointmentActionRequestSchema.safeParse(body);
  if (
    !parsed.success ||
    !["complete_session", "mark_no_show"].includes(parsed.data.action)
  ) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "咨询履约操作参数不合法"),
    } as const;
  }

  await expireOverdueCounselingPayments(now);

  const appointment =
    await counselingAppointmentStore.getAppointment(appointmentId);
  if (!appointment) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "预约不存在"),
    } as const;
  }

  const canOperateAny = actor.roles.some(role =>
    ["operator", "admin"].includes(role)
  );
  if (!canOperateAny && actor.id !== appointment.counselorId) {
    return {
      status: 403,
      body: errorPayload("FORBIDDEN", "只能处理分配给自己的咨询预约"),
    } as const;
  }

  const slot = await counselingAppointmentStore.getSlot(appointment.slotId);
  const counselor = counselorProfiles.find(
    item => item.id === appointment.counselorId
  );
  if (!slot || !counselor) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "预约关联资源不存在"),
    } as const;
  }

  let nextAppointment: CounselingAppointment;
  try {
    nextAppointment = applyCounselingAppointmentAction({
      appointment,
      action: parsed.data.action,
      now,
    });
  } catch {
    return {
      status: 409,
      body: errorPayload(
        "CONFLICT",
        transitionConflictMessage(appointment.status, parsed.data.action)
      ),
    } as const;
  }

  try {
    const previousOrder = await getAppointmentOrder(appointment);
    const riskEvent =
      await counselingAppointmentStore.getRiskEventForAppointment(
        appointment.id
      );
    const savedAppointment = await counselingAppointmentStore.saveAppointment(
      nextAppointment,
      riskEvent
    );
    const order = await getAppointmentOrder(savedAppointment);
    await saveCounselingOperationAuditEvent({
      action: parsed.data.action as CounselingOperationAuditAction,
      actor,
      now,
      appointment,
      nextAppointment: savedAppointment,
      previousOrder,
      nextOrder: order,
    });

    return {
      status: 200,
      body: CounselingAppointmentActionResponseSchema.parse({
        ok: true,
        data: {
          appointment: savedAppointment,
          counselor,
          slot,
          order,
          riskEvent,
          nextSteps: buildActionNextSteps(parsed.data.action),
        },
      }),
    } as const;
  } catch (err) {
    reportStoreError(err);
    return {
      status: 500,
      body: errorPayload("INTERNAL_ERROR", "咨询履约状态更新失败，请稍后重试"),
    } as const;
  }
}

export async function updateCounselingAppointmentPayload(
  appointmentId: string,
  body: unknown,
  userId?: string,
  now = new Date().toISOString()
) {
  if (!userId) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", "请先登录后操作咨询预约"),
    } as const;
  }

  const parsed = CounselingAppointmentActionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "预约操作参数不合法"),
    } as const;
  }

  await expireOverdueCounselingPayments(now);

  const appointment =
    await counselingAppointmentStore.getAppointment(appointmentId);
  if (!appointment || appointment.userId !== userId) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "预约不存在"),
    } as const;
  }

  const slot = await counselingAppointmentStore.getSlot(appointment.slotId);
  const counselor = counselorProfiles.find(
    item => item.id === appointment.counselorId
  );
  if (!slot || !counselor) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "预约关联资源不存在"),
    } as const;
  }

  if (parsed.data.action === "confirm_payment") {
    const order = await getAppointmentOrder(appointment);
    if (!order) {
      return {
        status: 409,
        body: errorPayload("CONFLICT", "预约缺少可支付订单，请重新预约"),
      } as const;
    }

    const webhookPayload = await processCounselingPaymentWebhookEvent(
      createSimulatedPaymentSucceededEvent({
        order,
        now,
        transactionId: `manual_${appointment.id}_${Date.parse(now)}`,
      }),
      userId
    );

    if (!("data" in webhookPayload.body)) {
      return webhookPayload;
    }
    const webhookData = webhookPayload.body.data;

    return {
      status: webhookPayload.status,
      body: CounselingAppointmentActionResponseSchema.parse({
        ok: true,
        data: {
          appointment: webhookData.appointment,
          counselor: webhookData.counselor,
          slot: webhookData.slot,
          order: webhookData.order,
          riskEvent: webhookData.riskEvent,
          nextSteps: webhookData.nextSteps,
        },
      }),
    } as const;
  }

  if (parsed.data.action === "reschedule") {
    const nextSlot = await counselingAppointmentStore.getSlot(
      parsed.data.slotId
    );
    if (!nextSlot) {
      return {
        status: 404,
        body: errorPayload("NOT_FOUND", "目标咨询时段不存在"),
      } as const;
    }

    if (nextSlot.id === appointment.slotId) {
      return {
        status: 409,
        body: errorPayload("CONFLICT", "请选择不同的可用咨询时段"),
      } as const;
    }

    const nextCounselor = counselorProfiles.find(
      item => item.id === nextSlot.counselorId
    );
    if (!nextCounselor) {
      return {
        status: 404,
        body: errorPayload("NOT_FOUND", "目标咨询师不存在"),
      } as const;
    }

    let nextAppointment: CounselingAppointment;
    try {
      nextAppointment = applyCounselingAppointmentReschedule({
        appointment,
        nextSlot,
        now,
      });
    } catch (err) {
      return {
        status: 409,
        body: errorPayload(
          "CONFLICT",
          err instanceof Error &&
            err.message === "COUNSELING_RESCHEDULE_SLOT_UNAVAILABLE"
            ? "目标咨询时段已被占用，请选择其他时间"
            : transitionConflictMessage(appointment.status, "reschedule")
        ),
      } as const;
    }

    const reservedNextSlot: CounselingSlot = {
      ...nextSlot,
      available: false,
    };
    const releasedPreviousSlot: CounselingSlot = {
      ...slot,
      available: true,
    };

    const riskEvent =
      await counselingAppointmentStore.getRiskEventForAppointment(
        appointment.id
      );
    let appointmentSaved = false;
    let previousSlotReleased = false;
    let nextSlotReserved = false;
    try {
      const savedAppointment = await counselingAppointmentStore.saveAppointment(
        nextAppointment,
        riskEvent
      );
      appointmentSaved = true;
      await counselingAppointmentStore.saveSlot(releasedPreviousSlot);
      previousSlotReleased = true;
      const savedNextSlot =
        await counselingAppointmentStore.saveSlot(reservedNextSlot);
      nextSlotReserved = true;
      const order = await getAppointmentOrder(savedAppointment);

      return {
        status: 200,
        body: CounselingAppointmentActionResponseSchema.parse({
          ok: true,
          data: {
            appointment: savedAppointment,
            counselor: nextCounselor,
            slot: savedNextSlot,
            order,
            riskEvent,
            nextSteps: buildActionNextSteps("reschedule"),
          },
        }),
      } as const;
    } catch (err) {
      if (isActiveSlotConflict(err)) {
        return {
          status: 409,
          body: errorPayload(
            "CONFLICT",
            "目标咨询时段已被占用，请选择其他时间"
          ),
        } as const;
      }
      if (appointmentSaved) {
        try {
          await counselingAppointmentStore.saveAppointment(
            appointment,
            riskEvent
          );
        } catch (rollbackErr) {
          reportStoreError(rollbackErr);
        }
      }
      if (previousSlotReleased) {
        try {
          await counselingAppointmentStore.saveSlot(slot);
        } catch (rollbackErr) {
          reportStoreError(rollbackErr);
        }
      }
      if (nextSlotReserved) {
        try {
          await counselingAppointmentStore.saveSlot(nextSlot);
        } catch (rollbackErr) {
          reportStoreError(rollbackErr);
        }
      }
      reportStoreError(err);
      return {
        status: 500,
        body: errorPayload("INTERNAL_ERROR", "预约改期失败，请稍后重试"),
      } as const;
    }
  }

  if (
    ["complete_refund", "complete_session", "mark_no_show"].includes(
      parsed.data.action
    )
  ) {
    return {
      status: 403,
      body: errorPayload(
        "FORBIDDEN",
        parsed.data.action === "complete_refund"
          ? "退款完成需由支付回调驱动"
          : "咨询履约需在咨询师工作台操作"
      ),
    } as const;
  }

  const cancellationDecision: CounselingCancellationDecision | undefined =
    parsed.data.action === "cancel"
      ? evaluateCounselingCancellation({
          appointment,
          slot,
          now,
          policy: await counselingOperationStore.getCancellationPolicy(),
        })
      : undefined;
  if (cancellationDecision && !cancellationDecision.canCancel) {
    return {
      status: 409,
      body: errorPayload(
        "CONFLICT",
        cancellationDecision.reason ??
          transitionConflictMessage(appointment.status, parsed.data.action)
      ),
    } as const;
  }

  let nextAppointment: CounselingAppointment;
  try {
    nextAppointment = applyCounselingAppointmentAction({
      appointment,
      action: parsed.data.action,
      now,
    });
  } catch {
    return {
      status: 409,
      body: errorPayload(
        "CONFLICT",
        transitionConflictMessage(appointment.status, parsed.data.action)
      ),
    } as const;
  }

  const nextSlot: CounselingSlot =
    parsed.data.action === "cancel" && cancellationDecision?.releaseSlot
      ? {
          ...slot,
          available: true,
        }
      : slot;

  let previousAccessState: CourseAccessState | undefined;
  let orderUpdated = false;
  try {
    let order: Order | undefined;
    if (parsed.data.action === "cancel" && appointment.orderId) {
      if (cancellationDecision?.orderTransition === "close_unpaid") {
        const orderUpdate = await saveAppointmentOrderUpdate({
          appointment,
          updateOrder: closeUnpaidOrder,
        });
        previousAccessState = orderUpdate.previousState;
        orderUpdated = true;
        order = orderUpdate.order;
      }

      if (cancellationDecision?.orderTransition === "request_refund") {
        const orderUpdate = await saveAppointmentOrderUpdate({
          appointment,
          updateOrder: requestOrderRefund,
        });
        previousAccessState = orderUpdate.previousState;
        orderUpdated = true;
        order = orderUpdate.order;
      }
    }

    if (parsed.data.action === "complete_refund") {
      const orderUpdate = await saveAppointmentOrderUpdate({
        appointment,
        updateOrder: markOrderRefunded,
      });
      previousAccessState = orderUpdate.previousState;
      orderUpdated = true;
      order = orderUpdate.order;
    }

    const riskEvent =
      await counselingAppointmentStore.getRiskEventForAppointment(
        appointment.id
      );
    const savedAppointment = await counselingAppointmentStore.saveAppointment(
      nextAppointment,
      riskEvent
    );
    const savedSlot = await counselingAppointmentStore.saveSlot(nextSlot);
    const savedOrder = order ?? (await getAppointmentOrder(savedAppointment));

    return {
      status: 200,
      body: CounselingAppointmentActionResponseSchema.parse({
        ok: true,
        data: {
          appointment: savedAppointment,
          counselor,
          slot: savedSlot,
          order: savedOrder,
          riskEvent,
          nextSteps: buildActionNextSteps(parsed.data.action, {
            orderStatus: savedOrder?.status,
          }),
        },
      }),
    } as const;
  } catch (err) {
    if (orderUpdated) {
      await rollbackCourseAccessState(appointment.userId, previousAccessState);
    }
    if (
      err instanceof Error &&
      (err.message === "COUNSELING_APPOINTMENT_ORDER_MISSING" ||
        err.message === "COUNSELING_APPOINTMENT_ORDER_NOT_FOUND")
    ) {
      return {
        status: 409,
        body: errorPayload("CONFLICT", "预约缺少可支付订单，请重新预约"),
      } as const;
    }
    if (
      err instanceof Error &&
      err.message === "INVALID_ORDER_PAYMENT_TRANSITION"
    ) {
      return {
        status: 409,
        body: errorPayload("CONFLICT", "当前订单状态不支持确认支付"),
      } as const;
    }
    if (
      err instanceof Error &&
      err.message === "INVALID_ORDER_CLOSE_TRANSITION"
    ) {
      return {
        status: 409,
        body: errorPayload("CONFLICT", "当前订单状态不支持取消"),
      } as const;
    }
    if (
      err instanceof Error &&
      err.message === "INVALID_ORDER_REFUND_REQUEST_TRANSITION"
    ) {
      return {
        status: 409,
        body: errorPayload("CONFLICT", "当前订单状态不支持申请退款"),
      } as const;
    }
    if (
      err instanceof Error &&
      err.message === "INVALID_ORDER_REFUND_TRANSITION"
    ) {
      return {
        status: 409,
        body: errorPayload("CONFLICT", "当前订单状态不支持完成退款"),
      } as const;
    }
    reportStoreError(err);
    return {
      status: 500,
      body: errorPayload("INTERNAL_ERROR", "预约状态更新失败，请稍后重试"),
    } as const;
  }
}

export function registerCounselingApi(app: Express) {
  app.get(
    "/api/counseling/availability",
    async (_req: Request, res: Response) => {
      sendJson(res, 200, await getCounselingAvailabilityPayload());
    }
  );

  app.get(
    "/api/counseling/appointments",
    async (req: Request, res: Response) => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await listCounselingAppointmentsPayload(session?.user.id);
      sendJson(res, payload.status, payload.body);
    }
  );

  app.get(
    "/api/counseling/workbench/appointments",
    async (req: Request, res: Response) => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await listCounselingWorkbenchPayload(session?.user);
      sendJson(res, payload.status, payload.body);
    }
  );

  app.get(
    "/api/counseling/admin/operations",
    async (req: Request, res: Response) => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getCounselingOperationsConsolePayload(
        session?.user
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.get(
    "/api/counseling/admin/service-records",
    async (req: Request, res: Response) => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getCounselingAdminServiceRecordsPayload(
        session?.user,
        req.query
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.get(
    "/api/counseling/admin/schedules",
    async (req: Request, res: Response) => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getCounselingAdminSchedulesPayload(session?.user);
      sendJson(res, payload.status, payload.body);
    }
  );

  app.post(
    "/api/counseling/admin/schedules",
    async (req: Request, res: Response) => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await updateCounselingAdminSchedulePayload(
        req.body,
        session?.user
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.put(
    "/api/counseling/admin/cancellation-policy",
    async (req: Request, res: Response) => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await updateCounselingCancellationPolicyPayload(
        req.body,
        session?.user
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.post(
    "/api/counseling/appointments",
    async (req: Request, res: Response) => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await createCounselingAppointmentPayload(
        req.body,
        session?.user.id
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.post(
    "/api/counseling/appointments/:appointmentId/actions",
    async (req: Request, res: Response) => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await updateCounselingAppointmentPayload(
        req.params.appointmentId,
        req.body,
        session?.user.id
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.post(
    "/api/counseling/appointments/:appointmentId/fulfillment",
    async (req: Request, res: Response) => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await fulfillCounselingAppointmentPayload(
        req.params.appointmentId,
        req.body,
        session?.user
      );
      sendJson(res, payload.status, payload.body);
    }
  );
}

export function handleCounselingApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  if (!req.url || !req.url.startsWith("/api/counseling")) return false;

  const url = new URL(req.url, "http://localhost");

  if (req.method === "GET" && url.pathname === "/api/counseling/availability") {
    void getCounselingAvailabilityPayload()
      .then(payload => sendJson(res, 200, payload))
      .catch(err => {
        reportStoreError(err);
        sendJson(res, 500, errorPayload("INTERNAL_ERROR", "咨询时段读取失败"));
      });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/counseling/appointments") {
    void (async () => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await listCounselingAppointmentsPayload(session?.user.id);
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      reportStoreError(err);
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "咨询预约读取失败"));
    });
    return true;
  }

  if (
    req.method === "GET" &&
    url.pathname === "/api/counseling/workbench/appointments"
  ) {
    void (async () => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await listCounselingWorkbenchPayload(session?.user);
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      reportStoreError(err);
      sendJson(
        res,
        500,
        errorPayload("INTERNAL_ERROR", "咨询师工作台读取失败")
      );
    });
    return true;
  }

  if (
    req.method === "GET" &&
    url.pathname === "/api/counseling/admin/operations"
  ) {
    void (async () => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getCounselingOperationsConsolePayload(
        session?.user
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      reportStoreError(err);
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "运营配置读取失败"));
    });
    return true;
  }

  if (
    req.method === "GET" &&
    url.pathname === "/api/counseling/admin/service-records"
  ) {
    void (async () => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getCounselingAdminServiceRecordsPayload(
        session?.user,
        Object.fromEntries(url.searchParams.entries())
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      reportStoreError(err);
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "服务记录读取失败"));
    });
    return true;
  }

  if (
    req.method === "GET" &&
    url.pathname === "/api/counseling/admin/schedules"
  ) {
    void (async () => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getCounselingAdminSchedulesPayload(session?.user);
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      reportStoreError(err);
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "咨询排班读取失败"));
    });
    return true;
  }

  if (
    req.method === "POST" &&
    url.pathname === "/api/counseling/admin/schedules"
  ) {
    void readRequestBody(req)
      .then(async body => {
        const session = await getLoginSessionFromRequest(req);
        const payload = await updateCounselingAdminSchedulePayload(
          body,
          session?.user
        );
        sendJson(res, payload.status, payload.body);
      })
      .catch(err => {
        reportStoreError(err);
        sendJson(res, 500, errorPayload("INTERNAL_ERROR", "咨询排班保存失败"));
      });
    return true;
  }

  if (
    req.method === "PUT" &&
    url.pathname === "/api/counseling/admin/cancellation-policy"
  ) {
    void readRequestBody(req)
      .then(async body => {
        const session = await getLoginSessionFromRequest(req);
        const payload = await updateCounselingCancellationPolicyPayload(
          body,
          session?.user
        );
        sendJson(res, payload.status, payload.body);
      })
      .catch(err => {
        reportStoreError(err);
        sendJson(res, 500, errorPayload("INTERNAL_ERROR", "取消规则保存失败"));
      });
    return true;
  }

  if (
    req.method === "POST" &&
    url.pathname === "/api/counseling/appointments"
  ) {
    void readRequestBody(req)
      .then(async body => {
        const session = await getLoginSessionFromRequest(req);
        const payload = await createCounselingAppointmentPayload(
          body,
          session?.user.id
        );
        sendJson(res, payload.status, payload.body);
      })
      .catch(err => {
        reportStoreError(err);
        sendJson(res, 500, errorPayload("INTERNAL_ERROR", "咨询预约创建失败"));
      });
    return true;
  }

  const actionMatch = url.pathname.match(
    /^\/api\/counseling\/appointments\/([^/]+)\/actions$/
  );
  if (req.method === "POST" && actionMatch?.[1]) {
    void readRequestBody(req)
      .then(async body => {
        const session = await getLoginSessionFromRequest(req);
        const payload = await updateCounselingAppointmentPayload(
          decodeURIComponent(actionMatch[1]),
          body,
          session?.user.id
        );
        sendJson(res, payload.status, payload.body);
      })
      .catch(err => {
        reportStoreError(err);
        sendJson(res, 500, errorPayload("INTERNAL_ERROR", "预约状态更新失败"));
      });
    return true;
  }

  const fulfillmentMatch = url.pathname.match(
    /^\/api\/counseling\/appointments\/([^/]+)\/fulfillment$/
  );
  if (req.method === "POST" && fulfillmentMatch?.[1]) {
    void readRequestBody(req)
      .then(async body => {
        const session = await getLoginSessionFromRequest(req);
        const payload = await fulfillCounselingAppointmentPayload(
          decodeURIComponent(fulfillmentMatch[1]),
          body,
          session?.user
        );
        sendJson(res, payload.status, payload.body);
      })
      .catch(err => {
        reportStoreError(err);
        sendJson(res, 500, errorPayload("INTERNAL_ERROR", "咨询履约更新失败"));
      });
    return true;
  }

  sendJson(res, 404, errorPayload("NOT_FOUND", "咨询接口不存在"));
  return true;
}
