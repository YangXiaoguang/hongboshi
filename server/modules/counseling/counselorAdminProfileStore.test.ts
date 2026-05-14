import { describe, expect, it } from "vitest";
import { counselorProfiles } from "../../../shared/data/counselingSeed";
import { InMemoryCounselorAdminProfileStore } from "./counselorAdminProfileStore";

describe("counselor admin profile store", () => {
  it("initializes counselor profiles from the shared counseling seed", () => {
    const store = new InMemoryCounselorAdminProfileStore();
    const profiles = store.listProfiles("2026-05-10T00:00:00.000Z");

    expect(profiles).toHaveLength(counselorProfiles.length);
    expect(profiles[0]).toMatchObject({
      counselor: {
        id: counselorProfiles[0].id,
        name: counselorProfiles[0].name,
      },
      serviceStatus: "active",
      acceptsNewClients: true,
      credentialStatus: "verified",
    });
  });

  it("saves profile overlays without changing the counselor identity", () => {
    const store = new InMemoryCounselorAdminProfileStore();
    const existing = store.listProfiles("2026-05-10T00:00:00.000Z")[0];
    if (!existing) throw new Error("expected counselor profile");

    const saved = store.saveProfile({
      ...existing,
      counselor: {
        ...existing.counselor,
        title: "资深心理咨询师",
      },
      serviceStatus: "paused",
      acceptsNewClients: false,
      credentialStatus: "expiring_soon",
      updatedAt: "2026-05-10T00:05:00.000Z",
      updatedBy: "operator_1",
    });

    expect(saved.serviceStatus).toBe("paused");
    expect(
      store.getProfile(existing.counselor.id, "2026-05-10T00:06:00.000Z")
        ?.counselor.title
    ).toBe("资深心理咨询师");
    expect(saved.counselor.id).toBe(existing.counselor.id);
  });
});
