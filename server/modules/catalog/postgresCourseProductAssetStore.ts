import {
  CourseProductAssetReferenceSchema,
  CourseProductAssetSchema,
  type CourseProductAsset,
  type CourseProductAssetReference,
} from "../../../shared/domain";
import type { DatabaseQueryExecutor } from "../../db/postgres";
import type {
  CourseProductAssetReferenceStore,
  CourseProductAssetStore,
} from "./courseProductAssetStore";

type CourseProductAssetRow = {
  id: string;
  product_id: string;
  course_id: number;
  chapter_id: string | null;
  kind: CourseProductAsset["kind"];
  title: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  source_type: CourseProductAsset["sourceType"];
  storage_key: string | null;
  object_key: string | null;
  content_hash: string | null;
  public_url: string | null;
  usage: CourseProductAsset["usage"] | null;
  alt_text: string | null;
  note: string | null;
  compliance_status: CourseProductAsset["complianceStatus"];
  download_enabled: boolean;
  reference_count: number;
  uploaded_by: string;
  uploaded_at: string | Date;
  reviewed_by: string | null;
  reviewed_at: string | Date | null;
  deleted_at: string | Date | null;
  updated_at: string | Date;
};

type CourseProductCourseIdRow = {
  course_id: number;
};

type CourseProductAssetReferenceRow = {
  id: string;
  asset_id: string;
  product_id: string;
  course_id: number;
  chapter_id: string | null;
  reference_type: CourseProductAssetReference["referenceType"];
  material_placeholder_id: string | null;
  material_placeholder_index: number | null;
  created_by: string;
  created_at: string | Date;
  deleted_at: string | Date | null;
};

function toDateTimeLike(value: string | Date | null | undefined) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function courseProductAssetRowToDomain(
  row: CourseProductAssetRow
): CourseProductAsset {
  return CourseProductAssetSchema.parse({
    id: row.id,
    productId: row.product_id,
    chapterId: row.chapter_id ?? undefined,
    kind: row.kind,
    title: row.title,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    sourceType: row.source_type,
    storageKey: row.storage_key ?? undefined,
    objectKey: row.object_key ?? undefined,
    contentHash: row.content_hash ?? undefined,
    publicUrl: row.public_url ?? undefined,
    usage: row.usage ?? undefined,
    altText: row.alt_text ?? undefined,
    note: row.note ?? undefined,
    complianceStatus: row.compliance_status,
    downloadEnabled: row.download_enabled,
    referenceCount: row.reference_count,
    uploadedBy: row.uploaded_by,
    uploadedAt: toDateTimeLike(row.uploaded_at) ?? new Date(0).toISOString(),
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: toDateTimeLike(row.reviewed_at),
    deletedAt: toDateTimeLike(row.deleted_at),
    updatedAt: toDateTimeLike(row.updated_at) ?? new Date(0).toISOString(),
  });
}

export function courseProductAssetReferenceRowToDomain(
  row: CourseProductAssetReferenceRow
): CourseProductAssetReference {
  return CourseProductAssetReferenceSchema.parse({
    id: row.id,
    assetId: row.asset_id,
    productId: row.product_id,
    courseId: row.course_id,
    chapterId: row.chapter_id ?? undefined,
    referenceType: row.reference_type,
    materialPlaceholderId: row.material_placeholder_id ?? undefined,
    materialPlaceholderIndex: row.material_placeholder_index ?? undefined,
    createdBy: row.created_by,
    createdAt: toDateTimeLike(row.created_at) ?? new Date(0).toISOString(),
    deletedAt: toDateTimeLike(row.deleted_at),
  });
}

