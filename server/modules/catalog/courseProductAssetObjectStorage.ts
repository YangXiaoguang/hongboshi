import { createHash } from "crypto";
import {
  CourseProductAssetObjectDeleteResultSchema,
  CourseProductAssetObjectDescriptorSchema,
  CourseProductAssetSignedReadUrlSchema,
  type CourseProductAssetObjectDeleteResult,
  type CourseProductAssetObjectDescriptor,
  type CourseProductAssetSignedReadUrl,
  type CourseProductAssetStorageProvider,
} from "../../../shared/domain";

export const COURSE_PRODUCT_ASSET_SIGNED_READ_URL_TTL_SECONDS = 10 * 60;

export interface CourseProductAssetObjectPutInput {
  productId: string;
  assetId: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
  createdBy: string;
  createdAt?: string;
}

export interface CourseProductAssetObjectReadResult {
  objectKey: string;
  bytes: Buffer;
}

export interface CourseProductAssetObjectStorage {
  putObject(
    input: CourseProductAssetObjectPutInput
  ): Promise<CourseProductAssetObjectDescriptor>;
  readObject(
    objectKey: string
  ): Promise<CourseProductAssetObjectReadResult | undefined>;
  createSignedReadUrl(input: {
    objectKey: string;
    now?: string;
    expiresInSeconds?: number;
  }): Promise<CourseProductAssetSignedReadUrl>;
  deleteObject(input: {
    objectKey: string;
    deletedBy: string;
    deletedAt?: string;
    mode?: "soft_delete" | "physical_delete";
  }): Promise<CourseProductAssetObjectDeleteResult>;
}

export interface CourseProductAssetObjectByteStorage {
  saveFile(input: { storageKey: string; bytes: Buffer }): Promise<void>;
  readFile(storageKey: string): Promise<Buffer | undefined>;
  deleteFile?(storageKey: string): Promise<void>;
}

export class LocalCourseProductAssetObjectStorage implements CourseProductAssetObjectStorage {
  constructor(
    private readonly byteStorage: CourseProductAssetObjectByteStorage,
    private readonly options: {
      provider?: CourseProductAssetStorageProvider;
      bucket?: string;
      region?: string;
    } = {}
  ) {}

  async putObject(input: CourseProductAssetObjectPutInput) {
    const contentHash = calculateCourseProductAssetContentHash(input.bytes);
    const objectKey = buildCourseProductAssetObjectKey({
      productId: input.productId,
      assetId: input.assetId,
      fileName: input.fileName,
      contentHash,
    });

    await this.byteStorage.saveFile({
      storageKey: objectKey,
      bytes: input.bytes,
    });

    return CourseProductAssetObjectDescriptorSchema.parse({
      objectKey,
      provider: this.options.provider ?? "local",
      bucket: this.options.bucket,
      region: this.options.region,
      mimeType: input.mimeType,
      sizeBytes: input.bytes.length,
      contentHash,
      originalFileName: input.fileName,
      createdBy: input.createdBy,
      createdAt: input.createdAt ?? new Date().toISOString(),
    });
  }

  async readObject(objectKey: string) {
    const bytes = await this.byteStorage.readFile(objectKey);
    return bytes
      ? {
          objectKey,
          bytes,
        }
      : undefined;
  }

  async createSignedReadUrl({
    objectKey,
    now = new Date().toISOString(),
    expiresInSeconds = COURSE_PRODUCT_ASSET_SIGNED_READ_URL_TTL_SECONDS,
  }: {
    objectKey: string;
    now?: string;
    expiresInSeconds?: number;
  }) {
    const expiresAt = new Date(
      new Date(now).getTime() + Math.max(1, expiresInSeconds) * 1000
    ).toISOString();
    const signature = createHash("sha256")
      .update(`${objectKey}:${expiresAt}:local-dev`)
      .digest("hex")
      .slice(0, 32);

    return CourseProductAssetSignedReadUrlSchema.parse({
      objectKey,
      url: `/api/course-assets/local-signed/${encodeURIComponent(
        objectKey
      )}?expiresAt=${encodeURIComponent(expiresAt)}&signature=${signature}`,
      expiresAt,
      headers: {
        "Cache-Control": "private, max-age=0",
      },
    });
  }

  async deleteObject({
    objectKey,
    deletedBy,
    deletedAt = new Date().toISOString(),
    mode = "soft_delete",
  }: {
    objectKey: string;
    deletedBy: string;
    deletedAt?: string;
    mode?: "soft_delete" | "physical_delete";
  }) {
    if (mode === "physical_delete" && this.byteStorage.deleteFile) {
      await this.byteStorage.deleteFile(objectKey);
    }

    return CourseProductAssetObjectDeleteResultSchema.parse({
      objectKey,
      deletedBy,
      deletedAt,
      mode,
    });
  }
}

export function calculateCourseProductAssetContentHash(bytes: Buffer) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function buildCourseProductAssetObjectKey({
  productId,
  assetId,
  fileName,
  contentHash,
}: {
  productId: string;
  assetId: string;
  fileName: string;
  contentHash: string;
}) {
  const hashPrefix = contentHash.replace(/^sha256:/, "").slice(0, 12);
  return [
    "course-assets",
    sanitizeObjectKeySegment(productId),
    sanitizeObjectKeySegment(assetId),
    `${hashPrefix}-${sanitizeObjectFileName(fileName)}`,
  ].join("/");
}

function sanitizeObjectKeySegment(value: string) {
  return value
    .trim()
    .replace(/[^0-9A-Za-z_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 96);
}

function sanitizeObjectFileName(value: string) {
  const sanitized = value
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 140);
  return sanitized || "course-asset.bin";
}
