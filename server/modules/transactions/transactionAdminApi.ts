import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { randomUUID } from "crypto";
import { URL } from "url";
import {
  ApiResponseSchema,
  CourseAccessStateSchema,
  PaymentWebhookReceiptSnapshotSchema,
  TRANSACTION_ADMIN_PERMISSIONS,
  TransactionAdminActionRequestSchema,
  TransactionAdminAuditEventSchema,
  TransactionAdminDetailSchema,
  TransactionAdminListItemSchema,
  TransactionAdminListQuerySchema,
  TransactionAdminListResultSchema,
  TransactionAdminMutationResultSchema,
  TransactionAdminRelatedOrderSchema,
  TransactionAdminWorkOrderSchema,
  TransactionRefundProviderResultSchema,
  requestOrderRefund,
  upsertCourseAccessOrder,
  userCan,
  type AuthPermission,
  type CourseAccessState,
  type LoginSession,
  type Order,
  type OrderAdminExceptionFlag,
  type OrderAdminUserSummary,
  type OrderAfterSalesSummary,
  type PaymentWebhookReceiptSnapshot,
  type PurchasableType,
  type TransactionAdminActionRequest,
  type TransactionAdminAuditSnapshot,
  type TransactionAdminBusinessObject,
  type TransactionAdminDetail,
  type TransactionAdminIssue,
  type TransactionAdminListItem,
  type TransactionAdminListQuery,
  type TransactionAdminListResult,
  type TransactionAdminMutationResult,
  type TransactionAdminRelatedOrder,
  type TransactionAdminTimelineEvent,
  type TransactionAdminWorkOrder,
  type TransactionRefundProviderResult,
  type UserProfile,
} from "../../../shared/domain";
import {
  getLoginSessionFromRequest,
  listAuthUsers,
} from "../auth/authSessionApi";
import {
  listCourseAccessUserStates,
  listOrderAdminExceptionFlags,
  saveCourseAccessState,
} from "../courses/courseAccessApi";
import { getCounselingPaymentOrderSnapshot } from "../counseling/counselingApi";
import {
  getPaymentWebhookEventStore,
  PaymentWebhookReceiptSchema,
  type PaymentWebhookReceipt,
  type PaymentWebhookEventStore,
} from "../payments/paymentWebhookEventStore";
import {
  getTransactionOperationStore,
  type TransactionOperationStore,
} from "./transactionOperationStore";
import {
  getTransactionRefundProvider,
  type TransactionRefundProvider,
} from "./transactionRefundProvider";
import { listOrderAfterSalesSummariesByOrderIds } from "../orders/orderAfterSalesApi";

type TransactionAdminActor = Pick<LoginSession["user"], "id" | "roles">;
type DirectoryProfile = OrderAdminUserSummary & {
  roles?: UserProfile["roles"];
};
type OrderSource = {
  userId: string;
  state: CourseAccessState;
};
type OrderContext = {
  order: Order;
  relatedOrder: TransactionAdminRelatedOrder;
  businessObjects: TransactionAdminBusinessObject[];
  afterSalesRequests: OrderAfterSalesSummary[];
};

const TransactionAdminListResponseSchema = ApiResponseSchema(
  TransactionAdminListResultSchema
);
const TransactionAdminDetailResponseSchema = ApiResponseSchema(
  TransactionAdminDetailSchema
);
const TransactionAdminMutationResponseSchema = ApiResponseSchema(
  TransactionAdminMutationResultSchema
);

const fallbackProfiles = new Map<string, DirectoryProfile>([
  [
    "u_demo_active_member",
    {
      id: "u_demo_active_member",
      displayName: "陈静怡",
      phoneMasked: "138****2049",
      roles: ["member"],
    },
  ],
  [
    "u_demo_course_buyer",
    {
      id: "u_demo_course_buyer",
      displayName: "用户159****8732",
      phoneMasked: "159****8732",
      roles: ["member"],
    },
  ],
  [
    "u_demo_refund_course",
    {
      id: "u_demo_refund_course",
      displayName: "退款课程用户",
      phoneMasked: "186****5012",
      roles: ["member"],
    },
  ],
  [
    "u_demo_counseling_pending",
    {
      id: "u_demo_counseling_pending",
      displayName: "咨询预约用户",
      phoneMasked: "177****6401",
      roles: ["member"],
    },
  ],
]);

