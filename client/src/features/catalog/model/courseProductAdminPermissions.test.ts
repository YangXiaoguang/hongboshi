import { describe, expect, it } from "vitest";
import { getCourseProductAdminPermissions } from "./courseProductAdminPermissions";

describe("course product admin permissions", () => {
  it("keeps catalog viewers read-only", () => {
    expect(
      getCourseProductAdminPermissions({ roles: ["catalog_viewer"] })
    ).toMatchObject({
      canRead: true,
      canEdit: false,
      canReview: false,
      canPublish: false,
      canPrice: false,
      canMutate: false,
    });
  });

  it("lets catalog operators manage course products without global admin", () => {
    expect(
      getCourseProductAdminPermissions({ roles: ["catalog_operator"] })
    ).toMatchObject({
      canRead: true,
      canEdit: true,
      canReview: true,
      canPublish: true,
      canPrice: true,
      canMutate: true,
    });
  });
});
