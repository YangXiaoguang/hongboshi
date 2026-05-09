import { describe, expect, it } from "vitest";
import { parseCourseAccessResponse } from "./httpCourseAccessRepository";

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
});
