BEGIN;

ALTER TABLE counseling_appointments
  ADD COLUMN IF NOT EXISTS order_id TEXT REFERENCES orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_counseling_appointments_order_id
  ON counseling_appointments(order_id);

COMMIT;
