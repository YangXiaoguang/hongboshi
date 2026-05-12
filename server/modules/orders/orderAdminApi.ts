import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import {
  ApiResponseSchema,
  CourseAccessStateSchema,
  ORDER_ADMIN_PERMISSIONS,
  OrderAdminDetailSchema,
  OrderAdminListItemSchema,
  OrderAdminListQuerySchema,
  OrderAdminListResultSchema,
  OrderAdminPaymentReceiptSummarySchema,
  userCan,
  type CourseAccessState,
  type LoginSession,
  type Order,
  type OrderAdminDetail,
  type OrderAdminListItem,
  type OrderAdminListQuery,
  type OrderAdminListResult,
  type OrderAdminPaymentReceiptSummary,
  type OrderAdminRelatedObject,
  type OrderAdminTimelineEvent,
  type OrderAdminUserSummary,
  type PurchasableType,
  type UserProfile,
} from "../../../shared/domain";
import {
  getLoginSessionFromRequest,
  listAuthUsers,
} from "../auth/authSessionApi";
import { listCourseAccessUserStates } from "../courses/courseAccessApi";
import {
  listCounselingAppointmentRecords,
  listCounselingAppointmentUserIds,
} from "../counseling/counselingApi";
import {
  getPaymentWebhookEventStore,
  type PaymentWebhookReceipt,
} from "../payments/paymentWebhookEventStore";

type OrderAdminActor = Pick<LoginSession["user"], "id" | "roles">;
type DirectoryProfile = OrderAdminUserSummary & {
  roles?: UserProfile["roles"];
};
type OrderProjection = {
  order: Order;
  user: OrderAdminUserSummary;
  paymentReceipts: OrderAdminPaymentReceiptSummary[];
  relatedObjects: OrderAdminRelatedObject[];
  timeline: OrderAdminTimelineEvent[];
};

const OrderAdminListResponseSchema = ApiResponseSchema(
  OrderAdminListResultSchema
);
const OrderAdminDetailResponseSchema = ApiResponseSchema(
  OrderAdminDetailSchema
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
    "u_demo_counseling_pending",
    {
      id: "u_demo_counseling_pending",
      displayName: "咨询预约用户",
      phoneMasked: "177****6401",
      roles: ["member"],
    },
  ],
]);

const fallbackCourseAccessUsers: Array<{
  userId: string;
  state: CourseAccessState;
}> = [
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

function denyUnauthorizedActor(actor: OrderAdminActor | null | undefined) {
  if (!actor) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", "请先登录后查看订单后台"),
    } as const;
  }

  if (!userCan(actor, ORDER_ADMIN_PERMISSIONS.read)) {
    return {
      status: 403,
      body: errorPayload("FORBIDDEN", "当前账号暂无订单后台读取权限"),
    } as const;
  }

  return undefined;
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

function receiptToSummary(
  receipt: PaymentWebhookReceipt
): OrderAdminPaymentReceiptSummary {
  return OrderAdminPaymentReceiptSummarySchema.parse({
    id: receipt.id,
    type: receipt.eventPayload.type,
    channel: receipt.eventPayload.channel,
    status: receipt.status,
    amount: receipt.eventPayload.amount,
    transactionId: receipt.eventPayload.transactionId,
    occurredAt: receipt.eventPayload.occurredAt,
    receivedAt: receipt.receivedAt,
    processedAt: receipt.processedAt,
    responseStatus: receipt.responseStatus,
    errorMessage: receipt.errorMessage,
  });
}

function sortReceipts(receipts: OrderAdminPaymentReceiptSummary[]) {
  return [...receipts].sort(
    (a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt)
  );
}

