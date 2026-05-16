import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import {
  ALL_AUDIT_CENTER_MODULE,
  AUDIT_CENTER_ARCHIVE_POLICY_VERSION,
  AUDIT_CENTER_ARCHIVE_SCHEMA_VERSION,
  AUDIT_CENTER_CSV_CONTENT_TYPE,
  AUDIT_CENTER_EXPORT_FIELDS,
  AUDIT_CENTER_EXPORT_POLICY_VERSION,
  AUDIT_CENTER_PERMISSIONS,
  ApiResponseSchema,
  AuditCenterArchiveEventSchema,
  AuditCenterArchiveRequestSchema,
  AuditCenterArchiveResultSchema,
  AuditCenterArchiveSearchQuerySchema,
  AuditCenterArchiveSearchResultSchema,
  AuditCenterArchiveVerificationResultSchema,
  AuditCenterDetailResultSchema,
  AuditCenterEventSchema,
  AuditCenterExportQuerySchema,
  AuditCenterExportSchema,
  AuditCenterListResultSchema,
  AuditCenterModuleSchema,
  AuditCenterQuerySchema,
  EntityIdSchema,
  userCan,
  type AuditCenterArchiveEvent,
  type AuditCenterArchiveRequest,
  type AuditCenterArchiveResult,
  type AuditCenterArchiveSearchQuery,
  type AuditCenterArchiveSearchResult,
  type AuditCenterArchiveVerificationResult,
  type AuditCenterDetailResult,
  type AuditCenterEvent,
  type AuditCenterExport,
  type AuditCenterExportQuery,
  type AuditCenterExportRow,
  type AuditCenterModule,
  type AuditCenterQuery,
  type CourseProductAuditEvent,
  type CounselingOperationAuditEvent,
  type LoginSession,
  type OrderAdminAuditEvent,
  type RiskAdminReviewRecord,
  type TransactionAdminAuditEvent,
  type UserAdminMembershipAuditEvent,
} from "../../../shared/domain";
import { getLoginSessionFromRequest } from "../auth/authSessionApi";
import { getCourseProductStore } from "../catalog/courseProductStore";
import { listAllCounselingOperationAuditEvents } from "../counseling/counselingApi";
import {
  listAllMembershipAuditEvents,
  listAllOrderAdminAuditEvents,
} from "../courses/courseAccessApi";
import { listRiskAdminReviewRecords } from "../risk/riskAdminApi";
import { getTransactionOperationStore } from "../transactions/transactionOperationStore";
import {
  getAuditArchiveStore,
  type AuditArchiveListQuery,
} from "./auditArchiveStore";

type AuditCenterActor = Pick<LoginSession["user"], "id" | "roles">;
type AuditCenterFilterQuery = Pick<
  AuditCenterQuery,
  "module" | "action" | "actorId" | "resourceKeyword" | "dateFrom" | "dateTo"
>;

const AuditCenterListResponseSchema = ApiResponseSchema(
  AuditCenterListResultSchema
);
const AuditCenterDetailResponseSchema = ApiResponseSchema(
  AuditCenterDetailResultSchema
);
const AuditCenterArchiveResponseSchema = ApiResponseSchema(
  AuditCenterArchiveResultSchema
);
const AuditCenterArchiveVerificationResponseSchema = ApiResponseSchema(
  AuditCenterArchiveVerificationResultSchema
);
const AuditCenterArchiveSearchResponseSchema = ApiResponseSchema(
  AuditCenterArchiveSearchResultSchema
);

const privacyNotice =
  "审计中心只聚合后台操作摘要、资源定位和前后状态摘要，不展示咨询说明、测评答案、风险信号原文或支付敏感原文。";

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
  payload: AuditCenterExport
) {
  res.statusCode = status;
  res.setHeader("Content-Type", payload.contentType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${payload.filename}"`
  );
  res.setHeader("X-Hongboshi-Audit-Export-Id", payload.metadata.exportId);
  res.setHeader(
    "X-Hongboshi-Audit-Policy-Version",
    payload.metadata.policyVersion
  );
  res.end(`\uFEFF${payload.csv}`);
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

function denyUnauthorizedActor(actor: AuditCenterActor | null | undefined):
  | {
      status: 401 | 403;
      body: ReturnType<typeof errorPayload>;
    }
  | undefined {
  if (!actor) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", "请先登录后查看审计中心"),
    };
  }

  if (!userCan(actor, AUDIT_CENTER_PERMISSIONS.read)) {
    return {
      status: 403,
      body: errorPayload("FORBIDDEN", "当前账号暂无审计中心读取权限"),
    };
  }

  return undefined;
}

function denyUnauthorizedArchiveActor(
  actor: AuditCenterActor | null | undefined
):
  | {
      status: 401 | 403;
      body: ReturnType<typeof errorPayload>;
    }
  | undefined {
  if (!actor) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", "请先登录后归档审计事件"),
    };
  }

  if (!userCan(actor, AUDIT_CENTER_PERMISSIONS.archive)) {
    return {
      status: 403,
      body: errorPayload("FORBIDDEN", "当前账号暂无审计归档权限"),
    };
  }

  return undefined;
}

