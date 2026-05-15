import { beforeEach, describe, expect, it } from "vitest";
import type {
  CourseProductAuditEvent,
  CounselingOperationAuditEvent,
  OrderAdminAuditEvent,
  RiskAdminReviewRecord,
  TransactionAdminAuditEvent,
  UserAdminMembershipAuditEvent,
} from "../../../shared/domain";
import {
  InMemoryCourseProductStore,
  setCourseProductStore,
  type CourseProductStore,
} from "../catalog/courseProductStore";
import { setCounselingOperationStore } from "../counseling/counselingApi";
import {
  InMemoryCounselingOperationStore,
  type CounselingOperationStore,
} from "../counseling/counselingOperationStore";
import {
  InMemoryCourseAccessStore,
  type CourseAccessStore,
} from "../courses/courseAccessStore";
import { setCourseAccessStore } from "../courses/courseAccessApi";
import { setRiskReviewStore } from "../risk/riskAdminApi";
import {
  InMemoryRiskReviewStore,
  type RiskReviewStore,
} from "../risk/riskReviewStore";
import {
  InMemoryTransactionOperationStore,
  setTransactionOperationStore,
  type TransactionOperationStore,
} from "../transactions/transactionOperationStore";
import {
  getAuditCenterEventDetailPayload,
  getAuditCenterEventsPayload,
  getAuditCenterExportPayload,
} from "./auditAdminApi";

const operator = { id: "operator_1", roles: ["operator" as const] };
const admin = { id: "admin_1", roles: ["admin" as const] };
const member = { id: "member_1", roles: ["member" as const] };
const now = "2026-05-14T12:00:00.000Z";

let courseProductStore: CourseProductStore;
let courseAccessStore: CourseAccessStore;
let counselingOperationStore: CounselingOperationStore;
let riskReviewStore: RiskReviewStore;
let transactionOperationStore: TransactionOperationStore;

beforeEach(() => {
  courseProductStore = new InMemoryCourseProductStore([]);
  courseAccessStore = new InMemoryCourseAccessStore();
  counselingOperationStore = new InMemoryCounselingOperationStore();
  riskReviewStore = new InMemoryRiskReviewStore();
  transactionOperationStore = new InMemoryTransactionOperationStore();

  setCourseProductStore(courseProductStore);
  setCourseAccessStore(courseAccessStore);
  setCounselingOperationStore(counselingOperationStore);
  setRiskReviewStore(riskReviewStore);
  setTransactionOperationStore(transactionOperationStore);
});

const catalogAudit: CourseProductAuditEvent = {
  id: "catalog_audit_1",
  productId: "course_product_1",
  productTitle: "亲密关系修复课",
  actorId: "operator_1",
  action: "status_update",
  reason: "上线前复核通过",
  before: {
    status: "draft",
  },
  after: {
    status: "published",
  },
  createdAt: "2026-05-14T08:00:00.000Z",
};

const membershipAudit: UserAdminMembershipAuditEvent = {
  id: "membership_audit_1",
  userId: "user_1",
  actorId: "operator_1",
  actorRoles: ["operator"],
  action: "activate",
  reason: "用户购买会员后开通",
  before: {
    status: "none",
  },
  after: {
    status: "active",
    planName: "成长会员",
    activatedAt: "2026-05-14T08:30:00.000Z",
    expiresAt: "2027-05-14T08:30:00.000Z",
  },
  createdAt: "2026-05-14T08:30:00.000Z",
};

const orderAudit: OrderAdminAuditEvent = {
  id: "order_audit_1",
  orderId: "order_course_1",
  userId: "user_1",
  actorId: "operator_1",
  actorRoles: ["operator"],
  action: "mark_exception",
  reason: "支付状态需要人工核查",
  before: {
    status: "paid",
  },
  after: {
    status: "paid",
    exception: {
      orderId: "order_course_1",
      status: "open",
      severity: "warning",
      reason: "支付状态需要人工核查",
      markedBy: "operator_1",
      markedAt: "2026-05-14T09:00:00.000Z",
    },
  },
  createdAt: "2026-05-14T09:00:00.000Z",
};

