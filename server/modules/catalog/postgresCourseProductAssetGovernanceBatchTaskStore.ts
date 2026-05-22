import {
  CourseProductAssetGovernanceBatchTaskSchema,
  type CourseProductAssetGovernanceBatchTask,
} from "../../../shared/domain";
import type { DatabaseQueryExecutor } from "../../db/postgres";
import type { CourseProductAssetGovernanceBatchTaskStore } from "./courseProductAssetGovernanceBatchTaskStore";

type CourseProductAssetGovernanceBatchTaskRow = {
  id: string;
  task_payload: unknown;
};

function parseJsonValue(value: unknown) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function nullableJsonb(value: unknown) {
  return JSON.stringify(value ?? null);
}

function requiredJsonb(value: unknown) {
  return JSON.stringify(value);
}

export function courseProductAssetGovernanceBatchTaskRowToDomain(
  row: CourseProductAssetGovernanceBatchTaskRow
): CourseProductAssetGovernanceBatchTask {
  return CourseProductAssetGovernanceBatchTaskSchema.parse(
    parseJsonValue(row.task_payload)
  );
}

export class PostgresCourseProductAssetGovernanceBatchTaskStore implements CourseProductAssetGovernanceBatchTaskStore {
  constructor(private readonly db: DatabaseQueryExecutor) {}

  async listTasks() {
    const result =
      await this.db.query<CourseProductAssetGovernanceBatchTaskRow>(
        `
          SELECT
            id,
            task_payload
          FROM course_product_asset_gov_batch_tasks
          ORDER BY updated_at DESC, id ASC
        `
      );

    return result.rows.map(courseProductAssetGovernanceBatchTaskRowToDomain);
  }

  async getTask(taskId: string) {
    const result =
      await this.db.query<CourseProductAssetGovernanceBatchTaskRow>(
        `
          SELECT
            id,
            task_payload
          FROM course_product_asset_gov_batch_tasks
          WHERE id = $1
          LIMIT 1
        `,
        [taskId]
      );

    const row = result.rows[0];
    return row
      ? courseProductAssetGovernanceBatchTaskRowToDomain(row)
      : undefined;
  }

