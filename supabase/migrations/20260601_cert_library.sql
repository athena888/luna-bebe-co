-- Dynamic certification library. Admin can add any cert type.
CREATE TABLE IF NOT EXISTS cert_library (
  key          TEXT PRIMARY KEY,          -- url-safe slug, e.g. "gots", "oeko-tex-100"
  name         TEXT NOT NULL,             -- short badge label, e.g. "GOTS"
  full_name    TEXT NOT NULL DEFAULT '',  -- e.g. "Global Organic Textile Standard"
  blurb        TEXT NOT NULL DEFAULT '',  -- one-line customer-facing explanation
  region       TEXT NOT NULL DEFAULT '',  -- "International", "United States", etc.
  icon_url     TEXT,                      -- uploaded logo image URL
  valid_until  TEXT,                      -- optional expiry date string
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cert_library ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cert_library' AND policyname = 'public read cert_library'
  ) THEN
    CREATE POLICY "public read cert_library" ON cert_library FOR SELECT USING (true);
  END IF;
END $$;

-- Seed the original 4 defaults so existing products still resolve
INSERT INTO cert_library (key, name, full_name, blurb, region, sort_order) VALUES
  ('gots',     'GOTS',         'Global Organic Textile Standard',   'Certified organic fibers, processed to strict environmental and social criteria.', 'International', 0),
  ('oeko-tex', 'OEKO-TEX 100', 'OEKO-TEX® Standard 100',           'Every component tested for harmful substances — safe for a baby''s skin.',          'International', 1),
  ('cpsia',    'CPSIA / ASTM', 'CPSIA & ASTM F963 Compliant',       'Meets U.S. children''s product safety standards (lead, phthalates, small parts).', 'United States',  2),
  ('ce',       'CE / EN71',    'CE — EN71 Safety',                  'Conforms to European toy/textile safety standards EN71-1,2,3.',                     'Europe',         3)
ON CONFLICT (key) DO NOTHING;
