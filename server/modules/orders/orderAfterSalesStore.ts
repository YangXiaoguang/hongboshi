import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  OrderAfterSalesRequestSchema,
  type OrderAfterSalesRequest,
} from "../../../shared/domain";

type MaybePromise<T> = T | Promise<T>;

const OrderAfterSalesStoreFileSchema = z.object({
  version: z.literal(1),
  requests: z.array(OrderAfterSalesRequestSchema).default([]),
});

type OrderAfterSalesStoreFile = z.infer<
  typeof OrderAfterSalesStoreFileSchema
>;

export interface OrderAfterSalesStore {
  listAll(): MaybePromise<OrderAfterSalesRequest[]>;
  listByOrderId(orderId: string): MaybePromise<OrderAfterSalesRequest[]>;
  listByUserId(userId: string): MaybePromise<OrderAfterSalesRequest[]>;
  append(
    request: OrderAfterSalesRequest
  ): MaybePromise<OrderAfterSalesRequest>;
  clear(): MaybePromise<void>;
}

function emptyStoreFile(): OrderAfterSalesStoreFile {
  return {
    version: 1,
    requests: [],
  };
}

function cloneRequest(request: OrderAfterSalesRequest): OrderAfterSalesRequest {
  return OrderAfterSalesRequestSchema.parse(JSON.parse(JSON.stringify(request)));
}

function sortRequests(
  requests: OrderAfterSalesRequest[]
): OrderAfterSalesRequest[] {
  return [...requests].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

function normalizeStoreFile(payload: unknown): OrderAfterSalesStoreFile {
  const parsed = OrderAfterSalesStoreFileSchema.safeParse(payload);
  if (!parsed.success) return emptyStoreFile();

  return {
    version: 1,
    requests: sortRequests(parsed.data.requests.map(cloneRequest)),
  };
}

export class InMemoryOrderAfterSalesStore implements OrderAfterSalesStore {
  private requests: OrderAfterSalesRequest[] = [];

  listAll(): OrderAfterSalesRequest[] {
    return sortRequests(this.requests).map(cloneRequest);
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

  clear() {
    this.requests = [];
  }
}

export class JsonFileOrderAfterSalesStore implements OrderAfterSalesStore {
  constructor(private readonly filePath = resolveOrderAfterSalesStorePath()) {}

  listAll(): OrderAfterSalesRequest[] {
    return this.readFile().requests.map(cloneRequest);
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
      version: 1,
      requests: sortRequests([...file.requests, normalized]),
    });
    return cloneRequest(normalized);
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