  async saveTask(task: CourseProductAssetGovernanceBatchTask) {
    const normalized = CourseProductAssetGovernanceBatchTaskSchema.parse(task);
    const result =
      await this.db.query<CourseProductAssetGovernanceBatchTaskRow>(
        `
          INSERT INTO course_product_asset_gov_batch_tasks (
            id,
            idempotency_key,
            action,
            approval_status,
            query_payload,
            candidate_asset_count,
            preview_item_count,
            eligible_action_count,
            manual_review_asset_count,
            soft_delete_candidate_count,
            issue_type_distribution,
            proposed_action_distribution,
            safety_notes,
            created_by,
            created_by_roles,
            reason,
            note,
            created_at,
            updated_at,
            reviewed_by,
            reviewed_by_roles,
            reviewed_at,
            review_action,
            review_reason,
            review_before_summary,
            review_after_summary,
            approval_preflight,
            execution_status,
            execution_requested_by,
            execution_requested_by_roles,
            execution_started_at,
            execution_completed_at,
            execution_reason,
            execution_note,
            execution_summary,
            execution_audit_event_ids,
            canceled_by,
            canceled_at,
            cancel_reason,
            task_payload
          )
          VALUES (
            $1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10,
            $11::jsonb, $12::jsonb, $13, $14, $15, $16, $17,
            $18, $19, $20, $21, $22, $23, $24, $25::jsonb,
            $26::jsonb, $27::jsonb, $28, $29, $30, $31, $32,
            $33, $34, $35::jsonb, $36, $37, $38, $39, $40::jsonb
          )
          ON CONFLICT (id) DO UPDATE SET
            idempotency_key = EXCLUDED.idempotency_key,
            action = EXCLUDED.action,
            approval_status = EXCLUDED.approval_status,
            query_payload = EXCLUDED.query_payload,
            candidate_asset_count = EXCLUDED.candidate_asset_count,
            preview_item_count = EXCLUDED.preview_item_count,
            eligible_action_count = EXCLUDED.eligible_action_count,
            manual_review_asset_count = EXCLUDED.manual_review_asset_count,
            soft_delete_candidate_count = EXCLUDED.soft_delete_candidate_count,
            issue_type_distribution = EXCLUDED.issue_type_distribution,
            proposed_action_distribution = EXCLUDED.proposed_action_distribution,
            safety_notes = EXCLUDED.safety_notes,
            created_by = EXCLUDED.created_by,
            created_by_roles = EXCLUDED.created_by_roles,
            reason = EXCLUDED.reason,
            note = EXCLUDED.note,
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at,
            reviewed_by = EXCLUDED.reviewed_by,
            reviewed_by_roles = EXCLUDED.reviewed_by_roles,
            reviewed_at = EXCLUDED.reviewed_at,
            review_action = EXCLUDED.review_action,
            review_reason = EXCLUDED.review_reason,
            review_before_summary = EXCLUDED.review_before_summary,
            review_after_summary = EXCLUDED.review_after_summary,
            approval_preflight = EXCLUDED.approval_preflight,
            execution_status = EXCLUDED.execution_status,
            execution_requested_by = EXCLUDED.execution_requested_by,
            execution_requested_by_roles = EXCLUDED.execution_requested_by_roles,
            execution_started_at = EXCLUDED.execution_started_at,
            execution_completed_at = EXCLUDED.execution_completed_at,
            execution_reason = EXCLUDED.execution_reason,
            execution_note = EXCLUDED.execution_note,
            execution_summary = EXCLUDED.execution_summary,
            execution_audit_event_ids = EXCLUDED.execution_audit_event_ids,
            canceled_by = EXCLUDED.canceled_by,
            canceled_at = EXCLUDED.canceled_at,
            cancel_reason = EXCLUDED.cancel_reason,
            task_payload = EXCLUDED.task_payload
          RETURNING
            id,
            task_payload
        `,
        [
          normalized.id,
          idempotencyKey(normalized.id),
          normalized.action,
          normalized.approvalStatus,
          requiredJsonb(normalized.query),
          normalized.candidateAssetCount,
          normalized.previewItemCount,
          normalized.eligibleActionCount,
          normalized.manualReviewAssetCount,
          normalized.softDeleteCandidateCount,
          requiredJsonb(normalized.issueTypeDistribution),
          requiredJsonb(normalized.proposedActionDistribution),
          normalized.safetyNotes,
          normalized.createdBy,
          normalized.createdByRoles,
          normalized.reason,
          normalized.note ?? null,
          normalized.createdAt,
          normalized.updatedAt,
          normalized.reviewedBy ?? null,
          normalized.reviewedByRoles,
          normalized.reviewedAt ?? null,
          normalized.reviewAction ?? null,
          normalized.reviewReason ?? null,
          nullableJsonb(normalized.reviewBeforeSummary),
          nullableJsonb(normalized.reviewAfterSummary),
          nullableJsonb(normalized.approvalPreflight),
          normalized.executionStatus,
          normalized.executionRequestedBy ?? null,
          normalized.executionRequestedByRoles,
          normalized.executionStartedAt ?? null,
          normalized.executionCompletedAt ?? null,
          normalized.executionReason ?? null,
          normalized.executionNote ?? null,
          nullableJsonb(normalized.executionSummary),
          normalized.executionAuditEventIds,
          normalized.canceledBy ?? null,
          normalized.canceledAt ?? null,
          normalized.cancelReason ?? null,
          requiredJsonb(normalized),
        ]
      );

    await this.replaceCandidateSnapshot(normalized);
    await this.replaceExecutionItems(normalized);
    await this.replaceExecutionAuditEventIds(normalized);

    const row = result.rows[0];
    if (!row) {
      throw new Error("COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_NOT_FOUND");
    }
    return courseProductAssetGovernanceBatchTaskRowToDomain(row);
  }

