import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { randomUUID } from "crypto";
import { URL } from "url";
import {
  ALL_RISK_ADMIN_LEVEL,
  ALL_RISK_ADMIN_SOURCE,
  ALL_RISK_ADMIN_STATUS,
  ApiResponseSchema,
  RISK_ADMIN_PERMISSIONS,
  RiskAdminActionRequestSchema,
  RiskAdminDetailSchema,
  RiskEscalationQueueItemSchema,
  RiskAdminListItemSchema,
  RiskAdminListQuerySchema,
  RiskAdminListResultSchema,
  RiskAdminMutationResultSchema,
  RiskAdminReviewRecordSchema,
  RiskSopConsoleSchema,
  RiskSopTemplateMutationResultSchema,
  RiskSopTemplateSchema,
  RiskSopTemplateUpdateRequestSchema,
  RiskEventSchema,
  userCan,
  type AuthPermission,
  type LoginSession,
  type RiskAdminAction,
  type RiskAdminDetail,
  type RiskAdminEscalationRequest,
  type RiskAdminListItem,
  type RiskAdminListQuery,
  type RiskAdminReviewRecord,
  type RiskEscalationQueueItem,
  type RiskEvent,
  type RiskEventStatus,
  type RiskLevel,
  type RiskSopTemplate,
} from "../../../shared/domain";
import { getLatestAssessmentResult } from "../assessments/assessmentApi";
import {
  getLoginSessionFromRequest,
  listAuthUsers,
} from "../auth/authSessionApi";
import { listCounselingAppointmentRecords } from "../counseling/counselingApi";
import {
  getRiskEvent,
  listAllRiskEvents,
  saveRiskEvent,
} from "./riskEventStore";
import {
  createDefaultRiskReviewStore,
  type RiskReviewStore,
} from "./riskReviewStore";
import {
  createDefaultRiskSopStore,
  findRiskSopTemplateForEvent,
  type RiskSopStore,
} from "./riskSopStore";

type RiskAdminActor = Pick<LoginSession["user"], "id" | "roles">;

const RiskAdminListResponseSchema = ApiResponseSchema(
  RiskAdminListResultSchema
);
const RiskAdminDetailResponseSchema = ApiResponseSchema(RiskAdminDetailSchema);
const RiskAdminMutationResponseSchema = ApiResponseSchema(
  RiskAdminMutationResultSchema
);
const RiskSopConsoleResponseSchema = ApiResponseSchema(RiskSopConsoleSchema);
const RiskSopTemplateMutationResponseSchema = ApiResponseSchema(
  RiskSopTemplateMutationResultSchema
);

const riskLevelRank = {
  medium: 1,
  high: 2,
  urgent: 3,
} satisfies Record<RiskLevel, number>;

const statusPriority = {
  open: 4,
  reviewing: 3,
  escalated: 2,
  resolved: 1,
} satisfies Record<RiskEventStatus, number>;

const privacyNotice =
  "风险复核台仅展示运营处理所需摘要：不展示测评答案原文、咨询前说明全文或风险信号原文。";

let riskReviewStore = createDefaultRiskReviewStore();
let riskSopStore = createDefaultRiskSopStore();

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
  actor: RiskAdminActor | null | undefined,
  permission: AuthPermission = RISK_ADMIN_PERMISSIONS.read
):
  | {
      status: 401 | 403;
      body: ReturnType<typeof errorPayload>;
    }
  | undefined {
  if (!actor) {
    return {
      status: 401,
      body: errorPayload(
        "UNAUTHORIZED",
        permission === RISK_ADMIN_PERMISSIONS.review
          ? "请先登录后处理风险事件"
          : permission === RISK_ADMIN_PERMISSIONS.sop
            ? "请先登录后维护风险 SOP 模板"
            : "请先登录后查看风险复核台"
      ),
    };
  }

  if (!userCan(actor, permission)) {
    return {
      status: 403,
      body: errorPayload(
        "FORBIDDEN",
        permission === RISK_ADMIN_PERMISSIONS.review
          ? "当前账号暂无风险复核处理权限"
          : permission === RISK_ADMIN_PERMISSIONS.sop
            ? "当前账号暂无风险 SOP 模板维护权限"
            : "当前账号暂无风险复核读取权限"
      ),
    };
  }

  return undefined;
}

export function setRiskReviewStore(store: RiskReviewStore) {
  riskReviewStore = store;
}

