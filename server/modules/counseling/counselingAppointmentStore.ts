import { generateUpcomingCounselingSlots } from "../../../shared/data/counselingSeed";
import {
  CounselingAppointmentSchema,
  CounselingSlotSchema,
  RiskEventSchema,
  type CounselingAppointment,
  type CounselingSlot,
  type RiskEvent,
} from "../../../shared/domain";
import { getDatabaseUrl, getSharedPostgresPool } from "../../db/postgres";
import { PostgresCounselingAppointmentStore } from "./postgresCounselingAppointmentStore";

type MaybePromise<T> = T | Promise<T>;

export interface CounselingAppointmentStore {
  listSlots(now?: Date): MaybePromise<CounselingSlot[]>;
  getSlot(slotId: string): MaybePromise<CounselingSlot | undefined>;
  saveSlot(slot: CounselingSlot): MaybePromise<CounselingSlot>;
  getAppointment(
    appointmentId: string
  ): MaybePromise<CounselingAppointment | undefined>;
  saveAppointment(
    appointment: CounselingAppointment,
    riskEvent?: RiskEvent
  ): MaybePromise<CounselingAppointment>;
  listPendingPaymentAppointments(): MaybePromise<CounselingAppointment[]>;
  listAppointmentsByUser(userId: string): MaybePromise<CounselingAppointment[]>;
  getRiskEventForAppointment(
    appointmentId: string
  ): MaybePromise<RiskEvent | undefined>;
  reset(now?: Date): MaybePromise<void>;
}

function cloneSlot(slot: CounselingSlot): CounselingSlot {
  return CounselingSlotSchema.parse(JSON.parse(JSON.stringify(slot)));
}

function cloneAppointment(
  appointment: CounselingAppointment
): CounselingAppointment {
  return CounselingAppointmentSchema.parse(
    JSON.parse(JSON.stringify(appointment))
  );
}

function cloneRiskEvent(event: RiskEvent): RiskEvent {
  return RiskEventSchema.parse(JSON.parse(JSON.stringify(event)));
}

export class InMemoryCounselingAppointmentStore implements CounselingAppointmentStore {
  private appointments = new Map<string, CounselingAppointment>();
  private appointmentRiskEvents = new Map<string, RiskEvent>();
  private slots = new Map<string, CounselingSlot>();

  constructor(now = new Date()) {
    this.reset(now);
  }

  listSlots(): CounselingSlot[] {
    return Array.from(this.slots.values()).map(cloneSlot);
  }

  getSlot(slotId: string): CounselingSlot | undefined {
    const slot = this.slots.get(slotId);
    return slot ? cloneSlot(slot) : undefined;
  }

  saveSlot(slot: CounselingSlot): CounselingSlot {
    const normalized = CounselingSlotSchema.parse(slot);
    this.slots.set(normalized.id, cloneSlot(normalized));
    return cloneSlot(normalized);
  }

  getAppointment(appointmentId: string): CounselingAppointment | undefined {
    const appointment = this.appointments.get(appointmentId);
    return appointment ? cloneAppointment(appointment) : undefined;
  }

  saveAppointment(
    appointment: CounselingAppointment,
    riskEvent?: RiskEvent
  ): CounselingAppointment {
    const normalized = CounselingAppointmentSchema.parse(appointment);
    this.appointments.set(normalized.id, cloneAppointment(normalized));

    if (riskEvent) {
      this.appointmentRiskEvents.set(normalized.id, cloneRiskEvent(riskEvent));
    }

    return cloneAppointment(normalized);
  }

  listPendingPaymentAppointments(): CounselingAppointment[] {
    return Array.from(this.appointments.values())
      .filter(appointment => appointment.status === "pending_payment")
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
      .map(cloneAppointment);
  }

  listAppointmentsByUser(userId: string): CounselingAppointment[] {
    return Array.from(this.appointments.values())
      .filter(appointment => appointment.userId === userId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map(cloneAppointment);
  }

  getRiskEventForAppointment(appointmentId: string): RiskEvent | undefined {
    const event = this.appointmentRiskEvents.get(appointmentId);
    return event ? cloneRiskEvent(event) : undefined;
  }

  reset(now = new Date()) {
    this.appointments.clear();
    this.appointmentRiskEvents.clear();
    this.slots = new Map(
      generateUpcomingCounselingSlots({ now }).map(slot => [slot.id, slot])
    );
  }
}

export function createDefaultCounselingAppointmentStore(): CounselingAppointmentStore {
  if (
    process.env.HONGBOSHI_COUNSELING_APPOINTMENT_STORE === "postgres" ||
    (process.env.HONGBOSHI_COUNSELING_APPOINTMENT_STORE !== "memory" &&
      getDatabaseUrl())
  ) {
    return new PostgresCounselingAppointmentStore(getSharedPostgresPool());
  }

  return new InMemoryCounselingAppointmentStore();
}
