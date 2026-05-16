import { describe, expect, it } from "vitest";
import { ALL_AUDIT_CENTER_MODULE, type AuditCenterQuery } from "@shared/domain";
import {
  auditArchiveFilterSummary,
  buildAuditArchiveRequest,
  buildAuditArchiveSearchQuery,
  canShowAuditArchivePanel,
} from "./AuditCenter";

describe("audit center archive console helpers", () => {
  it("builds archive requests from current filters without pagination", () => {
    const query: Partial<AuditCenterQuery> = {
      module: "catalog",
      action: "",
      resourceKeyword: "course_product_1",
      page: 4,
      pageSize: 20,
    };

    expect(buildAuditArchiveRequest(query)).toEqual({
      module: "catalog",
      resourceKeyword: "course_product_1",
    });
    expect(buildAuditArchiveSearchQuery(query)).toEqual({
      module: "catalog",
      resourceKeyword: "course_product_1",
      page: 1,
      pageSize: 5,
      sortBy: "archivedAt",
    });
  });

  it("summarizes the visible archive filter boundary", () => {
    expect(
      auditArchiveFilterSummary({
        module: ALL_AUDIT_CENTER_MODULE,
        dateFrom: "2026-05-14",
        dateTo: "2026-05-15",
      })
    ).toBe("模块：全部 / 开始：2026-05-14 / 结束：2026-05-15");

    expect(
      auditArchiveFilterSummary({
        module: "risk",
        action: "escalate",
        actorId: "admin_1",
      })
    ).toContain("模块：风险复核");
  });

  it("shows archive controls only to audit archive users", () => {
    expect(canShowAuditArchivePanel({ roles: ["admin"] })).toBe(true);
    expect(canShowAuditArchivePanel({ roles: ["operator"] })).toBe(false);
    expect(canShowAuditArchivePanel(null)).toBe(false);
  });
});
