import { z } from "zod";
import {
  DateTimeLikeSchema,
  EntityIdSchema,
  LegacyNumericIdSchema,
  MoneyAmountSchema,
  PageMetaSchema,
  PaginationQuerySchema,
} from "./common";
import {
  COURSE_CATEGORIES,
  COURSE_TYPES,
  CourseCategorySchema,
  CourseTypeSchema,
} from "./course";

export const ALL_COURSE_PRODUCT_CATEGORY = "全部";
export const ALL_COURSE_PRODUCT_STATUS = "all";
export const COURSE_PRODUCT_PAGE_SIZE = 10;

export const COURSE_PRODUCT_STATUSES = [
  "draft",
  "published",
  "unpublished",
  "archived",
] as const;

export const COURSE_PRODUCT_REVIEW_STATUSES = [
  "not_submitted",
  "pending",
  "approved",
  "rejected",
] as const;

export const COURSE_PRODUCT_SORTS = [
  "updated_desc",
  "created_desc",
  "learners_desc",
  "price_asc",
  "price_desc",
] as const;

export const COURSE_PRODUCT_AUDIT_ACTIONS = [
  "product_create",
  "status_update",
  "price_update",
  "info_update",
  "review_update",
  "content_update",
  "asset_upload",
  "asset_review",
  "asset_governance",
] as const;

export const COURSE_PRODUCT_REVIEW_ACTIONS = [
  "submit",
  "approve",
  "reject",
  "withdraw",
] as const;

export const COURSE_PRODUCT_CONTENT_MATERIAL_TYPES = [
  "video",
  "audio",
  "document",
  "exercise",
  "live_replay",
  "other",
] as const;

export const COURSE_PRODUCT_CONTENT_MATERIAL_STATUSES = [
  "pending",
  "ready",
] as const;

export const COURSE_PRODUCT_CONTENT_ASSET_REVIEW_STATUSES = [
  "not_required",
  "pending",
  "approved",
  "rejected",
] as const;

export const COURSE_PRODUCT_ASSET_KINDS = [
  "detail_image",
  "proof_image",
  "chapter_material",
  "worksheet",
  "audio",
  "video",
] as const;

export const COURSE_PRODUCT_ASSET_SOURCE_TYPES = [
  "external_url",
  "inline_upload",
  "object_storage",
] as const;

export const COURSE_PRODUCT_ASSET_STORAGE_PROVIDERS = [
  "local",
  "s3",
  "oss",
  "cos",
] as const;

export const COURSE_PRODUCT_ASSET_REFERENCE_TYPES = [
  "merchandising_showcase",
  "merchandising_proof",
  "merchandising_gallery",
  "chapter_material",
  "chapter_exercise",
  "chapter_audio",
  "chapter_video",
] as const;

export const COURSE_PRODUCT_ASSET_BACKFILL_SOURCES = [
  "json_asset_store",
  "content_material_placeholders",
  "json_asset_store_and_content_placeholders",
] as const;

export const COURSE_PRODUCT_ASSET_BACKFILL_ACTIONS = [
  "dry_run",
  "commit",
] as const;

export const COURSE_PRODUCT_ASSET_GOVERNANCE_ISSUE_TYPES = [
  "missing_product",
  "unreferenced",
  "duplicate_content_hash",
  "pending_compliance",
  "rejected_compliance",
  "download_disabled_material",
  "soft_delete_candidate",
] as const;

export const COURSE_PRODUCT_ASSET_GOVERNANCE_REFERENCE_SOURCES = [
  "reference_table",
  "content_material_placeholders",
  "none",
] as const;

export const COURSE_PRODUCT_ASSET_GOVERNANCE_ACTIONS = [
  "acknowledge_issue",
  "mark_duplicate_primary",
  "mark_soft_deleted",
] as const;

export const COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_ACTION_PLAN_ACTION_FILTERS =
  ["all", "mark_duplicate_primary", "mark_soft_deleted"] as const;

export const COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_ISSUE_FILTERS = [
  "all",
  "compliance_status",
  ...COURSE_PRODUCT_ASSET_GOVERNANCE_ISSUE_TYPES,
] as const;

export const COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_STATUSES = [
  "pending_approval",
  "approved",
  "rejected",
  "canceled",
] as const;

export const COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_STATUS_FILTERS = [
  "all",
  ...COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_STATUSES,
] as const;

export const COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_REVIEW_ACTIONS = [
  "approve",
  "reject",
] as const;

export const COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_EXECUTION_STATUSES = [
  "not_started",
  "running",
  "completed",
  "partially_completed",
  "failed",
] as const;

export const COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_EXECUTION_STATUS_FILTERS =
  [
    "all",
    ...COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_EXECUTION_STATUSES,
  ] as const;

export const COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_EXECUTION_ITEM_STATUSES =
  ["executed", "skipped", "failed"] as const;

export const COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_EXECUTION_PLAN_ITEM_STATUSES =
  ["planned", "skipped"] as const;

export const COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_EXECUTION_PLAN_RISK_LEVELS =
  ["low", "medium", "high"] as const;

export const COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_EXECUTION_JOB_STATUSES =
  ["queued", "running", "succeeded", "failed"] as const;

export const COURSE_PRODUCT_MERCHANDISING_ASSET_USAGES = [
  "showcase",
  "proof",
  "gallery",
] as const;

export const COURSE_PRODUCT_ASSET_MAX_SIZE_BYTES = 20 * 1024 * 1024;

export const COURSE_PRODUCT_CONTENT_QUALITY_ISSUE_CODES = [
  "schema_invalid",
  "summary_too_short",
  "merchandising_image_missing",
  "merchandising_points_missing",
  "merchandising_asset_pending",
  "audience_too_few",
  "chapters_too_few",
  "chapter_duration_too_short",
  "chapter_material_missing",
  "material_pending",
] as const;

export const COURSE_PRODUCT_CONTENT_QUALITY_SEVERITIES = [
  "blocking",
  "warning",
] as const;

export const CourseProductStatusSchema = z.enum(COURSE_PRODUCT_STATUSES);

export const CourseProductReviewStatusSchema = z.enum(
  COURSE_PRODUCT_REVIEW_STATUSES
);

export const CourseProductSortSchema = z.enum(COURSE_PRODUCT_SORTS);

export const CourseProductAuditActionSchema = z.enum(
  COURSE_PRODUCT_AUDIT_ACTIONS
);

export const CourseProductReviewActionSchema = z.enum(
  COURSE_PRODUCT_REVIEW_ACTIONS
);

export const CourseProductSourceSchema = z.enum(["seed", "manual", "imported"]);

export const CourseProductContentMaterialTypeSchema = z.enum(
  COURSE_PRODUCT_CONTENT_MATERIAL_TYPES
);

export const CourseProductContentMaterialStatusSchema = z.enum(
  COURSE_PRODUCT_CONTENT_MATERIAL_STATUSES
);

export const CourseProductContentAssetReviewStatusSchema = z.enum(
  COURSE_PRODUCT_CONTENT_ASSET_REVIEW_STATUSES
);

export const CourseProductAssetKindSchema = z.enum(COURSE_PRODUCT_ASSET_KINDS);

export const CourseProductAssetSourceTypeSchema = z.enum(
  COURSE_PRODUCT_ASSET_SOURCE_TYPES
);

export const CourseProductAssetStorageProviderSchema = z.enum(
  COURSE_PRODUCT_ASSET_STORAGE_PROVIDERS
);

export const CourseProductAssetReferenceTypeSchema = z.enum(
  COURSE_PRODUCT_ASSET_REFERENCE_TYPES
);

export const CourseProductAssetBackfillSourceSchema = z.enum(
  COURSE_PRODUCT_ASSET_BACKFILL_SOURCES
);

export const CourseProductAssetBackfillActionSchema = z.enum(
  COURSE_PRODUCT_ASSET_BACKFILL_ACTIONS
);

export const CourseProductAssetGovernanceIssueTypeSchema = z.enum(
  COURSE_PRODUCT_ASSET_GOVERNANCE_ISSUE_TYPES
);

export const CourseProductAssetGovernanceReferenceSourceSchema = z.enum(
  COURSE_PRODUCT_ASSET_GOVERNANCE_REFERENCE_SOURCES
);

export const CourseProductAssetGovernanceActionSchema = z.enum(
  COURSE_PRODUCT_ASSET_GOVERNANCE_ACTIONS
);

export const CourseProductAssetGovernanceBatchIssueFilterSchema = z.enum(
  COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_ISSUE_FILTERS
);

export const CourseProductAssetGovernanceBatchTaskStatusSchema = z.enum(
  COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_STATUSES
);

export const CourseProductAssetGovernanceBatchTaskStatusFilterSchema = z.enum(
  COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_STATUS_FILTERS
);

export const CourseProductAssetGovernanceBatchTaskReviewActionSchema = z.enum(
  COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_REVIEW_ACTIONS
);

export const CourseProductAssetGovernanceBatchTaskExecutionStatusSchema =
  z.enum(COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_EXECUTION_STATUSES);

export const CourseProductAssetGovernanceBatchTaskExecutionStatusFilterSchema =
  z.enum(COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_EXECUTION_STATUS_FILTERS);

export const CourseProductAssetGovernanceBatchTaskExecutionItemStatusSchema =
  z.enum(COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_EXECUTION_ITEM_STATUSES);

export const CourseProductAssetGovernanceBatchTaskExecutionPlanItemStatusSchema =
  z.enum(
    COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_EXECUTION_PLAN_ITEM_STATUSES
  );

export const CourseProductAssetGovernanceBatchTaskExecutionPlanRiskLevelSchema =
  z.enum(COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_EXECUTION_PLAN_RISK_LEVELS);

export const CourseProductAssetGovernanceBatchTaskExecutionJobStatusSchema =
  z.enum(COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_EXECUTION_JOB_STATUSES);

export const CourseProductMerchandisingAssetUsageSchema = z.enum(
  COURSE_PRODUCT_MERCHANDISING_ASSET_USAGES
);

export const CourseProductContentQualityIssueCodeSchema = z.enum(
  COURSE_PRODUCT_CONTENT_QUALITY_ISSUE_CODES
);

export const CourseProductContentQualitySeveritySchema = z.enum(
  COURSE_PRODUCT_CONTENT_QUALITY_SEVERITIES
);

export const CourseProductPriceSchema = z.object({
  currency: z.literal("CNY").default("CNY"),
  amount: MoneyAmountSchema,
  originalAmount: MoneyAmountSchema,
  isFree: z.boolean(),
  memberIncluded: z.boolean(),
});

