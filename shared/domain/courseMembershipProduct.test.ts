import { describe, expect, it } from "vitest";
import {
  COURSE_MEMBERSHIP_PRODUCT_ID,
  CourseMembershipPlanUpdateRequestSchema,
  CourseMembershipProductAdminConsoleSchema,
  CourseMembershipProductSchema,
  defaultCourseMembershipProduct,
  getPrimaryCourseMembershipPlan,
} from "./courseMembershipProduct";

describe("course membership product contract", () => {
  it("keeps the default growth membership product parseable", () => {
    const parsed = CourseMembershipProductSchema.parse(
      defaultCourseMembershipProduct
    );

    expect(parsed.id).toBe(COURSE_MEMBERSHIP_PRODUCT_ID);
    expect(parsed.status).toBe("active");
    expect(parsed.updatedAt).toBeDefined();
    expect(parsed.plans[0]?.durationDays).toBe(365);
    expect(parsed.plans[0]?.benefits.length).toBeGreaterThan(0);
  });

  it("selects the active plan as the checkout default", () => {
    const plan = getPrimaryCourseMembershipPlan({
      ...defaultCourseMembershipProduct,
      plans: [
        { ...defaultCourseMembershipProduct.plans[0]!, status: "inactive" },
        {
          ...defaultCourseMembershipProduct.plans[0]!,
          id: "growth_membership_quarterly",
          title: "成长会员季卡",
          status: "active",
        },
      ],
    });

    expect(plan.id).toBe("growth_membership_quarterly");
  });

  it("describes the admin console with product snapshot and audit events", () => {
    const payload = CourseMembershipProductAdminConsoleSchema.parse({
      serverTime: "2026-05-19T10:00:00.000Z",
      product: defaultCourseMembershipProduct,
      auditEvents: [
        {
          id: "audit_membership_plan_1",
          productId: defaultCourseMembershipProduct.id,
          productTitle: defaultCourseMembershipProduct.title,
          planId: defaultCourseMembershipProduct.plans[0]?.id,
          planTitle: defaultCourseMembershipProduct.plans[0]?.title,
          actorId: "operator_1",
          actorRoles: ["operator"],
          action: "plan_status_update",
          reason: "会员套餐生命周期状态调整",
          before: { status: "active" },
          after: { status: "inactive" },
          createdAt: "2026-05-19T10:00:00.000Z",
        },
      ],
    });

    expect(payload.version).toBe("2026.05");
    expect(payload.auditEvents[0]?.actorRoles).toEqual(["operator"]);
  });

  it("rejects membership plan prices where payable is above original", () => {
    const plan = defaultCourseMembershipProduct.plans[0]!;

    const parsed = CourseMembershipPlanUpdateRequestSchema.safeParse({
      title: plan.title,
      subtitle: plan.subtitle,
      planName: plan.planName,
      durationDays: plan.durationDays,
      originalPrice: 199,
      payablePrice: 399,
      benefits: plan.benefits,
      audience: plan.audience,
      protections: plan.protections,
      notices: plan.notices,
      reason: "非法会员价格验证",
    });

    expect(parsed.success).toBe(false);
  });
});
