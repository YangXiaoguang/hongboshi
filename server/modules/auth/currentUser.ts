import type { Request } from "express";
import type { IncomingMessage } from "http";
import { z } from "zod";
import {
  COURSE_ACCESS_USER_ID_HEADER,
  LOCAL_COURSE_ACCESS_USER_ID,
} from "../../../shared/domain";
import { getLoginSessionFromRequest } from "./authSessionApi";

const RequestUserIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[A-Za-z0-9_-]+$/);

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function resolveRequestUserId(req: Request | IncomingMessage): string {
  const session = getLoginSessionFromRequest(req);
  if (session) return session.user.id;

  const rawUserId = firstHeaderValue(req.headers[COURSE_ACCESS_USER_ID_HEADER]);
  const parsed = RequestUserIdSchema.safeParse(rawUserId);
  return parsed.success ? parsed.data : LOCAL_COURSE_ACCESS_USER_ID;
}