export const CourseProductListItemSchema = z.object({
  id: EntityIdSchema,
  courseId: LegacyNumericIdSchema,
  title: z.string().min(2),
  coverUrl: z.string().url(),
  category: CourseCategorySchema,
  type: CourseTypeSchema,
  instructorName: z.string().min(1),
  learners: z.number().int().nonnegative(),
  price: CourseProductPriceSchema,
  status: CourseProductStatusSchema,
  reviewStatus: CourseProductReviewStatusSchema,
  source: CourseProductSourceSchema,
  createdAt: DateTimeLikeSchema,
  updatedAt: DateTimeLikeSchema,
  publishedAt: DateTimeLikeSchema.optional(),
});

export const CourseProductListQuerySchema = PaginationQuerySchema.extend({
  keyword: z.string().trim().max(80).default(""),
  category: z
    .union([CourseCategorySchema, z.literal(ALL_COURSE_PRODUCT_CATEGORY)])
    .default(ALL_COURSE_PRODUCT_CATEGORY),
  status: z
    .union([CourseProductStatusSchema, z.literal(ALL_COURSE_PRODUCT_STATUS)])
    .default(ALL_COURSE_PRODUCT_STATUS),
  sort: CourseProductSortSchema.default("updated_desc"),
  pageSize: z.number().int().min(1).max(50).default(COURSE_PRODUCT_PAGE_SIZE),
});

export const CourseProductListSummarySchema = z.object({
  totalCount: z.number().int().nonnegative(),
  publishedCount: z.number().int().nonnegative(),
  unpublishedCount: z.number().int().nonnegative(),
  draftCount: z.number().int().nonnegative(),
  archivedCount: z.number().int().nonnegative(),
  freeCount: z.number().int().nonnegative(),
  memberIncludedCount: z.number().int().nonnegative(),
});

export const CourseProductAuditEventSchema = z.object({
  id: EntityIdSchema,
  productId: EntityIdSchema,
  productTitle: z.string().min(2),
  actorId: EntityIdSchema,
  action: CourseProductAuditActionSchema,
  reason: z.string().trim().min(4).max(240),
  before: z.record(z.string(), z.unknown()),
  after: z.record(z.string(), z.unknown()),
  createdAt: DateTimeLikeSchema,
});

export const CourseProductFilterOptionsSchema = z.object({
  categories: z.array(CourseCategorySchema),
  types: z.array(CourseTypeSchema),
  statuses: z.array(CourseProductStatusSchema),
});

export const CourseProductAssetUrlSchema = z.union([
  z.string().trim().url(),
  z.string().trim().startsWith("data:"),
  z.string().trim().startsWith("/api/"),
]);

export const CourseProductAssetContentHashSchema = z
  .string()
  .trim()
  .regex(/^sha256:[a-f0-9]{64}$/);

export const CourseProductAssetObjectKeySchema = z
  .string()
  .trim()
  .min(4)
  .max(320);

export const CourseProductAssetObjectDescriptorSchema = z.object({
  objectKey: CourseProductAssetObjectKeySchema,
  provider: CourseProductAssetStorageProviderSchema.default("local"),
  bucket: z.string().trim().min(1).max(120).optional(),
  region: z.string().trim().min(1).max(80).optional(),
  mimeType: z.string().trim().min(3).max(120),
  sizeBytes: z.number().int().min(0).max(COURSE_PRODUCT_ASSET_MAX_SIZE_BYTES),
  contentHash: CourseProductAssetContentHashSchema,
  originalFileName: z.string().trim().min(2).max(160),
  createdBy: EntityIdSchema,
  createdAt: DateTimeLikeSchema,
  deletedAt: DateTimeLikeSchema.optional(),
});

export const CourseProductAssetSignedReadUrlSchema = z.object({
  objectKey: CourseProductAssetObjectKeySchema,
  url: z.string().trim().min(1),
  method: z.literal("GET").default("GET"),
  expiresAt: DateTimeLikeSchema,
  headers: z.record(z.string(), z.string()).default({}),
});

export const CourseProductAssetObjectDeleteResultSchema = z.object({
  objectKey: CourseProductAssetObjectKeySchema,
  deletedBy: EntityIdSchema,
  deletedAt: DateTimeLikeSchema,
  mode: z.enum(["soft_delete", "physical_delete"]).default("soft_delete"),
});

export const CourseProductAssetSchema = z.object({
  id: EntityIdSchema,
  productId: EntityIdSchema,
  chapterId: EntityIdSchema.optional(),
  kind: CourseProductAssetKindSchema,
  title: z.string().trim().min(2).max(100),
  fileName: z.string().trim().min(2).max(160),
  mimeType: z.string().trim().min(3).max(120),
  sizeBytes: z.number().int().min(0).max(COURSE_PRODUCT_ASSET_MAX_SIZE_BYTES),
  sourceType: CourseProductAssetSourceTypeSchema,
  storageKey: z.string().trim().min(4).max(260).optional(),
  objectKey: CourseProductAssetObjectKeySchema.optional(),
  contentHash: CourseProductAssetContentHashSchema.optional(),
  publicUrl: CourseProductAssetUrlSchema.optional(),
  usage: CourseProductMerchandisingAssetUsageSchema.optional(),
  altText: z.string().trim().max(120).optional(),
  note: z.string().trim().max(240).optional(),
  complianceStatus:
    CourseProductContentAssetReviewStatusSchema.default("pending"),
  downloadEnabled: z.boolean().default(false),
  referenceCount: z.number().int().nonnegative().default(0),
  uploadedBy: EntityIdSchema,
  uploadedAt: DateTimeLikeSchema,
  reviewedBy: EntityIdSchema.optional(),
  reviewedAt: DateTimeLikeSchema.optional(),
  deletedAt: DateTimeLikeSchema.optional(),
  updatedAt: DateTimeLikeSchema,
});

export const CourseProductAssetReferenceSchema = z.object({
  id: EntityIdSchema,
  assetId: EntityIdSchema,
  productId: EntityIdSchema,
  courseId: LegacyNumericIdSchema,
  chapterId: EntityIdSchema.optional(),
  referenceType: CourseProductAssetReferenceTypeSchema,
  materialPlaceholderId: EntityIdSchema.optional(),
  materialPlaceholderIndex: z.number().int().nonnegative().optional(),
  createdBy: EntityIdSchema,
  createdAt: DateTimeLikeSchema,
  deletedAt: DateTimeLikeSchema.optional(),
});

export const CourseProductAssetBackfillPlanSchema = z.object({
  id: EntityIdSchema,
  source: CourseProductAssetBackfillSourceSchema,
  dryRun: z.boolean().default(true),
  scannedCount: z.number().int().nonnegative(),
  assetCount: z.number().int().nonnegative(),
  referenceCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  startedAt: DateTimeLikeSchema,
  finishedAt: DateTimeLikeSchema.optional(),
  notes: z.array(z.string().trim().min(1).max(240)).default([]),
});

export const CourseProductAssetBackfillRequestSchema = z
  .object({
    action: CourseProductAssetBackfillActionSchema.default("dry_run"),
    confirmWrite: z.boolean().default(false),
    reason: z.string().trim().min(4).max(240).optional(),
  })
  .superRefine((request, ctx) => {
    if (request.action !== "commit") return;

    if (!request.confirmWrite) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmWrite"],
        message: "commit requires explicit write confirmation",
      });
    }

    if (!request.reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "commit requires an operation reason",
      });
    }
  });

export const CourseProductAssetBackfillMutationResultSchema = z.object({
  mode: CourseProductAssetBackfillActionSchema,
  plan: CourseProductAssetBackfillPlanSchema,
  writtenAssetCount: z.number().int().nonnegative(),
  writtenObjectCount: z.number().int().nonnegative(),
  writtenReferenceCount: z.number().int().nonnegative(),
  confirmedBy: EntityIdSchema.optional(),
  reason: z.string().trim().min(4).max(240).optional(),
  createdAt: DateTimeLikeSchema,
});

export const CourseProductAssetGovernanceProductSummarySchema = z.object({
  id: EntityIdSchema,
  courseId: LegacyNumericIdSchema,
  title: z.string().trim().min(2),
  status: CourseProductStatusSchema,
  reviewStatus: CourseProductReviewStatusSchema,
});

export const CourseProductAssetGovernanceItemSchema = z.object({
  asset: CourseProductAssetSchema,
  product: CourseProductAssetGovernanceProductSummarySchema.optional(),
  referenceCount: z.number().int().nonnegative(),
  persistedReferenceCount: z.number().int().nonnegative().optional(),
  inferredReferenceCount: z.number().int().nonnegative().optional(),
  referenceSource: CourseProductAssetGovernanceReferenceSourceSchema,
  references: z.array(CourseProductAssetReferenceSchema).default([]),
  duplicateContentHashAssetIds: z.array(EntityIdSchema).default([]),
  issueTypes: z.array(CourseProductAssetGovernanceIssueTypeSchema).default([]),
  softDeleteCandidate: z.boolean().default(false),
});

export const CourseProductAssetGovernanceSummarySchema = z.object({
  totalAssetCount: z.number().int().nonnegative(),
  activeAssetCount: z.number().int().nonnegative(),
  referencedAssetCount: z.number().int().nonnegative(),
  unreferencedAssetCount: z.number().int().nonnegative(),
  duplicateContentHashGroupCount: z.number().int().nonnegative(),
  duplicateContentHashAssetCount: z.number().int().nonnegative(),
  pendingComplianceCount: z.number().int().nonnegative(),
  rejectedComplianceCount: z.number().int().nonnegative(),
  downloadDisabledMaterialCount: z.number().int().nonnegative(),
  softDeleteCandidateCount: z.number().int().nonnegative(),
  missingProductAssetCount: z.number().int().nonnegative(),
  referenceCount: z.number().int().nonnegative(),
  referenceSource: CourseProductAssetGovernanceReferenceSourceSchema,
});

export const CourseProductAssetGovernanceResultSchema = z.object({
  generatedAt: DateTimeLikeSchema,
  summary: CourseProductAssetGovernanceSummarySchema,
  items: z.array(CourseProductAssetGovernanceItemSchema),
  notes: z.array(z.string().trim().min(1).max(240)).default([]),
});

