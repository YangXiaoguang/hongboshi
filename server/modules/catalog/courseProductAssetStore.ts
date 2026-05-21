import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  COURSE_PRODUCT_ASSET_MAX_SIZE_BYTES,
  CourseProductAssetComplianceUpdateRequestSchema,
  CourseProductAssetFileUploadRequestSchema,
  CourseProductAssetListResultSchema,
  CourseProductAssetMutationResultSchema,
  CourseProductAssetSchema,
  CourseProductAssetUploadRequestSchema,
  CourseProductAuditEventSchema,
  type CourseProductAsset,
  type CourseProductAssetComplianceUpdateRequest,
  type CourseProductAssetFileUploadRequest,
  type CourseProductAssetListResult,
  type CourseProductAssetMutationResult,
  type CourseProductAssetReference,
  type CourseProductAssetUploadRequest,
  type CourseProductAuditEvent,
  type CourseProductListItem,
} from "../../../shared/domain";
import { getDatabaseUrl, getSharedPostgresPool } from "../../db/postgres";
import {
  getCourseProductStore,
  type CourseProductStore,
} from "./courseProductStore";
import {
  createCourseProductAssetObjectStorage,
  type CourseProductAssetObjectStorage,
} from "./courseProductAssetObjectStorage";
import { PostgresCourseProductAssetStore } from "./postgresCourseProductAssetStore";

const CourseProductAssetStoreFileSchema = z.object({
  version: z.literal(1),
  assets: z.array(CourseProductAssetSchema),
});

type CourseProductAssetStoreFile = z.infer<
  typeof CourseProductAssetStoreFileSchema
>;

export interface CourseProductAssetStore {
  listAssets(productId?: string): Promise<CourseProductAsset[]>;
  getAsset(assetId: string): Promise<CourseProductAsset | undefined>;
  saveAsset(asset: CourseProductAsset): Promise<CourseProductAsset>;
}

export interface CourseProductAssetReferenceStore {
  listAssetReferences(assetId?: string): Promise<CourseProductAssetReference[]>;
  saveAssetReference(
    reference: CourseProductAssetReference
  ): Promise<CourseProductAssetReference>;
}

export interface CourseProductAssetStoredFile {
  storageKey: string;
  bytes: Buffer;
}

export interface CourseProductAssetFileStorage {
  saveFile(input: CourseProductAssetStoredFile): Promise<void>;
  readFile(storageKey: string): Promise<Buffer | undefined>;
  deleteFile?(storageKey: string): Promise<void>;
}

export class InMemoryCourseProductAssetFileStorage implements CourseProductAssetFileStorage {
  private files = new Map<string, Buffer>();

  async saveFile(input: CourseProductAssetStoredFile) {
    this.files.set(input.storageKey, Buffer.from(input.bytes));
  }

  async readFile(storageKey: string) {
    const bytes = this.files.get(storageKey);
    return bytes ? Buffer.from(bytes) : undefined;
  }

  async deleteFile(storageKey: string) {
    this.files.delete(storageKey);
  }
}

export class LocalCourseProductAssetFileStorage implements CourseProductAssetFileStorage {
  constructor(
    private readonly rootPath = resolveCourseProductAssetFileRootPath()
  ) {}

  async saveFile(input: CourseProductAssetStoredFile) {
    const filePath = this.resolveStoragePath(input.storageKey);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, input.bytes);
    fs.renameSync(tmpPath, filePath);
  }

  async readFile(storageKey: string) {
    const filePath = this.resolveStoragePath(storageKey);
    if (!fs.existsSync(filePath)) return undefined;
    return fs.readFileSync(filePath);
  }

  async deleteFile(storageKey: string) {
    const filePath = this.resolveStoragePath(storageKey);
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath);
    }
  }

  private resolveStoragePath(storageKey: string) {
    const root = path.resolve(this.rootPath);
    const target = path.resolve(root, storageKey);
    const rootWithSeparator = root.endsWith(path.sep)
      ? root
      : `${root}${path.sep}`;
    if (target !== root && !target.startsWith(rootWithSeparator)) {
      throw new Error("COURSE_PRODUCT_ASSET_FILE_NOT_FOUND");
    }
    return target;
  }
}

