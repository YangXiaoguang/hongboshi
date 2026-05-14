import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  TransactionAdminAuditEventSchema,
  TransactionAdminWorkOrderSchema,
  type TransactionAdminAuditEvent,
  type TransactionAdminWorkOrder,
} from "../../../shared/domain";
import { getDatabaseUrl, getSharedPostgresPool } from "../../db/postgres";
import { PostgresTransactionOperationStore } from "./postgresTransactionOperationStore";

type MaybePromise<T> = T | Promise<T>;

const TransactionOperationStoreFileSchema = z.object({
  version: z.literal(1),
  workOrders: z
    .record(z.string().min(1), TransactionAdminWorkOrderSchema)
    .default({}),
  auditEvents: z
    .record(z.string().min(1), z.array(TransactionAdminAuditEventSchema))
    .default({}),
});

type TransactionOperationStoreFile = z.infer<
  typeof TransactionOperationStoreFileSchema
>;

export interface TransactionOperationStore {
  getWorkOrder(
    transactionId: string
  ): MaybePromise<TransactionAdminWorkOrder | undefined>;
  listWorkOrders(): MaybePromise<TransactionAdminWorkOrder[]>;
  saveWorkOrder(
    workOrder: TransactionAdminWorkOrder
  ): MaybePromise<TransactionAdminWorkOrder>;
  listAuditEvents(
    transactionId: string
  ): MaybePromise<TransactionAdminAuditEvent[]>;
  listAllAuditEvents(): MaybePromise<TransactionAdminAuditEvent[]>;
  appendAuditEvent(
    event: TransactionAdminAuditEvent
  ): MaybePromise<TransactionAdminAuditEvent>;
  clear(): MaybePromise<void>;
}

function emptyStoreFile(): TransactionOperationStoreFile {
  return {
    version: 1,
    workOrders: {},
    auditEvents: {},
  };
}

function cloneWorkOrder(
  workOrder: TransactionAdminWorkOrder
): TransactionAdminWorkOrder {
  return TransactionAdminWorkOrderSchema.parse(
    JSON.parse(JSON.stringify(workOrder))
  );
}

function cloneAuditEvent(
  event: TransactionAdminAuditEvent
): TransactionAdminAuditEvent {
  return TransactionAdminAuditEventSchema.parse(
    JSON.parse(JSON.stringify(event))
  );
}

function sortWorkOrders(
  workOrders: TransactionAdminWorkOrder[]
): TransactionAdminWorkOrder[] {
  return [...workOrders].sort(
    (a, b) => Date.parse(b.markedAt) - Date.parse(a.markedAt)
  );
}