export const CourseProductAssetGovernanceActionRequestSchema = z
  .object({
    action: CourseProductAssetGovernanceActionSchema,
    issueType: CourseProductAssetGovernanceIssueTypeSchema,
    reason: z.string().trim().min(4).max(240),
    note: z.string().trim().max(240).optional(),
    primaryAssetId: EntityIdSchema.optional(),
  })
  .superRefine((request, ctx) => {
    if (
      request.action === "mark_duplicate_primary" &&
      request.issueType !== "duplicate_content_hash"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["issueType"],
        message: "mark_duplicate_primary requires duplicate_content_hash",
      });
    }

    if (
      request.action === "mark_duplicate_primary" &&
      !request.primaryAssetId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["primaryAssetId"],
        message: "mark_duplicate_primary requires primaryAssetId",
      });
    }

    if (
      request.action === "mark_soft_deleted" &&
      request.issueType !== "soft_delete_candidate"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["issueType"],
        message: "mark_soft_deleted requires soft_delete_candidate",
      });
    }
  });

export const CourseProductAssetGovernanceActionResultSchema = z.object({
  asset: CourseProductAssetSchema,
  governance: CourseProductAssetGovernanceResultSchema,
  auditEvent: CourseProductAuditEventSchema,
});

export const CourseProductAssetGovernanceHistoryQuerySchema =
  PaginationQuerySchema.extend({
    assetId: EntityIdSchema.optional(),
    productId: EntityIdSchema.optional(),
    action: CourseProductAssetGovernanceActionSchema.optional(),
    issueType: CourseProductAssetGovernanceIssueTypeSchema.optional(),
    actorId: EntityIdSchema.optional(),
    dateFrom: DateTimeLikeSchema.optional(),
    dateTo: DateTimeLikeSchema.optional(),
    pageSize: z.number().int().min(1).max(50).default(10),
  }).superRefine((query, ctx) => {
    if (!query.dateFrom || !query.dateTo) return;
    if (query.dateFrom > query.dateTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateTo"],
        message: "dateTo must be later than dateFrom",
      });
    }
  });

export const CourseProductAssetGovernanceHistorySnapshotSchema = z.object({
  assetId: EntityIdSchema.optional(),
  productId: EntityIdSchema.optional(),
  title: z.string().trim().min(1).max(120).optional(),
  kind: CourseProductAssetKindSchema.optional(),
  governanceAction: CourseProductAssetGovernanceActionSchema.optional(),
  issueType: CourseProductAssetGovernanceIssueTypeSchema.optional(),
  primaryAssetId: EntityIdSchema.optional(),
  referenceCount: z.number().int().nonnegative().optional(),
  duplicateContentHashAssetIds: z.array(EntityIdSchema).default([]),
  complianceStatus: CourseProductContentAssetReviewStatusSchema.optional(),
  downloadEnabled: z.boolean().optional(),
  deletedAt: DateTimeLikeSchema.optional(),
  note: z.string().trim().max(240).optional(),
});

export const CourseProductAssetGovernanceHistoryItemSchema = z.object({
  id: EntityIdSchema,
  productId: EntityIdSchema,
  productTitle: z.string().trim().min(1),
  assetId: EntityIdSchema,
  assetTitle: z.string().trim().min(1).max(120).optional(),
  assetKind: CourseProductAssetKindSchema.optional(),
  action: CourseProductAssetGovernanceActionSchema,
  issueType: CourseProductAssetGovernanceIssueTypeSchema,
  actorId: EntityIdSchema,
  actorRoles: z.array(EntityIdSchema).default([]),
  reason: z.string().trim().min(1).max(240),
  primaryAssetId: EntityIdSchema.optional(),
  referenceCount: z.number().int().nonnegative().optional(),
  before: CourseProductAssetGovernanceHistorySnapshotSchema,
  after: CourseProductAssetGovernanceHistorySnapshotSchema,
  createdAt: DateTimeLikeSchema,
});

export const CourseProductAssetGovernanceHistoryDistributionSchema = z.object({
  key: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(80),
  count: z.number().int().nonnegative(),
});

export const CourseProductLearningMaterialOperationsReportProductRowSchema =
  z.object({
    productId: EntityIdSchema,
    courseId: LegacyNumericIdSchema,
    title: z.string().trim().min(2),
    status: CourseProductStatusSchema,
    reviewStatus: CourseProductReviewStatusSchema,
    chapterCount: z.number().int().nonnegative(),
    materialSlotCount: z.number().int().nonnegative(),
    boundMaterialSlotCount: z.number().int().nonnegative(),
    materialBindingRate: z.number().min(0).max(1),
    learningMaterialAssetCount: z.number().int().nonnegative(),
    downloadableAssetCount: z.number().int().nonnegative(),
    issueAssetCount: z.number().int().nonnegative(),
  });

export const CourseProductLearningMaterialOperationsReportSummarySchema =
  z.object({
    totalProductCount: z.number().int().nonnegative(),
    productWithMaterialSlotsCount: z.number().int().nonnegative(),
    chapterCount: z.number().int().nonnegative(),
    materialSlotCount: z.number().int().nonnegative(),
    boundMaterialSlotCount: z.number().int().nonnegative(),
    materialBindingRate: z.number().min(0).max(1),
    totalAssetCount: z.number().int().nonnegative(),
    learningMaterialAssetCount: z.number().int().nonnegative(),
    activeLearningMaterialAssetCount: z.number().int().nonnegative(),
    approvedLearningMaterialAssetCount: z.number().int().nonnegative(),
    downloadableLearningMaterialAssetCount: z.number().int().nonnegative(),
    downloadDisabledLearningMaterialAssetCount: z.number().int().nonnegative(),
    referencedLearningMaterialAssetCount: z.number().int().nonnegative(),
    unreferencedLearningMaterialAssetCount: z.number().int().nonnegative(),
    pendingComplianceLearningMaterialCount: z.number().int().nonnegative(),
    rejectedComplianceLearningMaterialCount: z.number().int().nonnegative(),
    softDeleteCandidateLearningMaterialCount: z.number().int().nonnegative(),
    governanceIssueLearningMaterialCount: z.number().int().nonnegative(),
    referenceSource: CourseProductAssetGovernanceReferenceSourceSchema,
  });

export const CourseProductLearningMaterialOperationsReportSchema = z.object({
  generatedAt: DateTimeLikeSchema,
  summary: CourseProductLearningMaterialOperationsReportSummarySchema,
  assetKindDistribution: z
    .array(CourseProductAssetGovernanceHistoryDistributionSchema)
    .default([]),
  complianceStatusDistribution: z
    .array(CourseProductAssetGovernanceHistoryDistributionSchema)
    .default([]),
  downloadStatusDistribution: z
    .array(CourseProductAssetGovernanceHistoryDistributionSchema)
    .default([]),
  referenceTypeDistribution: z
    .array(CourseProductAssetGovernanceHistoryDistributionSchema)
    .default([]),
  issueTypeDistribution: z
    .array(CourseProductAssetGovernanceHistoryDistributionSchema)
    .default([]),
  productRows: z
    .array(CourseProductLearningMaterialOperationsReportProductRowSchema)
    .default([]),
  notes: z.array(z.string().trim().min(1).max(240)).default([]),
});

export const CourseProductAssetGovernanceHistorySummarySchema = z.object({
  totalEventCount: z.number().int().nonnegative(),
  filteredEventCount: z.number().int().nonnegative(),
  actorCount: z.number().int().nonnegative(),
  actionDistribution: z
    .array(CourseProductAssetGovernanceHistoryDistributionSchema)
    .default([]),
  issueTypeDistribution: z
    .array(CourseProductAssetGovernanceHistoryDistributionSchema)
    .default([]),
});

export const CourseProductAssetGovernanceHistoryResultSchema = z.object({
  generatedAt: DateTimeLikeSchema,
  query: CourseProductAssetGovernanceHistoryQuerySchema,
  summary: CourseProductAssetGovernanceHistorySummarySchema,
  items: z.array(CourseProductAssetGovernanceHistoryItemSchema),
  meta: PageMetaSchema,
});

export const CourseProductAssetGovernanceBatchDraftQuerySchema = z.object({
  issueFilter:
    CourseProductAssetGovernanceBatchIssueFilterSchema.default("all"),
  productId: EntityIdSchema.optional(),
  previewSize: z.number().int().min(1).max(20).default(8),
});

export const CourseProductAssetGovernanceBatchDraftActionSchema = z.object({
  action: CourseProductAssetGovernanceActionSchema,
  issueType: CourseProductAssetGovernanceIssueTypeSchema,
  eligible: z.boolean(),
  reason: z.string().trim().min(1).max(180),
  primaryAssetId: EntityIdSchema.optional(),
});

export const CourseProductAssetGovernanceBatchDraftItemSchema = z.object({
  assetId: EntityIdSchema,
  productId: EntityIdSchema,
  productTitle: z.string().trim().min(1).optional(),
  assetTitle: z.string().trim().min(1).max(120),
  assetKind: CourseProductAssetKindSchema,
  issueTypes: z.array(CourseProductAssetGovernanceIssueTypeSchema),
  referenceCount: z.number().int().nonnegative(),
  duplicateContentHashAssetIds: z.array(EntityIdSchema).default([]),
  proposedActions: z
    .array(CourseProductAssetGovernanceBatchDraftActionSchema)
    .default([]),
});

export const CourseProductAssetGovernanceBatchDraftSummarySchema = z.object({
  candidateAssetCount: z.number().int().nonnegative(),
  previewItemCount: z.number().int().nonnegative(),
  eligibleActionCount: z.number().int().nonnegative(),
  manualReviewAssetCount: z.number().int().nonnegative(),
  softDeleteCandidateCount: z.number().int().nonnegative(),
  issueTypeDistribution: z
    .array(CourseProductAssetGovernanceHistoryDistributionSchema)
    .default([]),
  proposedActionDistribution: z
    .array(CourseProductAssetGovernanceHistoryDistributionSchema)
    .default([]),
});

export const CourseProductAssetGovernanceBatchDraftResultSchema = z.object({
  generatedAt: DateTimeLikeSchema,
  requestedBy: EntityIdSchema,
  query: CourseProductAssetGovernanceBatchDraftQuerySchema,
  previewOnly: z.literal(true).default(true),
  willModifyAssetStore: z.literal(false).default(false),
  summary: CourseProductAssetGovernanceBatchDraftSummarySchema,
  items: z.array(CourseProductAssetGovernanceBatchDraftItemSchema),
  safetyNotes: z.array(z.string().trim().min(1).max(240)).default([]),
});

