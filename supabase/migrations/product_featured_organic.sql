-- Curate the Bestsellers carousel by hand + flag organic products explicitly.
ALTER TABLE products ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS organic  BOOLEAN NOT NULL DEFAULT false;
