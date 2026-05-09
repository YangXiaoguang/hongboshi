import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { randomUUID } from "crypto";
import {
  ApiResponseSchema,
  LoginSessionSchema,
  PhoneLoginRequestSchema,
  WechatLoginRequestSchema,
  type LoginProvider,
  type LoginSession,
  type UserProfile,
} from "../../../shared/domain";

export const AUTH_SESSION_COOKIE = "hongboshi_session";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const AuthSessionResponseSchema = ApiResponseSchema(LoginSessionSchema.nullable());

const sessionStore = new Map<string, LoginSession>();

function sendJson(res: Response | ServerResponse, status: number, payload: unknown) {
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

function createSession(provider: LoginProvider, phone?: string) {
  const now = new Date().toISOString();
  const accessTokenExpiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const session = LoginSessionSchema.parse({
    user: createUserProfile(provider, now, phone),
    provider,
    accessTokenExpiresAt,
  });
  const token = randomUUID();
  sessionStore.set(token, session);

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

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
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

export function getLoginSession(token: string | undefined) {
  if (!token) return null;

  const session = sessionStore.get(token);
  if (!session) return null;

  if (!isSessionActive(session)) {
    sessionStore.delete(token);
    return null;
  }

  return session;
}

export function getLoginSessionFromRequest(req: Request | IncomingMessage) {
  return getLoginSession(readAuthSessionToken(req));
}

export function resetAuthSessionStore() {
  sessionStore.clear();
}

export function loginWithPhonePayload(body: unknown) {
  const parsed = PhoneLoginRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "手机号、验证码或协议确认不合法"),
    } as const;
  }

  const { token, session } = createSession("phone", parsed.data.phone);
  return {
    status: 200,
    token,
    body: sessionPayload(session),
  } as const;
}

export function loginWithWechatPayload(body: unknown) {
  const parsed = WechatLoginRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "请先同意用户协议与隐私政策"),
    } as const;
  }

  const { token, session } = createSession("wechat");
  return {
    status: 200,
    token,
    body: sessionPayload(session),
  } as const;
}

export function getSessionPayload(req: Request | IncomingMessage) {
  return sessionPayload(getLoginSessionFromRequest(req));
}

function applyAuthCookie(res: Response | ServerResponse, token: string) {
  res.setHeader("Set-Cookie", authCookie(token));
}

function hasSessionToken(payload: { token?: string }): payload is { token: string } {
  return typeof payload.token === "string";
}

function applyClearAuthCookie(res: Response | ServerResponse) {
  res.setHeader("Set-Cookie", clearAuthCookie());
}

function readRequestBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
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
  app.get("/api/auth/session", (req: Request, res: Response) => {
    sendJson(res, 200, getSessionPayload(req));
  });

  app.post("/api/auth/login/phone", (req: Request, res: Response) => {
    const payload = loginWithPhonePayload(req.body);
    if (hasSessionToken(payload)) applyAuthCookie(res, payload.token);
    sendJson(res, payload.status, payload.body);
  });

  app.post("/api/auth/login/wechat", (req: Request, res: Response) => {
    const payload = loginWithWechatPayload(req.body);
    if (hasSessionToken(payload)) applyAuthCookie(res, payload.token);
    sendJson(res, payload.status, payload.body);
  });

  app.post("/api/auth/logout", (_req: Request, res: Response) => {
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
    sendJson(res, 200, getSessionPayload(req));
    return true;
  }

  if (req.method === "POST" && req.url.startsWith("/api/auth/logout")) {
    applyClearAuthCookie(res);
    sendJson(res, 200, sessionPayload(null));
    return true;
  }

  if (req.method === "POST" && req.url.startsWith("/api/auth/login/phone")) {
    void readRequestBody(req).then((body) => {
      const payload = loginWithPhonePayload(body);
      if (hasSessionToken(payload)) applyAuthCookie(res, payload.token);
      sendJson(res, payload.status, payload.body);
    });
    return true;
  }

  if (req.method === "POST" && req.url.startsWith("/api/auth/login/wechat")) {
    void readRequestBody(req).then((body) => {
      const payload = loginWithWechatPayload(body);
      if (hasSessionToken(payload)) applyAuthCookie(res, payload.token);
      sendJson(res, payload.status, payload.body);
    });
    return true;
  }

  sendJson(res, 405, errorPayload("BAD_REQUEST", "不支持的认证请求方法"));
  return true;
}