function sortAuditEvents(
  events: TransactionAdminAuditEvent[]
): TransactionAdminAuditEvent[] {
  return [...events].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

function normalizeStoreFile(payload: unknown): TransactionOperationStoreFile {
  const parsed = TransactionOperationStoreFileSchema.safeParse(payload);
  if (!parsed.success) return emptyStoreFile();

  return {
    version: 1,
    workOrders: Object.fromEntries(
      Object.entries(parsed.data.workOrders).map(
        ([transactionId, workOrder]) => [
          transactionId,
          cloneWorkOrder(workOrder),
        ]
      )
    ),
    auditEvents: Object.fromEntries(
      Object.entries(parsed.data.auditEvents).map(([transactionId, events]) => [
        transactionId,
        sortAuditEvents(events.map(cloneAuditEvent)),
      ])
    ),
  };
}

export class InMemoryTransactionOperationStore implements TransactionOperationStore {
  private workOrders = new Map<string, TransactionAdminWorkOrder>();
  private auditEvents = new Map<string, TransactionAdminAuditEvent[]>();

  getWorkOrder(transactionId: string): TransactionAdminWorkOrder | undefined {
    const workOrder = this.workOrders.get(transactionId);
    return workOrder ? cloneWorkOrder(workOrder) : undefined;
  }

  listWorkOrders(): TransactionAdminWorkOrder[] {
    return sortWorkOrders(Array.from(this.workOrders.values())).map(
      cloneWorkOrder
    );
  }

  saveWorkOrder(
    workOrder: TransactionAdminWorkOrder
  ): TransactionAdminWorkOrder {
    const normalized = cloneWorkOrder(workOrder);
    this.workOrders.set(normalized.transactionId, normalized);
    return cloneWorkOrder(normalized);
  }

  listAuditEvents(transactionId: string): TransactionAdminAuditEvent[] {
    return sortAuditEvents(this.auditEvents.get(transactionId) ?? []).map(
      cloneAuditEvent
    );
  }

  listAllAuditEvents(): TransactionAdminAuditEvent[] {
    return sortAuditEvents(Array.from(this.auditEvents.values()).flat()).map(
      cloneAuditEvent
    );
  }

  appendAuditEvent(
    event: TransactionAdminAuditEvent
  ): TransactionAdminAuditEvent {
    const normalized = cloneAuditEvent(event);
    const events = this.auditEvents.get(normalized.transactionId) ?? [];
    this.auditEvents.set(
      normalized.transactionId,
      sortAuditEvents([normalized, ...events])
    );
    return cloneAuditEvent(normalized);
  }

  clear() {
    this.workOrders.clear();
    this.auditEvents.clear();
  }
}

export class JsonFileTransactionOperationStore implements TransactionOperationStore {
  constructor(
    private readonly filePath = resolveTransactionOperationStorePath()
  ) {}

  getWorkOrder(transactionId: string): TransactionAdminWorkOrder | undefined {
    const workOrder = this.readFile().workOrders[transactionId];
    return workOrder ? cloneWorkOrder(workOrder) : undefined;
  }

  listWorkOrders(): TransactionAdminWorkOrder[] {
    return sortWorkOrders(Object.values(this.readFile().workOrders)).map(
      cloneWorkOrder
    );
  }

  saveWorkOrder(
    workOrder: TransactionAdminWorkOrder
  ): TransactionAdminWorkOrder {
    const normalized = cloneWorkOrder(workOrder);
    const file = this.readFile();
    file.workOrders[normalized.transactionId] = normalized;
    this.writeFile(file);
    return cloneWorkOrder(normalized);
  }

  listAuditEvents(transactionId: string): TransactionAdminAuditEvent[] {
    return sortAuditEvents(
      this.readFile().auditEvents[transactionId] ?? []
    ).map(cloneAuditEvent);
  }

  listAllAuditEvents(): TransactionAdminAuditEvent[] {
    return sortAuditEvents(
      Object.values(this.readFile().auditEvents).flat()
    ).map(cloneAuditEvent);
  }

  appendAuditEvent(
    event: TransactionAdminAuditEvent
  ): TransactionAdminAuditEvent {
    const normalized = cloneAuditEvent(event);
    const file = this.readFile();
    const events = file.auditEvents[normalized.transactionId] ?? [];
    file.auditEvents[normalized.transactionId] = sortAuditEvents([
      normalized,
      ...events,
    ]);
    this.writeFile(file);
    return cloneAuditEvent(normalized);
  }

  clear() {
    this.writeFile(emptyStoreFile());
  }

  private readFile(): TransactionOperationStoreFile {
    if (!fs.existsSync(this.filePath)) return emptyStoreFile();

    try {
      return normalizeStoreFile(
        JSON.parse(fs.readFileSync(this.filePath, "utf8"))
      );
    } catch {
      return emptyStoreFile();
    }
  }

  private writeFile(file: TransactionOperationStoreFile) {
    const normalized = normalizeStoreFile(file);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(normalized, null, 2), "utf8");
    fs.renameSync(tmpPath, this.filePath);
  }
}

export function resolveTransactionOperationStorePath() {
  return path.resolve(
    process.cwd(),
    process.env.HONGBOSHI_TRANSACTION_OPERATION_FILE ??
      ".hongboshi-data/transaction-operations.json"
  );
}

export function createDefaultTransactionOperationStore(): TransactionOperationStore {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST ||
    process.env.HONGBOSHI_TRANSACTION_OPERATION_STORE === "memory"
  ) {
    return new InMemoryTransactionOperationStore();
  }

  if (
    process.env.HONGBOSHI_TRANSACTION_OPERATION_STORE === "postgres" ||
    (process.env.HONGBOSHI_TRANSACTION_OPERATION_STORE !== "file" &&
      getDatabaseUrl())
  ) {
    return new PostgresTransactionOperationStore(getSharedPostgresPool());
  }

  return new JsonFileTransactionOperationStore();
}

let transactionOperationStore: TransactionOperationStore =
  createDefaultTransactionOperationStore();

export function getTransactionOperationStore() {
  return transactionOperationStore;
}

export function setTransactionOperationStore(store: TransactionOperationStore) {
  transactionOperationStore = store;
}

export async function resetTransactionOperationStore(
  store: TransactionOperationStore = createDefaultTransactionOperationStore()
) {
  transactionOperationStore = store;
  await transactionOperationStore.clear();
}