export class InMemoryCourseProductAssetStore implements CourseProductAssetStore {
  private assets = new Map<string, CourseProductAsset>();

  constructor(assets: CourseProductAsset[] = []) {
    assets.forEach(asset => {
      const parsed = CourseProductAssetSchema.parse(asset);
      this.assets.set(parsed.id, cloneAsset(parsed));
    });
  }

  async listAssets(productId?: string) {
    return Array.from(this.assets.values())
      .filter(asset => !productId || asset.productId === productId)
      .map(cloneAsset)
      .sort(sortAssets);
  }

  async getAsset(assetId: string) {
    const asset = this.assets.get(assetId);
    return asset ? cloneAsset(asset) : undefined;
  }

  async saveAsset(asset: CourseProductAsset) {
    const parsed = CourseProductAssetSchema.parse(asset);
    this.assets.set(parsed.id, cloneAsset(parsed));
    return cloneAsset(parsed);
  }
}

export class JsonFileCourseProductAssetStore implements CourseProductAssetStore {
  constructor(
    private readonly filePath = resolveCourseProductAssetStorePath()
  ) {}

  async listAssets(productId?: string) {
    return this.readFile()
      .assets.filter(asset => !productId || asset.productId === productId)
      .map(cloneAsset)
      .sort(sortAssets);
  }

  async getAsset(assetId: string) {
    const asset = this.readFile().assets.find(item => item.id === assetId);
    return asset ? cloneAsset(asset) : undefined;
  }

  async saveAsset(asset: CourseProductAsset) {
    const parsed = CourseProductAssetSchema.parse(asset);
    const file = this.readFile();
    const existingIndex = file.assets.findIndex(item => item.id === parsed.id);
    if (existingIndex >= 0) {
      file.assets[existingIndex] = parsed;
    } else {
      file.assets.push(parsed);
    }
    this.writeFile(file);
    return cloneAsset(parsed);
  }

  clear() {
    this.writeFile(emptyCourseProductAssetStoreFile());
  }

  private readFile(): CourseProductAssetStoreFile {
    if (!fs.existsSync(this.filePath)) {
      return emptyCourseProductAssetStoreFile();
    }

    try {
      return normalizeCourseProductAssetStoreFile(
        JSON.parse(fs.readFileSync(this.filePath, "utf8"))
      );
    } catch {
      return emptyCourseProductAssetStoreFile();
    }
  }

  private writeFile(file: CourseProductAssetStoreFile) {
    const normalized = normalizeCourseProductAssetStoreFile(file);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(normalized, null, 2), "utf8");
    fs.renameSync(tmpPath, this.filePath);
  }
}

let defaultStore: CourseProductAssetStore | undefined;
let defaultFileStorage: CourseProductAssetFileStorage | undefined;

export function getCourseProductAssetStore() {
  defaultStore ??= createDefaultCourseProductAssetStore();
  return defaultStore;
}

export function setCourseProductAssetStore(store: CourseProductAssetStore) {
  defaultStore = store;
}

export function getCourseProductAssetFileStorage() {
  defaultFileStorage ??= createDefaultCourseProductAssetFileStorage();
  return defaultFileStorage;
}

export function setCourseProductAssetFileStorage(
  storage: CourseProductAssetFileStorage
) {
  defaultFileStorage = storage;
}

export function createDefaultCourseProductAssetStore(): CourseProductAssetStore {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST ||
    process.env.HONGBOSHI_COURSE_PRODUCT_ASSET_STORE === "memory"
  ) {
    return new InMemoryCourseProductAssetStore();
  }

  if (process.env.HONGBOSHI_COURSE_PRODUCT_ASSET_STORE === "postgres") {
    if (!getDatabaseUrl()) {
      throw new Error(
        "HONGBOSHI_COURSE_PRODUCT_ASSET_STORE=postgres requires DATABASE_URL"
      );
    }
    return new PostgresCourseProductAssetStore(getSharedPostgresPool());
  }

  return new JsonFileCourseProductAssetStore();
}

