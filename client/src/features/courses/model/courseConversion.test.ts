import { describe, expect, it } from "vitest";
import type { Course } from "@shared/domain";
import {
  createCourseConversionCoursePayload,
  createCourseConversionEvent,
} from "./courseConversion";

const course: Course = {
  id: 8,
  title: "职场压力复原课",
  coverUrl: "https://example.com/course.jpg",
  category: "职场心理",
  type: "直播",
  teacher: "王老师",
  learners: 6800,
  price: 499,
  originalPrice: 699,
  isFree: false,
  isVip: true,
  coupon: {
    label: "新人券",
    amount: 80,
  },
  createdAt: "2026-03-01",
};

describe("course conversion model", () => {
  it("creates stable course payloads with pricing and metadata", () => {
    const payload = createCourseConversionCoursePayload({
      name: "course_checkout_opened",
      source: "course_detail_panel",
      course,
      accessStatus: "requires_membership",
      checkoutMode: "membership",
      pathId: "workplace",
      pathLabel: "职场压力",
      metadata: {
        hasPendingCheckout: false,
      },
    });

    expect(payload).toMatchObject({
      name: "course_checkout_opened",
      source: "course_detail_panel",
      courseId: 8,
      accessStatus: "requires_membership",
      checkoutMode: "membership",
      listPrice: 499,
      originalPrice: 699,
      discountAmount: 80,
      payableAmount: 419,
      metadata: {
        isVip: true,
        teacher: "王老师",
        hasPendingCheckout: false,
      },
    });
  });

  it("normalizes draft events with generated ids and page context", () => {
    const event = createCourseConversionEvent(
      {
        name: "course_detail_click",
        source: "courses_discovery",
        courseId: 8,
      },
      {
        sessionId: "session-1",
        websiteId: "site-1",
        pagePath: "/courses",
        now: () => "2026-05-17T12:00:00.000Z",
        createId: () => "event-1",
      }
    );

    expect(event).toMatchObject({
      id: "event-1",
      occurredAt: "2026-05-17T12:00:00.000Z",
      sessionId: "session-1",
      websiteId: "site-1",
      pagePath: "/courses",
      metadata: {},
    });
  });
});
