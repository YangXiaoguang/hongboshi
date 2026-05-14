BEGIN;

ALTER TABLE counseling_operation_audit_events
  DROP CONSTRAINT IF EXISTS counseling_operation_audit_events_action_check;

ALTER TABLE counseling_operation_audit_events
  ADD CONSTRAINT counseling_operation_audit_events_action_check
  CHECK (
    action IN (
      'cancellation_policy_updated',
      'complete_session',
      'mark_no_show',
      'schedule_slot_added',
      'schedule_slot_closed',
      'schedule_slot_restored'
    )
  );

COMMIT;