export function createDefaultCourseProductAssetFileStorage(): CourseProductAssetFileStorage {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST ||
    process.env.HONGBOSHI_COURSE_PRODUCT_ASSET_FILE_STORAGE === "memory"
  ) {
    return new InMemoryCourseProductAssetFileStorage();
  }

  return new LocalCourseProductAssetFileStorage();
}

export function resolveCourseProductAssetStorePath() {
  return path.resolve(
    process.cwd(),
    process.env.HONGBOSHI_COURSE_PRODUCT_ASSET_FILE ??
      ".hongboshi-data/course-product-assets.json"
  );
}

export function resolveCourseProductAssetFileRootPath() {
  return path.resolve(
    process.cwd(),
    process.env.HONGBOSHI_COURSE_PRODUCT_ASSET_FILE_ROOT ??
      ".hongboshi-data/course-product-assets/files"
  );
}

export async function listCourseProductAssets({
  productId,
  productStore = getCourseProductStore(),
  assetStore = getCourseProductAssetStore(),
}: {
  productId: string;
  productStore?: CourseProductStore;
  assetStore?: CourseProductAssetStore;
}): Promise<CourseProductAssetListResult> {
  const product = await productStore.getProduct(productId);
  if (!product) throw new Error("COURSE_PRODUCT_NOT_FOUND");
  return buildAssetListResult(
    productId,
    await assetStore.listAssets(productId)
  );
}

export async function uploadCourseProductAsset({
  productId,
  request,
  actorId,
  productStore = getCourseProductStore(),
  assetStore = getCourseProductAssetStore(),
  now = new Date().toISOString(),
}: {
  productId: string;
  request: CourseProductAssetUploadRequest;
  actorId: string;
  productStore?: CourseProductStore;
  assetStore?: CourseProductAssetStore;
  now?: string;
}): Promise<CourseProductAssetMutationResult> {
  const product = await productStore.getProduct(productId);
  if (!product) throw new Error("COURSE_PRODUCT_NOT_FOUND");

  const parsed = CourseProductAssetUploadRequestSchema.parse(request);
  const id = createAssetId(productId, parsed.kind, now);
  const asset = CourseProductAssetSchema.parse({
    id,
    productId,
    chapterId: parsed.chapterId,
    kind: parsed.kind,
    title: parsed.title,
    fileName: parsed.fileName ?? fileNameFromSource(parsed.sourceUrl, id),
    mimeType: parsed.mimeType ?? inferMimeType(parsed),
    sizeBytes: parsed.sizeBytes ?? estimateSizeBytes(parsed.sourceUrl),
    sourceType: parsed.sourceUrl.startsWith("data:")
      ? "inline_upload"
      : "external_url",
    storageKey: `course-assets/${productId}/${id}`,
    publicUrl: parsed.sourceUrl,
    usage: parsed.usage ?? defaultUsageForAssetKind(parsed.kind),
    altText: parsed.altText,
    note: parsed.note,
    complianceStatus: "pending",
    downloadEnabled: false,
    uploadedBy: actorId,
    uploadedAt: now,
    updatedAt: now,
  });

  const saved = await assetStore.saveAsset(asset);
  const auditEvent = await productStore.appendAuditEvent(
    createAssetAuditEvent({
      product,
      action: "asset_upload",
      actorId,
      reason: parsed.reason,
      before: {},
      after: pickAssetAuditFields(saved),
      now,
    })
  );

  return CourseProductAssetMutationResultSchema.parse({
    asset: saved,
    assets: await assetStore.listAssets(productId),
    auditEvent,
    auditEvents: await productStore.listAuditEvents(productId),
  });
}

