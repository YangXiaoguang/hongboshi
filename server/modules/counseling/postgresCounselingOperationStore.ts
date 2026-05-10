import {
  CounselingCancellationPolicySchema,
  CounselingOperationAuditEventSchema,
  type CounselingAppointment,
  type CounselingCancellationPolicy,
  type CounselingOperationAuditAction,
  type CounselingOperationAuditEvent,
  type Order,
} from "../../../shared/domain";
import type { DatabaseQueryExecutor } from "../../db/postgres";
import type {
  CancellationPolicySaveMetadata,
  CounselingOperationStore,
} from "./counselingOperationStore";

type CounselingOperationSettingRow = {
  value: unknown;
};

type CounselingOperationAuditEventRow = {
  id: string;
  action: CounselingOperationAuditAction;
  actor_id: string;
  actor_roles: string[];
  appointment_id: string | null;
  user_id: string | null;
  counselor_id: string | null;
  previous_appointment_status: CounselingAppointment["status"] | null;
  next_appointment_status: CounselingAppointment["status"] | null;
  previous_order_status: Order["status"] | null;
  next_order_status: Order["status"] | null;
  policy_before: unknown | null;
  policy_after: unknown | null;
  note: string | null;
  created_at: string | Date;
};

const CANCELLATION_POLICY_SETTING_KEY = "cancellation_policy";

function toDateTimeLike(value: string | Date) {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function counselingOperationAuditEventRowToDomain(
  row: CounselingOperationAuditEventRow
): CounselingOperationAuditEvent {
  return CounselingOperationAuditEventSchema.parse({
    id: row.id,
    action: row.action,
    actorId: row.actor_id,
    actorRoles: row.actor_roles,
    appointmentId: row.appointment_id ?? undefined,
    userId: row.user_id ?? undefined,
    counselorId: row.counselor_id ?? undefined,
    previousAppointmentStatus: row.previous_appointment_status ?? undefined,
    nextAppointmentStatus: row.next_appointment_status ?? undefined,
    previousOrderStatus: row.previous_order_status ?? undefined,
    nextOrderStatus: row.next_order_status ?? undefined,
    policyBefore: row.policy_before ?? undefined,
    policyAfter: row.policy_after ?? undefined,
    note: row.note ?? undefined,
    createdAt: toDateTimeLike(row.created_at),
  });
}

export class PostgresCounselingOperationStore implements CounselingOperationStore {
  constructor(private readonly db: DatabaseQueryExecutor) {}

  async getCancellationPolicy(): Promise<CounselingCancellationPolicy> {
    const result = await this.db.query<CounselingOperationSettingRow>(
      `
        SELECT value
        FROM counseling_operation_settings
        WHERE key = $1
        LIMIT 1
      `,
      [CANCELLATION_POLICY_SETTING_KEY]
    );

    const value = result.rows[0]?.value;
    return value
      ? CounselingCancellationPolicySchema.parse(value)
      : CounselingCancellationPolicySchema.parse({
          scheduledRefundCutoffMinutesBeforeStart: 0,
          allowPendingPaymentCancellation: true,
        });
  }

  async saveCancellationPolicy(
    policy: CounselingCancellationPolicy,
    metadata: CancellationPolicySaveMetadata
  ): Promise<CounselingCancellationPolicy> {
    const normalized = CounselingCancellationPolicySchema.parse(policy);
    const result = await this.db.query<CounselingOperationSettingRow>(
      `
        INSERT INTO counseling_operation_settings (
          key,
          value,
          updated_by,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $4)
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          updated_by = EXCLUDED.updated_by,
          updated_at = EXCLUDED.updated_at
        RETURNING value
      `,
      [
        CANCELLATION_POLICY_SETTING_KEY,
        normalized,
        metadata.actorId ?? null,
        metadata.updatedAt,
      ]
    );

    const value = result.rows[0]?.value;
    if (!value) {
      throw new Error("Counseling cancellation policy save did not return row");
    }

    return CounselingCancellationPolicySchema.parse(value);
  }

  async listAuditEvents(limit = 50): Promise<CounselingOperationAuditEvent[]> {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    const result = await this.db.query<CounselingOperationAuditEventRow>(
      `
        SELECT
          id,
          action,
          actor_id,
          actor_roles,
          appointment_id,
          user_id,
          counselor_id,
          previous_appointment_status,
          next_appointment_status,
          previous_order_status,
          next_order_status,
          policy_before,
          policy_after,
          note,
          created_at
        FROM counseling_operation_audit_events
        ORDER BY created_at DESC
        LIMIT $1
      `,
      [safeLimit]
    );

    return result.rows.map(counselingOperationAuditEventRowToDomain);
  }

  async saveAuditEvent(
    event: CounselingOperationAuditEvent
  ): Promise<CounselingOperationAuditEvent> {
    const normalized = CounselingOperationAuditEventSchema.parse(event);
    const result = await this.db.query<CounselingOperationAuditEventRow>(
      `
        INSERT INTO counseling_operation_audit_events (
          id,
          action,
          actor_id,
          actor_roles,
          appointment_id,
          user_id,
          counselor_id,
          previous_appointment_status,
          next_appointment_status,
          previous_order_status,
          next_order_status,
          policy_before,
          policy_after,
          note,
          created_at
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15
        )
        RETURNING
          id,
          action,
          actor_id,
          actor_roles,
          appointment_id,
          user_id,
          counselor_id,
          previous_appointment_status,
          next_appointment_status,
          previous_order_status,
          next_order_status,
          policy_before,
          policy_after,
          note,
          created_at
      `,
      [
        normalized.id,
        normalized.action,
        normalized.actorId,
        normalized.actorRoles,
        normalized.appointmentId ?? null,
        normalized.userId ?? null,
        normalized.counselorId ?? null,
        normalized.previousAppointmentStatus ?? null,
        normalized.nextAppointmentStatus ?? null,
        normalized.previousOrderStatus ?? null,
        normalized.nextOrderStatus ?? null,
        normalized.policyBefore ?? null,
        normalized.policyAfter ?? null,
        normalized.note ?? null,
        normalized.createdAt,
      ]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Counseling operation audit save did not return row");
    }

    return counselingOperationAuditEventRowToDomain(row);
  }

  async clear(): Promise<void> {
    await this.db.query("DELETE FROM counseling_operation_audit_events");
    await this.db.query("DELETE FROM counseling_operation_settings");
  }
}