export const CourseProductAssetGovernanceBatchTaskReviewSummarySchema =
  z.object({
    approvalStatus: CourseProductAssetGovernanceBatchTaskStatusSchema,
    candidateAssetCount: z.number().int().nonnegative(),
    eligibleActionCount: z.number().int().nonnegative(),
    manualReviewAssetCount: z.number().int().nonnegative(),
    softDeleteCandidateCount: z.number().int().nonnegative(),
  });

export const CourseProductAssetGovernanceBatchTaskApprovalPreflightSchema =
  z.object({
    generatedAt: DateTimeLikeSchema,
    originalCandidateAssetCount: z.number().int().nonnegative(),
    currentCandidateAssetCount: z.number().int().nonnegative(),
    candidateDeltaCount: z.number().int(),
    disappearedAssetIds: z.array(EntityIdSchema).default([]),
    newCandidateAssetIds: z.array(EntityIdSchema).default([]),
    changedIssueTypeAssetIds: z.array(EntityIdSchema).default([]),
    stillEligibleActionCount: z.number().int().nonnegative(),
    currentManualReviewAssetCount: z.number().int().nonnegative(),
    currentSoftDeleteCandidateCount: z.number().int().nonnegative(),
    currentIssueTypeDistribution: z
      .array(CourseProductAssetGovernanceHistoryDistributionSchema)
      .default([]),
    currentProposedActionDistribution: z
      .array(CourseProductAssetGovernanceHistoryDistributionSchema)
      .default([]),
    requiresRecreate: z.boolean().default(false),
    notes: z.array(z.string().trim().min(1).max(240)).default([]),
  });

export const CourseProductAssetGovernanceBatchTaskExecutionItemResultSchema =
  z.object({
    assetId: EntityIdSchema,
    productId: EntityIdSchema.optional(),
    productTitle: z.string().trim().min(1).optional(),
    assetTitle: z.string().trim().min(1).max(120).optional(),
    plannedAction: CourseProductAssetGovernanceActionSchema,
    issueType: CourseProductAssetGovernanceIssueTypeSchema.optional(),
    status: CourseProductAssetGovernanceBatchTaskExecutionItemStatusSchema,
    auditEventId: EntityIdSchema.optional(),
    skipReason: z.string().trim().min(1).max(240).optional(),
    errorMessage: z.string().trim().min(1).max(240).optional(),
  });

export const CourseProductAssetGovernanceBatchTaskExecutionSummarySchema =
  z.object({
    taskId: EntityIdSchema,
    executionStatus: CourseProductAssetGovernanceBatchTaskExecutionStatusSchema,
    plannedActionCount: z.number().int().nonnegative(),
    executedActionCount: z.number().int().nonnegative(),
    skippedActionCount: z.number().int().nonnegative(),
    failedActionCount: z.number().int().nonnegative(),
    auditEventCount: z.number().int().nonnegative(),
  });

export const CourseProductAssetGovernanceBatchTaskSchema = z.object({
  id: EntityIdSchema,
  action: CourseProductAssetGovernanceActionSchema,
  approvalStatus: CourseProductAssetGovernanceBatchTaskStatusSchema,
  query: CourseProductAssetGovernanceBatchDraftQuerySchema,
  candidateAssetCount: z.number().int().nonnegative(),
  previewItemCount: z.number().int().nonnegative(),
  eligibleActionCount: z.number().int().nonnegative(),
  manualReviewAssetCount: z.number().int().nonnegative(),
  softDeleteCandidateCount: z.number().int().nonnegative(),
  issueTypeDistribution: z
    .array(CourseProductAssetGovernanceHistoryDistributionSchema)
    .default([]),
  proposedActionDistribution: z
    .array(CourseProductAssetGovernanceHistoryDistributionSchema)
    .default([]),
  candidateAssetIds: z.array(EntityIdSchema).default([]),
  candidateIssueTypeByAssetId: z
    .record(
      EntityIdSchema,
      z.array(CourseProductAssetGovernanceIssueTypeSchema)
    )
    .default({}),
  safetyNotes: z.array(z.string().trim().min(1).max(240)).default([]),
  createdBy: EntityIdSchema,
  createdByRoles: z.array(EntityIdSchema).default([]),
  reason: z.string().trim().min(4).max(240),
  note: z.string().trim().max(240).optional(),
  createdAt: DateTimeLikeSchema,
  updatedAt: DateTimeLikeSchema,
  reviewedBy: EntityIdSchema.optional(),
  reviewedByRoles: z.array(EntityIdSchema).default([]),
  reviewedAt: DateTimeLikeSchema.optional(),
  reviewAction:
    CourseProductAssetGovernanceBatchTaskReviewActionSchema.optional(),
  reviewReason: z.string().trim().min(4).max(240).optional(),
  reviewBeforeSummary:
    CourseProductAssetGovernanceBatchTaskReviewSummarySchema.optional(),
  reviewAfterSummary:
    CourseProductAssetGovernanceBatchTaskReviewSummarySchema.optional(),
  approvalPreflight:
    CourseProductAssetGovernanceBatchTaskApprovalPreflightSchema.optional(),
  executionStatus:
    CourseProductAssetGovernanceBatchTaskExecutionStatusSchema.default(
      "not_started"
    ),
  executionAttemptCount: z.number().int().nonnegative().default(0),
  executionRequestedBy: EntityIdSchema.optional(),
  executionRequestedByRoles: z.array(EntityIdSchema).default([]),
  executionStartedAt: DateTimeLikeSchema.optional(),
  executionCompletedAt: DateTimeLikeSchema.optional(),
  executionReason: z.string().trim().min(4).max(240).optional(),
  executionNote: z.string().trim().max(240).optional(),
  executionSummary:
    CourseProductAssetGovernanceBatchTaskExecutionSummarySchema.optional(),
  executionItems: z
    .array(CourseProductAssetGovernanceBatchTaskExecutionItemResultSchema)
    .default([]),
  executionAuditEventIds: z.array(EntityIdSchema).default([]),
  lastExecutionError: z.string().trim().min(1).max(240).optional(),
  lastExecutionFailedAt: DateTimeLikeSchema.optional(),
  canceledBy: EntityIdSchema.optional(),
  canceledAt: DateTimeLikeSchema.optional(),
  cancelReason: z.string().trim().min(4).max(240).optional(),
});

export const CourseProductAssetGovernanceBatchTaskExecutionJobSchema = z.object(
  {
    id: EntityIdSchema,
    taskId: EntityIdSchema,
    status: CourseProductAssetGovernanceBatchTaskExecutionJobStatusSchema,
    requestedBy: EntityIdSchema,
    enqueuedAt: DateTimeLikeSchema,
    startedAt: DateTimeLikeSchema.optional(),
    finishedAt: DateTimeLikeSchema.optional(),
    attemptCount: z.number().int().nonnegative().default(0),
    summary:
      CourseProductAssetGovernanceBatchTaskExecutionSummarySchema.optional(),
    lastError: z.string().trim().min(1).max(240).optional(),
  }
);

export const CourseProductAssetGovernanceBatchTaskQueueObservationQuerySchema =
  z.object({
    taskId: EntityIdSchema.optional(),
    limit: z.number().int().min(1).max(20).default(10),
  });

export const CourseProductAssetGovernanceBatchTaskQueueObservationItemSchema =
  z.object({
    taskId: EntityIdSchema,
    task: CourseProductAssetGovernanceBatchTaskSchema.optional(),
    latestJob:
      CourseProductAssetGovernanceBatchTaskExecutionJobSchema.optional(),
    approvalStatus:
      CourseProductAssetGovernanceBatchTaskStatusSchema.optional(),
    executionStatus:
      CourseProductAssetGovernanceBatchTaskExecutionStatusSchema.optional(),
    executionAttemptCount: z.number().int().nonnegative().default(0),
    lastExecutionError: z.string().trim().min(1).max(240).optional(),
    lastExecutionFailedAt: DateTimeLikeSchema.optional(),
    retryRecommended: z.boolean().default(false),
    operatorHint: z.string().trim().min(1).max(240),
  });

export const CourseProductAssetGovernanceBatchTaskQueueObservationSummarySchema =
  z.object({
    observedTaskCount: z.number().int().nonnegative(),
    observedJobCount: z.number().int().nonnegative(),
    queuedJobCount: z.number().int().nonnegative(),
    runningJobCount: z.number().int().nonnegative(),
    succeededJobCount: z.number().int().nonnegative(),
    failedJobCount: z.number().int().nonnegative(),
    runningTaskCount: z.number().int().nonnegative(),
    failedTaskCount: z.number().int().nonnegative(),
    retryableTaskCount: z.number().int().nonnegative(),
    totalExecutionAttemptCount: z.number().int().nonnegative(),
  });

export const CourseProductAssetGovernanceBatchTaskQueueObservationResultSchema =
  z.object({
    generatedAt: DateTimeLikeSchema,
    query: CourseProductAssetGovernanceBatchTaskQueueObservationQuerySchema,
    summary: CourseProductAssetGovernanceBatchTaskQueueObservationSummarySchema,
    items: z.array(
      CourseProductAssetGovernanceBatchTaskQueueObservationItemSchema
    ),
    notes: z.array(z.string().trim().min(1).max(240)).default([]),
  });

export const CourseProductAssetGovernanceBatchActionPlanActionFilterSchema =
  z.enum(COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_ACTION_PLAN_ACTION_FILTERS);

export const CourseProductAssetGovernanceBatchActionPlanQuerySchema = z.object({
  action:
    CourseProductAssetGovernanceBatchActionPlanActionFilterSchema.default(
      "all"
    ),
  productId: EntityIdSchema.optional(),
  previewSize: z.number().int().min(1).max(20).default(6),
});

export const CourseProductAssetGovernanceBatchActionPlanAssetSchema = z.object({
  assetId: EntityIdSchema,
  productId: EntityIdSchema.optional(),
  productTitle: z.string().trim().min(1).optional(),
  assetTitle: z.string().trim().min(1).max(120).optional(),
  assetKind: CourseProductAssetKindSchema.optional(),
  contentHash: CourseProductAssetContentHashSchema.optional(),
  complianceStatus: CourseProductContentAssetReviewStatusSchema.optional(),
  downloadEnabled: z.boolean().default(false),
  deletedAt: DateTimeLikeSchema.optional(),
  referenceCount: z.number().int().nonnegative().default(0),
  references: z.array(CourseProductAssetReferenceSchema).default([]),
  frontStageUsage: z.boolean().default(false),
  frontStageUsageReasons: z
    .array(z.string().trim().min(1).max(120))
    .default([]),
  riskLevel: CourseProductAssetGovernanceBatchTaskExecutionPlanRiskLevelSchema,
  reviewReasons: z.array(z.string().trim().min(1).max(180)).default([]),
});

