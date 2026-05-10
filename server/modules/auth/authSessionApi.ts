import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { randomUUID } from "crypto";
import {
  ApiResponseSchema,
  CURRENT_USER_CONSENT_VERSION,
  LoginSessionSchema,
  PhoneLoginRequestSchema,
  UserConsentSchema,
  WechatLoginRequestSchema,
  type LoginProvider,
  type LoginSession,
  type UserConsent,
  type UserProfile,
} from "../../../shared/domain";
import {
  createDefaultAuthSessionStore,
  type AuthSessionStore,
} from "./authSessionStore";

export const AUTH_SESSION_COOKIE = "hongboshi_session";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const AuthSessionResponseSchema = ApiResponseSchema(
  LoginSessionSchema.nullable()
);

let authSessionStore = createDefaultAuthSessionStore();

function sendJson(
  res: Response | ServerResponse,
  status: number,
  payload: unknown
) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function errorPayload(code: "BAD_REQUEST" | "UNAUTHORIZED", message: string) {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  };
}

function sessionPayload(session: LoginSession | null) {
  return AuthSessionResponseSchema.parse({
    ok: true,
    data: session,
  });
}

function maskPhone(phone: string) {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
}

function createUserProfile(
  provider: LoginProvider,
  now: string,
  phone?: string
): UserProfile {
  if (provider === "wechat") {
    return {
      id: "u_wechat_demo",
      displayName: "微信用户_Lily",
      roles: ["member"],
      isMinor: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  const phoneMasked = phone ? maskPhone(phone) : undefined;
  return {
    id: `u_phone_${phone?.slice(-4) ?? "demo"}`,
    displayName: phoneMasked ? `用户${phoneMasked}` : "心理学爱好者",
    phoneMasked,
    roles: ["member"],
    isMinor: false,
    createdAt: now,
    updatedAt: now,
  };
}

function createConsentRecords(
  userId: string,
  acceptedAt: string,
  version = CURRENT_USER_CONSENT_VERSION
): UserConsent[] {
  return ["terms", "privacy"].map(type =>
    UserConsentSchema.parse({
      userId,
      type,
      version,
      acceptedAt,
    })
  );
}

async function createSession(
  provider: LoginProvider,
  phone?: string,
  consentVersion = CURRENT_USER_CONSENT_VERSION
) {
  const now = new Date().toISOString();
  const accessTokenExpiresAt = new Date(
    Date.now() + SESSION_TTL_MS
  ).toISOString();
  const user = createUserProfile(provider, now, phone);
  const consents = createConsentRecords(user.id, now, consentVersion);
  const session = LoginSessionSchema.parse({
    user,
    provider,
    accessTokenExpiresAt,
    consents,
  });
  const token = randomUUID();
  await authSessionStore.saveSession(token, session);

  return { token, session };
}

function isSessionActive(session: LoginSession) {
  return Date.parse(session.accessTokenExpiresAt) > Date.now();
}

function authCookie(token: string) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `${AUTH_SESSION_COOKIE}=${encodeURIComponent(
    token
  )}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`;
}

function clearAuthCookie() {
  return `${AUTH_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

function firstHeaderValue(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parseCookies(rawCookieHeader: string | undefined) {
  const cookies = new Map<string, string>();
  if (!rawCookieHeader) return cookies;

  for (const part of rawCookieHeader.split(";")) {
    const [rawKey, ...rawValueParts] = part.trim().split("=");
    if (!rawKey) continue;

    try {
      cookies.set(rawKey, decodeURIComponent(rawValueParts.join("=")));
    } catch {
      cookies.set(rawKey, rawValueParts.join("="));
    }
  }

  return cookies;
}

export function readAuthSessionToken(req: Request | IncomingMessage) {
  const rawCookieHeader = firstHeaderValue(req.headers.cookie);
  return parseCookies(rawCookieHeader).get(AUTH_SESSION_COOKIE);
}

export function setAuthSessionStore(store: AuthSessionStore) {
  authSessionStore = store;
}

export async function getLoginSession(token: string | undefined) {
  if (!token) return null;

  const session = await authSessionStore.getSession(token);
  if (!session) return null;

  if (!isSessionActive(session)) {
    await authSessionStore.destroySession(token);
    return null;
  }

  return session;
}

export function getLoginSessionFromRequest(req: Request | IncomingMessage) {
  return getLoginSession(readAuthSessionToken(req));
}

export function destroyLoginSession(token: string | undefined) {
  return token
    ? Promise.resolve(authSessionStore.destroySession(token))
    : Promise.resolve();
}

export function resetAuthSessionStore() {
  return Promise.resolve(authSessionStore.reset());
}

export function getUserConsents(userId: string) {
  return Promise.resolve(authSessionStore.getUserConsents(userId));
}

export async function loginWithPhonePayload(body: unknown) {
  const parsed = PhoneLoginRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "手机号、验证码或协议确认不合法"),
    } as const;
  }

  const { token, session } = await createSession(
    "phone",
    parsed.data.phone,
    parsed.data.consentVersion
  );
  return {
    status: 200,
    token,
    body: sessionPayload(session),
  } as const;
}

export async function loginWithWechatPayload(body: unknown) {
  const parsed = WechatLoginRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "请先同意用户协议与隐私政策"),
    } as const;
  }

  const { token, session } = await createSession(
    "wechat",
    undefined,
    parsed.data.consentVersion
  );
  return {
    status: 200,
    token,
    body: sessionPayload(session),
  } as const;
}

export async function getSessionPayload(req: Request | IncomingMessage) {
  return sessionPayload(await getLoginSessionFromRequest(req));
}

function applyAuthCookie(res: Response | ServerResponse, token: string) {
  res.setHeader("Set-Cookie", authCookie(token));
}

function hasSessionToken(payload: {
  token?: string;
}): payload is { token: string } {
  return typeof payload.token === "string";
}

function applyClearAuthCookie(res: Response | ServerResponse) {
  res.setHeader("Set-Cookie", clearAuthCookie());
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

export function registerAuthApi(app: Express) {
  app.get("/api/auth/session", async (req: Request, res: Response) => {
    sendJson(res, 200, await getSessionPayload(req));
  });

  app.post("/api/auth/login/phone", async (req: Request, res: Response) => {
    const payload = await loginWithPhonePayload(req.body);
    if (hasSessionToken(payload)) applyAuthCookie(res, payload.token);
    sendJson(res, payload.status, payload.body);
  });

  app.post("/api/auth/login/wechat", async (req: Request, res: Response) => {
    const payload = await loginWithWechatPayload(req.body);
    if (hasSessionToken(payload)) applyAuthCookie(res, payload.token);
    sendJson(res, payload.status, payload.body);
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    await destroyLoginSession(readAuthSessionToken(req));
    applyClearAuthCookie(res);
    sendJson(res, 200, sessionPayload(null));
  });
}

export function handleAuthApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  if (!req.url || !req.url.startsWith("/api/auth")) return false;

  if (req.method === "GET" && req.url.startsWith("/api/auth/session")) {
    void getSessionPayload(req)
      .then(payload => sendJson(res, 200, payload))
      .catch(err => {
        console.error(err instanceof Error ? err.message : "登录会话读取失败");
        sendJson(res, 401, errorPayload("UNAUTHORIZED", "登录会话读取失败"));
      });
    return true;
  }

  if (req.method === "POST" && req.url.startsWith("/api/auth/logout")) {
    void destroyLoginSession(readAuthSessionToken(req))
      .then(() => {
        applyClearAuthCookie(res);
        sendJson(res, 200, sessionPayload(null));
      })
      .catch(err => {
        console.error(err instanceof Error ? err.message : "退出登录失败");
        applyClearAuthCookie(res);
        sendJson(res, 200, sessionPayload(null));
      });
    return true;
  }

  if (req.method === "POST" && req.url.startsWith("/api/auth/login/phone")) {
    void readRequestBody(req)
      .then(async body => {
        const payload = await loginWithPhonePayload(body);
        if (hasSessionToken(payload)) applyAuthCookie(res, payload.token);
        sendJson(res, payload.status, payload.body);
      })
      .catch(err => {
        console.error(err instanceof Error ? err.message : "手机号登录失败");
        sendJson(res, 400, errorPayload("BAD_REQUEST", "手机号登录失败"));
      });
    return true;
  }

  if (req.method === "POST" && req.url.startsWith("/api/auth/login/wechat")) {
    void readRequestBody(req)
      .then(async body => {
        const payload = await loginWithWechatPayload(body);
        if (hasSessionToken(payload)) applyAuthCookie(res, payload.token);
        sendJson(res, payload.status, payload.body);
      })
      .catch(err => {
        console.error(err instanceof Error ? err.message : "微信登录失败");
        sendJson(res, 400, errorPayload("BAD_REQUEST", "微信登录失败"));
      });
    return true;
  }

  sendJson(res, 405, errorPayload("BAD_REQUEST", "不支持的认证请求方法"));
  return true;
}
