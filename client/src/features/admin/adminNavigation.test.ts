import { describe, expect, it } from "vitest";
import {
  adminNavigationItems,
  canAccessAdmin,
  findAdminNavigationItem,
  getAdminAccessState,
  getAvailableAdminNavigationItems,
  getPlannedAdminNavigationItems,
  isAdminNavigationItemActive,
} from "./adminNavigation";

describe("admin navigation model", () => {
  it("classifies admin access states", () => {
    expect(getAdminAccessState(null, true)).toBe("syncing");
    expect(getAdminAccessState(null, false)).toBe("anonymous");
    expect(getAdminAccessState({ roles: ["member"] }, false)).toBe("forbidden");
    expect(getAdminAccessState({ roles: ["operator"] }, false)).toBe(
      "authorized"
    );
    expect(getAdminAccessState({ roles: ["admin"] }, false)).toBe("authorized");
  });

  it("exposes only admin modules to operator and admin users", () => {
    expect(canAccessAdmin({ roles: ["member"] })).toBe(false);
    expect(getAvailableAdminNavigationItems({ roles: ["member"] })).toEqual([]);

    const operatorModules = getAvailableAdminNavigationItems({
      roles: ["operator"],
    }).map(item => item.key);

    expect(operatorModules).toEqual([
      "overview",
      "counseling",
      "payments",
      "courses",
    ]);
    expect(
      getPlannedAdminNavigationItems({ roles: ["admin"] }).map(item => item.key)
    ).toEqual(["users", "orders", "transactions", "finance", "risk", "audit"]);
  });

  it("matches active admin routes without activating sibling modules", () => {
    const overview = adminNavigationItems.find(item => item.key === "overview");
    const payments = adminNavigationItems.find(item => item.key === "payments");

    expect(overview).toBeDefined();
    expect(payments).toBeDefined();

    expect(isAdminNavigationItemActive(overview!, "/admin")).toBe(true);
    expect(isAdminNavigationItemActive(overview!, "/admin/payments")).toBe(
      false
    );
    expect(isAdminNavigationItemActive(payments!, "/admin/payments")).toBe(
      true
    );
    expect(findAdminNavigationItem("/admin/counseling")?.key).toBe(
      "counseling"
    );
  });
});