export const CourseProductAssetGovernanceDuplicateMergeReferenceSchema =
  z.object({
    fromAssetId: EntityIdSchema,
    toAssetId: EntityIdSchema,
    reference: CourseProductAssetReferenceSchema,
    action: z.literal("retarget_to_primary").default("retarget_to_primary"),
    requiresManualReview: z.boolean().default(true),
    reason: z.string().trim().min(1).max(180),
  });

export const CourseProductAssetGovernanceDuplicateGroupPlanSchema = z.object({
  contentHash: CourseProductAssetContentHashSchema,
  assetIds: z.array(EntityIdSchema).min(2),
  suggestedPrimaryAssetId: EntityIdSchema.optional(),
  primarySelectionReason: z.string().trim().min(1).max(180).optional(),
  duplicateAssetCount: z.number().int().min(2),
  affectedReferenceCount: z.number().int().nonnegative(),
  mergeCandidateReferenceCount: z.number().int().nonnegative(),
  materialPlaceholderReferenceCount: z.number().int().nonnegative(),
  frontStageUsageAssetCount: z.number().int().nonnegative(),
  crossProduct: z.boolean().default(false),
  riskLevel: CourseProductAssetGovernanceBatchTaskExecutionPlanRiskLevelSchema,
  reviewReasons: z.array(z.string().trim().min(1).max(180)).default([]),
  assets: z
    .array(CourseProductAssetGovernanceBatchActionPlanAssetSchema)
    .min(2),
  referencesToMerge: z
    .array(CourseProductAssetGovernanceDuplicateMergeReferenceSchema)
    .default([]),
});

export const CourseProductAssetGovernanceSoftDeleteImpactPlanSchema = z.object({
  asset: CourseProductAssetGovernanceBatchActionPlanAssetSchema,
  canSoftDeleteSafely: z.boolean().default(false),
  hasReferences: z.boolean().default(false),
  isApproved: z.boolean().default(false),
  downloadEnabled: z.boolean().default(false),
  frontStageUsage: z.boolean().default(false),
  willHideLearningDownload: z.boolean().default(false),
  reviewReasons: z.array(z.string().trim().min(1).max(180)).default([]),
});

export const CourseProductAssetGovernanceBatchActionPlanSummarySchema =
  z.object({
    duplicateGroupCount: z.number().int().nonnegative(),
    duplicateAssetCount: z.number().int().nonnegative(),
    suggestedPrimaryAssetCount: z.number().int().nonnegative(),
    affectedReferenceCount: z.number().int().nonnegative(),
    mergeCandidateReferenceCount: z.number().int().nonnegative(),
    softDeleteCandidateCount: z.number().int().nonnegative(),
    safeSoftDeleteCandidateCount: z.number().int().nonnegative(),
    blockedSoftDeleteCandidateCount: z.number().int().nonnegative(),
    frontStageUsageAssetCount: z.number().int().nonnegative(),
    highRiskItemCount: z.number().int().nonnegative(),
    mediumRiskItemCount: z.number().int().nonnegative(),
    lowRiskItemCount: z.number().int().nonnegative(),
  });

export const CourseProductAssetGovernanceBatchActionPlanResultSchema = z.object(
  {
    generatedAt: DateTimeLikeSchema,
    requestedBy: EntityIdSchema,
    previewOnly: z.literal(true).default(true),
    executable: z.literal(false).default(false),
    willModifyAssetStore: z.literal(false).default(false),
    willWriteAuditEvents: z.literal(false).default(false),
    query: CourseProductAssetGovernanceBatchActionPlanQuerySchema,
    summary: CourseProductAssetGovernanceBatchActionPlanSummarySchema,
    duplicateGroups: z
      .array(CourseProductAssetGovernanceDuplicateGroupPlanSchema)
      .default([]),
    softDeleteCandidates: z
      .array(CourseProductAssetGovernanceSoftDeleteImpactPlanSchema)
      .default([]),
    safetyNotes: z.array(z.string().trim().min(1).max(240)).default([]),
  }
);

export const CourseProductAssetGovernanceBatchTaskCreateRequestSchema = z
  .object({
    action:
      CourseProductAssetGovernanceActionSchema.default("acknowledge_issue"),
    query: CourseProductAssetGovernanceBatchDraftQuerySchema,
    reason: z.string().trim().min(4).max(240),
    note: z.string().trim().max(240).optional(),
  })
  .superRefine((request, ctx) => {
    if (request.action !== "acknowledge_issue") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["action"],
        message: "batch task only supports acknowledge_issue in this slice",
      });
    }
  });

export const CourseProductAssetGovernanceBatchTaskCancelRequestSchema =
  z.object({
    reason: z.string().trim().min(4).max(240),
  });

export const CourseProductAssetGovernanceBatchTaskReviewRequestSchema =
  z.object({
    action: CourseProductAssetGovernanceBatchTaskReviewActionSchema,
    reason: z.string().trim().min(4).max(240),
  });

export const CourseProductAssetGovernanceBatchTaskExecuteRequestSchema = z
  .object({
    confirmExecution: z.boolean().default(false),
    reason: z.string().trim().min(4).max(240),
    note: z.string().trim().max(240).optional(),
  })
  .superRefine((request, ctx) => {
    if (!request.confirmExecution) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmExecution"],
        message: "execution requires explicit confirmation",
      });
    }
  });

export const CourseProductAssetGovernanceBatchTaskListQuerySchema =
  PaginationQuerySchema.extend({
    approvalStatus:
      CourseProductAssetGovernanceBatchTaskStatusFilterSchema.default("all"),
    executionStatus:
      CourseProductAssetGovernanceBatchTaskExecutionStatusFilterSchema.default(
        "all"
      ),
    createdBy: EntityIdSchema.optional(),
    executionRequestedBy: EntityIdSchema.optional(),
    issueFilter:
      CourseProductAssetGovernanceBatchIssueFilterSchema.default("all"),
    action: CourseProductAssetGovernanceActionSchema.optional(),
    dateFrom: DateTimeLikeSchema.optional(),
    dateTo: DateTimeLikeSchema.optional(),
    pageSize: z.number().int().min(1).max(20).default(5),
  }).superRefine((query, ctx) => {
    if (!query.dateFrom || !query.dateTo) return;
    if (query.dateFrom > query.dateTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateTo"],
        message: "dateTo must be later than dateFrom",
      });
    }
  });

export const CourseProductAssetGovernanceBatchTaskListSummarySchema = z.object({
  totalTaskCount: z.number().int().nonnegative(),
  pendingApprovalCount: z.number().int().nonnegative(),
  approvedCount: z.number().int().nonnegative(),
  rejectedCount: z.number().int().nonnegative(),
  canceledCount: z.number().int().nonnegative(),
  executionNotStartedCount: z.number().int().nonnegative().default(0),
  executionRunningCount: z.number().int().nonnegative().default(0),
  executionCompletedCount: z.number().int().nonnegative().default(0),
  executionPartiallyCompletedCount: z.number().int().nonnegative().default(0),
  executionFailedCount: z.number().int().nonnegative().default(0),
});

export const CourseProductAssetGovernanceBatchTaskListResultSchema = z.object({
  generatedAt: DateTimeLikeSchema,
  query: CourseProductAssetGovernanceBatchTaskListQuerySchema,
  summary: CourseProductAssetGovernanceBatchTaskListSummarySchema,
  items: z.array(CourseProductAssetGovernanceBatchTaskSchema),
  meta: PageMetaSchema,
});

export const CourseProductAssetGovernanceBatchTaskMutationResultSchema =
  z.object({
    task: CourseProductAssetGovernanceBatchTaskSchema,
    tasks: CourseProductAssetGovernanceBatchTaskListResultSchema,
  });

export const CourseProductAssetGovernanceBatchTaskExecutionPlanAuditPreviewSchema =
  z.object({
    action: CourseProductAssetGovernanceActionSchema,
    issueType: CourseProductAssetGovernanceIssueTypeSchema,
    reason: z.string().trim().min(1).max(240),
    before: CourseProductAssetGovernanceHistorySnapshotSchema,
    after: CourseProductAssetGovernanceHistorySnapshotSchema,
  });

export const CourseProductAssetGovernanceBatchTaskExecutionPlanItemSchema =
  z.object({
    assetId: EntityIdSchema,
    productId: EntityIdSchema.optional(),
    productTitle: z.string().trim().min(1).optional(),
    assetTitle: z.string().trim().min(1).max(120).optional(),
    assetKind: CourseProductAssetKindSchema.optional(),
    issueTypes: z
      .array(CourseProductAssetGovernanceIssueTypeSchema)
      .default([]),
    referenceCount: z.number().int().nonnegative().default(0),
    duplicateContentHashAssetIds: z.array(EntityIdSchema).default([]),
    plannedAction: CourseProductAssetGovernanceActionSchema,
    plannedIssueType: CourseProductAssetGovernanceIssueTypeSchema.optional(),
    status: CourseProductAssetGovernanceBatchTaskExecutionPlanItemStatusSchema,
    riskLevel:
      CourseProductAssetGovernanceBatchTaskExecutionPlanRiskLevelSchema,
    skipReason: z.string().trim().min(1).max(240).optional(),
    auditEventPreview:
      CourseProductAssetGovernanceBatchTaskExecutionPlanAuditPreviewSchema.optional(),
    notes: z.array(z.string().trim().min(1).max(240)).default([]),
  });

export const CourseProductAssetGovernanceBatchTaskExecutionPlanSummarySchema =
  z.object({
    taskId: EntityIdSchema,
    originalCandidateAssetCount: z.number().int().nonnegative(),
    currentCandidateAssetCount: z.number().int().nonnegative(),
    newCandidateAssetCount: z.number().int().nonnegative(),
    disappearedAssetCount: z.number().int().nonnegative(),
    changedIssueTypeCount: z.number().int().nonnegative(),
    plannedActionCount: z.number().int().nonnegative(),
    skippedActionCount: z.number().int().nonnegative(),
    estimatedAuditEventCount: z.number().int().nonnegative(),
    highRiskItemCount: z.number().int().nonnegative(),
    mediumRiskItemCount: z.number().int().nonnegative(),
    lowRiskItemCount: z.number().int().nonnegative(),
  });

