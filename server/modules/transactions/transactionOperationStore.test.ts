import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import type {
  TransactionAdminAuditEvent,
  TransactionAdminWorkOrder,
} from "../../../shared/domain";
import {
  InMemoryTransactionOperationStore,
  JsonFileTransactionOperationStore,
} from "./transactionOperationStore";

const workOrder: TransactionAdminWorkOrder = {
  id: "transaction_work_1",
  transactionId: "evt_payment_1",
  orderId: "order_1",
  status: "open",
  severity: "critical",
  reason: "渠道回调与订单金额不一致",
  markedBy: "operator_1",
  markedAt: "2026-05-12T10:00:00.000Z",
};

const auditEvent: TransactionAdminAuditEvent = {
  id: "transaction_audit_1",
  transactionId: "evt_payment_1",
  orderId: "order_1",
  userId: "user_1",
  actorId: "operator_1",
  actorRoles: ["operator"],
  action: "mark_exception",
  reason: "渠道回调与订单金额不一致",
  before: {
    orderStatus: "paid",
  },
  after: {
    orderStatus: "paid",
    workOrder,
  },
  refundProviderResult: {
    provider: "manual",
    status: "failed",
    message: "退款渠道临时不可用",
    handledAt: "2026-05-12T10:00:01.000Z",
    retryable: true,
  },
  createdAt: "2026-05-12T10:00:01.000Z",
};

let tempDir: string | undefined;

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

describe("transaction operation store", () => {
  it("stores transaction work orders and audit events in memory", () => {
    const store = new InMemoryTransactionOperationStore();

    expect(store.saveWorkOrder(workOrder)).toMatchObject({
      transactionId: "evt_payment_1",
      status: "open",
    });
    expect(store.getWorkOrder("evt_payment_1")).toMatchObject({
      severity: "critical",
    });
    expect(store.appendAuditEvent(auditEvent)).toMatchObject({
      action: "mark_exception",
    });

    const events = store.listAuditEvents("evt_payment_1");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      after: {
        workOrder: {
          status: "open",
        },
      },
    });
    expect(store.listAllAuditEvents()[0]).toMatchObject({
      id: "transaction_audit_1",
      transactionId: "evt_payment_1",
    });
  });

  it("persists transaction operations in a JSON file", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hongboshi-txn-"));
    const filePath = path.join(tempDir, "transaction-operations.json");
    const writeStore = new JsonFileTransactionOperationStore(filePath);

    writeStore.saveWorkOrder(workOrder);
    writeStore.appendAuditEvent(auditEvent);

    const readStore = new JsonFileTransactionOperationStore(filePath);
    expect(readStore.getWorkOrder("evt_payment_1")).toMatchObject({
      id: "transaction_work_1",
    });
    expect(readStore.listAuditEvents("evt_payment_1")[0]).toMatchObject({
      id: "transaction_audit_1",
      refundProviderResult: {
        status: "failed",
      },
    });
    expect(readStore.listAllAuditEvents()[0]).toMatchObject({
      id: "transaction_audit_1",
      transactionId: "evt_payment_1",
    });
  });
});
