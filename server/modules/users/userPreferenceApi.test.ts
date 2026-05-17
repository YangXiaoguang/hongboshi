import { beforeEach, describe, expect, it } from "vitest";
import {
  getUserPreferencePayload,
  resetUserPreferenceStore,
  updateUserFavoriteCoursesPayload,
} from "./userPreferenceApi";

describe("user preference API payloads", () => {
  beforeEach(async () => {
    await resetUserPreferenceStore();
  });

  it("returns an empty preference for a new user", async () => {
    const payload = await getUserPreferencePayload(
      "u_phone_8000",
      "2026-05-18T08:00:00.000Z"
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (!payload.body.ok) return;
    expect(payload.body.data.preference).toMatchObject({
      userId: "u_phone_8000",
      favoriteCourses: [],
      updatedAt: "2026-05-18T08:00:00.000Z",
    });
  });

  it("saves favorite course ids by user", async () => {
    const payload = await updateUserFavoriteCoursesPayload(
      "u_phone_8000",
      {
        favoriteCourseIds: [5, 2, 5],
        source: "course_list",
      },
      "2026-05-18T09:00:00.000Z"
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (!payload.body.ok) return;
    expect(
      payload.body.data.preference.favoriteCourses.map(item => item.courseId)
    ).toEqual([5, 2]);

    const nextPayload = await getUserPreferencePayload(
      "u_phone_8000",
      "2026-05-18T10:00:00.000Z"
    );
    expect(nextPayload.body.ok).toBe(true);
    if (!nextPayload.body.ok) return;
    expect(
      nextPayload.body.data.preference.favoriteCourses.map(
        item => item.courseId
      )
    ).toEqual([5, 2]);
  });

  it("rejects invalid favorite updates", async () => {
    const payload = await updateUserFavoriteCoursesPayload("u_phone_8000", {
      favoriteCourseIds: [-1],
      source: "course_detail",
    });

    expect(payload.status).toBe(400);
    expect(payload.body.ok).toBe(false);
  });
});
