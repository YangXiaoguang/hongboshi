import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import {
  ALL_FINANCE_ADMIN_CHANNEL,
  ALL_FINANCE_ADMIN_ITEM_TYPE,
  ApiResponseSchema,
  FINANCE_ADMIN_PERMISSIONS,
  FINANCE_ADMIN_EXPORT_FIELDS,
  FINANCE_ADMIN_EXPORT_POLICY_VERSION,
  FinanceAdminEntrySchema,
  FinanceAdminExportQuerySchema,
  FinanceAdminExportSchema,
  FinanceAdminOverviewSchema,
  FinanceAdminQuerySchema,
  userCan,
  type CourseAccessState,
  type FinanceAdminEntry,
  type FinanceAdminExport,
  type FinanceAdminExportQuery,
  type FinanceAdminExportRow,
  type FinanceAdminOverview,
  type FinanceAdminQuery,
  type LoginSession,
  type Order,
  type OrderAdminUserSummary,
  type PaymentChannel,
  type PurchasableType,
  type UserProfile,
} from "../../../shared/domain";
import {
  getLoginSessionFromRequest,
  listAuthUsers,
} from "../auth/authSessionApi";
import { listCourseAccessUserStates } from "../courses/courseAccessApi";
import { getCounselingPaymentOrderSnapshot } from "../counseling/counselingApi";
import {
  getPaymentWebhookEventStore,
  type PaymentWebhookEventStore,
  type PaymentWebhookReceipt,
} from "../payments/paymentWebhookEventStore";
import {
  getTransactionOperationStore,
  type TransactionOperationStore,
} from "../transactions/transactionOperationStore";

type FinanceAdminActor = Pick<LoginSession["user"], "id" | "roles">;
type DirectoryProfile = OrderAdminUserSummary & {
  roles?: UserProfile["roles"];
};
type OrderIndexItem = {
  order: Order;
  userId: string;
};
type FinanceAdminFilterQuery = Pick<
  FinanceAdminQuery,
  "keyword" | "channel" | "itemType" | "fromDate" | "toDate" | "sort"
>;

const FinanceAdminOverviewResponseSchema = ApiResponseSchema(
  FinanceAdminOverviewSchema
);
const FINANCE_ADMIN_CSV_CONTENT_TYPE = "text/csv; charset=utf-8" as const;

const itemTypeCopy = {
  course: "课程",
  membership: "会员",
  counseling_session: "咨询",
  assessment_report: "测评",
} satisfies Record<PurchasableType, string>;

const channelCopy = {
  wechat_pay: "微信支付",
  alipay: "支付宝",
  manual: "人工模拟",
} satisfies Record<PaymentChannel, string>;

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

