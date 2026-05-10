BEGIN;

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  order_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('wechat_pay', 'alipay', 'manual')),
  status TEXT NOT NULL CHECK (status IN ('processing', 'processed', 'failed')),
  event_payload JSONB NOT NULL,
  response_status INTEGER,
  response_body JSONB,
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_order_id
  ON payment_webhook_events(order_id);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_status_received_at
  ON payment_webhook_events(status, received_at DESC);

COMMIT;
