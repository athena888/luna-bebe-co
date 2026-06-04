-- Customer-supplied special requests / notes shown to the admin on the order.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS special_note TEXT;
