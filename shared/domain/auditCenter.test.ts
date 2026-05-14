import { describe, expect, it } from "vitest";
import {
  AuditCenterListResultSchema,
  AuditCenterQuerySchema,
  type AuditCenterEvent,
} from "./auditCenter";

const event: AuditCenterEvent = {
  id: "catalog:audit_1",
  sourceEventId: "audit_1",
  module: "catalog",
  action: "status_update",
  resource: {
    type: "course_product",
    id: "course_product_1",
    label: "亲密关系修复课",
  },
  actor: {
    id: "operator_1",
    roles: ["operator"],
  },
  reason: "上线前复核通过",
  summary: "课程商品「亲密关系修复课」执行 status_update",
  before: {
    status: "draft",
  },
  after: {
    status: "published",
  },
  occurredAt: "2026-05-14T10:00:00.000Z",
};

describe("audit center domain contract", () => {
  it("normalizes query defaults for a read-only audit timeline", () => {
    expect(AuditCenterQuerySchema.parse({})).toMatchObject({
      module: "all",
      page: 1,
      pageSize: 20,
    });
    expect(
      AuditCenterQuerySchema.parse({
        module: "risk",
        action: "escalate",
        actorId: "operator_1",
        resourceKeyword: "risk_1",
        dateFrom: "2026-05-14",
        dateTo: "2026-05-15",
        page: 2,
      })
    ).toMatchObject({
      module: "risk",
      action: "escalate",
      page: 2,
    });
  });

  it("validates the shared list payload across admin and client", () => {
    const parsed = AuditCenterListResultSchema.parse({
      items: [event],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
      summary: {
        totalCount: 1,
        moduleCounts: [
          { module: "catalog", count: 1 },
          { module: "user", count: 0 },
          { module: "order", count: 0 },
          { module: "transaction", count: 0 },
          { module: "counseling", count: 0 },
          { module: "risk", count: 0 },
        ],
      },
      filters: {
        modules: [
          "catalog",
          "user",
          "order",
          "transaction",
          "counseling",
          "risk",
        ],
        actions: ["status_update"],
      },
      query: {
        module: "all",
        page: 1,
        pageSize: 20,
      },
      privacyNotice: "审计中心只聚合后台操作摘要。",
      generatedAt: "2026-05-14T10:01:00.000Z",
    });

    expect(parsed.items[0]).toMatchObject({
      module: "catalog",
      resource: {
        type: "course_product",
      },
    });
  });
});
