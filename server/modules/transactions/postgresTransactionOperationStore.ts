import {
  TransactionAdminAuditEventSchema,
  TransactionAdminWorkOrderSchema,
  type TransactionAdminAuditEvent,
  type TransactionAdminWorkOrder,
} from "../../../shared/domain";
import type { DatabaseQueryExecutor } from "../../db/postgres";
import type { TransactionOperationStore } from "./transactionOperationStore";

type TransactionWorkOrderRow = {
  id: string;
  transaction_id: string;
  order_id: string;
  status: TransactionAdminWorkOrder["status"];
  severity: TransactionAdminWorkOrder["severity"];
  reason: string;
  marked_by: string;
  marked_at: string | Date;
  resolved_by: string | null;
  resolved_at: string | Date | null;
  resolution: string | null;
};

type TransactionAuditEventRow = {
  id: string;
  transaction_id: string;
  order_id: string;
  user_id: string;
  actor_id: string;
  actor_roles: string[];
  action: TransactionAdminAuditEvent["action"];
  reason: string;
  before_snapshot: unknown;
  after_snapshot: unknown;
  refund_provider_result: unknown | null;
  created_at: string | Date;
};

function toDateTimeLike(value: string | Date | null | undefined) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function rowToWorkOrder(row: TransactionWorkOrderRow) {
  return TransactionAdminWorkOrderSchema.parse({
    id: row.id,
    transactionId: row.transaction_id,
    orderId: row.order_id,
    status: row.status,
    severity: row.severity,
    reason: row.reason,
    markedBy: row.marked_by,
    markedAt: toDateTimeLike(row.marked_at) ?? new Date(0).toISOString(),
    resolvedBy: row.resolved_by ?? undefined,
    resolvedAt: toDateTimeLike(row.resolved_at),
    resolution: row.resolution ?? undefined,
  });
}

function rowToAuditEvent(row: TransactionAuditEventRow) {
  return TransactionAdminAuditEventSchema.parse({
    id: row.id,
    transactionId: row.transaction_id,
    orderId: row.order_id,
    userId: row.user_id,
    actorId: row.actor_id,
    actorRoles: row.actor_roles,
    action: row.action,
    reason: row.reason,
    before: row.before_snapshot,
    after: row.after_snapshot,
    refundProviderResult: row.refund_provider_result ?? undefined,
    createdAt: toDateTimeLike(row.created_at) ?? new Date(0).toISOString(),
  });
}

const workOrderReturningSql = `
  id,
  transaction_id,
  order_id,
  status,
  severity,
  reason,
  marked_by,
  marked_at,
  resolved_by,
  resolved_at,
  resolution
`;

const auditEventReturningSql = `
  id,
  transaction_id,
  order_id,
  user_id,
  actor_id,
  actor_roles,
  action,
  reason,
  before_snapshot,
  after_snapshot,
  refund_provider_result,
  created_at
`;

export class PostgresTransactionOperationStore
  implements TransactionOperationStore
{
  constructor(private readonly db: DatabaseQueryExecutor) {}

  async getWorkOrder(transactionId: string) {
    const result = await this.db.query<TransactionWorkOrderRow>(
      `
        SELECT ${workOrderReturningSql}
        FROM transaction_admin_work_orders
        WHERE transaction_id = $1
        LIMIT 1
      `,
      [transactionId]
    );

    return result.rows[0] ? rowToWorkOrder(result.rows[0]) : undefined;
  }

  async listWorkOrders() {
    const result = await this.db.query<TransactionWorkOrderRow>(
      `
        SELECT ${workOrderReturningSql}
        FROM transaction_admin_work_orders
        ORDER BY marked_at DESC
      `
    );

    return result.rows.map(rowToWorkOrder);
  }

  async saveWorkOrder(workOrder: TransactionAdminWorkOrder) {
    const normalized = TransactionAdminWorkOrderSchema.parse(workOrder);
    const result = await this.db.query<TransactionWorkOrderRow>(
      `
        INSERT INTO transaction_admin_work_orders (
          id,
          transaction_id,
          order_id,
          status,
          severity,
          reason,
          marked_by,
          marked_at,
          resolved_by,
          resolved_at,
          resolution,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (transaction_id) DO UPDATE
        SET
          id = EXCLUDED.id,
          order_id = EXCLUDED.order_id,
          status = EXCLUDED.status,
          severity = EXCLUDED.severity,
          reason = EXCLUDED.reason,
          marked_by = EXCLUDED.marked_by,
          marked_at = EXCLUDED.marked_at,
          resolved_by = EXCLUDED.resolved_by,
          resolved_at = EXCLUDED.resolved_at,
          resolution = EXCLUDED.resolution,
          updated_at = NOW()
        RETURNING ${workOrderReturningSql}
      `,
      [
        normalized.id,
        normalized.transactionId,
        normalized.orderId,
        normalized.status,
        normalized.severity,
        normalized.reason,
        normalized.markedBy,
        normalized.markedAt,
        normalized.resolvedBy ?? null,
        normalized.resolvedAt ?? null,
        normalized.resolution ?? null,
      ]
    );

    if (!result.rows[0]) throw new Error("TRANSACTION_WORK_ORDER_NOT_SAVED");
    return rowToWorkOrder(result.rows[0]);
  }

  async listAuditEvents(transactionId: string) {
    const result = await this.db.query<TransactionAuditEventRow>(
      `
        SELECT ${auditEventReturningSql}
        FROM transaction_admin_audit_events
        WHERE transaction_id = $1
        ORDER BY created_at DESC
      `,
      [transactionId]
    );

    return result.rows.map(rowToAuditEvent);
  }

  async appendAuditEvent(event: TransactionAdminAuditEvent) {
    const normalized = TransactionAdminAuditEventSchema.parse(event);
    const result = await this.db.query<TransactionAuditEventRow>(
      `
        INSERT INTO transaction_admin_audit_events (
          id,
          transaction_id,
          order_id,
          user_id,
          actor_id,
          actor_roles,
          action,
          reason,
          before_snapshot,
          after_snapshot,
          refund_provider_result,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING ${auditEventReturningSql}
      `,
      [
        normalized.id,
        normalized.transactionId,
        normalized.orderId,
        normalized.userId,
        normalized.actorId,
        normalized.actorRoles,
        normalized.action,
        normalized.reason,
        normalized.before,
        normalized.after,
        normalized.refundProviderResult ?? null,
        normalized.createdAt,
      ]
    );

    if (!result.rows[0]) throw new Error("TRANSACTION_AUDIT_EVENT_NOT_SAVED");
    return rowToAuditEvent(result.rows[0]);
  }

  async clear() {
    await this.db.query("DELETE FROM transaction_admin_audit_events");
    await this.db.query("DELETE FROM transaction_admin_work_orders");
  }
}
