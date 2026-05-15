BEGIN;

CREATE TABLE IF NOT EXISTS audit_center_archived_events (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL,
  source_module TEXT NOT NULL CHECK (
    source_module IN (
      'catalog',
      'user',
      'order',
      'transaction',
      'counseling',
      'risk'
    )
  ),
  source_event_id TEXT NOT NULL,
  source_store TEXT NOT NULL,
  source_table TEXT,
  source_record_id TEXT,
  module TEXT NOT NULL CHECK (
    module IN (
      'catalog',
      'user',
      'order',
      'transaction',
      'counseling',
      'risk'
    )
  ),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  resource_label TEXT,
  actor_id TEXT,
  actor_roles TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  reason TEXT,
  summary TEXT NOT NULL,
  before_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  schema_version TEXT NOT NULL DEFAULT 'audit-center-archive-v1',
  policy_version TEXT NOT NULL DEFAULT 'audit-center-privacy-v1',
  privacy_level TEXT NOT NULL DEFAULT 'summary_only' CHECK (
    privacy_level IN ('summary_only')
  ),
  backfill_batch_id TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_audit_center_archived_events_idempotency_key
  ON audit_center_archived_events(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_audit_center_archived_events_module_occurred_at
  ON audit_center_archived_events(module, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_center_archived_events_action_occurred_at
  ON audit_center_archived_events(action, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_center_archived_events_resource
  ON audit_center_archived_events(resource_type, resource_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_center_archived_events_actor_occurred_at
  ON audit_center_archived_events(actor_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_center_archived_events_source
  ON audit_center_archived_events(source_module, source_event_id);

CREATE INDEX IF NOT EXISTS idx_audit_center_archived_events_archived_at
  ON audit_center_archived_events(archived_at DESC);

COMMIT;