function toAuditEvent(input: AuditCenterEvent): AuditCenterEvent {
  return AuditCenterEventSchema.parse(input);
}

function compactSummary(value: string) {
  return value.length > 300 ? `${value.slice(0, 297)}...` : value;
}

function catalogAuditToEvent(event: CourseProductAuditEvent) {
  return toAuditEvent({
    id: `catalog:${event.id}`,
    sourceEventId: event.id,
    module: "catalog",
    action: event.action,
    resource: {
      type: "course_product",
      id: event.productId,
      label: event.productTitle,
    },
    actor: {
      id: event.actorId,
      roles: [],
    },
    reason: event.reason,
    summary: compactSummary(
      `课程商品「${event.productTitle}」执行 ${event.action}`
    ),
    before: event.before,
    after: event.after,
    occurredAt: event.createdAt,
  });
}

function membershipAuditToEvent(event: UserAdminMembershipAuditEvent) {
  return toAuditEvent({
    id: `user:${event.id}`,
    sourceEventId: event.id,
    module: "user",
    action: event.action,
    resource: {
      type: "user_membership",
      id: event.userId,
      label: `用户 ${event.userId}`,
    },
    actor: {
      id: event.actorId,
      roles: event.actorRoles,
    },
    reason: event.reason,
    summary: compactSummary(`用户会员执行 ${event.action}`),
    before: event.before,
    after: event.after,
    occurredAt: event.createdAt,
  });
}

function orderAuditToEvent(event: OrderAdminAuditEvent) {
  return toAuditEvent({
    id: `order:${event.id}`,
    sourceEventId: event.id,
    module: "order",
    action: event.action,
    resource: {
      type: "order",
      id: event.orderId,
      label: `订单 ${event.orderId}`,
    },
    actor: {
      id: event.actorId,
      roles: event.actorRoles,
    },
    reason: event.reason,
    summary: compactSummary(`订单 ${event.orderId} 执行 ${event.action}`),
    before: event.before,
    after: event.after,
    occurredAt: event.createdAt,
  });
}

function transactionAuditToEvent(event: TransactionAdminAuditEvent) {
  return toAuditEvent({
    id: `transaction:${event.id}`,
    sourceEventId: event.id,
    module: "transaction",
    action: event.action,
    resource: {
      type: "transaction",
      id: event.transactionId,
      label: `交易 ${event.transactionId}`,
    },
    actor: {
      id: event.actorId,
      roles: event.actorRoles,
    },
    reason: event.reason,
    summary: compactSummary(`交易 ${event.transactionId} 执行 ${event.action}`),
    before: event.before,
    after: {
      ...event.after,
      refundProviderResult: event.refundProviderResult,
    },
    occurredAt: event.createdAt,
  });
}

function counselingResource(event: CounselingOperationAuditEvent) {
  if (event.appointmentId) {
    return {
      type: "counseling_appointment",
      id: event.appointmentId,
      label: `咨询预约 ${event.appointmentId}`,
    };
  }

  if (event.counselorId) {
    return {
      type: "counselor",
      id: event.counselorId,
      label: `咨询师 ${event.counselorId}`,
    };
  }

  return {
    type: "counseling_operation",
    id: "counseling_policy",
    label: "咨询运营配置",
  };
}

function counselingAuditToEvent(event: CounselingOperationAuditEvent) {
  return toAuditEvent({
    id: `counseling:${event.id}`,
    sourceEventId: event.id,
    module: "counseling",
    action: event.action,
    resource: counselingResource(event),
    actor: {
      id: event.actorId,
      roles: event.actorRoles,
    },
    reason: event.note,
    summary: compactSummary(`咨询运营执行 ${event.action}`),
    before: {
      appointmentStatus: event.previousAppointmentStatus,
      orderStatus: event.previousOrderStatus,
      policy: event.policyBefore,
    },
    after: {
      appointmentStatus: event.nextAppointmentStatus,
      orderStatus: event.nextOrderStatus,
      policy: event.policyAfter,
    },
    occurredAt: event.createdAt,
  });
}

function riskAuditToEvent(record: RiskAdminReviewRecord) {
  return toAuditEvent({
    id: `risk:${record.id}`,
    sourceEventId: record.id,
    module: "risk",
    action: record.action,
    resource: {
      type: "risk_event",
      id: record.riskEventId,
      label: `风险事件 ${record.riskEventId}`,
    },
    actor: {
      id: record.actorId,
      roles: record.actorRoles,
    },
    reason: record.note,
    summary: compactSummary(
      `风险事件 ${record.riskEventId} 执行 ${record.action}`
    ),
    before: {
      status: record.previousStatus,
    },
    after: {
      status: record.nextStatus,
      sopTemplateId: record.sopTemplateId,
      sopTemplateVersion: record.sopTemplateVersion,
      resultTemplateId: record.resultTemplateId,
      escalation: record.escalation,
    },
    occurredAt: record.createdAt,
  });
}

