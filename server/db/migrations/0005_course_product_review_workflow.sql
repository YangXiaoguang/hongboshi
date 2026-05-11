BEGIN;

ALTER TABLE course_product_audit_events
  DROP CONSTRAINT IF EXISTS course_product_audit_events_action_check;

ALTER TABLE course_product_audit_events
  ADD CONSTRAINT course_product_audit_events_action_check
  CHECK (action IN ('status_update', 'price_update', 'info_update', 'review_update'));

CREATE INDEX IF NOT EXISTS idx_course_products_review_status_updated_at
  ON course_products(review_status, updated_at DESC);

COMMIT;
