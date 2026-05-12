import { describe, expect, it } from "vitest";
import {
  AssessmentReportSchema,
  applyPaymentSucceededWebhookToOrder,
  applyRefundSucceededWebhookToOrder,
  closeUnpaidOrder,
  CounselingAppointmentSchema,
  CourseListQuerySchema,
  CourseSchema,
  createCounselingSessionOrder,
  createEmptyCourseAccessState,
  createSimulatedPaymentSucceededEvent,
  createSimulatedRefundSucceededEvent,
  findCourseAccessOrder,
  LoginSessionSchema,
  markOrderPaid,
  markOrderRefunded,
  PaymentReconciliationConsoleSchema,
  requestOrderRefund,
  upsertCourseAccessOrder,
  UserProfileSchema,
  userCan,
} from "./index";
import { courses } from "../../client/src/lib/mockData";

describe("domain contracts", () => {
  it("validates the current course mock data against the shared course schema", () => {
    const results = courses.map(course => CourseSchema.safeParse(course));
    expect(results.every(result => result.success)).toBe(true);
  });

  it("normalizes course list query defaults", () => {
    expect(CourseListQuerySchema.parse({})).toMatchObject({
      page: 1,
      pageSize: 20,
      category: "全部",
      type: "全部",
      sort: "comprehensive",
      keyword: "",
      vipOnly: false,
    });
  });

  it("captures the minimum cross-domain objects for the first backend phase", () => {
    expect(
      UserProfileSchema.safeParse({
        id: "user_1",
        displayName: "测试用户",
        roles: ["member"],
        isMinor: false,
        createdAt: "2026-05-09T10:00:00+08:00",
        updatedAt: "2026-05-09T10:00:00+08:00",
      }).success
    ).toBe(true);

    expect(
      AssessmentReportSchema.safeParse({
        id: "report_1",
        userId: "user_1",
        dimensions: {
          emotion: 42,
          sleep: 35,
          relationship: 28,
          parent_child: 10,
          workplace: 22,
          self_growth: 48,
          risk: 5,
        },
        riskLevel: "low",
        summary: "当前以情绪与睡眠困扰为主，建议从稳定作息和正念练习开始。",
        recommendations: [
          {
            target: "course",
            targetId: "1",
            title: "情绪管理入门",
            reason: "匹配情绪调节需求",
            priority: 90,
          },
        ],
        createdAt: "2026-05-09T10:00:00+08:00",
      }).success
    ).toBe(true);

    expect(
      CounselingAppointmentSchema.safeParse({
        id: "appointment_1",
        userId: "user_1",
        counselorId: "counselor_1",
        slotId: "slot_1",
        channel: "video",
        status: "scheduled",
        concernTags: ["emotion", "sleep"],
        assessmentReportId: "report_1",
        createdAt: "2026-05-09T10:00:00+08:00",
        updatedAt: "2026-05-09T10:00:00+08:00",
      }).success
    ).toBe(true);
  });

  it("maps user roles to stable permissions", () => {
    expect(userCan({ roles: ["visitor"] }, "course_access:read")).toBe(true);
    expect(userCan({ roles: ["visitor"] }, "course:purchase")).toBe(false);
    expect(userCan({ roles: ["member"] }, "course:purchase")).toBe(true);
    expect(userCan({ roles: ["catalog_viewer"] }, "catalog:read")).toBe(true);
    expect(userCan({ roles: ["catalog_viewer"] }, "catalog:price")).toBe(
      false
    );
    expect(userCan({ roles: ["catalog_operator"] }, "catalog:review")).toBe(
      true
    );
    expect(userCan({ roles: ["admin"] }, "admin:manage")).toBe(true);
    expect(userCan({ roles: ["admin"] }, "catalog:publish")).toBe(true);
  });

  it("captures consent records in login sessions", () => {
    const session = LoginSessionSchema.parse({
      provider: "phone",
      accessTokenExpiresAt: "2026-05-17T10:00:00+08:00",
      user: {
        id: "user_1",
        displayName: "测试用户",
        roles: ["member"],
        isMinor: false,
        createdAt: "2026-05-10T10:00:00+08:00",
        updatedAt: "2026-05-10T10:00:00+08:00",
      },
      consents: [
        {
          userId: "user_1",
          type: "terms",
          version: "2026.05",
          acceptedAt: "2026-05-10T10:00:00+08:00",
        },
      ],
    });

    expect(session.consents[0].type).toBe("terms");
  });

  it("creates and updates counseling session orders", () => {
    const order = createCounselingSessionOrder({
      appointmentId: "appointment_1",
      userId: "user_1",
      counselorName: "林若安",
      sessionPrice: 399,
      now: "2026-05-10T08:00:00.000Z",
    });
    const state = upsertCourseAccessOrder(
      createEmptyCourseAccessState(),
      order
    );

    expect(findCourseAccessOrder(state, order.id)).toMatchObject({
      status: "pending_payment",
      items: [{ type: "counseling_session", targetId: "appointment_1" }],
    });
    expect(markOrderPaid(order, "2026-05-10T08:10:00.000Z")).toMatchObject({
      status: "paid",
      paidAt: "2026-05-10T08:10:00.000Z",
    });
    expect(closeUnpaidOrder(order)).toMatchObject({
      status: "closed",
    });

    const paidOrder = markOrderPaid(order, "2026-05-10T08:10:00.000Z");
    const refundingOrder = requestOrderRefund(paidOrder);
    expect(refundingOrder).toMatchObject({ status: "refunding" });
    expect(markOrderRefunded(refundingOrder)).toMatchObject({
      status: "refunded",
    });
    expect(() => requestOrderRefund(closeUnpaidOrder(order))).toThrow(
      "INVALID_ORDER_REFUND_REQUEST_TRANSITION"
    );
  });

  it("applies a payment succeeded webhook to an order", () => {
    const order = createCounselingSessionOrder({
      appointmentId: "appointment_1",
      userId: "user_1",
      counselorName: "林若安",
      sessionPrice: 399,
      now: "2026-05-10T08:00:00.000Z",
    });
    const event = createSimulatedPaymentSucceededEvent({
      order,
      now: "2026-05-10T08:10:00.000Z",
    });

    expect(applyPaymentSucceededWebhookToOrder(order, event)).toMatchObject({
      payment: {
        orderId: order.id,
        amount: 399,
        paidAt: "2026-05-10T08:10:00.000Z",
      },
      order: {
        status: "paid",
        paidAt: "2026-05-10T08:10:00.000Z",
      },
    });
  });

  it("applies a refund succeeded webhook to a refunding order", () => {
    const order = requestOrderRefund(
      markOrderPaid(
        createCounselingSessionOrder({
          appointmentId: "appointment_1",
          userId: "user_1",
          counselorName: "林若安",
          sessionPrice: 399,
          now: "2026-05-10T08:00:00.000Z",
        }),
        "2026-05-10T08:10:00.000Z"
      )
    );
    const event = createSimulatedRefundSucceededEvent({
      order,
      now: "2026-05-10T08:30:00.000Z",
    });

    expect(applyRefundSucceededWebhookToOrder(order, event)).toMatchObject({
      refund: {
        orderId: order.id,
        amount: 399,
        refundedAt: "2026-05-10T08:30:00.000Z",
      },
      order: {
        status: "refunded",
      },
    });
  });

  it("validates payment reconciliation console snapshots", () => {
    expect(
      PaymentReconciliationConsoleSchema.safeParse({
        entries: [
          {
            id: "evt_payment_1",
            webhook: {
              id: "evt_payment_1",
              type: "payment.succeeded",
              orderId: "order_counseling_appointment_1",
              channel: "manual",
              status: "processed",
              amount: 399,
              transactionId: "tx_1",
              occurredAt: "2026-05-10T08:10:00.000Z",
              receivedAt: "2026-05-10T08:10:01.000Z",
              processedAt: "2026-05-10T08:10:02.000Z",
              responseStatus: 200,
            },
            business: {
              domain: "counseling",
              orderId: "order_counseling_appointment_1",
              userId: "user_1",
              orderStatus: "paid",
              appointmentId: "appointment_1",
              appointmentStatus: "scheduled",
              payableAmount: 399,
            },
            severity: "ok",
            issues: [],
            checkedAt: "2026-05-10T08:11:00.000Z",
          },
        ],
        summary: {
          receiptCount: 1,
          processedCount: 1,
          failedCount: 0,
          processingCount: 0,
          okCount: 1,
          warningCount: 0,
          criticalCount: 0,
        },
        serverTime: "2026-05-10T08:11:00.000Z",
      }).success
    ).toBe(true);
  });
});