async function collectAuditCenterEvents() {
  const [
    catalogEvents,
    membershipEvents,
    orderEvents,
    transactionEvents,
    counselingEvents,
    riskRecords,
  ] = await Promise.all([
    getCourseProductStore().listAuditEvents(),
    listAllMembershipAuditEvents(),
    listAllOrderAdminAuditEvents(),
    getTransactionOperationStore().listAllAuditEvents(),
    listAllCounselingOperationAuditEvents(),
    listRiskAdminReviewRecords(),
  ]);

  return [
    ...catalogEvents.map(catalogAuditToEvent),
    ...membershipEvents.map(membershipAuditToEvent),
    ...orderEvents.map(orderAuditToEvent),
    ...transactionEvents.map(transactionAuditToEvent),
    ...counselingEvents.map(counselingAuditToEvent),
    ...riskRecords.map(riskAuditToEvent),
  ].sort(
    (left, right) =>
      Date.parse(right.occurredAt) - Date.parse(left.occurredAt) ||
      right.id.localeCompare(left.id)
  );
}

function parseDateStart(date: string | undefined) {
  return date ? Date.parse(`${date}T00:00:00.000Z`) : undefined;
}

function parseDateEnd(date: string | undefined) {
  return date ? Date.parse(`${date}T23:59:59.999Z`) : undefined;
}

function dateStartIso(date: string | undefined) {
  return date ? new Date(`${date}T00:00:00.000Z`).toISOString() : undefined;
}

function dateEndIso(date: string | undefined) {
  return date ? new Date(`${date}T23:59:59.999Z`).toISOString() : undefined;
}

function eventMatchesQuery(
  event: AuditCenterEvent,
  query: AuditCenterFilterQuery
) {
  if (
    query.module !== ALL_AUDIT_CENTER_MODULE &&
    event.module !== query.module
  ) {
    return false;
  }

  if (query.action && event.action !== query.action) return false;
  if (query.actorId && event.actor.id !== query.actorId) return false;

  const dateFrom = parseDateStart(query.dateFrom);
  const dateTo = parseDateEnd(query.dateTo);
  const occurredAt = Date.parse(event.occurredAt);
  if (dateFrom !== undefined && occurredAt < dateFrom) return false;
  if (dateTo !== undefined && occurredAt > dateTo) return false;

  if (query.resourceKeyword) {
    const keyword = query.resourceKeyword.toLowerCase();
    const searchable = [
      event.id,
      event.sourceEventId,
      event.module,
      event.action,
      event.actor.id,
      event.resource.type,
      event.resource.id,
      event.resource.label,
      event.reason,
      event.summary,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (!searchable.includes(keyword)) return false;
  }

  return true;
}

function buildSummary(events: AuditCenterEvent[]) {
  const moduleCounts = AuditCenterModuleSchema.options.map(module => ({
    module,
    count: events.filter(event => event.module === module).length,
  }));

  return {
    totalCount: events.length,
    moduleCounts,
  };
}

function buildFilters(events: AuditCenterEvent[]) {
  return {
    modules: AuditCenterModuleSchema.options,
    actions: Array.from(new Set(events.map(event => event.action))).sort(),
  };
}

async function filterAuditCenterEvents(query: AuditCenterFilterQuery) {
  const events = await collectAuditCenterEvents();
  const matchedEvents = events.filter(event => eventMatchesQuery(event, query));
  return {
    events,
    matchedEvents,
  };
}

async function buildAuditCenterListResult(
  query: AuditCenterQuery,
  now: string
) {
  const { events, matchedEvents } = await filterAuditCenterEvents(query);
  const totalPages = Math.ceil(matchedEvents.length / query.pageSize);
  const start = (query.page - 1) * query.pageSize;

  return AuditCenterListResultSchema.parse({
    items: matchedEvents.slice(start, start + query.pageSize),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total: matchedEvents.length,
      totalPages,
    },
    summary: buildSummary(matchedEvents),
    filters: buildFilters(events),
    query,
    privacyNotice,
    generatedAt: now,
  });
}

function auditSnapshotSummary(value: unknown) {
  if (value === undefined || value === null) return "";
  const text = JSON.stringify(value);
  if (!text || text === "{}") return "";
  return text.length > 1200 ? `${text.slice(0, 1197)}...` : text;
}

