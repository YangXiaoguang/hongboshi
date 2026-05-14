import { RiskEventSchema, type RiskEvent } from "../../../shared/domain";
import { getDatabaseUrl, getSharedPostgresPool } from "../../db/postgres";
import { PostgresRiskEventStore } from "./postgresRiskEventStore";

type MaybePromise<T> = T | Promise<T>;

export interface RiskEventStore {
  save(event: RiskEvent): MaybePromise<RiskEvent>;
  get(eventId: string): MaybePromise<RiskEvent | undefined>;
  listByUser(userId: string): MaybePromise<RiskEvent[]>;
  listAll(): MaybePromise<RiskEvent[]>;
  clear(): MaybePromise<void>;
}

function cloneRiskEvent(event: RiskEvent): RiskEvent {
  return RiskEventSchema.parse(JSON.parse(JSON.stringify(event)));
}

export class InMemoryRiskEventStore implements RiskEventStore {
  private events = new Map<string, RiskEvent>();

  save(event: RiskEvent): RiskEvent {
    const normalized = RiskEventSchema.parse(event);
    this.events.set(normalized.id, cloneRiskEvent(normalized));
    return cloneRiskEvent(normalized);
  }

  get(eventId: string): RiskEvent | undefined {
    const event = this.events.get(eventId);
    return event ? cloneRiskEvent(event) : undefined;
  }

  listByUser(userId: string): RiskEvent[] {
    return this.listAll()
      .filter(event => event.userId === userId)
      .map(cloneRiskEvent);
  }

  listAll(): RiskEvent[] {
    return Array.from(this.events.values())
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map(cloneRiskEvent);
  }

  clear() {
    this.events.clear();
  }
}

export function createDefaultRiskEventStore(): RiskEventStore {
  if (
    process.env.HONGBOSHI_RISK_EVENT_STORE === "postgres" ||
    (process.env.HONGBOSHI_RISK_EVENT_STORE !== "memory" && getDatabaseUrl())
  ) {
    return new PostgresRiskEventStore(getSharedPostgresPool());
  }

  return new InMemoryRiskEventStore();
}

let riskEventStore: RiskEventStore = createDefaultRiskEventStore();

export function setRiskEventStore(store: RiskEventStore) {
  riskEventStore = store;
}

export function resetRiskEventStore() {
  return Promise.resolve(riskEventStore.clear());
}

export function saveRiskEvent(event: RiskEvent) {
  return Promise.resolve(riskEventStore.save(event));
}

export function listRiskEventsByUser(userId: string) {
  return Promise.resolve(riskEventStore.listByUser(userId));
}

export function listAllRiskEvents() {
  return Promise.resolve(riskEventStore.listAll());
}

export function getRiskEvent(eventId: string) {
  return Promise.resolve(riskEventStore.get(eventId));
}
