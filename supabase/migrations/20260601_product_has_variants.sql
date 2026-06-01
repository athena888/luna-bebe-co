-- Products can opt into size/color variants. When true, the storefront reads
-- stock from product_variants instead of the single-number inventory table.
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_variants BOOLEAN NOT NULL DEFAULT false;

-- Direct-set a variant's quantity (the editor sets absolute counts, unlike the
-- PDF importer's additive upsert_product_variant).
CREATE OR REPLACE FUNCTION set_product_variant(
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
    quantity   = EXCLUDED.quantity,
    color_hex  = COALESCE(EXCLUDED.color_hex, product_variants.color_hex),
    unit_price = COALESCE(EXCLUDED.unit_price, product_variants.unit_price),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement a specific variant's stock (used when an order is paid).
CREATE OR REPLACE FUNCTION decrement_variant(
  p_product_id TEXT,
  p_color TEXT,
  p_size TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE product_variants
  SET quantity = GREATEST(0, quantity - 1), updated_at = NOW()
  WHERE product_id = p_product_id AND color = p_color AND size = p_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