const transactionAudit: TransactionAdminAuditEvent = {
  id: "transaction_audit_1",
  transactionId: "txn_1",
  orderId: "order_course_1",
  userId: "user_1",
  actorId: "operator_1",
  actorRoles: ["operator"],
  action: "request_refund",
  reason: "用户提交退款申请",
  before: {
    orderStatus: "paid",
  },
  after: {
    orderStatus: "refunding",
  },
  refundProviderResult: {
    provider: "manual",
    status: "accepted",
    requestId: "manual_refund_1",
    message: "人工退款申请已受理",
    handledAt: "2026-05-14T09:30:00.000Z",
    retryable: false,
  },
  createdAt: "2026-05-14T09:30:00.000Z",
};

const counselingAudit: CounselingOperationAuditEvent = {
  id: "counseling_audit_1",
  action: "mark_no_show",
  actorId: "operator_1",
  actorRoles: ["operator"],
  appointmentId: "appointment_1",
  userId: "user_1",
  counselorId: "counselor_1",
  previousAppointmentStatus: "scheduled",
  nextAppointmentStatus: "no_show",
  previousOrderStatus: "paid",
  nextOrderStatus: "paid",
  note: "咨询师确认用户未到场",
  createdAt: "2026-05-14T10:00:00.000Z",
};

const riskRecord: RiskAdminReviewRecord = {
  id: "risk_record_1",
  riskEventId: "risk_event_1",
  userId: "user_1",
  action: "escalate",
  actorId: "admin_1",
  actorRoles: ["admin"],
  previousStatus: "reviewing",
  nextStatus: "escalated",
  note: "按 SOP 升级人工协作",
  sopTemplateId: "sop_urgent",
  sopTemplateVersion: "v1",
  resultTemplateId: "result_escalate",
  createdAt: "2026-05-14T10:30:00.000Z",
};

async function seedAuditFacts() {
  await courseProductStore.appendAuditEvent(catalogAudit);
  await courseAccessStore.appendMembershipAuditEvent(membershipAudit);
  await courseAccessStore.appendOrderAdminAuditEvent(orderAudit);
  await transactionOperationStore.appendAuditEvent(transactionAudit);
  await counselingOperationStore.saveAuditEvent(counselingAudit);
  await riskReviewStore.appendRecord(riskRecord);
}

