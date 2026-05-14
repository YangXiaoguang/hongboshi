import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { JsonFileCourseAccessStore } from "./courseAccessStore";
import { createEmptyCourseAccessState } from "../../../shared/domain";

const tempDirs: string[] = [];

function createTempStore() {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "hongboshi-course-access-")
  );
  tempDirs.push(dir);
  return new JsonFileCourseAccessStore(path.join(dir, "course-access.json"));
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("course access JSON store", () => {
  it("persists course access by user id", () => {
    const store = createTempStore();
    store.save("u_10001", {
      ...createEmptyCourseAccessState(),
      ownedCourseIds: [16],
    });

    const reloadedStore = new JsonFileCourseAccessStore(
      path.join(tempDirs[0], "course-access.json")
    );

    expect(reloadedStore.load("u_10001").ownedCourseIds).toEqual([16]);
  });

  it("keeps users isolated from each other", () => {
    const store = createTempStore();
    store.save("u_10001", {
      ...createEmptyCourseAccessState(),
      ownedCourseIds: [16],
    });

    expect(store.load("u_20001").ownedCourseIds).toEqual([]);
  });

  it("persists membership audit events by user id", () => {
    const store = createTempStore();
    store.appendMembershipAuditEvent({
      id: "audit_1",
      userId: "u_10001",
      actorId: "operator_1",
      actorRoles: ["operator"],
      action: "extend",
      reason: "客服补偿延期",
      before: { status: "active", expiresAt: "2027-05-01T10:00:00+08:00" },
      after: { status: "active", expiresAt: "2027-05-31T10:00:00+08:00" },
      createdAt: "2026-05-12T10:00:00+08:00",
    });

    const reloadedStore = new JsonFileCourseAccessStore(
      path.join(tempDirs[0], "course-access.json")
    );

    expect(reloadedStore.listMembershipAuditEvents("u_10001")[0]).toMatchObject(
      {
        id: "audit_1",
        action: "extend",
        reason: "客服补偿延期",
      }
    );
    expect(reloadedStore.listAllMembershipAuditEvents()[0]).toMatchObject({
      id: "audit_1",
      userId: "u_10001",
    });
    expect(reloadedStore.listMembershipAuditEvents("u_20001")).toEqual([]);
  });

  it("persists order admin audit events and exception flags", () => {
    const store = createTempStore();
    store.saveOrderAdminExceptionFlag({
      orderId: "order_1",
      status: "open",
      severity: "warning",
      reason: "待核查支付回调",
      markedBy: "operator_1",
      markedAt: "2026-05-12T10:00:00+08:00",
    });
    store.appendOrderAdminAuditEvent({
      id: "order_audit_1",
      orderId: "order_1",
      userId: "u_10001",
      actorId: "operator_1",
      actorRoles: ["operator"],
      action: "mark_exception",
      reason: "待核查支付回调",
      before: { status: "paid" },
      after: {
        status: "paid",
        exception: {
          orderId: "order_1",
          status: "open",
          severity: "warning",
          reason: "待核查支付回调",
          markedBy: "operator_1",
          markedAt: "2026-05-12T10:00:00+08:00",
        },
      },
      createdAt: "2026-05-12T10:00:01+08:00",
    });

    const reloadedStore = new JsonFileCourseAccessStore(
      path.join(tempDirs[0], "course-access.json")
    );

    expect(reloadedStore.listOrderAdminExceptionFlags()[0]).toMatchObject({
      orderId: "order_1",
      status: "open",
    });
    expect(reloadedStore.listOrderAdminAuditEvents("order_1")[0]).toMatchObject(
      {
        id: "order_audit_1",
        action: "mark_exception",
      }
    );
    expect(reloadedStore.listAllOrderAdminAuditEvents()[0]).toMatchObject({
      id: "order_audit_1",
      orderId: "order_1",
    });
  });
});
