import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  OrderAfterSalesAuditEventSchema,
  OrderAfterSalesRequestSchema,
  type OrderAfterSalesAuditEvent,
  type OrderAfterSalesRequest,
} from "../../../shared/domain";

type MaybePromise<T> = T | Promise<T>;

const OrderAfterSalesStoreFileSchema = z.object({
  version: z.literal(1),
  requests: z.array(OrderAfterSalesRequestSchema).default([]),
  auditEvents: z.array(OrderAfterSalesAuditEventSchema).default([]),
});

type OrderAfterSalesStoreFile = z.infer<
  typeof OrderAfterSalesStoreFileSchema
>;

export interface OrderAfterSalesStore {
  listAll(): MaybePromise<OrderAfterSalesRequest[]>;
  getById(requestId: string): MaybePromise<OrderAfterSalesRequest | null>;
  listByOrderId(orderId: string): MaybePromise<OrderAfterSalesRequest[]>;
  listByUserId(userId: string): MaybePromise<OrderAfterSalesRequest[]>;
  append(
    request: OrderAfterSalesRequest
  ): MaybePromise<OrderAfterSalesRequest>;
  save(request: OrderAfterSalesRequest): MaybePromise<OrderAfterSalesRequest>;
  listAuditEventsByRequestId(
    requestId: string
  ): MaybePromise<OrderAfterSalesAuditEvent[]>;
  appendAuditEvent(
    event: OrderAfterSalesAuditEvent
  ): MaybePromise<OrderAfterSalesAuditEvent>;
  clear(): MaybePromise<void>;
}

function emptyStoreFile(): OrderAfterSalesStoreFile {
  return {
    version: 1,
    requests: [],
    auditEvents: [],
  };
}

function cloneRequest(request: OrderAfterSalesRequest): OrderAfterSalesRequest {
  return OrderAfterSalesRequestSchema.parse(JSON.parse(JSON.stringify(request)));
}

function cloneAuditEvent(
  event: OrderAfterSalesAuditEvent
): OrderAfterSalesAuditEvent {
  return OrderAfterSalesAuditEventSchema.parse(
    JSON.parse(JSON.stringify(event))
  );
}

