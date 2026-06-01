-- Live product catalog. Seeded from lib/products.ts on first read (lazy seed).
-- Built-in products keep their original IDs; custom products use is_custom = true.
CREATE TABLE IF NOT EXISTS products (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  price        INTEGER NOT NULL DEFAULT 0,          -- cents
  category     TEXT NOT NULL,
  image_emoji  TEXT NOT NULL DEFAULT '🎁',
  image        TEXT,                                 -- primary image URL (null = no image)
  tag          TEXT,
  ingredients  TEXT,
  active        BOOLEAN NOT NULL DEFAULT true,
  is_custom    BOOLEAN NOT NULL DEFAULT false,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products (active);

-- Public read (storefront reads via service role too, but this is safe for direct reads)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'public read products'
  ) THEN
    CREATE POLICY "public read products" ON products FOR SELECT USING (true);
  END IF;
END $$;
