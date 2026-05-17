import { describe, expect, it } from "vitest";
import {
  COURSE_CONVERSION_SESSION_KEY,
  COURSE_CONVERSION_STORAGE_KEY,
  createCourseConversionAnalyticsRepository,
} from "./courseConversionAnalyticsRepository";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length() {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe("course conversion analytics repository", () => {
  it("buffers events locally when no endpoint is configured", async () => {
    const storage = new MemoryStorage();
    const repo = createCourseConversionAnalyticsRepository({
      storage,
      now: () => "2026-05-17T12:00:00.000Z",
      createId: () => "event-1",
      getPagePath: () => "/courses",
    });

    const event = await repo.track({
      name: "course_impression",
      source: "courses_discovery",
      courseId: 2,
    });

    expect(event).toMatchObject({
      id: "event-1",
      pagePath: "/courses",
      source: "courses_discovery",
    });
    expect(storage.getItem(COURSE_CONVERSION_SESSION_KEY)).toMatch(/^ccs_/);
    expect(repo.listBufferedEvents()).toHaveLength(1);
    expect(repo.listBufferedEvents()[0]).toMatchObject({
      status: "queued",
      event: {
        name: "course_impression",
      },
    });
  });

  it("posts batches and marks events as sent when endpoint succeeds", async () => {
    const storage = new MemoryStorage();
    const requests: Array<{ input: RequestInfo | URL; init?: RequestInit }> =
      [];
    const repo = createCourseConversionAnalyticsRepository({
      storage,
      endpoint: "https://analytics.example.com/events",
      websiteId: "site-1",
      fetcher: async (input, init) => {
        requests.push({ input, init });
        return { ok: true, status: 204, statusText: "No Content" } as Response;
      },
      now: () => "2026-05-17T12:00:00.000Z",
      createId: () => "event-2",
      getPagePath: () => "/courses/2",
    });

    await repo.track({
      name: "course_payment_success",
      source: "checkout_drawer",
      courseId: 2,
      checkoutMode: "course",
      orderId: "order-2",
      paymentChannel: "wechat_pay",
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].input).toBe("https://analytics.example.com/events");
    expect(JSON.parse(String(requests[0].init?.body))).toMatchObject({
      websiteId: "site-1",
      events: [
        {
          id: "event-2",
          name: "course_payment_success",
          websiteId: "site-1",
        },
      ],
    });
    expect(repo.listBufferedEvents()[0]).toMatchObject({
      status: "sent",
      event: {
        id: "event-2",
      },
    });
  });

  it("keeps failed delivery attempts available for later inspection", async () => {
    const storage = new MemoryStorage();
    const repo = createCourseConversionAnalyticsRepository({
      storage,
      endpoint: "https://analytics.example.com/events",
      fetcher: async () =>
        ({ ok: false, status: 500, statusText: "Server Error" }) as Response,
      now: () => "2026-05-17T12:00:00.000Z",
      createId: () => "event-3",
    });

    await repo.track({
      name: "course_detail_view",
      source: "course_detail",
      courseId: 3,
    });

    expect(
      JSON.parse(storage.getItem(COURSE_CONVERSION_STORAGE_KEY) ?? "[]")
    ).toHaveLength(1);
    expect(repo.listBufferedEvents()[0]).toMatchObject({
      status: "failed",
      lastError: "ANALYTICS_HTTP_500",
    });
  });
});