function timelineFromOrder({
  order,
  receipts,
  relatedObjects,
}: {
  order: Order;
  receipts: OrderAdminPaymentReceiptSummary[];
  relatedObjects: OrderAdminRelatedObject[];
}) {
  const events: OrderAdminTimelineEvent[] = [
    {
      type: "order_created",
      label: "订单创建",
      occurredAt: order.createdAt,
      detail: order.items[0]?.title,
    },
  ];

  if (order.paidAt) {
    events.push({
      type: "order_status",
      label: "订单已支付",
      occurredAt: order.paidAt,
      detail: `应付金额 ${order.payableAmount}`,
    });
  }

  for (const receipt of receipts) {
    events.push({
      type:
        receipt.type === "payment.succeeded"
          ? "payment_succeeded"
          : "refund_succeeded",
      label:
        receipt.type === "payment.succeeded" ? "支付回调成功" : "退款回调成功",
      occurredAt: receipt.occurredAt,
      detail: `${receipt.channel} · ${receipt.status}`,
    });
  }

  for (const relatedObject of relatedObjects) {
    if (!relatedObject.status) continue;
    events.push({
      type: "appointment_status",
      label: "关联对象状态",
      occurredAt: order.paidAt ?? order.createdAt,
      detail: `${relatedObject.title} · ${relatedObject.status}`,
    });
  }

  return events.sort(
    (a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)
  );
}

