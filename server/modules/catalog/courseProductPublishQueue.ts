import { createHash } from "crypto";
import {
  CourseProductListQuerySchema,
  CourseProductPublishQueueBatchTaskCreateRequestSchema,
  CourseProductPublishQueueBatchTaskListQuerySchema,
  CourseProductPublishQueueBatchTaskListResultSchema,
  CourseProductPublishQueueBatchTaskMutationResultSchema,
  CourseProductPublishQueueBatchTaskSchema,
  CourseProductPublishQueueResultSchema,
  type CourseProductContentQualityResult,
  type CourseProductListItem,
  type CourseProductListQuery,
  type CourseProductPublishQueueAction,
  type CourseProductPublishQueueBatchTask,
  type CourseProductPublishQueueBatchTaskCreateRequest,
  type CourseProductPublishQueueBatchTaskListQuery,
  type CourseProductPublishQueueCandidate,
  type CourseProductPublishQueueGroupId,
  type CourseProductPublishQueueResult,
  type CourseProductPublishQueueRisk,
} from "../../../shared/domain";
import {
  getCourseProductContentStore,
  listCourseProductContentQuality,
  type CourseProductContentStore,
} from "./courseProductContentStore";
import {
  getCourseProductStore,
  listCourseProductsByQuery,
  type CourseProductStore,
} from "./courseProductStore";
import {
  getCourseProductPublishQueueBatchTaskStore,
  type CourseProductPublishQueueBatchTaskStore,
} from "./courseProductPublishQueueTaskStore";

const PUBLISH_QUEUE_PAGE_SIZE = 50;
const PUBLISH_QUEUE_GROUP_ORDER: CourseProductPublishQueueGroupId[] = [
  "content_blocked",
  "ready_to_submit",
  "pending_review",
  "approved_unpublished",
  "published_watch",
];

const groupDefinitions: Record<
  CourseProductPublishQueueGroupId,
  {
    label: string;
    description: string;
    workspaceStep: "content" | "publish";
    risk: CourseProductPublishQueueRisk;
    recommendedAction: CourseProductPublishQueueAction;
  }
> = {
  content_blocked: {
    label: "待补内容",
    description: "内容质量仍有阻塞项，暂不适合批量进入审核。",
    workspaceStep: "content",
    risk: "high",
    recommendedAction: "quality_recheck",
  },
  ready_to_submit: {
    label: "待提交审核",
    description: "内容已达标，可进入提交审核候选池。",
    workspaceStep: "publish",
    risk: "low",
    recommendedAction: "submit_review",
  },
  pending_review: {
    label: "待审核",
    description: "已进入审核流，需要人工判断通过或驳回。",
    workspaceStep: "publish",
    risk: "medium",
    recommendedAction: "review_followup",
  },
  approved_unpublished: {
    label: "待上架",
    description: "已审核通过但尚未前台可售，可作为上架候选。",
    workspaceStep: "publish",
    risk: "medium",
    recommendedAction: "publish",
  },
  published_watch: {
    label: "已上架复查",
    description: "已前台可售但仍有内容提醒，建议复查成交素材。",
    workspaceStep: "publish",
    risk: "medium",
    recommendedAction: "quality_recheck",
  },
};

export async function getCourseProductPublishQueue({
  query,
  productStore = getCourseProductStore(),
  contentStore = getCourseProductContentStore(),
  now = new Date().toISOString(),
}: {
  query?: Partial<CourseProductListQuery>;
  productStore?: CourseProductStore;
  contentStore?: CourseProductContentStore;
  now?: string;
} = {}): Promise<CourseProductPublishQueueResult> {
  const parsedQuery = parseQueueQuery(query);
  const scopedProducts = await listScopedProducts({
    query: parsedQuery,
    productStore,
  });
  const contentQuality = await listCourseProductContentQuality({
    productStore,
    contentStore,
    now,
  });
  const qualityByProductId = new Map(
    contentQuality.items.map(item => [item.productId, item.quality])
  );

  return buildPublishQueueResult({
    products: scopedProducts,
    qualityByProductId,
    query: parsedQuery,
    now,
  });
}

