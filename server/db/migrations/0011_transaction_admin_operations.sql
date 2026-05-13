CREATE TABLE IF NOT EXISTS transaction_admin_work_orders (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'resolved')),
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
  reason TEXT NOT NULL,
  marked_by TEXT NOT NULL,
  marked_at TIMESTAMPTZ NOT NULL,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_admin_work_orders_status_marked_at
  ON transaction_admin_work_orders (status, marked_at DESC);

CREATE INDEX IF NOT EXISTS idx_transaction_admin_work_orders_order_id
  ON transaction_admin_work_orders (order_id);

CREATE TABLE IF NOT EXISTS transaction_admin_audit_events (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_roles TEXT[] NOT NULL,
  action TEXT NOT NULL CHECK (
    action IN ('request_refund', 'mark_exception', 'resolve_exception')
  ),
  reason TEXT NOT NULL,
  before_snapshot JSONB NOT NULL,
  after_snapshot JSONB NOT NULL,
  refund_provider_result JSONB,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transaction_admin_audit_events_transaction_created_at
  ON transaction_admin_audit_events (transaction_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transaction_admin_audit_events_order_created_at
  ON transaction_admin_audit_events (order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transaction_admin_audit_events_actor_created_at
  ON transaction_admin_audit_events (actor_id, created_at DESC);
