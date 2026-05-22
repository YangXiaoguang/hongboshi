BEGIN;

ALTER TABLE course_product_asset_gov_batch_tasks
  ADD COLUMN IF NOT EXISTS execution_attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (execution_attempt_count >= 0),
  ADD COLUMN IF NOT EXISTS last_execution_error TEXT,
  ADD COLUMN IF NOT EXISTS last_execution_failed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_course_asset_gov_batch_tasks_failed_retry
  ON course_product_asset_gov_batch_tasks(execution_status, last_execution_failed_at DESC)
  WHERE execution_status = 'failed';

COMMIT;