const fallbackCourseAccessUsers: OrderSource[] = [
  {
    userId: "u_demo_active_member",
    state: CourseAccessStateSchema.parse({
      ownedCourseIds: [1, 2],
      membership: {
        status: "active",
        planName: "成长会员",
        activatedAt: "2026-05-01T09:10:00+08:00",
        expiresAt: "2027-05-01T09:10:00+08:00",
      },
      orders: [
        {
          id: "order_demo_membership_1",
          userId: "u_demo_active_member",
          status: "paid",
          items: [
            {
              type: "membership",
              targetId: "growth_membership_yearly",
              title: "成长会员年卡",
              unitPrice: 399,
              quantity: 1,
            },
          ],
          subtotal: 399,
          discountAmount: 0,
          payableAmount: 399,
          createdAt: "2026-05-01T09:10:00+08:00",
          paidAt: "2026-05-01T09:12:00+08:00",
        },
      ],
    }),
  },
  {
    userId: "u_demo_course_buyer",
    state: CourseAccessStateSchema.parse({
      ownedCourseIds: [3],
      membership: {
        status: "none",
      },
      orders: [
        {
          id: "order_demo_course_3",
          userId: "u_demo_course_buyer",
          status: "paid",
          items: [
            {
              type: "course",
              targetId: "3",
              title: "亲密关系沟通课",
              unitPrice: 199,
              quantity: 1,
            },
          ],
          subtotal: 199,
          discountAmount: 20,
          payableAmount: 179,
          createdAt: "2026-05-10T18:05:00+08:00",
          paidAt: "2026-05-10T18:06:00+08:00",
        },
      ],
    }),
  },
  {
    userId: "u_demo_refund_course",
    state: CourseAccessStateSchema.parse({
      ownedCourseIds: [],
      membership: {
        status: "none",
      },
      orders: [
        {
          id: "order_demo_refund_course_2",
          userId: "u_demo_refund_course",
          status: "refunded",
          items: [
            {
              type: "course",
              targetId: "2",
              title: "睡眠修复训练营",
              unitPrice: 299,
              quantity: 1,
            },
          ],
          subtotal: 299,
          discountAmount: 0,
          payableAmount: 299,
          createdAt: "2026-05-08T20:10:00+08:00",
          paidAt: "2026-05-08T20:11:00+08:00",
        },
      ],
    }),
  },
  {
    userId: "u_demo_counseling_pending",
    state: CourseAccessStateSchema.parse({
      ownedCourseIds: [],
      membership: {
        status: "none",
      },
      orders: [
        {
          id: "order_counseling_demo_pending",
          userId: "u_demo_counseling_pending",
          status: "pending_payment",
          items: [
            {
              type: "counseling_session",
              targetId: "appointment_demo_pending",
              title: "林若安 咨询服务",
              unitPrice: 399,
              quantity: 1,
            },
          ],
          subtotal: 399,
          discountAmount: 0,
          payableAmount: 399,
          createdAt: "2026-05-12T09:20:00+08:00",
        },
      ],
    }),
  },
];

const fallbackReceipts = [
  PaymentWebhookReceiptSchema.parse({
    id: "evt_payment_order_demo_membership_1",
    eventType: "payment.succeeded",
    orderId: "order_demo_membership_1",
    channel: "manual",
    status: "processed",
    eventPayload: {
      id: "evt_payment_order_demo_membership_1",
      type: "payment.succeeded",
      orderId: "order_demo_membership_1",
      channel: "manual",
      amount: 399,
      transactionId: "manual_order_demo_membership_1",
      occurredAt: "2026-05-01T09:12:00+08:00",
    },
    receivedAt: "2026-05-01T09:12:01+08:00",
    processedAt: "2026-05-01T09:12:02+08:00",
    responseStatus: 200,
    responseBody: { ok: true },
  }),
  PaymentWebhookReceiptSchema.parse({
    id: "evt_refund_order_demo_refund_course_2",
    eventType: "refund.succeeded",
    orderId: "order_demo_refund_course_2",
    channel: "alipay",
    status: "processed",
    eventPayload: {
      id: "evt_refund_order_demo_refund_course_2",
      type: "refund.succeeded",
      orderId: "order_demo_refund_course_2",
      channel: "alipay",
      amount: 299,
      transactionId: "refund_order_demo_refund_course_2",
      occurredAt: "2026-05-09T10:30:00+08:00",
    },
    receivedAt: "2026-05-09T10:30:01+08:00",
    processedAt: "2026-05-09T10:30:02+08:00",
    responseStatus: 200,
    responseBody: { ok: true },
  }),
  PaymentWebhookReceiptSchema.parse({
    id: "evt_payment_order_demo_course_3_failed",
    eventType: "payment.succeeded",
    orderId: "order_demo_course_3",
    channel: "wechat_pay",
    status: "failed",
    eventPayload: {
      id: "evt_payment_order_demo_course_3_failed",
      type: "payment.succeeded",
      orderId: "order_demo_course_3",
      channel: "wechat_pay",
      amount: 179,
      transactionId: "wx_order_demo_course_3",
      occurredAt: "2026-05-10T18:06:00+08:00",
    },
    receivedAt: "2026-05-10T18:06:01+08:00",
    processedAt: "2026-05-10T18:06:02+08:00",
    responseStatus: 500,
    responseBody: { ok: false },
    errorMessage: "课程订单回调处理失败，需人工确认权益是否已发放",
  }),
  PaymentWebhookReceiptSchema.parse({
    id: "evt_payment_order_counseling_demo_pending",
    eventType: "payment.succeeded",
    orderId: "order_counseling_demo_pending",
    channel: "manual",
    status: "processing",
    eventPayload: {
      id: "evt_payment_order_counseling_demo_pending",
      type: "payment.succeeded",
      orderId: "order_counseling_demo_pending",
      channel: "manual",
      amount: 399,
      transactionId: "manual_order_counseling_demo_pending",
      occurredAt: "2026-05-12T09:25:00+08:00",
    },
    receivedAt: "2026-05-12T09:25:01+08:00",
  }),
];

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

