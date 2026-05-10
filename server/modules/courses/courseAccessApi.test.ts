import { describe, expect, it, beforeEach } from "vitest";
import {
  activateMembershipPayload,
  getCourseAccessPayload,
  purchaseCoursePayload,
  resetCourseAccessStore,
} from "./courseAccessApi";

describe("course access API payloads", () => {
  beforeEach(async () => {
    await resetCourseAccessStore();
  });

  it("returns the current empty access state", async () => {
    const payload = await getCourseAccessPayload();

    expect(payload.ok).toBe(true);
    if (!payload.ok) return;
    expect(payload.data.ownedCourseIds).toEqual([]);
    expect(payload.data.membership.status).toBe("none");
  });

  it("purchases a paid course and creates a paid order", async () => {
    const payload = await purchaseCoursePayload(16);

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (!payload.body.ok) return;
    expect(payload.body.data.ownedCourseIds).toContain(16);
    expect(payload.body.data.orders[0]).toMatchObject({
      status: "paid",
      items: [{ type: "course", targetId: "16" }],
    });
  });

  it("activates membership access", async () => {
    const payload = await activateMembershipPayload();

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (!payload.body.ok) return;
    expect(payload.body.data.membership.status).toBe("active");
    expect(payload.body.data.membership.expiresAt).toBeTruthy();
  });

  it("keeps course access isolated by user id", async () => {
    const firstUser = await purchaseCoursePayload(16, "u_10001");
    const secondUser = await getCourseAccessPayload("u_20001");

    expect(firstUser.status).toBe(200);
    expect(secondUser.ok).toBe(true);
    if (!secondUser.ok) return;
    expect(secondUser.data.ownedCourseIds).toEqual([]);
  });
});
