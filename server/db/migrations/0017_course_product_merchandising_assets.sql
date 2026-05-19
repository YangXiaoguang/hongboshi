BEGIN;

ALTER TABLE course_product_contents
  ADD COLUMN IF NOT EXISTS sales_assets JSONB NOT NULL DEFAULT '{}'::jsonb
  CHECK (jsonb_typeof(sales_assets) = 'object');

COMMIT;