export function resetRiskReviewStore() {
  return Promise.resolve(riskReviewStore.clear());
}

export function listRiskAdminReviewRecords() {
  return Promise.resolve(riskReviewStore.listAllRecords());
}

export function setRiskSopStore(store: RiskSopStore) {
  riskSopStore = store;
}

export function resetRiskSopStore() {
  return Promise.resolve(riskSopStore.clear());
}

function signalSummary(event: RiskEvent) {
  const levelCopy = {
    medium: "中风险",
    high: "高风险",
    urgent: "紧急风险",
  } satisfies Record<RiskLevel, string>;

  const sourceCopy = {
    assessment: "心理测评",
    counseling_intake: "咨询前信息",
    chat: "对话",
    operator: "运营标记",
  } satisfies Record<RiskEvent["source"], string>;

  return `${sourceCopy[event.source]}触发${levelCopy[event.riskLevel]}复核`;
}

function sopHints(event: RiskEvent, template?: RiskSopTemplate) {
  if (template) return template.steps.map(step => step.description);

  if (event.riskLevel === "urgent") {
    return [
      "优先确认用户当前安全状态，必要时升级给具备危机干预资质的负责人。",
      "复核记录只写处理摘要，不粘贴用户敏感原文。",
      "如已联系用户，应记录联系结果、下一步安排和是否建议线下急救资源。",
    ];
  }

  if (event.riskLevel === "high") {
    return [
      "建议在工作时间内完成首次复核，并判断是否需要推荐咨询。",
      "复核记录只写运营处理结论，不粘贴测评答案或咨询前说明全文。",
      "若风险持续升高，可升级处理并转入更高优先级队列。",
    ];
  }

  return [
    "核对风险来源和用户近期服务状态，判断是否需要继续观察。",
    "复核记录保持摘要化，避免扩散用户敏感内容。",
    "如已完成初步判断，可标记已解决并保留处理备注。",
  ];
}

async function userSummary(event: RiskEvent) {
  if (!event.userId) return {};
  const user = (await listAuthUsers()).find(item => item.id === event.userId);
  return {
    id: event.userId,
    displayName: user?.displayName,
    phoneMasked: user?.phoneMasked,
  };
}

async function relatedObject(event: RiskEvent, now: string) {
  if (!event.userId) return undefined;

  if (event.source === "assessment") {
    const latest = await getLatestAssessmentResult(event.userId);
    if (latest?.riskEvent?.id === event.id) {
      return {
        type: "assessment_report" as const,
        id: latest.report.id,
        status: latest.report.riskLevel,
        occurredAt: latest.report.createdAt,
        summary: `测评报告风险等级：${latest.report.riskLevel}`,
      };
    }
  }

  if (event.source === "counseling_intake") {
    const records = await listCounselingAppointmentRecords(event.userId, now);
    const record = records.find(item => item.riskEvent?.id === event.id);
    if (record) {
      return {
        type: "counseling_appointment" as const,
        id: record.appointment.id,
        status: record.appointment.status,
        occurredAt: record.appointment.createdAt,
        summary: `${record.counselor.name} ${record.appointment.channel} 咨询`,
      };
    }
  }

  return undefined;
}

async function toRiskAdminListItem({
  event,
  records,
  now,
}: {
  event: RiskEvent;
  records: RiskAdminReviewRecord[];
  now: string;
}): Promise<RiskAdminListItem> {
  return RiskAdminListItemSchema.parse({
    id: event.id,
    user: await userSummary(event),
    source: event.source,
    riskLevel: event.riskLevel,
    status: event.status,
    reviewerId: event.reviewerId,
    createdAt: event.createdAt,
    resolvedAt: event.resolvedAt,
    signalSummary: signalSummary(event),
    relatedObject: await relatedObject(event, now),
    latestRecord: records[0],
    recordCount: records.length,
  });
}

function riskMatchesQuery(item: RiskAdminListItem, query: RiskAdminListQuery) {
  if (query.riskLevel !== ALL_RISK_ADMIN_LEVEL) {
    if (item.riskLevel !== query.riskLevel) return false;
  }

  if (query.status !== ALL_RISK_ADMIN_STATUS) {
    if (item.status !== query.status) return false;
  }

  if (query.source !== ALL_RISK_ADMIN_SOURCE) {
    if (item.source !== query.source) return false;
  }

  if (query.keyword) {
    const keyword = query.keyword.toLowerCase();
    const searchable = [
      item.id,
      item.user.id,
      item.user.displayName,
      item.user.phoneMasked,
      item.signalSummary,
      item.relatedObject?.id,
      item.relatedObject?.summary,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!searchable.includes(keyword)) return false;
  }

  return true;
}

