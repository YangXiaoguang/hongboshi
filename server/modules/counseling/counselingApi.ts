import { randomUUID } from "crypto";
import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import {
  counselorProfiles,
  generateUpcomingCounselingSlots,
} from "../../../shared/data/counselingSeed";
import {
  ApiResponseSchema,
  CounselingAppointmentCreateRequestSchema,
  CounselingAppointmentCreateResultSchema,
  CounselingAppointmentListSchema,
  CounselingAvailabilitySchema,
  RiskEventSchema,
  type CounselingAppointment,
  type CounselingAppointmentCreateRequest,
  type CounselingAppointmentRecord,
  type CounselingSlot,
  type RiskEvent,
} from "../../../shared/domain";
import { getLoginSessionFromRequest } from "../auth/authSessionApi";

const CounselingAvailabilityResponseSchema = ApiResponseSchema(
  CounselingAvailabilitySchema
);
const CounselingAppointmentCreateResponseSchema = ApiResponseSchema(
  CounselingAppointmentCreateResultSchema
);
const CounselingAppointmentListResponseSchema = ApiResponseSchema(
  CounselingAppointmentListSchema
);

const appointmentStore = new Map<string, CounselingAppointment>();
const appointmentRiskEventStore = new Map<string, RiskEvent>();
let slotStore = new Map(
  generateUpcomingCounselingSlots().map(slot => [slot.id, slot])
);

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
  };
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
      "请在 30 分钟内完成支付以保留时段，后续可继续接入改期与取消流程。",
      "若状态突然恶化，请优先获得现实中的即时帮助。",
    ];
  }

  return [
    "请在 30 分钟内完成支付以保留时段，支付能力会在后续迭代接入。",
    "咨询师会在服务前查看你填写的困扰重点和补充说明。",
    "预约确认后，可在个人中心查看咨询记录和后续跟进建议。",
  ];
}

export function resetCounselingAppointmentStore(now = new Date()) {
  appointmentStore.clear();
  appointmentRiskEventStore.clear();
  slotStore = new Map(
    generateUpcomingCounselingSlots({ now }).map(slot => [slot.id, slot])
  );
}

export function getCounselingAvailabilityPayload(
  now = new Date().toISOString()
) {
  return CounselingAvailabilityResponseSchema.parse({
    ok: true,
    data: {
      counselors: counselorProfiles,
      slots: Array.from(slotStore.values()),
      serverTime: now,
    },
  });
}

export function createCounselingAppointmentPayload(
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
  const counselor = counselorProfiles.find(
    item => item.id === request.counselorId
  );
  if (!counselor) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "咨询师不存在"),
    } as const;
  }

  const slot = slotStore.get(request.slotId);
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
  slotStore.set(slot.id, reservedSlot);

  const appointment: CounselingAppointment = {
    id: `appointment_${randomUUID()}`,
    userId,
    counselorId: counselor.id,
    slotId: slot.id,
    channel: request.channel,
    status: "pending_payment",
    concernTags: request.concernTags,
    noteForCounselor: request.noteForCounselor,
    createdAt: now,
    updatedAt: now,
  };
  appointmentStore.set(appointment.id, appointment);

  const riskEvent = resolveRiskEvent({ request, userId, now });
  if (riskEvent) appointmentRiskEventStore.set(appointment.id, riskEvent);

  return {
    status: 200,
    body: CounselingAppointmentCreateResponseSchema.parse({
      ok: true,
      data: {
        appointment,
        counselor,
        slot: reservedSlot,
        riskEvent,
        nextSteps: buildNextSteps(riskEvent),
      },
    }),
  } as const;
}

function appointmentToRecord(
  appointment: CounselingAppointment
): CounselingAppointmentRecord | undefined {
  const counselor = counselorProfiles.find(
    item => item.id === appointment.counselorId
  );
  const slot = slotStore.get(appointment.slotId);
  if (!counselor || !slot) return undefined;

  return {
    appointment,
    counselor,
    slot,
    riskEvent: appointmentRiskEventStore.get(appointment.id),
  };
}

export function listCounselingAppointmentsPayload(
  userId?: string,
  now = new Date().toISOString()
) {
  if (!userId) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", "请先登录后查看咨询预约"),
    } as const;
  }

  const appointments = Array.from(appointmentStore.values())
    .filter(appointment => appointment.userId === userId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map(appointmentToRecord)
    .filter((record): record is CounselingAppointmentRecord => Boolean(record));

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

export function registerCounselingApi(app: Express) {
  app.get("/api/counseling/availability", (_req: Request, res: Response) => {
    sendJson(res, 200, getCounselingAvailabilityPayload());
  });

  app.get("/api/counseling/appointments", (req: Request, res: Response) => {
    const session = getLoginSessionFromRequest(req);
    const payload = listCounselingAppointmentsPayload(session?.user.id);
    sendJson(res, payload.status, payload.body);
  });

  app.post("/api/counseling/appointments", (req: Request, res: Response) => {
    const session = getLoginSessionFromRequest(req);
    const payload = createCounselingAppointmentPayload(
      req.body,
      session?.user.id
    );
    sendJson(res, payload.status, payload.body);
  });
}

export function handleCounselingApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  if (!req.url || !req.url.startsWith("/api/counseling")) return false;

  const url = new URL(req.url, "http://localhost");

  if (req.method === "GET" && url.pathname === "/api/counseling/availability") {
    sendJson(res, 200, getCounselingAvailabilityPayload());
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/counseling/appointments") {
    const session = getLoginSessionFromRequest(req);
    const payload = listCounselingAppointmentsPayload(session?.user.id);
    sendJson(res, payload.status, payload.body);
    return true;
  }

  if (
    req.method === "POST" &&
    url.pathname === "/api/counseling/appointments"
  ) {
    void readRequestBody(req).then(body => {
      const session = getLoginSessionFromRequest(req);
      const payload = createCounselingAppointmentPayload(
        body,
        session?.user.id
      );
      sendJson(res, payload.status, payload.body);
    });
    return true;
  }

  sendJson(res, 404, errorPayload("NOT_FOUND", "咨询接口不存在"));
  return true;
}
