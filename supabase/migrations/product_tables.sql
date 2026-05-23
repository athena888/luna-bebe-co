-- Run this in your Supabase SQL editor

-- ============================================================
-- PRODUCT OVERRIDES TABLE
-- Stores editable metadata per product (name, description, etc.)
-- Merged with static lib/products.ts data at runtime
-- ============================================================
CREATE TABLE IF NOT EXISTS product_overrides (
  product_id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  price INTEGER,         -- cents
  tag TEXT,
  ingredients TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_product_overrides_updated_at
  BEFORE UPDATE ON product_overrides
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE product_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to product_overrides"
  ON product_overrides FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "No direct public access to product_overrides"
  ON product_overrides FOR ALL TO anon USING (false);

-- ============================================================
-- PRODUCT GALLERY TABLE
-- Stores multiple images per product
-- is_primary = true → also written to product-images/{id}.jpg bucket
-- ============================================================
CREATE TABLE IF NOT EXISTS product_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  label TEXT,              -- optional alt text / label
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_gallery_product_id ON product_gallery (product_id, sort_order);

ALTER TABLE product_gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to product_gallery"
  ON product_gallery FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Public read access to product_gallery"
  ON product_gallery FOR SELECT TO anon USING (true);
