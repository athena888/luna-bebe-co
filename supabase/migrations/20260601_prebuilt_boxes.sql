-- Editable prebuilt boxes. Seeded from lib/prebuilt-boxes.ts on first read.
-- selection maps the 7 slots to { product_id, color?, size? } (or null).
CREATE TABLE IF NOT EXISTS prebuilt_boxes (
  slug         TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  style        TEXT NOT NULL DEFAULT 'Summer',
  variant      TEXT NOT NULL DEFAULT 'neutral',   -- 'neutral' | 'girl' | 'boy'
  tagline      TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  aesthetic    TEXT NOT NULL DEFAULT '',
  featured     BOOLEAN NOT NULL DEFAULT true,
  image        TEXT,
  custom_price INTEGER,                            -- cents; null = computed
  sort_order   INTEGER NOT NULL DEFAULT 0,
  active       BOOLEAN NOT NULL DEFAULT true,
  selection    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE prebuilt_boxes ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'prebuilt_boxes' AND policyname = 'public read prebuilt_boxes'
  ) THEN
    CREATE POLICY "public read prebuilt_boxes" ON prebuilt_boxes FOR SELECT USING (true);
  END IF;
END $$;
