import { describe, expect, it } from "vitest";
import { courses } from "../../../shared/data/mockCourses";
import type {
  DatabaseQueryExecutor,
  DatabaseQueryResult,
} from "../../db/postgres";
import { courseProductFromCourse } from "./courseProductStore";
import { PostgresCourseProductAssetStore } from "./postgresCourseProductAssetStore";

type CapturedQuery = {
  text: string;
  values?: readonly unknown[];
};

class FakeCourseProductAssetExecutor implements DatabaseQueryExecutor {
  readonly queries: CapturedQuery[] = [];
  assets: unknown[] = [];
  objects: unknown[] = [];
  references: unknown[] = [];
  courseIds = new Map<string, number>();

  constructor(productId: string, courseId: number) {
    this.courseIds.set(productId, courseId);
  }

  async query<Row>(
    text: string,
    values?: readonly unknown[]
  ): Promise<DatabaseQueryResult<Row>> {
    this.queries.push({ text, values });

    if (text.includes("SELECT course_id")) {
      const courseId = this.courseIds.get(String(values?.[0]));
      return {
        rows:
          courseId === undefined ? [] : ([{ course_id: courseId }] as Row[]),
        rowCount: courseId === undefined ? 0 : 1,
      };
    }

    if (text.includes("INSERT INTO course_product_asset_objects")) {
      const row = {
        object_key: values?.[0],
        provider: "local",
        mime_type: values?.[1],
        size_bytes: values?.[2],
        content_hash: values?.[3],
        original_file_name: values?.[4],
        reference_count: values?.[5],
        created_by: values?.[6],
        created_at: values?.[7],
        deleted_at: values?.[8],
      };
      this.objects = [
        ...this.objects.filter(
          item => (item as { object_key: string }).object_key !== row.object_key
        ),
        row,
      ];
      return { rows: [] as Row[], rowCount: 1 };
    }

    if (text.includes("INSERT INTO course_product_assets")) {
      const row = {
        id: values?.[0],
        product_id: values?.[1],
        course_id: values?.[2],
        chapter_id: values?.[3],
        kind: values?.[4],
        title: values?.[5],
        file_name: values?.[6],
        mime_type: values?.[7],
        size_bytes: values?.[8],
        source_type: values?.[9],
        storage_key: values?.[10],
        object_key: values?.[11],
        content_hash: values?.[12],
        public_url: values?.[13],
        usage: values?.[14],
        alt_text: values?.[15],
        note: values?.[16],
        compliance_status: values?.[17],
        download_enabled: values?.[18],
        reference_count: values?.[19],
        uploaded_by: values?.[20],
        uploaded_at: values?.[21],
        reviewed_by: values?.[22],
        reviewed_at: values?.[23],
        deleted_at: values?.[24],
        updated_at: values?.[25],
      };
      this.assets = [
        ...this.assets.filter(item => (item as { id: string }).id !== row.id),
        row,
      ];
      return { rows: [row as Row], rowCount: 1 };
    }

    if (text.includes("INSERT INTO course_product_asset_references")) {
      const row = {
        id: values?.[0],
        asset_id: values?.[1],
        product_id: values?.[2],
        course_id: values?.[3],
        chapter_id: values?.[4],
        reference_type: values?.[5],
        material_placeholder_id: values?.[6],
        material_placeholder_index: values?.[7],
        created_by: values?.[8],
        created_at: values?.[9],
        deleted_at: values?.[10],
      };
      this.references = [
        ...this.references.filter(
          item => (item as { id: string }).id !== row.id
        ),
        row,
      ];
      return { rows: [row as Row], rowCount: 1 };
    }

    if (text.trim() === "DELETE FROM course_product_asset_references") {
      this.references = [];
      return { rows: [] as Row[], rowCount: 0 };
    }

    if (text.trim() === "DELETE FROM course_product_assets") {
      this.assets = [];
      return { rows: [] as Row[], rowCount: 0 };
    }

    if (text.trim() === "DELETE FROM course_product_asset_objects") {
      this.objects = [];
      return { rows: [] as Row[], rowCount: 0 };
    }

    if (
      text.includes("FROM course_product_assets") &&
      text.includes("WHERE id = $1")
    ) {
      const rows = this.assets.filter(
        item => (item as { id: string }).id === values?.[0]
      );
      return { rows: rows as Row[], rowCount: rows.length };
    }

    if (
      text.includes("FROM course_product_assets") &&
      text.includes("WHERE product_id = $1")
    ) {
      const rows = this.assets.filter(
        item => (item as { product_id: string }).product_id === values?.[0]
      );
      return { rows: rows as Row[], rowCount: rows.length };
    }

    if (text.includes("FROM course_product_assets")) {
      return { rows: this.assets as Row[], rowCount: this.assets.length };
    }

    if (
      text.includes("FROM course_product_asset_references") &&
      text.includes("WHERE asset_id = $1")
    ) {
      const rows = this.references.filter(
        item => (item as { asset_id: string }).asset_id === values?.[0]
      );
      return { rows: rows as Row[], rowCount: rows.length };
    }

    if (text.includes("FROM course_product_asset_references")) {
      return {
        rows: this.references as Row[],
        rowCount: this.references.length,
      };
    }

    return { rows: [] as Row[], rowCount: 0 };
  }
}