function denyUnauthorizedActor(
  actor: TransactionAdminActor | null | undefined,
  permission: AuthPermission = TRANSACTION_ADMIN_PERMISSIONS.read
) {
  if (!actor) {
    return {
      status: 401,
      body: errorPayload(
        "UNAUTHORIZED",
        permission === TRANSACTION_ADMIN_PERMISSIONS.operate
          ? "请先登录后操作交易后台"
          : "请先登录后查看交易后台"
      ),
    } as const;
  }

  if (!userCan(actor, permission)) {
    return {
      status: 403,
      body: errorPayload(
        "FORBIDDEN",
        permission === TRANSACTION_ADMIN_PERMISSIONS.operate
          ? "当前账号暂无交易后台操作权限"
          : "当前账号暂无交易后台读取权限"
      ),
    } as const;
  }

  return undefined;
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

function createSyntheticUser(userId: string): OrderAdminUserSummary {
  return {
    id: userId,
    displayName: `用户 ${userId}`,
  };
}

function profileToUserSummary(profile: UserProfile): OrderAdminUserSummary {
  return {
    id: profile.id,
    displayName: profile.displayName,
    phoneMasked: profile.phoneMasked,
  };
}

async function buildDirectoryProfiles() {
  const [authUsers, courseAccessUsers] = await Promise.all([
    listAuthUsers(),
    listCourseAccessUserStates(),
  ]);

  const profiles = new Map<string, OrderAdminUserSummary>();
  for (const fallback of Array.from(fallbackProfiles.values())) {
    profiles.set(fallback.id, {
      id: fallback.id,
      displayName: fallback.displayName,
      phoneMasked: fallback.phoneMasked,
    });
  }
  for (const profile of authUsers) {
    profiles.set(profile.id, profileToUserSummary(profile));
  }
  for (const item of courseAccessUsers) {
    if (!profiles.has(item.userId)) {
      profiles.set(item.userId, createSyntheticUser(item.userId));
    }
  }

  return profiles;
}

async function listOrderSources(): Promise<OrderSource[]> {
  const courseAccessUsers = await listCourseAccessUserStates();
  return courseAccessUsers.some(item => item.state.orders.length > 0)
    ? courseAccessUsers
    : fallbackCourseAccessUsers;
}

async function listReceipts(store: PaymentWebhookEventStore) {
  const receipts = await store.listRecent(100);
  return receipts.length > 0 ? receipts : fallbackReceipts;
}

function receiptToSnapshot(
  receipt: PaymentWebhookReceipt
): PaymentWebhookReceiptSnapshot {
  const event = receipt.eventPayload;
  return PaymentWebhookReceiptSnapshotSchema.parse({
    id: receipt.id,
    type: event.type,
    orderId: receipt.orderId,
    channel: event.channel,
    status: receipt.status,
    amount: event.amount,
    transactionId: event.transactionId,
    occurredAt: event.occurredAt,
    receivedAt: receipt.receivedAt,
    processedAt: receipt.processedAt,
    responseStatus: receipt.responseStatus,
    errorMessage: receipt.errorMessage,
  });
}

function primaryTitle(order: Order) {
  const first = order.items[0];
  if (!first) return "订单";
  if (order.items.length === 1) return first.title;
  return `${first.title} 等 ${order.items.length} 项`;
}

function itemTypes(order: Order): PurchasableType[] {
  return Array.from(new Set(order.items.map(item => item.type)));
}

function activeExceptionFlag(flag: OrderAdminExceptionFlag | undefined) {
  return flag?.status === "open" ? flag : undefined;
}

function relatedOrderFromSource({
  order,
  user,
  exception,
}: {
  order: Order;
  user: OrderAdminUserSummary;
  exception?: OrderAdminExceptionFlag;
}): TransactionAdminRelatedOrder {
  return TransactionAdminRelatedOrderSchema.parse({
    id: order.id,
    status: order.status,
    user,
    itemTypes: itemTypes(order),
    primaryTitle: primaryTitle(order),
    payableAmount: order.payableAmount,
    paidAt: order.paidAt,
    exception,
  });
}

function courseAccessStatusForItem(
  state: CourseAccessState,
  order: Order,
  item: Order["items"][number]
) {
  if (order.status === "refunded") return "已退款";
  if (order.status === "refunding") return "退款中";
  if (item.type === "course") {
    const owned = state.ownedCourseIds.includes(Number(item.targetId));
    return owned ? "已开课" : "待发放";
  }
  if (item.type === "membership") {
    return state.membership.status;
  }
  return order.status;
}

async function businessObjectsFromOrder(
  state: CourseAccessState,
  order: Order
) {
  const counselingSnapshot = order.id.startsWith("order_counseling_")
    ? await getCounselingPaymentOrderSnapshot(order.id)
    : undefined;

  return order.items.map<TransactionAdminBusinessObject>(item => ({
    domain: item.type === "counseling_session" ? "counseling" : "course_access",
    type: item.type,
    targetId:
      item.type === "counseling_session" && counselingSnapshot?.appointmentId
        ? counselingSnapshot.appointmentId
        : item.targetId,
    title: item.title,
    status:
      item.type === "counseling_session"
        ? (counselingSnapshot?.appointmentStatus ?? order.status)
        : courseAccessStatusForItem(state, order, item),
  }));
}

async function buildOrderContextMap() {
  const [profiles, sources, exceptionFlags] = await Promise.all([
    buildDirectoryProfiles(),
    listOrderSources(),
    listOrderAdminExceptionFlags(),
  ]);
  const openExceptionByOrderId = new Map<string, OrderAdminExceptionFlag>();
  for (const flag of exceptionFlags) {
    const active = activeExceptionFlag(flag);
    if (active) openExceptionByOrderId.set(active.orderId, active);
  }

  const pendingContexts: Array<{
    orderId: string;
    context: Omit<OrderContext, "afterSalesRequests">;
  }> = [];
  for (const source of sources) {
    const user =
      profiles.get(source.userId) ?? createSyntheticUser(source.userId);
    for (const order of source.state.orders) {
      const exception = openExceptionByOrderId.get(order.id);
      pendingContexts.push({
        orderId: order.id,
        context: {
          order,
          relatedOrder: relatedOrderFromSource({
            order,
            user,
            exception,
          }),
          businessObjects: await businessObjectsFromOrder(source.state, order),
        },
      });
    }
  }

  const afterSalesByOrderId = await listOrderAfterSalesSummariesByOrderIds(
    pendingContexts.map(item => item.orderId)
  );
  const contexts = new Map<string, OrderContext>();
  for (const item of pendingContexts) {
    contexts.set(item.orderId, {
      ...item.context,
      afterSalesRequests: afterSalesByOrderId.get(item.orderId) ?? [],
    });
  }

  return contexts;
}

function issue(
  code: TransactionAdminIssue["code"],
  severity: TransactionAdminIssue["severity"],
  message: string
): TransactionAdminIssue {
  return { code, severity, message };
}

function buildIssues(
  receipt: PaymentWebhookReceipt,
  context: OrderContext | undefined,
  workOrder: TransactionAdminWorkOrder | undefined
) {
  const issues: TransactionAdminIssue[] = [];
  const event = receipt.eventPayload;

  if (receipt.status === "processing") {
    issues.push(issue("webhook_processing", "warning", "渠道回调仍在处理中"));
  }

  if (receipt.status === "failed") {
    issues.push(
      issue(
        "webhook_failed",
        "critical",
        receipt.errorMessage ?? "渠道回调处理失败"
      )
    );
  }

  if (!context) {
    issues.push(
      issue("order_missing", "critical", "未找到该流水关联的业务订单")
    );
  } else {
    if (context.order.payableAmount !== event.amount) {
      issues.push(
        issue(
          "order_amount_mismatch",
          "critical",
          "流水金额与订单应付金额不一致"
        )
      );
    }

    if (
      receipt.status === "processed" &&
      event.type === "payment.succeeded" &&
      !["paid", "refunding", "refunded"].includes(context.order.status)
    ) {
      issues.push(
        issue(
          "order_status_not_settled",
          "critical",
          "支付成功后订单尚未进入已支付或后续退款状态"
        )
      );
    }

    if (
      receipt.status === "processed" &&
      event.type === "refund.succeeded" &&
      context.order.status !== "refunded"
    ) {
      issues.push(
        issue(
          "refund_order_not_completed",
          "critical",
          "退款成功后订单尚未进入已退款状态"
        )
      );
    }

    if (
      receipt.status === "processed" &&
      event.type === "refund.succeeded" &&
      context.businessObjects.some(
        object =>
          object.domain === "counseling" &&
          object.status &&
          object.status !== "refunded"
      )
    ) {
      issues.push(
        issue(
          "refund_business_not_completed",
          "critical",
          "退款成功后关联咨询预约尚未进入已退款状态"
        )
      );
    }

    if (context.relatedOrder.exception) {
      issues.push(
        issue(
          "order_exception_open",
          context.relatedOrder.exception.severity,
          `订单存在开放异常：${context.relatedOrder.exception.reason}`
        )
      );
    }

    if (
      context.afterSalesRequests.some(request =>
        ["submitted", "reviewing", "linked_to_refund"].includes(request.status)
      )
    ) {
      issues.push(
        issue("after_sales_open", "warning", "该订单存在用户售后申请待处理")
      );
    }
  }

  if (workOrder?.status === "open") {
    issues.push(
      issue(
        "transaction_work_order_open",
        workOrder.severity,
        `交易存在开放异常工单：${workOrder.reason}`
      )
    );
  }

  return issues;
}

function severityFromIssues(issues: TransactionAdminIssue[]) {
  if (issues.some(item => item.severity === "critical")) return "critical";
  if (issues.length > 0) return "warning";
  return "ok";
}

function transactionItemFromReceipt(
  receipt: PaymentWebhookReceipt,
  context: OrderContext | undefined,
  workOrder: TransactionAdminWorkOrder | undefined
) {
  const snapshot = receiptToSnapshot(receipt);
  const issues = buildIssues(receipt, context, workOrder);
  const relatedOrder = context?.relatedOrder;

  return TransactionAdminListItemSchema.parse({
    id: snapshot.id,
    type: snapshot.type === "payment.succeeded" ? "payment" : "refund",
    eventType: snapshot.type,
    orderId: snapshot.orderId,
    channel: snapshot.channel,
    status: snapshot.status,
    amount: snapshot.amount,
    transactionId: snapshot.transactionId,
    occurredAt: snapshot.occurredAt,
    receivedAt: snapshot.receivedAt,
    processedAt: snapshot.processedAt,
    responseStatus: snapshot.responseStatus,
    errorMessage: snapshot.errorMessage,
    user: relatedOrder?.user,
    relatedOrder,
    businessObjects: context?.businessObjects ?? [],
    afterSalesRequests: context?.afterSalesRequests ?? [],
    itemTypes: relatedOrder?.itemTypes ?? [],
    primaryTitle:
      relatedOrder?.primaryTitle ?? `未匹配订单 ${snapshot.orderId}`,
    workOrder,
    severity: severityFromIssues(issues),
    issues,
  });
}

function datePart(value: string) {
  return value.slice(0, 10);
}

function matchesDateRange(
  item: TransactionAdminListItem,
  query: TransactionAdminListQuery
) {
  const occurredDate = datePart(item.occurredAt);
  if (query.fromDate && occurredDate < query.fromDate) return false;
  if (query.toDate && occurredDate > query.toDate) return false;
  return true;
}

function matchesQuery(
  item: TransactionAdminListItem,
  query: TransactionAdminListQuery
) {
  if (query.type !== "all" && item.type !== query.type) return false;
  if (query.channel !== "all" && item.channel !== query.channel) return false;
  if (query.status !== "all" && item.status !== query.status) return false;
  if (query.itemType !== "all" && !item.itemTypes.includes(query.itemType)) {
    return false;
  }
  if (!matchesDateRange(item, query)) return false;

  if (!query.keyword) return true;
  const keyword = query.keyword.toLowerCase();
  return [
    item.id,
    item.orderId,
    item.transactionId,
    item.primaryTitle,
    item.user?.id,
    item.user?.displayName,
    item.user?.phoneMasked,
    ...item.businessObjects.map(object => object.title),
    ...item.issues.map(itemIssue => itemIssue.message),
  ].some(value => value?.toLowerCase().includes(keyword));
}

function sortItems(
  items: TransactionAdminListItem[],
  sort: TransactionAdminListQuery["sort"]
) {
  return [...items].sort((a, b) => {
    if (sort === "received_desc") {
      return Date.parse(b.receivedAt) - Date.parse(a.receivedAt);
    }
    if (sort === "amount_desc") return b.amount - a.amount;
    return Date.parse(b.occurredAt) - Date.parse(a.occurredAt);
  });
}

function paginateItems(
  items: TransactionAdminListItem[],
  query: TransactionAdminListQuery
) {
  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / query.pageSize);
  const start = (query.page - 1) * query.pageSize;
  return {
    items: items.slice(start, start + query.pageSize),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages,
    },
  };
}

