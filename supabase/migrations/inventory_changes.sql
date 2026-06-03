-- Track every stock change from an inventory import so the admin can review and
-- approve/revert it on the product page (older stock is never lost).

-- Store the supplier color CODE on variants too (for display + cross-checking)
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS color_code TEXT;

-- Extend the additive upsert to also record the color code (optional)
CREATE OR REPLACE FUNCTION upsert_product_variant(
  p_product_id TEXT,
  p_color TEXT,
  p_size TEXT,
  p_quantity INTEGER,
  p_color_hex TEXT DEFAULT NULL,
  p_unit_price INTEGER DEFAULT NULL,
  p_color_code TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO product_variants (product_id, color, size, quantity, color_hex, unit_price, color_code)
  VALUES (p_product_id, p_color, p_size, p_quantity, p_color_hex, p_unit_price, p_color_code)
  ON CONFLICT (product_id, color, size)
  DO UPDATE SET
    quantity   = product_variants.quantity + EXCLUDED.quantity,
    color_hex  = COALESCE(EXCLUDED.color_hex, product_variants.color_hex),
    unit_price = COALESCE(EXCLUDED.unit_price, product_variants.unit_price),
    color_code = COALESCE(EXCLUDED.color_code, product_variants.color_code),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Let the manual variant editor set the color code too (optional)
CREATE OR REPLACE FUNCTION set_product_variant(
  p_product_id TEXT,
  p_color TEXT,
  p_size TEXT,
  p_quantity INTEGER,
  p_color_hex TEXT DEFAULT NULL,
  p_unit_price INTEGER DEFAULT NULL,
  p_color_code TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO product_variants (product_id, color, size, quantity, color_hex, unit_price, color_code)
  VALUES (p_product_id, p_color, p_size, p_quantity, p_color_hex, p_unit_price, p_color_code)
  ON CONFLICT (product_id, color, size)
  DO UPDATE SET
    quantity   = EXCLUDED.quantity,
    color_hex  = COALESCE(EXCLUDED.color_hex, product_variants.color_hex),
    unit_price = COALESCE(EXCLUDED.unit_price, product_variants.unit_price),
    color_code = COALESCE(EXCLUDED.color_code, product_variants.color_code),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- A log row per imported variant change
CREATE TABLE IF NOT EXISTS inventory_changes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   TEXT NOT NULL,
  color        TEXT NOT NULL,
  color_code   TEXT,
  color_hex    TEXT,
  size         TEXT NOT NULL,
  old_quantity INTEGER NOT NULL DEFAULT 0,
  delta        INTEGER NOT NULL DEFAULT 0,   -- amount added by this import
  new_quantity INTEGER NOT NULL DEFAULT 0,   -- old + delta (after apply)
  unit_price   INTEGER,                      -- cents
  status       TEXT NOT NULL DEFAULT 'pending', -- pending | approved | reverted
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_changes_product_idx ON inventory_changes(product_id, status);

ALTER TABLE inventory_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_changes_service ON inventory_changes;
CREATE POLICY inventory_changes_service ON inventory_changes
  FOR ALL TO service_role USING (true) WITH CHECK (true);
