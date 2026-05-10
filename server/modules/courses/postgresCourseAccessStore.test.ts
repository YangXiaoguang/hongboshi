import { describe, expect, it } from "vitest";
import type {
  DatabaseQueryExecutor,
  DatabaseQueryResult,
} from "../../db/postgres";
import {
  createEmptyCourseAccessState,
  type CourseAccessState,
} from "../../../shared/domain";
import { PostgresCourseAccessStore } from "./postgresCourseAccessStore";

type CapturedQuery = {
  text: string;
  values?: readonly unknown[];
};

class FakeCourseAccessExecutor implements DatabaseQueryExecutor {
  readonly queries: CapturedQuery[] = [];

  constructor(private readonly rows: Record<string, unknown[]> = {}) {}

  async query<Row>(
    text: string,
    values?: readonly unknown[]
  ): Promise<DatabaseQueryResult<Row>> {
    this.queries.push({ text, values });

    if (text.includes("FROM course_memberships")) {
      return {
        rows: (this.rows.membership ?? []) as Row[],
        rowCount: this.rows.membership?.length ?? 0,
      };
    }

    if (text.includes("FROM course_access_grants")) {
      return {
        rows: (this.rows.grants ?? []) as Row[],
        rowCount: this.rows.grants?.length ?? 0,
      };
    }

    if (text.includes("FROM orders") && !text.includes("INNER JOIN orders")) {
      return {
        rows: (this.rows.orders ?? []) as Row[],
        rowCount: this.rows.orders?.length ?? 0,
      };
    }

    if (text.includes("FROM order_items")) {
      return {
        rows: (this.rows.items ?? []) as Row[],
        rowCount: this.rows.items?.length ?? 0,
      };
    }

    return { rows: [] as Row[], rowCount: 0 };
  }
}

function createState(): CourseAccessState {
  return {
    ...createEmptyCourseAccessState(),
    ownedCourseIds: [16],
    membership: {
      status: "active",
      planName: "成长会员",
      activatedAt: "2026-05-10T08:00:00.000Z",
      expiresAt: "2027-05-10T08:00:00.000Z",
    },
    orders: [
      {
        id: "order_course_16_1778400000000",
        userId: "user_1",
        status: "paid",
        items: [
          {
            type: "course",
            targetId: "16",
            title: "情绪稳定训练课",
            unitPrice: 399,
            quantity: 1,
          },
        ],
        subtotal: 399,
        discountAmount: 20,
        payableAmount: 379,
        createdAt: "2026-05-10T08:00:00.000Z",
        paidAt: "2026-05-10T08:00:00.000Z",
      },
    ],
  };
}

describe("postgres course access store", () => {
  it("maps saved course access state into membership, grants and orders", async () => {
    const db = new FakeCourseAccessExecutor();
    const store = new PostgresCourseAccessStore(db);

    const saved = await store.save("user_1", createState());

    expect(saved.ownedCourseIds).toEqual([16]);
    expect(
      db.queries.some(query =>
        query.text.includes("INSERT INTO course_memberships")
      )
    ).toBe(true);
    expect(
      db.queries.some(query =>
        query.text.includes("UPDATE course_access_grants")
      )
    ).toBe(true);

    const grantQuery = db.queries.find(query =>
      query.text.includes("INSERT INTO course_access_grants")
    );
    expect(grantQuery?.values?.slice(1)).toEqual([
      "user_1",
      16,
      "order_course_16_1778400000000",
    ]);

    const orderQuery = db.queries.find(query =>
      query.text.includes("INSERT INTO orders")
    );
    expect(orderQuery?.values).toEqual([
      "order_course_16_1778400000000",
      "user_1",
      "paid",
      39900,
      2000,
      37900,
      "2026-05-10T08:00:00.000Z",
      "2026-05-10T08:00:00.000Z",
    ]);

    const itemQuery = db.queries.find(query =>
      query.text.includes("INSERT INTO order_items")
    );
    expect(itemQuery?.values?.slice(1)).toEqual([
      "order_course_16_1778400000000",
      "course",
      "16",
      "情绪稳定训练课",
      39900,
      1,
    ]);
  });

  it("loads course access state from PostgreSQL rows", async () => {
    const db = new FakeCourseAccessExecutor({
      membership: [
        {
          user_id: "user_1",
          status: "active",
          plan_name: "成长会员",
          activated_at: new Date("2026-05-10T08:00:00.000Z"),
          expires_at: new Date("2027-05-10T08:00:00.000Z"),
        },
      ],
      grants: [{ course_id: 16 }],
      orders: [
        {
          id: "order_course_16_1778400000000",
          user_id: "user_1",
          status: "paid",
          subtotal_cents: 39900,
          discount_cents: 2000,
          payable_cents: 37900,
          created_at: new Date("2026-05-10T08:00:00.000Z"),
          paid_at: new Date("2026-05-10T08:00:00.000Z"),
        },
      ],
      items: [
        {
          order_id: "order_course_16_1778400000000",
          type: "course",
          target_id: "16",
          title: "情绪稳定训练课",
          unit_price_cents: 39900,
          quantity: 1,
        },
      ],
    });
    const store = new PostgresCourseAccessStore(db);

    const state = await store.load("user_1");

    expect(state).toMatchObject({
      ownedCourseIds: [16],
      membership: {
        status: "active",
        activatedAt: "2026-05-10T08:00:00.000Z",
      },
    });
    expect(state.orders[0]).toMatchObject({
      id: "order_course_16_1778400000000",
      subtotal: 399,
      discountAmount: 20,
      payableAmount: 379,
      items: [{ unitPrice: 399 }],
    });
  });

  it("clears course access tables in dependency-safe order", async () => {
    const db = new FakeCourseAccessExecutor();
    const store = new PostgresCourseAccessStore(db);

    await store.clear();

    expect(db.queries.map(query => query.text.trim())).toEqual([
      "DELETE FROM course_access_grants",
      "DELETE FROM course_memberships",
      "DELETE FROM orders",
    ]);
  });
});