function buildSummary(items: TransactionAdminListItem[]) {
  const grossPaymentAmount = items
    .filter(item => item.type === "payment" && item.status === "processed")
    .reduce((total, item) => total + item.amount, 0);
  const refundAmount = items
    .filter(item => item.type === "refund" && item.status === "processed")
    .reduce((total, item) => total + item.amount, 0);

  return {
    totalCount: items.length,
    paymentCount: items.filter(item => item.type === "payment").length,
    refundCount: items.filter(item => item.type === "refund").length,
    processedCount: items.filter(item => item.status === "processed").length,
    failedCount: items.filter(item => item.status === "failed").length,
    processingCount: items.filter(item => item.status === "processing").length,
    warningCount: items.filter(item => item.severity === "warning").length,
    criticalCount: items.filter(item => item.severity === "critical").length,
    grossPaymentAmount,
    refundAmount,
    netAmount: grossPaymentAmount - refundAmount,
  };
}

function buildFilters(items: TransactionAdminListItem[]) {
  return {
    types: Array.from(new Set(items.map(item => item.type))).sort(),
    channels: Array.from(new Set(items.map(item => item.channel))).sort(),
    statuses: Array.from(new Set(items.map(item => item.status))).sort(),
    itemTypes: Array.from(
      new Set(items.flatMap(item => item.itemTypes))
    ).sort(),
  };
}