export const CourseProductAssetGovernanceBatchTaskExecutionPlanResultSchema =
  z.object({
    generatedAt: DateTimeLikeSchema,
    requestedBy: EntityIdSchema,
    previewOnly: z.literal(true).default(true),
    willModifyAssetStore: z.literal(false).default(false),
    willWriteAuditEvents: z.literal(false).default(false),
    task: CourseProductAssetGovernanceBatchTaskSchema,
    summary: CourseProductAssetGovernanceBatchTaskExecutionPlanSummarySchema,
    items: z.array(
      CourseProductAssetGovernanceBatchTaskExecutionPlanItemSchema
    ),
    safetyNotes: z.array(z.string().trim().min(1).max(240)).default([]),
  });

export const CourseProductAssetGovernanceBatchTaskExecutionResultSchema =
  z.object({
    task: CourseProductAssetGovernanceBatchTaskSchema,
    tasks: CourseProductAssetGovernanceBatchTaskListResultSchema,
    executionPlan:
      CourseProductAssetGovernanceBatchTaskExecutionPlanResultSchema,
    summary: CourseProductAssetGovernanceBatchTaskExecutionSummarySchema,
    items: z
      .array(CourseProductAssetGovernanceBatchTaskExecutionItemResultSchema)
      .default([]),
    auditEvents: z.array(CourseProductAuditEventSchema).default([]),
    idempotentReplay: z.boolean().default(false),
  });

export const CourseProductAssetGovernanceBatchTaskExecutionDetailResultSchema =
  z.object({
    task: CourseProductAssetGovernanceBatchTaskSchema,
    executionPlan:
      CourseProductAssetGovernanceBatchTaskExecutionPlanResultSchema,
    summary:
      CourseProductAssetGovernanceBatchTaskExecutionSummarySchema.optional(),
    items: z
      .array(CourseProductAssetGovernanceBatchTaskExecutionItemResultSchema)
      .default([]),
    auditEvents: z.array(CourseProductAuditEventSchema).default([]),
    idempotentReplay: z.boolean().default(false),
  });

export const CourseProductAssetUploadRequestSchema = z
  .object({
    kind: CourseProductAssetKindSchema,
    title: z.string().trim().min(2).max(100),
    sourceUrl: CourseProductAssetUrlSchema,
    fileName: z.string().trim().min(2).max(160).optional(),
    mimeType: z.string().trim().min(3).max(120).optional(),
    sizeBytes: z
      .number()
      .int()
      .min(0)
      .max(COURSE_PRODUCT_ASSET_MAX_SIZE_BYTES)
      .optional(),
    usage: CourseProductMerchandisingAssetUsageSchema.optional(),
    chapterId: EntityIdSchema.optional(),
    altText: z.string().trim().max(120).optional(),
    note: z.string().trim().max(240).optional(),
    reason: z.string().trim().min(4).max(240),
  })
  .superRefine((value, ctx) => {
    if (
      (value.kind === "detail_image" || value.kind === "proof_image") &&
      !value.mimeType?.startsWith("image/") &&
      !value.sourceUrl.startsWith("data:image/")
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["mimeType"],
        message: "详情图文素材必须是图片类型",
      });
    }
  });

export const CourseProductAssetFileUploadRequestSchema = z
  .object({
    kind: CourseProductAssetKindSchema,
    title: z.string().trim().min(2).max(100),
    fileName: z.string().trim().min(2).max(160),
    mimeType: z.string().trim().min(3).max(120),
    fileBase64: z.string().trim().min(4),
    sizeBytes: z
      .number()
      .int()
      .min(0)
      .max(COURSE_PRODUCT_ASSET_MAX_SIZE_BYTES)
      .optional(),
    usage: CourseProductMerchandisingAssetUsageSchema.optional(),
    chapterId: EntityIdSchema.optional(),
    altText: z.string().trim().max(120).optional(),
    note: z.string().trim().max(240).optional(),
    reason: z.string().trim().min(4).max(240),
  })
  .superRefine((value, ctx) => {
    if (
      (value.kind === "detail_image" || value.kind === "proof_image") &&
      !value.mimeType.startsWith("image/")
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["mimeType"],
        message: "详情图文素材必须是图片类型",
      });
    }

    const base64Payload = value.fileBase64.includes(",")
      ? (value.fileBase64.split(",", 2)[1] ?? "")
      : value.fileBase64;
    const estimatedSize = Math.floor((base64Payload.length * 3) / 4);
    if (estimatedSize > COURSE_PRODUCT_ASSET_MAX_SIZE_BYTES) {
      ctx.addIssue({
        code: "custom",
        path: ["fileBase64"],
        message: "素材文件大小超过限制",
      });
    }
  });

export const CourseProductAssetComplianceUpdateRequestSchema = z.object({
  complianceStatus: z.enum(["not_required", "approved", "rejected"]),
  downloadEnabled: z.boolean().optional(),
  note: z.string().trim().max(240).optional(),
  reason: z.string().trim().min(4).max(240),
});

export const CourseProductAssetListResultSchema = z.object({
  productId: EntityIdSchema,
  items: z.array(CourseProductAssetSchema),
  summary: z.object({
    totalCount: z.number().int().nonnegative(),
    pendingCount: z.number().int().nonnegative(),
    approvedCount: z.number().int().nonnegative(),
    rejectedCount: z.number().int().nonnegative(),
  }),
});

export const CourseProductAssetMutationResultSchema = z.object({
  asset: CourseProductAssetSchema,
  assets: z.array(CourseProductAssetSchema),
  auditEvent: CourseProductAuditEventSchema,
  auditEvents: z.array(CourseProductAuditEventSchema),
});

export const CourseProductListResultSchema = z.object({
  items: z.array(CourseProductListItemSchema),
  meta: PageMetaSchema,
  summary: CourseProductListSummarySchema,
  filters: CourseProductFilterOptionsSchema,
  auditEvents: z.array(CourseProductAuditEventSchema),
  query: CourseProductListQuerySchema,
});

export const CourseProductStatusUpdateRequestSchema = z.object({
  status: CourseProductStatusSchema,
  reason: z.string().trim().min(4).max(240),
});

export const CourseProductPriceUpdateRequestSchema = z
  .object({
    amount: MoneyAmountSchema,
    originalAmount: MoneyAmountSchema.optional(),
    isFree: z.boolean(),
    memberIncluded: z.boolean().optional(),
    reason: z.string().trim().min(4).max(240),
  })
  .superRefine((value, ctx) => {
    if (value.isFree && value.amount !== 0) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "免费课程价格必须为 0",
      });
    }

    if (!value.isFree && value.amount <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "非免费课程价格必须大于 0",
      });
    }

    if (
      typeof value.originalAmount === "number" &&
      value.originalAmount < value.amount
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["originalAmount"],
        message: "原价不能小于售价",
      });
    }
  });

export const CourseProductCreatePriceSchema = z
  .object({
    amount: MoneyAmountSchema,
    originalAmount: MoneyAmountSchema.optional(),
    isFree: z.boolean(),
    memberIncluded: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.isFree && value.amount !== 0) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "免费课程价格必须为 0",
      });
    }

    if (!value.isFree && value.amount <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "非免费课程价格必须大于 0",
      });
    }

    if (
      typeof value.originalAmount === "number" &&
      value.originalAmount < value.amount
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["originalAmount"],
        message: "原价不能小于售价",
      });
    }
  });

export const CourseProductCreateRequestSchema = z.object({
  title: z.string().trim().min(2).max(80),
  coverUrl: z.string().trim().url(),
  category: CourseCategorySchema,
  type: CourseTypeSchema,
  instructorName: z.string().trim().min(1).max(40),
  learners: z.number().int().nonnegative().max(999999).default(0),
  price: CourseProductCreatePriceSchema,
  reason: z.string().trim().min(4).max(240),
});

export const CourseProductBasicInfoUpdateRequestSchema = z.object({
  title: z.string().trim().min(2).max(80),
  coverUrl: z.string().trim().url(),
  category: CourseCategorySchema,
  type: CourseTypeSchema,
  instructorName: z.string().trim().min(1).max(40),
  learners: z.number().int().nonnegative().max(999999),
  reason: z.string().trim().min(4).max(240),
});

export const CourseProductReviewActionRequestSchema = z.object({
  action: CourseProductReviewActionSchema,
  reason: z.string().trim().min(4).max(240),
});

export const CourseProductContentMaterialSchema = z.object({
  id: EntityIdSchema,
  title: z.string().trim().min(2).max(80),
  type: CourseProductContentMaterialTypeSchema,
  status: CourseProductContentMaterialStatusSchema.default("pending"),
  assetId: z.string().trim().min(1).max(120).optional(),
  assetUrl: CourseProductAssetUrlSchema.optional(),
  uploadedBy: EntityIdSchema.optional(),
  uploadedAt: DateTimeLikeSchema.optional(),
  complianceStatus:
    CourseProductContentAssetReviewStatusSchema.default("not_required"),
  downloadEnabled: z.boolean().default(false),
  note: z.string().trim().max(200).optional(),
});

export const CourseProductContentChapterSchema = z.object({
  id: EntityIdSchema,
  title: z.string().trim().min(2).max(80),
  durationMinutes: z.number().int().min(1).max(600),
  materialPlaceholders: z
    .array(CourseProductContentMaterialSchema)
    .max(20)
    .default([]),
});

export const CourseProductMerchandisingAssetSchema = z.object({
  id: EntityIdSchema,
  title: z.string().trim().min(2).max(80),
  imageUrl: CourseProductAssetUrlSchema,
  altText: z.string().trim().max(120).optional(),
  usage: CourseProductMerchandisingAssetUsageSchema.default("gallery"),
  complianceStatus:
    CourseProductContentAssetReviewStatusSchema.default("not_required"),
  note: z.string().trim().max(200).optional(),
});

export const CourseProductMerchandisingContentSchema = z
  .object({
    headline: z.string().trim().min(6).max(100).optional(),
    subheadline: z.string().trim().min(10).max(240).optional(),
    showcaseImageUrl: CourseProductAssetUrlSchema.optional(),
    showcaseImageAlt: z.string().trim().max(120).optional(),
    sellingPoints: z
      .array(z.string().trim().min(4).max(120))
      .max(6)
      .default([]),
    imageAssets: z
      .array(CourseProductMerchandisingAssetSchema)
      .max(8)
      .default([]),
  })
  .default({
    sellingPoints: [],
    imageAssets: [],
  });

