import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import {
  ApiResponseSchema,
  CourseAccessStateSchema,
  UserAdminDetailSchema,
  UserAdminListItemSchema,
  UserAdminListQuerySchema,
  UserAdminListResultSchema,
  USER_ADMIN_PERMISSIONS,
  hasActiveCourseMembership,
  userCan,
  type CourseAccessState,
  type LoginSession,
  type UserAdminDetail,
  type UserAdminListItem,
  type UserAdminListQuery,
  type UserAdminListResult,
  type UserConsent,
  type UserProfile,
} from "../../../shared/domain";
import {
  getLoginSessionFromRequest,
  getUserConsents,
  listAuthUsers,
} from "../auth/authSessionApi";
import {
  listCourseAccessUserStates,
  loadCourseAccessState,
} from "../courses/courseAccessApi";
import {
  listCounselingAppointmentRecords,
  listCounselingAppointmentUserIds,
} from "../counseling/counselingApi";
import { listRiskEventsByUser } from "../risk/riskEventStore";

type AdminUserActor = Pick<LoginSession["user"], "id" | "roles">;
type DirectoryUser = {
  profile: UserProfile;
  seedCourseAccess?: CourseAccessState;
  seedConsents?: UserConsent[];
};

const UserAdminListResponseSchema = ApiResponseSchema(UserAdminListResultSchema);
const UserAdminDetailResponseSchema = ApiResponseSchema(UserAdminDetailSchema);

const activeRiskStatuses = new Set(["open", "reviewing", "escalated"]);
const riskRank = {
  medium: 1,
  high: 2,
  urgent: 3,
};

