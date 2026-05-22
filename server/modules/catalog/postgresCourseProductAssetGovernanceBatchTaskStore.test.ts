import { describe, expect, it } from "vitest";
import type { CourseProductAssetGovernanceBatchTask } from "../../../shared/domain";
import type {
  DatabaseQueryExecutor,
  DatabaseQueryResult,
} from "../../db/postgres";
import {
  courseProductAssetGovernanceBatchTaskRowToDomain,
  PostgresCourseProductAssetGovernanceBatchTaskStore,
} from "./postgresCourseProductAssetGovernanceBatchTaskStore";

type CapturedQuery = {
  text: string;
  values?: readonly unknown[];
};

function jsonValue<T>(value: unknown): T {
  return typeof value === "string" ? JSON.parse(value) : (value as T);
}

function rowFromTask(task: CourseProductAssetGovernanceBatchTask) {
  return {
    id: task.id,
    task_payload: task,
  };
}

class FakeCourseProductAssetGovernanceBatchTaskExecutor implements DatabaseQueryExecutor {
  readonly queries: CapturedQuery[] = [];
  tasks: unknown[] = [];
  candidates: unknown[] = [];
  executionItems: unknown[] = [];
  auditEvents: unknown[] = [];

  async query<Row>(
    text: string,
    values?: readonly unknown[]
  ): Promise<DatabaseQueryResult<Row>> {
    this.queries.push({ text, values });

    if (text.includes("INSERT INTO course_product_asset_gov_batch_tasks")) {
      const row = rowFromTask(
        jsonValue<CourseProductAssetGovernanceBatchTask>(values?.[39])
      );
      this.tasks = [
        ...this.tasks.filter(item => (item as { id: string }).id !== row.id),
        row,
      ];
      return { rows: [row] as Row[], rowCount: 1 };
    }

    if (
      text.trim() ===
      "DELETE FROM course_product_asset_gov_batch_task_candidates WHERE task_id = $1"
    ) {
      this.candidates = this.candidates.filter(
        item => (item as { task_id: string }).task_id !== values?.[0]
      );
      return { rows: [] as Row[], rowCount: 0 };
    }

    if (
      text.trim() ===
      "DELETE FROM course_product_asset_gov_batch_task_execution_items WHERE task_id = $1"
    ) {
      this.executionItems = this.executionItems.filter(
        item => (item as { task_id: string }).task_id !== values?.[0]
      );
      return { rows: [] as Row[], rowCount: 0 };
    }

    if (
      text.trim() ===
      "DELETE FROM course_product_asset_gov_batch_task_audit_events WHERE task_id = $1"
    ) {
      this.auditEvents = this.auditEvents.filter(
        item => (item as { task_id: string }).task_id !== values?.[0]
      );
      return { rows: [] as Row[], rowCount: 0 };
    }

    if (
      text.includes(
        "INSERT INTO course_product_asset_gov_batch_task_candidates"
      )
    ) {
      const row = {
        task_id: values?.[0],
        asset_id: values?.[1],
        issue_types: values?.[2],
        snapshot_position: values?.[3],
      };
      this.candidates = [
        ...this.candidates.filter(
          item =>
            (item as { task_id: string; asset_id: string }).task_id !==
              row.task_id ||
            (item as { task_id: string; asset_id: string }).asset_id !==
              row.asset_id
        ),
        row,
      ];
      return { rows: [] as Row[], rowCount: 1 };
    }

    if (
      text.includes(
        "INSERT INTO course_product_asset_gov_batch_task_execution_items"
      )
    ) {
      const row = {
        task_id: values?.[0],
        asset_id: values?.[1],
        product_id: values?.[2],
        product_title: values?.[3],
        asset_title: values?.[4],
        planned_action: values?.[5],
        issue_type: values?.[6],
        status: values?.[7],
        audit_event_id: values?.[8],
        skip_reason: values?.[9],
        error_message: values?.[10],
        item_position: values?.[11],
      };
      this.executionItems = [
        ...this.executionItems.filter(
          item =>
            (item as { task_id: string; asset_id: string }).task_id !==
              row.task_id ||
            (item as { task_id: string; asset_id: string }).asset_id !==
              row.asset_id
        ),
        row,
      ];
      return { rows: [] as Row[], rowCount: 1 };
    }

    if (
      text.includes(
        "INSERT INTO course_product_asset_gov_batch_task_audit_events"
      )
    ) {
      const row = {
        task_id: values?.[0],
        audit_event_id: values?.[1],
        event_position: values?.[2],
      };
      this.auditEvents = [
        ...this.auditEvents.filter(
          item =>
            (item as { task_id: string; audit_event_id: string }).task_id !==
              row.task_id ||
            (item as { task_id: string; audit_event_id: string })
              .audit_event_id !== row.audit_event_id
        ),
        row,
      ];
      return { rows: [] as Row[], rowCount: 1 };
    }

    if (
      text.includes("FROM course_product_asset_gov_batch_tasks") &&
      text.includes("WHERE id = $1")
    ) {
      const row = this.tasks.find(
        item => (item as { id: string }).id === values?.[0]
      );
      return {
        rows: (row ? [row] : []) as Row[],
        rowCount: row ? 1 : 0,
      };
    }

    if (text.includes("FROM course_product_asset_gov_batch_tasks")) {
      const rows = [...this.tasks].sort((left, right) =>
        String(
          (right as { task_payload: CourseProductAssetGovernanceBatchTask })
            .task_payload.updatedAt
        ).localeCompare(
          String(
            (left as { task_payload: CourseProductAssetGovernanceBatchTask })
              .task_payload.updatedAt
          )
        )
      );
      return { rows: rows as Row[], rowCount: rows.length };
    }

    if (
      text.trim() ===
      "DELETE FROM course_product_asset_gov_batch_task_audit_events"
    ) {
      this.auditEvents = [];
      return { rows: [] as Row[], rowCount: 0 };
    }

    if (
      text.trim() ===
      "DELETE FROM course_product_asset_gov_batch_task_execution_items"
    ) {
      this.executionItems = [];
      return { rows: [] as Row[], rowCount: 0 };
    }

    if (
      text.trim() ===
      "DELETE FROM course_product_asset_gov_batch_task_candidates"
    ) {
      this.candidates = [];
      return { rows: [] as Row[], rowCount: 0 };
    }

    if (text.trim() === "DELETE FROM course_product_asset_gov_batch_tasks") {
      this.tasks = [];
      return { rows: [] as Row[], rowCount: 0 };
    }

    return { rows: [] as Row[], rowCount: 0 };
  }
}

