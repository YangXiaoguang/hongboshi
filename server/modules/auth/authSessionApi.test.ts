import { beforeEach, describe, expect, it } from "vitest";
import {
  getLoginSession,
  loginWithPhonePayload,
  loginWithWechatPayload,
  parseCookies,
  resetAuthSessionStore,
  AUTH_SESSION_COOKIE,
} from "./authSessionApi";

describe("auth session API payloads", () => {
  beforeEach(() => {
    resetAuthSessionStore();
  });

  it("creates a phone login session", () => {
    const payload = loginWithPhonePayload({
      phone: "13800138000",
      code: "123456",
      acceptedConsent: true,
    });

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (!payload.body.ok || !("token" in payload)) return;
    expect(payload.body.data?.user.id).toBe("u_phone_8000");
    expect(payload.body.data?.user.roles).toContain("member");
    expect(getLoginSession(payload.token)?.user.id).toBe("u_phone_8000");
  });

  it("rejects login without consent", () => {
    const payload = loginWithWechatPayload({ acceptedConsent: false });

    expect(payload.status).toBe(400);
    expect(payload.body.ok).toBe(false);
  });

  it("parses the auth session cookie", () => {
    const cookies = parseCookies(`${AUTH_SESSION_COOKIE}=abc-123; theme=light`);

    expect(cookies.get(AUTH_SESSION_COOKIE)).toBe("abc-123");
    expect(cookies.get("theme")).toBe("light");
  });
});
