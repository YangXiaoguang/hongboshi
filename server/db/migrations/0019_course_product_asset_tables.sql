BEGIN;

CREATE TABLE IF NOT EXISTS course_product_asset_objects (
  object_key TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'local' CHECK (
    provider IN ('local', 's3', 'oss', 'cos')
  ),
  bucket TEXT,
  region TEXT,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  content_hash TEXT NOT NULL CHECK (
    content_hash ~ '^sha256:[a-f0-9]{64}$'
  ),
  original_file_name TEXT NOT NULL,
  reference_count INTEGER NOT NULL DEFAULT 0 CHECK (reference_count >= 0),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_course_product_asset_objects_hash
  ON course_product_asset_objects(content_hash);

CREATE INDEX IF NOT EXISTS idx_course_product_asset_objects_created_at
  ON course_product_asset_objects(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_course_product_asset_objects_deleted_at
  ON course_product_asset_objects(deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS course_product_assets (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES course_products(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL,
  chapter_id TEXT,
  kind TEXT NOT NULL CHECK (
    kind IN (
      'detail_image',
      'proof_image',
      'chapter_material',
      'worksheet',
      'audio',
      'video'
    )
  ),
  title TEXT NOT NULL CHECK (CHAR_LENGTH(title) BETWEEN 2 AND 100),
  file_name TEXT NOT NULL CHECK (CHAR_LENGTH(file_name) BETWEEN 2 AND 160),
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  source_type TEXT NOT NULL CHECK (
    source_type IN ('external_url', 'inline_upload', 'object_storage')
  ),
  storage_key TEXT,
  object_key TEXT REFERENCES course_product_asset_objects(object_key) ON DELETE SET NULL,
  content_hash TEXT CHECK (
    content_hash IS NULL OR content_hash ~ '^sha256:[a-f0-9]{64}$'
  ),
  public_url TEXT,
  usage TEXT CHECK (usage IN ('showcase', 'proof', 'gallery')),
  alt_text TEXT,
  note TEXT,
  compliance_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    compliance_status IN ('not_required', 'pending', 'approved', 'rejected')
  ),
  download_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  reference_count INTEGER NOT NULL DEFAULT 0 CHECK (reference_count >= 0),
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_course_product_assets_product_updated_at
  ON course_product_assets(product_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_course_product_assets_course_chapter
  ON course_product_assets(course_id, chapter_id, kind);

CREATE INDEX IF NOT EXISTS idx_course_product_assets_compliance
  ON course_product_assets(compliance_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_course_product_assets_object_key
  ON course_product_assets(object_key)
  WHERE object_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_course_product_assets_active
  ON course_product_assets(product_id, kind, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS course_product_asset_references (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES course_product_assets(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES course_products(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL,
  chapter_id TEXT,
  reference_type TEXT NOT NULL CHECK (
    reference_type IN (
      'merchandising_showcase',
      'merchandising_proof',
      'merchandising_gallery',
      'chapter_material',
      'chapter_exercise',
      'chapter_audio',
      'chapter_video'
    )
  ),
  material_placeholder_id TEXT,
  material_placeholder_index INTEGER CHECK (
    material_placeholder_index IS NULL OR material_placeholder_index >= 0
  ),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_course_product_asset_references_asset_active
  ON course_product_asset_references(asset_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_course_product_asset_references_product_course
  ON course_product_asset_references(product_id, course_id, chapter_id);

CREATE INDEX IF NOT EXISTS idx_course_product_asset_references_type_created_at
  ON course_product_asset_references(reference_type, created_at DESC);

COMMIT;