export async function listCourseProductPublishQueueBatchTasks({
  query,
  store = getCourseProductPublishQueueBatchTaskStore(),
  now = new Date().toISOString(),
}: {
  query?: Partial<CourseProductPublishQueueBatchTaskListQuery>;
  store?: CourseProductPublishQueueBatchTaskStore;
  now?: string;
} = {}) {
  const parsedQuery = CourseProductPublishQueueBatchTaskListQuerySchema.parse(
    query ?? {}
  );
  const allTasks = await store.listTasks();
  const filteredTasks = allTasks.filter(task =>
    matchesBatchTaskListQuery(task, parsedQuery)
  );
  const totalPages =
    filteredTasks.length === 0
      ? 0
      : Math.ceil(filteredTasks.length / parsedQuery.pageSize);
  const page = Math.min(parsedQuery.page, Math.max(1, totalPages || 1));
  const start = (page - 1) * parsedQuery.pageSize;

  return CourseProductPublishQueueBatchTaskListResultSchema.parse({
    generatedAt: now,
    query: {
      ...parsedQuery,
      page,
    },
    summary: {
      totalTaskCount: allTasks.length,
      draftCount: allTasks.filter(task => task.status === "draft").length,
      pendingApprovalCount: allTasks.filter(
        task => task.status === "pending_approval"
      ).length,
      approvedCount: allTasks.filter(task => task.status === "approved").length,
      rejectedCount: allTasks.filter(task => task.status === "rejected").length,
      canceledCount: allTasks.filter(task => task.status === "canceled").length,
    },
    items: filteredTasks.slice(start, start + parsedQuery.pageSize),
    meta: {
      page,
      pageSize: parsedQuery.pageSize,
      total: filteredTasks.length,
      totalPages,
    },
  });
}

export async function createCourseProductPublishQueueBatchTask({
  request,
  actorId,
  actorRoles = [],
  productStore = getCourseProductStore(),
  contentStore = getCourseProductContentStore(),
  taskStore = getCourseProductPublishQueueBatchTaskStore(),
  now = new Date().toISOString(),
}: {
  request: CourseProductPublishQueueBatchTaskCreateRequest;
  actorId: string;
  actorRoles?: string[];
  productStore?: CourseProductStore;
  contentStore?: CourseProductContentStore;
  taskStore?: CourseProductPublishQueueBatchTaskStore;
  now?: string;
}) {
  const parsed =
    CourseProductPublishQueueBatchTaskCreateRequestSchema.parse(request);
  const preview = await getCourseProductPublishQueue({
    query: parsed.query,
    productStore,
    contentStore,
    now,
  });
  const candidateSnapshot = candidatesForAction(preview, parsed.action);
  if (candidateSnapshot.length === 0) {
    throw new Error("COURSE_PRODUCT_PUBLISH_QUEUE_BATCH_TASK_EMPTY");
  }

  const dedupeKey = batchTaskDedupeKey({
    action: parsed.action,
    query: preview.query,
    candidateSnapshot,
  });
  const existingDraft = (await taskStore.listTasks()).find(
    task =>
      task.status === "draft" &&
      batchTaskDedupeKey({
        action: task.action,
        query: task.query,
        candidateSnapshot: task.candidateSnapshot,
      }) === dedupeKey
  );
  if (existingDraft) {
    throw new Error("COURSE_PRODUCT_PUBLISH_QUEUE_BATCH_TASK_DUPLICATE");
  }

  const actionPlan = preview.actions.find(
    action => action.id === parsed.action
  );
  const task = await taskStore.saveTask(
    CourseProductPublishQueueBatchTaskSchema.parse({
      id: createBatchTaskId(now, dedupeKey),
      action: parsed.action,
      status: "draft",
      query: preview.query,
      reason: parsed.reason,
      note: parsed.note,
      previewOnly: true,
      executable: false,
      createdBy: actorId,
      createdByRoles: actorRoles,
      candidateCount: candidateSnapshot.length,
      blockerCount: actionPlan?.blockerCount ?? preview.summary.blockerCount,
      riskSummary: summarizeCandidateRisk(candidateSnapshot),
      candidateSnapshot,
      safetyNotes: preview.safetyNotes,
      createdAt: now,
      updatedAt: now,
    })
  );

  return CourseProductPublishQueueBatchTaskMutationResultSchema.parse({
    task,
    tasks: await listCourseProductPublishQueueBatchTasks({
      query: { pageSize: 5 },
      store: taskStore,
      now,
    }),
  });
}

