import {
  CourseProductAuditEventSchema,
  CourseProductListItemSchema,
  type CourseProductAuditEvent,
  type CourseProductListItem,
} from "../../../shared/domain";
import type { DatabaseQueryExecutor } from "../../db/postgres";
import type { CourseProductStore } from "./courseProductStore";

type CourseProductRow = {
  id: string;
  course_id: number;
  title: string;
  cover_url: string;
  category: CourseProductListItem["category"];
  type: CourseProductListItem["type"];
  instructor_name: string;
  learners: number;
  amount_cents: number;
  original_amount_cents: number;
  is_free: boolean;
  member_included: boolean;
  status: CourseProductListItem["status"];
  review_status: CourseProductListItem["reviewStatus"];
  source: CourseProductListItem["source"];
  created_at: string | Date;
  updated_at: string | Date;
  published_at: string | Date | null;
};

type CourseProductAuditEventRow = {
  id: string;
  product_id: string;
  product_title: string;
  actor_id: string;
  action: CourseProductAuditEvent["action"];
  reason: string;
  before_payload: unknown;
  after_payload: unknown;
  created_at: string | Date;
};

function toDateTimeLike(value: string | Date | null | undefined) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function toCents(amount: number) {
  return Math.round(amount * 100);
}

function fromCents(amount: number) {
  return amount / 100;
}

function rowToProduct(row: CourseProductRow): CourseProductListItem {
  return CourseProductListItemSchema.parse({
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    coverUrl: row.cover_url,
    category: row.category,
    type: row.type,
    instructorName: row.instructor_name,
    learners: row.learners,
    price: {
      currency: "CNY",
      amount: fromCents(row.amount_cents),
      originalAmount: fromCents(row.original_amount_cents),
      isFree: row.is_free,
      memberIncluded: row.member_included,
    },
    status: row.status,
    reviewStatus: row.review_status,
    source: row.source,
    createdAt: toDateTimeLike(row.created_at) ?? new Date(0).toISOString(),
    updatedAt: toDateTimeLike(row.updated_at) ?? new Date(0).toISOString(),
    publishedAt: toDateTimeLike(row.published_at),
  });
}

function rowToAuditEvent(
  row: CourseProductAuditEventRow
): CourseProductAuditEvent {
  return CourseProductAuditEventSchema.parse({
    id: row.id,
    productId: row.product_id,
    productTitle: row.product_title,
    actorId: row.actor_id,
    action: row.action,
    reason: row.reason,
    before: row.before_payload,
    after: row.after_payload,
    createdAt: toDateTimeLike(row.created_at) ?? new Date(0).toISOString(),
  });
}

export class PostgresCourseProductStore implements CourseProductStore {
  constructor(
    private readonly db: DatabaseQueryExecutor,
    private readonly seedProductFactory: () => CourseProductListItem[] = () => []
  ) {}

  async listProducts() {
    await this.ensureSeedProducts();
    const result = await this.db.query<CourseProductRow>(
      `
        SELECT
          id,
          course_id,
          title,
          cover_url,
          category,
          type,
          instructor_name,
          learners,
          amount_cents,
          original_amount_cents,
          is_free,
          member_included,
          status,
          review_status,
          source,
          created_at,
          updated_at,
          published_at
        FROM course_products
        ORDER BY updated_at DESC, id ASC
      `
    );

    return result.rows.map(rowToProduct);
  }

  async getProduct(productId: string) {
    await this.ensureSeedProducts();
    const result = await this.db.query<CourseProductRow>(
      `
        SELECT
          id,
          course_id,
          title,
          cover_url,
          category,
          type,
          instructor_name,
          learners,
          amount_cents,
          original_amount_cents,
          is_free,
          member_included,
          status,
          review_status,
          source,
          created_at,
          updated_at,
          published_at
        FROM course_products
        WHERE id = $1
        LIMIT 1
      `,
      [productId]
    );

    return result.rows[0] ? rowToProduct(result.rows[0]) : undefined;
  }

