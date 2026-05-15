import { describe, expect, it } from "vitest";
import type { CourseAccessResult } from "./courseAccess";
import {
  getCourseAccessDescription,
  getCourseDetailPrimaryActionCopy,
} from "./courseDetailConversion";

const baseAccess: CourseAccessResult = {
  status: "free",
  canStart: true,
  canPurchase: false,
  canActivateMembership: false,
};

describe("course detail conversion copy", () => {
  it("uses learning-plan copy before a course starts", () => {
    expect(getCourseDetailPrimaryActionCopy(baseAccess, false)).toMatchObject({
      label: "加入学习计划",
      icon: "play",
    });
  });

  it("uses continue copy after a course has started", () => {
    expect(getCourseDetailPrimaryActionCopy(baseAccess, true).label).toBe(
      "继续学习"
    );
  });

  it("separates membership and purchase locked states", () => {
    expect(
      getCourseDetailPrimaryActionCopy(
        {
          status: "requires_membership",
          canStart: false,
          canPurchase: true,
          canActivateMembership: true,
        },
        false
      )
    ).toMatchObject({
      label: "开通会员学习",
      icon: "crown",
    });

    expect(
      getCourseDetailPrimaryActionCopy(
        {
          status: "requires_purchase",
          canStart: false,
          canPurchase: true,
          canActivateMembership: false,
        },
        false
      )
    ).toMatchObject({
      label: "购买并解锁",
      icon: "shoppingBag",
    });
  });

  it("keeps short explanations for every access status", () => {
    expect(getCourseAccessDescription("member_included")).toContain("会员");
    expect(getCourseAccessDescription("requires_purchase")).toContain("购买");
  });
});