export const CourseProductDetailContentSchema = z.object({
  productId: EntityIdSchema,
  summary: z.string().trim().min(20).max(500),
  targetAudience: z.array(z.string().trim().min(2).max(80)).min(1).max(8),
  merchandising: CourseProductMerchandisingContentSchema,
  chapters: z.array(CourseProductContentChapterSchema).min(1).max(60),
  updatedAt: DateTimeLikeSchema,
});

export const CourseProductContentUpdateRequestSchema =
  CourseProductDetailContentSchema.omit({
    productId: true,
    updatedAt: true,
  }).extend({
    reason: z.string().trim().min(4).max(240),
  });

export const CourseProductContentQualityIssueSchema = z.object({
  code: CourseProductContentQualityIssueCodeSchema,
  severity: CourseProductContentQualitySeveritySchema,
  message: z.string().min(1),
  path: z.string().optional(),
});

export const CourseProductContentQualityResultSchema = z.object({
  ready: z.boolean(),
  issueCount: z.number().int().nonnegative(),
  blockingCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
  issues: z.array(CourseProductContentQualityIssueSchema),
});

export const CourseProductContentQualityItemSchema = z.object({
  productId: EntityIdSchema,
  productTitle: z.string().min(2),
  status: CourseProductStatusSchema,
  reviewStatus: CourseProductReviewStatusSchema,
  quality: CourseProductContentQualityResultSchema,
});

export const CourseProductContentQualityBatchResultSchema = z.object({
  items: z.array(CourseProductContentQualityItemSchema),
  summary: z.object({
    totalCount: z.number().int().nonnegative(),
    readyCount: z.number().int().nonnegative(),
    blockedCount: z.number().int().nonnegative(),
    warningCount: z.number().int().nonnegative(),
  }),
});

export const CourseProductContentMutationResultSchema = z.object({
  product: CourseProductListItemSchema,
  content: CourseProductDetailContentSchema,
  auditEvent: CourseProductAuditEventSchema,
  auditEvents: z.array(CourseProductAuditEventSchema),
});

export const CourseProductMutationResultSchema = z.object({
  product: CourseProductListItemSchema,
  auditEvent: CourseProductAuditEventSchema,
  auditEvents: z.array(CourseProductAuditEventSchema),
});

export const courseProductFilterOptions = {
  categories: [...COURSE_CATEGORIES],
  types: [...COURSE_TYPES],
  statuses: [...COURSE_PRODUCT_STATUSES],
} satisfies z.infer<typeof CourseProductFilterOptionsSchema>;

export function evaluateCourseProductContentQuality(
  content: CourseProductDetailContent
): CourseProductContentQualityResult {
  const normalized = CourseProductDetailContentSchema.parse(content);
  const issues: CourseProductContentQualityIssue[] = [];
  const addIssue = (issue: CourseProductContentQualityIssue) => {
    issues.push(CourseProductContentQualityIssueSchema.parse(issue));
  };

  if (normalized.summary.trim().length < 40) {
    addIssue({
      code: "summary_too_short",
      severity: "blocking",
      message: "课程摘要需要至少 40 个字，才能支撑审核判断。",
      path: "summary",
    });
  }

  if (normalized.targetAudience.length < 2) {
    addIssue({
      code: "audience_too_few",
      severity: "blocking",
      message: "适合人群至少需要 2 条，方便前台用户判断是否匹配。",
      path: "targetAudience",
    });
  }

  const hasShowcaseImage =
    Boolean(normalized.merchandising.showcaseImageUrl) ||
    normalized.merchandising.imageAssets.some(
      asset => asset.usage === "showcase"
    );
  if (!hasShowcaseImage) {
    addIssue({
      code: "merchandising_image_missing",
      severity: "warning",
      message: "课程详情建议配置成交主视觉，提升商品介绍的吸引力。",
      path: "merchandising.showcaseImageUrl",
    });
  }

  if (normalized.merchandising.sellingPoints.length < 2) {
    addIssue({
      code: "merchandising_points_missing",
      severity: "warning",
      message: "课程详情建议至少配置 2 条成交卖点，减少用户购买前的理解成本。",
      path: "merchandising.sellingPoints",
    });
  }

  const pendingMerchandisingAssetCount =
    normalized.merchandising.imageAssets.filter(
      asset =>
        asset.complianceStatus === "pending" ||
        asset.complianceStatus === "rejected"
    ).length;
  if (pendingMerchandisingAssetCount > 0) {
    addIssue({
      code: "merchandising_asset_pending",
      severity: "warning",
      message: `课程成交图文还有 ${pendingMerchandisingAssetCount} 个素材待合规确认。`,
      path: "merchandising.imageAssets",
    });
  }

  if (normalized.chapters.length < 2) {
    addIssue({
      code: "chapters_too_few",
      severity: "blocking",
      message: "课程至少需要 2 个章节，避免商品内容过薄。",
      path: "chapters",
    });
  }

  normalized.chapters.forEach((chapter, chapterIndex) => {
    const chapterPath = `chapters.${chapterIndex}`;

    if (chapter.durationMinutes < 10) {
      addIssue({
        code: "chapter_duration_too_short",
        severity: "blocking",
        message: `「${chapter.title}」时长少于 10 分钟，请补齐课程设计。`,
        path: `${chapterPath}.durationMinutes`,
      });
    }

    if (chapter.materialPlaceholders.length < 1) {
      addIssue({
        code: "chapter_material_missing",
        severity: "blocking",
        message: `「${chapter.title}」至少需要 1 个素材占位。`,
        path: `${chapterPath}.materialPlaceholders`,
      });
      return;
    }

    const pendingCount = chapter.materialPlaceholders.filter(
      material => material.status !== "ready"
    ).length;
    if (pendingCount > 0) {
      addIssue({
        code: "material_pending",
        severity: "warning",
        message: `「${chapter.title}」还有 ${pendingCount} 个素材未标记就绪。`,
        path: `${chapterPath}.materialPlaceholders`,
      });
    }
  });

  const blockingCount = issues.filter(
    issue => issue.severity === "blocking"
  ).length;
  const warningCount = issues.length - blockingCount;

  return CourseProductContentQualityResultSchema.parse({
    ready: blockingCount === 0,
    issueCount: issues.length,
    blockingCount,
    warningCount,
    issues,
  });
}

export type CourseProductStatus = z.infer<typeof CourseProductStatusSchema>;
export type CourseProductReviewStatus = z.infer<
  typeof CourseProductReviewStatusSchema
>;
export type CourseProductSort = z.infer<typeof CourseProductSortSchema>;
export type CourseProductAuditAction = z.infer<
  typeof CourseProductAuditActionSchema
>;
export type CourseProductReviewAction = z.infer<
  typeof CourseProductReviewActionSchema
>;
export type CourseProductPrice = z.infer<typeof CourseProductPriceSchema>;
export type CourseProductListItem = z.infer<typeof CourseProductListItemSchema>;
export type CourseProductListQuery = z.infer<
  typeof CourseProductListQuerySchema
>;
export type CourseProductListSummary = z.infer<
  typeof CourseProductListSummarySchema
>;
export type CourseProductAuditEvent = z.infer<
  typeof CourseProductAuditEventSchema
>;
export type CourseProductFilterOptions = z.infer<
  typeof CourseProductFilterOptionsSchema
>;
export type CourseProductListResult = z.infer<
  typeof CourseProductListResultSchema
>;
export type CourseProductStatusUpdateRequest = z.infer<
  typeof CourseProductStatusUpdateRequestSchema
>;
export type CourseProductPriceUpdateRequest = z.infer<
  typeof CourseProductPriceUpdateRequestSchema
>;
export type CourseProductCreatePrice = z.infer<
  typeof CourseProductCreatePriceSchema
>;
export type CourseProductCreateRequest = z.infer<
  typeof CourseProductCreateRequestSchema
>;
export type CourseProductBasicInfoUpdateRequest = z.infer<
  typeof CourseProductBasicInfoUpdateRequestSchema
>;
export type CourseProductReviewActionRequest = z.infer<
  typeof CourseProductReviewActionRequestSchema
>;
export type CourseProductContentMaterialType = z.infer<
  typeof CourseProductContentMaterialTypeSchema
>;
export type CourseProductContentMaterialStatus = z.infer<
  typeof CourseProductContentMaterialStatusSchema
>;
export type CourseProductContentAssetReviewStatus = z.infer<
  typeof CourseProductContentAssetReviewStatusSchema
>;
export type CourseProductAssetKind = z.infer<
  typeof CourseProductAssetKindSchema
>;
export type CourseProductAssetSourceType = z.infer<
  typeof CourseProductAssetSourceTypeSchema
>;
export type CourseProductAssetStorageProvider = z.infer<
  typeof CourseProductAssetStorageProviderSchema
>;
export type CourseProductAssetReferenceType = z.infer<
  typeof CourseProductAssetReferenceTypeSchema
>;
export type CourseProductAssetBackfillSource = z.infer<
  typeof CourseProductAssetBackfillSourceSchema
>;
export type CourseProductAssetBackfillAction = z.infer<
  typeof CourseProductAssetBackfillActionSchema
>;
export type CourseProductAssetGovernanceIssueType = z.infer<
  typeof CourseProductAssetGovernanceIssueTypeSchema
>;
export type CourseProductAssetGovernanceReferenceSource = z.infer<
  typeof CourseProductAssetGovernanceReferenceSourceSchema
>;
export type CourseProductAssetGovernanceAction = z.infer<
  typeof CourseProductAssetGovernanceActionSchema
>;
export type CourseProductAssetGovernanceBatchIssueFilter = z.infer<
  typeof CourseProductAssetGovernanceBatchIssueFilterSchema
>;
export type CourseProductAssetGovernanceBatchTaskStatus = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskStatusSchema
>;
export type CourseProductAssetGovernanceBatchTaskStatusFilter = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskStatusFilterSchema
>;
export type CourseProductAssetGovernanceBatchTaskReviewAction = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskReviewActionSchema
>;
export type CourseProductAssetGovernanceBatchTaskExecutionStatus = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskExecutionStatusSchema
>;
export type CourseProductAssetGovernanceBatchTaskExecutionStatusFilter =
  z.infer<
    typeof CourseProductAssetGovernanceBatchTaskExecutionStatusFilterSchema
  >;
export type CourseProductAssetGovernanceBatchTaskExecutionItemStatus = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskExecutionItemStatusSchema
>;
export type CourseProductAssetGovernanceBatchTaskExecutionPlanItemStatus =
  z.infer<
    typeof CourseProductAssetGovernanceBatchTaskExecutionPlanItemStatusSchema
  >;