function parseQueueQuery(query?: Partial<CourseProductListQuery>) {
  const parsed = CourseProductListQuerySchema.parse(query ?? {});
  return CourseProductListQuerySchema.parse({
    ...parsed,
    page: 1,
    pageSize: PUBLISH_QUEUE_PAGE_SIZE,
  });
}

async function listScopedProducts({
  query,
  productStore,
}: {
  query: CourseProductListQuery;
  productStore: CourseProductStore;
}) {
  const products = await productStore.listProducts();
  const auditEvents = await productStore.listAuditEvents();
  const firstPage = listCourseProductsByQuery(products, query, auditEvents);
  if (firstPage.meta.totalPages <= 1) return firstPage.items;

  const restPages = Array.from(
    { length: firstPage.meta.totalPages - 1 },
    (_, index) =>
      listCourseProductsByQuery(
        products,
        {
          ...query,
          page: index + 2,
          pageSize: PUBLISH_QUEUE_PAGE_SIZE,
        },
        auditEvents
      )
  );
  return [firstPage, ...restPages].flatMap(page => page.items);
}

function buildPublishQueueResult({
  products,
  qualityByProductId,
  query,
  now,
}: {
  products: CourseProductListItem[];
  qualityByProductId: Map<string, CourseProductContentQualityResult>;
  query: CourseProductListQuery;
  now: string;
}) {
  const grouped = new Map<
    CourseProductPublishQueueGroupId,
    CourseProductPublishQueueCandidate[]
  >(PUBLISH_QUEUE_GROUP_ORDER.map(groupId => [groupId, []]));
  let archivedCount = 0;

  products.forEach(product => {
    if (product.status === "archived") {
      archivedCount += 1;
      return;
    }

    const quality = qualityByProductId.get(product.id);
    const groupId = queueGroupForProduct(product, quality);
    if (!groupId) return;

    const group = groupDefinitions[groupId];
    grouped.get(groupId)?.push({
      productId: product.id,
      courseId: product.courseId,
      title: product.title,
      coverUrl: product.coverUrl,
      status: product.status,
      reviewStatus: product.reviewStatus,
      queueGroup: groupId,
      recommendedAction: group.recommendedAction,
      risk: group.risk,
      reason: qualityReason(quality),
      contentReady: Boolean(quality?.ready),
      contentBlockingCount: quality?.blockingCount ?? 0,
      contentWarningCount: quality?.warningCount ?? 0,
      updatedAt: product.updatedAt,
    });
  });

  const groups = PUBLISH_QUEUE_GROUP_ORDER.map(groupId => {
    const candidates = grouped.get(groupId) ?? [];
    const definition = groupDefinitions[groupId];
    return {
      id: groupId,
      label: definition.label,
      description: definition.description,
      workspaceStep: definition.workspaceStep,
      risk: definition.risk,
      totalCount: candidates.length,
      previewItems: candidates.slice(0, 5),
    };
  });
  const count = (groupId: CourseProductPublishQueueGroupId) =>
    grouped.get(groupId)?.length ?? 0;
  const actions = [
    {
      id: "submit_review" as const,
      label: "批量提交审核草案",
      description: "保存内容达标且未提交/已驳回商品的提交审核候选快照。",
      candidateCount: count("ready_to_submit"),
      blockerCount: count("content_blocked"),
      risk: "medium" as const,
    },
    {
      id: "review_followup" as const,
      label: "批量审核跟进草案",
      description: "保存待审核池规模与商品快照，仍需要人工逐项判断。",
      candidateCount: count("pending_review"),
      blockerCount: count("content_blocked"),
      risk: "medium" as const,
    },
    {
      id: "publish" as const,
      label: "批量上架草案",
      description: "保存审核通过且未上架商品的上架候选，执行前需二次确认。",
      candidateCount: count("approved_unpublished"),
      blockerCount: count("pending_review") + count("content_blocked"),
      risk: "high" as const,
    },
    {
      id: "quality_recheck" as const,
      label: "已发布复查草案",
      description: "保存已上架商品的内容提醒快照，不改变发布状态。",
      candidateCount: count("published_watch"),
      blockerCount: 0,
      risk: "low" as const,
    },
  ];
  const candidates = PUBLISH_QUEUE_GROUP_ORDER.flatMap(
    groupId => grouped.get(groupId) ?? []
  );

  return CourseProductPublishQueueResultSchema.parse({
    generatedAt: now,
    query,
    previewOnly: true,
    executable: false,
    summary: {
      totalScannedCount: products.length,
      totalInScope: products.length - archivedCount,
      archivedCount,
      candidateCount: candidates.length,
      blockerCount: count("content_blocked"),
      riskSummary: summarizeCandidateRisk(candidates),
    },
    groups,
    actions,
    candidates,
    safetyNotes: [
      "当前发布队列为服务端聚合预案，不会提交审核、不会审核通过、不会上架商品",
      "批量草案只保存筛选条件、候选快照和阻塞摘要，不写入课程商品审计事件",
    ],
  });
}

