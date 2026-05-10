import { describe, expect, it } from "vitest";
import type {
  DatabaseQueryExecutor,
  DatabaseQueryResult,
} from "../../db/postgres";
import { PostgresCounselingAppointmentStore } from "./postgresCounselingAppointmentStore";

type CapturedQuery = {
  text: string;
  values?: readonly unknown[];
};

class FakeCounselingExecutor implements DatabaseQueryExecutor {
  readonly queries: CapturedQuery[] = [];

  constructor(private readonly rows: Record<string, unknown[]> = {}) {}

  async query<Row>(
    text: string,
    values?: readonly unknown[]
  ): Promise<DatabaseQueryResult<Row>> {
    this.queries.push({ text, values });

    if (text.includes("INSERT INTO counseling_slots")) {
      return {
        rows: [
          {
            id: values?.[0],
            counselor_id: values?.[1],
            starts_at: values?.[2],
            ends_at: values?.[3],
            channel: values?.[4],
            available: values?.[5],
          } as Row,
        ],
        rowCount: 1,
      };
    }

    if (text.includes("INSERT INTO counseling_appointments")) {
      return {
        rows: [
          {
            id: values?.[0],
            user_id: values?.[1],
            counselor_id: values?.[2],
            slot_id: values?.[3],
            channel: values?.[4],
            status: values?.[5],
            concern_tags: values?.[6],
            note_for_counselor: values?.[7],
            assessment_report_id: values?.[8],
            risk_event_id: values?.[9],
            created_at: values?.[10],
            updated_at: values?.[11],
          } as Row,
        ],
        rowCount: 1,
      };
    }

    if (text.includes("INNER JOIN risk_events")) {
      return {
        rows: (this.rows.risk ?? []) as Row[],
        rowCount: this.rows.risk?.length ?? 0,
      };
    }

    if (text.includes("FROM counseling_appointments")) {
      return {
        rows: (this.rows.appointments ?? []) as Row[],
        rowCount: this.rows.appointments?.length ?? 0,
      };
    }

    if (text.includes("WHERE id = $1")) {
      return {
        rows: (this.rows.slot ?? []) as Row[],
        rowCount: this.rows.slot?.length ?? 0,
      };
    }

    if (text.includes("FROM counseling_slots")) {
      return {
        rows: (this.rows.slots ?? []) as Row[],
        rowCount: this.rows.slots?.length ?? 0,
      };
    }

    return { rows: [] as Row[], rowCount: 0 };
  }
}