const fallbackUsers: DirectoryUser[] = [
  {
    profile: {
      id: "u_demo_active_member",
      displayName: "陈静怡",
      phoneMasked: "138****2049",
      roles: ["member"],
      isMinor: false,
      createdAt: "2026-05-01T09:00:00+08:00",
      updatedAt: "2026-05-12T09:20:00+08:00",
    },
    seedCourseAccess: CourseAccessStateSchema.parse({
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
    seedConsents: [
      {
        userId: "u_demo_active_member",
        type: "terms",
        version: "2026.05",
        acceptedAt: "2026-05-01T09:00:00+08:00",
      },
      {
        userId: "u_demo_active_member",
        type: "privacy",
        version: "2026.05",
        acceptedAt: "2026-05-01T09:00:00+08:00",
      },
    ],
  },
  {
    profile: {
      id: "u_demo_course_buyer",
      displayName: "用户159****8732",
      phoneMasked: "159****8732",
      roles: ["member"],
      isMinor: false,
      createdAt: "2026-05-03T14:30:00+08:00",
      updatedAt: "2026-05-10T18:10:00+08:00",
    },
    seedCourseAccess: CourseAccessStateSchema.parse({
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
    profile: {
      id: "u_demo_minor_guardian",
      displayName: "青少年支持账号",
      phoneMasked: "186****5512",
      roles: ["member"],
      isMinor: true,
      guardianVerifiedAt: "2026-05-04T11:00:00+08:00",
      createdAt: "2026-05-04T10:45:00+08:00",
      updatedAt: "2026-05-08T16:40:00+08:00",
    },
    seedCourseAccess: CourseAccessStateSchema.parse({
      ownedCourseIds: [],
      membership: {
        status: "expired",
        planName: "成长会员",
        activatedAt: "2025-05-04T11:00:00+08:00",
        expiresAt: "2026-05-04T11:00:00+08:00",
      },
      orders: [],
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
  code: "BAD_REQUEST" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "INTERNAL_ERROR",
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
  actor: AdminUserActor | null | undefined
):
  | {
      status: 401 | 403;
      body: ReturnType<typeof errorPayload>;
    }
  | undefined {
  if (!actor) {
    return {
      status: 401,
      body: errorPayload("UNAUTHORIZED", "请先登录后查看用户会员"),
    };
  }

  if (!userCan(actor, USER_ADMIN_PERMISSIONS.read)) {
    return {
      status: 403,
      body: errorPayload("FORBIDDEN", "当前账号暂无用户会员读取权限"),
    };
  }

  return undefined;
}

function maxDateTime(values: Array<string | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
}

function hasCourseAccessData(state: CourseAccessState) {
  return (
    state.ownedCourseIds.length > 0 ||
    state.orders.length > 0 ||
    state.membership.status !== "none"
  );
}

function effectiveMembershipStatus(
  state: CourseAccessState,
  now: string
): UserAdminListItem["membershipStatus"] {
  if (state.membership.status !== "active") return state.membership.status;
  return hasActiveCourseMembership(state.membership, now) ? "active" : "expired";
}

function createSyntheticUser(userId: string, now: string): UserProfile {
  return {
    id: userId,
    displayName: `用户 ${userId}`,
    roles: ["member"],
    isMinor: false,
    createdAt: now,
    updatedAt: now,
  };
}

function shouldUseFallbackUsers(
  authUsers: UserProfile[],
  courseAccessUsers: Array<{ userId: string; state: CourseAccessState }>,
  counselingUserIds: string[]
) {
  return (
    authUsers.length === 0 &&
    courseAccessUsers.length === 0 &&
    counselingUserIds.length === 0
  );
}

async function listDirectoryUsers(now: string): Promise<DirectoryUser[]> {
  const [authUsers, courseAccessUsers, counselingUserIds] = await Promise.all([
    listAuthUsers(),
    listCourseAccessUserStates(),
    listCounselingAppointmentUserIds(now),
  ]);

  if (shouldUseFallbackUsers(authUsers, courseAccessUsers, counselingUserIds)) {
    return fallbackUsers;
  }

  const users = new Map<string, DirectoryUser>();
  for (const profile of authUsers) {
    users.set(profile.id, { profile });
  }

  for (const item of courseAccessUsers) {
    const current = users.get(item.userId);
    users.set(item.userId, {
      profile: current?.profile ?? createSyntheticUser(item.userId, now),
      seedCourseAccess: current?.seedCourseAccess,
      seedConsents: current?.seedConsents,
    });
  }

  for (const userId of counselingUserIds) {
    if (!users.has(userId)) {
      users.set(userId, { profile: createSyntheticUser(userId, now) });
    }
  }

  return Array.from(users.values());
}

async function resolveCourseAccessForUser(
  userId: string,
  seedCourseAccess: CourseAccessState | undefined
) {
  const state = await loadCourseAccessState(userId);
  if (!hasCourseAccessData(state) && seedCourseAccess) return seedCourseAccess;
  return state;
}

async function buildUserListItem(
  directoryUser: DirectoryUser,
  now: string
): Promise<UserAdminListItem> {
  const { profile } = directoryUser;
  const [courseAccess, counseling, risks] = await Promise.all([
    resolveCourseAccessForUser(profile.id, directoryUser.seedCourseAccess),
    listCounselingAppointmentRecords(profile.id, now),
    listRiskEventsByUser(profile.id),
  ]);
  const membershipStatus = effectiveMembershipStatus(courseAccess, now);
  const latestOrder = [...courseAccess.orders].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  )[0];
  const activeRiskCount = risks.filter(risk =>
    activeRiskStatuses.has(risk.status)
  ).length;
  const lastActivityAt = maxDateTime([
    profile.updatedAt,
    ...courseAccess.orders.map(order => order.paidAt ?? order.createdAt),
    ...counseling.map(record => record.appointment.updatedAt),
    ...risks.map(risk => risk.createdAt),
  ]);

  return UserAdminListItemSchema.parse({
    id: profile.id,
    displayName: profile.displayName,
    phoneMasked: profile.phoneMasked,
    roles: profile.roles,
    membershipStatus,
    membershipPlanName: courseAccess.membership.planName,
    membershipExpiresAt: courseAccess.membership.expiresAt,
    ownedCourseCount: courseAccess.ownedCourseIds.length,
    orderCount: courseAccess.orders.length,
    counselingAppointmentCount: counseling.length,
    activeRiskCount,
    latestOrderStatus: latestOrder?.status,
    lastActivityAt,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    privacyFlags: {
      isMinor: profile.isMinor,
      guardianVerified: Boolean(profile.guardianVerifiedAt),
      phoneMasked: Boolean(profile.phoneMasked),
    },
  });
}

function userMatchesQuery(user: UserAdminListItem, query: UserAdminListQuery) {
  if (query.role !== "all" && !user.roles.includes(query.role)) return false;
  if (
    query.membershipStatus !== "all" &&
    user.membershipStatus !== query.membershipStatus
  ) {
    return false;
  }

  if (!query.keyword) return true;

  const keyword = query.keyword.toLowerCase();
  return [
    user.id,
    user.displayName,
    user.phoneMasked,
    user.membershipPlanName,
    user.roles.join(" "),
  ].some(value => value?.toLowerCase().includes(keyword));
}

function sortUsers(users: UserAdminListItem[], sort: UserAdminListQuery["sort"]) {
  return [...users].sort((a, b) => {
    if (sort === "created_desc") {
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    }
    if (sort === "updated_desc") {
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    }
    return (
      Date.parse(b.lastActivityAt ?? b.updatedAt) -
      Date.parse(a.lastActivityAt ?? a.updatedAt)
    );
  });
}

function buildSummary(users: UserAdminListItem[]) {
  return {
    totalCount: users.length,
    activeMembershipCount: users.filter(
      user => user.membershipStatus === "active"
    ).length,
    expiredMembershipCount: users.filter(
      user => user.membershipStatus === "expired"
    ).length,
    minorCount: users.filter(user => user.privacyFlags.isMinor).length,
    activeRiskCount: users.reduce(
      (total, user) => total + user.activeRiskCount,
      0
    ),
  };
}

function buildFilters(users: UserAdminListItem[]) {
  return {
    roles: Array.from(new Set(users.flatMap(user => user.roles))).sort(),
    membershipStatuses: Array.from(
      new Set(users.map(user => user.membershipStatus))
    ).sort(),
  };
}

function paginateUsers(users: UserAdminListItem[], query: UserAdminListQuery) {
  const total = users.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / query.pageSize);
  const start = (query.page - 1) * query.pageSize;
  return {
    items: users.slice(start, start + query.pageSize),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages,
    },
  };
}

async function buildUserListResult(
  query: UserAdminListQuery,
  now: string
): Promise<UserAdminListResult> {
  const directoryUsers = await listDirectoryUsers(now);
  const users = await Promise.all(
    directoryUsers.map(directoryUser => buildUserListItem(directoryUser, now))
  );
  const filtered = users.filter(user => userMatchesQuery(user, query));
  const sorted = sortUsers(filtered, query.sort);
  const page = paginateUsers(sorted, query);

  return UserAdminListResultSchema.parse({
    items: page.items,
    meta: page.meta,
    summary: buildSummary(users),
    filters: buildFilters(users),
    query,
    serverTime: now,
  });
}

function recentOrders(courseAccess: CourseAccessState) {
  return [...courseAccess.orders]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 6)
    .map(order => ({
      id: order.id,
      status: order.status,
      itemTypes: Array.from(new Set(order.items.map(item => item.type))),
      title: order.items[0]?.title ?? "订单",
      payableAmount: order.payableAmount,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
    }));
}

async function buildUserDetail(
  directoryUser: DirectoryUser,
  now: string
): Promise<UserAdminDetail> {
  const user = await buildUserListItem(directoryUser, now);
  const [courseAccess, counseling, risks, consents] = await Promise.all([
    resolveCourseAccessForUser(user.id, directoryUser.seedCourseAccess),
    listCounselingAppointmentRecords(user.id, now),
    listRiskEventsByUser(user.id),
    getUserConsents(user.id),
  ]);
  const activeRisks = risks.filter(risk => activeRiskStatuses.has(risk.status));
  const highestRisk = [...activeRisks].sort(
    (a, b) => riskRank[b.riskLevel] - riskRank[a.riskLevel]
  )[0];
  const upcomingCount = counseling.filter(record => {
    return (
      ["pending_payment", "scheduled"].includes(record.appointment.status) &&
      Date.parse(record.slot.startsAt) >= Date.parse(now)
    );
  }).length;

  return UserAdminDetailSchema.parse({
    user,
    consents:
      consents.length > 0
        ? consents.map(consent => ({
            type: consent.type,
            version: consent.version,
            acceptedAt: consent.acceptedAt,
          }))
        : (directoryUser.seedConsents ?? []).map(consent => ({
            type: consent.type,
            version: consent.version,
            acceptedAt: consent.acceptedAt,
          })),
    membership: {
      status: user.membershipStatus,
      planName: courseAccess.membership.planName,
      activatedAt: courseAccess.membership.activatedAt,
      expiresAt: courseAccess.membership.expiresAt,
      activeNow: hasActiveCourseMembership(courseAccess.membership, now),
    },
    courseAccess: {
      ownedCourseIds: courseAccess.ownedCourseIds,
      ownedCourseCount: courseAccess.ownedCourseIds.length,
      orderCount: courseAccess.orders.length,
      recentOrders: recentOrders(courseAccess),
    },
    counseling: {
      totalCount: counseling.length,
      upcomingCount,
      recentAppointments: counseling.slice(0, 6).map(record => ({
        appointmentId: record.appointment.id,
        status: record.appointment.status,
        counselorName: record.counselor.name,
        channel: record.appointment.channel,
        startsAt: record.slot.startsAt,
        createdAt: record.appointment.createdAt,
        orderStatus: record.order?.status,
        riskLevel: record.riskEvent?.riskLevel,
      })),
    },
    risk: {
      openCount: activeRisks.length,
      highestRiskLevel: highestRisk?.riskLevel,
      recentEvents: risks.slice(0, 6).map(risk => ({
        id: risk.id,
        source: risk.source,
        riskLevel: risk.riskLevel,
        status: risk.status,
        createdAt: risk.createdAt,
      })),
    },
    privacyNotice:
      "用户后台仅展示运营所需摘要：手机号为脱敏值，咨询说明、测评答案和风险信号原文不在此视图暴露。",
    generatedAt: now,
  });
}

export async function getAdminUserListPayload(
  actor: AdminUserActor | null | undefined,
  rawQuery: Record<string, unknown>,
  now = new Date().toISOString()
) {
  const denied = denyUnauthorizedActor(actor);
  if (denied) return denied;

  const queryResult = UserAdminListQuerySchema.safeParse(rawQuery);
  if (!queryResult.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "用户会员查询参数不合法"),
    } as const;
  }

  return {
    status: 200,
    body: UserAdminListResponseSchema.parse({
      ok: true,
      data: await buildUserListResult(queryResult.data, now),
    }),
  } as const;
}

export async function getAdminUserDetailPayload(
  actor: AdminUserActor | null | undefined,
  userId: string,
  now = new Date().toISOString()
) {
  const denied = denyUnauthorizedActor(actor);
  if (denied) return denied;

  const directoryUser = (await listDirectoryUsers(now)).find(
    user => user.profile.id === userId
  );
  if (!directoryUser) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "用户不存在或暂未进入后台目录"),
    } as const;
  }

  return {
    status: 200,
    body: UserAdminDetailResponseSchema.parse({
      ok: true,
      data: await buildUserDetail(directoryUser, now),
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
    role: stringValue(record.role),
    membershipStatus: stringValue(record.membershipStatus),
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

export function registerUserAdminApi(app: Express) {
  app.get("/api/users/admin/users", async (req: Request, res: Response) => {
    const session = await getLoginSessionFromRequest(req);
    const payload = await getAdminUserListPayload(
      session?.user,
      queryFromExpress(req)
    );
    sendJson(res, payload.status, payload.body);
  });

  app.get(
    "/api/users/admin/users/:userId",
    async (req: Request, res: Response) => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getAdminUserDetailPayload(
        session?.user,
        req.params.userId
      );
      sendJson(res, payload.status, payload.body);
    }
  );
}

export function handleUserAdminApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  if (!req.url || !req.url.startsWith("/api/users/admin")) return false;

  const url = new URL(req.url, "http://localhost");

  if (req.method === "GET" && url.pathname === "/api/users/admin/users") {
    void (async () => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getAdminUserListPayload(
        session?.user,
        queryFromSearchParams(url.searchParams)
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "用户会员列表读取失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "用户会员列表读取失败"));
    });
    return true;
  }

  const detailMatch = url.pathname.match(/^\/api\/users\/admin\/users\/([^/]+)$/);
  if (req.method === "GET" && detailMatch?.[1]) {
    void (async () => {
      const session = await getLoginSessionFromRequest(req);
      const payload = await getAdminUserDetailPayload(
        session?.user,
        decodeURIComponent(detailMatch[1])
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "用户会员详情读取失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "用户会员详情读取失败"));
    });
    return true;
  }

  sendJson(res, 404, errorPayload("NOT_FOUND", "用户会员接口不存在"));
  return true;
}
