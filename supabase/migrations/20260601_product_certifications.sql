-- Per-product certifications shown as badges + tap-to-view modal.
-- Array of { key, certificateUrl } objects.
ALTER TABLE products ADD COLUMN IF NOT EXISTS certifications JSONB NOT NULL DEFAULT '[]'::jsonb;
