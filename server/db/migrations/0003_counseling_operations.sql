BEGIN;

CREATE TABLE IF NOT EXISTS counseling_operation_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS counseling_operation_audit_events (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL CHECK (
    action IN (
      'cancellation_policy_updated',
      'complete_session',
      'mark_no_show'
    )
  ),
  actor_id TEXT NOT NULL,
  actor_roles TEXT[] NOT NULL DEFAULT '{}',
  appointment_id TEXT REFERENCES counseling_appointments(id) ON DELETE SET NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  counselor_id TEXT REFERENCES counselors(id) ON DELETE SET NULL,
  previous_appointment_status TEXT CHECK (
    previous_appointment_status IS NULL OR
    previous_appointment_status IN (
      'pending_payment',
      'scheduled',
      'completed',
      'cancelled',
      'no_show',
      'refunded'
    )
  ),
  next_appointment_status TEXT CHECK (
    next_appointment_status IS NULL OR
    next_appointment_status IN (
      'pending_payment',
      'scheduled',
      'completed',
      'cancelled',
      'no_show',
      'refunded'
    )
  ),
  previous_order_status TEXT CHECK (
    previous_order_status IS NULL OR
    previous_order_status IN (
      'created',
      'pending_payment',
      'paid',
      'closed',
      'refunding',
      'refunded'
    )
  ),
  next_order_status TEXT CHECK (
    next_order_status IS NULL OR
    next_order_status IN (
      'created',
      'pending_payment',
      'paid',
      'closed',
      'refunding',
      'refunded'
    )
  ),
  policy_before JSONB,
  policy_after JSONB,
  note TEXT CHECK (note IS NULL OR CHAR_LENGTH(note) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_counseling_operation_audit_events_created_at
  ON counseling_operation_audit_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_counseling_operation_audit_events_appointment
  ON counseling_operation_audit_events(appointment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_counseling_operation_audit_events_actor
  ON counseling_operation_audit_events(actor_id, created_at DESC);

COMMIT;
