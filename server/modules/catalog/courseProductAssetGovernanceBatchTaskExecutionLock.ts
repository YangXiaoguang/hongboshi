import { randomUUID } from "crypto";
import {
  CourseProductAssetGovernanceBatchTaskSchema,
  type CourseProductAssetGovernanceBatchTask,
} from "../../../shared/domain";

export const COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_EXECUTION_LOCK_TTL_MS =
  15 * 60 * 1000;

export type CourseProductAssetGovernanceBatchTaskExecutionLock = {
  task: CourseProductAssetGovernanceBatchTask;
  lockToken: string;
  acquiredAt: string;
  expiresAt: string;
};

export type CourseProductAssetGovernanceBatchTaskExecutionLockAcquireInput = {
  taskId: string;
  actorId: string;
  actorRoles?: string[];
  reason: string;
  note?: string;
  now: string;
  lockToken?: string;
  lockTtlMs?: number;
};

export type CourseProductAssetGovernanceBatchTaskExecutionLockReleaseInput = {
  taskId: string;
  lockToken: string;
  now: string;
};

export function createCourseProductAssetGovernanceBatchTaskExecutionLock({
  task,
  input,
}: {
  task: CourseProductAssetGovernanceBatchTask;
  input: CourseProductAssetGovernanceBatchTaskExecutionLockAcquireInput;
}): CourseProductAssetGovernanceBatchTaskExecutionLock {
  const lockToken = input.lockToken ?? randomUUID();
  const expiresAt = new Date(
    Date.parse(input.now) +
      (input.lockTtlMs ??
        COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_EXECUTION_LOCK_TTL_MS)
  ).toISOString();

  return {
    task: CourseProductAssetGovernanceBatchTaskSchema.parse({
      ...task,
      executionStatus: "running",
      executionAttemptCount: (task.executionAttemptCount ?? 0) + 1,
      executionRequestedBy: input.actorId,
      executionRequestedByRoles: input.actorRoles ?? [],
      executionStartedAt: input.now,
      executionCompletedAt: undefined,
      executionReason: input.reason,
      executionNote: input.note,
      executionSummary: undefined,
      executionItems: [],
      executionAuditEventIds: [],
      lastExecutionError: undefined,
      lastExecutionFailedAt: undefined,
      updatedAt: input.now,
    }),
    lockToken,
    acquiredAt: input.now,
    expiresAt,
  };
}

export function isCourseProductAssetGovernanceBatchTaskExecutionLockExpired({
  expiresAt,
  now,
}: {
  expiresAt: string;
  now: string;
}) {
  return Date.parse(expiresAt) <= Date.parse(now);
}
