import {
  AuditCenterArchiveEventSchema,
  type AuditCenterArchiveEvent,
  type AuditCenterModule,
} from "../../../shared/domain";
import { getDatabaseUrl, getSharedPostgresPool } from "../../db/postgres";
import { PostgresAuditArchiveStore } from "./postgresAuditArchiveStore";

type MaybePromise<T> = T | Promise<T>;

export type AuditArchiveListQuery = {
  module?: AuditCenterModule;
  action?: string;
  actorId?: string;
  resourceKeyword?: string;
  batchId?: string;
  occurredFrom?: string;
  occurredTo?: string;
  archivedFrom?: string;
  archivedTo?: string;
  limit?: number;
  offset?: number;
  sortBy?: "occurredAt" | "archivedAt";
};

export type AuditArchiveUpsertResult = {
  archivedCount: number;
  skippedCount: number;
};

export interface AuditArchiveStore {
  upsertArchivedEvents(
    events: AuditCenterArchiveEvent[]
  ): MaybePromise<AuditArchiveUpsertResult>;
  listArchivedEvents(
    query?: AuditArchiveListQuery
  ): MaybePromise<AuditCenterArchiveEvent[]>;
  countArchivedEvents(query?: AuditArchiveListQuery): MaybePromise<number>;
  clear(): MaybePromise<void>;
}

function cloneArchiveEvent(event: AuditCenterArchiveEvent) {
  return AuditCenterArchiveEventSchema.parse(JSON.parse(JSON.stringify(event)));
}

function sortArchiveEvents(
  events: AuditCenterArchiveEvent[],
  sortBy: AuditArchiveListQuery["sortBy"] = "occurredAt"
) {
  return [...events].sort(
    (left, right) =>
      Date.parse(
        sortBy === "archivedAt" ? right.archivedAt : right.occurredAt
      ) -
        Date.parse(
          sortBy === "archivedAt" ? left.archivedAt : left.occurredAt
        ) || right.id.localeCompare(left.id)
  );
}

function matchesArchiveQuery(
  event: AuditCenterArchiveEvent,
  query: AuditArchiveListQuery | undefined
) {
  if (!query) return true;
  if (query.module && event.module !== query.module) return false;
  if (query.action && event.action !== query.action) return false;
  if (query.actorId && event.actor.id !== query.actorId) return false;
  if (query.batchId && event.backfillBatchId !== query.batchId) return false;

  const occurredAt = Date.parse(event.occurredAt);
  const archivedAt = Date.parse(event.archivedAt);
  if (
    query.occurredFrom &&
    occurredAt < Date.parse(query.occurredFrom)
  ) {
    return false;
  }
  if (query.occurredTo && occurredAt > Date.parse(query.occurredTo)) {
    return false;
  }
  if (
    query.archivedFrom &&
    archivedAt < Date.parse(query.archivedFrom)
  ) {
    return false;
  }
  if (query.archivedTo && archivedAt > Date.parse(query.archivedTo)) {
    return false;
  }

  if (query.resourceKeyword) {
    const keyword = query.resourceKeyword.toLowerCase();
    const searchable = [
      event.id,
      event.source.sourceEventId,
      event.source.sourceStore,
      event.source.sourceTable,
      event.module,
      event.action,
      event.actor.id,
      ...event.actor.roles,
      event.resource.type,
      event.resource.id,
      event.resource.label,
      event.reason,
      event.summary,
      event.backfillBatchId,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (!searchable.includes(keyword)) return false;
  }

  return true;
}

export class InMemoryAuditArchiveStore implements AuditArchiveStore {
  private eventsByIdempotencyKey = new Map<string, AuditCenterArchiveEvent>();

  upsertArchivedEvents(
    events: AuditCenterArchiveEvent[]
  ): AuditArchiveUpsertResult {
    let archivedCount = 0;
    let skippedCount = 0;

    for (const event of events) {
      const normalized = cloneArchiveEvent(event);
      if (this.eventsByIdempotencyKey.has(normalized.idempotencyKey)) {
        skippedCount += 1;
        continue;
      }

      this.eventsByIdempotencyKey.set(normalized.idempotencyKey, normalized);
      archivedCount += 1;
    }

    return {
      archivedCount,
      skippedCount,
    };
  }

  listArchivedEvents(query?: AuditArchiveListQuery): AuditCenterArchiveEvent[] {
    const limit = query?.limit ?? 100;
    const offset = query?.offset ?? 0;
    return sortArchiveEvents(
      Array.from(this.eventsByIdempotencyKey.values()).filter(event =>
        matchesArchiveQuery(event, query)
      ),
      query?.sortBy
    )
      .slice(offset, offset + limit)
      .map(cloneArchiveEvent);
  }

  countArchivedEvents(query?: AuditArchiveListQuery) {
    return Array.from(this.eventsByIdempotencyKey.values()).filter(event =>
      matchesArchiveQuery(event, query)
    ).length;
  }

  clear() {
    this.eventsByIdempotencyKey.clear();
  }
}

let auditArchiveStore: AuditArchiveStore | undefined;

export function createDefaultAuditArchiveStore(): AuditArchiveStore {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST ||
    process.env.HONGBOSHI_AUDIT_ARCHIVE_STORE === "memory"
  ) {
    return new InMemoryAuditArchiveStore();
  }

  if (
    process.env.HONGBOSHI_AUDIT_ARCHIVE_STORE === "postgres" ||
    (process.env.HONGBOSHI_AUDIT_ARCHIVE_STORE !== "memory" && getDatabaseUrl())
  ) {
    return new PostgresAuditArchiveStore(getSharedPostgresPool());
  }

  return new InMemoryAuditArchiveStore();
}

export function getAuditArchiveStore() {
  if (!auditArchiveStore) auditArchiveStore = createDefaultAuditArchiveStore();
  return auditArchiveStore;
}

export function setAuditArchiveStore(store: AuditArchiveStore) {
  auditArchiveStore = store;
}
