BEGIN;

CREATE TABLE IF NOT EXISTS risk_admin_review_records (
  id TEXT PRIMARY KEY,
  risk_event_id TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL CHECK (
    action IN (
      'start_review',
      'mark_contacted',
      'recommend_counseling',
      'escalate',
      'resolve'
    )
  ),
  actor_id TEXT NOT NULL,
  actor_roles TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  previous_status TEXT NOT NULL CHECK (
    previous_status IN ('open', 'reviewing', 'resolved', 'escalated')
  ),
  next_status TEXT NOT NULL CHECK (
    next_status IN ('open', 'reviewing', 'resolved', 'escalated')
  ),
  note TEXT NOT NULL,
  sop_template_id TEXT,
  sop_template_version TEXT,
  result_template_id TEXT,
  escalation_snapshot JSONB,
  audit_resource_type TEXT NOT NULL DEFAULT 'risk_event',
  audit_resource_id TEXT NOT NULL,
  before_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_risk_admin_review_records_risk_event_created_at
  ON risk_admin_review_records(risk_event_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_risk_admin_review_records_actor_created_at
  ON risk_admin_review_records(actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_risk_admin_review_records_audit_resource
  ON risk_admin_review_records(audit_resource_type, audit_resource_id, created_at DESC);

CREATE TABLE IF NOT EXISTS risk_sop_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  version TEXT NOT NULL,
  enabled BOOLEAN NOT NULL,
  risk_levels TEXT[] NOT NULL,
  sources TEXT[] NOT NULL,
  owner_role TEXT NOT NULL,
  steps JSONB NOT NULL,
  result_templates JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  audit_resource_type TEXT NOT NULL DEFAULT 'risk_sop_template',
  audit_resource_id TEXT NOT NULL,
  last_actor_id TEXT,
  last_actor_roles TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  last_action TEXT,
  last_reason TEXT,
  before_snapshot JSONB,
  after_snapshot JSONB,
  audit_updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_risk_sop_templates_enabled_updated_at
  ON risk_sop_templates(enabled, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_risk_sop_templates_audit_resource
  ON risk_sop_templates(audit_resource_type, audit_resource_id);

CREATE TABLE IF NOT EXISTS risk_escalation_queue_items (
  id TEXT PRIMARY KEY,
  risk_event_id TEXT NOT NULL UNIQUE,
  user_id TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('medium', 'high', 'urgent')),
  status TEXT NOT NULL CHECK (
    status IN ('pending_assignment', 'assigned', 'resolved')
  ),
  owner_id TEXT,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  audit_resource_type TEXT NOT NULL DEFAULT 'risk_escalation_queue_item',
  audit_resource_id TEXT NOT NULL,
  last_actor_id TEXT,
  last_actor_roles TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  last_action TEXT,
  before_snapshot JSONB,
  after_snapshot JSONB,
  audit_updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_risk_escalation_queue_status_priority_created_at
  ON risk_escalation_queue_items(status, priority, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_risk_escalation_queue_risk_event
  ON risk_escalation_queue_items(risk_event_id);

CREATE INDEX IF NOT EXISTS idx_risk_escalation_queue_audit_resource
  ON risk_escalation_queue_items(audit_resource_type, audit_resource_id, created_at DESC);

COMMIT;