function sortRiskItems(
  items: RiskAdminListItem[],
  sort: RiskAdminListQuery["sort"]
) {
  return [...items].sort((left, right) => {
    if (sort === "risk_level_desc") {
      const riskDelta =
        riskLevelRank[right.riskLevel] - riskLevelRank[left.riskLevel];
      if (riskDelta !== 0) return riskDelta;
    }

    if (sort === "status_priority_desc") {
      const statusDelta =
        statusPriority[right.status] - statusPriority[left.status];
      if (statusDelta !== 0) return statusDelta;
      const riskDelta =
        riskLevelRank[right.riskLevel] - riskLevelRank[left.riskLevel];
      if (riskDelta !== 0) return riskDelta;
    }

    return Date.parse(right.createdAt) - Date.parse(left.createdAt);
  });
}

function buildRiskSummary(items: RiskAdminListItem[]) {
  return {
    totalCount: items.length,
    openCount: items.filter(item => item.status === "open").length,
    reviewingCount: items.filter(item => item.status === "reviewing").length,
    escalatedCount: items.filter(item => item.status === "escalated").length,
    resolvedCount: items.filter(item => item.status === "resolved").length,
    urgentCount: items.filter(item => item.riskLevel === "urgent").length,
    highCount: items.filter(item => item.riskLevel === "high").length,
    needsActionCount: items.filter(item => item.status !== "resolved").length,
  };
}

async function buildRiskAdminItems(now: string) {
  const [events, records] = await Promise.all([
    listAllRiskEvents(),
    riskReviewStore.listAllRecords(),
  ]);
  const recordsByRiskId = new Map<string, RiskAdminReviewRecord[]>();
  records.forEach(record => {
    recordsByRiskId.set(record.riskEventId, [
      ...(recordsByRiskId.get(record.riskEventId) ?? []),
      record,
    ]);
  });

  return Promise.all(
    events.map(event =>
      toRiskAdminListItem({
        event,
        records: recordsByRiskId.get(event.id) ?? [],
        now,
      })
    )
  );
}

async function buildRiskAdminListResult(
  query: RiskAdminListQuery,
  now: string
) {
  const items = await buildRiskAdminItems(now);
  const matchedItems = sortRiskItems(
    items.filter(item => riskMatchesQuery(item, query)),
    query.sort
  );
  const totalPages = Math.ceil(matchedItems.length / query.pageSize);
  const start = (query.page - 1) * query.pageSize;

  return RiskAdminListResultSchema.parse({
    items: matchedItems.slice(start, start + query.pageSize),
    summary: buildRiskSummary(matchedItems),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total: matchedItems.length,
      totalPages,
    },
    query,
    privacyNotice,
    generatedAt: now,
  });
}

async function buildRiskAdminDetail(
  event: RiskEvent,
  now: string
): Promise<RiskAdminDetail> {
  const [records, templates, escalations] = await Promise.all([
    riskReviewStore.listRecords(event.id),
    riskSopStore.listTemplates(),
    riskSopStore.listEscalations(),
  ]);
  const item = await toRiskAdminListItem({ event, records, now });
  const sopTemplate = findRiskSopTemplateForEvent(event, templates);
  const escalation = escalations.find(item => item.riskEventId === event.id);

  return RiskAdminDetailSchema.parse({
    event: item,
    records,
    sopHints: sopHints(event, sopTemplate),
    sopTemplate,
    escalation,
    privacyNotice,
    generatedAt: now,
  });
}

