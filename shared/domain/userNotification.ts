import { z } from "zod";
import { DateTimeLikeSchema, EntityIdSchema } from "./common";
import type { OrderAfterSalesAdminAction } from "./order";

export const UserNotificationTypeSchema = z.enum([
  "after_sales_reviewing",
  "after_sales_resolved",
  "after_sales_closed",
  "refund_request_accepted",
  "refund_request_rejected",
  "refund_completed",
]);

export const UserNotificationStatusSchema = z.enum(["unread", "read"]);

export const UserNotificationPrioritySchema = z.enum(["normal", "important"]);

export const UserNotificationResourceSchema = z.object({
  kind: z.literal("order_after_sales"),
  orderId: EntityIdSchema,
  requestId: EntityIdSchema,
  orderTitle: z.string().trim().min(1).max(120).optional(),
  transactionId: EntityIdSchema.optional(),
  refundRequestId: EntityIdSchema.optional(),
});

export const UserNotificationSchema = z.object({
  id: EntityIdSchema,
  userId: EntityIdSchema,
  type: UserNotificationTypeSchema,
  status: UserNotificationStatusSchema.default("unread"),
  priority: UserNotificationPrioritySchema.default("normal"),
  title: z.string().trim().min(1).max(80),
  content: z.string().trim().min(1).max(240),
  resource: UserNotificationResourceSchema,
  createdAt: DateTimeLikeSchema,
  readAt: DateTimeLikeSchema.optional(),
});

export const UserNotificationListResultSchema = z.object({
  notifications: z.array(UserNotificationSchema),
  unreadCount: z.number().int().min(0),
  privacyNotice: z.string().min(1),
  generatedAt: DateTimeLikeSchema,
});

export const UserNotificationMarkReadRequestSchema = z.object({
  notificationIds: z.array(EntityIdSchema).max(100).optional(),
  scope: z.literal("all").optional(),
});

export const UserNotificationMutationResultSchema = z.object({
  notifications: z.array(UserNotificationSchema),
  unreadCount: z.number().int().min(0),
  updatedAt: DateTimeLikeSchema,
});

export type UserNotificationType = z.infer<typeof UserNotificationTypeSchema>;
export type UserNotificationStatus = z.infer<
  typeof UserNotificationStatusSchema
>;
export type UserNotificationPriority = z.infer<
  typeof UserNotificationPrioritySchema
>;
export type UserNotificationResource = z.infer<
  typeof UserNotificationResourceSchema
>;
export type UserNotification = z.infer<typeof UserNotificationSchema>;
export type UserNotificationListResult = z.infer<
  typeof UserNotificationListResultSchema
>;
export type UserNotificationMarkReadRequest = z.infer<
  typeof UserNotificationMarkReadRequestSchema
>;
export type UserNotificationMutationResult = z.infer<
  typeof UserNotificationMutationResultSchema
>;

function safeIdPart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
}

function orderLabel(orderTitle: string | undefined, orderId: string) {
  return orderTitle?.trim() ? `「${orderTitle.trim()}」` : `订单 ${orderId}`;
}

function clampContent(content: string) {
  return content.length > 240 ? `${content.slice(0, 237)}...` : content;
}

function notificationId({
  userId,
  requestId,
  type,
  now,
}: {
  userId: string;
  requestId: string;
  type: UserNotificationType;
  now: string;
}) {
  return `notice_${safeIdPart(userId)}_${safeIdPart(requestId)}_${type}_${Date.parse(now) || safeIdPart(now)}`;
}

