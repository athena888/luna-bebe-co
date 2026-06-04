-- Add an optional third variant axis: STYLE / SHAPE (e.g. star vs moon lovey),
-- alongside color + size. Empty string '' means "no style" (the common case),
-- so existing color/size products behave exactly as before.

ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS style TEXT NOT NULL DEFAULT '';

-- The uniqueness key must now include style. Drop the old (product_id,color,size)
-- unique and add (product_id,color,size,style).
ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS product_variants_product_id_color_size_key;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_variants_pcss_key') THEN
    ALTER TABLE product_variants ADD CONSTRAINT product_variants_pcss_key
      UNIQUE (product_id, color, size, style);
  END IF;
END $$;

-- Additive upsert (importer / merge)
CREATE OR REPLACE FUNCTION upsert_product_variant(
  p_product_id TEXT,
  p_color TEXT,
  p_size TEXT,
  p_quantity INTEGER,
  p_color_hex TEXT DEFAULT NULL,
  p_unit_price INTEGER DEFAULT NULL,
  p_color_code TEXT DEFAULT NULL,
  p_style TEXT DEFAULT ''
) RETURNS VOID AS $$
BEGIN
  INSERT INTO product_variants (product_id, color, size, style, quantity, color_hex, unit_price, color_code)
  VALUES (p_product_id, p_color, p_size, COALESCE(p_style, ''), p_quantity, p_color_hex, p_unit_price, p_color_code)
  ON CONFLICT (product_id, color, size, style)
  DO UPDATE SET
    quantity   = product_variants.quantity + EXCLUDED.quantity,
    color_hex  = COALESCE(EXCLUDED.color_hex, product_variants.color_hex),
    unit_price = COALESCE(EXCLUDED.unit_price, product_variants.unit_price),
    color_code = COALESCE(EXCLUDED.color_code, product_variants.color_code),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Absolute set (manual editor)
CREATE OR REPLACE FUNCTION set_product_variant(
  p_product_id TEXT,
  p_color TEXT,
  p_size TEXT,
  p_quantity INTEGER,
  p_color_hex TEXT DEFAULT NULL,
  p_unit_price INTEGER DEFAULT NULL,
  p_color_code TEXT DEFAULT NULL,
  p_style TEXT DEFAULT ''
) RETURNS VOID AS $$
BEGIN
  INSERT INTO product_variants (product_id, color, size, style, quantity, color_hex, unit_price, color_code)
  VALUES (p_product_id, p_color, p_size, COALESCE(p_style, ''), p_quantity, p_color_hex, p_unit_price, p_color_code)
  ON CONFLICT (product_id, color, size, style)
  DO UPDATE SET
    quantity   = EXCLUDED.quantity,
    color_hex  = COALESCE(EXCLUDED.color_hex, product_variants.color_hex),
    unit_price = COALESCE(EXCLUDED.unit_price, product_variants.unit_price),
    color_code = COALESCE(EXCLUDED.color_code, product_variants.color_code),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement a specific variant when an order is paid
CREATE OR REPLACE FUNCTION decrement_variant(
  p_product_id TEXT,
  p_color TEXT,
  p_size TEXT,
  p_style TEXT DEFAULT ''
) RETURNS VOID AS $$
BEGIN
  UPDATE product_variants
  SET quantity = GREATEST(0, quantity - 1), updated_at = NOW()
  WHERE product_id = p_product_id AND color = p_color AND size = p_size AND style = COALESCE(p_style, '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
