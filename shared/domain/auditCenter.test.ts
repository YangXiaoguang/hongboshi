import { describe, expect, it } from "vitest";
import {
  AuditCenterDetailResultSchema,
  AuditCenterExportQuerySchema,
  AuditCenterExportSchema,
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

  it("validates export metadata and strips pagination from export queries", () => {
    const query = AuditCenterExportQuerySchema.parse({
      module: "catalog",
      resourceKeyword: "course_product_1",
      page: 8,
    });

    expect(query).toMatchObject({
      module: "catalog",
      resourceKeyword: "course_product_1",
      format: "csv",
    });
    expect(query).not.toHaveProperty("page");

    const parsed = AuditCenterExportSchema.parse({
      metadata: {
        exportId: "audit_export_20260514100100",
        format: "csv",
        filename: "hongboshi-audit-20260514100100.csv",
        generatedAt: "2026-05-14T10:01:00.000Z",
        generatedBy: {
          id: "operator_1",
          roles: ["operator"],
        },
        query,
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
        rowCount: 1,
        policyVersion: "audit-center-csv-v1",
        fields: [
          {
            key: "occurredAt",
            label: "发生时间",
            description: "审计事件发生时间。",
          },
        ],
        privacyNotice: "审计中心只聚合后台操作摘要。",
      },
      rows: [
        {
          occurredAt: event.occurredAt,
          module: event.module,
          action: event.action,
          resourceType: event.resource.type,
          resourceId: event.resource.id,
          resourceLabel: event.resource.label,
          actorId: event.actor.id,
          actorRoles: event.actor.roles,
          reason: event.reason,
          summary: event.summary,
          sourceEventId: event.sourceEventId,
          auditEventId: event.id,
          beforeSummary: '{"status":"draft"}',
          afterSummary: '{"status":"published"}',
        },
      ],
      csv: "metadata_key,metadata_value\npolicyVersion,audit-center-csv-v1",
      filename: "hongboshi-audit-20260514100100.csv",
      contentType: "text/csv; charset=utf-8",
    });

    expect(parsed.metadata.rowCount).toBe(1);
    expect(parsed.rows[0].auditEventId).toBe("catalog:audit_1");
  });

  it("validates event detail payloads with source trace hints", () => {
    const parsed = AuditCenterDetailResultSchema.parse({
      event,
      source: {
        module: "catalog",
        sourceEventId: "audit_1",
        resourceType: "course_product",
        resourceId: "course_product_1",
        resourceLabel: "亲密关系修复课",
        traceHint: "来源模块 catalog 的原始事件 audit_1",
      },
      privacyNotice: "审计中心只聚合后台操作摘要。",
      generatedAt: "2026-05-14T10:01:00.000Z",
    });

    expect(parsed.source).toMatchObject({
      module: "catalog",
      sourceEventId: "audit_1",
    });
  });
});