describe("audit admin api payloads", () => {
  it("requires audit center read permission", async () => {
    expect((await getAuditCenterEventsPayload(null, {}, now)).status).toBe(401);
    expect((await getAuditCenterEventsPayload(member, {}, now)).status).toBe(
      403
    );
    expect((await getAuditCenterEventsPayload(operator, {}, now)).status).toBe(
      200
    );
  });

  it("aggregates existing audit facts across backend modules", async () => {
    await seedAuditFacts();

    const payload = await getAuditCenterEventsPayload(operator, {}, now);

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (!payload.body.ok) throw new Error("expected audit center payload");

    expect(payload.body.data.summary.totalCount).toBe(6);
    expect(payload.body.data.summary.moduleCounts).toEqual([
      { module: "catalog", count: 1 },
      { module: "user", count: 1 },
      { module: "order", count: 1 },
      { module: "transaction", count: 1 },
      { module: "counseling", count: 1 },
      { module: "risk", count: 1 },
    ]);
    expect(payload.body.data.items.map(item => item.module)).toEqual([
      "risk",
      "counseling",
      "transaction",
      "order",
      "user",
      "catalog",
    ]);
    expect(payload.body.data.filters.actions).toEqual(
      expect.arrayContaining(["status_update", "request_refund", "escalate"])
    );
    expect(JSON.stringify(payload.body.data)).not.toContain("原始敏感风险信号");
  });

  it("filters audit events by module, action, actor, date and resource keyword", async () => {
    await seedAuditFacts();

    const riskPayload = await getAuditCenterEventsPayload(
      operator,
      { module: "risk" },
      now
    );
    const transactionPayload = await getAuditCenterEventsPayload(
      operator,
      { action: "request_refund" },
      now
    );
    const adminPayload = await getAuditCenterEventsPayload(
      operator,
      { actorId: "admin_1" },
      now
    );
    const resourcePayload = await getAuditCenterEventsPayload(
      operator,
      { resourceKeyword: "order_course_1" },
      now
    );
    const datePayload = await getAuditCenterEventsPayload(
      operator,
      { dateFrom: "2026-05-14", dateTo: "2026-05-14" },
      now
    );

    if (
      !riskPayload.body.ok ||
      !transactionPayload.body.ok ||
      !adminPayload.body.ok ||
      !resourcePayload.body.ok ||
      !datePayload.body.ok
    ) {
      throw new Error("expected filtered audit center payloads");
    }

    expect(riskPayload.body.data.items).toHaveLength(1);
    expect(riskPayload.body.data.items[0]?.module).toBe("risk");
    expect(transactionPayload.body.data.items[0]?.module).toBe("transaction");
    expect(adminPayload.body.data.items[0]?.actor.id).toBe("admin_1");
    expect(resourcePayload.body.data.items.map(item => item.module)).toEqual([
      "order",
    ]);
    expect(datePayload.body.data.summary.totalCount).toBe(6);
  });

  it("exports filtered audit events as CSV with metadata", async () => {
    await seedAuditFacts();

    const payload = await getAuditCenterExportPayload(
      operator,
      {
        module: "transaction",
        resourceKeyword: "txn_1",
        page: 9,
      },
      now
    );

    expect(payload.status).toBe(200);
    expect("csv" in payload.body).toBe(true);
    if (!("csv" in payload.body)) throw new Error("expected CSV export");

    expect(payload.body.filename).toBe("hongboshi-audit-20260514120000.csv");
    expect(payload.body.contentType).toBe("text/csv; charset=utf-8");
    expect(payload.body.metadata).toMatchObject({
      generatedAt: now,
      generatedBy: {
        id: "operator_1",
        roles: ["operator"],
      },
      rowCount: 1,
      policyVersion: "audit-center-csv-v1",
    });
    expect(payload.body.metadata.query).toMatchObject({
      module: "transaction",
      resourceKeyword: "txn_1",
      format: "csv",
    });
    expect(payload.body.metadata.query).not.toHaveProperty("page");
    expect(payload.body.rows[0]).toMatchObject({
      module: "transaction",
      sourceEventId: "transaction_audit_1",
      auditEventId: "transaction:transaction_audit_1",
      resourceId: "txn_1",
    });
    expect(payload.body.csv).toContain("metadata_key,metadata_value");
    expect(payload.body.csv).toContain("policyVersion,audit-center-csv-v1");
    expect(payload.body.csv).toContain("发生时间,模块,动作");
    expect(payload.body.csv).toContain("request_refund");
    expect(payload.body.csv).not.toContain("原始敏感风险信号");
  });

  it("requires audit read permission for CSV export and event details", async () => {
    expect((await getAuditCenterExportPayload(null, {})).status).toBe(401);
    expect((await getAuditCenterExportPayload(member, {})).status).toBe(403);

    expect(
      (await getAuditCenterEventDetailPayload(null, "risk:risk_record_1"))
        .status
    ).toBe(401);
    expect(
      (await getAuditCenterEventDetailPayload(member, "risk:risk_record_1"))
        .status
    ).toBe(403);
  });

  it("returns event details with source trace information", async () => {
    await seedAuditFacts();

    const payload = await getAuditCenterEventDetailPayload(
      operator,
      "risk:risk_record_1",
      now
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (!payload.body.ok) throw new Error("expected audit event detail");

    expect(payload.body.data.event).toMatchObject({
      id: "risk:risk_record_1",
      module: "risk",
      action: "escalate",
      sourceEventId: "risk_record_1",
    });
    expect(payload.body.data.source).toMatchObject({
      module: "risk",
      sourceEventId: "risk_record_1",
      resourceType: "risk_event",
      resourceId: "risk_event_1",
    });
    expect(payload.body.data.source.traceHint).toContain("risk_record_1");
    expect(JSON.stringify(payload.body.data)).not.toContain("原始敏感风险信号");
  });

  it("returns not found for missing audit event details", async () => {
    const payload = await getAuditCenterEventDetailPayload(
      operator,
      "risk:missing",
      now
    );

    expect(payload.status).toBe(404);
    expect(payload.body.ok).toBe(false);
    if (!payload.body.ok) {
      expect(payload.body.error.code).toBe("NOT_FOUND");
    }
  });

  it("rejects invalid audit center query values", async () => {
    const payload = await getAuditCenterEventsPayload(
      admin,
      { module: "finance", page: 0 },
      now
    );

    expect(payload.status).toBe(400);
    expect(payload.body.ok).toBe(false);
    if (!payload.body.ok) {
      expect(payload.body.error.code).toBe("BAD_REQUEST");
    }

    expect(
      (await getAuditCenterExportPayload(admin, { module: "finance" }, now))
        .status
    ).toBe(400);
  });
});
