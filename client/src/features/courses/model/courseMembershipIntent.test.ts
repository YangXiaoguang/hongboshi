import { describe, expect, it } from "vitest";
import {
  COURSE_MEMBERSHIP_REOPEN_INTENT,
  COURSE_MEMBERSHIP_REOPEN_PATH,
  getCourseMembershipCheckoutIntent,
  isCourseMembershipCheckoutIntent,
} from "./courseMembershipIntent";

describe("course membership checkout intent", () => {
  it("uses a stable path for refunded membership re-open flows", () => {
    expect(COURSE_MEMBERSHIP_REOPEN_PATH).toBe(
      "/courses?checkout=membership&intent=renew_membership"
    );
    expect(COURSE_MEMBERSHIP_REOPEN_INTENT).toBe("renew_membership");
  });

  it("recognizes membership checkout search params", () => {
    expect(
      isCourseMembershipCheckoutIntent("?checkout=membership&intent=renew")
    ).toBe(true);
    expect(isCourseMembershipCheckoutIntent("checkout=course")).toBe(false);
    expect(
      getCourseMembershipCheckoutIntent(
        new URLSearchParams("checkout=membership&intent=renew_membership")
      )
    ).toBe("renew_membership");
  });
});