export async function uploadCourseProductAssetFile({
  productId,
  request,
  actorId,
  productStore = getCourseProductStore(),
  assetStore = getCourseProductAssetStore(),
  fileStorage = getCourseProductAssetFileStorage(),
  objectStorage,
  now = new Date().toISOString(),
}: {
  productId: string;
  request: CourseProductAssetFileUploadRequest;
  actorId: string;
  productStore?: CourseProductStore;
  assetStore?: CourseProductAssetStore;
  fileStorage?: CourseProductAssetFileStorage;
  objectStorage?: CourseProductAssetObjectStorage;
  now?: string;
}): Promise<CourseProductAssetMutationResult> {
  const product = await productStore.getProduct(productId);
  if (!product) throw new Error("COURSE_PRODUCT_NOT_FOUND");

  const parsed = CourseProductAssetFileUploadRequestSchema.parse(request);
  const bytes = decodeAssetFileBase64(parsed.fileBase64);
  if (bytes.length > COURSE_PRODUCT_ASSET_MAX_SIZE_BYTES) {
    throw new Error("COURSE_PRODUCT_ASSET_FILE_TOO_LARGE");
  }
  if (parsed.sizeBytes !== undefined && parsed.sizeBytes !== bytes.length) {
    throw new Error("COURSE_PRODUCT_ASSET_SIZE_MISMATCH");
  }

  const id = createAssetId(productId, parsed.kind, now);
  const fileName = sanitizeFileName(parsed.fileName);
  const resolvedObjectStorage =
    objectStorage ??
    createCourseProductAssetObjectStorage({
      byteStorage: fileStorage,
    });
  const object = await resolvedObjectStorage.putObject({
    productId,
    assetId: id,
    fileName,
    mimeType: parsed.mimeType,
    bytes,
    createdBy: actorId,
    createdAt: now,
  });

  const asset = CourseProductAssetSchema.parse({
    id,
    productId,
    chapterId: parsed.chapterId,
    kind: parsed.kind,
    title: parsed.title,
    fileName,
    mimeType: parsed.mimeType,
    sizeBytes: bytes.length,
    sourceType: "object_storage",
    storageKey: object.objectKey,
    objectKey: object.objectKey,
    contentHash: object.contentHash,
    publicUrl: isImageKind(parsed.kind)
      ? `/api/courses/${product.courseId}/assets/${id}/view`
      : undefined,
    usage: parsed.usage ?? defaultUsageForAssetKind(parsed.kind),
    altText: parsed.altText,
    note: parsed.note,
    complianceStatus: "pending",
    downloadEnabled: false,
    uploadedBy: actorId,
    uploadedAt: now,
    updatedAt: now,
  });

  const saved = await assetStore.saveAsset(asset);
  const auditEvent = await productStore.appendAuditEvent(
    createAssetAuditEvent({
      product,
      action: "asset_upload",
      actorId,
      reason: parsed.reason,
      before: {},
      after: pickAssetAuditFields(saved),
      now,
    })
  );

  return CourseProductAssetMutationResultSchema.parse({
    asset: saved,
    assets: await assetStore.listAssets(productId),
    auditEvent,
    auditEvents: await productStore.listAuditEvents(productId),
  });
}

export async function updateCourseProductAssetCompliance({
  productId,
  assetId,
  request,
  actorId,
  productStore = getCourseProductStore(),
  assetStore = getCourseProductAssetStore(),
  now = new Date().toISOString(),
}: {
  productId: string;
  assetId: string;
  request: CourseProductAssetComplianceUpdateRequest;
  actorId: string;
  productStore?: CourseProductStore;
  assetStore?: CourseProductAssetStore;
  now?: string;
}): Promise<CourseProductAssetMutationResult> {
  const product = await productStore.getProduct(productId);
  if (!product) throw new Error("COURSE_PRODUCT_NOT_FOUND");

  const current = await assetStore.getAsset(assetId);
  if (!current || current.productId !== productId) {
    throw new Error("COURSE_PRODUCT_ASSET_NOT_FOUND");
  }

  const parsed = CourseProductAssetComplianceUpdateRequestSchema.parse(request);
  const next = CourseProductAssetSchema.parse({
    ...current,
    complianceStatus: parsed.complianceStatus,
    downloadEnabled:
      parsed.downloadEnabled ??
      (parsed.complianceStatus === "approved" && isDownloadableKind(current)),
    note: parsed.note ?? current.note,
    reviewedBy: actorId,
    reviewedAt: now,
    updatedAt: now,
  });

  const saved = await assetStore.saveAsset(next);
  const auditEvent = await productStore.appendAuditEvent(
    createAssetAuditEvent({
      product,
      action: "asset_review",
      actorId,
      reason: parsed.reason,
      before: pickAssetAuditFields(current),
      after: pickAssetAuditFields(saved),
      now,
    })
  );

  return CourseProductAssetMutationResultSchema.parse({
    asset: saved,
    assets: await assetStore.listAssets(productId),
    auditEvent,
    auditEvents: await productStore.listAuditEvents(productId),
  });
}

