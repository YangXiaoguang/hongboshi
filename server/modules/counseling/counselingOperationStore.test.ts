import { describe, expect, it } from "vitest";
import {
  DEFAULT_COUNSELING_CANCELLATION_POLICY,
  type CounselingOperationAuditEvent,
} from "../../../shared/domain";
import { InMemoryCounselingOperationStore } from "./counselingOperationStore";

describe("counseling operation store", () => {
  it("keeps cancellation policy and audit events isolated behind the store", async () => {
    const store = new InMemoryCounselingOperationStore();

    expect(await store.getCancellationPolicy()).toEqual(
      DEFAULT_COUNSELING_CANCELLATION_POLICY
    );

    await store.saveCancellationPolicy(
      {
        scheduledRefundCutoffMinutesBeforeStart: 120,
        allowPendingPaymentCancellation: false,
      },
      {
        actorId: "operator_1",
        updatedAt: "2026-05-10T08:00:00.000Z",
      }
    );

    const event: CounselingOperationAuditEvent = {
      id: "audit_counseling_1",
      action: "cancellation_policy_updated",
      actorId: "operator_1",
      actorRoles: ["operator"],
      policyBefore: DEFAULT_COUNSELING_CANCELLATION_POLICY,
      policyAfter: {
        scheduledRefundCutoffMinutesBeforeStart: 120,
        allowPendingPaymentCancellation: false,
      },
      note: "调整退款保护窗口",
      createdAt: "2026-05-10T08:00:01.000Z",
    };
    await store.saveAuditEvent(event);

    expect(await store.getCancellationPolicy()).toMatchObject({
      scheduledRefundCutoffMinutesBeforeStart: 120,
      allowPendingPaymentCancellation: false,
    });
    expect(await store.listAuditEvents()).toEqual([event]);

    await store.clear();
    expect(await store.getCancellationPolicy()).toEqual(
      DEFAULT_COUNSELING_CANCELLATION_POLICY
    );
    expect(await store.listAuditEvents()).toEqual([]);
  });
});
