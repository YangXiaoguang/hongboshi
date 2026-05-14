import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import {
  ALL_AUDIT_CENTER_MODULE,
  AUDIT_CENTER_PERMISSIONS,
  ApiResponseSchema,
  AuditCenterEventSchema,
  AuditCenterListResultSchema,
  AuditCenterModuleSchema,
  AuditCenterQuerySchema,
  userCan,
  type AuditCenterEvent,
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

type AuditCenterActor = Pick<LoginSession["user"], "id" | "roles">;

const AuditCenterListResponseSchema = ApiResponseSchema(
  AuditCenterListResultSchema
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

function eventMatchesQuery(event: AuditCenterEvent, query: AuditCenterQuery) {
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

async function buildAuditCenterListResult(
  query: AuditCenterQuery,
  now: string
) {
  const events = await collectAuditCenterEvents();
  const matchedEvents = events.filter(event => eventMatchesQuery(event, query));
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
    dateFrom: stringValue(record.dateFrom),
    dateTo: stringValue(record.dateTo),
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

export function registerAuditAdminApi(app: Express) {
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
