import { describe, expect, it } from "vitest";
import type {
  TransactionAdminAuditEvent,
  TransactionAdminWorkOrder,
} from "../../../shared/domain";
import type {
  DatabaseQueryExecutor,
  DatabaseQueryResult,
} from "../../db/postgres";
import { PostgresTransactionOperationStore } from "./postgresTransactionOperationStore";

type CapturedQuery = {
  text: string;
  values?: readonly unknown[];
};

class FakeTransactionOperationExecutor implements DatabaseQueryExecutor {
  readonly queries: CapturedQuery[] = [];

  constructor(private readonly rows: Record<string, unknown[]> = {}) {}

  async query<Row>(
    text: string,
    values?: readonly unknown[]
  ): Promise<DatabaseQueryResult<Row>> {
    this.queries.push({ text, values });

    if (text.includes("INSERT INTO transaction_admin_work_orders")) {
      return {
        rows: (this.rows.savedWorkOrders ?? []) as Row[],
        rowCount: this.rows.savedWorkOrders?.length ?? 0,
      };
    }

    if (text.includes("FROM transaction_admin_work_orders")) {
      return {
        rows: (this.rows.workOrders ?? []) as Row[],
        rowCount: this.rows.workOrders?.length ?? 0,
      };
    }

    if (text.includes("INSERT INTO transaction_admin_audit_events")) {
      return {
        rows: (this.rows.savedAuditEvents ?? []) as Row[],
        rowCount: this.rows.savedAuditEvents?.length ?? 0,
      };
    }

    if (text.includes("FROM transaction_admin_audit_events")) {
      return {
        rows: (this.rows.auditEvents ?? []) as Row[],
        rowCount: this.rows.auditEvents?.length ?? 0,
      };
    }

    return { rows: [] as Row[], rowCount: 0 };
  }
}

const workOrder: TransactionAdminWorkOrder = {
  id: "transaction_work_1",
  transactionId: "evt_payment_1",
  orderId: "order_1",
  status: "open",
  severity: "critical",
  reason: "渠道回调与订单金额不一致",
  markedBy: "operator_1",
  markedAt: "2026-05-12T10:00:00.000Z",
};

const workOrderRow = {
  id: workOrder.id,
  transaction_id: workOrder.transactionId,
  order_id: workOrder.orderId,
  status: workOrder.status,
  severity: workOrder.severity,
  reason: workOrder.reason,
  marked_by: workOrder.markedBy,
  marked_at: new Date(workOrder.markedAt),
  resolved_by: null,
  resolved_at: null,
  resolution: null,
};

const refundProviderResult = {
  provider: "manual" as const,
  status: "accepted" as const,
  requestId: "manual_refund_1",
  message: "人工退款通道已受理申请，等待退款成功回调。",
  handledAt: "2026-05-12T10:00:00.000Z",
  retryable: false,
};

const auditEvent: TransactionAdminAuditEvent = {
  id: "transaction_audit_1",
  transactionId: "evt_payment_1",
  orderId: "order_1",
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
  refundProviderResult,
  createdAt: "2026-05-12T10:00:01.000Z",
};

const auditEventRow = {
  id: auditEvent.id,
  transaction_id: auditEvent.transactionId,
  order_id: auditEvent.orderId,
  user_id: auditEvent.userId,
  actor_id: auditEvent.actorId,
  actor_roles: auditEvent.actorRoles,
  action: auditEvent.action,
  reason: auditEvent.reason,
  before_snapshot: auditEvent.before,
  after_snapshot: auditEvent.after,
  refund_provider_result: refundProviderResult,
  created_at: new Date(auditEvent.createdAt),
};

describe("postgres transaction operation store", () => {
  it("upserts transaction work orders by transaction id", async () => {
    const db = new FakeTransactionOperationExecutor({
      savedWorkOrders: [workOrderRow],
    });
    const store = new PostgresTransactionOperationStore(db);

    const saved = await store.saveWorkOrder(workOrder);

    expect(saved).toMatchObject({
      id: "transaction_work_1",
      transactionId: "evt_payment_1",
      status: "open",
    });
    expect(db.queries[0]?.text).toContain("ON CONFLICT (transaction_id)");
    expect(db.queries[0]?.values).toEqual([
      workOrder.id,
      workOrder.transactionId,
      workOrder.orderId,
      workOrder.status,
      workOrder.severity,
      workOrder.reason,
      workOrder.markedBy,
      workOrder.markedAt,
      null,
      null,
      null,
    ]);
  });

  it("maps work orders and audit events from postgres rows", async () => {
    const db = new FakeTransactionOperationExecutor({
      workOrders: [workOrderRow],
      auditEvents: [auditEventRow],
    });
    const store = new PostgresTransactionOperationStore(db);

    expect(await store.getWorkOrder("evt_payment_1")).toMatchObject({
      transactionId: "evt_payment_1",
      markedAt: "2026-05-12T10:00:00.000Z",
    });
    expect(await store.listAuditEvents("evt_payment_1")).toMatchObject([
      {
        action: "request_refund",
        refundProviderResult: {
          provider: "manual",
          status: "accepted",
        },
      },
    ]);
  });

  it("stores refund provider acceptance in audit events", async () => {
    const db = new FakeTransactionOperationExecutor({
      savedAuditEvents: [auditEventRow],
    });
    const store = new PostgresTransactionOperationStore(db);

    const saved = await store.appendAuditEvent(auditEvent);

    expect(saved.refundProviderResult).toMatchObject({
      requestId: "manual_refund_1",
      status: "accepted",
    });
    expect(db.queries[0]?.values).toEqual([
      auditEvent.id,
      auditEvent.transactionId,
      auditEvent.orderId,
      auditEvent.userId,
      auditEvent.actorId,
      auditEvent.actorRoles,
      auditEvent.action,
      auditEvent.reason,
      auditEvent.before,
      auditEvent.after,
      auditEvent.refundProviderResult,
      auditEvent.createdAt,
    ]);
  });

  it("clears audit events before work orders", async () => {
    const db = new FakeTransactionOperationExecutor();
    const store = new PostgresTransactionOperationStore(db);

    await store.clear();

    expect(db.queries.map(query => query.text)).toEqual([
      "DELETE FROM transaction_admin_audit_events",
      "DELETE FROM transaction_admin_work_orders",
    ]);
  });
});