function sortRequests(
  requests: OrderAfterSalesRequest[]
): OrderAfterSalesRequest[] {
  return [...requests].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

function sortAuditEvents(
  events: OrderAfterSalesAuditEvent[]
): OrderAfterSalesAuditEvent[] {
  return [...events].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

function normalizeStoreFile(payload: unknown): OrderAfterSalesStoreFile {
  const parsed = OrderAfterSalesStoreFileSchema.safeParse(payload);
  if (!parsed.success) return emptyStoreFile();

  return {
    version: 1,
    requests: sortRequests(parsed.data.requests.map(cloneRequest)),
    auditEvents: sortAuditEvents(parsed.data.auditEvents.map(cloneAuditEvent)),
  };
}

export class InMemoryOrderAfterSalesStore implements OrderAfterSalesStore {
  private requests: OrderAfterSalesRequest[] = [];
  private auditEvents: OrderAfterSalesAuditEvent[] = [];

  listAll(): OrderAfterSalesRequest[] {
    return sortRequests(this.requests).map(cloneRequest);
  }

  getById(requestId: string): OrderAfterSalesRequest | null {
    const request = this.requests.find(item => item.id === requestId);
    return request ? cloneRequest(request) : null;
  }

  listByOrderId(orderId: string): OrderAfterSalesRequest[] {
    return this.listAll().filter(request => request.orderId === orderId);
  }

  listByUserId(userId: string): OrderAfterSalesRequest[] {
    return this.listAll().filter(request => request.userId === userId);
  }

  append(request: OrderAfterSalesRequest): OrderAfterSalesRequest {
    const normalized = cloneRequest(request);
    this.requests = sortRequests([...this.requests, normalized]);
    return cloneRequest(normalized);
  }

  save(request: OrderAfterSalesRequest): OrderAfterSalesRequest {
    const normalized = cloneRequest(request);
    const index = this.requests.findIndex(item => item.id === normalized.id);
    this.requests =
      index >= 0
        ? sortRequests(
            this.requests.map(item =>
              item.id === normalized.id ? normalized : item
            )
          )
        : sortRequests([...this.requests, normalized]);
    return cloneRequest(normalized);
  }

  listAuditEventsByRequestId(requestId: string): OrderAfterSalesAuditEvent[] {
    return sortAuditEvents(
      this.auditEvents.filter(event => event.requestId === requestId)
    ).map(cloneAuditEvent);
  }

  appendAuditEvent(
    event: OrderAfterSalesAuditEvent
  ): OrderAfterSalesAuditEvent {
    const normalized = cloneAuditEvent(event);
    this.auditEvents = sortAuditEvents([...this.auditEvents, normalized]);
    return cloneAuditEvent(normalized);
  }

  clear() {
    this.requests = [];
    this.auditEvents = [];
  }
}

export class JsonFileOrderAfterSalesStore implements OrderAfterSalesStore {
  constructor(private readonly filePath = resolveOrderAfterSalesStorePath()) {}

  listAll(): OrderAfterSalesRequest[] {
    return this.readFile().requests.map(cloneRequest);
  }

  getById(requestId: string): OrderAfterSalesRequest | null {
    const request = this.readFile().requests.find(item => item.id === requestId);
    return request ? cloneRequest(request) : null;
  }

  listByOrderId(orderId: string): OrderAfterSalesRequest[] {
    return this.listAll().filter(request => request.orderId === orderId);
  }

  listByUserId(userId: string): OrderAfterSalesRequest[] {
    return this.listAll().filter(request => request.userId === userId);
  }

  append(request: OrderAfterSalesRequest): OrderAfterSalesRequest {
    const normalized = cloneRequest(request);
    const file = this.readFile();
    this.writeFile({
      ...file,
      requests: sortRequests([...file.requests, normalized]),
    });
    return cloneRequest(normalized);
  }

  save(request: OrderAfterSalesRequest): OrderAfterSalesRequest {
    const normalized = cloneRequest(request);
    const file = this.readFile();
    const exists = file.requests.some(item => item.id === normalized.id);
    this.writeFile({
      ...file,
      requests: sortRequests(
        exists
          ? file.requests.map(item =>
              item.id === normalized.id ? normalized : item
            )
          : [...file.requests, normalized]
      ),
    });
    return cloneRequest(normalized);
  }

  listAuditEventsByRequestId(requestId: string): OrderAfterSalesAuditEvent[] {
    return this.readFile()
      .auditEvents.filter(event => event.requestId === requestId)
      .map(cloneAuditEvent);
  }

  appendAuditEvent(
    event: OrderAfterSalesAuditEvent
  ): OrderAfterSalesAuditEvent {
    const normalized = cloneAuditEvent(event);
    const file = this.readFile();
    this.writeFile({
      ...file,
      auditEvents: sortAuditEvents([...file.auditEvents, normalized]),
    });
    return cloneAuditEvent(normalized);
  }

  clear() {
    this.writeFile(emptyStoreFile());
  }

  private readFile(): OrderAfterSalesStoreFile {
    if (!fs.existsSync(this.filePath)) return emptyStoreFile();

    try {
      return normalizeStoreFile(
        JSON.parse(fs.readFileSync(this.filePath, "utf-8"))
      );
    } catch {
      return emptyStoreFile();
    }
  }

  private writeFile(file: OrderAfterSalesStoreFile) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(file, null, 2), "utf-8");
  }
}

function resolveOrderAfterSalesStorePath() {
  return path.resolve(
    process.cwd(),
    ".hongboshi-data",
    "order-after-sales.json"
  );
}

let orderAfterSalesStore: OrderAfterSalesStore =
  new JsonFileOrderAfterSalesStore();

export function getOrderAfterSalesStore() {
  return orderAfterSalesStore;
}

export function setOrderAfterSalesStore(store: OrderAfterSalesStore) {
  orderAfterSalesStore = store;
}

export function createDefaultOrderAfterSalesStore() {
  return new JsonFileOrderAfterSalesStore();
}
