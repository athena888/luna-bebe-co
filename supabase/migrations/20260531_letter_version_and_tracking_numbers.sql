-- Add letter_version column to track which of 2 generated letters user chose
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS letter_version SMALLINT CHECK (letter_version IN (1, 2));

-- Auto-generate tracking numbers for all existing orders without them
UPDATE orders
SET tracking_number = gen_random_uuid()::text
WHERE tracking_number IS NULL;

-- Make tracking_number non-nullable going forward
ALTER TABLE orders
  ALTER COLUMN tracking_number SET NOT NULL;

-- Create index for tracking lookups
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders (tracking_number);
