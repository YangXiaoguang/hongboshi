import { describe, expect, it } from "vitest";
import {
  AssessmentReportSchema,
  CounselingAppointmentSchema,
  CourseListQuerySchema,
  CourseSchema,
  LoginSessionSchema,
  UserProfileSchema,
  userCan,
} from "./index";
import { courses } from "../../client/src/lib/mockData";

describe("domain contracts", () => {
  it("validates the current course mock data against the shared course schema", () => {
    const results = courses.map((course) => CourseSchema.safeParse(course));
    expect(results.every((result) => result.success)).toBe(true);
  });

  it("normalizes course list query defaults", () => {
    expect(CourseListQuerySchema.parse({})).toMatchObject({
      page: 1,
      pageSize: 20,
      category: "全部",
      type: "全部",
      sort: "comprehensive",
      keyword: "",
      vipOnly: false,
    });
  });

  it("captures the minimum cross-domain objects for the first backend phase", () => {
    expect(
      UserProfileSchema.safeParse({
        id: "user_1",
        displayName: "测试用户",
        roles: ["member"],
        isMinor: false,
        createdAt: "2026-05-09T10:00:00+08:00",
        updatedAt: "2026-05-09T10:00:00+08:00",
      }).success
    ).toBe(true);

    expect(
      AssessmentReportSchema.safeParse({
        id: "report_1",
        userId: "user_1",
        dimensions: {
          emotion: 42,
          sleep: 35,
          relationship: 28,
          parent_child: 10,
          workplace: 22,
          self_growth: 48,
          risk: 5,
        },
        riskLevel: "low",
        summary: "当前以情绪与睡眠困扰为主，建议从稳定作息和正念练习开始。",
        recommendations: [
          {
            target: "course",
            targetId: "1",
            title: "情绪管理入门",
            reason: "匹配情绪调节需求",
            priority: 90,
          },
        ],
        createdAt: "2026-05-09T10:00:00+08:00",
      }).success
    ).toBe(true);

    expect(
      CounselingAppointmentSchema.safeParse({
        id: "appointment_1",
        userId: "user_1",
        counselorId: "counselor_1",
        slotId: "slot_1",
        channel: "video",
        status: "scheduled",
        concernTags: ["情绪低落", "睡眠焦虑"],
        createdAt: "2026-05-09T10:00:00+08:00",
        updatedAt: "2026-05-09T10:00:00+08:00",
      }).success
    ).toBe(true);
  });

  it("maps user roles to stable permissions", () => {
    expect(userCan({ roles: ["visitor"] }, "course_access:read")).toBe(true);
    expect(userCan({ roles: ["visitor"] }, "course:purchase")).toBe(false);
    expect(userCan({ roles: ["member"] }, "course:purchase")).toBe(true);
    expect(userCan({ roles: ["admin"] }, "admin:manage")).toBe(true);
  });

  it("captures consent records in login sessions", () => {
    const session = LoginSessionSchema.parse({
      provider: "phone",
      accessTokenExpiresAt: "2026-05-17T10:00:00+08:00",
      user: {
        id: "user_1",
        displayName: "测试用户",
        roles: ["member"],
        isMinor: false,
        createdAt: "2026-05-10T10:00:00+08:00",
        updatedAt: "2026-05-10T10:00:00+08:00",
      },
      consents: [
        {
          userId: "user_1",
          type: "terms",
          version: "2026.05",
          acceptedAt: "2026-05-10T10:00:00+08:00",
        },
      ],
    });

    expect(session.consents[0].type).toBe("terms");
  });
});