function nextRiskStatus(
  event: RiskEvent,
  action: RiskAdminAction
): RiskEventStatus | undefined {
  if (event.status === "resolved") return undefined;

  if (action === "start_review") {
    return event.status === "open" ? "reviewing" : undefined;
  }

  if (action === "mark_contacted" || action === "recommend_counseling") {
    return event.status === "open" ? "reviewing" : event.status;
  }

  if (action === "escalate") return "escalated";
  if (action === "resolve") return "resolved";
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
    riskLevel: stringValue(record.riskLevel),
    status: stringValue(record.status),
    source: stringValue(record.source),
    keyword: stringValue(record.keyword),
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

function escalationPriorityForEvent(
  event: RiskEvent,
  escalation?: RiskAdminEscalationRequest
): RiskEscalationQueueItem["priority"] {
  if (escalation?.priority) return escalation.priority;
  return event.riskLevel === "urgent" ? "urgent" : "high";
}

async function activeSopTemplateForAction(
  event: RiskEvent,
  request: {
    sopTemplateId?: string;
    resultTemplateId?: string;
    action: RiskAdminAction;
  }
) {
  const templates = await riskSopStore.listTemplates();
  const template = request.sopTemplateId
    ? templates.find(item => item.id === request.sopTemplateId)
    : findRiskSopTemplateForEvent(event, templates);

  if (!template) return { templates };
  if (!template.enabled) return { templates, template, disabled: true };

  const resultTemplate = request.resultTemplateId
    ? template.resultTemplates.find(
        item => item.id === request.resultTemplateId
      )
    : undefined;

  if (request.resultTemplateId && !resultTemplate) {
    return { templates, template, missingResultTemplate: true };
  }

  if (resultTemplate && resultTemplate.action !== request.action) {
    return { templates, template, resultTemplateActionMismatch: true };
  }

  return { templates, template, resultTemplate };
}

function nextTemplateVersion(version: string) {
  const match = version.match(/^(.*?)(\d+)$/);
  if (!match) return `${version}.1`;
  return `${match[1]}${Number(match[2]) + 1}`;
}

export async function getRiskAdminListPayload(
  actor: RiskAdminActor | null | undefined,
  rawQuery: Record<string, unknown>,
  now = new Date().toISOString()
) {
  const denied = denyUnauthorizedActor(actor);
  if (denied) return denied;

  const queryResult = RiskAdminListQuerySchema.safeParse(rawQuery);
  if (!queryResult.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "风险复核查询参数不合法"),
    } as const;
  }

  return {
    status: 200,
    body: RiskAdminListResponseSchema.parse({
      ok: true,
      data: await buildRiskAdminListResult(queryResult.data, now),
    }),
  } as const;
}

export async function getRiskAdminDetailPayload(
  actor: RiskAdminActor | null | undefined,
  riskEventId: string,
  now = new Date().toISOString()
) {
  const denied = denyUnauthorizedActor(actor);
  if (denied) return denied;

  const event = await getRiskEvent(riskEventId);
  if (!event) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "风险事件不存在"),
    } as const;
  }

  return {
    status: 200,
    body: RiskAdminDetailResponseSchema.parse({
      ok: true,
      data: await buildRiskAdminDetail(event, now),
    }),
  } as const;
}

