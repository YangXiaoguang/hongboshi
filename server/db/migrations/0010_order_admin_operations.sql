BEGIN;

CREATE TABLE IF NOT EXISTS order_admin_exception_flags (
  order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('open', 'cleared')),
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
  reason TEXT NOT NULL,
  marked_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  marked_at TIMESTAMPTZ NOT NULL,
  cleared_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  cleared_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_order_admin_exception_flags_status_marked_at
  ON order_admin_exception_flags(status, marked_at DESC);

CREATE TABLE IF NOT EXISTS order_admin_audit_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_roles TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  action TEXT NOT NULL CHECK (
    action IN ('close_pending', 'mark_exception', 'clear_exception')
  ),
  reason TEXT NOT NULL,
  before_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_admin_audit_events_order_created_at
  ON order_admin_audit_events(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_admin_audit_events_actor_created_at
  ON order_admin_audit_events(actor_id, created_at DESC);

COMMIT;