function exportRowFromEvent(event: AuditCenterEvent): AuditCenterExportRow {
  return {
    occurredAt: event.occurredAt,
    module: event.module,
    action: event.action,
    resourceType: event.resource.type,
    resourceId: event.resource.id ?? "",
    resourceLabel: event.resource.label ?? "",
    actorId: event.actor.id ?? "",
    actorRoles: event.actor.roles,
    reason: event.reason ?? "",
    summary: event.summary,
    sourceEventId: event.sourceEventId,
    auditEventId: event.id,
    beforeSummary: auditSnapshotSummary(event.before),
    afterSummary: auditSnapshotSummary(event.after),
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

function auditMetadataRows(metadata: AuditCenterExport["metadata"]) {
  return [
    ["metadata_key", "metadata_value"],
    ["exportId", metadata.exportId],
    ["generatedAt", metadata.generatedAt],
    ["generatedBy", metadata.generatedBy.id],
    ["policyVersion", metadata.policyVersion],
    ["query", JSON.stringify(metadata.query)],
    ["rowCount", metadata.rowCount],
    ["totalCount", metadata.summary.totalCount],
    [
      "moduleCounts",
      JSON.stringify(
        metadata.summary.moduleCounts.map(item => ({
          module: item.module,
          count: item.count,
        }))
      ),
    ],
    ["privacyNotice", metadata.privacyNotice],
  ];
}

function valueForExportField(
  row: AuditCenterExportRow,
  key: AuditCenterExport["metadata"]["fields"][number]["key"]
) {
  return row[key];
}

function csvFromAuditExport(
  metadata: AuditCenterExport["metadata"],
  rows: AuditCenterExportRow[]
) {
  const lines = [
    ...auditMetadataRows(metadata).map(csvLine),
    "",
    csvLine(metadata.fields.map(field => field.label)),
    ...rows.map(row =>
      csvLine(metadata.fields.map(field => valueForExportField(row, field.key)))
    ),
  ];
  return lines.join("\n");
}

function exportIdFromNow(now: string) {
  return `audit_export_${now.replace(/\D/g, "").slice(0, 17)}`;
}

function filenameFromNow(now: string) {
  return `hongboshi-audit-${now.replace(/\D/g, "").slice(0, 14)}.csv`;
}

async function buildAuditCenterExport(
  actor: AuditCenterActor,
  query: AuditCenterExportQuery,
  now: string
): Promise<AuditCenterExport> {
  const { matchedEvents } = await filterAuditCenterEvents(query);
  const rows = matchedEvents.map(exportRowFromEvent);
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
    summary: buildSummary(matchedEvents),
    rowCount: rows.length,
    policyVersion: AUDIT_CENTER_EXPORT_POLICY_VERSION,
    fields: AUDIT_CENTER_EXPORT_FIELDS.map(field => ({ ...field })),
    privacyNotice,
  } satisfies AuditCenterExport["metadata"];
  const csv = csvFromAuditExport(metadata, rows);

  return AuditCenterExportSchema.parse({
    metadata,
    rows,
    csv,
    filename,
    contentType: AUDIT_CENTER_CSV_CONTENT_TYPE,
  });
}

function sourceTraceFromEvent(event: AuditCenterEvent) {
  return {
    module: event.module,
    sourceEventId: event.sourceEventId,
    resourceType: event.resource.type,
    resourceId: event.resource.id,
    resourceLabel: event.resource.label,
    traceHint: `来源模块 ${event.module} 的原始事件 ${event.sourceEventId}`,
  } satisfies AuditCenterDetailResult["source"];
}

const archiveSourceByModule = {
  catalog: {
    sourceStore: "CourseProductStore",
    sourceTable: "course_product_audit_events",
  },
  user: {
    sourceStore: "CourseAccessStore",
    sourceTable: "user_membership_audit_events",
  },
  order: {
    sourceStore: "CourseAccessStore",
    sourceTable: "order_admin_audit_events",
  },
  transaction: {
    sourceStore: "TransactionOperationStore",
    sourceTable: "transaction_admin_audit_events",
  },
  counseling: {
    sourceStore: "CounselingOperationStore",
    sourceTable: "counseling_operation_audit_events",
  },
  risk: {
    sourceStore: "RiskReviewStore",
    sourceTable: "risk_admin_review_records",
  },
} satisfies Record<
  AuditCenterModule,
  {
    sourceStore: string;
    sourceTable: string;
  }
>;

const sensitiveArchiveKeyPatterns = [
  /raw/i,
  /payload/i,
  /signature/i,
  /secret/i,
  /token/i,
  /credential/i,
  /card/i,
  /phone/i,
  /mobile/i,
  /answer/i,
  /signal/i,
  /note/i,
  /intake/i,
  /咨询说明/,
  /测评答案/,
  /风险信号/,
  /支付敏感/,
];

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

function shouldDropArchiveKey(key: string) {
  return sensitiveArchiveKeyPatterns.some(pattern => pattern.test(key));
}

function sanitizeArchiveValue(value: unknown, depth = 0): unknown {
  if (value === undefined || value === null) return undefined;
  if (depth > 5) return "[summary-truncated]";
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value
      .map(item => sanitizeArchiveValue(item, depth + 1))
      .filter(item => item !== undefined);
  }

  if (isPlainRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !shouldDropArchiveKey(key))
        .map(([key, item]) => [key, sanitizeArchiveValue(item, depth + 1)])
        .filter(([, item]) => item !== undefined)
    );
  }

  if (typeof value === "string") return compactSummary(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

function archiveSnapshotSummary(value: unknown): Record<string, unknown> {
  const sanitized = sanitizeArchiveValue(value);
  if (isPlainRecord(sanitized)) return sanitized;
  if (sanitized === undefined) return {};
  return {
    value: sanitized,
  };
}

export function archiveEventFromAuditCenterEvent(
  event: AuditCenterEvent,
  batchId: string,
  archivedAt: string
): AuditCenterArchiveEvent {
  const source = archiveSourceByModule[event.module];

  return AuditCenterArchiveEventSchema.parse({
    id: event.id,
    idempotencyKey: `${event.module}:${event.sourceEventId}`,
    source: {
      module: event.module,
      sourceEventId: event.sourceEventId,
      sourceStore: source.sourceStore,
      sourceTable: source.sourceTable,
      sourceRecordId: event.sourceEventId,
      sourceOccurredAt: event.occurredAt,
    },
    module: event.module,
    action: event.action,
    resource: event.resource,
    actor: event.actor,
    reason: event.reason,
    summary: event.summary,
    beforeSummary: archiveSnapshotSummary(event.before),
    afterSummary: archiveSnapshotSummary(event.after),
    occurredAt: event.occurredAt,
    archivedAt,
    schemaVersion: AUDIT_CENTER_ARCHIVE_SCHEMA_VERSION,
    policyVersion: AUDIT_CENTER_ARCHIVE_POLICY_VERSION,
    privacyLevel: "summary_only",
    backfillBatchId: batchId,
  });
}

async function buildAuditCenterEventDetail(
  eventId: string,
  now: string
): Promise<AuditCenterDetailResult | undefined> {
  const events = await collectAuditCenterEvents();
  const event = events.find(item => item.id === eventId);
  if (!event) return undefined;

  return AuditCenterDetailResultSchema.parse({
    event,
    source: sourceTraceFromEvent(event),
    privacyNotice,
    generatedAt: now,
  });
}

function archiveBatchIdFromNow(now: string) {
  return `audit_archive_${now.replace(/\D/g, "").slice(0, 14)}`;
}

function archiveFailureFromEvent(event: AuditCenterEvent) {
  return {
    eventId: event.id,
    sourceEventId: event.sourceEventId,
    module: event.module,
    message: "审计事件归档失败",
  };
}

async function buildAuditCenterArchiveResult(
  actor: AuditCenterActor,
  query: AuditCenterArchiveRequest,
  now: string
): Promise<AuditCenterArchiveResult> {
  const { matchedEvents } = await filterAuditCenterEvents(query);
  const batchId = query.batchId ?? archiveBatchIdFromNow(now);
  const archiveStore = getAuditArchiveStore();
  let archivedCount = 0;
  let skippedCount = 0;
  const failures: AuditCenterArchiveResult["failures"] = [];

  for (const event of matchedEvents) {
    try {
      const archiveEvent = archiveEventFromAuditCenterEvent(
        event,
        batchId,
        now
      );
      const result = await archiveStore.upsertArchivedEvents([archiveEvent]);
      archivedCount += result.archivedCount;
      skippedCount += result.skippedCount;
    } catch {
      failures.push(archiveFailureFromEvent(event));
    }
  }

  return AuditCenterArchiveResultSchema.parse({
    batchId,
    requestedAt: now,
    archivedAt: now,
    archivedBy: {
      id: actor.id,
      roles: [...actor.roles],
    },
    query,
    scannedCount: matchedEvents.length,
    archivedCount,
    skippedCount,
    failedCount: failures.length,
    failures,
    privacyNotice,
  });
}

function archivedEventSummary(event: AuditCenterArchiveEvent) {
  return {
    id: event.id,
    sourceEventId: event.source.sourceEventId,
    module: event.module,
    action: event.action,
    resource: event.resource,
    occurredAt: event.occurredAt,
    archivedAt: event.archivedAt,
    batchId: event.backfillBatchId,
  };
}

function archivePreviewItemFromEvent(event: AuditCenterArchiveEvent) {
  return {
    id: event.id,
    sourceEventId: event.source.sourceEventId,
    sourceStore: event.source.sourceStore,
    sourceTable: event.source.sourceTable,
    module: event.module,
    action: event.action,
    resource: event.resource,
    actor: event.actor,
    reason: event.reason,
    summary: event.summary,
    beforeSummary: event.beforeSummary,
    afterSummary: event.afterSummary,
    occurredAt: event.occurredAt,
    archivedAt: event.archivedAt,
    batchId: event.backfillBatchId,
    schemaVersion: event.schemaVersion,
    policyVersion: event.policyVersion,
    privacyLevel: event.privacyLevel,
  };
}

function archiveStoreQueryFromSearch(
  query: AuditCenterArchiveSearchQuery
): AuditArchiveListQuery {
  return {
    module:
      query.module === ALL_AUDIT_CENTER_MODULE ? undefined : query.module,
    action: query.action,
    actorId: query.actorId,
    resourceKeyword: query.resourceKeyword,
    batchId: query.batchId,
    occurredFrom: dateStartIso(query.dateFrom),
    occurredTo: dateEndIso(query.dateTo),
    archivedFrom: dateStartIso(query.archivedDateFrom),
    archivedTo: dateEndIso(query.archivedDateTo),
    limit: query.pageSize,
    offset: (query.page - 1) * query.pageSize,
    sortBy: query.sortBy,
  };
}

async function buildAuditCenterArchiveSearchResult(
  query: AuditCenterArchiveSearchQuery,
  now: string
): Promise<AuditCenterArchiveSearchResult> {
  const archiveStore = getAuditArchiveStore();
  const storeQuery = archiveStoreQueryFromSearch(query);
  const [items, totalCount, moduleCounts] = await Promise.all([
    archiveStore.listArchivedEvents(storeQuery),
    archiveStore.countArchivedEvents({
      ...storeQuery,
      limit: undefined,
      offset: undefined,
    }),
    Promise.all(
      AuditCenterModuleSchema.options.map(module => {
        if (
          query.module !== ALL_AUDIT_CENTER_MODULE &&
          query.module !== module
        ) {
          return 0;
        }

        return archiveStore.countArchivedEvents({
          ...storeQuery,
          module,
          limit: undefined,
          offset: undefined,
        });
      })
    ),
  ]);
  const totalPages = Math.ceil(totalCount / query.pageSize);

  return AuditCenterArchiveSearchResultSchema.parse({
    items: items.map(archivePreviewItemFromEvent),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total: totalCount,
      totalPages,
    },
    summary: {
      totalCount,
      moduleCounts: AuditCenterModuleSchema.options.map((module, index) => ({
        module,
        count: moduleCounts[index] ?? 0,
      })),
    },
    query,
    privacyNotice:
      "归档检索只读取统一归档表中的摘要投影，不切换主审计列表来源，也不返回敏感原文。",
    generatedAt: now,
  });
}

