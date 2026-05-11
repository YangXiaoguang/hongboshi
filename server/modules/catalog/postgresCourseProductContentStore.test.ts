import { describe, expect, it } from "vitest";
import { courses } from "../../../shared/data/mockCourses";
import type {
  DatabaseQueryExecutor,
  DatabaseQueryResult,
} from "../../db/postgres";
import { buildDefaultCourseProductContent } from "./courseProductContentStore";
import { courseProductFromCourse } from "./courseProductStore";
import { PostgresCourseProductContentStore } from "./postgresCourseProductContentStore";

type CapturedQuery = {
  text: string;
  values?: readonly unknown[];
};

class FakeCourseProductContentExecutor implements DatabaseQueryExecutor {
  readonly queries: CapturedQuery[] = [];
  contents: unknown[];

  constructor(contents: unknown[] = []) {
    this.contents = contents;
  }

  async query<Row>(
    text: string,
    values?: readonly unknown[]
  ): Promise<DatabaseQueryResult<Row>> {
    this.queries.push({ text, values });

    if (text.includes("INSERT INTO course_product_contents")) {
      const row = {
        product_id: values?.[0],
        summary: values?.[1],
        target_audience: JSON.parse(String(values?.[2] ?? "[]")),
        chapters: JSON.parse(String(values?.[3] ?? "[]")),
        created_at: values?.[4],
        updated_at: values?.[4],
      };
      this.contents = [
        ...this.contents.filter(
          item => (item as { product_id: string }).product_id !== row.product_id
        ),
        row,
      ];
      return { rows: [row as Row], rowCount: 1 };
    }

    if (text.trim() === "DELETE FROM course_product_contents") {
      this.contents = [];
      return { rows: [] as Row[], rowCount: 0 };
    }

    if (text.includes("FROM course_product_contents")) {
      const rows = this.contents.filter(
        item => (item as { product_id: string }).product_id === values?.[0]
      );
      return { rows: rows as Row[], rowCount: rows.length };
    }

    return { rows: [] as Row[], rowCount: 0 };
  }
}

describe("postgres course product content store", () => {
  it("maps saved detail content into the course_product_contents table", async () => {
    const product = courseProductFromCourse(courses[0]);
    const content = buildDefaultCourseProductContent(
      product,
      "2026-05-12T09:10:00.000Z"
    );
    const db = new FakeCourseProductContentExecutor();
    const store = new PostgresCourseProductContentStore(db);

    const saved = await store.saveContent(content);

    expect(saved.productId).toBe(product.id);
    expect(db.queries[0]?.text).toContain(
      "INSERT INTO course_product_contents"
    );
    expect(db.queries[0]?.values?.slice(0, 3)).toEqual([
      product.id,
      content.summary,
      JSON.stringify(content.targetAudience),
    ]);
  });

  it("loads detail content from PostgreSQL rows", async () => {
    const product = courseProductFromCourse(courses[0]);
    const content = buildDefaultCourseProductContent(
      product,
      "2026-05-12T09:20:00.000Z"
    );
    const db = new FakeCourseProductContentExecutor([
      {
        product_id: content.productId,
        summary: content.summary,
        target_audience: content.targetAudience,
        chapters: content.chapters,
        created_at: new Date("2026-05-12T09:00:00.000Z"),
        updated_at: new Date("2026-05-12T09:20:00.000Z"),
      },
    ]);
    const store = new PostgresCourseProductContentStore(db);

    const loaded = await store.getContent(product.id);

    expect(loaded).toMatchObject({
      productId: product.id,
      updatedAt: "2026-05-12T09:20:00.000Z",
    });
    expect(loaded?.chapters).toHaveLength(3);
  });

  it("clears content rows", async () => {
    const db = new FakeCourseProductContentExecutor([{ product_id: "p_1" }]);
    const store = new PostgresCourseProductContentStore(db);

    await store.clear();

    expect(db.contents).toEqual([]);
    expect(db.queries[0]?.text.trim()).toBe(
      "DELETE FROM course_product_contents"
    );
  });
});