export async function getCourseProductAssetStoredFile({
  productId,
  assetId,
  assetStore = getCourseProductAssetStore(),
  fileStorage = getCourseProductAssetFileStorage(),
  objectStorage,
}: {
  productId: string;
  assetId: string;
  assetStore?: CourseProductAssetStore;
  fileStorage?: CourseProductAssetFileStorage;
  objectStorage?: CourseProductAssetObjectStorage;
}) {
  const asset = await assetStore.getAsset(assetId);
  if (!asset || asset.productId !== productId || asset.deletedAt) {
    throw new Error("COURSE_PRODUCT_ASSET_NOT_FOUND");
  }
  const objectKey = asset.objectKey ?? asset.storageKey;
  if (asset.sourceType !== "object_storage" || !objectKey) {
    throw new Error("COURSE_PRODUCT_ASSET_FILE_NOT_FOUND");
  }

  const resolvedObjectStorage =
    objectStorage ??
    createCourseProductAssetObjectStorage({
      byteStorage: fileStorage,
    });
  const object = await resolvedObjectStorage.readObject(objectKey);
  if (!object) throw new Error("COURSE_PRODUCT_ASSET_FILE_NOT_FOUND");
  const signedReadUrl = await resolvedObjectStorage.createSignedReadUrl({
    objectKey,
  });

  return {
    asset,
    signedReadUrl,
    file: {
      bytes: object.bytes,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      sizeBytes: object.bytes.length,
    },
  };
}

export async function getCourseProductAssetPublicViewFile(options: {
  productId: string;
  assetId: string;
  assetStore?: CourseProductAssetStore;
  fileStorage?: CourseProductAssetFileStorage;
  objectStorage?: CourseProductAssetObjectStorage;
}) {
  const result = await getCourseProductAssetStoredFile(options);
  if (!isImageKind(result.asset.kind)) {
    throw new Error("COURSE_PRODUCT_ASSET_FILE_NOT_FOUND");
  }
  if (!isApprovedForUse(result.asset)) {
    throw new Error("COURSE_PRODUCT_ASSET_NOT_APPROVED");
  }
  return result;
}

export async function getCourseProductAssetDownloadFile(options: {
  productId: string;
  assetId: string;
  assetStore?: CourseProductAssetStore;
  fileStorage?: CourseProductAssetFileStorage;
  objectStorage?: CourseProductAssetObjectStorage;
}) {
  const result = await getCourseProductAssetStoredFile(options);
  if (!isDownloadableKind(result.asset) || !result.asset.downloadEnabled) {
    throw new Error("COURSE_PRODUCT_ASSET_DOWNLOAD_DISABLED");
  }
  if (!isApprovedForUse(result.asset)) {
    throw new Error("COURSE_PRODUCT_ASSET_NOT_APPROVED");
  }
  return result;
}

function buildAssetListResult(
  productId: string,
  assets: CourseProductAsset[]
): CourseProductAssetListResult {
  return CourseProductAssetListResultSchema.parse({
    productId,
    items: assets,
    summary: {
      totalCount: assets.length,
      pendingCount: assets.filter(asset => asset.complianceStatus === "pending")
        .length,
      approvedCount: assets.filter(
        asset => asset.complianceStatus === "approved"
      ).length,
      rejectedCount: assets.filter(
        asset => asset.complianceStatus === "rejected"
      ).length,
    },
  });
}