describe("postgres course product asset store", () => {
  it("saves object storage assets with object metadata", async () => {
    const product = courseProductFromCourse(courses[0]);
    const db = new FakeCourseProductAssetExecutor(product.id, product.courseId);
    const store = new PostgresCourseProductAssetStore(db);

    const saved = await store.saveAsset({
      id: "asset_course_product_1_worksheet_1",
      productId: product.id,
      chapterId: "chapter_1",
      kind: "worksheet",
      title: "课后练习表",
      fileName: "worksheet.pdf",
      mimeType: "application/pdf",
      sizeBytes: 16,
      sourceType: "object_storage",
      storageKey:
        "course-assets/course_product_1/asset_course_product_1_worksheet_1/hash-worksheet.pdf",
      objectKey:
        "course-assets/course_product_1/asset_course_product_1_worksheet_1/hash-worksheet.pdf",
      contentHash:
        "sha256:9b6f0c37f2ad11858dd6ca056f3027e1dc856d08e88cef7a0381c3a4ac00d0d1",
      complianceStatus: "approved",
      downloadEnabled: true,
      referenceCount: 1,
      uploadedBy: "operator_1",
      uploadedAt: "2026-05-20T09:00:00.000Z",
      reviewedBy: "operator_2",
      reviewedAt: "2026-05-20T10:00:00.000Z",
      updatedAt: "2026-05-20T10:00:00.000Z",
    });

    expect(saved).toMatchObject({
      productId: product.id,
      chapterId: "chapter_1",
      sourceType: "object_storage",
      objectKey:
        "course-assets/course_product_1/asset_course_product_1_worksheet_1/hash-worksheet.pdf",
      contentHash:
        "sha256:9b6f0c37f2ad11858dd6ca056f3027e1dc856d08e88cef7a0381c3a4ac00d0d1",
      referenceCount: 1,
    });
    expect(db.objects).toHaveLength(1);
    expect(
      db.queries.some(query => query.text.includes("SELECT course_id"))
    ).toBe(true);
    expect(
      db.queries.some(query =>
        query.text.includes("INSERT INTO course_product_asset_objects")
      )
    ).toBe(true);
  });

  it("loads assets and does not force external urls into object rows", async () => {
    const product = courseProductFromCourse(courses[0]);
    const db = new FakeCourseProductAssetExecutor(product.id, product.courseId);
    const store = new PostgresCourseProductAssetStore(db);

    await store.saveAsset({
      id: "asset_course_product_1_detail_image_1",
      productId: product.id,
      kind: "detail_image",
      title: "课程详情主视觉",
      fileName: "detail.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 188000,
      sourceType: "external_url",
      storageKey: "course-assets/course_product_1/detail",
      publicUrl: "https://cdn.example.com/course/detail.jpg",
      usage: "showcase",
      complianceStatus: "approved",
      downloadEnabled: false,
      uploadedBy: "operator_1",
      uploadedAt: "2026-05-20T09:00:00.000Z",
      updatedAt: "2026-05-20T09:00:00.000Z",
    });

    const assets = await store.listAssets(product.id);
    const asset = await store.getAsset("asset_course_product_1_detail_image_1");

    expect(assets).toHaveLength(1);
    expect(asset).toMatchObject({
      sourceType: "external_url",
      publicUrl: "https://cdn.example.com/course/detail.jpg",
      objectKey: undefined,
    });
    expect(db.objects).toHaveLength(0);
  });

  it("clears asset tables in dependency order", async () => {
    const product = courseProductFromCourse(courses[0]);
    const db = new FakeCourseProductAssetExecutor(product.id, product.courseId);
    const store = new PostgresCourseProductAssetStore(db);

    await store.clear();

    expect(db.queries.map(query => query.text.trim())).toEqual([
      "DELETE FROM course_product_asset_references",
      "DELETE FROM course_product_assets",
      "DELETE FROM course_product_asset_objects",
    ]);
  });

  it("upserts and lists asset references", async () => {
    const product = courseProductFromCourse(courses[0]);
    const db = new FakeCourseProductAssetExecutor(product.id, product.courseId);
    const store = new PostgresCourseProductAssetStore(db);

    await store.saveAsset({
      id: "asset_course_product_1_worksheet_1",
      productId: product.id,
      chapterId: "chapter_1",
      kind: "worksheet",
      title: "课后练习表",
      fileName: "worksheet.pdf",
      mimeType: "application/pdf",
      sizeBytes: 16,
      sourceType: "object_storage",
      storageKey:
        "course-assets/course_product_1/asset_course_product_1_worksheet_1/hash-worksheet.pdf",
      objectKey:
        "course-assets/course_product_1/asset_course_product_1_worksheet_1/hash-worksheet.pdf",
      contentHash:
        "sha256:9b6f0c37f2ad11858dd6ca056f3027e1dc856d08e88cef7a0381c3a4ac00d0d1",
      complianceStatus: "approved",
      downloadEnabled: true,
      referenceCount: 1,
      uploadedBy: "operator_1",
      uploadedAt: "2026-05-20T09:00:00.000Z",
      updatedAt: "2026-05-20T10:00:00.000Z",
    });

    const savedReference = await store.saveAssetReference({
      id: "asset_ref_course_product_1_chapter_1_material_1_asset_course_product_1_worksheet_1",
      assetId: "asset_course_product_1_worksheet_1",
      productId: product.id,
      courseId: product.courseId,
      chapterId: "chapter_1",
      referenceType: "chapter_exercise",
      materialPlaceholderId: "material_1",
      materialPlaceholderIndex: 0,
      createdBy: "operator_1",
      createdAt: "2026-05-20T11:00:00.000Z",
    });
    const references = await store.listAssetReferences(
      "asset_course_product_1_worksheet_1"
    );

    expect(savedReference).toMatchObject({
      assetId: "asset_course_product_1_worksheet_1",
      productId: product.id,
      referenceType: "chapter_exercise",
      materialPlaceholderId: "material_1",
    });
    expect(references).toHaveLength(1);
    expect(
      db.queries.some(query =>
        query.text.includes("INSERT INTO course_product_asset_references")
      )
    ).toBe(true);
  });
});
