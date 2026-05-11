import { describe, expect, it } from "vitest";
import { courses } from "../../../shared/data/mockCourses";
import type {
  DatabaseQueryExecutor,
  DatabaseQueryResult,
} from "../../db/postgres";
import { courseProductFromCourse } from "./courseProductStore";
import { PostgresCourseProductStore } from "./postgresCourseProductStore";

type CapturedQuery = {
  text: string;
  values?: readonly unknown[];
};

class FakeCourseProductExecutor implements DatabaseQueryExecutor {
  readonly queries: CapturedQuery[] = [];
  products: unknown[];
  auditEvents: unknown[];

  constructor(rows: { products?: unknown[]; auditEvents?: unknown[] } = {}) {
    this.products = rows.products ?? [];
    this.auditEvents = rows.auditEvents ?? [];
  }

  async query<Row>(
    text: string,
    values?: readonly unknown[]
  ): Promise<DatabaseQueryResult<Row>> {
    this.queries.push({ text, values });

    if (text.includes("SELECT COUNT(*)::int AS count")) {
      return {
        rows: [{ count: this.products.length } as Row],
        rowCount: 1,
      };
    }

    if (text.includes("INSERT INTO course_products")) {
      const row = {
        id: values?.[0],
        course_id: values?.[1],
        title: values?.[2],
        cover_url: values?.[3],
        category: values?.[4],
        type: values?.[5],
        instructor_name: values?.[6],
        learners: values?.[7],
        amount_cents: values?.[8],
        original_amount_cents: values?.[9],
        is_free: values?.[10],
        member_included: values?.[11],
        status: values?.[12],
        review_status: values?.[13],
        source: values?.[14],
        created_at: values?.[15],
        updated_at: values?.[16],
        published_at: values?.[17],
      };
      this.products = [
        ...this.products.filter(item => (item as { id: string }).id !== row.id),
        row,
      ];
      return { rows: [row as Row], rowCount: 1 };
    }

    if (
      text.includes("FROM course_products") &&
      text.includes("WHERE id = $1")
    ) {
      return {
        rows: this.products.filter(
          item => (item as { id: string }).id === values?.[0]
        ) as Row[],
        rowCount: this.products.length,
      };
    }

    if (text.includes("FROM course_products")) {
      return {
        rows: this.products as Row[],
        rowCount: this.products.length,
      };
    }

    if (text.includes("INSERT INTO course_product_audit_events")) {
      const row = {
        id: values?.[0],
        product_id: values?.[1],
        product_title: values?.[2],
        actor_id: values?.[3],
        action: values?.[4],
        reason: values?.[5],
        before_payload: values?.[6],
        after_payload: values?.[7],
        created_at: values?.[8],
      };
      this.auditEvents = [
        ...this.auditEvents.filter(
          item => (item as { id: string }).id !== row.id
        ),
        row,
      ];
      return { rows: [row as Row], rowCount: 1 };
    }

    if (text.includes("FROM course_product_audit_events")) {
      const rows = values?.[0]
        ? this.auditEvents.filter(
            item => (item as { product_id: string }).product_id === values[0]
          )
        : this.auditEvents;
      return { rows: rows as Row[], rowCount: rows.length };
    }

    return { rows: [] as Row[], rowCount: 0 };
  }
}

describe("postgres course product store", () => {
  it("maps saved course products into the course_products table", async () => {
    const product = {
      ...courseProductFromCourse(courses[0]),
      price: {
        currency: "CNY" as const,
        amount: 88,
        originalAmount: 188,
        isFree: false,
        memberIncluded: true,
      },
    };
    const db = new FakeCourseProductExecutor();
    const store = new PostgresCourseProductStore(db);

    const saved = await store.saveProduct(product);

    expect(saved.price.amount).toBe(88);
    expect(db.queries[0]?.text).toContain("INSERT INTO course_products");
    expect(db.queries[0]?.values?.slice(0, 12)).toEqual([
      product.id,
      product.courseId,
      product.title,
      product.coverUrl,
      product.category,
      product.type,
      product.instructorName,
      product.learners,
      8800,
      18800,
      false,
      true,
    ]);
  });

  it("loads products and audit events from PostgreSQL rows", async () => {
    const product = courseProductFromCourse(courses[0]);
    const db = new FakeCourseProductExecutor({
      products: [
        {
          id: product.id,
          course_id: product.courseId,
          title: product.title,
          cover_url: product.coverUrl,
          category: product.category,
          type: product.type,
          instructor_name: product.instructorName,
          learners: product.learners,
          amount_cents: 9900,
          original_amount_cents: 19900,
          is_free: false,
          member_included: true,
          status: product.status,
          review_status: product.reviewStatus,
          source: product.source,
          created_at: new Date("2026-05-10T09:00:00.000Z"),
          updated_at: new Date("2026-05-11T10:00:00.000Z"),
          published_at: new Date("2026-05-10T09:00:00.000Z"),
        },
      ],
      auditEvents: [
        {
          id: "audit_info_1",
          product_id: product.id,
          product_title: product.title,
          actor_id: "operator_1",
          action: "info_update",
          reason: "运营校对课程基础信息",
          before_payload: { title: product.title },
          after_payload: { title: "婚姻关系沟通训练" },
          created_at: new Date("2026-05-11T10:20:00.000Z"),
        },
      ],
    });
    const store = new PostgresCourseProductStore(db);

    const products = await store.listProducts();
    const events = await store.listAuditEvents(product.id);

    expect(products[0]).toMatchObject({
      id: product.id,
      price: { amount: 99, originalAmount: 199 },
      updatedAt: "2026-05-11T10:00:00.000Z",
    });
    expect(events[0]).toMatchObject({
      action: "info_update",
      actorId: "operator_1",
      after: { title: "婚姻关系沟通训练" },
    });
  });

  it("seeds course products when the table is empty", async () => {
    const product = courseProductFromCourse(courses[0]);
    const db = new FakeCourseProductExecutor();
    const store = new PostgresCourseProductStore(db, () => [product]);

    const products = await store.listProducts();

    expect(products).toHaveLength(1);
    expect(products[0]?.id).toBe(product.id);
    expect(
      db.queries.some(query =>
        query.text.includes("SELECT COUNT(*)::int AS count")
      )
    ).toBe(true);
  });

  it("clears product tables in dependency-safe order", async () => {
    const db = new FakeCourseProductExecutor();
    const store = new PostgresCourseProductStore(db);

    await store.clear();

    expect(db.queries.map(query => query.text.trim())).toEqual([
      "DELETE FROM course_product_audit_events",
      "DELETE FROM course_products",
    ]);
  });
});