  async saveProduct(product: CourseProductListItem) {
    const normalized = CourseProductListItemSchema.parse(product);
    const result = await this.db.query<CourseProductRow>(
      `
        INSERT INTO course_products (
          id,
          course_id,
          title,
          cover_url,
          category,
          type,
          instructor_name,
          learners,
          amount_cents,
          original_amount_cents,
          is_free,
          member_included,
          status,
          review_status,
          source,
          created_at,
          updated_at,
          published_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18
        )
        ON CONFLICT (id) DO UPDATE SET
          course_id = EXCLUDED.course_id,
          title = EXCLUDED.title,
          cover_url = EXCLUDED.cover_url,
          category = EXCLUDED.category,
          type = EXCLUDED.type,
          instructor_name = EXCLUDED.instructor_name,
          learners = EXCLUDED.learners,
          amount_cents = EXCLUDED.amount_cents,
          original_amount_cents = EXCLUDED.original_amount_cents,
          is_free = EXCLUDED.is_free,
          member_included = EXCLUDED.member_included,
          status = EXCLUDED.status,
          review_status = EXCLUDED.review_status,
          source = EXCLUDED.source,
          updated_at = EXCLUDED.updated_at,
          published_at = EXCLUDED.published_at
        RETURNING
          id,
          course_id,
          title,
          cover_url,
          category,
          type,
          instructor_name,
          learners,
          amount_cents,
          original_amount_cents,
          is_free,
          member_included,
          status,
          review_status,
          source,
          created_at,
          updated_at,
          published_at
      `,
      [
        normalized.id,
        normalized.courseId,
        normalized.title,
        normalized.coverUrl,
        normalized.category,
        normalized.type,
        normalized.instructorName,
        normalized.learners,
        toCents(normalized.price.amount),
        toCents(normalized.price.originalAmount),
        normalized.price.isFree,
        normalized.price.memberIncluded,
        normalized.status,
        normalized.reviewStatus,
        normalized.source,
        normalized.createdAt,
        normalized.updatedAt,
        normalized.publishedAt ?? null,
      ]
    );

    if (!result.rows[0]) throw new Error("COURSE_PRODUCT_NOT_FOUND");
    return rowToProduct(result.rows[0]);
  }

  async listAuditEvents(productId?: string) {
    const result = await this.db.query<CourseProductAuditEventRow>(
      `
        SELECT
          id,
          product_id,
          product_title,
          actor_id,
          action,
          reason,
          before_payload,
          after_payload,
          created_at
        FROM course_product_audit_events
        ${productId ? "WHERE product_id = $1" : ""}
        ORDER BY created_at DESC, id ASC
      `,
      productId ? [productId] : undefined
    );

    return result.rows.map(rowToAuditEvent);
  }

  async appendAuditEvent(event: CourseProductAuditEvent) {
    const normalized = CourseProductAuditEventSchema.parse(event);
    const result = await this.db.query<CourseProductAuditEventRow>(
      `
        INSERT INTO course_product_audit_events (
          id,
          product_id,
          product_title,
          actor_id,
          action,
          reason,
          before_payload,
          after_payload,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          product_id = EXCLUDED.product_id,
          product_title = EXCLUDED.product_title,
          actor_id = EXCLUDED.actor_id,
          action = EXCLUDED.action,
          reason = EXCLUDED.reason,
          before_payload = EXCLUDED.before_payload,
          after_payload = EXCLUDED.after_payload,
          created_at = EXCLUDED.created_at
        RETURNING
          id,
          product_id,
          product_title,
          actor_id,
          action,
          reason,
          before_payload,
          after_payload,
          created_at
      `,
      [
        normalized.id,
        normalized.productId,
        normalized.productTitle,
        normalized.actorId,
        normalized.action,
        normalized.reason,
        normalized.before,
        normalized.after,
        normalized.createdAt,
      ]
    );

    if (!result.rows[0]) throw new Error("COURSE_PRODUCT_AUDIT_NOT_FOUND");
    return rowToAuditEvent(result.rows[0]);
  }

  async clear() {
    await this.db.query("DELETE FROM course_product_audit_events");
    await this.db.query("DELETE FROM course_products");
  }

  private async ensureSeedProducts() {
    const seedProducts = this.seedProductFactory();
    if (!seedProducts.length) return;

    const count = await this.db.query<{ count: string }>(
      "SELECT COUNT(*)::int AS count FROM course_products"
    );
    if (Number(count.rows[0]?.count ?? 0) > 0) return;

    for (const product of seedProducts) {
      await this.saveProduct(product);
    }
  }
}
