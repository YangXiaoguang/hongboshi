import { describe, expect, it } from "vitest";
import { createUserMembershipSourceSummary } from "./userMembershipSource";
import type { UserAdminDetail } from "@shared/domain";

type MembershipSummary = UserAdminDetail["membership"];

describe("user membership source summary", () => {
  it("summarizes order sourced memberships", () => {
    const summary = createUserMembershipSourceSummary({
      status: "active",
      planName: "成长会员",
      sourceType: "checkout_order",
      sourceOrderId: "order_membership_1",
      sourceUpdatedAt: "2026-05-18T09:01:00.000Z",
      activeNow: true,
    } satisfies MembershipSummary);

    expect(summary).toEqual({
      label: "订单开通",
      detail: "来源订单 order_membership_1",
      updatedAt: "2026-05-18T09:01:00.000Z",
    });
  });

  it("summarizes manual membership operations without exposing private data", () => {
    const summary = createUserMembershipSourceSummary({
      status: "active",
      sourceType: "admin_manual",
      sourceActorId: "operator_1",
      sourceUpdatedAt: "2026-05-18T10:00:00.000Z",
      activeNow: true,
    } satisfies MembershipSummary);

    expect(summary.label).toBe("人工调整");
    expect(summary.detail).toBe("操作者 operator_1");
    expect(JSON.stringify(summary)).not.toContain("phone");
  });

  it("keeps old records explicit when source is missing", () => {
    const summary = createUserMembershipSourceSummary({
      status: "expired",
      activeNow: false,
    } satisfies MembershipSummary);

    expect(summary.label).toBe("来源未记录");
    expect(summary.detail).toContain("会员操作审计");
  });
});
