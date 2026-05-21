import { randomUUID } from "crypto";
import {
  CourseProductAssetGovernanceActionRequestSchema,
  CourseProductAssetGovernanceActionResultSchema,
  CourseProductAssetSchema,
  CourseProductAuditEventSchema,
  type CourseProductAsset,
  type CourseProductAssetGovernanceActionRequest,
  type CourseProductAssetGovernanceItem,
  type CourseProductAuditEvent,
  type CourseProductListItem,
} from "../../../shared/domain";
import {
  getCourseProductAssetStore,
  type CourseProductAssetStore,
} from "./courseProductAssetStore";
import {
  getCourseProductContentStore,
  type CourseProductContentStore,
} from "./courseProductContentStore";
import {
  getCourseProductStore,
  type CourseProductStore,
} from "./courseProductStore";
import { getCourseProductAssetGovernance } from "./courseProductAssetGovernance";

export async function applyCourseProductAssetGovernanceAction({
  productId,
  assetId,
  request,
  actorId,
  actorRoles = [],
  productStore = getCourseProductStore(),
  contentStore = getCourseProductContentStore(),
  assetStore = getCourseProductAssetStore(),
  now = new Date().toISOString(),
}: {
  productId: string;
  assetId: string;
  request: CourseProductAssetGovernanceActionRequest;
  actorId: string;
  actorRoles?: string[];
  productStore?: CourseProductStore;
  contentStore?: CourseProductContentStore;
  assetStore?: CourseProductAssetStore;
  now?: string;
}) {
  const parsed = CourseProductAssetGovernanceActionRequestSchema.parse(request);
  const product = await productStore.getProduct(productId);
  if (!product) throw new Error("COURSE_PRODUCT_NOT_FOUND");

  const current = await assetStore.getAsset(assetId);
  if (!current || current.productId !== productId) {
    throw new Error("COURSE_PRODUCT_ASSET_NOT_FOUND");
  }

  const governance = await getCourseProductAssetGovernance({
    productStore,
    contentStore,
    assetStore,
    now,
  });
  const governanceItem = governance.items.find(item => item.asset.id === assetId);
  if (!governanceItem) throw new Error("COURSE_PRODUCT_ASSET_NOT_FOUND");
  if (!governanceItem.issueTypes.includes(parsed.issueType)) {
    throw new Error("COURSE_PRODUCT_ASSET_GOVERNANCE_ISSUE_MISMATCH");
  }

  validateGovernanceAction(parsed, governanceItem);

  const next = CourseProductAssetSchema.parse({
    ...current,
    note: nextGovernanceNote(current, parsed),
    deletedAt:
      parsed.action === "mark_soft_deleted" ? now : current.deletedAt,
    downloadEnabled:
      parsed.action === "mark_soft_deleted" ? false : current.downloadEnabled,
    updatedAt: now,
  });
  const saved = await assetStore.saveAsset(next);
  const auditEvent = await productStore.appendAuditEvent(
    createAssetGovernanceAuditEvent({
      product,
      current,
      saved,
      governanceItem,
      request: parsed,
      actorId,
      actorRoles,
      now,
    })
  );

  return CourseProductAssetGovernanceActionResultSchema.parse({
    asset: saved,
    governance: await getCourseProductAssetGovernance({
      productStore,
      contentStore,
      assetStore,
      now,
    }),
    auditEvent,
  });
}

function validateGovernanceAction(
  request: CourseProductAssetGovernanceActionRequest,
  item: CourseProductAssetGovernanceItem
) {
  if (request.action === "mark_duplicate_primary") {
    const primaryAssetId = request.primaryAssetId;
    const duplicateGroup = [
      item.asset.id,
      ...item.duplicateContentHashAssetIds,
    ];
    if (!primaryAssetId || !duplicateGroup.includes(primaryAssetId)) {
      throw new Error("COURSE_PRODUCT_ASSET_GOVERNANCE_PRIMARY_INVALID");
    }
  }

  if (request.action === "mark_soft_deleted") {
    if (!item.softDeleteCandidate || item.referenceCount > 0) {
      throw new Error("COURSE_PRODUCT_ASSET_GOVERNANCE_SOFT_DELETE_FORBIDDEN");
    }
  }
}

function nextGovernanceNote(
  asset: CourseProductAsset,
  request: CourseProductAssetGovernanceActionRequest
) {
  const note = request.note?.trim() || request.reason;
  const actionLabel = governanceActionLabel(request);
  const governanceNote = `治理:${actionLabel};${note}`.slice(0, 240);
  if (!asset.note?.trim()) return governanceNote;
  const combined = `${asset.note.trim()} | ${governanceNote}`;
  return combined.length <= 240 ? combined : governanceNote;
}

function createAssetGovernanceAuditEvent({
  product,
  current,
  saved,
  governanceItem,
  request,
  actorId,
  actorRoles,
  now,
}: {
  product: CourseProductListItem;
  current: CourseProductAsset;
  saved: CourseProductAsset;
  governanceItem: CourseProductAssetGovernanceItem;
  request: CourseProductAssetGovernanceActionRequest;
  actorId: string;
  actorRoles: string[];
  now: string;
}): CourseProductAuditEvent {
  return CourseProductAuditEventSchema.parse({
    id: [
      "audit_asset_governance",
      safeSegment(product.id),
      safeSegment(current.id),
      safeTimeId(now),
      randomUUID().slice(0, 8),
    ].join("_"),
    productId: product.id,
    productTitle: product.title,
    actorId,
    action: "asset_governance",
    reason: request.reason,
    before: pickGovernanceAuditFields(
      current,
      governanceItem,
      request,
      actorRoles
    ),
    after: pickGovernanceAuditFields(
      saved,
      governanceItem,
      request,
      actorRoles
    ),
    createdAt: now,
  });
}

function pickGovernanceAuditFields(
  asset: CourseProductAsset,
  item: CourseProductAssetGovernanceItem,
  request: CourseProductAssetGovernanceActionRequest,
  actorRoles: string[]
) {
  return {
    assetId: asset.id,
    productId: asset.productId,
    title: asset.title,
    kind: asset.kind,
    governanceAction: request.action,
    issueType: request.issueType,
    actorRoles,
    primaryAssetId: request.primaryAssetId,
    referenceCount: item.referenceCount,
    duplicateContentHashAssetIds: item.duplicateContentHashAssetIds,
    complianceStatus: asset.complianceStatus,
    downloadEnabled: asset.downloadEnabled,
    deletedAt: asset.deletedAt,
    note: asset.note,
  };
}

function governanceActionLabel(request: CourseProductAssetGovernanceActionRequest) {
  if (request.action === "mark_duplicate_primary") {
    return `保留主素材:${request.primaryAssetId}`;
  }
  if (request.action === "mark_soft_deleted") return "软删除确认";
  return "问题已记录";
}

function safeSegment(value: string) {
  return value.replace(/[^0-9A-Za-z_]/g, "_");
}

function safeTimeId(value: string) {
  return value.replace(/[^0-9A-Za-z]/g, "").slice(0, 24);
}
