-- Luna Bébé & Co. — Supabase Schema
-- Run this in your Supabase SQL editor to set up the database

-- ============================================================
-- ORDERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  recipient_name TEXT,
  selected_items JSONB NOT NULL DEFAULT '[]',
  letter_content TEXT,
  shipping_type TEXT NOT NULL CHECK (shipping_type IN ('standard', 'premium')),
  shipping_address JSONB NOT NULL,
  total_amount INTEGER NOT NULL, -- stored in cents
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered')),
  stripe_payment_intent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- CUSTOMER ISSUES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_phone TEXT,
  issue_summary TEXT NOT NULL,
  full_transcript TEXT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_customer_issues_updated_at
  BEFORE UPDATE ON customer_issues
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on both tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_issues ENABLE ROW LEVEL SECURITY;

-- Orders: service role has full access (used by server-side code)
CREATE POLICY "Service role full access to orders"
  ON orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Orders: anon/authenticated cannot directly access
-- (all access goes through server-side API routes using service role)
CREATE POLICY "No direct public access to orders"
  ON orders
  FOR ALL
  TO anon
  USING (false);

-- Customer issues: service role has full access
CREATE POLICY "Service role full access to customer_issues"
  ON customer_issues
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Customer issues: no direct public access
CREATE POLICY "No direct public access to customer_issues"
  ON customer_issues
  FOR ALL
  TO anon
  USING (false);

-- ============================================================
-- INVENTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory (
  product_id TEXT PRIMARY KEY,
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- Seed default inventory (adjust quantities as needed)
INSERT INTO inventory (product_id, quantity) VALUES
  ('swaddle-muslin', 20),
  ('swaddle-bamboo', 20),
  ('swaddle-knit', 15),
  ('garment-gown', 20),
  ('garment-kimono', 20),
  ('garment-romper', 20),
  ('bath-botanical', 20),
  ('bath-shea', 20),
  ('bath-calendula', 20),
  ('keepsake-rattle', 15),
  ('keepsake-bunny', 15),
  ('mom-lavender', 20),
  ('mom-tea', 20),
  ('mom-herbal', 20)
ON CONFLICT (product_id) DO NOTHING;

-- Safely decrement inventory (floor at 0)
CREATE OR REPLACE FUNCTION decrement_inventory(p_product_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE inventory
  SET quantity = GREATEST(0, quantity - 1)
  WHERE product_id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Inventory: service role full access
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to inventory"
  ON inventory FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "No direct public access to inventory"
  ON inventory FOR ALL TO anon USING (false);

-- ============================================================
-- ADD COLUMNS TO ORDERS (run if table already exists)
-- ============================================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS abandoned_cart_email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url TEXT,
  ADD COLUMN IF NOT EXISTS shippo_label_url TEXT;

-- Update status check to include 'cancelled'
-- (run manually if needed: ALTER TABLE orders DROP CONSTRAINT orders_status_check;
--  ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending','processing','shipped','delivered','cancelled'));)

-- ============================================================
-- BOX IMAGE CACHE TABLE
-- ============================================================
-- Stores generated DALL-E box preview images permanently.
-- cache_key = sorted item IDs joined with '|' (e.g. "bath-botanical|garment-kimono|...")
CREATE TABLE IF NOT EXISTS box_image_cache (
  cache_key TEXT PRIMARY KEY,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE box_image_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to box_image_cache"
  ON box_image_cache FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Public read access to box_image_cache"
  ON box_image_cache FOR SELECT TO anon USING (true);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders (customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent ON orders (stripe_payment_intent);

CREATE INDEX IF NOT EXISTS idx_customer_issues_created_at ON customer_issues (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_issues_status ON customer_issues (status);
CREATE INDEX IF NOT EXISTS idx_customer_issues_caller_phone ON customer_issues (caller_phone);
CREATE INDEX IF NOT EXISTS idx_customer_issues_order_id ON customer_issues (order_id);

-- ============================================================
-- SAMPLE DATA (optional — remove before production)
-- ============================================================

-- Uncomment to seed sample data for testing:

-- INSERT INTO orders (customer_name, customer_email, recipient_name, selected_items, shipping_type, shipping_address, total_amount, status) VALUES
-- ('Emily Chen', 'emily@example.com', 'Sarah Johnson', '[{"id":"swaddle-muslin","name":"Organic Muslin Swaddle Set","price":2800,"category":"swaddle","imageEmoji":"🌿"},{"id":"garment-kimono","name":"Bamboo Kimono Set","price":3800,"category":"garment","imageEmoji":"🌸"}]', 'standard', '{"name":"Emily Chen","email":"emily@example.com","line1":"123 Main St","city":"New York","state":"NY","zip":"10001"}', 18200, 'processing'),
-- ('Maya Thompson', 'maya@example.com', 'Jessica Rivera', '[]', 'premium', '{"name":"Maya Thompson","email":"maya@example.com","line1":"456 Oak Ave","city":"Los Angeles","state":"CA","zip":"90001"}', 22600, 'shipped');

-- INSERT INTO customer_issues (caller_phone, issue_summary, full_transcript, status) VALUES
-- ('+15551234567', 'Customer asking about delivery timeline for order', 'Caller: I placed an order 3 days ago and want to know when it will arrive.\n\nLuna: Thank you for reaching out! Your order is currently being assembled by our team. You should receive tracking information within 24 hours. Is there anything else I can help with?', 'resolved'),
-- ('+15559876543', 'Customer wants to change shipping address', 'Caller: I need to change my shipping address for my order.\n\nLuna: I completely understand. I have logged your request and a team member will reach out to you within a few hours to update your shipping details. Is there anything else I can help with?', 'open');