async function buildTransactionItems(
  store: PaymentWebhookEventStore = getPaymentWebhookEventStore(),
  operationStore: TransactionOperationStore = getTransactionOperationStore()
) {
  const [receipts, orderContexts, workOrders] = await Promise.all([
    listReceipts(store),
    buildOrderContextMap(),
    operationStore.listWorkOrders(),
  ]);
  const workOrdersByTransactionId = new Map(
    workOrders.map(workOrder => [workOrder.transactionId, workOrder])
  );

  return receipts.map(receipt =>
    transactionItemFromReceipt(
      receipt,
      orderContexts.get(receipt.orderId),
      workOrdersByTransactionId.get(receipt.id)
    )
  );
}

async function buildTransactionListResult(
  query: TransactionAdminListQuery,
  now: string,
  store: PaymentWebhookEventStore = getPaymentWebhookEventStore(),
  operationStore: TransactionOperationStore = getTransactionOperationStore()
): Promise<TransactionAdminListResult> {
  const items = await buildTransactionItems(store, operationStore);
  const filtered = items.filter(item => matchesQuery(item, query));
  const sorted = sortItems(filtered, query.sort);
  const page = paginateItems(sorted, query);

  return TransactionAdminListResultSchema.parse({
    items: page.items,
    meta: page.meta,
    summary: buildSummary(items),
    filters: buildFilters(items),
    query,
    serverTime: now,
  });
}

