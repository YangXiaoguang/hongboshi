import type { IncomingMessage } from "http";
import { beforeEach, describe, expect, it } from "vitest";
import {
  AUTH_SESSION_COOKIE,
  loginWithPhonePayload,
  resetAuthSessionStore,
} from "./authSessionApi";
import { authorizeRequest } from "./authorization";

function requestWithCookie(token?: string): IncomingMessage {
  return {
    headers: token ? { cookie: `${AUTH_SESSION_COOKIE}=${token}` } : {},
  } as IncomingMessage;
}

describe("authorization guard", () => {
  beforeEach(async () => {
    await resetAuthSessionStore();
  });

  it("rejects anonymous requests", async () => {
    const result = await authorizeRequest(
      requestWithCookie(),
      "course:purchase"
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(401);
    expect(result.body.error.code).toBe("UNAUTHORIZED");
  });

  it("allows a member to purchase courses", async () => {
    const payload = await loginWithPhonePayload({
      phone: "13800138000",
      code: "123456",
      acceptedConsent: true,
    });
    expect("token" in payload).toBe(true);
    if (!("token" in payload)) return;

    const result = await authorizeRequest(
      requestWithCookie(payload.token),
      "course:purchase"
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.user.id).toBe("u_phone_8000");
  });

  it("rejects member-only sessions from admin actions", async () => {
    const payload = await loginWithPhonePayload({
      phone: "13800138000",
      code: "123456",
      acceptedConsent: true,
    });
    expect("token" in payload).toBe(true);
    if (!("token" in payload)) return;

    const result = await authorizeRequest(
      requestWithCookie(payload.token),
      "admin:manage"
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(403);
    expect(result.body.error.code).toBe("FORBIDDEN");
  });
});