export class PostgresCourseProductAssetStore
  implements CourseProductAssetStore, CourseProductAssetReferenceStore
{
  constructor(private readonly db: DatabaseQueryExecutor) {}

  async listAssets(productId?: string) {
    const result = await this.db.query<CourseProductAssetRow>(
      `
        SELECT
          id,
          product_id,
          course_id,
          chapter_id,
          kind,
          title,
          file_name,
          mime_type,
          size_bytes,
          source_type,
          storage_key,
          object_key,
          content_hash,
          public_url,
          usage,
          alt_text,
          note,
          compliance_status,
          download_enabled,
          reference_count,
          uploaded_by,
          uploaded_at,
          reviewed_by,
          reviewed_at,
          deleted_at,
          updated_at
        FROM course_product_assets
        ${productId ? "WHERE product_id = $1" : ""}
        ORDER BY updated_at DESC, id ASC
      `,
      productId ? [productId] : undefined
    );

    return result.rows.map(courseProductAssetRowToDomain);
  }

  async getAsset(assetId: string) {
    const result = await this.db.query<CourseProductAssetRow>(
      `
        SELECT
          id,
          product_id,
          course_id,
          chapter_id,
          kind,
          title,
          file_name,
          mime_type,
          size_bytes,
          source_type,
          storage_key,
          object_key,
          content_hash,
          public_url,
          usage,
          alt_text,
          note,
          compliance_status,
          download_enabled,
          reference_count,
          uploaded_by,
          uploaded_at,
          reviewed_by,
          reviewed_at,
          deleted_at,
          updated_at
        FROM course_product_assets
        WHERE id = $1
        LIMIT 1
      `,
      [assetId]
    );

    const row = result.rows[0];
    return row ? courseProductAssetRowToDomain(row) : undefined;
  }

  async saveAsset(asset: CourseProductAsset) {
    const normalized = CourseProductAssetSchema.parse(asset);
    const courseId = await this.resolveCourseId(normalized.productId);
    const objectKey =
      normalized.objectKey && normalized.contentHash
        ? normalized.objectKey
        : null;

    if (objectKey && normalized.contentHash) {
      await this.db.query(
        `
          INSERT INTO course_product_asset_objects (
            object_key,
            provider,
            mime_type,
            size_bytes,
            content_hash,
            original_file_name,
            reference_count,
            created_by,
            created_at,
            deleted_at
          )
          VALUES ($1, 'local', $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (object_key) DO UPDATE SET
            mime_type = EXCLUDED.mime_type,
            size_bytes = EXCLUDED.size_bytes,
            content_hash = EXCLUDED.content_hash,
            original_file_name = EXCLUDED.original_file_name,
            reference_count = EXCLUDED.reference_count,
            deleted_at = EXCLUDED.deleted_at
        `,
        [
          objectKey,
          normalized.mimeType,
          normalized.sizeBytes,
          normalized.contentHash,
          normalized.fileName,
          normalized.referenceCount,
          normalized.uploadedBy,
          normalized.uploadedAt,
          normalized.deletedAt ?? null,
        ]
      );
    }

    const result = await this.db.query<CourseProductAssetRow>(
      `
        INSERT INTO course_product_assets (
          id,
          product_id,
          course_id,
          chapter_id,
          kind,
          title,
          file_name,
          mime_type,
          size_bytes,
          source_type,
          storage_key,
          object_key,
          content_hash,
          public_url,
          usage,
          alt_text,
          note,
          compliance_status,
          download_enabled,
          reference_count,
          uploaded_by,
          uploaded_at,
          reviewed_by,
          reviewed_at,
          deleted_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18,
          $19, $20, $21, $22, $23, $24, $25, $26
        )
        ON CONFLICT (id) DO UPDATE SET
          product_id = EXCLUDED.product_id,
          course_id = EXCLUDED.course_id,
          chapter_id = EXCLUDED.chapter_id,
          kind = EXCLUDED.kind,
          title = EXCLUDED.title,
          file_name = EXCLUDED.file_name,
          mime_type = EXCLUDED.mime_type,
          size_bytes = EXCLUDED.size_bytes,
          source_type = EXCLUDED.source_type,
          storage_key = EXCLUDED.storage_key,
          object_key = EXCLUDED.object_key,
          content_hash = EXCLUDED.content_hash,
          public_url = EXCLUDED.public_url,
          usage = EXCLUDED.usage,
          alt_text = EXCLUDED.alt_text,
          note = EXCLUDED.note,
          compliance_status = EXCLUDED.compliance_status,
          download_enabled = EXCLUDED.download_enabled,
          reference_count = EXCLUDED.reference_count,
          uploaded_by = EXCLUDED.uploaded_by,
          uploaded_at = EXCLUDED.uploaded_at,
          reviewed_by = EXCLUDED.reviewed_by,
          reviewed_at = EXCLUDED.reviewed_at,
          deleted_at = EXCLUDED.deleted_at,
          updated_at = EXCLUDED.updated_at
        RETURNING
          id,
          product_id,
          course_id,
          chapter_id,
          kind,
          title,
          file_name,
          mime_type,
          size_bytes,
          source_type,
          storage_key,
          object_key,
          content_hash,
          public_url,
          usage,
          alt_text,
          note,
          compliance_status,
          download_enabled,
          reference_count,
          uploaded_by,
          uploaded_at,
          reviewed_by,
          reviewed_at,
          deleted_at,
          updated_at
      `,
      [
        normalized.id,
        normalized.productId,
        courseId,
        normalized.chapterId ?? null,
        normalized.kind,
        normalized.title,
        normalized.fileName,
        normalized.mimeType,
        normalized.sizeBytes,
        normalized.sourceType,
        normalized.storageKey ?? null,
        objectKey,
        normalized.contentHash ?? null,
        normalized.publicUrl ?? null,
        normalized.usage ?? null,
        normalized.altText ?? null,
        normalized.note ?? null,
        normalized.complianceStatus,
        normalized.downloadEnabled,
        normalized.referenceCount,
        normalized.uploadedBy,
        normalized.uploadedAt,
        normalized.reviewedBy ?? null,
        normalized.reviewedAt ?? null,
        normalized.deletedAt ?? null,
        normalized.updatedAt,
      ]
    );

    const row = result.rows[0];
    if (!row) throw new Error("COURSE_PRODUCT_ASSET_NOT_FOUND");
    return courseProductAssetRowToDomain(row);
  }

  async listAssetReferences(assetId?: string) {
    const result = await this.db.query<CourseProductAssetReferenceRow>(
      `
        SELECT
          id,
          asset_id,
          product_id,
          course_id,
          chapter_id,
          reference_type,
          material_placeholder_id,
          material_placeholder_index,
          created_by,
          created_at,
          deleted_at
        FROM course_product_asset_references
        ${assetId ? "WHERE asset_id = $1" : ""}
        ORDER BY created_at DESC, id ASC
      `,
      assetId ? [assetId] : undefined
    );

    return result.rows.map(courseProductAssetReferenceRowToDomain);
  }

  async saveAssetReference(reference: CourseProductAssetReference) {
    const normalized = CourseProductAssetReferenceSchema.parse(reference);
    const result = await this.db.query<CourseProductAssetReferenceRow>(
      `
        INSERT INTO course_product_asset_references (
          id,
          asset_id,
          product_id,
          course_id,
          chapter_id,
          reference_type,
          material_placeholder_id,
          material_placeholder_index,
          created_by,
          created_at,
          deleted_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          asset_id = EXCLUDED.asset_id,
          product_id = EXCLUDED.product_id,
          course_id = EXCLUDED.course_id,
          chapter_id = EXCLUDED.chapter_id,
          reference_type = EXCLUDED.reference_type,
          material_placeholder_id = EXCLUDED.material_placeholder_id,
          material_placeholder_index = EXCLUDED.material_placeholder_index,
          deleted_at = EXCLUDED.deleted_at
        RETURNING
          id,
          asset_id,
          product_id,
          course_id,
          chapter_id,
          reference_type,
          material_placeholder_id,
          material_placeholder_index,
          created_by,
          created_at,
          deleted_at
      `,
      [
        normalized.id,
        normalized.assetId,
        normalized.productId,
        normalized.courseId,
        normalized.chapterId ?? null,
        normalized.referenceType,
        normalized.materialPlaceholderId ?? null,
        normalized.materialPlaceholderIndex ?? null,
        normalized.createdBy,
        normalized.createdAt,
        normalized.deletedAt ?? null,
      ]
    );

    const row = result.rows[0];
    if (!row) throw new Error("COURSE_PRODUCT_ASSET_REFERENCE_NOT_FOUND");
    return courseProductAssetReferenceRowToDomain(row);
  }

  async clear() {
    await this.db.query("DELETE FROM course_product_asset_references");
    await this.db.query("DELETE FROM course_product_assets");
    await this.db.query("DELETE FROM course_product_asset_objects");
  }

  private async resolveCourseId(productId: string) {
    const result = await this.db.query<CourseProductCourseIdRow>(
      `
        SELECT course_id
        FROM course_products
        WHERE id = $1
        LIMIT 1
      `,
      [productId]
    );
    const row = result.rows[0];
    if (!row) throw new Error("COURSE_PRODUCT_NOT_FOUND");
    return row.course_id;
  }
}