function queueGroupForProduct(
  product: CourseProductListItem,
  quality?: CourseProductContentQualityResult
): CourseProductPublishQueueGroupId | undefined {
  if (product.status === "archived") return undefined;
  if (!quality || !quality.ready) return "content_blocked";
  if (product.reviewStatus === "pending") return "pending_review";
  if (product.reviewStatus === "approved" && product.status !== "published") {
    return "approved_unpublished";
  }
  if (
    product.status === "published" &&
    product.reviewStatus === "approved" &&
    quality.warningCount > 0
  ) {
    return "published_watch";
  }
  if (
    product.reviewStatus === "not_submitted" ||
    product.reviewStatus === "rejected"
  ) {
    return "ready_to_submit";
  }
  return undefined;
}

function qualityReason(quality?: CourseProductContentQualityResult) {
  if (!quality) return "暂无内容质量结果";
  const blockingIssue = quality.issues.find(
    issue => issue.severity === "blocking"
  );
  if (blockingIssue) return blockingIssue.message;
  const warningIssue = quality.issues.find(
    issue => issue.severity === "warning"
  );
  if (warningIssue) return warningIssue.message;
  return "内容质量已达标";
}

function candidatesForAction(
  preview: CourseProductPublishQueueResult,
  action: CourseProductPublishQueueAction
) {
  const groupsByAction: Record<
    CourseProductPublishQueueAction,
    CourseProductPublishQueueGroupId[]
  > = {
    submit_review: ["ready_to_submit"],
    review_followup: ["pending_review"],
    publish: ["approved_unpublished"],
    quality_recheck: ["published_watch"],
  };

  const allowedGroups = new Set(groupsByAction[action]);
  return preview.candidates.filter(candidate =>
    allowedGroups.has(candidate.queueGroup)
  );
}

function summarizeCandidateRisk(
  candidates: CourseProductPublishQueueCandidate[]
) {
  return candidates.reduce(
    (summary, candidate) => {
      summary[candidate.risk] += 1;
      return summary;
    },
    { low: 0, medium: 0, high: 0 }
  );
}

function batchTaskDedupeKey({
  action,
  query,
  candidateSnapshot,
}: {
  action: CourseProductPublishQueueAction;
  query: CourseProductListQuery;
  candidateSnapshot: CourseProductPublishQueueCandidate[];
}) {
  return JSON.stringify({
    action,
    query,
    productIds: candidateSnapshot
      .map(candidate => candidate.productId)
      .sort((left, right) => left.localeCompare(right)),
  });
}

function createBatchTaskId(now: string, dedupeKey: string) {
  const hash = createHash("sha256")
    .update(`${now}:${dedupeKey}`)
    .digest("hex")
    .slice(0, 12);
  return `publish_queue_batch_task_${Date.parse(now) || Date.now()}_${hash}`;
}

function matchesBatchTaskListQuery(
  task: CourseProductPublishQueueBatchTask,
  query: CourseProductPublishQueueBatchTaskListQuery
) {
  if (query.status !== "all" && task.status !== query.status) return false;
  if (query.action !== "all" && task.action !== query.action) return false;
  return true;
}
