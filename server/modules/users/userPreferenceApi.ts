import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import {
  ApiResponseSchema,
  UserPreferenceFavoriteUpdateRequestSchema,
  UserPreferenceCouponClaimRequestSchema,
  UserPreferenceCouponUseRequestSchema,
  UserPreferenceResultSchema,
  createEmptyUserPreference,
  claimUserCoupon,
  isCourseMarketingRuleActiveAt,
  updateUserFavoriteCourses,
  useUserCouponClaim,
  type UserPreference,
} from "../../../shared/domain";
import { authorizeRequest } from "../auth/authorization";
import {
  getCourseMarketingRuleStore,
  type CourseMarketingRuleStore,
} from "../marketing/courseMarketingRuleStore";
import {
  createDefaultUserPreferenceStore,
  type UserPreferenceStore,
} from "./userPreferenceStore";

const UserPreferenceResponseSchema = ApiResponseSchema(
  UserPreferenceResultSchema
);

let userPreferenceStore = createDefaultUserPreferenceStore();

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
  };
}

function preferencePayload(preference: UserPreference, generatedAt: string) {
  return UserPreferenceResponseSchema.parse({
    ok: true,
    data: {
      preference,
      generatedAt,
    },
  });
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

export function setUserPreferenceStore(store: UserPreferenceStore) {
  userPreferenceStore = store;
}

export function resetUserPreferenceStore(preference?: UserPreference) {
  return Promise.resolve(userPreferenceStore.reset(preference));
}

export async function getUserPreferencePayload(
  userId: string,
  now = new Date().toISOString()
) {
  const preference = await loadUserPreferenceForUser(userId, now);

  return {
    status: 200,
    body: preferencePayload(preference, now),
  } as const;
}

export async function loadUserPreferenceForUser(
  userId: string,
  now = new Date().toISOString()
) {
  return (
    (await userPreferenceStore.getByUserId(userId)) ??
    createEmptyUserPreference({ userId, now })
  );
}

export async function saveUserPreferenceForUser(preference: UserPreference) {
  return userPreferenceStore.save(preference);
}

export async function updateUserFavoriteCoursesPayload(
  userId: string,
  body: unknown,
  now = new Date().toISOString()
) {
  const parsed = UserPreferenceFavoriteUpdateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "收藏课程数据不合法"),
    } as const;
  }

  const current = await loadUserPreferenceForUser(userId, now);
  const preference = updateUserFavoriteCourses({
    preference: current,
    favoriteCourseIds: parsed.data.favoriteCourseIds,
    source: parsed.data.source,
    now,
  });
  const saved = await userPreferenceStore.save(preference);

  return {
    status: 200,
    body: preferencePayload(saved, now),
  } as const;
}

export async function claimUserCouponPayload(
  userId: string,
  body: unknown,
  now = new Date().toISOString(),
  marketingRuleStore: Pick<
    CourseMarketingRuleStore,
    "getRule"
  > = getCourseMarketingRuleStore()
) {
  const parsed = UserPreferenceCouponClaimRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "优惠券领取参数不合法"),
    } as const;
  }

  const rule = await marketingRuleStore.getRule(
    parsed.data.marketingRuleId,
    now
  );
  if (!rule || rule.type !== "course_coupon") {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "优惠券不存在或暂不可领取"),
    } as const;
  }

  if (!isCourseMarketingRuleActiveAt(rule, now)) {
    return {
      status: 409,
      body: errorPayload("CONFLICT", "优惠券已暂停或过期"),
    } as const;
  }

  const current = await loadUserPreferenceForUser(userId, now);
  const preference = claimUserCoupon({
    preference: current,
    marketingRuleId: rule.id,
    expiresAt: rule.endsAt,
    now,
  });
  const saved = await userPreferenceStore.save(preference);

  return {
    status: 200,
    body: preferencePayload(saved, now),
  } as const;
}

export async function useUserCouponForOrderPayload(
  userId: string,
  body: unknown,
  now = new Date().toISOString()
) {
  const parsed = UserPreferenceCouponUseRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "优惠券使用参数不合法"),
    } as const;
  }

  try {
    const current = await loadUserPreferenceForUser(userId, now);
    const preference = useUserCouponClaim({
      preference: current,
      couponClaimId: parsed.data.couponClaimId,
      orderId: parsed.data.orderId,
      now,
    });
    const saved = await saveUserPreferenceForUser(preference);

    return {
      status: 200,
      body: preferencePayload(saved, now),
    } as const;
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "USER_COUPON_CLAIM_NOT_FOUND") {
      return {
        status: 404,
        body: errorPayload("NOT_FOUND", "优惠券不存在或未领取"),
      } as const;
    }

    if (
      [
        "USER_COUPON_ALREADY_USED",
        "USER_COUPON_EXPIRED",
        "USER_COUPON_NOT_CLAIMED",
      ].includes(message)
    ) {
      return {
        status: 409,
        body: errorPayload("CONFLICT", "当前优惠券状态不支持使用"),
      } as const;
    }

    return {
      status: 500,
      body: errorPayload("INTERNAL_ERROR", "优惠券使用状态更新失败"),
    } as const;
  }
}

export function registerUserPreferenceApi(app: Express) {
  app.get("/api/user-preferences/me", async (req: Request, res: Response) => {
    const auth = await authorizeRequest(req, "course_access:read");
    if (!auth.ok) {
      sendJson(res, auth.status, auth.body);
      return;
    }

    const payload = await getUserPreferencePayload(auth.session.user.id);
    sendJson(res, payload.status, payload.body);
  });

  app.put(
    "/api/user-preferences/me/favorites",
    async (req: Request, res: Response) => {
      const auth = await authorizeRequest(req, "course_access:read");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await updateUserFavoriteCoursesPayload(
        auth.session.user.id,
        req.body
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.post(
    "/api/user-preferences/me/coupons/claim",
    async (req: Request, res: Response) => {
      const auth = await authorizeRequest(req, "course_access:read");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await claimUserCouponPayload(
        auth.session.user.id,
        req.body
      );
      sendJson(res, payload.status, payload.body);
    }
  );
}

export function handleUserPreferenceApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  if (!req.url || !req.url.startsWith("/api/user-preferences")) return false;

  const url = new URL(req.url, "http://localhost");
  if (req.method === "GET" && url.pathname === "/api/user-preferences/me") {
    void (async () => {
      const auth = await authorizeRequest(req, "course_access:read");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await getUserPreferencePayload(auth.session.user.id);
      sendJson(res, payload.status, payload.body);
    })().catch(() =>
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "用户偏好读取失败"))
    );
    return true;
  }

  if (
    req.method === "PUT" &&
    url.pathname === "/api/user-preferences/me/favorites"
  ) {
    void (async () => {
      const auth = await authorizeRequest(req, "course_access:read");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const body = await readRequestBody(req);
      const payload = await updateUserFavoriteCoursesPayload(
        auth.session.user.id,
        body
      );
      sendJson(res, payload.status, payload.body);
    })().catch(() =>
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "收藏课程同步失败"))
    );
    return true;
  }

  if (
    req.method === "POST" &&
    url.pathname === "/api/user-preferences/me/coupons/claim"
  ) {
    void (async () => {
      const auth = await authorizeRequest(req, "course_access:read");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const body = await readRequestBody(req);
      const payload = await claimUserCouponPayload(auth.session.user.id, body);
      sendJson(res, payload.status, payload.body);
    })().catch(() =>
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "优惠券领取失败"))
    );
    return true;
  }

  sendJson(res, 405, errorPayload("BAD_REQUEST", "不支持的用户偏好请求方法"));
  return true;
}
