import type { IncomingMessage } from "http";
import { beforeEach, describe, expect, it } from "vitest";
import { LOCAL_COURSE_ACCESS_USER_ID } from "../../../shared/domain";
import {
  AUTH_SESSION_COOKIE,
  loginWithPhonePayload,
  resetAuthSessionStore,
} from "./authSessionApi";
import { resolveRequestUserId } from "./currentUser";

function requestWithUserId(userId?: string): IncomingMessage {
  return {
    headers: userId ? { "x-hongboshi-user-id": userId } : {},
  } as IncomingMessage;
}

describe("current user resolver", () => {
  beforeEach(() => {
    resetAuthSessionStore();
  });

  it("prefers the server login session cookie", () => {
    const payload = loginWithPhonePayload({
      phone: "13800138000",
      code: "123456",
      acceptedConsent: true,
    });

    expect("token" in payload).toBe(true);
    if (!("token" in payload)) return;

    expect(
      resolveRequestUserId({
        headers: {
          cookie: `${AUTH_SESSION_COOKIE}=${payload.token}`,
          "x-hongboshi-user-id": "u_header",
        },
      } as IncomingMessage)
    ).toBe("u_phone_8000");
  });

  it("reads the development user id header", () => {
    expect(resolveRequestUserId(requestWithUserId("u_10001"))).toBe("u_10001");
  });

  it("falls back to the local user for missing or invalid headers", () => {
    expect(resolveRequestUserId(requestWithUserId())).toBe(LOCAL_COURSE_ACCESS_USER_ID);
    expect(resolveRequestUserId(requestWithUserId("../unsafe"))).toBe(
      LOCAL_COURSE_ACCESS_USER_ID
    );
  });
});
