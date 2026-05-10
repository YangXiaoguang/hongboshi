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
  CounselingAppointmentCreateRequestSchema,
  CounselingAppointmentCreateResultSchema,
  CounselingAppointmentListSchema,
  CounselingAvailabilitySchema,
  CounselingWorkbenchSchema,
  createCounselingSessionOrder,
  createSimulatedPaymentSucceededEvent,
  evaluateCounselingCancellation,
  expireOverdueCounselingAppointmentPayment,
  findCourseAccessOrder,
  PaymentSucceededWebhookEventSchema,
  PaymentSchema,
  RefundSchema,
  RefundSucceededWebhookEventSchema,
  RiskEventSchema,
  markOrderRefunded,
  requestOrderRefund,
  upsertCourseAccessOrder,
  userCan,
  type CourseAccessState,
  type CounselingAppointment,
  type CounselingAppointmentAction,
  type CounselingAppointmentCreateRequest,
  type CounselingAppointmentRecord,
  type CounselingCancellationDecision,
  type CounselingSlot,
  type CounselingWorkbenchSummary,
  type LoginSession,
  type Order,
  type Payment,
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
    resetRiskEventStore(),
  ]).then(() => undefined);
}

export function setCounselingAppointmentStore(
  store: CounselingAppointmentStore
) {
  counselingAppointmentStore = store;
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
    const riskEvent =
      await counselingAppointmentStore.getRiskEventForAppointment(
        appointment.id
      );
    const savedAppointment = await counselingAppointmentStore.saveAppointment(
      nextAppointment,
      riskEvent
    );
    const order = await getAppointmentOrder(savedAppointment);

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
      ? evaluateCounselingCancellation({ appointment, slot, now })
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