function timelineFromTransaction(
  item: TransactionAdminListItem
): TransactionAdminTimelineEvent[] {
  const events: TransactionAdminTimelineEvent[] = [
    {
      type: "webhook_received",
      label: "回调收据进入系统",
      occurredAt: item.receivedAt,
      detail: `${item.channel} · ${item.status}`,
    },
    {
      type: item.status === "failed" ? "webhook_failed" : "webhook_processed",
      label:
        item.status === "failed"
          ? "回调处理失败"
          : item.status === "processing"
            ? "等待回调处理完成"
            : "回调已完成处理",
      occurredAt: item.processedAt ?? item.receivedAt,
      detail:
        item.errorMessage ?? `响应状态 ${item.responseStatus ?? "未返回"}`,
    },
  ];

  if (item.relatedOrder) {
    events.push({
      type: "order_status",
      label: "关联订单状态",
      occurredAt: item.relatedOrder.paidAt ?? item.occurredAt,
      detail: `${item.relatedOrder.primaryTitle} · ${item.relatedOrder.status}`,
    });
  }

  for (const object of item.businessObjects) {
    if (!object.status) continue;
    events.push({
      type: "business_status",
      label: "业务对象状态",
      occurredAt: item.relatedOrder?.paidAt ?? item.occurredAt,
      detail: `${object.title} · ${object.status}`,
    });
  }

  if (item.relatedOrder?.exception) {
    events.push({
      type: "order_exception",
      label: "订单异常标记",
      occurredAt: item.relatedOrder.exception.markedAt,
      detail: item.relatedOrder.exception.reason,
    });
  }

  for (const request of item.afterSalesRequests) {
    events.push({
      type: "after_sales_request",
      label: "用户售后申请",
      occurredAt: request.createdAt,
      detail: `${request.status} · ${request.descriptionPreview}`,
    });
  }

  if (item.workOrder) {
    events.push({
      type: "transaction_work_order",
      label: "交易异常工单",
      occurredAt: item.workOrder.markedAt,
      detail: `${item.workOrder.status} · ${item.workOrder.reason}`,
    });
    if (item.workOrder.resolvedAt) {
      events.push({
        type: "transaction_work_order",
        label: "交易异常已处理",
        occurredAt: item.workOrder.resolvedAt,
        detail: item.workOrder.resolution,
      });
    }
  }

  return events.sort(
    (a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)
  );
}

function detailFromItem(
  item: TransactionAdminListItem,
  now: string,
  auditEvents: TransactionAdminMutationResult["auditEvents"] = []
): TransactionAdminDetail {
  return TransactionAdminDetailSchema.parse({
    transaction: item,
    relatedOrder: item.relatedOrder,
    businessObjects: item.businessObjects,
    timeline: timelineFromTransaction(item),
    receipt: receiptToSnapshot({
      id: item.id,
      eventType: item.eventType,
      orderId: item.orderId,
      channel: item.channel,
      status: item.status,
      eventPayload: {
        id: item.id,
        type: item.eventType,
        orderId: item.orderId,
        channel: item.channel,
        amount: item.amount,
        transactionId: item.transactionId,
        occurredAt: item.occurredAt,
      },
      responseStatus: item.responseStatus,
      errorMessage: item.errorMessage,
      receivedAt: item.receivedAt,
      processedAt: item.processedAt,
    }),
    afterSalesRequests: item.afterSalesRequests,
    auditEvents,
    privacyNotice:
      "交易后台仅展示对账、履约排障和客服核查所需信息，不展示咨询说明、测评答案和风险信号原文。",
    generatedAt: now,
  });
}

async function buildTransactionDetail(
  transactionId: string,
  now: string,
  store: PaymentWebhookEventStore = getPaymentWebhookEventStore(),
  operationStore: TransactionOperationStore = getTransactionOperationStore()
) {
  const item = (await buildTransactionItems(store, operationStore)).find(
    transaction => transaction.id === transactionId
  );
  if (!item) return undefined;
  const auditEvents = await operationStore.listAuditEvents(transactionId);
  return detailFromItem(item, now, auditEvents);
}

async function findOrderSource(orderId: string) {
  const sources = await listOrderSources();
  for (const source of sources) {
    const order = source.state.orders.find(item => item.id === orderId);
    if (order) {
      return {
        userId: source.userId,
        state: source.state,
        order,
      };
    }
  }

  return undefined;
}

function auditSnapshot(
  order: Order | undefined,
  workOrder: TransactionAdminWorkOrder | undefined
): TransactionAdminAuditSnapshot {
  return {
    orderStatus: order?.status,
    workOrder,
  };
}

function refundProviderErrorMessage(error: unknown) {
  const message =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : "退款渠道受理失败，请稍后重试。";

  return message.slice(0, 240);
}

function buildTransactionAuditEvent({
  actor,
  item,
  request,
  before,
  nextOrder,
  afterWorkOrder,
  refundProviderResult,
  now,
}: {
  actor: TransactionAdminActor;
  item: TransactionAdminListItem;
  request: TransactionAdminActionRequest;
  before: TransactionAdminAuditSnapshot;
  nextOrder: Order | undefined;
  afterWorkOrder: TransactionAdminWorkOrder | undefined;
  refundProviderResult?: TransactionRefundProviderResult;
  now: string;
}) {
  return TransactionAdminAuditEventSchema.parse({
    id: `transaction_audit_${randomUUID()}`,
    transactionId: item.id,
    orderId: item.orderId,
    userId: nextOrder?.userId ?? item.relatedOrder?.user.id ?? "unknown_user",
    actorId: actor.id,
    actorRoles: actor.roles,
    action: request.action,
    reason: request.reason,
    before,
    after: auditSnapshot(nextOrder, afterWorkOrder),
    refundProviderResult,
    createdAt: now,
  });
}

