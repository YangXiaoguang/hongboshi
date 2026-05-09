import { describe, expect, it } from "vitest";
import { listCoursesPayload } from "./courseApi";

describe("course API payloads", () => {
  it("filters and paginates course list payloads", () => {
    const payload = listCoursesPayload({
      category: "情绪管理",
      type: "全部",
      sort: "hottest",
      keyword: "",
      vipOnly: false,
      page: 1,
      pageSize: 1,
    });

    expect(payload.ok).toBe(true);
    if (!payload.ok) return;

    expect(payload.data.totalCount).toBeGreaterThan(1);
    expect(payload.data.paginatedItems).toHaveLength(1);
    expect(payload.data.paginatedItems[0].category).toBe("情绪管理");
  });
});
