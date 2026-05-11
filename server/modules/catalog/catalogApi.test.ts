import { describe, expect, it } from "vitest";
import { courses } from "../../../shared/data/mockCourses";
import { courseProductFromCourse } from "./courseProductStore";
import { getCourseProductAdminListPayload } from "./catalogApi";

const products = courses.slice(0, 4).map(courseProductFromCourse);
const store = {
  async listProducts() {
    return products;
  },
};

describe("catalog admin api payloads", () => {
  it("requires admin management permission", async () => {
    const anonymous = await getCourseProductAdminListPayload(null, {}, store);
    expect(anonymous.status).toBe(401);

    const forbidden = await getCourseProductAdminListPayload(
      { id: "user_1", roles: ["member"] },
      {},
      store
    );
    expect(forbidden.status).toBe(403);
  });

  it("returns filtered course products to operators", async () => {
    const payload = await getCourseProductAdminListPayload(
      { id: "operator_1", roles: ["operator"] },
      {
        category: products[0].category,
        status: "published",
        page: 1,
        pageSize: 2,
      },
      store
    );

    expect(payload.status).toBe(200);
    expect(payload.body.ok).toBe(true);
    if (payload.body.ok) {
      expect(payload.body.data.items.length).toBeGreaterThan(0);
      expect(payload.body.data.items[0]?.category).toBe(products[0].category);
      expect(payload.body.data.meta.pageSize).toBe(2);
      expect(payload.body.data.summary.totalCount).toBe(products.length);
    }
  });

  it("rejects invalid list query values", async () => {
    const payload = await getCourseProductAdminListPayload(
      { id: "operator_1", roles: ["operator"] },
      { status: "deleted" },
      store
    );

    expect(payload.status).toBe(400);
    expect(payload.body.ok).toBe(false);
  });
});