function refundRequestConflict(
  item: TransactionAdminListItem,
  source: Awaited<ReturnType<typeof findOrderSource>> | undefined,
  request: TransactionAdminActionRequest
) {
  if (item.type !== "payment") {
    return "退款申请必须从支付流水发起。";
  }

  if (item.status !== "processed") {
    return "只有已处理成功的支付流水可以发起退款申请。";
  }

  if (!source || !item.relatedOrder) {
    return "未匹配业务订单，不能发起退款申请，请先标记异常工单。";
  }

  const linkedAfterSalesRequestId =
    request.action === "request_refund"
      ? request.afterSalesRequestId
      : undefined;
  if (linkedAfterSalesRequestId) {
    const afterSalesRequest = item.afterSalesRequests.find(
      current => current.id === linkedAfterSalesRequestId
    );
    if (!afterSalesRequest) {
      return "未找到与该流水关联的售后申请。";
    }
    if (!["submitted", "reviewing"].includes(afterSalesRequest.status)) {
      return "只有待处理或处理中的售后申请可以联动退款。";
    }
  }

  const blockingIssues = linkedAfterSalesRequestId
    ? item.issues.filter(issueItem => issueItem.code !== "after_sales_open")
    : item.issues;
  if (blockingIssues.length > 0) {
    return "存在未处理的交易异常，需完成核查后再发起退款。";
  }

  if (source.order.status === "refunding") {
    return "订单已处于退款中，请等待退款成功回调。";
  }

  if (source.order.status === "refunded") {
    return "订单已完成退款，不能重复申请。";
  }

  if (source.order.status !== "paid") {
    return "订单当前状态不支持退款申请。";
  }

  return undefined;
}

async function applyAdminTransactionAction({
  actor,
  transactionId,
  request,
  now,
  store,
  operationStore,
  refundProvider,
}: {
  actor: TransactionAdminActor;
  transactionId: string;
  request: TransactionAdminActionRequest;
  now: string;
  store: PaymentWebhookEventStore;
  operationStore: TransactionOperationStore;
  refundProvider: TransactionRefundProvider;
}) {
  const item = (await buildTransactionItems(store, operationStore)).find(
    transaction => transaction.id === transactionId
  );
  if (!item) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "交易流水不存在或暂未进入后台目录"),
    } as const;
  }

  const source = await findOrderSource(item.orderId);
  const beforeWorkOrder = await operationStore.getWorkOrder(transactionId);
  const before = auditSnapshot(source?.order, beforeWorkOrder);
  let nextOrder = source?.order;
  let afterWorkOrder = beforeWorkOrder;
  let refundProviderResult: TransactionRefundProviderResult | undefined;

  if (request.action === "request_refund") {
    const conflict = refundRequestConflict(item, source, request);
    if (conflict || !source) {
      return {
        status: 409,
        body: errorPayload(
          "CONFLICT",
          conflict ?? "订单当前状态不支持退款申请。"
        ),
      } as const;
    }

    try {
      refundProviderResult = TransactionRefundProviderResultSchema.parse(
        await refundProvider.requestRefund({
          transactionId,
          orderId: item.orderId,
          userId: source.order.userId,
          channel: item.channel,
          amount: item.amount,
          reason: request.reason,
          requestedBy: actor.id,
          requestedAt: now,
        })
      );
    } catch (error) {
      refundProviderResult = TransactionRefundProviderResultSchema.parse({
        provider: refundProvider.providerName ?? "manual",
        status: "failed",
        message: refundProviderErrorMessage(error),
        handledAt: now,
        retryable: true,
      });
    }

    if (refundProviderResult.status !== "accepted") {
      const auditEvent = buildTransactionAuditEvent({
        actor,
        item,
        request,
        before,
        nextOrder: source.order,
        afterWorkOrder,
        refundProviderResult,
        now,
      });
      await operationStore.appendAuditEvent(auditEvent);

      return {
        status: 409,
        body: errorPayload("CONFLICT", refundProviderResult.message),
      } as const;
    }

    try {
      nextOrder = requestOrderRefund(source.order);
    } catch {
      return {
        status: 409,
        body: errorPayload("CONFLICT", "订单当前状态不支持退款申请。"),
      } as const;
    }

    await saveCourseAccessState(
      source.userId,
      upsertCourseAccessOrder(source.state, nextOrder)
    );
  }

  if (request.action === "mark_exception") {
    if (beforeWorkOrder?.status === "open") {
      return {
        status: 409,
        body: errorPayload("CONFLICT", "该交易已有开放异常工单。"),
      } as const;
    }

    afterWorkOrder = TransactionAdminWorkOrderSchema.parse({
      id: `transaction_work_${randomUUID()}`,
      transactionId,
      orderId: item.orderId,
      status: "open",
      severity: request.severity,
      reason: request.reason,
      markedBy: actor.id,
      markedAt: now,
    });
    await operationStore.saveWorkOrder(afterWorkOrder);
  }

  if (request.action === "resolve_exception") {
    if (!beforeWorkOrder || beforeWorkOrder.status !== "open") {
      return {
        status: 409,
        body: errorPayload("CONFLICT", "当前交易没有开放异常工单。"),
      } as const;
    }

    afterWorkOrder = TransactionAdminWorkOrderSchema.parse({
      ...beforeWorkOrder,
      status: "resolved",
      resolvedBy: actor.id,
      resolvedAt: now,
      resolution: request.reason,
    });
    await operationStore.saveWorkOrder(afterWorkOrder);
  }

  const auditEvent = buildTransactionAuditEvent({
    actor,
    item,
    request,
    before,
    nextOrder,
    afterWorkOrder,
    refundProviderResult,
    now,
  });
  await operationStore.appendAuditEvent(auditEvent);

  const detail = await buildTransactionDetail(
    transactionId,
    now,
    store,
    operationStore
  );
  if (!detail) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "交易动作已保存但详情暂不可读"),
    } as const;
  }

  return {
    status: 200,
    body: TransactionAdminMutationResponseSchema.parse({
      ok: true,
      data: {
        detail,
        auditEvent,
        auditEvents: detail.auditEvents,
        serverTime: now,
      } satisfies TransactionAdminMutationResult,
    }),
  } as const;
}

