import { describe, expect, it } from "vitest";
import {
  COURSE_MEMBERSHIP_PRODUCT_ID,
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
});
