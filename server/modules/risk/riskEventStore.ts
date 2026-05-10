import { RiskEventSchema, type RiskEvent } from "../../../shared/domain";

export interface RiskEventStore {
  save(event: RiskEvent): RiskEvent;
  get(eventId: string): RiskEvent | undefined;
  listByUser(userId: string): RiskEvent[];
  clear(): void;
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
    return Array.from(this.events.values())
      .filter(event => event.userId === userId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map(cloneRiskEvent);
  }

  clear() {
    this.events.clear();
  }
}

let riskEventStore: RiskEventStore = new InMemoryRiskEventStore();

export function setRiskEventStore(store: RiskEventStore) {
  riskEventStore = store;
}

export function resetRiskEventStore() {
  riskEventStore.clear();
}

export function saveRiskEvent(event: RiskEvent) {
  return riskEventStore.save(event);
}

export function listRiskEventsByUser(userId: string) {
  return riskEventStore.listByUser(userId);
}

export function getRiskEvent(eventId: string) {
  return riskEventStore.get(eventId);
}
