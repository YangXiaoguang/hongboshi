BEGIN;

CREATE TABLE IF NOT EXISTS course_product_asset_gov_batch_tasks (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL,
  action TEXT NOT NULL CHECK (
    action IN (
      'acknowledge_issue',
      'mark_duplicate_primary',
      'mark_soft_deleted'
    )
  ),
  approval_status TEXT NOT NULL CHECK (
    approval_status IN (
      'pending_approval',
      'approved',
      'rejected',
      'canceled'
    )
  ),
  query_payload JSONB NOT NULL,
  candidate_asset_count INTEGER NOT NULL DEFAULT 0 CHECK (candidate_asset_count >= 0),
  preview_item_count INTEGER NOT NULL DEFAULT 0 CHECK (preview_item_count >= 0),
  eligible_action_count INTEGER NOT NULL DEFAULT 0 CHECK (eligible_action_count >= 0),
  manual_review_asset_count INTEGER NOT NULL DEFAULT 0 CHECK (manual_review_asset_count >= 0),
  soft_delete_candidate_count INTEGER NOT NULL DEFAULT 0 CHECK (soft_delete_candidate_count >= 0),
  issue_type_distribution JSONB NOT NULL DEFAULT '[]'::jsonb,
  proposed_action_distribution JSONB NOT NULL DEFAULT '[]'::jsonb,
  safety_notes TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_by TEXT NOT NULL,
  created_by_roles TEXT[] NOT NULL DEFAULT '{}'::text[],
  reason TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  reviewed_by TEXT,
  reviewed_by_roles TEXT[] NOT NULL DEFAULT '{}'::text[],
  reviewed_at TIMESTAMPTZ,
  review_action TEXT CHECK (review_action IN ('approve', 'reject')),
  review_reason TEXT,
  review_before_summary JSONB,
  review_after_summary JSONB,
  approval_preflight JSONB,
  execution_status TEXT NOT NULL DEFAULT 'not_started' CHECK (
    execution_status IN (
      'not_started',
      'running',
      'completed',
      'partially_completed',
      'failed'
    )
  ),
  execution_requested_by TEXT,
  execution_requested_by_roles TEXT[] NOT NULL DEFAULT '{}'::text[],
  execution_started_at TIMESTAMPTZ,
  execution_completed_at TIMESTAMPTZ,
  execution_reason TEXT,
  execution_note TEXT,
  execution_summary JSONB,
  execution_audit_event_ids TEXT[] NOT NULL DEFAULT '{}'::text[],
  execution_lock_token TEXT,
  execution_lock_expires_at TIMESTAMPTZ,
  canceled_by TEXT,
  canceled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  task_payload JSONB NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_course_asset_gov_batch_tasks_idempotency
  ON course_product_asset_gov_batch_tasks(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_course_asset_gov_batch_tasks_approval_updated
  ON course_product_asset_gov_batch_tasks(approval_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_course_asset_gov_batch_tasks_execution_updated
  ON course_product_asset_gov_batch_tasks(execution_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_course_asset_gov_batch_tasks_created_by_created
  ON course_product_asset_gov_batch_tasks(created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_course_asset_gov_batch_tasks_executor_completed
  ON course_product_asset_gov_batch_tasks(execution_requested_by, execution_completed_at DESC)
  WHERE execution_requested_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_course_asset_gov_batch_tasks_action_created
  ON course_product_asset_gov_batch_tasks(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_course_asset_gov_batch_tasks_created_at
  ON course_product_asset_gov_batch_tasks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_course_asset_gov_batch_tasks_updated_at
  ON course_product_asset_gov_batch_tasks(updated_at DESC);

CREATE TABLE IF NOT EXISTS course_product_asset_gov_batch_task_candidates (
  task_id TEXT NOT NULL REFERENCES course_product_asset_gov_batch_tasks(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL,
  issue_types TEXT[] NOT NULL DEFAULT '{}'::text[],
  snapshot_position INTEGER NOT NULL CHECK (snapshot_position >= 0),
  PRIMARY KEY (task_id, asset_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_course_asset_gov_batch_candidates_position
  ON course_product_asset_gov_batch_task_candidates(task_id, snapshot_position);

CREATE INDEX IF NOT EXISTS idx_course_asset_gov_batch_candidates_asset
  ON course_product_asset_gov_batch_task_candidates(asset_id);

CREATE INDEX IF NOT EXISTS idx_course_asset_gov_batch_candidates_issue_gin
  ON course_product_asset_gov_batch_task_candidates USING GIN (issue_types);

CREATE TABLE IF NOT EXISTS course_product_asset_gov_batch_task_execution_items (
  task_id TEXT NOT NULL REFERENCES course_product_asset_gov_batch_tasks(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL,
  product_id TEXT,
  product_title TEXT,
  asset_title TEXT,
  planned_action TEXT NOT NULL CHECK (
    planned_action IN (
      'acknowledge_issue',
      'mark_duplicate_primary',
      'mark_soft_deleted'
    )
  ),
  issue_type TEXT CHECK (
    issue_type IN (
      'missing_product',
      'unreferenced',
      'duplicate_content_hash',
      'pending_compliance',
      'rejected_compliance',
      'download_disabled_material',
      'soft_delete_candidate'
    )
  ),
  status TEXT NOT NULL CHECK (status IN ('executed', 'skipped', 'failed')),
  audit_event_id TEXT,
  skip_reason TEXT,
  error_message TEXT,
  item_position INTEGER NOT NULL CHECK (item_position >= 0),
  PRIMARY KEY (task_id, asset_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_course_asset_gov_batch_exec_items_position
  ON course_product_asset_gov_batch_task_execution_items(task_id, item_position);

CREATE INDEX IF NOT EXISTS idx_course_asset_gov_batch_exec_items_status
  ON course_product_asset_gov_batch_task_execution_items(status);

CREATE INDEX IF NOT EXISTS idx_course_asset_gov_batch_exec_items_audit_event
  ON course_product_asset_gov_batch_task_execution_items(audit_event_id)
  WHERE audit_event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS course_product_asset_gov_batch_task_audit_events (
  task_id TEXT NOT NULL REFERENCES course_product_asset_gov_batch_tasks(id) ON DELETE CASCADE,
  audit_event_id TEXT NOT NULL,
  event_position INTEGER NOT NULL CHECK (event_position >= 0),
  PRIMARY KEY (task_id, audit_event_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_course_asset_gov_batch_audit_events_position
  ON course_product_asset_gov_batch_task_audit_events(task_id, event_position);

CREATE INDEX IF NOT EXISTS idx_course_asset_gov_batch_audit_events_event_id
  ON course_product_asset_gov_batch_task_audit_events(audit_event_id);

COMMIT;
