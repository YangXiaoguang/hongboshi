import { describe, expect, it } from "vitest";
import { defaultCourseMembershipProduct } from "@shared/domain";
import {
  CourseMembershipProductRequestError,
  parseCourseMembershipProductConsoleResponse,
  parseCourseMembershipProductMutationResponse,
  parseCourseMembershipProductSnapshotResponse,
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

  it("parses public membership product snapshots", () => {
    const parsed = parseCourseMembershipProductSnapshotResponse({
      ok: true,
      data: {
        serverTime: "2026-05-19T10:00:00.000Z",
        product: {
          ...defaultCourseMembershipProduct,
          plans: [defaultCourseMembershipProduct.plans[0]],
        },
      },
    });

    expect(parsed.version).toBe("2026.05");
    expect(parsed.product.plans).toHaveLength(1);
    expect(parsed.product.plans[0]?.status).toBe("active");
  });

  it("preserves public snapshot unavailable errors for user-facing guards", () => {
    expect(() =>
      parseCourseMembershipProductSnapshotResponse({
        ok: false,
        error: {
          code: "CONFLICT",
          message: "会员商品暂不可用",
        },
      })
    ).toThrow(CourseMembershipProductRequestError);

    try {
      parseCourseMembershipProductSnapshotResponse({
        ok: false,
        error: {
          code: "CONFLICT",
          message: "会员商品暂不可用",
        },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(CourseMembershipProductRequestError);
      expect((err as CourseMembershipProductRequestError).code).toBe(
        "CONFLICT"
      );
    }
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
