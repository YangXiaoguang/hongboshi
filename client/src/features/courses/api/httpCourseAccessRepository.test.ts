import { describe, expect, it } from "vitest";
import {
  CourseAccessRequestError,
  parseCourseAccessResponse,
  parseCourseCheckoutOrderResponse,
} from "./httpCourseAccessRepository";

describe("http course access repository parsing", () => {
  it("parses a successful access state response", () => {
    const state = parseCourseAccessResponse({
      ok: true,
      data: {
        ownedCourseIds: [1, 1, 2],
        membership: {
          status: "none",
        },
        orders: [],
      },
    });

    expect(state.ownedCourseIds).toEqual([1, 1, 2]);
    expect(state.membership.status).toBe("none");
  });

  it("throws on failed access responses", () => {
    expect(() =>
      parseCourseAccessResponse({
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: "课程购买参数不合法",
        },
      })
    ).toThrow("课程购买参数不合法");
  });

  it("preserves authorization error codes", () => {
    try {
      parseCourseAccessResponse({
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "请先登录后继续操作",
        },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(CourseAccessRequestError);
      expect((err as CourseAccessRequestError).code).toBe("UNAUTHORIZED");
    }
  });

  it("parses checkout order responses with access state", () => {
    const checkout = parseCourseCheckoutOrderResponse({
      ok: true,
      data: {
        order: {
          id: "order_course_1",
          userId: "u_10001",
          status: "pending_payment",
          items: [
            {
              type: "course",
              targetId: "1",
              title: "情绪管理入门",
              unitPrice: 199,
              quantity: 1,
            },
          ],
          subtotal: 199,
          discountAmount: 0,
          payableAmount: 199,
          createdAt: "2026-05-09T10:00:00.000Z",
          expiresAt: "2026-05-09T10:30:00.000Z",
        },
        mode: "course",
        payment: {
          payableAmount: 199,
          expiresAt: "2026-05-09T10:30:00.000Z",
          holdMinutes: 30,
        },
        entitlement: {
          status: "pending",
          title: "情绪管理入门",
          description: "支付成功后会自动解锁本课程。",
        },
        accessState: {
          ownedCourseIds: [],
          membership: { status: "none" },
          orders: [],
        },
      },
    });

    expect(checkout.order.status).toBe("pending_payment");
    expect(checkout.entitlement.status).toBe("pending");
  });
});