const financePolicies = [
  {
    key: "gross_revenue",
    label: "收入",
    description: "已处理的 payment.succeeded 按回调金额计入收入。",
  },
  {
    key: "refund",
    label: "退款",
    description: "已处理的 refund.succeeded 按回调金额计入退款。",
  },
  {
    key: "pending_refund",
    label: "退款中",
    description: "订单处于 refunding 时计入待退款，不扣减实收。",
  },
  {
    key: "exception",
    label: "异常",
    description: "失败、处理中回调和开放交易工单只进入异常提示。",
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

function sendCsv(
  res: Response | ServerResponse,
  status: number,
  payload: FinanceAdminExport
) {
  res.statusCode = status;
  res.setHeader("Content-Type", payload.contentType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${payload.filename}"`
  );
  res.setHeader("X-Hongboshi-Finance-Export-Id", payload.metadata.exportId);
  res.end(`\uFEFF${payload.csv}`);
}

function errorPayload(
  code: "BAD_REQUEST" | "UNAUTHORIZED" | "FORBIDDEN" | "INTERNAL_ERROR",
  message: string
) {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  };
}

function profileForUser(
  userId: string,
  profiles: Map<string, DirectoryProfile>
): OrderAdminUserSummary {
  const profile = profiles.get(userId) ?? fallbackProfiles.get(userId);
  return {
    id: userId,
    displayName: profile?.displayName ?? `用户 ${userId}`,
    phoneMasked: profile?.phoneMasked,
  };
}

function buildDirectoryProfiles(users: UserProfile[]) {
  return new Map<string, DirectoryProfile>(
    users.map(user => [
      user.id,
      {
        id: user.id,
        displayName: user.displayName,
        phoneMasked: user.phoneMasked,
        roles: user.roles,
      },
    ])
  );
}

function orderPrimaryTitle(order: Order | undefined, fallback: string) {
  return order?.items[0]?.title ?? fallback;
}

function orderItemTypes(order: Order | undefined, fallback: PurchasableType) {
  return order
    ? Array.from(new Set(order.items.map(item => item.type)))
    : [fallback];
}

function orderIndexFromStates(
  states: Array<{ userId: string; state: CourseAccessState }>
) {
  const index = new Map<string, OrderIndexItem>();
  for (const source of states) {
    for (const order of source.state.orders) {
      index.set(order.id, {
        order,
        userId: source.userId,
      });
    }
  }
  return index;
}

function receiptOccurredAt(receipt: PaymentWebhookReceipt) {
  return receipt.eventPayload.occurredAt ?? receipt.receivedAt;
}

function compareDate(value: string, fromDate?: string, toDate?: string) {
  const time = Date.parse(value);
  if (Number.isNaN(time)) return false;
  if (fromDate && time < Date.parse(`${fromDate}T00:00:00.000Z`)) return false;
  if (toDate && time > Date.parse(`${toDate}T23:59:59.999Z`)) return false;
  return true;
}

async function entryFromReceipt({
  receipt,
  orderIndex,
  profiles,
}: {
  receipt: PaymentWebhookReceipt;
  orderIndex: Map<string, OrderIndexItem>;
  profiles: Map<string, DirectoryProfile>;
}): Promise<FinanceAdminEntry> {
  const event = receipt.eventPayload;
  const indexed = orderIndex.get(receipt.orderId);
  const counselingSnapshot = indexed
    ? undefined
    : await getCounselingPaymentOrderSnapshot(receipt.orderId);
  const userId =
    indexed?.order.userId ?? counselingSnapshot?.userId ?? "unknown_user";
  const fallbackType: PurchasableType =
    counselingSnapshot?.domain === "counseling"
      ? "counseling_session"
      : "course";
  const isProcessed = receipt.status === "processed";
  const isPayment = event.type === "payment.succeeded";
  const type = isProcessed ? (isPayment ? "payment" : "refund") : "exception";

  return FinanceAdminEntrySchema.parse({
    id: `finance_${receipt.id}`,
    type,
    orderId: receipt.orderId,
    user: profileForUser(userId, profiles),
    primaryTitle: orderPrimaryTitle(indexed?.order, itemTypeCopy[fallbackType]),
    itemTypes: orderItemTypes(indexed?.order, fallbackType),
    channel: event.channel,
    amount: event.amount,
    occurredAt: receiptOccurredAt(receipt),
    sourceStatus: receipt.status,
    transactionId: event.transactionId,
    receiptId: receipt.id,
    reason: isProcessed
      ? isPayment
        ? "支付成功回调已处理"
        : "退款成功回调已处理"
      : (receipt.errorMessage ?? "回调尚未完成处理"),
    severity: isProcessed
      ? "ok"
      : receipt.status === "failed"
        ? "critical"
        : "warning",
  });
}

function latestProcessedPaymentByOrder(receipts: PaymentWebhookReceipt[]) {
  const payments = new Map<string, PaymentWebhookReceipt>();
  for (const receipt of receipts) {
    if (
      receipt.status !== "processed" ||
      receipt.eventPayload.type !== "payment.succeeded"
    ) {
      continue;
    }
    const current = payments.get(receipt.orderId);
    if (
      !current ||
      Date.parse(receiptOccurredAt(receipt)) >
        Date.parse(receiptOccurredAt(current))
    ) {
      payments.set(receipt.orderId, receipt);
    }
  }
  return payments;
}

function refundedOrderIds(receipts: PaymentWebhookReceipt[]) {
  return new Set(
    receipts
      .filter(
        receipt =>
          receipt.status === "processed" &&
          receipt.eventPayload.type === "refund.succeeded"
      )
      .map(receipt => receipt.orderId)
  );
}

function pendingRefundEntries({
  orderIndex,
  profiles,
  receipts,
}: {
  orderIndex: Map<string, OrderIndexItem>;
  profiles: Map<string, DirectoryProfile>;
  receipts: PaymentWebhookReceipt[];
}) {
  const processedRefunds = refundedOrderIds(receipts);
  const payments = latestProcessedPaymentByOrder(receipts);
  const entries: FinanceAdminEntry[] = [];

  for (const { order } of Array.from(orderIndex.values())) {
    if (order.status !== "refunding" || processedRefunds.has(order.id)) {
      continue;
    }
    const payment = payments.get(order.id);
    entries.push(
      FinanceAdminEntrySchema.parse({
        id: `finance_pending_refund_${order.id}`,
        type: "pending_refund",
        orderId: order.id,
        user: profileForUser(order.userId, profiles),
        primaryTitle: orderPrimaryTitle(order, "待退款订单"),
        itemTypes: orderItemTypes(order, "course"),
        channel: payment?.eventPayload.channel,
        amount: order.payableAmount,
        occurredAt: order.paidAt ?? order.createdAt,
        sourceStatus: order.status,
        transactionId: payment?.eventPayload.transactionId,
        receiptId: payment?.id,
        reason: "订单已进入退款中，等待退款成功回调",
        severity: "warning",
      })
    );
  }

  return entries;
}

function workOrderExceptionEntries({
  workOrders,
  orderIndex,
  profiles,
  receipts,
}: {
  workOrders: Awaited<ReturnType<TransactionOperationStore["listWorkOrders"]>>;
  orderIndex: Map<string, OrderIndexItem>;
  profiles: Map<string, DirectoryProfile>;
  receipts: PaymentWebhookReceipt[];
}) {
  const receiptOrderIds = new Set(
    receipts
      .filter(receipt => receipt.status !== "processed")
      .map(receipt => receipt.orderId)
  );
  const payments = latestProcessedPaymentByOrder(receipts);

  return workOrders
    .filter(workOrder => workOrder.status === "open")
    .filter(workOrder => !receiptOrderIds.has(workOrder.orderId))
    .map(workOrder => {
      const indexed = orderIndex.get(workOrder.orderId);
      const order = indexed?.order;
      const payment = payments.get(workOrder.orderId);
      return FinanceAdminEntrySchema.parse({
        id: `finance_work_order_${workOrder.id}`,
        type: "exception",
        orderId: workOrder.orderId,
        user: profileForUser(
          order?.userId ?? indexed?.userId ?? "unknown_user",
          profiles
        ),
        primaryTitle: orderPrimaryTitle(order, "交易异常工单"),
        itemTypes: orderItemTypes(order, "course"),
        channel: payment?.eventPayload.channel,
        amount: order?.payableAmount ?? payment?.eventPayload.amount ?? 0,
        occurredAt: workOrder.markedAt,
        sourceStatus: workOrder.status,
        transactionId: payment?.eventPayload.transactionId,
        receiptId: payment?.id,
        reason: workOrder.reason,
        severity: workOrder.severity,
      });
    });
}

function fallbackFinanceEntries(now: string) {
  return [
    {
      id: "finance_demo_payment_membership",
      type: "payment",
      orderId: "order_demo_membership_1",
      user: profileForUser("u_demo_active_member", new Map()),
      primaryTitle: "成长会员年卡",
      itemTypes: ["membership"],
      channel: "manual",
      amount: 399,
      occurredAt: "2026-05-01T09:12:00+08:00",
      sourceStatus: "processed",
      transactionId: "manual_order_demo_membership_1",
      receiptId: "evt_payment_order_demo_membership_1",
      reason: "支付成功回调已处理",
      severity: "ok",
    },
    {
      id: "finance_demo_payment_course",
      type: "payment",
      orderId: "order_demo_course_3",
      user: profileForUser("u_demo_course_buyer", new Map()),
      primaryTitle: "亲密关系沟通课",
      itemTypes: ["course"],
      channel: "manual",
      amount: 179,
      occurredAt: "2026-05-10T18:06:00+08:00",
      sourceStatus: "processed",
      transactionId: "manual_order_demo_course_3",
      receiptId: "evt_payment_order_demo_course_3",
      reason: "支付成功回调已处理",
      severity: "ok",
    },
    {
      id: "finance_demo_refund_course",
      type: "refund",
      orderId: "order_demo_refund_course_2",
      user: profileForUser("u_demo_refund_course", new Map()),
      primaryTitle: "睡眠修复训练营",
      itemTypes: ["course"],
      channel: "manual",
      amount: 299,
      occurredAt: "2026-05-09T09:12:00+08:00",
      sourceStatus: "processed",
      transactionId: "refund_order_demo_refund_course_2",
      receiptId: "evt_refund_order_demo_refund_course_2",
      reason: "退款成功回调已处理",
      severity: "ok",
    },
    {
      id: "finance_demo_pending_refund",
      type: "pending_refund",
      orderId: "order_counseling_demo_refunding",
      user: profileForUser("u_demo_counseling_pending", new Map()),
      primaryTitle: "林若安 咨询服务",
      itemTypes: ["counseling_session"],
      channel: "manual",
      amount: 399,
      occurredAt: now,
      sourceStatus: "refunding",
      reason: "订单已进入退款中，等待退款成功回调",
      severity: "warning",
    },
    {
      id: "finance_demo_exception",
      type: "exception",
      orderId: "order_demo_course_failed",
      user: profileForUser("u_demo_course_buyer", new Map()),
      primaryTitle: "亲密关系沟通课",
      itemTypes: ["course"],
      channel: "manual",
      amount: 199,
      occurredAt: "2026-05-11T14:05:00+08:00",
      sourceStatus: "failed",
      transactionId: "manual_order_demo_course_failed",
      receiptId: "evt_payment_order_demo_course_failed",
      reason: "回调处理失败，需交易台复核",
      severity: "critical",
    },
  ].map(entry => FinanceAdminEntrySchema.parse(entry));
}

function entryMatchesKeyword(entry: FinanceAdminEntry, keyword: string) {
  if (!keyword) return true;
  const normalized = keyword.toLowerCase();
  return [
    entry.id,
    entry.orderId,
    entry.primaryTitle,
    entry.transactionId,
    entry.receiptId,
    entry.user.id,
    entry.user.displayName,
    entry.user.phoneMasked,
  ].some(value => value?.toLowerCase().includes(normalized));
}

function filterEntries(
  entries: FinanceAdminEntry[],
  query: FinanceAdminFilterQuery
) {
  return entries.filter(entry => {
    if (!entryMatchesKeyword(entry, query.keyword)) return false;
    if (
      query.channel !== ALL_FINANCE_ADMIN_CHANNEL &&
      entry.channel !== query.channel
    ) {
      return false;
    }
    if (
      query.itemType !== ALL_FINANCE_ADMIN_ITEM_TYPE &&
      !entry.itemTypes.includes(query.itemType)
    ) {
      return false;
    }
    return compareDate(entry.occurredAt, query.fromDate, query.toDate);
  });
}

function sortEntries(
  entries: FinanceAdminEntry[],
  sort: FinanceAdminFilterQuery["sort"]
) {
  return [...entries].sort((a, b) => {
    if (sort === "amount_desc") return b.amount - a.amount;
    return Date.parse(b.occurredAt) - Date.parse(a.occurredAt);
  });
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  return items.slice((page - 1) * pageSize, page * pageSize);
}

function buildSummary(entries: FinanceAdminEntry[]) {
  const grossRevenueAmount = entries
    .filter(entry => entry.type === "payment")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const refundAmount = entries
    .filter(entry => entry.type === "refund")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const pendingRefundAmount = entries
    .filter(entry => entry.type === "pending_refund")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const exceptionAmount = entries
    .filter(entry => entry.type === "exception")
    .reduce((sum, entry) => sum + entry.amount, 0);

  return {
    entryCount: entries.length,
    paymentCount: entries.filter(entry => entry.type === "payment").length,
    refundCount: entries.filter(entry => entry.type === "refund").length,
    pendingRefundCount: entries.filter(entry => entry.type === "pending_refund")
      .length,
    exceptionCount: entries.filter(entry => entry.type === "exception").length,
    grossRevenueAmount,
    refundAmount,
    netRevenueAmount: grossRevenueAmount - refundAmount,
    pendingRefundAmount,
    exceptionAmount,
  };
}

function buildChannelBreakdown(entries: FinanceAdminEntry[]) {
  const channels = new Map<PaymentChannel, { amount: number; count: number }>();
  for (const entry of entries) {
    if (
      !entry.channel ||
      entry.type === "pending_refund" ||
      entry.type === "exception"
    ) {
      continue;
    }
    const current = channels.get(entry.channel) ?? { amount: 0, count: 0 };
    channels.set(entry.channel, {
      amount:
        current.amount +
        (entry.type === "refund" ? -entry.amount : entry.amount),
      count: current.count + 1,
    });
  }
  return Array.from(channels.entries()).map(([channel, value]) => ({
    channel,
    label: channelCopy[channel],
    amount: value.amount,
    count: value.count,
  }));
}

function buildItemTypeBreakdown(entries: FinanceAdminEntry[]) {
  const itemTypes = new Map<
    PurchasableType,
    { amount: number; count: number }
  >();
  for (const entry of entries) {
    if (entry.type === "pending_refund" || entry.type === "exception") continue;
    for (const itemType of entry.itemTypes) {
      const current = itemTypes.get(itemType) ?? { amount: 0, count: 0 };
      itemTypes.set(itemType, {
        amount:
          current.amount +
          (entry.type === "refund" ? -entry.amount : entry.amount),
        count: current.count + 1,
      });
    }
  }
  return Array.from(itemTypes.entries()).map(([itemType, value]) => ({
    itemType,
    label: itemTypeCopy[itemType],
    amount: value.amount,
    count: value.count,
  }));
}

function buildFilterOptions(entries: FinanceAdminEntry[]) {
  return {
    channels: Array.from(
      new Set(entries.flatMap(entry => (entry.channel ? [entry.channel] : [])))
    ),
    itemTypes: Array.from(new Set(entries.flatMap(entry => entry.itemTypes))),
  };
}

function metaFor(total: number, page: number, pageSize: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

async function collectFinanceEntries(
  now: string,
  paymentStore: PaymentWebhookEventStore,
  operationStore: TransactionOperationStore
): Promise<FinanceAdminEntry[]> {
  const [users, sources, receipts, workOrders] = await Promise.all([
    listAuthUsers(),
    listCourseAccessUserStates(),
    paymentStore.listRecent(100),
    operationStore.listWorkOrders(),
  ]);
  const profiles = buildDirectoryProfiles(users);
  const orderIndex = orderIndexFromStates(sources);
  const receiptEntries = await Promise.all(
    receipts.map(receipt =>
      entryFromReceipt({
        receipt,
        orderIndex,
        profiles,
      })
    )
  );
  const entries = [
    ...receiptEntries,
    ...pendingRefundEntries({ orderIndex, profiles, receipts }),
    ...workOrderExceptionEntries({
      workOrders,
      orderIndex,
      profiles,
      receipts,
    }),
  ];
  return entries.length ? entries : fallbackFinanceEntries(now);
}

function sortedFinanceEntries(
  sourceEntries: FinanceAdminEntry[],
  query: FinanceAdminFilterQuery
) {
  const filtered = filterEntries(sourceEntries, query);
  return {
    filtered,
    sorted: sortEntries(filtered, query.sort),
  };
}

async function buildFinanceOverview(
  query: FinanceAdminQuery,
  now: string,
  paymentStore: PaymentWebhookEventStore,
  operationStore: TransactionOperationStore
): Promise<FinanceAdminOverview> {
  const sourceEntries = await collectFinanceEntries(
    now,
    paymentStore,
    operationStore
  );
  const { filtered, sorted } = sortedFinanceEntries(sourceEntries, query);
  const pageItems = paginate(sorted, query.page, query.pageSize);

  return FinanceAdminOverviewSchema.parse({
    items: pageItems,
    meta: metaFor(filtered.length, query.page, query.pageSize),
    summary: buildSummary(filtered),
    channelBreakdown: buildChannelBreakdown(filtered),
    itemTypeBreakdown: buildItemTypeBreakdown(filtered),
    policies: financePolicies,
    filters: buildFilterOptions(sourceEntries),
    query,
    serverTime: now,
  });
}

function accountingPeriodFromDateTime(value: string) {
  const match = value.match(/^(\d{4}-\d{2})/);
  return match?.[1] ?? new Date(value).toISOString().slice(0, 7);
}

function exportRowFromEntry(entry: FinanceAdminEntry): FinanceAdminExportRow {
  return {
    occurredAt: entry.occurredAt,
    entryType: entry.type,
    orderId: entry.orderId,
    userId: entry.user.id,
    userDisplayName: entry.user.displayName,
    userPhoneMasked: entry.user.phoneMasked,
    itemTypes: entry.itemTypes,
    primaryTitle: entry.primaryTitle,
    channel: entry.channel,
    amount: entry.amount,
    sourceStatus: entry.sourceStatus,
    severity: entry.severity,
    transactionId: entry.transactionId,
    receiptId: entry.receiptId,
    reason: entry.reason,
    accountingPeriod: accountingPeriodFromDateTime(entry.occurredAt),
    feeAmount: 0,
    settlementBatchId: "",
    invoiceStatus: "not_requested",
  };
}

function csvCell(value: unknown) {
  const raw = Array.isArray(value) ? value.join(" / ") : String(value ?? "");
  const normalized = raw.replace(/\r?\n/g, " ");
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function csvLine(values: unknown[]) {
  return values.map(csvCell).join(",");
}

function metadataRows(metadata: FinanceAdminExport["metadata"]) {
  return [
    ["metadata_key", "metadata_value"],
    ["exportId", metadata.exportId],
    ["generatedAt", metadata.generatedAt],
    ["generatedBy", metadata.generatedBy.id],
    ["policyVersion", metadata.policyVersion],
    ["query", JSON.stringify(metadata.query)],
    ["rowCount", metadata.rowCount],
    ["grossRevenueAmount", metadata.summary.grossRevenueAmount],
    ["refundAmount", metadata.summary.refundAmount],
    ["netRevenueAmount", metadata.summary.netRevenueAmount],
    ["pendingRefundAmount", metadata.summary.pendingRefundAmount],
    ["exceptionAmount", metadata.summary.exceptionAmount],
  ];
}

function valueForExportField(
  row: FinanceAdminExportRow,
  key: FinanceAdminExport["metadata"]["fields"][number]["key"]
) {
  return row[key];
}

function csvFromExport(
  metadata: FinanceAdminExport["metadata"],
  rows: FinanceAdminExportRow[]
) {
  const lines = [
    ...metadataRows(metadata).map(csvLine),
    "",
    csvLine(metadata.fields.map(field => field.label)),
    ...rows.map(row =>
      csvLine(metadata.fields.map(field => valueForExportField(row, field.key)))
    ),
  ];
  return lines.join("\n");
}

function exportIdFromNow(now: string) {
  return `finance_export_${now.replace(/\D/g, "").slice(0, 17)}`;
}

function filenameFromNow(now: string) {
  return `hongboshi-finance-${now.replace(/\D/g, "").slice(0, 14)}.csv`;
}

async function buildFinanceExport(
  actor: FinanceAdminActor,
  query: FinanceAdminExportQuery,
  now: string,
  paymentStore: PaymentWebhookEventStore,
  operationStore: TransactionOperationStore
): Promise<FinanceAdminExport> {
  const sourceEntries = await collectFinanceEntries(
    now,
    paymentStore,
    operationStore
  );
  const { filtered, sorted } = sortedFinanceEntries(sourceEntries, query);
  const rows = sorted.map(exportRowFromEntry);
  const filename = filenameFromNow(now);
  const metadata = {
    exportId: exportIdFromNow(now),
    format: "csv",
    filename,
    generatedAt: now,
    generatedBy: {
      id: actor.id,
      roles: [...actor.roles],
    },
    query,
    summary: buildSummary(filtered),
    rowCount: rows.length,
    policyVersion: FINANCE_ADMIN_EXPORT_POLICY_VERSION,
    fields: FINANCE_ADMIN_EXPORT_FIELDS.map(field => ({
      ...field,
      reserved: Boolean("reserved" in field && field.reserved),
    })),
  } satisfies FinanceAdminExport["metadata"];
  const csv = csvFromExport(metadata, rows);

  return FinanceAdminExportSchema.parse({
    metadata,
    rows,
    csv,
    filename,
    contentType: FINANCE_ADMIN_CSV_CONTENT_TYPE,
  });
}

function queryFromRecord(record: Record<string, unknown>) {
  return {
    keyword: stringValue(record.keyword),
    channel: stringValue(record.channel),
    itemType: stringValue(record.itemType),
    fromDate: stringValue(record.fromDate),
    toDate: stringValue(record.toDate),
    sort: stringValue(record.sort),
    page: numberValue(record.page),
    pageSize: numberValue(record.pageSize),
  };
}

function queryFromExpress(req: Request) {
  return queryFromRecord(req.query as Record<string, unknown>);
}

function queryFromSearchParams(params: URLSearchParams) {
  return queryFromRecord(Object.fromEntries(params.entries()));
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

export async function getFinanceAdminOverviewPayload(
  actor: FinanceAdminActor | null | undefined,
  rawQuery: Record<string, unknown>,
  now = new Date().toISOString(),
  paymentStore: PaymentWebhookEventStore = getPaymentWebhookEventStore(),
  operationStore: TransactionOperationStore = getTransactionOperationStore()
) {
  if (!actor) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", "请先登录后查看财务管理"),
    } as const;
  }

  if (!userCan(actor, FINANCE_ADMIN_PERMISSIONS.read)) {
    return {
      status: 403,
      body: errorPayload("FORBIDDEN", "当前账号暂无财务管理读取权限"),
    } as const;
  }

  const query = FinanceAdminQuerySchema.safeParse(rawQuery);
  if (!query.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "财务查询参数不合法"),
    } as const;
  }

  return {
    status: 200,
    body: FinanceAdminOverviewResponseSchema.parse({
      ok: true,
      data: await buildFinanceOverview(
        query.data,
        now,
        paymentStore,
        operationStore
      ),
    }),
  } as const;
}