export async function updateRiskAdminEventPayload(
  actor: RiskAdminActor | null | undefined,
  riskEventId: string,
  rawBody: unknown,
  now = new Date().toISOString()
) {
  const denied = denyUnauthorizedActor(actor, RISK_ADMIN_PERMISSIONS.review);
  if (denied) return denied;
  if (!actor) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", "请先登录后处理风险事件"),
    } as const;
  }

  const requestResult = RiskAdminActionRequestSchema.safeParse(rawBody);
  if (!requestResult.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "风险复核处理参数不合法"),
    } as const;
  }

  const event = await getRiskEvent(riskEventId);
  if (!event) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "风险事件不存在"),
    } as const;
  }

  const nextStatus = nextRiskStatus(event, requestResult.data.action);
  if (!nextStatus) {
    return {
      status: 409,
      body: errorPayload("CONFLICT", "当前风险状态不允许执行该处理动作"),
    } as const;
  }

  const sopContext = await activeSopTemplateForAction(
    event,
    requestResult.data
  );
  if (sopContext.disabled) {
    return {
      status: 409,
      body: errorPayload("CONFLICT", "所选风险 SOP 模板已停用"),
    } as const;
  }
  if (sopContext.missingResultTemplate) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "所选处理结果模板不存在"),
    } as const;
  }
  if (sopContext.resultTemplateActionMismatch) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "所选处理结果模板不匹配当前动作"),
    } as const;
  }

  const nextEvent = await saveRiskEvent(
    RiskEventSchema.parse({
      ...event,
      status: nextStatus,
      reviewerId: actor.id,
      resolvedAt: nextStatus === "resolved" ? now : undefined,
    })
  );

  let escalation: RiskEscalationQueueItem | undefined;
  if (requestResult.data.action === "escalate") {
    const existingEscalation = (await riskSopStore.listEscalations()).find(
      item => item.riskEventId === event.id
    );
    const nextEscalation = RiskEscalationQueueItemSchema.parse({
      id: `risk_escalation_${Date.parse(now)}_${randomUUID().slice(0, 8)}`,
      riskEventId: event.id,
      userId: event.userId,
      priority: escalationPriorityForEvent(
        event,
        requestResult.data.escalation
      ),
      status: requestResult.data.escalation?.ownerId
        ? "assigned"
        : "pending_assignment",
      ownerId: requestResult.data.escalation?.ownerId,
      reason: requestResult.data.escalation?.reason ?? requestResult.data.note,
      createdAt: now,
    });
    escalation = await riskSopStore.upsertEscalation(nextEscalation, {
      actorId: actor.id,
      actorRoles: actor.roles,
      action: "escalate",
      reason: nextEscalation.reason,
      before: existingEscalation,
      after: nextEscalation,
      occurredAt: now,
    });
  } else if (requestResult.data.action === "resolve") {
    const existingEscalation = (await riskSopStore.listEscalations()).find(
      item => item.riskEventId === event.id && item.status !== "resolved"
    );
    if (existingEscalation) {
      const nextEscalation = RiskEscalationQueueItemSchema.parse({
        ...existingEscalation,
        status: "resolved",
        resolvedAt: now,
      });
      escalation = await riskSopStore.upsertEscalation(nextEscalation, {
        actorId: actor.id,
        actorRoles: actor.roles,
        action: "resolve",
        reason: requestResult.data.note,
        before: existingEscalation,
        after: nextEscalation,
        occurredAt: now,
      });
    }
  }

  const record = await riskReviewStore.appendRecord(
    RiskAdminReviewRecordSchema.parse({
      id: `risk_review_${Date.parse(now)}_${randomUUID().slice(0, 8)}`,
      riskEventId: event.id,
      userId: event.userId,
      action: requestResult.data.action,
      actorId: actor.id,
      actorRoles: actor.roles,
      previousStatus: event.status,
      nextStatus,
      note: requestResult.data.note,
      sopTemplateId: sopContext.template?.id,
      sopTemplateVersion: sopContext.template?.version,
      resultTemplateId: sopContext.resultTemplate?.id,
      escalation,
      createdAt: now,
    })
  );

  return {
    status: 200,
    body: RiskAdminMutationResponseSchema.parse({
      ok: true,
      data: {
        detail: await buildRiskAdminDetail(nextEvent, now),
        record,
        serverTime: now,
      },
    }),
  } as const;
}

export async function getRiskSopConsolePayload(
  actor: RiskAdminActor | null | undefined,
  now = new Date().toISOString()
) {
  const denied = denyUnauthorizedActor(actor);
  if (denied) return denied;

  return {
    status: 200,
    body: RiskSopConsoleResponseSchema.parse({
      ok: true,
      data: {
        templates: await riskSopStore.listTemplates(),
        escalationQueue: await riskSopStore.listEscalations(),
        privacyNotice,
        generatedAt: now,
      },
    }),
  } as const;
}

export async function updateRiskSopTemplatePayload(
  actor: RiskAdminActor | null | undefined,
  templateId: string,
  rawBody: unknown,
  now = new Date().toISOString()
) {
  const denied = denyUnauthorizedActor(actor, RISK_ADMIN_PERMISSIONS.sop);
  if (denied) return denied;
  if (!actor) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", "请先登录后维护风险 SOP 模板"),
    } as const;
  }

  const requestResult = RiskSopTemplateUpdateRequestSchema.safeParse(rawBody);
  if (!requestResult.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "风险 SOP 模板参数不合法"),
    } as const;
  }

  const templates = await riskSopStore.listTemplates();
  const template = templates.find(item => item.id === templateId);
  if (!template) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "风险 SOP 模板不存在"),
    } as const;
  }

  const parsedNextTemplate = RiskSopTemplateSchema.parse({
    ...template,
    ...Object.fromEntries(
      Object.entries(requestResult.data).filter(([key]) => key !== "reason")
    ),
    version: nextTemplateVersion(template.version),
    updatedAt: now,
  });
  const nextTemplate = await riskSopStore.saveTemplate(parsedNextTemplate, {
    actorId: actor.id,
    actorRoles: actor.roles,
    action: "update",
    reason: requestResult.data.reason,
    before: template,
    after: parsedNextTemplate,
    occurredAt: now,
  });

  return {
    status: 200,
    body: RiskSopTemplateMutationResponseSchema.parse({
      ok: true,
      data: {
        template: nextTemplate,
        templates: await riskSopStore.listTemplates(),
        serverTime: now,
      },
    }),
  } as const;
}

