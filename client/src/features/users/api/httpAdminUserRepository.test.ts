import { afterEach, describe, expect, it, vi } from "vitest";
import {
  httpAdminUserRepository,
  parseAdminUserDetailResponse,
  parseAdminUserListResponse,
} from "./httpAdminUserRepository";

const listData = {
  items: [
    {
      id: "u_member_1",
      displayName: "测试会员",
      phoneMasked: "138****2049",
      roles: ["member"],
      membershipStatus: "active",
      membershipPlanName: "成长会员",
      membershipExpiresAt: "2027-05-12T10:00:00+08:00",
      ownedCourseCount: 2,
      orderCount: 1,
      counselingAppointmentCount: 1,
      activeRiskCount: 0,
      latestOrderStatus: "paid",
      lastActivityAt: "2026-05-12T10:00:00+08:00",
      createdAt: "2026-05-10T10:00:00+08:00",
      updatedAt: "2026-05-12T10:00:00+08:00",
      privacyFlags: {
        isMinor: false,
        guardianVerified: false,
        phoneMasked: true,
      },
    },
  ],
  meta: {
    page: 1,
    pageSize: 12,
    total: 1,
    totalPages: 1,
  },
  summary: {
    totalCount: 1,
    activeMembershipCount: 1,
    expiredMembershipCount: 0,
    minorCount: 0,
    activeRiskCount: 0,
  },
  filters: {
    roles: ["member"],
    membershipStatuses: ["active"],
  },
  query: {},
  serverTime: "2026-05-12T10:00:00+08:00",
};

const detailData = {
  user: listData.items[0],
  consents: [
    {
      type: "privacy",
      version: "2026.05",
      acceptedAt: "2026-05-10T10:00:00+08:00",
    },
  ],
  membership: {
    status: "active",
    planName: "成长会员",
    activatedAt: "2026-05-10T10:00:00+08:00",
    expiresAt: "2027-05-10T10:00:00+08:00",
    activeNow: true,
  },
  courseAccess: {
    ownedCourseIds: [1],
    ownedCourseCount: 1,
    orderCount: 1,
    recentOrders: [
      {
        id: "order_1",
        status: "paid",
        itemTypes: ["course"],
        title: "情绪管理入门",
        payableAmount: 199,
        createdAt: "2026-05-11T10:00:00+08:00",
        paidAt: "2026-05-11T10:01:00+08:00",
      },
    ],
  },
  counseling: {
    totalCount: 0,
    upcomingCount: 0,
    recentAppointments: [],
  },
  risk: {
    openCount: 0,
    recentEvents: [],
  },
  privacyNotice: "用户后台仅展示运营所需摘要。",
  generatedAt: "2026-05-12T10:00:00+08:00",
};

describe("http admin user repository", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses admin user list responses", () => {
    const parsed = parseAdminUserListResponse({
      ok: true,
      data: listData,
    });

    expect(parsed.items[0]?.membershipStatus).toBe("active");
    expect(parsed.query.pageSize).toBe(12);
  });

  it("throws API error messages", () => {
    expect(() =>
      parseAdminUserListResponse({
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "当前账号暂无用户会员读取权限",
        },
      })
    ).toThrow("当前账号暂无用户会员读取权限");
  });

  it("parses admin user detail responses", () => {
    const parsed = parseAdminUserDetailResponse({
      ok: true,
      data: detailData,
    });

    expect(parsed.courseAccess.recentOrders[0]?.status).toBe("paid");
    expect(JSON.stringify(parsed)).not.toContain("risk signal");
  });

  it("loads users from the admin endpoint with filters", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ ok: true, data: listData })));

    const result = await httpAdminUserRepository.loadUsers({
      keyword: "测试",
      membershipStatus: "active",
      page: 2,
    });

    expect(result.items[0]?.id).toBe("u_member_1");
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/api/users/admin/users?");
    expect(String(url)).toContain("keyword=%E6%B5%8B%E8%AF%95");
    expect(String(url)).toContain("membershipStatus=active");
    expect(String(url)).toContain("page=2");
    expect(init).toEqual(
      expect.objectContaining({
        credentials: "same-origin",
      })
    );
  });

  it("loads a user detail from the admin endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: detailData,
        })
      )
    );

    const detail = await httpAdminUserRepository.loadUserDetail("u_member_1");

    expect(detail.user.id).toBe("u_member_1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/users/admin/users/u_member_1",
      expect.objectContaining({
        cache: "no-store",
      })
    );
  });
});
