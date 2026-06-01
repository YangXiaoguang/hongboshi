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

  it("keeps custom counselor profiles and hides archived profiles", () => {
    const store = new InMemoryCounselorAdminProfileStore();
    const saved = store.saveProfile({
      counselor: {
        id: "counselor_custom_1",
        name: "周明",
        title: "心理咨询师",
        introduction: "擅长情绪压力与个人成长议题的稳定陪伴。",
        specialties: ["emotion", "personal_growth"],
        licenseSummary: "心理咨询服务 5 年",
        trainingSummary: "接受情绪调节和关系议题训练。",
        serviceStyle: "温和稳定，重视阶段目标。",
        idealClientDescription: "适合关注情绪压力和自我成长的来访者。",
        yearsOfPractice: 5,
        caseHours: 800,
        sessionPrice: 329,
      },
      serviceStatus: "active",
      acceptsNewClients: true,
      credentialStatus: "verified",
      updatedAt: "2026-05-10T00:05:00.000Z",
      updatedBy: "operator_1",
    });

    expect(saved.counselor.id).toBe("counselor_custom_1");
    expect(saved.counselor.caseHours).toBe(800);
    expect(
      store
        .listProfiles("2026-05-10T00:06:00.000Z")
        .some(profile => profile.counselor.id === "counselor_custom_1")
    ).toBe(true);

    const archived = store.archiveProfile(
      "counselor_custom_1",
      "operator_1",
      "2026-05-10T00:07:00.000Z"
    );

    expect(archived?.archivedAt).toBe("2026-05-10T00:07:00.000Z");
    expect(
      store
        .listProfiles("2026-05-10T00:08:00.000Z")
        .some(profile => profile.counselor.id === "counselor_custom_1")
    ).toBe(false);
  });
});