function relatedObjectsFromOrder(order: Order): OrderAdminRelatedObject[] {
  return order.items.map(item => ({
    type: item.type,
    targetId: item.targetId,
    title: item.title,
  }));
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

function listItemFromProjection(
  projection: OrderProjection
): OrderAdminListItem {
  const latestReceipt = projection.paymentReceipts[0];
  const relatedObjectStatus = projection.relatedObjects
    .map(object => object.status)
    .filter(Boolean)
    .join(" / ");

  return OrderAdminListItemSchema.parse({
    id: projection.order.id,
    user: projection.user,
    status: projection.order.status,
    itemTypes: itemTypes(projection.order),
    primaryTitle: primaryTitle(projection.order),
    itemCount: projection.order.items.length,
    payableAmount: projection.order.payableAmount,
    createdAt: projection.order.createdAt,
    paidAt: projection.order.paidAt,
    latestReceiptStatus: latestReceipt?.status,
    relatedObjectStatus: relatedObjectStatus || undefined,
  });
}

async function buildDirectoryProfiles(now: string) {
  const [authUsers, courseAccessUsers, counselingUserIds] = await Promise.all([
    listAuthUsers(),
    listCourseAccessUserStates(),
    listCounselingAppointmentUserIds(now),
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
  for (const userId of counselingUserIds) {
    if (!profiles.has(userId))
      profiles.set(userId, createSyntheticUser(userId));
  }

  return profiles;
}

async function buildCounselingRelationMap(userIds: string[], now: string) {
  const relationMap = new Map<string, OrderAdminRelatedObject>();
  await Promise.all(
    userIds.map(async userId => {
      const records = await listCounselingAppointmentRecords(userId, now);
      for (const record of records) {
        if (!record.appointment.orderId) continue;
        relationMap.set(record.appointment.orderId, {
          type: "counseling_session",
          targetId: record.appointment.id,
          title: `${record.counselor.name} 咨询服务`,
          status: record.appointment.status,
          counselorName: record.counselor.name,
        });
      }
    })
  );

  if (!relationMap.has("order_counseling_demo_pending")) {
    relationMap.set("order_counseling_demo_pending", {
      type: "counseling_session",
      targetId: "appointment_demo_pending",
      title: "林若安 咨询服务",
      status: "pending_payment",
      counselorName: "林若安",
    });
  }

  return relationMap;
}

function buildSummary(items: OrderAdminListItem[]) {
  return {
    totalCount: items.length,
    pendingPaymentCount: items.filter(item => item.status === "pending_payment")
      .length,
    paidCount: items.filter(item => item.status === "paid").length,
    refundingCount: items.filter(item => item.status === "refunding").length,
    refundedCount: items.filter(item => item.status === "refunded").length,
    payableAmount: items.reduce((total, item) => total + item.payableAmount, 0),
    paidAmount: items
      .filter(item => ["paid", "refunding", "refunded"].includes(item.status))
      .reduce((total, item) => total + item.payableAmount, 0),
  };
}

function buildFilters(items: OrderAdminListItem[]) {
  return {
    statuses: Array.from(new Set(items.map(item => item.status))).sort(),
    itemTypes: Array.from(
      new Set(items.flatMap(item => item.itemTypes))
    ).sort(),
  };
}

function matchesQuery(item: OrderAdminListItem, query: OrderAdminListQuery) {
  if (query.status !== "all" && item.status !== query.status) return false;
  if (query.itemType !== "all" && !item.itemTypes.includes(query.itemType)) {
    return false;
  }

  if (!query.keyword) return true;
  const keyword = query.keyword.toLowerCase();
  return [
    item.id,
    item.primaryTitle,
    item.user.id,
    item.user.displayName,
    item.user.phoneMasked,
    item.relatedObjectStatus,
  ].some(value => value?.toLowerCase().includes(keyword));
}

function sortItems(
  items: OrderAdminListItem[],
  sort: OrderAdminListQuery["sort"]
) {
  return [...items].sort((a, b) => {
    if (sort === "paid_desc") {
      return (
        Date.parse(b.paidAt ?? b.createdAt) -
        Date.parse(a.paidAt ?? a.createdAt)
      );
    }
    if (sort === "amount_desc") return b.payableAmount - a.payableAmount;
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
}

function paginateItems(
  items: OrderAdminListItem[],
  query: OrderAdminListQuery
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

async function buildOrderProjections(now: string): Promise<OrderProjection[]> {
  const [profiles, courseAccessUsers, receipts] = await Promise.all([
    buildDirectoryProfiles(now),
    listCourseAccessUserStates(),
    getPaymentWebhookEventStore().listRecent(100),
  ]);
  const sourceUsers = courseAccessUsers.some(
    item => item.state.orders.length > 0
  )
    ? courseAccessUsers
    : fallbackCourseAccessUsers;
  const relationMap = await buildCounselingRelationMap(
    Array.from(new Set(sourceUsers.map(item => item.userId))),
    now
  );
  const receiptsByOrderId = new Map<
    string,
    OrderAdminPaymentReceiptSummary[]
  >();
  for (const receipt of receipts) {
    const current = receiptsByOrderId.get(receipt.orderId) ?? [];
    receiptsByOrderId.set(receipt.orderId, [
      ...current,
      receiptToSummary(receipt),
    ]);
  }

  const projections: OrderProjection[] = [];
  for (const source of sourceUsers) {
    const user =
      profiles.get(source.userId) ?? createSyntheticUser(source.userId);
    for (const order of source.state.orders) {
      const paymentReceipts = sortReceipts(
        receiptsByOrderId.get(order.id) ?? []
      );
      const baseRelations = relatedObjectsFromOrder(order);
      const counselingRelation = relationMap.get(order.id);
      const relatedObjects = counselingRelation
        ? [
            counselingRelation,
            ...baseRelations.filter(
              object =>
                !(
                  object.type === "counseling_session" &&
                  object.targetId === counselingRelation.targetId
                )
            ),
          ]
        : baseRelations;
      projections.push({
        order,
        user,
        paymentReceipts,
        relatedObjects,
        timeline: timelineFromOrder({
          order,
          receipts: paymentReceipts,
          relatedObjects,
        }),
      });
    }
  }

  return projections;
}

async function buildOrderListResult(
  query: OrderAdminListQuery,
  now: string
): Promise<OrderAdminListResult> {
  const projections = await buildOrderProjections(now);
  const listItems = projections.map(listItemFromProjection);
  const filtered = listItems.filter(item => matchesQuery(item, query));
  const sorted = sortItems(filtered, query.sort);
  const page = paginateItems(sorted, query);

  return OrderAdminListResultSchema.parse({
    items: page.items,
    meta: page.meta,
    summary: buildSummary(listItems),
    filters: buildFilters(listItems),
    query,
    serverTime: now,
  });
}

async function buildOrderDetail(
  orderId: string,
  now: string
): Promise<OrderAdminDetail | undefined> {
  const projection = (await buildOrderProjections(now)).find(
    item => item.order.id === orderId
  );
  if (!projection) return undefined;

  return OrderAdminDetailSchema.parse({
    order: listItemFromProjection(projection),
    items: projection.order.items,
    subtotal: projection.order.subtotal,
    discountAmount: projection.order.discountAmount,
    payableAmount: projection.order.payableAmount,
    paymentReceipts: projection.paymentReceipts,
    relatedObjects: projection.relatedObjects,
    timeline: projection.timeline,
    privacyNotice:
      "订单后台仅展示履约和对账所需信息：用户身份使用脱敏摘要，不展示咨询说明、测评答案和风险信号原文。",
    generatedAt: now,
  });
}

export async function getAdminOrderListPayload(
  actor: OrderAdminActor | null | undefined,
  rawQuery: Record<string, unknown>,
  now = new Date().toISOString()
) {
  const denied = denyUnauthorizedActor(actor);
  if (denied) return denied;

  const queryResult = OrderAdminListQuerySchema.safeParse(rawQuery);
  if (!queryResult.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "订单查询参数不合法"),
    } as const;
  }

  return {
    status: 200,
    body: OrderAdminListResponseSchema.parse({
      ok: true,
      data: await buildOrderListResult(queryResult.data, now),
    }),
  } as const;
}

export async function getAdminOrderDetailPayload(
  actor: OrderAdminActor | null | undefined,
  orderId: string,
  now = new Date().toISOString()
) {
  const denied = denyUnauthorizedActor(actor);
  if (denied) return denied;

  const detail = await buildOrderDetail(orderId, now);
  if (!detail) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "订单不存在或暂未进入后台目录"),
    } as const;
  }

  return {
    status: 200,
    body: OrderAdminDetailResponseSchema.parse({
      ok: true,
      data: detail,
    }),
  } as const;
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
    status: stringValue(record.status),
    itemType: stringValue(record.itemType),
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

export function registerOrderAdminApi(app: Express) {
  app.get("/api/orders/admin/orders", async (req: Request, res: Response) => {
    const session = await getLoginSessionFromRequest(req);
    const payload = await getAdminOrderListPayload(
      session?.user,
      queryFromExpress(req)
    );
    sendJson(res, payload.status, payload.body);
  });

  app.get(
    "/api/orders/admin/orders/:orderId",
    async (req: Request, res: Response) => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getAdminOrderDetailPayload(
        session?.user,
        req.params.orderId
      );
      sendJson(res, payload.status, payload.body);
    }
  );
}

export function handleOrderAdminApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  if (!req.url || !req.url.startsWith("/api/orders/admin")) return false;

  const url = new URL(req.url, "http://localhost");

  if (req.method === "GET" && url.pathname === "/api/orders/admin/orders") {
    void (async () => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getAdminOrderListPayload(
        session?.user,
        queryFromSearchParams(url.searchParams)
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "订单列表读取失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "订单列表读取失败"));
    });
    return true;
  }

  const detailMatch = url.pathname.match(
    /^\/api\/orders\/admin\/orders\/([^/]+)$/
  );
  if (req.method === "GET" && detailMatch?.[1]) {
    void (async () => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getAdminOrderDetailPayload(
        session?.user,
        decodeURIComponent(detailMatch[1])
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "订单详情读取失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "订单详情读取失败"));
    });
    return true;
  }

  sendJson(res, 404, errorPayload("NOT_FOUND", "订单后台接口不存在"));
  return true;
}