function afterSalesNotificationCopy({
  action,
  orderTitle,
  orderId,
  linkedRefundRequestId,
  operatorNote,
}: {
  action: OrderAfterSalesAdminAction;
  orderTitle?: string;
  orderId: string;
  linkedRefundRequestId?: string;
  operatorNote: string;
}): Pick<UserNotification, "type" | "title" | "content" | "priority"> {
  const label = orderLabel(orderTitle, orderId);

  if (action === "start_review") {
    return {
      type: "after_sales_reviewing",
      title: "售后申请已进入处理中",
      content: clampContent(
        `${label} 的售后申请已由运营开始核查。备注：${operatorNote}`
      ),
      priority: "normal",
    };
  }

  if (action === "resolve") {
    return {
      type: "after_sales_resolved",
      title: "售后申请已解决",
      content: clampContent(
        `${label} 的售后申请已完成处理。备注：${operatorNote}`
      ),
      priority: "normal",
    };
  }

  if (action === "close") {
    return {
      type: "after_sales_closed",
      title: "售后申请已关闭",
      content: clampContent(`${label} 的售后申请已关闭。备注：${operatorNote}`),
      priority: "normal",
    };
  }

  return {
    type: "refund_request_accepted",
    title: "退款申请已受理",
    content: clampContent(
      `${label} 的退款申请已受理${
        linkedRefundRequestId ? `，受理单号 ${linkedRefundRequestId}` : ""
      }。退款完成仍以支付回调为准。`
    ),
    priority: "important",
  };
}

export function createAfterSalesProgressNotification({
  userId,
  orderId,
  requestId,
  orderTitle,
  action,
  operatorNote,
  linkedTransactionId,
  linkedRefundRequestId,
  now = new Date().toISOString(),
}: {
  userId: string;
  orderId: string;
  requestId: string;
  orderTitle?: string;
  action: OrderAfterSalesAdminAction;
  operatorNote: string;
  linkedTransactionId?: string;
  linkedRefundRequestId?: string;
  now?: string;
}): UserNotification {
  const copy = afterSalesNotificationCopy({
    action,
    orderTitle,
    orderId,
    linkedRefundRequestId,
    operatorNote,
  });

  return UserNotificationSchema.parse({
    id: notificationId({ userId, requestId, type: copy.type, now }),
    userId,
    status: "unread",
    ...copy,
    resource: {
      kind: "order_after_sales",
      orderId,
      requestId,
      orderTitle,
      transactionId: linkedTransactionId,
      refundRequestId: linkedRefundRequestId,
    },
    createdAt: now,
  });
}

export function createAfterSalesRefundRejectedNotification({
  userId,
  orderId,
  requestId,
  orderTitle,
  transactionId,
  operatorNote,
  rejectionMessage,
  now = new Date().toISOString(),
}: {
  userId: string;
  orderId: string;
  requestId: string;
  orderTitle?: string;
  transactionId?: string;
  operatorNote: string;
  rejectionMessage: string;
  now?: string;
}): UserNotification {
  const type: UserNotificationType = "refund_request_rejected";
  const label = orderLabel(orderTitle, orderId);

  return UserNotificationSchema.parse({
    id: notificationId({ userId, requestId, type, now }),
    userId,
    type,
    status: "unread",
    priority: "important",
    title: "退款申请暂未受理",
    content: clampContent(
      `${label} 的退款申请暂未被渠道受理：${rejectionMessage}。运营备注：${operatorNote}`
    ),
    resource: {
      kind: "order_after_sales",
      orderId,
      requestId,
      orderTitle,
      transactionId,
    },
    createdAt: now,
  });
}

export function createAfterSalesRefundCompletedNotification({
  userId,
  orderId,
  requestId,
  orderTitle,
  transactionId,
  refundRequestId,
  now = new Date().toISOString(),
}: {
  userId: string;
  orderId: string;
  requestId: string;
  orderTitle?: string;
  transactionId?: string;
  refundRequestId?: string;
  now?: string;
}): UserNotification {
  const type: UserNotificationType = "refund_completed";
  const label = orderLabel(orderTitle, orderId);

  return UserNotificationSchema.parse({
    id: notificationId({ userId, requestId, type, now }),
    userId,
    type,
    status: "unread",
    priority: "important",
    title: "退款已完成",
    content: clampContent(
      `${label} 的退款已由支付回调确认完成，售后工单已自动收尾。款项到账时间以原支付渠道为准。`
    ),
    resource: {
      kind: "order_after_sales",
      orderId,
      requestId,
      orderTitle,
      transactionId,
      refundRequestId,
    },
    createdAt: now,
  });
}
