import {
  ApiResponseSchema,
  LoginSessionSchema,
  type LoginSession,
  type UserProfileUpdateRequest,
} from "@shared/domain";

const AuthSessionResponseSchema = ApiResponseSchema(
  LoginSessionSchema.nullable()
);
const API_BASE = "/api/auth";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("登录服务返回了无法解析的数据");
  }
}

export function parseAuthSessionResponse(
  payload: unknown
): LoginSession | null {
  const parsed = AuthSessionResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

async function requestSession(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
    credentials: "same-origin",
    ...init,
  });
  const payload = await readJson(response);
  const session = parseAuthSessionResponse(payload);
  if (!response.ok) throw new Error("登录服务暂时不可用");
  return session;
}

export const httpAuthRepository = {
  getSession(): Promise<LoginSession | null> {
    return requestSession("/session");
  },

  loginWithPhone(phone: string, code: string): Promise<LoginSession> {
    return requestSession("/login/phone", {
      method: "POST",
      body: JSON.stringify({ phone, code, acceptedConsent: true }),
    }).then(session => {
      if (!session) throw new Error("登录服务未返回会话");
      return session;
    });
  },

  loginWithWechat(): Promise<LoginSession> {
    return requestSession("/login/wechat", {
      method: "POST",
      body: JSON.stringify({ acceptedConsent: true }),
    }).then(session => {
      if (!session) throw new Error("登录服务未返回会话");
      return session;
    });
  },

  updateProfile(request: UserProfileUpdateRequest): Promise<LoginSession> {
    return requestSession("/profile", {
      method: "PATCH",
      body: JSON.stringify(request),
    }).then(session => {
      if (!session) throw new Error("登录服务未返回会话");
      return session;
    });
  },

  logout(): Promise<void> {
    return requestSession("/logout", { method: "POST" }).then(() => undefined);
  },
};
