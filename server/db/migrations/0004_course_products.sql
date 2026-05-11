BEGIN;

CREATE TABLE IF NOT EXISTS course_products (
  id TEXT PRIMARY KEY,
  course_id INTEGER NOT NULL,
  title TEXT NOT NULL CHECK (CHAR_LENGTH(title) >= 2),
  cover_url TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN (
      '个人成长',
      '情绪管理',
      '职场心理',
      '家庭教育',
      '心理科普',
      '婚姻关系',
      '青少年心理',
      '心理咨询师',
      '正念冥想',
      '认知行为',
      '催眠治疗',
      '沙盘疗法',
      '绘画疗法',
      '团体辅导'
    )
  ),
  type TEXT NOT NULL CHECK (type IN ('直播', '录播', '专栏')),
  instructor_name TEXT NOT NULL,
  learners INTEGER NOT NULL CHECK (learners >= 0),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  original_amount_cents INTEGER NOT NULL CHECK (original_amount_cents >= amount_cents),
  is_free BOOLEAN NOT NULL DEFAULT FALSE,
  member_included BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL CHECK (
    status IN ('draft', 'published', 'unpublished', 'archived')
  ),
  review_status TEXT NOT NULL CHECK (
    review_status IN ('not_submitted', 'pending', 'approved', 'rejected')
  ),
  source TEXT NOT NULL CHECK (source IN ('seed', 'manual', 'imported')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  CHECK (NOT is_free OR amount_cents = 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_course_products_course_id
  ON course_products(course_id);

CREATE INDEX IF NOT EXISTS idx_course_products_status_updated_at
  ON course_products(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS course_product_audit_events (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES course_products(id) ON DELETE CASCADE,
  product_title TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (
    action IN ('status_update', 'price_update', 'info_update')
  ),
  reason TEXT NOT NULL CHECK (CHAR_LENGTH(reason) BETWEEN 4 AND 240),
  before_payload JSONB NOT NULL,
  after_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_course_product_audit_events_product_created_at
  ON course_product_audit_events(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_course_product_audit_events_created_at
  ON course_product_audit_events(created_at DESC);

COMMIT;
