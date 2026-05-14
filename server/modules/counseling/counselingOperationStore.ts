import {
  CounselingCancellationPolicySchema,
  CounselingOperationAuditEventSchema,
  DEFAULT_COUNSELING_CANCELLATION_POLICY,
  type CounselingCancellationPolicy,
  type CounselingOperationAuditEvent,
} from "../../../shared/domain";
import { getDatabaseUrl, getSharedPostgresPool } from "../../db/postgres";
import { PostgresCounselingOperationStore } from "./postgresCounselingOperationStore";

type MaybePromise<T> = T | Promise<T>;

export type CancellationPolicySaveMetadata = {
  actorId?: string;
  updatedAt: string;
};

export interface CounselingOperationStore {
  getCancellationPolicy(): MaybePromise<CounselingCancellationPolicy>;
  saveCancellationPolicy(
    policy: CounselingCancellationPolicy,
    metadata: CancellationPolicySaveMetadata
  ): MaybePromise<CounselingCancellationPolicy>;
  listAuditEvents(
    limit?: number
  ): MaybePromise<CounselingOperationAuditEvent[]>;
  listAllAuditEvents(): MaybePromise<CounselingOperationAuditEvent[]>;
  saveAuditEvent(
    event: CounselingOperationAuditEvent
  ): MaybePromise<CounselingOperationAuditEvent>;
  clear(): MaybePromise<void>;
}

function cloneCancellationPolicy(
  policy: CounselingCancellationPolicy
): CounselingCancellationPolicy {
  return CounselingCancellationPolicySchema.parse(
    JSON.parse(JSON.stringify(policy))
  );
}

function cloneAuditEvent(
  event: CounselingOperationAuditEvent
): CounselingOperationAuditEvent {
  return CounselingOperationAuditEventSchema.parse(
    JSON.parse(JSON.stringify(event))
  );
}

function normalizeLimit(limit = 50) {
  return Math.max(1, Math.min(100, Math.floor(limit)));
}

export class InMemoryCounselingOperationStore implements CounselingOperationStore {
  private cancellationPolicy: CounselingCancellationPolicy =
    DEFAULT_COUNSELING_CANCELLATION_POLICY;

  private auditEvents: CounselingOperationAuditEvent[] = [];

  getCancellationPolicy(): CounselingCancellationPolicy {
    return cloneCancellationPolicy(this.cancellationPolicy);
  }

  saveCancellationPolicy(
    policy: CounselingCancellationPolicy
  ): CounselingCancellationPolicy {
    this.cancellationPolicy = cloneCancellationPolicy(policy);
    return cloneCancellationPolicy(this.cancellationPolicy);
  }

  listAuditEvents(limit = 50): CounselingOperationAuditEvent[] {
    return this.auditEvents
      .slice(0, normalizeLimit(limit))
      .map(cloneAuditEvent);
  }

  listAllAuditEvents(): CounselingOperationAuditEvent[] {
    return this.auditEvents.map(cloneAuditEvent);
  }

  saveAuditEvent(
    event: CounselingOperationAuditEvent
  ): CounselingOperationAuditEvent {
    const normalized = CounselingOperationAuditEventSchema.parse(event);
    this.auditEvents = [cloneAuditEvent(normalized), ...this.auditEvents].slice(
      0,
      100
    );
    return cloneAuditEvent(normalized);
  }

  clear() {
    this.cancellationPolicy = DEFAULT_COUNSELING_CANCELLATION_POLICY;
    this.auditEvents = [];
  }
}

export function createDefaultCounselingOperationStore(): CounselingOperationStore {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST ||
    process.env.HONGBOSHI_COUNSELING_OPERATION_STORE === "memory"
  ) {
    return new InMemoryCounselingOperationStore();
  }

  if (
    process.env.HONGBOSHI_COUNSELING_OPERATION_STORE === "postgres" ||
    (process.env.HONGBOSHI_COUNSELING_OPERATION_STORE !== "memory" &&
      getDatabaseUrl())
  ) {
    return new PostgresCounselingOperationStore(getSharedPostgresPool());
  }

  return new InMemoryCounselingOperationStore();
}