function taskFixture(
  patch: Partial<CourseProductAssetGovernanceBatchTask> = {}
): CourseProductAssetGovernanceBatchTask {
  return {
    id: "asset_governance_batch_task_postgres_1",
    action: "acknowledge_issue",
    approvalStatus: "approved",
    query: {
      issueFilter: "pending_compliance",
      previewSize: 5,
    },
    candidateAssetCount: 2,
    previewItemCount: 2,
    eligibleActionCount: 2,
    manualReviewAssetCount: 0,
    softDeleteCandidateCount: 0,
    issueTypeDistribution: [
      { key: "pending_compliance", label: "待审核", count: 2 },
    ],
    proposedActionDistribution: [
      { key: "acknowledge_issue", label: "记录处理", count: 2 },
    ],
    candidateAssetIds: ["asset_pending_1", "asset_pending_2"],
    candidateIssueTypeByAssetId: {
      asset_pending_1: ["pending_compliance"],
      asset_pending_2: ["pending_compliance"],
    },
    safetyNotes: ["执行只写入审计事件"],
    createdBy: "operator_1",
    createdByRoles: ["catalog_operator"],
    reason: "保存 PostgreSQL 批量任务",
    createdAt: "2026-05-22T09:00:00.000Z",
    updatedAt: "2026-05-22T10:00:00.000Z",
    reviewedBy: "admin_1",
    reviewedByRoles: ["admin"],
    reviewedAt: "2026-05-22T09:10:00.000Z",
    reviewAction: "approve",
    reviewReason: "审批通过批量任务",
    reviewBeforeSummary: {
      approvalStatus: "pending_approval",
      candidateAssetCount: 2,
      eligibleActionCount: 2,
      manualReviewAssetCount: 0,
      softDeleteCandidateCount: 0,
    },
    reviewAfterSummary: {
      approvalStatus: "approved",
      candidateAssetCount: 2,
      eligibleActionCount: 2,
      manualReviewAssetCount: 0,
      softDeleteCandidateCount: 0,
    },
    approvalPreflight: {
      generatedAt: "2026-05-22T09:09:00.000Z",
      originalCandidateAssetCount: 2,
      currentCandidateAssetCount: 2,
      candidateDeltaCount: 0,
      stillEligibleActionCount: 2,
      currentManualReviewAssetCount: 0,
      currentSoftDeleteCandidateCount: 0,
      currentIssueTypeDistribution: [
        { key: "pending_compliance", label: "待审核", count: 2 },
      ],
      currentProposedActionDistribution: [
        { key: "acknowledge_issue", label: "记录处理", count: 2 },
      ],
      requiresRecreate: false,
    },
    executionStatus: "completed",
    executionRequestedBy: "operator_2",
    executionRequestedByRoles: ["catalog_operator"],
    executionStartedAt: "2026-05-22T09:30:00.000Z",
    executionCompletedAt: "2026-05-22T09:31:00.000Z",
    executionReason: "执行已审批批量任务",
    executionSummary: {
      taskId: "asset_governance_batch_task_postgres_1",
      executionStatus: "completed",
      plannedActionCount: 2,
      executedActionCount: 1,
      skippedActionCount: 1,
      failedActionCount: 0,
      auditEventCount: 1,
    },
    executionItems: [
      {
        assetId: "asset_pending_1",
        productId: "course_product_1",
        productTitle: "心理韧性训练营",
        assetTitle: "课后练习",
        plannedAction: "acknowledge_issue",
        issueType: "pending_compliance",
        status: "executed",
        auditEventId: "audit_asset_pending_1",
      },
      {
        assetId: "asset_pending_2",
        plannedAction: "acknowledge_issue",
        issueType: "pending_compliance",
        status: "skipped",
        skipReason: "当前问题类型已变化",
      },
    ],
    executionAuditEventIds: ["audit_asset_pending_1"],
    ...patch,
  };
}

