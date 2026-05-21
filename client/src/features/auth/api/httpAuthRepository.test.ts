import { afterEach, describe, expect, it, vi } from "vitest";
import {
  httpAuthRepository,
  parseAuthSessionResponse,
} from "./httpAuthRepository";

describe("http auth repository parsing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses a successful session response", () => {
    const session = parseAuthSessionResponse({
      ok: true,
      data: {
        provider: "phone",
        accessTokenExpiresAt: "2026-05-16T13:00:00.000Z",
        user: {
          id: "u_phone_1234",
          displayName: "用户138****1234",
          phoneMasked: "138****1234",
          roles: ["member"],
          isMinor: false,
          createdAt: "2026-05-09T13:00:00.000Z",
          updatedAt: "2026-05-09T13:00:00.000Z",
        },
      },
    });

    expect(session?.user.id).toBe("u_phone_1234");
    expect(session?.provider).toBe("phone");
  });

  it("returns null for anonymous sessions", () => {
    expect(parseAuthSessionResponse({ ok: true, data: null })).toBeNull();
  });

  it("throws on failed auth responses", () => {
    expect(() =>
      parseAuthSessionResponse({
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: "手机号、验证码或协议确认不合法",
        },
      })
    ).toThrow("手机号、验证码或协议确认不合法");
  });

  it("logs in with the development admin endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            provider: "password",
            accessTokenExpiresAt: "2026-05-21T10:00:00.000Z",
            consents: [],
            user: {
              id: "admin_dev_admin",
              displayName: "开发管理员",
              roles: ["admin"],
              isMinor: false,
              createdAt: "2026-05-21T09:00:00.000Z",
              updatedAt: "2026-05-21T09:00:00.000Z",
            },
          },
        })
      )
    );

    const session = await httpAuthRepository.loginWithAdminDev(
      "admin@hongboshi.dev",
      "Admin@2026"
    );

    expect(session.provider).toBe("password");
    expect(session.user.roles).toContain("admin");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login/admin-dev",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          username: "admin@hongboshi.dev",
          password: "Admin@2026",
        }),
      })
    );
  });
});
