import {
  counselorProfiles,
  generateUpcomingCounselingSlots,
} from "../../../shared/data/counselingSeed";
import {
  CounselingAppointmentSchema,
  CounselingSlotSchema,
  type CounselingAppointment,
  type CounselingSlot,
  type RiskEvent,
} from "../../../shared/domain";
import type { DatabaseQueryExecutor } from "../../db/postgres";
import { riskEventRowToDomain } from "../risk/postgresRiskEventStore";

type CounselingSlotRow = {
  id: string;
  counselor_id: string;
  starts_at: string | Date;
  ends_at: string | Date;
  channel: CounselingSlot["channel"];
  available: boolean;
};

type CounselingAppointmentRow = {
  id: string;
  user_id: string;
  counselor_id: string;
  slot_id: string;
  order_id: string | null;
  channel: CounselingAppointment["channel"];
  status: CounselingAppointment["status"];
  concern_tags: string[];
  note_for_counselor: string | null;
  assessment_report_id: string | null;
  risk_event_id: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

function toDateTimeLike(value: string | Date) {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function counselingSlotRowToDomain(row: CounselingSlotRow) {
  return CounselingSlotSchema.parse({
    id: row.id,
    counselorId: row.counselor_id,
    startsAt: toDateTimeLike(row.starts_at),
    endsAt: toDateTimeLike(row.ends_at),
    channel: row.channel,
    available: row.available,
  });
}

export function counselingAppointmentRowToDomain(
  row: CounselingAppointmentRow
) {
  return CounselingAppointmentSchema.parse({
    id: row.id,
    userId: row.user_id,
    counselorId: row.counselor_id,
    slotId: row.slot_id,
    orderId: row.order_id ?? undefined,
    channel: row.channel,
    status: row.status,
    concernTags: row.concern_tags,
    noteForCounselor: row.note_for_counselor ?? undefined,
    assessmentReportId: row.assessment_report_id ?? undefined,
    createdAt: toDateTimeLike(row.created_at),
    updatedAt: toDateTimeLike(row.updated_at),
  });
}

export class PostgresCounselingAppointmentStore {
  constructor(private readonly db: DatabaseQueryExecutor) {}

  private async seedCounselors() {
    for (const counselor of counselorProfiles) {
      await this.db.query(
        `
          INSERT INTO counselors (
            id,
            name,
            avatar_url,
            title,
            introduction,
            specialties,
            license_summary,
            years_of_practice,
            session_price_cents,
            rating
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            avatar_url = EXCLUDED.avatar_url,
            title = EXCLUDED.title,
            introduction = EXCLUDED.introduction,
            specialties = EXCLUDED.specialties,
            license_summary = EXCLUDED.license_summary,
            years_of_practice = EXCLUDED.years_of_practice,
            session_price_cents = EXCLUDED.session_price_cents,
            rating = EXCLUDED.rating,
            updated_at = NOW()
        `,
        [
          counselor.id,
          counselor.name,
          counselor.avatarUrl ?? null,
          counselor.title,
          counselor.introduction,
          counselor.specialties,
          counselor.licenseSummary,
          counselor.yearsOfPractice,
          Math.round(counselor.sessionPrice * 100),
          counselor.rating ?? null,
        ]
      );
    }
  }

  private async seedSlots(now = new Date()) {
    await this.seedCounselors();

    for (const slot of generateUpcomingCounselingSlots({ now })) {
      await this.saveSlot(slot);
    }
  }

  async listSlots(now?: Date): Promise<CounselingSlot[]> {
    const result = await this.db.query<CounselingSlotRow>(
      `
        SELECT
          id,
          counselor_id,
          starts_at,
          ends_at,
          channel,
          available
        FROM counseling_slots
        ORDER BY starts_at ASC, counselor_id ASC
      `
    );

    if (result.rows.length === 0 && now) {
      await this.seedSlots(now);
      return this.listSlots();
    }

    return result.rows.map(counselingSlotRowToDomain);
  }

  async getSlot(slotId: string): Promise<CounselingSlot | undefined> {
    const result = await this.db.query<CounselingSlotRow>(
      `
        SELECT
          id,
          counselor_id,
          starts_at,
          ends_at,
          channel,
          available
        FROM counseling_slots
        WHERE id = $1
        LIMIT 1
      `,
      [slotId]
    );

    const row = result.rows[0];
    return row ? counselingSlotRowToDomain(row) : undefined;
  }

  async saveSlot(slot: CounselingSlot): Promise<CounselingSlot> {
    const normalized = CounselingSlotSchema.parse(slot);
    const result = await this.db.query<CounselingSlotRow>(
      `
        INSERT INTO counseling_slots (
          id,
          counselor_id,
          starts_at,
          ends_at,
          channel,
          available
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          counselor_id = EXCLUDED.counselor_id,
          starts_at = EXCLUDED.starts_at,
          ends_at = EXCLUDED.ends_at,
          channel = EXCLUDED.channel,
          available = EXCLUDED.available,
          updated_at = NOW()
        RETURNING
          id,
          counselor_id,
          starts_at,
          ends_at,
          channel,
          available
      `,
      [
        normalized.id,
        normalized.counselorId,
        normalized.startsAt,
        normalized.endsAt,
        normalized.channel,
        normalized.available,
      ]
    );

    const row = result.rows[0];
    if (!row) throw new Error("Counseling slot save did not return a row");
    return counselingSlotRowToDomain(row);
  }

  async getAppointment(
    appointmentId: string
  ): Promise<CounselingAppointment | undefined> {
    const result = await this.db.query<CounselingAppointmentRow>(
      `
        SELECT
          id,
          user_id,
          counselor_id,
          slot_id,
          order_id,
          channel,
          status,
          concern_tags,
          note_for_counselor,
          assessment_report_id,
          risk_event_id,
          created_at,
          updated_at
        FROM counseling_appointments
        WHERE id = $1
        LIMIT 1
      `,
      [appointmentId]
    );

    const row = result.rows[0];
    return row ? counselingAppointmentRowToDomain(row) : undefined;
  }

  async getAppointmentByOrderId(
    orderId: string
  ): Promise<CounselingAppointment | undefined> {
    const result = await this.db.query<CounselingAppointmentRow>(
      `
        SELECT
          id,
          user_id,
          counselor_id,
          slot_id,
          order_id,
          channel,
          status,
          concern_tags,
          note_for_counselor,
          assessment_report_id,
          risk_event_id,
          created_at,
          updated_at
        FROM counseling_appointments
        WHERE order_id = $1
        LIMIT 1
      `,
      [orderId]
    );

    const row = result.rows[0];
    return row ? counselingAppointmentRowToDomain(row) : undefined;
  }

  async saveAppointment(
    appointment: CounselingAppointment,
    riskEvent?: RiskEvent
  ): Promise<CounselingAppointment> {
    const normalized = CounselingAppointmentSchema.parse(appointment);
    const result = await this.db.query<CounselingAppointmentRow>(
      `
        INSERT INTO counseling_appointments (
          id,
          user_id,
          counselor_id,
          slot_id,
          order_id,
          channel,
          status,
          concern_tags,
          note_for_counselor,
          assessment_report_id,
          risk_event_id,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          counselor_id = EXCLUDED.counselor_id,
          slot_id = EXCLUDED.slot_id,
          order_id = EXCLUDED.order_id,
          channel = EXCLUDED.channel,
          status = EXCLUDED.status,
          concern_tags = EXCLUDED.concern_tags,
          note_for_counselor = EXCLUDED.note_for_counselor,
          assessment_report_id = EXCLUDED.assessment_report_id,
          risk_event_id = EXCLUDED.risk_event_id,
          updated_at = EXCLUDED.updated_at
        RETURNING
          id,
          user_id,
          counselor_id,
          slot_id,
          order_id,
          channel,
          status,
          concern_tags,
          note_for_counselor,
          assessment_report_id,
          risk_event_id,
          created_at,
          updated_at
      `,
      [
        normalized.id,
        normalized.userId,
        normalized.counselorId,
        normalized.slotId,
        normalized.orderId ?? null,
        normalized.channel,
        normalized.status,
        normalized.concernTags,
        normalized.noteForCounselor ?? null,
        normalized.assessmentReportId ?? null,
        riskEvent?.id ?? null,
        normalized.createdAt,
        normalized.updatedAt,
      ]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Counseling appointment save did not return a row");
    }
    return counselingAppointmentRowToDomain(row);
  }

  async listAppointmentsByUser(
    userId: string
  ): Promise<CounselingAppointment[]> {
    const result = await this.db.query<CounselingAppointmentRow>(
      `
        SELECT
          id,
          user_id,
          counselor_id,
          slot_id,
          order_id,
          channel,
          status,
          concern_tags,
          note_for_counselor,
          assessment_report_id,
          risk_event_id,
          created_at,
          updated_at
        FROM counseling_appointments
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
      [userId]
    );

    return result.rows.map(counselingAppointmentRowToDomain);
  }

  async listAppointmentsByCounselor(
    counselorId: string
  ): Promise<CounselingAppointment[]> {
    const result = await this.db.query<CounselingAppointmentRow>(
      `
        SELECT
          id,
          user_id,
          counselor_id,
          slot_id,
          order_id,
          channel,
          status,
          concern_tags,
          note_for_counselor,
          assessment_report_id,
          risk_event_id,
          created_at,
          updated_at
        FROM counseling_appointments
        WHERE counselor_id = $1
        ORDER BY created_at DESC
      `,
      [counselorId]
    );

    return result.rows.map(counselingAppointmentRowToDomain);
  }

  async listPendingPaymentAppointments(): Promise<CounselingAppointment[]> {
    const result = await this.db.query<CounselingAppointmentRow>(
      `
        SELECT
          id,
          user_id,
          counselor_id,
          slot_id,
          order_id,
          channel,
          status,
          concern_tags,
          note_for_counselor,
          assessment_report_id,
          risk_event_id,
          created_at,
          updated_at
        FROM counseling_appointments
        WHERE status = $1
        ORDER BY created_at ASC
      `,
      ["pending_payment"]
    );

    return result.rows.map(counselingAppointmentRowToDomain);
  }

  async getRiskEventForAppointment(
    appointmentId: string
  ): Promise<RiskEvent | undefined> {
    const result = await this.db.query<
      Parameters<typeof riskEventRowToDomain>[0]
    >(
      `
        SELECT
          risk_events.id,
          risk_events.user_id,
          risk_events.source,
          risk_events.risk_level,
          risk_events.signal,
          risk_events.status,
          risk_events.reviewer_id,
          risk_events.created_at,
          risk_events.resolved_at
        FROM counseling_appointments
        INNER JOIN risk_events
          ON risk_events.id = counseling_appointments.risk_event_id
        WHERE counseling_appointments.id = $1
        LIMIT 1
      `,
      [appointmentId]
    );

    const row = result.rows[0];
    return row ? riskEventRowToDomain(row) : undefined;
  }

  async reset(now = new Date()): Promise<void> {
    await this.db.query("DELETE FROM counseling_appointments");
    await this.db.query("DELETE FROM counseling_slots");
    await this.seedSlots(now);
  }
}
