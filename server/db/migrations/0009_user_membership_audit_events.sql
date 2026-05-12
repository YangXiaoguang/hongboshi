BEGIN;

CREATE TABLE IF NOT EXISTS user_membership_audit_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_roles TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  action TEXT NOT NULL CHECK (
    action IN ('activate', 'extend', 'expire', 'adjust_plan')
  ),
  reason TEXT NOT NULL,
  before_membership JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_membership JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_membership_audit_events_user_created_at
  ON user_membership_audit_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_membership_audit_events_actor_created_at
  ON user_membership_audit_events(actor_id, created_at DESC);

COMMIT;