function recentBatchSummaries(events: AuditCenterArchiveEvent[]) {
  const batches = new Map<
    string,
    {
      batchId?: string;
      archivedCount: number;
      firstArchivedAt: string;
      lastArchivedAt: string;
      modules: Set<AuditCenterModule>;
    }
  >();

  for (const event of events) {
    const key = event.backfillBatchId ?? "unbatched";
    const existing = batches.get(key);
    const archivedAt = event.archivedAt;

    if (!existing) {
      batches.set(key, {
        batchId: event.backfillBatchId,
        archivedCount: 1,
        firstArchivedAt: archivedAt,
        lastArchivedAt: archivedAt,
        modules: new Set([event.module]),
      });
      continue;
    }

    existing.archivedCount += 1;
    existing.modules.add(event.module);
    if (Date.parse(archivedAt) < Date.parse(existing.firstArchivedAt)) {
      existing.firstArchivedAt = archivedAt;
    }
    if (Date.parse(archivedAt) > Date.parse(existing.lastArchivedAt)) {
      existing.lastArchivedAt = archivedAt;
    }
  }

  return Array.from(batches.values())
    .map(batch => ({
      batchId: batch.batchId,
      archivedCount: batch.archivedCount,
      firstArchivedAt: batch.firstArchivedAt,
      lastArchivedAt: batch.lastArchivedAt,
      modules: Array.from(batch.modules).sort(),
    }))
    .sort(
      (left, right) =>
        Date.parse(right.lastArchivedAt) - Date.parse(left.lastArchivedAt)
    )
    .slice(0, 5);
}

