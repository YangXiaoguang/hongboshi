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
  batchId?: string;
  limit?: number;
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

function sortArchiveEvents(events: AuditCenterArchiveEvent[]) {
  return [...events].sort(
    (left, right) =>
      Date.parse(right.occurredAt) - Date.parse(left.occurredAt) ||
      right.id.localeCompare(left.id)
  );
}

function matchesArchiveQuery(
  event: AuditCenterArchiveEvent,
  query: AuditArchiveListQuery | undefined
) {
  if (!query) return true;
  if (query.module && event.module !== query.module) return false;
  if (query.batchId && event.backfillBatchId !== query.batchId) return false;
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
    return sortArchiveEvents(
      Array.from(this.eventsByIdempotencyKey.values()).filter(event =>
        matchesArchiveQuery(event, query)
      )
    )
      .slice(0, limit)
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
