import { describe, expect, it, beforeEach } from "vitest";
import {
  activateMembershipPayload,
  getCourseAccessPayload,
  purchaseCoursePayload,
  resetCourseAccessStore,
} from "./courseAccessApi";

describe("course access API payloads", () => {
  beforeEach(() => {
    resetCourseAccessStore();
  });

  it("returns the current empty access state", () => {
    const payload = getCourseAccessPayload();

    expect(payload.ok).toBe(true);
    if (!payload.ok) return;
    expect(payload.data.ownedCourseIds).toEqual([]);
    expect(payload.data.membership.status).toBe("none");
  });

  it("purchases a paid course and creates a paid order", () => {
    const payload = purchaseCoursePayload(16);

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (!payload.body.ok) return;
    expect(payload.body.data.ownedCourseIds).toContain(16);
    expect(payload.body.data.orders[0]).toMatchObject({
      status: "paid",
      items: [{ type: "course", targetId: "16" }],
    });
  });

  it("activates membership access", () => {
    const payload = activateMembershipPayload();

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (!payload.body.ok) return;
    expect(payload.body.data.membership.status).toBe("active");
    expect(payload.body.data.membership.expiresAt).toBeTruthy();
  });
});