async function buildAuditCenterArchiveVerification(
  actor: AuditCenterActor,
  now: string
): Promise<AuditCenterArchiveVerificationResult> {
  const currentEvents = await collectAuditCenterEvents();
  const currentSummary = buildSummary(currentEvents);
  const archiveStore = getAuditArchiveStore();
  const [archiveTotalCount, recentArchivedEvents, archivedModuleCounts] =
    await Promise.all([
      archiveStore.countArchivedEvents(),
      archiveStore.listArchivedEvents({
        limit: 200,
        sortBy: "archivedAt",
      }),
      Promise.all(
        AuditCenterModuleSchema.options.map(module =>
          archiveStore.countArchivedEvents({ module })
        )
      ),
    ]);
  const currentCountByModule = new Map(
    currentSummary.moduleCounts.map(item => [item.module, item.count])
  );

  return AuditCenterArchiveVerificationResultSchema.parse({
    generatedAt: now,
    generatedBy: {
      id: actor.id,
      roles: [...actor.roles],
    },
    currentAggregateTotalCount: currentSummary.totalCount,
    archiveTotalCount,
    totalDifference: currentSummary.totalCount - archiveTotalCount,
    moduleDifferences: AuditCenterModuleSchema.options.map((module, index) => {
      const currentAggregateCount = currentCountByModule.get(module) ?? 0;
      const archivedCount = archivedModuleCounts[index] ?? 0;

      return {
        module,
        currentAggregateCount,
        archivedCount,
        difference: currentAggregateCount - archivedCount,
      };
    }),
    recentBatches: recentBatchSummaries(recentArchivedEvents),
    recentArchivedEvents: recentArchivedEvents
      .slice(0, 10)
      .map(archivedEventSummary),
    privacyNotice,
  });
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

function queryFromRecord(record: Record<string, unknown>) {
  return {
    module: stringValue(record.module),
    action: stringValue(record.action),
    actorId: stringValue(record.actorId),
    resourceKeyword: stringValue(record.resourceKeyword),
    batchId: stringValue(record.batchId),
    dateFrom: stringValue(record.dateFrom),
    dateTo: stringValue(record.dateTo),
    archivedDateFrom: stringValue(record.archivedDateFrom),
    archivedDateTo: stringValue(record.archivedDateTo),
    sortBy: stringValue(record.sortBy),
    page: numberValue(record.page),
    pageSize: numberValue(record.pageSize),
    format: stringValue(record.format),
  };
}

function queryFromExpress(req: Request) {
  return queryFromRecord(req.query as Record<string, unknown>);
}

function queryFromSearchParams(params: URLSearchParams) {
  return queryFromRecord(Object.fromEntries(params.entries()));
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

export async function getAuditCenterEventsPayload(
  actor: AuditCenterActor | null | undefined,
  rawQuery: Record<string, unknown>,
  now = new Date().toISOString()
) {
  const denied = denyUnauthorizedActor(actor);
  if (denied) return denied;

  const queryResult = AuditCenterQuerySchema.safeParse(rawQuery);
  if (!queryResult.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "审计中心查询参数不合法"),
    } as const;
  }

  return {
    status: 200,
    body: AuditCenterListResponseSchema.parse({
      ok: true,
      data: await buildAuditCenterListResult(queryResult.data, now),
    }),
  } as const;
}

