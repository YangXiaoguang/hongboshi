import { randomUUID } from "crypto";
import {
  OrderAfterSalesAuditEventSchema,
  OrderAfterSalesRequestSchema,
  createAfterSalesRefundCompletedNotification,
  type OrderAfterSalesAuditEvent,
  type OrderAfterSalesAuditSnapshot,
  type OrderAfterSalesRequest,
} from "../../../shared/domain";
import {
  getUserNotificationStore,
  type UserNotificationStore,
} from "../users/userNotificationStore";
import {
  getOrderAfterSalesStore,
  type OrderAfterSalesStore,
} from "./orderAfterSalesStore";

const REFUND_COMPLETED_NOTE = "退款已完成，售后工单已自动收尾";
const PAYMENT_WEBHOOK_ACTOR_ID = "system_payment_webhook";

function auditSnapshot(
  request: OrderAfterSalesRequest
): OrderAfterSalesAuditSnapshot {
  return {
    status: request.status,
    linkedTransactionId: request.linkedTransactionId,
    linkedRefundRequestId: request.linkedRefundRequestId,
    operatorNote: request.operatorNote,
  };
}

function buildRefundCompletedAuditEvent({
  before,
  after,
  request,
  now,
}: {
  before: OrderAfterSalesAuditSnapshot;
  after: OrderAfterSalesAuditSnapshot;
  request: OrderAfterSalesRequest;
  now: string;
}): OrderAfterSalesAuditEvent {
  return OrderAfterSalesAuditEventSchema.parse({
    id: `order_after_sales_audit_${randomUUID()}`,
    requestId: request.id,
    orderId: request.orderId,
    userId: request.userId,
    actorId: PAYMENT_WEBHOOK_ACTOR_ID,
    actorRoles: ["system"],
    action: "resolve",
    reason: REFUND_COMPLETED_NOTE,
    before,
    after,
    createdAt: now,
  });
}

export async function completeRefundedOrderAfterSales({
  orderId,
  userId,
  orderTitle,
  transactionId,
  now,
  store = getOrderAfterSalesStore(),
  notificationStore = getUserNotificationStore(),
}: {
  orderId: string;
  userId: string;
  orderTitle?: string;
  transactionId?: string;
  now: string;
  store?: OrderAfterSalesStore;
  notificationStore?: UserNotificationStore;
}): Promise<{
  requests: OrderAfterSalesRequest[];
  auditEvents: OrderAfterSalesAuditEvent[];
}> {
  const requests = await store.listByOrderId(orderId);
  const candidates = requests.filter(
    request =>
      request.userId === userId && request.status === "linked_to_refund"
  );
  const completedRequests: OrderAfterSalesRequest[] = [];
  const auditEvents: OrderAfterSalesAuditEvent[] = [];

  for (const request of candidates) {
    const before = auditSnapshot(request);
    const next = await store.save(
      OrderAfterSalesRequestSchema.parse({
        ...request,
        status: "resolved",
        operatorNote: REFUND_COMPLETED_NOTE,
        updatedAt: now,
      })
    );
    const auditEvent = await store.appendAuditEvent(
      buildRefundCompletedAuditEvent({
        before,
        after: auditSnapshot(next),
        request: next,
        now,
      })
    );

    await notificationStore.append(
      createAfterSalesRefundCompletedNotification({
        userId: next.userId,
        orderId: next.orderId,
        requestId: next.id,
        orderTitle,
        transactionId,
        refundRequestId: next.linkedRefundRequestId,
        now,
      })
    );

    completedRequests.push(next);
    auditEvents.push(auditEvent);
  }

  return {
    requests: completedRequests,
    auditEvents,
  };
}
