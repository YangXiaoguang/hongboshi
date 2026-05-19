import { describe, expect, it } from "vitest";
import { defaultCourseMembershipProduct } from "@shared/domain";
import {
  parseCourseMembershipProductConsoleResponse,
  parseCourseMembershipProductMutationResponse,
} from "./httpCourseMembershipProductRepository";

describe("http course membership product repository parsers", () => {
  it("parses admin console responses", () => {
    const parsed = parseCourseMembershipProductConsoleResponse({
      ok: true,
      data: {
        serverTime: "2026-05-19T10:00:00.000Z",
        product: defaultCourseMembershipProduct,
        auditEvents: [],
      },
    });

    expect(parsed.product.id).toBe(defaultCourseMembershipProduct.id);
    expect(parsed.version).toBe("2026.05");
  });

  it("parses mutation responses and surfaces API errors", () => {
    const parsed = parseCourseMembershipProductMutationResponse({
      ok: true,
      data: {
        product: defaultCourseMembershipProduct,
        auditEvent: {
          id: "audit_membership_plan_1",
          productId: defaultCourseMembershipProduct.id,
          productTitle: defaultCourseMembershipProduct.title,
          planId: defaultCourseMembershipProduct.plans[0]?.id,
          planTitle: defaultCourseMembershipProduct.plans[0]?.title,
          actorId: "operator_1",
          actorRoles: ["operator"],
          action: "plan_update",
          reason: "会员套餐价格调整",
          before: { payablePrice: 499 },
          after: { payablePrice: 399 },
          createdAt: "2026-05-19T10:10:00.000Z",
        },
        auditEvents: [],
      },
    });

    expect(parsed.auditEvent.action).toBe("plan_update");
    expect(() =>
      parseCourseMembershipProductConsoleResponse({
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "当前账号暂无会员商品运营权限",
        },
      })
    ).toThrow("当前账号暂无会员商品运营权限");
  });
});
