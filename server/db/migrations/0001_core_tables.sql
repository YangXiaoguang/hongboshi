BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  phone_masked TEXT,
  avatar_url TEXT,
  is_minor BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (
    role IN ('visitor', 'member', 'counselor', 'operator', 'admin')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE IF NOT EXISTS user_consents (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('terms', 'privacy')),
  version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, type, version)
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('phone', 'wechat')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_memberships (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('none', 'active', 'expired')),
  plan_name TEXT,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_access_grants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL,
  source_order_id TEXT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (
    status IN (
      'created',
      'pending_payment',
      'paid',
      'closed',
      'refunding',
      'refunded'
    )
  ),
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  payable_cents INTEGER NOT NULL CHECK (payable_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (
    type IN ('course', 'membership', 'counseling_session', 'assessment_report')
  ),
  target_id TEXT NOT NULL,
  title TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('wechat_pay', 'alipay', 'manual')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  transaction_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_events (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (
    source IN ('assessment', 'counseling_intake', 'chat', 'operator')
  ),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('medium', 'high', 'urgent')),
  signal TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('open', 'reviewing', 'resolved', 'escalated')
  ),
  reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS assessment_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flow_id TEXT NOT NULL,
  dimensions JSONB NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'urgent')),
  summary TEXT NOT NULL,
  recommendations JSONB NOT NULL,
  risk_event_id TEXT REFERENCES risk_events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS counselors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT,
  title TEXT NOT NULL,
  introduction TEXT NOT NULL,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  license_summary TEXT NOT NULL,
  years_of_practice INTEGER NOT NULL CHECK (years_of_practice >= 0),
  session_price_cents INTEGER NOT NULL CHECK (session_price_cents >= 0),
  rating NUMERIC(2, 1) CHECK (rating >= 0 AND rating <= 5),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS counseling_slots (
  id TEXT PRIMARY KEY,
  counselor_id TEXT NOT NULL REFERENCES counselors(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('video', 'voice', 'offline')),
  available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS counseling_appointments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  counselor_id TEXT NOT NULL REFERENCES counselors(id) ON DELETE RESTRICT,
  slot_id TEXT NOT NULL REFERENCES counseling_slots(id) ON DELETE RESTRICT,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('video', 'voice', 'offline')),
  status TEXT NOT NULL CHECK (
    status IN (
      'pending_payment',
      'scheduled',
      'completed',
      'cancelled',
      'no_show',
      'refunded'
    )
  ),
  concern_tags TEXT[] NOT NULL DEFAULT '{}',
  note_for_counselor TEXT CHECK (
    note_for_counselor IS NULL OR CHAR_LENGTH(note_for_counselor) <= 500
  ),
  assessment_report_id TEXT REFERENCES assessment_reports(id) ON DELETE SET NULL,
  risk_event_id TEXT REFERENCES risk_events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (
    action IN (
      'create',
      'read',
      'update',
      'delete',
      'export',
      'login',
      'logout',
      'risk_review'
    )
  ),
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id
  ON auth_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_course_access_grants_user_id
  ON course_access_grants(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_course_access_grants
  ON course_access_grants(user_id, course_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at
  ON orders(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assessment_reports_user_id_created_at
  ON assessment_reports(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_counseling_slots_counselor_starts_at
  ON counseling_slots(counselor_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_counseling_appointments_user_id_created_at
  ON counseling_appointments(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_counseling_appointments_order_id
  ON counseling_appointments(order_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_counseling_slot
  ON counseling_appointments(slot_id)
  WHERE status IN ('pending_payment', 'scheduled');

CREATE INDEX IF NOT EXISTS idx_risk_events_user_status
  ON risk_events(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
  ON audit_logs(resource_type, resource_id, created_at DESC);

COMMIT;
