import { beforeEach, describe, expect, it } from "vitest";
import {
  getLoginSession,
  destroyLoginSession,
  loginWithPhonePayload,
  loginWithWechatPayload,
  parseCookies,
  resetAuthSessionStore,
  AUTH_SESSION_COOKIE,
  getUserConsents,
  updateProfilePayload,
} from "./authSessionApi";

describe("auth session API payloads", () => {
  beforeEach(async () => {
    await resetAuthSessionStore();
  });

  it("creates a phone login session", async () => {
    const payload = await loginWithPhonePayload({
      phone: "13800138000",
      code: "123456",
      acceptedConsent: true,
    });

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (!payload.body.ok || !("token" in payload)) return;
    expect(payload.body.data?.user.id).toBe("u_phone_8000");
    expect(payload.body.data?.user.roles).toContain("member");
    expect(payload.body.data?.consents).toEqual([
      expect.objectContaining({ type: "terms", version: "2026.05" }),
      expect.objectContaining({ type: "privacy", version: "2026.05" }),
    ]);
    await expect(getLoginSession(payload.token)).resolves.toMatchObject({
      user: { id: "u_phone_8000" },
    });
    await expect(getUserConsents("u_phone_8000")).resolves.toHaveLength(2);
  });

  it("rejects login without consent", async () => {
    const payload = await loginWithWechatPayload({ acceptedConsent: false });

    expect(payload.status).toBe(400);
    expect(payload.body.ok).toBe(false);
  });

  it("parses the auth session cookie", () => {
    const cookies = parseCookies(`${AUTH_SESSION_COOKIE}=abc-123; theme=light`);

    expect(cookies.get(AUTH_SESSION_COOKIE)).toBe("abc-123");
    expect(cookies.get("theme")).toBe("light");
  });

  it("destroys sessions on logout", async () => {
    const payload = await loginWithPhonePayload({
      phone: "13800138000",
      code: "123456",
      acceptedConsent: true,
    });
    expect("token" in payload).toBe(true);
    if (!("token" in payload)) return;

    await destroyLoginSession(payload.token);

    await expect(getLoginSession(payload.token)).resolves.toBeNull();
  });

  it("updates the current user's profile in the saved session", async () => {
    const loginPayload = await loginWithPhonePayload({
      phone: "13800138000",
      code: "123456",
      acceptedConsent: true,
    });
    expect("token" in loginPayload).toBe(true);
    if (!("token" in loginPayload)) return;

    const payload = await updateProfilePayload(
      loginPayload.token,
      {
        displayName: "红博士学员",
        avatarUrl: "https://example.com/avatar.png",
      },
      "2026-05-18T08:00:00.000Z"
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (!payload.body.ok) return;
    expect(payload.body.data?.user.displayName).toBe("红博士学员");
    expect(payload.body.data?.user.avatarUrl).toBe(
      "https://example.com/avatar.png"
    );
    expect(payload.body.data?.user.updatedAt).toBe("2026-05-18T08:00:00.000Z");
    await expect(getLoginSession(loginPayload.token)).resolves.toMatchObject({
      user: {
        displayName: "红博士学员",
        avatarUrl: "https://example.com/avatar.png",
      },
    });
  });
});