describe("postgres counseling appointment store", () => {
  it("maps saved appointments to the counseling_appointments table", async () => {
    const db = new FakeCounselingExecutor();
    const store = new PostgresCounselingAppointmentStore(db);

    const saved = await store.saveAppointment(
      {
        id: "appointment_1",
        userId: "user_1",
        counselorId: "counselor_lin",
        slotId: "slot_1",
        channel: "video",
        status: "pending_payment",
        concernTags: ["emotion", "sleep"],
        noteForCounselor: "最近睡眠波动明显。",
        assessmentReportId: "report_1",
        createdAt: "2026-05-10T08:00:00.000Z",
        updatedAt: "2026-05-10T08:00:00.000Z",
      },
      {
        id: "risk_1",
        userId: "user_1",
        source: "counseling_intake",
        riskLevel: "medium",
        signal: "咨询前信息提示 within_24h 风险",
        status: "open",
        createdAt: "2026-05-10T08:00:00.000Z",
      }
    );

    expect(saved).toMatchObject({
      id: "appointment_1",
      concernTags: ["emotion", "sleep"],
      noteForCounselor: "最近睡眠波动明显。",
      assessmentReportId: "report_1",
    });
    expect(db.queries[0]?.text).toContain(
      "INSERT INTO counseling_appointments"
    );
    expect(db.queries[0]?.values).toEqual([
      "appointment_1",
      "user_1",
      "counselor_lin",
      "slot_1",
      "video",
      "pending_payment",
      ["emotion", "sleep"],
      "最近睡眠波动明显。",
      "report_1",
      "risk_1",
      "2026-05-10T08:00:00.000Z",
      "2026-05-10T08:00:00.000Z",
    ]);
  });

  it("converts slot and appointment timestamp rows into domain strings", async () => {
    const db = new FakeCounselingExecutor({
      slots: [
        {
          id: "slot_1",
          counselor_id: "counselor_lin",
          starts_at: new Date("2026-05-11T10:00:00.000Z"),
          ends_at: new Date("2026-05-11T10:50:00.000Z"),
          channel: "video",
          available: false,
        },
      ],
      appointments: [
        {
          id: "appointment_1",
          user_id: "user_1",
          counselor_id: "counselor_lin",
          slot_id: "slot_1",
          channel: "video",
          status: "pending_payment",
          concern_tags: ["emotion"],
          note_for_counselor: null,
          assessment_report_id: "report_1",
          risk_event_id: null,
          created_at: new Date("2026-05-10T08:00:00.000Z"),
          updated_at: new Date("2026-05-10T08:10:00.000Z"),
        },
      ],
    });
    const store = new PostgresCounselingAppointmentStore(db);

    const slots = await store.listSlots();
    const appointments = await store.listAppointmentsByUser("user_1");

    expect(slots[0]).toMatchObject({
      id: "slot_1",
      startsAt: "2026-05-11T10:00:00.000Z",
      available: false,
    });
    expect(appointments[0]).toMatchObject({
      id: "appointment_1",
      assessmentReportId: "report_1",
      updatedAt: "2026-05-10T08:10:00.000Z",
    });
    expect(db.queries[1]?.text).toContain("ORDER BY created_at DESC");
  });

  it("reads a single appointment by id", async () => {
    const db = new FakeCounselingExecutor({
      appointments: [
        {
          id: "appointment_1",
          user_id: "user_1",
          counselor_id: "counselor_lin",
          slot_id: "slot_1",
          channel: "video",
          status: "scheduled",
          concern_tags: ["emotion"],
          note_for_counselor: null,
          assessment_report_id: null,
          risk_event_id: null,
          created_at: new Date("2026-05-10T08:00:00.000Z"),
          updated_at: new Date("2026-05-10T08:10:00.000Z"),
        },
      ],
    });
    const store = new PostgresCounselingAppointmentStore(db);

    const appointment = await store.getAppointment("appointment_1");

    expect(appointment).toMatchObject({
      id: "appointment_1",
      status: "scheduled",
    });
    expect(db.queries[0]?.values).toEqual(["appointment_1"]);
  });

  it("reads risk events linked to counseling appointments", async () => {
    const db = new FakeCounselingExecutor({
      risk: [
        {
          id: "risk_1",
          user_id: "user_1",
          source: "counseling_intake",
          risk_level: "urgent",
          signal: "咨询预约前信息包含危机支持诉求",
          status: "open",
          reviewer_id: null,
          created_at: new Date("2026-05-10T08:00:00.000Z"),
          resolved_at: null,
        },
      ],
    });
    const store = new PostgresCounselingAppointmentStore(db);

    const riskEvent = await store.getRiskEventForAppointment("appointment_1");

    expect(riskEvent).toMatchObject({
      id: "risk_1",
      source: "counseling_intake",
      riskLevel: "urgent",
      createdAt: "2026-05-10T08:00:00.000Z",
    });
    expect(db.queries[0]?.values).toEqual(["appointment_1"]);
  });

  it("resets appointments and seeds counselor slots", async () => {
    const db = new FakeCounselingExecutor();
    const store = new PostgresCounselingAppointmentStore(db);

    await store.reset(new Date("2026-05-10T00:00:00.000Z"));

    expect(db.queries[0]?.text).toContain(
      "DELETE FROM counseling_appointments"
    );
    expect(db.queries[1]?.text).toContain("DELETE FROM counseling_slots");
    expect(
      db.queries.some(query => query.text.includes("INSERT INTO counselors"))
    ).toBe(true);
    expect(
      db.queries.some(query =>
        query.text.includes("INSERT INTO counseling_slots")
      )
    ).toBe(true);
  });
});
