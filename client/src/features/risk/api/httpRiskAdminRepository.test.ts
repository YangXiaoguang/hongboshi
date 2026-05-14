import { afterEach, describe, expect, it, vi } from "vitest";
import {
  httpRiskAdminRepository,
  parseRiskAdminDetailResponse,
  parseRiskAdminListResponse,
  parseRiskAdminMutationResponse,
} from "./httpRiskAdminRepository";

const event = {
  id: "risk_urgent_1",
  user: {
    id: "u_risk_1",
    displayName: "风险复核用户",
    phoneMasked: "138****2049",
  },
  source: "assessment",
  riskLevel: "urgent",
  status: "open",
  reviewerId: undefined,
  createdAt: "2026-05-13T09:00:00.000Z",
  resolvedAt: undefined,
  signalSummary: "心理测评触发紧急风险复核",
  relatedObject: {
    type: "assessment_report",
    id: "report_1",
    status: "urgent",
    occurredAt: "2026-05-13T09:00:00.000Z",
    summary: "测评报告风险等级：urgent",
  },
  recordCount: 0,
};

const record = {
  id: "risk_review_1",
  riskEventId: "risk_urgent_1",
  userId: "u_risk_1",
  action: "start_review",
  actorId: "operator_1",
  actorRoles: ["operator"],
  previousStatus: "open",
  nextStatus: "reviewing",
  note: "已开始人工复核",
  createdAt: "2026-05-13T10:00:00.000Z",
};

const listData = {
  items: [event],
  summary: {
    totalCount: 1,
    openCount: 1,
    reviewingCount: 0,
    escalatedCount: 0,
    resolvedCount: 0,
    urgentCount: 1,
    highCount: 0,
    needsActionCount: 1,
  },
  meta: {
    page: 1,
    pageSize: 12,
    total: 1,
    totalPages: 1,
  },
  query: {},
  privacyNotice: "风险复核台仅展示运营处理所需摘要。",
  generatedAt: "2026-05-13T10:00:00.000Z",
};

const detailData = {
  event,
  records: [],
  sopHints: ["优先确认用户当前安全状态。"],
  privacyNotice: "风险复核台仅展示运营处理所需摘要。",
  generatedAt: "2026-05-13T10:00:00.000Z",
};

const mutationData = {
  detail: {
    ...detailData,
    event: {
      ...event,
      status: "reviewing",
      reviewerId: "operator_1",
      latestRecord: record,
      recordCount: 1,
    },
    records: [record],
  },
  record,
  serverTime: "2026-05-13T10:00:00.000Z",
};

describe("http risk admin repository", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses risk admin list responses", () => {
    const parsed = parseRiskAdminListResponse({
      ok: true,
      data: listData,
    });

    expect(parsed.items[0]?.id).toBe("risk_urgent_1");
    expect(parsed.summary.needsActionCount).toBe(1);
  });

  it("throws API error messages", () => {
    expect(() =>
      parseRiskAdminListResponse({
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "当前账号暂无风险复核读取权限",
        },
      })
    ).toThrow("当前账号暂无风险复核读取权限");
  });

  it("parses detail and mutation responses", () => {
    expect(
      parseRiskAdminDetailResponse({
        ok: true,
        data: detailData,
      }).sopHints[0]
    ).toContain("安全状态");
    expect(
      parseRiskAdminMutationResponse({
        ok: true,
        data: mutationData,
      }).record.action
    ).toBe("start_review");
  });

  it("loads risk events with filters", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true, data: listData }))
      );

    const result = await httpRiskAdminRepository.loadEvents({
      keyword: "风险",
      riskLevel: "urgent",
      status: "open",
      source: "assessment",
      sort: "risk_level_desc",
      page: 2,
    });

    expect(result.items[0]?.riskLevel).toBe("urgent");
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/api/risk/admin/events?");
    expect(String(url)).toContain("keyword=%E9%A3%8E%E9%99%A9");
    expect(String(url)).toContain("riskLevel=urgent");
    expect(String(url)).toContain("status=open");
    expect(String(url)).toContain("source=assessment");
    expect(String(url)).toContain("sort=risk_level_desc");
    expect(String(url)).toContain("page=2");
    expect(init).toEqual(
      expect.objectContaining({
        credentials: "same-origin",
      })
    );
  });

  it("loads detail and submits actions", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, data: detailData }))
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, data: mutationData }))
      );

    const detail =
      await httpRiskAdminRepository.loadEventDetail("risk_urgent_1");
    const mutation = await httpRiskAdminRepository.updateEvent(
      "risk_urgent_1",
      {
        action: "start_review",
        note: "已开始人工复核",
      }
    );

    expect(detail.event.id).toBe("risk_urgent_1");
    expect(mutation.record.nextStatus).toBe("reviewing");
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/risk/admin/events/risk_urgent_1"
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "/api/risk/admin/events/risk_urgent_1/actions"
    );
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        method: "PATCH",
        credentials: "same-origin",
      })
    );
  });
});
