import { describe, expect, it } from "vitest";
import { InMemoryCourseProductAssetFileStorage } from "./courseProductAssetStore";
import {
  LocalCourseProductAssetObjectStorage,
  buildCourseProductAssetObjectKey,
  calculateCourseProductAssetContentHash,
  createCourseProductAssetObjectStorage,
  resolveCourseProductAssetObjectStorageConfig,
} from "./courseProductAssetObjectStorage";

describe("course product asset object storage", () => {
  it("builds stable object keys with content hashes", () => {
    const contentHash = calculateCourseProductAssetContentHash(
      Buffer.from("course material")
    );

    expect(contentHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(
      buildCourseProductAssetObjectKey({
        productId: "course_product_1",
        assetId: "asset_course_product_1_worksheet",
        fileName: "../课后 练习.pdf",
        contentHash,
      })
    ).toMatch(
      /^course-assets\/course_product_1\/asset_course_product_1_worksheet\/[a-f0-9]{12}-/
    );
  });

  it("stores local objects and creates short-lived signed read urls", async () => {
    const byteStorage = new InMemoryCourseProductAssetFileStorage();
    const objectStorage = new LocalCourseProductAssetObjectStorage(byteStorage);

    const descriptor = await objectStorage.putObject({
      productId: "course_product_1",
      assetId: "asset_course_product_1_worksheet",
      fileName: "worksheet.pdf",
      mimeType: "application/pdf",
      bytes: Buffer.from("course worksheet"),
      createdBy: "operator_1",
      createdAt: "2026-05-20T09:00:00.000Z",
    });

    expect(descriptor).toMatchObject({
      provider: "local",
      mimeType: "application/pdf",
      sizeBytes: 16,
      originalFileName: "worksheet.pdf",
      createdBy: "operator_1",
    });

    const stored = await objectStorage.readObject(descriptor.objectKey);
    expect(stored?.bytes.toString("utf8")).toBe("course worksheet");

    const signed = await objectStorage.createSignedReadUrl({
      objectKey: descriptor.objectKey,
      now: "2026-05-20T09:00:00.000Z",
      expiresInSeconds: 120,
    });
    expect(signed.url).toContain(encodeURIComponent(descriptor.objectKey));
    expect(signed.expiresAt).toBe("2026-05-20T09:02:00.000Z");

    const deleted = await objectStorage.deleteObject({
      objectKey: descriptor.objectKey,
      deletedBy: "operator_2",
      deletedAt: "2026-05-20T10:00:00.000Z",
      mode: "physical_delete",
    });
    expect(deleted.mode).toBe("physical_delete");
    await expect(
      objectStorage.readObject(descriptor.objectKey)
    ).resolves.toBeUndefined();
  });

  it("resolves remote provider configuration for signed read urls", async () => {
    const config = resolveCourseProductAssetObjectStorageConfig({
      HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_PROVIDER: "oss",
      HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_BUCKET: "hongboshi-course-assets",
      HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_REGION: "cn-shanghai",
      HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_PUBLIC_BASE_URL:
        "https://assets.example.com/private",
      HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_SIGNING_SECRET: "test-secret",
      HONGBOSHI_COURSE_PRODUCT_ASSET_SIGNED_URL_TTL_SECONDS: "90",
    });
    expect(config.issues).toEqual([]);
    expect(config.provider).toBe("oss");
    expect(config.defaultSignedReadUrlTtlSeconds).toBe(90);

    const objectStorage = createCourseProductAssetObjectStorage({
      byteStorage: new InMemoryCourseProductAssetFileStorage(),
      env: {
        HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_PROVIDER: "oss",
        HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_BUCKET:
          "hongboshi-course-assets",
        HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_REGION: "cn-shanghai",
        HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_PUBLIC_BASE_URL:
          "https://assets.example.com/private",
        HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_SIGNING_SECRET: "test-secret",
        HONGBOSHI_COURSE_PRODUCT_ASSET_SIGNED_URL_TTL_SECONDS: "90",
      },
    });

    const descriptor = await objectStorage.putObject({
      productId: "course_product_1",
      assetId: "asset_course_product_1_worksheet",
      fileName: "worksheet.pdf",
      mimeType: "application/pdf",
      bytes: Buffer.from("course worksheet"),
      createdBy: "operator_1",
      createdAt: "2026-05-20T09:00:00.000Z",
    });
    const signed = await objectStorage.createSignedReadUrl({
      objectKey: descriptor.objectKey,
      now: "2026-05-20T09:00:00.000Z",
    });

    expect(descriptor).toMatchObject({
      provider: "oss",
      bucket: "hongboshi-course-assets",
      region: "cn-shanghai",
    });
    expect(signed.url).toMatch(
      /^https:\/\/assets\.example\.com\/private\/course-assets\/course_product_1\//
    );
    expect(signed.url).toContain("provider=oss");
    expect(signed.expiresAt).toBe("2026-05-20T09:01:30.000Z");
  });

  it("reports missing remote provider settings before creating storage", () => {
    const config = resolveCourseProductAssetObjectStorageConfig({
      HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_PROVIDER: "s3",
    });

    expect(config.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("PUBLIC_BASE_URL"),
        expect.stringContaining("OBJECT_BUCKET"),
        expect.stringContaining("OBJECT_REGION"),
        expect.stringContaining("SIGNING_SECRET"),
      ])
    );
    expect(() =>
      createCourseProductAssetObjectStorage({
        byteStorage: new InMemoryCourseProductAssetFileStorage(),
        env: {
          HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_PROVIDER: "s3",
        },
      })
    ).toThrow("COURSE_PRODUCT_ASSET_OBJECT_STORAGE_CONFIG_INVALID");
  });
});
