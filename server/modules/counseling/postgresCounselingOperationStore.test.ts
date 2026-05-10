import { describe, expect, it } from "vitest";
import type {
  DatabaseQueryExecutor,
  DatabaseQueryResult,
} from "../../db/postgres";
import {
  DEFAULT_COUNSELING_CANCELLATION_POLICY,
  type CounselingOperationAuditEvent,
} from "../../../shared/domain";
import { PostgresCounselingOperationStore } from "./postgresCounselingOperationStore";

type CapturedQuery = {
  text: string;
  values?: readonly unknown[];
};

class FakeCounselingOperationExecutor implements DatabaseQueryExecutor {
  readonly queries: CapturedQuery[] = [];

  constructor(private readonly rows: Record<string, unknown[]> = {}) {}

  async query<Row>(
    text: string,
    values?: readonly unknown[]
  ): Promise<DatabaseQueryResult<Row>> {
    this.queries.push({ text, values });

    if (text.includes("FROM counseling_operation_settings")) {
      return {
        rows: (this.rows.setting ?? []) as Row[],
        rowCount: this.rows.setting?.length ?? 0,
      };
    }

    if (text.includes("INSERT INTO counseling_operation_settings")) {
      return {
        rows: (this.rows.savedSetting ?? []) as Row[],
        rowCount: this.rows.savedSetting?.length ?? 0,
      };
    }

    if (text.includes("FROM counseling_operation_audit_events")) {
      return {
        rows: (this.rows.auditList ?? []) as Row[],
        rowCount: this.rows.auditList?.length ?? 0,
      };
    }

    if (text.includes("INSERT INTO counseling_operation_audit_events")) {
      return {
        rows: (this.rows.savedAudit ?? []) as Row[],
        rowCount: this.rows.savedAudit?.length ?? 0,
      };
    }

    return { rows: [] as Row[], rowCount: 0 };
  }
}

describe("postgres counseling operation store", () => {
  it("upserts cancellation policy into operation settings", async () => {
    const policy = {
      scheduledRefundCutoffMinutesBeforeStart: 90,
      allowPendingPaymentCancellation: false,
    };
    const db = new FakeCounselingOperationExecutor({
      savedSetting: [{ value: policy }],
    });
    const store = new PostgresCounselingOperationStore(db);

    const saved = await store.saveCancellationPolicy(policy, {
      actorId: "operator_1",
      updatedAt: "2026-05-10T08:00:00.000Z",
    });

    expect(saved).toEqual(policy);
    expect(db.queries[0]?.text).toContain(
      "INSERT INTO counseling_operation_settings"
    );
    expect(db.queries[0]?.values).toEqual([
      "cancellation_policy",
      policy,
      "operator_1",
      "2026-05-10T08:00:00.000Z",
    ]);
  });

  it("falls back to the default cancellation policy when no setting exists", async () => {
    const db = new FakeCounselingOperationExecutor();
    const store = new PostgresCounselingOperationStore(db);

    await expect(store.getCancellationPolicy()).resolves.toEqual(
      DEFAULT_COUNSELING_CANCELLATION_POLICY
    );
    expect(db.queries[0]?.values).toEqual(["cancellation_policy"]);
  });

  it("saves and reads operation audit events with timestamp conversion", async () => {
    const event: CounselingOperationAuditEvent = {
      id: "audit_counseling_1",
      action: "complete_session",
      actorId: "counselor_lin",
      actorRoles: ["counselor"],
      appointmentId: "appointment_1",
      userId: "user_1",
      counselorId: "counselor_lin",
      previousAppointmentStatus: "scheduled",
      nextAppointmentStatus: "completed",
      previousOrderStatus: "paid",
      nextOrderStatus: "paid",
      createdAt: "2026-05-10T09:00:00.000Z",
    };
    const row = {
      id: event.id,
      action: event.action,
      actor_id: event.actorId,
      actor_roles: event.actorRoles,
      appointment_id: event.appointmentId,
      user_id: event.userId,
      counselor_id: event.counselorId,
      previous_appointment_status: event.previousAppointmentStatus,
      next_appointment_status: event.nextAppointmentStatus,
      previous_order_status: event.previousOrderStatus,
      next_order_status: event.nextOrderStatus,
      policy_before: null,
      policy_after: null,
      note: null,
      created_at: new Date(event.createdAt),
    };
    const db = new FakeCounselingOperationExecutor({
      savedAudit: [row],
      auditList: [row],
    });
    const store = new PostgresCounselingOperationStore(db);

    const saved = await store.saveAuditEvent(event);
    const listed = await store.listAuditEvents(10);

    expect(saved).toMatchObject(event);
    expect(listed).toEqual([event]);
    expect(db.queries[0]?.values).toEqual([
      event.id,
      event.action,
      event.actorId,
      event.actorRoles,
      event.appointmentId,
      event.userId,
      event.counselorId,
      event.previousAppointmentStatus,
      event.nextAppointmentStatus,
      event.previousOrderStatus,
      event.nextOrderStatus,
      null,
      null,
      null,
      event.createdAt,
    ]);
    expect(db.queries[1]?.values).toEqual([10]);
  });
});