export function registerRiskAdminApi(app: Express) {
  app.get("/api/risk/admin/sop", async (req: Request, res: Response) => {
    const session = await getLoginSessionFromRequest(req);
    const payload = await getRiskSopConsolePayload(session?.user);
    sendJson(res, payload.status, payload.body);
  });

  app.patch(
    "/api/risk/admin/sop/templates/:templateId",
    async (req: Request, res: Response) => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await updateRiskSopTemplatePayload(
        session?.user,
        req.params.templateId,
        req.body
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.get("/api/risk/admin/events", async (req: Request, res: Response) => {
    const session = await getLoginSessionFromRequest(req);
    const payload = await getRiskAdminListPayload(
      session?.user,
      queryFromExpress(req)
    );
    sendJson(res, payload.status, payload.body);
  });

  app.get(
    "/api/risk/admin/events/:riskEventId",
    async (req: Request, res: Response) => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getRiskAdminDetailPayload(
        session?.user,
        req.params.riskEventId
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.patch(
    "/api/risk/admin/events/:riskEventId/actions",
    async (req: Request, res: Response) => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await updateRiskAdminEventPayload(
        session?.user,
        req.params.riskEventId,
        req.body
      );
      sendJson(res, payload.status, payload.body);
    }
  );
}

export function handleRiskAdminApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  if (!req.url || !req.url.startsWith("/api/risk/admin")) return false;

  const url = new URL(req.url, "http://localhost");

  if (req.method === "GET" && url.pathname === "/api/risk/admin/sop") {
    void (async () => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getRiskSopConsolePayload(session?.user);
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "风险 SOP 读取失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "风险 SOP 读取失败"));
    });
    return true;
  }

  const sopTemplateMatch = url.pathname.match(
    /^\/api\/risk\/admin\/sop\/templates\/([^/]+)$/
  );
  if (req.method === "PATCH" && sopTemplateMatch?.[1]) {
    void readRequestBody(req)
      .then(async body => {
        const session = await getLoginSessionFromRequest(req);
        const payload = await updateRiskSopTemplatePayload(
          session?.user,
          decodeURIComponent(sopTemplateMatch[1]),
          body
        );
        sendJson(res, payload.status, payload.body);
      })
      .catch(err => {
        console.error(err instanceof Error ? err.message : "风险 SOP 保存失败");
        sendJson(res, 500, errorPayload("INTERNAL_ERROR", "风险 SOP 保存失败"));
      });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/risk/admin/events") {
    void (async () => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getRiskAdminListPayload(
        session?.user,
        queryFromSearchParams(url.searchParams)
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(
        err instanceof Error ? err.message : "风险复核列表读取失败"
      );
      sendJson(
        res,
        500,
        errorPayload("INTERNAL_ERROR", "风险复核列表读取失败")
      );
    });
    return true;
  }

  const detailMatch = url.pathname.match(
    /^\/api\/risk\/admin\/events\/([^/]+)$/
  );
  if (req.method === "GET" && detailMatch?.[1]) {
    void (async () => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getRiskAdminDetailPayload(
        session?.user,
        decodeURIComponent(detailMatch[1])
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(
        err instanceof Error ? err.message : "风险复核详情读取失败"
      );
      sendJson(
        res,
        500,
        errorPayload("INTERNAL_ERROR", "风险复核详情读取失败")
      );
    });
    return true;
  }

  const actionMatch = url.pathname.match(
    /^\/api\/risk\/admin\/events\/([^/]+)\/actions$/
  );
  if (req.method === "PATCH" && actionMatch?.[1]) {
    void readRequestBody(req)
      .then(async body => {
        const session = await getLoginSessionFromRequest(req);
        const payload = await updateRiskAdminEventPayload(
          session?.user,
          decodeURIComponent(actionMatch[1]),
          body
        );
        sendJson(res, payload.status, payload.body);
      })
      .catch(err => {
        console.error(err instanceof Error ? err.message : "风险复核处理失败");
        sendJson(res, 500, errorPayload("INTERNAL_ERROR", "风险复核处理失败"));
      });
    return true;
  }

  sendJson(res, 404, errorPayload("NOT_FOUND", "风险复核接口不存在"));
  return true;
}