  async clear() {
    await this.db.query(
      "DELETE FROM course_product_asset_gov_batch_task_audit_events"
    );
    await this.db.query(
      "DELETE FROM course_product_asset_gov_batch_task_execution_items"
    );
    await this.db.query(
      "DELETE FROM course_product_asset_gov_batch_task_candidates"
    );
    await this.db.query("DELETE FROM course_product_asset_gov_batch_tasks");
  }

  private async replaceCandidateSnapshot(
    task: CourseProductAssetGovernanceBatchTask
  ) {
    await this.db.query(
      "DELETE FROM course_product_asset_gov_batch_task_candidates WHERE task_id = $1",
      [task.id]
    );

    for (let index = 0; index < task.candidateAssetIds.length; index += 1) {
      const assetId = task.candidateAssetIds[index];
      if (!assetId) continue;
      await this.db.query(
        `
          INSERT INTO course_product_asset_gov_batch_task_candidates (
            task_id,
            asset_id,
            issue_types,
            snapshot_position
          )
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (task_id, asset_id) DO UPDATE SET
            issue_types = EXCLUDED.issue_types,
            snapshot_position = EXCLUDED.snapshot_position
        `,
        [
          task.id,
          assetId,
          task.candidateIssueTypeByAssetId[assetId] ?? [],
          index,
        ]
      );
    }
  }

  private async replaceExecutionItems(
    task: CourseProductAssetGovernanceBatchTask
  ) {
    await this.db.query(
      "DELETE FROM course_product_asset_gov_batch_task_execution_items WHERE task_id = $1",
      [task.id]
    );

    for (let index = 0; index < task.executionItems.length; index += 1) {
      const item = task.executionItems[index];
      if (!item) continue;
      await this.db.query(
        `
          INSERT INTO course_product_asset_gov_batch_task_execution_items (
            task_id,
            asset_id,
            product_id,
            product_title,
            asset_title,
            planned_action,
            issue_type,
            status,
            audit_event_id,
            skip_reason,
            error_message,
            item_position
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (task_id, asset_id) DO UPDATE SET
            product_id = EXCLUDED.product_id,
            product_title = EXCLUDED.product_title,
            asset_title = EXCLUDED.asset_title,
            planned_action = EXCLUDED.planned_action,
            issue_type = EXCLUDED.issue_type,
            status = EXCLUDED.status,
            audit_event_id = EXCLUDED.audit_event_id,
            skip_reason = EXCLUDED.skip_reason,
            error_message = EXCLUDED.error_message,
            item_position = EXCLUDED.item_position
        `,
        [
          task.id,
          item.assetId,
          item.productId ?? null,
          item.productTitle ?? null,
          item.assetTitle ?? null,
          item.plannedAction,
          item.issueType ?? null,
          item.status,
          item.auditEventId ?? null,
          item.skipReason ?? null,
          item.errorMessage ?? null,
          index,
        ]
      );
    }
  }

  private async replaceExecutionAuditEventIds(
    task: CourseProductAssetGovernanceBatchTask
  ) {
    await this.db.query(
      "DELETE FROM course_product_asset_gov_batch_task_audit_events WHERE task_id = $1",
      [task.id]
    );

    for (
      let index = 0;
      index < task.executionAuditEventIds.length;
      index += 1
    ) {
      const auditEventId = task.executionAuditEventIds[index];
      if (!auditEventId) continue;
      await this.db.query(
        `
          INSERT INTO course_product_asset_gov_batch_task_audit_events (
            task_id,
            audit_event_id,
            event_position
          )
          VALUES ($1, $2, $3)
          ON CONFLICT (task_id, audit_event_id) DO UPDATE SET
            event_position = EXCLUDED.event_position
        `,
        [task.id, auditEventId, index]
      );
    }
  }
}

function idempotencyKey(taskId: string) {
  return `course_product_asset_governance_batch_task:${taskId}`;
}
