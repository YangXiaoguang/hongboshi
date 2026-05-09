import type { IncomingMessage } from "http";
import { describe, expect, it } from "vitest";
import { LOCAL_COURSE_ACCESS_USER_ID } from "../../../shared/domain";
import { resolveRequestUserId } from "./currentUser";

function requestWithUserId(userId?: string): IncomingMessage {
  return {
    headers: userId ? { "x-hongboshi-user-id": userId } : {},
  } as IncomingMessage;
}

describe("current user resolver", () => {
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