export async function getAuditCenterArchivePayload(
  actor: AuditCenterActor | null | undefined,
  rawBody: unknown,
  now = new Date().toISOString()
) {
  const denied = denyUnauthorizedArchiveActor(actor);
  if (denied) return denied;

  const body =
    typeof rawBody === "object" && rawBody !== null
      ? (rawBody as Record<string, unknown>)
      : {};
  const requestResult = AuditCenterArchiveRequestSchema.safeParse(body);
  if (!requestResult.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "审计归档参数不合法"),
    } as const;
  }

  return {
    status: 200,
    body: AuditCenterArchiveResponseSchema.parse({
      ok: true,
      data: await buildAuditCenterArchiveResult(
        actor as AuditCenterActor,
        requestResult.data,
        now
      ),
    }),
  } as const;
}

export async function getAuditCenterArchiveVerificationPayload(
  actor: AuditCenterActor | null | undefined,
  now = new Date().toISOString()
) {
  const denied = denyUnauthorizedArchiveActor(actor);
  if (denied) {
    return {
      ...denied,
      body:
        denied.status === 401
          ? errorPayload("UNAUTHORIZED", "请先登录后校验审计归档")
          : errorPayload("FORBIDDEN", "当前账号暂无审计归档校验权限"),
    } as const;
  }

  try {
    return {
      status: 200,
      body: AuditCenterArchiveVerificationResponseSchema.parse({
        ok: true,
        data: await buildAuditCenterArchiveVerification(
          actor as AuditCenterActor,
          now
        ),
      }),
    } as const;
  } catch {
    return {
      status: 500,
      body: errorPayload("INTERNAL_ERROR", "审计归档校验暂时不可用"),
    } as const;
  }
}

export async function getAuditCenterArchiveSearchPayload(
  actor: AuditCenterActor | null | undefined,
  rawQuery: Record<string, unknown>,
  now = new Date().toISOString()
) {
  const denied = denyUnauthorizedArchiveActor(actor);
  if (denied) {
    return {
      ...denied,
      body:
        denied.status === 401
          ? errorPayload("UNAUTHORIZED", "请先登录后检索审计归档")
          : errorPayload("FORBIDDEN", "当前账号暂无审计归档检索权限"),
    } as const;
  }

  const queryResult = AuditCenterArchiveSearchQuerySchema.safeParse(rawQuery);
  if (!queryResult.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "审计归档检索参数不合法"),
    } as const;
  }

  try {
    return {
      status: 200,
      body: AuditCenterArchiveSearchResponseSchema.parse({
        ok: true,
        data: await buildAuditCenterArchiveSearchResult(
          queryResult.data,
          now
        ),
      }),
    } as const;
  } catch {
    return {
      status: 500,
      body: errorPayload("INTERNAL_ERROR", "审计归档检索暂时不可用"),
    } as const;
  }
}

export async function getAuditCenterExportPayload(
  actor: AuditCenterActor | null | undefined,
  rawQuery: Record<string, unknown>,
  now = new Date().toISOString()
) {
  const denied = denyUnauthorizedActor(actor);
  if (denied) {
    return {
      ...denied,
      body:
        denied.status === 401
          ? errorPayload("UNAUTHORIZED", "请先登录后导出审计事件")
          : errorPayload("FORBIDDEN", "当前账号暂无审计中心导出权限"),
    } as const;
  }

  const queryResult = AuditCenterExportQuerySchema.safeParse(rawQuery);
  if (!queryResult.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "审计中心导出参数不合法"),
    } as const;
  }

  return {
    status: 200,
    body: await buildAuditCenterExport(
      actor as AuditCenterActor,
      queryResult.data,
      now
    ),
  } as const;
}