export async function getAdminTransactionListPayload(
  actor: TransactionAdminActor | null | undefined,
  rawQuery: Record<string, unknown>,
  now = new Date().toISOString(),
  store: PaymentWebhookEventStore = getPaymentWebhookEventStore(),
  operationStore: TransactionOperationStore = getTransactionOperationStore()
) {
  const denied = denyUnauthorizedActor(actor);
  if (denied) return denied;

  const queryResult = TransactionAdminListQuerySchema.safeParse(rawQuery);
  if (!queryResult.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "交易流水查询参数不合法"),
    } as const;
  }

  return {
    status: 200,
    body: TransactionAdminListResponseSchema.parse({
      ok: true,
      data: await buildTransactionListResult(
        queryResult.data,
        now,
        store,
        operationStore
      ),
    }),
  } as const;
}

export async function getAdminTransactionDetailPayload(
  actor: TransactionAdminActor | null | undefined,
  transactionId: string,
  now = new Date().toISOString(),
  store: PaymentWebhookEventStore = getPaymentWebhookEventStore(),
  operationStore: TransactionOperationStore = getTransactionOperationStore()
) {
  const denied = denyUnauthorizedActor(actor);
  if (denied) return denied;

  const detail = await buildTransactionDetail(
    transactionId,
    now,
    store,
    operationStore
  );
  if (!detail) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "交易流水不存在或暂未进入后台目录"),
    } as const;
  }

  return {
    status: 200,
    body: TransactionAdminDetailResponseSchema.parse({
      ok: true,
      data: detail,
    }),
  } as const;
}

export async function updateAdminTransactionActionPayload(
  actor: TransactionAdminActor | null | undefined,
  transactionId: string,
  body: unknown,
  now = new Date().toISOString(),
  store: PaymentWebhookEventStore = getPaymentWebhookEventStore(),
  operationStore: TransactionOperationStore = getTransactionOperationStore(),
  refundProvider: TransactionRefundProvider = getTransactionRefundProvider()
) {
  const denied = denyUnauthorizedActor(
    actor,
    TRANSACTION_ADMIN_PERMISSIONS.operate
  );
  if (denied) return denied;

  const parsed = TransactionAdminActionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "交易操作参数不合法"),
    } as const;
  }

  return applyAdminTransactionAction({
    actor: actor as TransactionAdminActor,
    transactionId,
    request: parsed.data,
    now,
    store,
    operationStore,
    refundProvider,
  });
}

function queryFromExpress(req: Request) {
  return queryFromRecord(req.query as Record<string, unknown>);
}

function queryFromSearchParams(params: URLSearchParams) {
  return queryFromRecord(Object.fromEntries(params.entries()));
}

function queryFromRecord(record: Record<string, unknown>) {
  return {
    keyword: stringValue(record.keyword),
    type: stringValue(record.type),
    channel: stringValue(record.channel),
    status: stringValue(record.status),
    itemType: stringValue(record.itemType),
    fromDate: stringValue(record.fromDate),
    toDate: stringValue(record.toDate),
    sort: stringValue(record.sort),
    page: numberValue(record.page),
    pageSize: numberValue(record.pageSize),
  };
}

function stringValue(value: unknown) {
  if (Array.isArray(value)) return stringValue(value[0]);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown) {
  const raw = stringValue(value);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : raw;
}

export function registerTransactionAdminApi(app: Express) {
  app.get(
    "/api/transactions/admin/transactions",
    async (req: Request, res: Response) => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getAdminTransactionListPayload(
        session?.user,
        queryFromExpress(req)
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.get(
    "/api/transactions/admin/transactions/:transactionId",
    async (req: Request, res: Response) => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getAdminTransactionDetailPayload(
        session?.user,
        req.params.transactionId
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.patch(
    "/api/transactions/admin/transactions/:transactionId/actions",
    async (req: Request, res: Response) => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await updateAdminTransactionActionPayload(
        session?.user,
        req.params.transactionId,
        req.body
      );
      sendJson(res, payload.status, payload.body);
    }
  );
}

export function handleTransactionAdminApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  if (!req.url || !req.url.startsWith("/api/transactions/admin")) {
    return false;
  }

  const url = new URL(req.url, "http://localhost");

  if (
    req.method === "GET" &&
    url.pathname === "/api/transactions/admin/transactions"
  ) {
    void (async () => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getAdminTransactionListPayload(
        session?.user,
        queryFromSearchParams(url.searchParams)
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "交易流水读取失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "交易流水读取失败"));
    });
    return true;
  }

  const detailMatch = url.pathname.match(
    /^\/api\/transactions\/admin\/transactions\/([^/]+)$/
  );
  if (req.method === "GET" && detailMatch?.[1]) {
    void (async () => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getAdminTransactionDetailPayload(
        session?.user,
        decodeURIComponent(detailMatch[1])
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "交易详情读取失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "交易详情读取失败"));
    });
    return true;
  }

  const actionMatch = url.pathname.match(
    /^\/api\/transactions\/admin\/transactions\/([^/]+)\/actions$/
  );
  if (req.method === "PATCH" && actionMatch?.[1]) {
    void (async () => {
      const [session, body] = await Promise.all([
        getLoginSessionFromRequest(req),
        readRequestBody(req),
      ]);
      const payload = await updateAdminTransactionActionPayload(
        session?.user,
        decodeURIComponent(actionMatch[1]),
        body
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "交易操作失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "交易操作失败"));
    });
    return true;
  }

  sendJson(res, 404, errorPayload("NOT_FOUND", "交易后台接口不存在"));
  return true;
}
