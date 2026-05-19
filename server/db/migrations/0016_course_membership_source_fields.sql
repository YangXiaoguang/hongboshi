ALTER TABLE course_memberships
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_order_id TEXT,
  ADD COLUMN IF NOT EXISTS source_actor_id TEXT,
  ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ;

DO $$
BEGIN
  ALTER TABLE course_memberships
    ADD CONSTRAINT chk_course_memberships_source_type
    CHECK (
      source_type IS NULL
      OR source_type IN ('checkout_order', 'admin_manual', 'direct_activation')
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_course_memberships_source_order_id
  ON course_memberships(source_order_id);
