import { createHash, createHmac } from "crypto";
import {
  CourseProductAssetStorageProviderSchema,
  CourseProductAssetObjectDeleteResultSchema,
  CourseProductAssetObjectDescriptorSchema,
  CourseProductAssetSignedReadUrlSchema,
  type CourseProductAssetObjectDeleteResult,
  type CourseProductAssetObjectDescriptor,
  type CourseProductAssetSignedReadUrl,
  type CourseProductAssetStorageProvider,
} from "../../../shared/domain";

export const COURSE_PRODUCT_ASSET_SIGNED_READ_URL_TTL_SECONDS = 10 * 60;
const COURSE_PRODUCT_ASSET_OBJECT_SIGNING_SECRET_FALLBACK = "local-dev";

export type CourseProductAssetObjectStorageConfig = {
  provider: CourseProductAssetStorageProvider;
  bucket?: string;
  region?: string;
  publicBaseUrl?: string;
  signingSecret: string;
  defaultSignedReadUrlTtlSeconds: number;
  issues: string[];
};

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
      publicBaseUrl?: string;
      signingSecret?: string;
      defaultSignedReadUrlTtlSeconds?: number;
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
    expiresInSeconds = this.options.defaultSignedReadUrlTtlSeconds ??
      COURSE_PRODUCT_ASSET_SIGNED_READ_URL_TTL_SECONDS,
  }: {
    objectKey: string;
    now?: string;
    expiresInSeconds?: number;
  }) {
    const expiresAt = new Date(
      new Date(now).getTime() + Math.max(1, expiresInSeconds) * 1000
    ).toISOString();
    const signature = signCourseProductAssetObjectReadUrl({
      objectKey,
      expiresAt,
      provider: this.options.provider ?? "local",
      secret:
        this.options.signingSecret ??
        COURSE_PRODUCT_ASSET_OBJECT_SIGNING_SECRET_FALLBACK,
    });
    const url = this.options.publicBaseUrl
      ? buildRemoteSignedReadUrl({
          baseUrl: this.options.publicBaseUrl,
          objectKey,
          expiresAt,
          signature,
          provider: this.options.provider ?? "local",
        })
      : buildLocalSignedReadUrl({
          objectKey,
          expiresAt,
          signature,
        });

    return CourseProductAssetSignedReadUrlSchema.parse({
      objectKey,
      url,
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

export function resolveCourseProductAssetObjectStorageConfig(
  env: NodeJS.ProcessEnv = process.env
): CourseProductAssetObjectStorageConfig {
  const parsedProvider = CourseProductAssetStorageProviderSchema.safeParse(
    normalizeEnvValue(env.HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_PROVIDER) ??
      "local"
  );
  const provider = parsedProvider.success ? parsedProvider.data : "local";
  const rawTtl = normalizeEnvValue(
    env.HONGBOSHI_COURSE_PRODUCT_ASSET_SIGNED_URL_TTL_SECONDS
  );
  const ttl = rawTtl ? Number(rawTtl) : undefined;
  const config = {
    provider,
    bucket: normalizeEnvValue(
      env.HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_BUCKET
    ),
    region: normalizeEnvValue(
      env.HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_REGION
    ),
    publicBaseUrl: normalizeEnvValue(
      env.HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_PUBLIC_BASE_URL
    ),
    signingSecret:
      normalizeEnvValue(
        env.HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_SIGNING_SECRET
      ) ?? COURSE_PRODUCT_ASSET_OBJECT_SIGNING_SECRET_FALLBACK,
    defaultSignedReadUrlTtlSeconds:
      ttl && Number.isFinite(ttl)
        ? Math.max(1, Math.floor(ttl))
        : COURSE_PRODUCT_ASSET_SIGNED_READ_URL_TTL_SECONDS,
    issues: [] as string[],
  };

  if (!parsedProvider.success) {
    config.issues.push(
      "HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_PROVIDER 仅支持 local/s3/oss/cos"
    );
  }

  if (rawTtl && (!ttl || !Number.isFinite(ttl) || ttl <= 0)) {
    config.issues.push(
      "HONGBOSHI_COURSE_PRODUCT_ASSET_SIGNED_URL_TTL_SECONDS 必须是正整数秒"
    );
  }

  if (config.provider !== "local") {
    if (!config.publicBaseUrl) {
      config.issues.push(
        "远端课程素材对象存储需要配置 HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_PUBLIC_BASE_URL"
      );
    }
    if (!config.bucket) {
      config.issues.push(
        "远端课程素材对象存储需要配置 HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_BUCKET"
      );
    }
    if (!config.region) {
      config.issues.push(
        "远端课程素材对象存储需要配置 HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_REGION"
      );
    }
    if (
      config.signingSecret ===
      COURSE_PRODUCT_ASSET_OBJECT_SIGNING_SECRET_FALLBACK
    ) {
      config.issues.push(
        "远端课程素材对象存储需要配置 HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_SIGNING_SECRET"
      );
    }
  }

  return config;
}

export function createCourseProductAssetObjectStorage({
  byteStorage,
  env = process.env,
}: {
  byteStorage: CourseProductAssetObjectByteStorage;
  env?: NodeJS.ProcessEnv;
}) {
  const config = resolveCourseProductAssetObjectStorageConfig(env);
  if (config.issues.length > 0) {
    throw new Error(
      [
        "COURSE_PRODUCT_ASSET_OBJECT_STORAGE_CONFIG_INVALID",
        ...config.issues,
      ].join("\n")
    );
  }

  return new LocalCourseProductAssetObjectStorage(byteStorage, {
    provider: config.provider,
    bucket: config.bucket,
    region: config.region,
    publicBaseUrl: config.publicBaseUrl,
    signingSecret: config.signingSecret,
    defaultSignedReadUrlTtlSeconds: config.defaultSignedReadUrlTtlSeconds,
  });
}

export function calculateCourseProductAssetContentHash(bytes: Buffer) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function signCourseProductAssetObjectReadUrl({
  objectKey,
  expiresAt,
  provider,
  secret,
}: {
  objectKey: string;
  expiresAt: string;
  provider: CourseProductAssetStorageProvider;
  secret: string;
}) {
  return createHmac("sha256", secret)
    .update(`${provider}:${objectKey}:${expiresAt}`)
    .digest("hex")
    .slice(0, 40);
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

function normalizeEnvValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function buildLocalSignedReadUrl({
  objectKey,
  expiresAt,
  signature,
}: {
  objectKey: string;
  expiresAt: string;
  signature: string;
}) {
  return `/api/course-assets/local-signed/${encodeURIComponent(
    objectKey
  )}?expiresAt=${encodeURIComponent(expiresAt)}&signature=${signature}`;
}

function buildRemoteSignedReadUrl({
  baseUrl,
  objectKey,
  expiresAt,
  signature,
  provider,
}: {
  baseUrl: string;
  objectKey: string;
  expiresAt: string;
  signature: string;
  provider: CourseProductAssetStorageProvider;
}) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const encodedObjectPath = objectKey
    .split("/")
    .map(segment => encodeURIComponent(segment))
    .join("/");
  return `${normalizedBaseUrl}/${encodedObjectPath}?expiresAt=${encodeURIComponent(
    expiresAt
  )}&signature=${signature}&provider=${provider}`;
}