export async function getFinanceAdminExportPayload(
  actor: FinanceAdminActor | null | undefined,
  rawQuery: Record<string, unknown>,
  now = new Date().toISOString(),
  paymentStore: PaymentWebhookEventStore = getPaymentWebhookEventStore(),
  operationStore: TransactionOperationStore = getTransactionOperationStore()
) {
  if (!actor) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", "请先登录后导出财务数据"),
    } as const;
  }

  if (!userCan(actor, FINANCE_ADMIN_PERMISSIONS.read)) {
    return {
      status: 403,
      body: errorPayload("FORBIDDEN", "当前账号暂无财务管理导出权限"),
    } as const;
  }

  const query = FinanceAdminExportQuerySchema.safeParse(rawQuery);
  if (!query.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "财务导出参数不合法"),
    } as const;
  }

  return {
    status: 200,
    body: await buildFinanceExport(
      actor,
      query.data,
      now,
      paymentStore,
      operationStore
    ),
  } as const;
}

export function registerFinanceAdminApi(app: Express) {
  app.get(
    "/api/finance/admin/overview",
    async (req: Request, res: Response) => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getFinanceAdminOverviewPayload(
        session?.user,
        queryFromExpress(req)
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.get("/api/finance/admin/export", async (req: Request, res: Response) => {
    const session = await getLoginSessionFromRequest(req);
    const payload = await getFinanceAdminExportPayload(
      session?.user,
      queryFromExpress(req)
    );
    if ("csv" in payload.body) {
      sendCsv(res, payload.status, payload.body);
      return;
    }
    sendJson(res, payload.status, payload.body);
  });
}

export function handleFinanceAdminApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  if (!req.url || !req.url.startsWith("/api/finance/admin")) return false;

  const url = new URL(req.url, "http://localhost");
  if (req.method === "GET" && url.pathname === "/api/finance/admin/export") {
    void (async () => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getFinanceAdminExportPayload(
        session?.user,
        queryFromSearchParams(url.searchParams)
      );
      if ("csv" in payload.body) {
        sendCsv(res, payload.status, payload.body);
        return;
      }
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "财务导出失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "财务导出失败"));
    });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/finance/admin/overview") {
    void (async () => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getFinanceAdminOverviewPayload(
        session?.user,
        queryFromSearchParams(url.searchParams)
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "财务管理读取失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "财务管理读取失败"));
    });
    return true;
  }

  return false;
}
