import { describe, expect, it } from "vitest";
import {
  COURSE_CONVERSION_EVENT_VERSION,
  CourseConversionEventBatchSchema,
  CourseConversionEventSchema,
} from "./courseConversion";

describe("course conversion domain contract", () => {
  it("validates a checkout conversion event snapshot", () => {
    const event = CourseConversionEventSchema.parse({
      id: "event-1",
      name: "course_payment_success",
      occurredAt: "2026-05-17T10:00:00.000Z",
      sessionId: "session-1",
      websiteId: "hongboshi-web",
      pagePath: "/courses/2",
      source: "checkout_drawer",
      courseId: 2,
      courseTitle: "情绪管理入门",
      courseCategory: "情绪管理",
      courseType: "录播",
      accessStatus: "requires_purchase",
      checkoutMode: "course",
      orderId: "order-1",
      paymentChannel: "wechat_pay",
      listPrice: 199,
      originalPrice: 399,
      discountAmount: 50,
      payableAmount: 149,
      metadata: {
        isVip: false,
      },
    });

    expect(event.eventVersion).toBe(COURSE_CONVERSION_EVENT_VERSION);
    expect(event).toMatchObject({
      name: "course_payment_success",
      source: "checkout_drawer",
      payableAmount: 149,
    });
  });

  it("keeps batches non-empty and source values explicit", () => {
    const batch = CourseConversionEventBatchSchema.parse({
      websiteId: "hongboshi-web",
      events: [
        {
          id: "event-2",
          name: "course_detail_view",
          occurredAt: "2026-05-17T10:01:00.000Z",
          sessionId: "session-1",
          source: "course_detail",
          courseId: 3,
        },
      ],
    });

    expect(batch.events[0].source).toBe("course_detail");
    expect(() =>
      CourseConversionEventBatchSchema.parse({
        events: [],
      })
    ).toThrow();
  });
});