export type CourseProductAssetGovernanceBatchTaskExecutionPlanRiskLevel =
  z.infer<
    typeof CourseProductAssetGovernanceBatchTaskExecutionPlanRiskLevelSchema
  >;
export type CourseProductAssetGovernanceBatchTaskExecutionJobStatus = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskExecutionJobStatusSchema
>;
export type CourseProductAssetObjectDescriptor = z.infer<
  typeof CourseProductAssetObjectDescriptorSchema
>;
export type CourseProductAssetSignedReadUrl = z.infer<
  typeof CourseProductAssetSignedReadUrlSchema
>;
export type CourseProductAssetObjectDeleteResult = z.infer<
  typeof CourseProductAssetObjectDeleteResultSchema
>;
export type CourseProductAsset = z.infer<typeof CourseProductAssetSchema>;
export type CourseProductAssetReference = z.infer<
  typeof CourseProductAssetReferenceSchema
>;
export type CourseProductAssetBackfillPlan = z.infer<
  typeof CourseProductAssetBackfillPlanSchema
>;
export type CourseProductAssetBackfillRequest = z.infer<
  typeof CourseProductAssetBackfillRequestSchema
>;
export type CourseProductAssetBackfillMutationResult = z.infer<
  typeof CourseProductAssetBackfillMutationResultSchema
>;
export type CourseProductAssetGovernanceProductSummary = z.infer<
  typeof CourseProductAssetGovernanceProductSummarySchema
>;
export type CourseProductAssetGovernanceItem = z.infer<
  typeof CourseProductAssetGovernanceItemSchema
>;
export type CourseProductAssetGovernanceSummary = z.infer<
  typeof CourseProductAssetGovernanceSummarySchema
>;
export type CourseProductAssetGovernanceResult = z.infer<
  typeof CourseProductAssetGovernanceResultSchema
>;
export type CourseProductAssetGovernanceActionRequest = z.infer<
  typeof CourseProductAssetGovernanceActionRequestSchema
>;
export type CourseProductAssetGovernanceActionResult = z.infer<
  typeof CourseProductAssetGovernanceActionResultSchema
>;
export type CourseProductLearningMaterialOperationsReportProductRow = z.infer<
  typeof CourseProductLearningMaterialOperationsReportProductRowSchema
>;
export type CourseProductLearningMaterialOperationsReportSummary = z.infer<
  typeof CourseProductLearningMaterialOperationsReportSummarySchema
>;
export type CourseProductLearningMaterialOperationsReport = z.infer<
  typeof CourseProductLearningMaterialOperationsReportSchema
>;
export type CourseProductAssetGovernanceHistoryQuery = z.infer<
  typeof CourseProductAssetGovernanceHistoryQuerySchema
>;
export type CourseProductAssetGovernanceHistorySnapshot = z.infer<
  typeof CourseProductAssetGovernanceHistorySnapshotSchema
>;
export type CourseProductAssetGovernanceHistoryItem = z.infer<
  typeof CourseProductAssetGovernanceHistoryItemSchema
>;
export type CourseProductAssetGovernanceHistoryResult = z.infer<
  typeof CourseProductAssetGovernanceHistoryResultSchema
>;
export type CourseProductAssetGovernanceBatchDraftQuery = z.infer<
  typeof CourseProductAssetGovernanceBatchDraftQuerySchema
>;
export type CourseProductAssetGovernanceBatchDraftAction = z.infer<
  typeof CourseProductAssetGovernanceBatchDraftActionSchema
>;
export type CourseProductAssetGovernanceBatchDraftItem = z.infer<
  typeof CourseProductAssetGovernanceBatchDraftItemSchema
>;
export type CourseProductAssetGovernanceBatchDraftResult = z.infer<
  typeof CourseProductAssetGovernanceBatchDraftResultSchema
>;
export type CourseProductAssetGovernanceBatchTask = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskSchema
>;
export type CourseProductAssetGovernanceBatchTaskExecutionJob = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskExecutionJobSchema
>;
export type CourseProductAssetGovernanceBatchTaskQueueObservationQuery =
  z.infer<
    typeof CourseProductAssetGovernanceBatchTaskQueueObservationQuerySchema
  >;
export type CourseProductAssetGovernanceBatchTaskQueueObservationItem = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskQueueObservationItemSchema
>;
export type CourseProductAssetGovernanceBatchTaskQueueObservationSummary =
  z.infer<
    typeof CourseProductAssetGovernanceBatchTaskQueueObservationSummarySchema
  >;
export type CourseProductAssetGovernanceBatchTaskQueueObservationResult =
  z.infer<
    typeof CourseProductAssetGovernanceBatchTaskQueueObservationResultSchema
  >;
export type CourseProductAssetGovernanceBatchActionPlanActionFilter = z.infer<
  typeof CourseProductAssetGovernanceBatchActionPlanActionFilterSchema
>;
export type CourseProductAssetGovernanceBatchActionPlanQuery = z.infer<
  typeof CourseProductAssetGovernanceBatchActionPlanQuerySchema
>;
export type CourseProductAssetGovernanceBatchActionPlanAsset = z.infer<
  typeof CourseProductAssetGovernanceBatchActionPlanAssetSchema
>;
export type CourseProductAssetGovernanceDuplicateMergeReference = z.infer<
  typeof CourseProductAssetGovernanceDuplicateMergeReferenceSchema
>;
export type CourseProductAssetGovernanceDuplicateGroupPlan = z.infer<
  typeof CourseProductAssetGovernanceDuplicateGroupPlanSchema
>;
export type CourseProductAssetGovernanceSoftDeleteImpactPlan = z.infer<
  typeof CourseProductAssetGovernanceSoftDeleteImpactPlanSchema
>;
export type CourseProductAssetGovernanceBatchActionPlanSummary = z.infer<
  typeof CourseProductAssetGovernanceBatchActionPlanSummarySchema
>;
export type CourseProductAssetGovernanceBatchActionPlanResult = z.infer<
  typeof CourseProductAssetGovernanceBatchActionPlanResultSchema
>;
export type CourseProductAssetGovernanceBatchTaskReviewSummary = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskReviewSummarySchema
>;
export type CourseProductAssetGovernanceBatchTaskApprovalPreflight = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskApprovalPreflightSchema
>;
export type CourseProductAssetGovernanceBatchTaskExecutionItemResult = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskExecutionItemResultSchema
>;
export type CourseProductAssetGovernanceBatchTaskExecutionSummary = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskExecutionSummarySchema
>;
export type CourseProductAssetGovernanceBatchTaskCreateRequest = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskCreateRequestSchema
>;
export type CourseProductAssetGovernanceBatchTaskCancelRequest = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskCancelRequestSchema
>;
export type CourseProductAssetGovernanceBatchTaskReviewRequest = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskReviewRequestSchema
>;
export type CourseProductAssetGovernanceBatchTaskExecuteRequest = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskExecuteRequestSchema
>;
export type CourseProductAssetGovernanceBatchTaskListQuery = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskListQuerySchema
>;
export type CourseProductAssetGovernanceBatchTaskListResult = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskListResultSchema
>;
export type CourseProductAssetGovernanceBatchTaskMutationResult = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskMutationResultSchema
>;
export type CourseProductAssetGovernanceBatchTaskExecutionPlanAuditPreview =
  z.infer<
    typeof CourseProductAssetGovernanceBatchTaskExecutionPlanAuditPreviewSchema
  >;
export type CourseProductAssetGovernanceBatchTaskExecutionPlanItem = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskExecutionPlanItemSchema
>;
export type CourseProductAssetGovernanceBatchTaskExecutionPlanSummary = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskExecutionPlanSummarySchema
>;
export type CourseProductAssetGovernanceBatchTaskExecutionPlanResult = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskExecutionPlanResultSchema
>;
export type CourseProductAssetGovernanceBatchTaskExecutionResult = z.infer<
  typeof CourseProductAssetGovernanceBatchTaskExecutionResultSchema
>;
export type CourseProductAssetGovernanceBatchTaskExecutionDetailResult =
  z.infer<
    typeof CourseProductAssetGovernanceBatchTaskExecutionDetailResultSchema
  >;
export type CourseProductAssetUploadRequest = z.infer<
  typeof CourseProductAssetUploadRequestSchema
>;
export type CourseProductAssetFileUploadRequest = z.infer<
  typeof CourseProductAssetFileUploadRequestSchema
>;
export type CourseProductAssetComplianceUpdateRequest = z.infer<
  typeof CourseProductAssetComplianceUpdateRequestSchema
>;
export type CourseProductAssetListResult = z.infer<
  typeof CourseProductAssetListResultSchema
>;
export type CourseProductAssetMutationResult = z.infer<
  typeof CourseProductAssetMutationResultSchema
>;
export type CourseProductMerchandisingAssetUsage = z.infer<
  typeof CourseProductMerchandisingAssetUsageSchema
>;
export type CourseProductContentQualityIssueCode = z.infer<
  typeof CourseProductContentQualityIssueCodeSchema
>;
export type CourseProductContentQualitySeverity = z.infer<
  typeof CourseProductContentQualitySeveritySchema
>;
export type CourseProductContentMaterial = z.infer<
  typeof CourseProductContentMaterialSchema
>;
export type CourseProductContentChapter = z.infer<
  typeof CourseProductContentChapterSchema
>;
export type CourseProductMerchandisingAsset = z.infer<
  typeof CourseProductMerchandisingAssetSchema
>;
export type CourseProductMerchandisingContent = z.infer<
  typeof CourseProductMerchandisingContentSchema
>;
export type CourseProductDetailContent = z.infer<
  typeof CourseProductDetailContentSchema
>;
export type CourseProductContentUpdateRequest = z.infer<
  typeof CourseProductContentUpdateRequestSchema
>;
export type CourseProductContentQualityIssue = z.infer<
  typeof CourseProductContentQualityIssueSchema
>;
export type CourseProductContentQualityResult = z.infer<
  typeof CourseProductContentQualityResultSchema
>;
export type CourseProductContentQualityItem = z.infer<
  typeof CourseProductContentQualityItemSchema
>;
export type CourseProductContentQualityBatchResult = z.infer<
  typeof CourseProductContentQualityBatchResultSchema
>;
export type CourseProductContentMutationResult = z.infer<
  typeof CourseProductContentMutationResultSchema
>;
export type CourseProductMutationResult = z.infer<
  typeof CourseProductMutationResultSchema
>;
