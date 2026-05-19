import { describe, expect, it } from "vitest";
import { defaultCourseMembershipProduct } from "../../../shared/domain";
import {
  courseMembershipProductOperationPermissions,
  getCourseMembershipProductAdminConsolePayload,
  updateCourseMembershipPlanPayload,
  updateCourseMembershipPlanStatusPayload,
} from "./courseMembershipProductApi";
import { InMemoryCourseMembershipProductStore } from "./courseMembershipProductStore";

describe("course membership product admin api payloads", () => {
  it("requires membership product read permission", async () => {
    const store = new InMemoryCourseMembershipProductStore();
    const anonymous = await getCourseMembershipProductAdminConsolePayload(
      null,
      store
    );
    const forbidden = await getCourseMembershipProductAdminConsolePayload(
      { id: "member_1", roles: ["member"] },
      store
    );
    const allowed = await getCourseMembershipProductAdminConsolePayload(
      { id: "catalog_viewer_1", roles: ["catalog_viewer"] },
      store
    );

    expect(anonymous.status).toBe(401);
    expect(forbidden.status).toBe(403);
    expect(allowed.status).toBe(200);
  });

  it("keeps membership product operation permissions explicit", () => {
    expect(courseMembershipProductOperationPermissions).toEqual({
      read: "membership_product:read",
      manage: "membership_product:manage",
    });
  });

  it("allows operators to update plan price and records audit", async () => {
    const store = new InMemoryCourseMembershipProductStore();
    const plan = defaultCourseMembershipProduct.plans[0]!;

    const payload = await updateCourseMembershipPlanPayload(
      { id: "operator_1", roles: ["operator"] },
      plan.id,
      {
        title: plan.title,
        subtitle: plan.subtitle,
        planName: plan.planName,
        badge: plan.badge,
        durationDays: plan.durationDays,
        originalPrice: 899,
        payablePrice: 499,
        benefits: plan.benefits,
        audience: plan.audience,
        protections: plan.protections,
        notices: plan.notices,
        reason: "会员套餐价格运营调整",
      },
      store,
      "2026-05-19T11:00:00.000Z"
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (payload.body.ok) {
      expect(payload.body.data.product.plans[0]?.payablePrice).toBe(499);
      expect(payload.body.data.auditEvent.action).toBe("plan_update");
      expect(payload.body.data.auditEvent.actorRoles).toEqual(["operator"]);
    }
  });

  it("rejects read-only actors from membership product mutations", async () => {
    const store = new InMemoryCourseMembershipProductStore();
    const plan = defaultCourseMembershipProduct.plans[0]!;

    const denied = await updateCourseMembershipPlanStatusPayload(
      { id: "catalog_viewer_1", roles: ["catalog_viewer"] },
      plan.id,
      {
        status: "inactive",
        reason: "只读账号不能暂停会员套餐",
      },
      store
    );

    expect(denied.status).toBe(403);
  });

  it("rejects invalid plan price requests", async () => {
    const store = new InMemoryCourseMembershipProductStore();
    const plan = defaultCourseMembershipProduct.plans[0]!;

    const payload = await updateCourseMembershipPlanPayload(
      { id: "operator_1", roles: ["operator"] },
      plan.id,
      {
        title: plan.title,
        subtitle: plan.subtitle,
        planName: plan.planName,
        durationDays: plan.durationDays,
        originalPrice: 99,
        payablePrice: 199,
        benefits: plan.benefits,
        audience: plan.audience,
        protections: plan.protections,
        notices: plan.notices,
        reason: "非法会员价格验证",
      },
      store
    );

    expect(payload.status).toBe(400);
  });
});
