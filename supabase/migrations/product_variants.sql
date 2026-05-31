-- ============================================================
-- PRODUCT VARIANTS (color + size inventory)
-- ============================================================

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  color TEXT NOT NULL,
  size TEXT NOT NULL,  -- '0-3','3-6','6-9','9-12','12-18','18-24','one-size'
  quantity INTEGER NOT NULL DEFAULT 0,
  sku TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, color, size)
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants (product_id);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to product_variants"
  ON product_variants FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- Atomic upsert: inserts or increments quantity on conflict
CREATE OR REPLACE FUNCTION upsert_product_variant(
  p_product_id TEXT,
  p_color TEXT,
  p_size TEXT,
  p_quantity INTEGER
) RETURNS VOID AS $$
BEGIN
  INSERT INTO product_variants (product_id, color, size, quantity)
  VALUES (p_product_id, p_color, p_size, p_quantity)
  ON CONFLICT (product_id, color, size)
  DO UPDATE SET
    quantity = product_variants.quantity + EXCLUDED.quantity,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