describe("postgres course product asset governance batch task store", () => {
  it("upserts tasks and syncs candidate, execution and audit-event tables", async () => {
    const db = new FakeCourseProductAssetGovernanceBatchTaskExecutor();
    const store = new PostgresCourseProductAssetGovernanceBatchTaskStore(db);
    const task = taskFixture();

    const saved = await store.saveTask(task);
    const loaded = await store.getTask(task.id);
    const listed = await store.listTasks();

    expect(saved).toMatchObject({
      id: task.id,
      executionStatus: "completed",
      executionAuditEventIds: ["audit_asset_pending_1"],
    });
    expect(loaded).toMatchObject({
      id: task.id,
      candidateAssetIds: ["asset_pending_1", "asset_pending_2"],
    });
    expect(listed).toHaveLength(1);
    expect(db.candidates).toHaveLength(2);
    expect(db.executionItems).toHaveLength(2);
    expect(db.auditEvents).toHaveLength(1);
    expect(
      db.queries.find(query =>
        query.text.includes("INSERT INTO course_product_asset_gov_batch_tasks")
      )?.values?.[1]
    ).toBe(`course_product_asset_governance_batch_task:${task.id}`);
  });

  it("replaces child rows when a task is saved again", async () => {
    const db = new FakeCourseProductAssetGovernanceBatchTaskExecutor();
    const store = new PostgresCourseProductAssetGovernanceBatchTaskStore(db);
    const task = taskFixture();

    await store.saveTask(task);
    await store.saveTask({
      ...task,
      updatedAt: "2026-05-22T11:00:00.000Z",
      candidateAssetIds: ["asset_pending_1"],
      candidateIssueTypeByAssetId: {
        asset_pending_1: ["pending_compliance"],
      },
      executionItems: [task.executionItems[0]!],
      executionAuditEventIds: [],
    });

    expect(db.candidates).toHaveLength(1);
    expect(db.executionItems).toHaveLength(1);
    expect(db.auditEvents).toHaveLength(0);
  });

  it("parses payload rows through the domain schema defaults", () => {
    const parsed = courseProductAssetGovernanceBatchTaskRowToDomain({
      id: "asset_governance_batch_task_postgres_2",
      task_payload: JSON.stringify({
        ...taskFixture({
          id: "asset_governance_batch_task_postgres_2",
          approvalStatus: "pending_approval",
        }),
        executionStatus: undefined,
        executionItems: undefined,
      }),
    });

    expect(parsed.executionStatus).toBe("not_started");
    expect(parsed.executionItems).toEqual([]);
  });

  it("clears tables in dependency order", async () => {
    const db = new FakeCourseProductAssetGovernanceBatchTaskExecutor();
    const store = new PostgresCourseProductAssetGovernanceBatchTaskStore(db);

    await store.clear();

    expect(db.queries.map(query => query.text.trim())).toEqual([
      "DELETE FROM course_product_asset_gov_batch_task_audit_events",
      "DELETE FROM course_product_asset_gov_batch_task_execution_items",
      "DELETE FROM course_product_asset_gov_batch_task_candidates",
      "DELETE FROM course_product_asset_gov_batch_tasks",
    ]);
  });
});
