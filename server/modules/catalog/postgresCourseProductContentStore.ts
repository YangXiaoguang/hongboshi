import {
  CourseProductDetailContentSchema,
  type CourseProductDetailContent,
} from "../../../shared/domain";
import type { DatabaseQueryExecutor } from "../../db/postgres";
import type { CourseProductContentStore } from "./courseProductContentStore";

type CourseProductContentRow = {
  product_id: string;
  summary: string;
  target_audience: unknown;
  sales_assets?: unknown;
  chapters: unknown;
  created_at: string | Date;
  updated_at: string | Date;
};

function toDateTimeLike(value: string | Date) {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function courseProductContentRowToDomain(
  row: CourseProductContentRow
): CourseProductDetailContent {
  return CourseProductDetailContentSchema.parse({
    productId: row.product_id,
    summary: row.summary,
    targetAudience: row.target_audience,
    merchandising: row.sales_assets ?? {},
    chapters: row.chapters,
    updatedAt: toDateTimeLike(row.updated_at),
  });
}

export class PostgresCourseProductContentStore implements CourseProductContentStore {
  constructor(private readonly db: DatabaseQueryExecutor) {}

  async getContent(productId: string) {
    const result = await this.db.query<CourseProductContentRow>(
      `
        SELECT
          product_id,
          summary,
          target_audience,
          sales_assets,
          chapters,
          created_at,
          updated_at
        FROM course_product_contents
        WHERE product_id = $1
        LIMIT 1
      `,
      [productId]
    );

    const row = result.rows[0];
    return row ? courseProductContentRowToDomain(row) : undefined;
  }

  async saveContent(content: CourseProductDetailContent) {
    const normalized = CourseProductDetailContentSchema.parse(content);
    const result = await this.db.query<CourseProductContentRow>(
      `
        INSERT INTO course_product_contents (
          product_id,
          summary,
          target_audience,
          sales_assets,
          chapters,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6, $6)
        ON CONFLICT (product_id) DO UPDATE SET
          summary = EXCLUDED.summary,
          target_audience = EXCLUDED.target_audience,
          sales_assets = EXCLUDED.sales_assets,
          chapters = EXCLUDED.chapters,
          updated_at = EXCLUDED.updated_at
        RETURNING
          product_id,
          summary,
          target_audience,
          sales_assets,
          chapters,
          created_at,
          updated_at
      `,
      [
        normalized.productId,
        normalized.summary,
        JSON.stringify(normalized.targetAudience),
        JSON.stringify(normalized.merchandising),
        JSON.stringify(normalized.chapters),
        normalized.updatedAt,
      ]
    );

    const row = result.rows[0];
    if (!row) throw new Error("COURSE_PRODUCT_CONTENT_NOT_FOUND");
    return courseProductContentRowToDomain(row);
  }

  async clear() {
    await this.db.query("DELETE FROM course_product_contents");
  }
}
