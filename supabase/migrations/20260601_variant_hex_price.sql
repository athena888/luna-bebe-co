-- Supplier sheets carry a swatch hex code and a per-unit cost. Store both on
-- variants so the inventory importer can capture them.
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS color_hex   TEXT;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS unit_price  INTEGER; -- cost per unit, in cents

-- Replace the upsert with one that also records hex + unit cost (both optional).
DROP FUNCTION IF EXISTS upsert_product_variant(TEXT, TEXT, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION upsert_product_variant(
  p_product_id TEXT,
  p_color TEXT,
  p_size TEXT,
  p_quantity INTEGER,
  p_color_hex TEXT DEFAULT NULL,
  p_unit_price INTEGER DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO product_variants (product_id, color, size, quantity, color_hex, unit_price)
  VALUES (p_product_id, p_color, p_size, p_quantity, p_color_hex, p_unit_price)
  ON CONFLICT (product_id, color, size)
  DO UPDATE SET
    quantity   = product_variants.quantity + EXCLUDED.quantity,
    color_hex  = COALESCE(EXCLUDED.color_hex, product_variants.color_hex),
    unit_price = COALESCE(EXCLUDED.unit_price, product_variants.unit_price),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