export async function getAuditCenterEventDetailPayload(
  actor: AuditCenterActor | null | undefined,
  rawEventId: unknown,
  now = new Date().toISOString()
) {
  const denied = denyUnauthorizedActor(actor);
  if (denied) return denied;

  const eventIdResult = EntityIdSchema.safeParse(rawEventId);
  if (!eventIdResult.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "审计事件 ID 不合法"),
    } as const;
  }

  const detail = await buildAuditCenterEventDetail(eventIdResult.data, now);
  if (!detail) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "审计事件不存在"),
    } as const;
  }

  return {
    status: 200,
    body: AuditCenterDetailResponseSchema.parse({
      ok: true,
      data: detail,
    }),
  } as const;
}

export function registerAuditAdminApi(app: Express) {
  app.post("/api/audit/admin/archive", async (req: Request, res: Response) => {
    const session = await getLoginSessionFromRequest(req);
    const payload = await getAuditCenterArchivePayload(session?.user, req.body);
    sendJson(res, payload.status, payload.body);
  });

  app.get(
    "/api/audit/admin/archive/events",
    async (req: Request, res: Response) => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getAuditCenterArchiveSearchPayload(
        session?.user,
        queryFromExpress(req)
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.get(
    "/api/audit/admin/archive/verification",
    async (req: Request, res: Response) => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getAuditCenterArchiveVerificationPayload(
        session?.user
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.get("/api/audit/admin/export", async (req: Request, res: Response) => {
    const session = await getLoginSessionFromRequest(req);
    const payload = await getAuditCenterExportPayload(
      session?.user,
      queryFromExpress(req)
    );
    if ("csv" in payload.body) {
      sendCsv(res, payload.status, payload.body);
      return;
    }
    sendJson(res, payload.status, payload.body);
  });

  app.get(
    "/api/audit/admin/events/:eventId",
    async (req: Request, res: Response) => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getAuditCenterEventDetailPayload(
        session?.user,
        req.params.eventId
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.get("/api/audit/admin/events", async (req: Request, res: Response) => {
    const session = await getLoginSessionFromRequest(req);
    const payload = await getAuditCenterEventsPayload(
      session?.user,
      queryFromExpress(req)
    );
    sendJson(res, payload.status, payload.body);
  });
}

export function handleAuditAdminApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  if (!req.url || !req.url.startsWith("/api/audit/admin")) return false;

  const url = new URL(req.url, "http://localhost");
  if (req.method === "POST" && url.pathname === "/api/audit/admin/archive") {
    void (async () => {
      const [session, body] = await Promise.all([
        getLoginSessionFromRequest(req),
        readRequestBody(req),
      ]);
      const payload = await getAuditCenterArchivePayload(session?.user, body);
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "审计事件归档失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "审计事件归档失败"));
    });
    return true;
  }

  if (
    req.method === "GET" &&
    url.pathname === "/api/audit/admin/archive/events"
  ) {
    void (async () => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getAuditCenterArchiveSearchPayload(
        session?.user,
        queryFromSearchParams(url.searchParams)
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "审计归档检索失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "审计归档检索失败"));
    });
    return true;
  }

  if (
    req.method === "GET" &&
    url.pathname === "/api/audit/admin/archive/verification"
  ) {
    void (async () => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getAuditCenterArchiveVerificationPayload(
        session?.user
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "审计归档校验失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "审计归档校验失败"));
    });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/audit/admin/export") {
    void (async () => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getAuditCenterExportPayload(
        session?.user,
        queryFromSearchParams(url.searchParams)
      );
      if ("csv" in payload.body) {
        sendCsv(res, payload.status, payload.body);
        return;
      }
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "审计中心导出失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "审计中心导出失败"));
    });
    return true;
  }

  if (
    req.method === "GET" &&
    url.pathname.startsWith("/api/audit/admin/events/")
  ) {
    void (async () => {
      const session = await getLoginSessionFromRequest(req);
      const eventId = decodeURIComponent(
        url.pathname.slice("/api/audit/admin/events/".length)
      );
      const payload = await getAuditCenterEventDetailPayload(
        session?.user,
        eventId
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(
        err instanceof Error ? err.message : "审计事件详情读取失败"
      );
      sendJson(
        res,
        500,
        errorPayload("INTERNAL_ERROR", "审计事件详情读取失败")
      );
    });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/audit/admin/events") {
    void (async () => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getAuditCenterEventsPayload(
        session?.user,
        queryFromSearchParams(url.searchParams)
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "审计中心读取失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "审计中心读取失败"));
    });
    return true;
  }

  sendJson(res, 404, {
    ok: false,
    error: {
      code: "NOT_FOUND",
      message: "审计中心接口不存在",
    },
  });
  return true;
}