function createAssetAuditEvent({
  product,
  action,
  actorId,
  reason,
  before,
  after,
  now,
}: {
  product: CourseProductListItem;
  action: CourseProductAuditEvent["action"];
  actorId: string;
  reason: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  now: string;
}) {
  return CourseProductAuditEventSchema.parse({
    id: `audit_${action}_${product.id}_${safeTimeId(now)}`,
    productId: product.id,
    productTitle: product.title,
    actorId,
    action,
    reason,
    before,
    after,
    createdAt: now,
  });
}

function pickAssetAuditFields(asset: CourseProductAsset) {
  return {
    id: asset.id,
    title: asset.title,
    kind: asset.kind,
    usage: asset.usage,
    complianceStatus: asset.complianceStatus,
    downloadEnabled: asset.downloadEnabled,
    publicUrl: asset.publicUrl,
  };
}

function defaultUsageForAssetKind(
  kind: CourseProductAssetUploadRequest["kind"]
) {
  if (kind === "detail_image") return "showcase";
  if (kind === "proof_image") return "proof";
  return undefined;
}

function isImageKind(kind: CourseProductAsset["kind"]) {
  return kind === "detail_image" || kind === "proof_image";
}

function isApprovedForUse(asset: CourseProductAsset) {
  return (
    asset.complianceStatus === "approved" ||
    asset.complianceStatus === "not_required"
  );
}

function isDownloadableKind(asset: CourseProductAsset) {
  return ["chapter_material", "worksheet", "audio", "video"].includes(
    asset.kind
  );
}

function decodeAssetFileBase64(value: string) {
  const payload = value.includes(",") ? (value.split(",", 2)[1] ?? "") : value;
  try {
    return Buffer.from(payload, "base64");
  } catch {
    throw new Error("COURSE_PRODUCT_ASSET_FILE_INVALID");
  }
}

function sanitizeFileName(value: string) {
  const sanitized = value
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 140);
  return sanitized || "course-asset.bin";
}

function fileNameFromSource(sourceUrl: string, fallbackId: string) {
  if (sourceUrl.startsWith("data:")) return `${fallbackId}.upload`;

  try {
    const url = new URL(sourceUrl);
    const name = decodeURIComponent(url.pathname.split("/").pop() ?? "");
    return name.trim() || `${fallbackId}.asset`;
  } catch {
    return `${fallbackId}.asset`;
  }
}

function inferMimeType(request: CourseProductAssetUploadRequest) {
  if (request.sourceUrl.startsWith("data:")) {
    const match = request.sourceUrl.match(/^data:([^;,]+)[;,]/);
    if (match?.[1]) return match[1];
  }

  if (request.kind === "detail_image" || request.kind === "proof_image") {
    return "image/jpeg";
  }
  if (request.kind === "audio") return "audio/mpeg";
  if (request.kind === "video") return "video/mp4";
  return "application/pdf";
}

function estimateSizeBytes(sourceUrl: string) {
  if (!sourceUrl.startsWith("data:")) return 0;
  const encoded = sourceUrl.split(",", 2)[1] ?? "";
  return Math.floor((encoded.length * 3) / 4);
}

function createAssetId(productId: string, kind: string, now: string) {
  return `asset_${productId}_${kind}_${safeTimeId(now)}_${randomUUID().slice(0, 8)}`;
}

function safeTimeId(value: string) {
  return value.replace(/[^0-9A-Za-z]/g, "").slice(0, 24);
}

function sortAssets(left: CourseProductAsset, right: CourseProductAsset) {
  return right.updatedAt.localeCompare(left.updatedAt);
}

function emptyCourseProductAssetStoreFile(): CourseProductAssetStoreFile {
  return {
    version: 1,
    assets: [],
  };
}

function normalizeCourseProductAssetStoreFile(
  value: unknown
): CourseProductAssetStoreFile {
  const parsed = CourseProductAssetStoreFileSchema.safeParse(value);
  return parsed.success ? parsed.data : emptyCourseProductAssetStoreFile();
}

function cloneAsset(asset: CourseProductAsset) {
  return CourseProductAssetSchema.parse(JSON.parse(JSON.stringify(asset)));
}
