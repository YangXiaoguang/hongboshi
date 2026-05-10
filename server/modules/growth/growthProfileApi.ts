import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import {
  ApiResponseSchema,
  GrowthProfileSchema,
  hasActiveCourseMembership,
  type GrowthProfile,
  type GrowthTimelineItem,
  type Order,
} from "../../../shared/domain";
import { getLatestAssessmentResult } from "../assessments/assessmentApi";
import { getLoginSessionFromRequest } from "../auth/authSessionApi";
import { listCounselingAppointmentRecords } from "../counseling/counselingApi";
import { loadCourseAccessState } from "../courses/courseAccessApi";

const GrowthProfileResponseSchema = ApiResponseSchema(GrowthProfileSchema);

const activeAppointmentStatuses = new Set(["pending_payment", "scheduled"]);

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
  code: "UNAUTHORIZED" | "NOT_FOUND" | "INTERNAL_ERROR",
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

function orderTimelineItem(order: Order): GrowthTimelineItem {
  const title = order.items[0]?.title ?? "课程订单";

  return {
    id: `timeline_order_${order.id}`,
    type: "course_order",
    title,
    description: `支付与权益记录，共 ${order.items.length} 项`,
    occurredAt: order.paidAt ?? order.createdAt,
    status: order.status,
    targetUrl: "/me/courses",
  };
}

async function buildGrowthProfile(
  userId: string,
  now: string
): Promise<GrowthProfile> {
  const courseAccess = loadCourseAccessState(userId);
  const latestAssessment = await getLatestAssessmentResult(userId);
  const appointments = listCounselingAppointmentRecords(userId);
  const upcomingCounselingCount = appointments.filter(record => {
    return (
      activeAppointmentStatuses.has(record.appointment.status) &&
      Date.parse(record.slot.startsAt) >= Date.parse(now)
    );
  }).length;

  const timeline: GrowthTimelineItem[] = [
    ...courseAccess.orders.map(orderTimelineItem),
    ...appointments.map(record => ({
      id: `timeline_counseling_${record.appointment.id}`,
      type: "counseling" as const,
      title: `${record.counselor.name} · 咨询预约`,
      description: `${record.counselor.title} · ${record.appointment.channel}`,
      occurredAt: record.appointment.createdAt,
      status: record.appointment.status,
      targetUrl: "/consulting",
    })),
  ];

  if (latestAssessment) {
    timeline.push({
      id: `timeline_assessment_${latestAssessment.report.id}`,
      type: "assessment",
      title: "快速心理测评",
      description: latestAssessment.report.summary,
      occurredAt: latestAssessment.report.createdAt,
      status: latestAssessment.report.riskLevel,
      targetUrl: "/assessment",
    });
  }

  if (
    courseAccess.membership.status === "active" &&
    courseAccess.membership.activatedAt
  ) {
    timeline.push({
      id: `timeline_membership_${courseAccess.membership.activatedAt}`,
      type: "membership",
      title: courseAccess.membership.planName ?? "成长会员",
      description: "会员权益已开通",
      occurredAt: courseAccess.membership.activatedAt,
      status: courseAccess.membership.status,
      targetUrl: "/me/courses",
    });
  }

  timeline.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));

  return GrowthProfileSchema.parse({
    userId,
    courseAccess,
    latestAssessment,
    counseling: {
      appointments,
      serverTime: now,
    },
    summary: {
      ownedCourseCount: courseAccess.ownedCourseIds.length,
      orderCount: courseAccess.orders.length,
      counselingAppointmentCount: appointments.length,
      upcomingCounselingCount,
      hasActiveMembership: hasActiveCourseMembership(
        courseAccess.membership,
        now
      ),
      latestAssessmentRiskLevel: latestAssessment?.report.riskLevel,
      lastActivityAt: timeline[0]?.occurredAt,
    },
    timeline: timeline.slice(0, 12),
    generatedAt: now,
  });
}

export async function getGrowthProfilePayload(
  userId?: string,
  now = new Date().toISOString()
) {
  if (!userId) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", "请先登录后查看成长档案"),
    } as const;
  }

  return {
    status: 200,
    body: GrowthProfileResponseSchema.parse({
      ok: true,
      data: await buildGrowthProfile(userId, now),
    }),
  } as const;
}

export function registerGrowthProfileApi(app: Express) {
  app.get("/api/growth/profile", async (req: Request, res: Response) => {
    const session = getLoginSessionFromRequest(req);
    const payload = await getGrowthProfilePayload(session?.user.id);
    sendJson(res, payload.status, payload.body);
  });
}

export function handleGrowthProfileApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  if (!req.url || !req.url.startsWith("/api/growth")) return false;

  const url = new URL(req.url, "http://localhost");

  if (req.method === "GET" && url.pathname === "/api/growth/profile") {
    void (async () => {
      const session = getLoginSessionFromRequest(req);
      const payload = await getGrowthProfilePayload(session?.user.id);
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "成长档案读取失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "成长档案读取失败"));
    });
    return true;
  }

  sendJson(res, 404, errorPayload("NOT_FOUND", "成长档案接口不存在"));
  return true;
}
