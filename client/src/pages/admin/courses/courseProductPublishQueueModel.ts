import type {
  CourseProductContentQualityResult,
  CourseProductListItem,
} from "@shared/domain";

export type CourseProductPublishQueueGroupId =
  | "content_blocked"
  | "ready_to_submit"
  | "pending_review"
  | "approved_unpublished"
  | "published_watch";

export type CourseProductPublishQueueRisk = "low" | "medium" | "high";

export type CourseProductPublishQueueItemPreview = {
  id: string;
  title: string;
  courseId: number;
  reason: string;
};

export type CourseProductPublishQueueGroup = {
  id: CourseProductPublishQueueGroupId;
  label: string;
  description: string;
  workspaceStep: "content" | "publish";
  risk: CourseProductPublishQueueRisk;
  items: CourseProductListItem[];
  previews: CourseProductPublishQueueItemPreview[];
};

export type CourseProductPublishQueueActionPlan = {
  id: "submit_review" | "review_followup" | "publish" | "quality_recheck";
  label: string;
  description: string;
  candidateCount: number;
  blockerCount: number;
  risk: CourseProductPublishQueueRisk;
};

export type CourseProductPublishQueue = {
  totalInScope: number;
  archivedCount: number;
  groups: CourseProductPublishQueueGroup[];
  batchPlan: {
    previewOnly: true;
    executable: false;
    totalCandidates: number;
    riskSummary: Record<CourseProductPublishQueueRisk, number>;
    actions: CourseProductPublishQueueActionPlan[];
  };
};

const groupDefinitions: Record<
  CourseProductPublishQueueGroupId,
  Omit<CourseProductPublishQueueGroup, "items" | "previews">
> = {
  content_blocked: {
    id: "content_blocked",
    label: "待补内容",
    description: "内容质量仍有阻塞项，暂不适合批量进入审核。",
    workspaceStep: "content",
    risk: "high",
  },
  ready_to_submit: {
    id: "ready_to_submit",
    label: "待提交审核",
    description: "内容已达标，可进入提交审核候选池。",
    workspaceStep: "publish",
    risk: "low",
  },
  pending_review: {
    id: "pending_review",
    label: "待审核",
    description: "已进入审核流，需要人工判断通过或驳回。",
    workspaceStep: "publish",
    risk: "medium",
  },
  approved_unpublished: {
    id: "approved_unpublished",
    label: "待上架",
    description: "已审核通过但尚未前台可售，可作为上架候选。",
    workspaceStep: "publish",
    risk: "medium",
  },
  published_watch: {
    id: "published_watch",
    label: "已上架复查",
    description: "已前台可售但仍有内容提醒，建议复查成交素材。",
    workspaceStep: "publish",
    risk: "medium",
  },
};

export const courseProductPublishQueueGroupOrder: CourseProductPublishQueueGroupId[] =
  [
    "content_blocked",
    "ready_to_submit",
    "pending_review",
    "approved_unpublished",
    "published_watch",
  ];

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

export function courseProductPublishQueueGroupForItem(
  item: CourseProductListItem,
  quality?: CourseProductContentQualityResult
): CourseProductPublishQueueGroupId | undefined {
  if (item.status === "archived") return undefined;
  if (!quality || !quality.ready) return "content_blocked";
  if (item.reviewStatus === "pending") return "pending_review";
  if (item.reviewStatus === "approved" && item.status !== "published") {
    return "approved_unpublished";
  }
  if (
    item.status === "published" &&
    item.reviewStatus === "approved" &&
    quality.warningCount > 0
  ) {
    return "published_watch";
  }
  if (
    item.reviewStatus === "not_submitted" ||
    item.reviewStatus === "rejected"
  ) {
    return "ready_to_submit";
  }
  return undefined;
}

export function buildCourseProductPublishQueue({
  items,
  contentQualityByProductId,
}: {
  items: CourseProductListItem[];
  contentQualityByProductId: Record<
    string,
    CourseProductContentQualityResult | undefined
  >;
}): CourseProductPublishQueue {
  const grouped = new Map<
    CourseProductPublishQueueGroupId,
    CourseProductListItem[]
  >(courseProductPublishQueueGroupOrder.map(groupId => [groupId, []]));

  let archivedCount = 0;

  items.forEach(item => {
    if (item.status === "archived") {
      archivedCount += 1;
      return;
    }

    const groupId = courseProductPublishQueueGroupForItem(
      item,
      contentQualityByProductId[item.id]
    );
    if (!groupId) return;
    grouped.get(groupId)?.push(item);
  });

  const groups = courseProductPublishQueueGroupOrder.map(groupId => {
    const groupItems = grouped.get(groupId) ?? [];
    return {
      ...groupDefinitions[groupId],
      items: groupItems,
      previews: groupItems.slice(0, 3).map(item => ({
        id: item.id,
        title: item.title,
        courseId: item.courseId,
        reason: qualityReason(contentQualityByProductId[item.id]),
      })),
    };
  });

  const count = (groupId: CourseProductPublishQueueGroupId) =>
    grouped.get(groupId)?.length ?? 0;

  const actions: CourseProductPublishQueueActionPlan[] = [
    {
      id: "submit_review",
      label: "批量提交审核预案",
      description: "仅统计内容达标且未提交/已驳回商品。",
      candidateCount: count("ready_to_submit"),
      blockerCount: count("content_blocked"),
      risk: "medium",
    },
    {
      id: "review_followup",
      label: "批量审核跟进预案",
      description: "仅提示待审核池规模，仍需要人工逐项判断。",
      candidateCount: count("pending_review"),
      blockerCount: count("content_blocked"),
      risk: "medium",
    },
    {
      id: "publish",
      label: "批量上架预案",
      description: "仅统计审核通过且未上架商品，上架需二次确认。",
      candidateCount: count("approved_unpublished"),
      blockerCount: count("pending_review") + count("content_blocked"),
      risk: "high",
    },
    {
      id: "quality_recheck",
      label: "已发布复查预案",
      description: "仅提示已上架商品的内容提醒，不改变发布状态。",
      candidateCount: count("published_watch"),
      blockerCount: 0,
      risk: "low",
    },
  ];

  const riskSummary = groups.reduce<
    Record<CourseProductPublishQueueRisk, number>
  >(
    (summary, group) => {
      summary[group.risk] += group.items.length;
      return summary;
    },
    { low: 0, medium: 0, high: 0 }
  );

  return {
    totalInScope: items.length - archivedCount,
    archivedCount,
    groups,
    batchPlan: {
      previewOnly: true,
      executable: false,
      totalCandidates: actions.reduce(
        (total, action) => total + action.candidateCount,
        0
      ),
      riskSummary,
      actions,
    },
  };
}
