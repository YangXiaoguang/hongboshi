BEGIN;

ALTER TABLE course_product_audit_events
  DROP CONSTRAINT IF EXISTS course_product_audit_events_action_check;

ALTER TABLE course_product_audit_events
  ADD CONSTRAINT course_product_audit_events_action_check
  CHECK (
    action IN (
      'status_update',
      'price_update',
      'info_update',
      'review_update',
      'content_update',
      'asset_upload',
      'asset_review',
      'asset_governance'
    )
  );

COMMIT;
