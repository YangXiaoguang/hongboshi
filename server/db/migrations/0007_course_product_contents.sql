BEGIN;

CREATE TABLE IF NOT EXISTS course_product_contents (
  product_id TEXT PRIMARY KEY REFERENCES course_products(id) ON DELETE CASCADE,
  summary TEXT NOT NULL CHECK (CHAR_LENGTH(summary) BETWEEN 20 AND 500),
  target_audience JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(target_audience) = 'array'),
  chapters JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(chapters) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_course_product_contents_updated_at
  ON course_product_contents(updated_at DESC);

COMMIT;
