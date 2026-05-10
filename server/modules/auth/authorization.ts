import type { Request } from "express";
import type { IncomingMessage } from "http";
import {
  userCan,
  type AuthPermission,
  type LoginSession,
} from "../../../shared/domain";
import { getLoginSessionFromRequest } from "./authSessionApi";

type AuthorizationFailure = {
  ok: false;
  status: 401 | 403;
  body: {
    ok: false;
    error: {
      code: "UNAUTHORIZED" | "FORBIDDEN";
      message: string;
    };
  };
};

type AuthorizationSuccess = {
  ok: true;
  session: LoginSession;
};

export type AuthorizationResult = AuthorizationSuccess | AuthorizationFailure;

function authFailure(
  status: 401 | 403,
  code: "UNAUTHORIZED" | "FORBIDDEN",
  message: string
): AuthorizationFailure {
  return {
    ok: false,
    status,
    body: {
      ok: false,
      error: {
        code,
        message,
      },
    },
  };
}

export async function authorizeRequest(
  req: Request | IncomingMessage,
  permission: AuthPermission
): Promise<AuthorizationResult> {
  const session = await getLoginSessionFromRequest(req);
  if (!session) {
    return authFailure(401, "UNAUTHORIZED", "请先登录后继续操作");
  }

  if (!userCan(session.user, permission)) {
    return authFailure(403, "FORBIDDEN", "当前账号暂无此操作权限");
  }

  return {
    ok: true,
    session,
  };
}
