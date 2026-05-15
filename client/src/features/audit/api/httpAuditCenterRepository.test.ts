import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  httpAuditCenterRepository,
  parseAuditCenterDetailResponse,
  parseAuditCenterListResponse,
} from "./httpAuditCenterRepository";

const auditEvent = {
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

const payload = {
  ok: true,
  data: {
    items: [auditEvent],
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
  },
};

const detailPayload = {
  ok: true,
  data: {
    event: auditEvent,
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
  },
};

describe("http audit center repository", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses audit center list responses", () => {
    const parsed = parseAuditCenterListResponse(payload);

    expect(parsed.items[0]).toMatchObject({
      module: "catalog",
      action: "status_update",
      resource: {
        id: "course_product_1",
      },
    });
    expect(parsed.summary.totalCount).toBe(1);
  });

  it("parses audit center detail responses", () => {
    const parsed = parseAuditCenterDetailResponse(detailPayload);

    expect(parsed.event.id).toBe("catalog:audit_1");
    expect(parsed.source).toMatchObject({
      module: "catalog",
      sourceEventId: "audit_1",
    });
  });

  it("loads audit events with filters", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await httpAuditCenterRepository.loadEvents({
      module: "catalog",
      actorId: "operator_1",
      resourceKeyword: "course_product_1",
      dateFrom: "2026-05-14",
      page: 2,
    });

    expect(result.items).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/audit/admin/events?"),
      expect.objectContaining({
        credentials: "same-origin",
      })
    );
    const requestedUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestedUrl).toContain("module=catalog");
    expect(requestedUrl).toContain("actorId=operator_1");
    expect(requestedUrl).toContain("resourceKeyword=course_product_1");
    expect(requestedUrl).toContain("dateFrom=2026-05-14");
    expect(requestedUrl).toContain("page=2");
  });

  it("loads audit event details with encoded event ids", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => detailPayload,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result =
      await httpAuditCenterRepository.loadEventDetail("catalog:audit_1");

    expect(result.source.sourceEventId).toBe("audit_1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/audit/admin/events/catalog%3Aaudit_1",
      expect.objectContaining({
        credentials: "same-origin",
      })
    );
  });

  it("exports audit CSV without pagination parameters", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "metadata_key,metadata_value\nrowCount,1",
      headers: {
        get: (name: string) => {
          if (name === "Content-Disposition") {
            return 'attachment; filename="hongboshi-audit-20260514100100.csv"';
          }
          if (name === "Content-Type") return "text/csv; charset=utf-8";
          if (name === "X-Hongboshi-Audit-Export-Id") {
            return "audit_export_20260514100100000";
          }
          if (name === "X-Hongboshi-Audit-Policy-Version") {
            return "audit-center-csv-v1";
          }
          return null;
        },
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await httpAuditCenterRepository.exportCsv({
      module: "catalog",
      page: 3,
      resourceKeyword: "course_product_1",
    });

    expect(result).toMatchObject({
      filename: "hongboshi-audit-20260514100100.csv",
      exportId: "audit_export_20260514100100000",
      policyVersion: "audit-center-csv-v1",
    });
    const requestedUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestedUrl).toContain("/api/audit/admin/export?");
    expect(requestedUrl).toContain("module=catalog");
    expect(requestedUrl).toContain("resourceKeyword=course_product_1");
    expect(requestedUrl).not.toContain("page=");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          Accept: "text/csv",
        },
      })
    );
  });

  it("surfaces API error messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          ok: false,
          error: {
            code: "FORBIDDEN",
            message: "当前账号暂无审计中心读取权限",
          },
        }),
      })
    );

    await expect(httpAuditCenterRepository.loadEvents()).rejects.toThrow(
      "当前账号暂无审计中心读取权限"
    );
  });
});
