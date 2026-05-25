-- ============================================================
-- AFFILIATE SYSTEM
-- ============================================================

CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.15,
  tier TEXT NOT NULL DEFAULT 'standard' CHECK (tier IN ('standard', 'vip')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  stripe_account_id TEXT,
  stripe_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
  social_handle TEXT,
  audience_size TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_affiliates_updated_at
  BEFORE UPDATE ON affiliates
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  ip TEXT,
  user_agent TEXT,
  referrer TEXT,
  landing_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_total INTEGER NOT NULL,
  commission_amount INTEGER NOT NULL,
  commission_rate NUMERIC(5,4) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'eligible', 'paid', 'refunded', 'reversed')),
  eligible_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payout_id UUID,
  stripe_transfer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_conversion_per_order ON affiliate_conversions (order_id);

CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  conversion_count INTEGER NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  stripe_transfer_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to affiliates"
  ON affiliates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Affiliates can read their own row"
  ON affiliates FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Service role full access to affiliate_clicks"
  ON affiliate_clicks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to affiliate_conversions"
  ON affiliate_conversions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to affiliate_payouts"
  ON affiliate_payouts FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates (code);
CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates (status);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate ON affiliate_clicks (affiliate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_affiliate ON affiliate_conversions (affiliate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_status ON affiliate_conversions (status);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS affiliate_code TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_affiliate_code ON orders (affiliate_code);

-- Mark conversion eligible after 30-day refund window
CREATE OR REPLACE FUNCTION mark_eligible_conversions()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE affiliate_conversions
  SET status = 'eligible', eligible_at = NOW()
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- WHOLESALE / B2B SYSTEM
-- ============================================================

CREATE TABLE IF NOT EXISTS wholesale_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  business_type TEXT,
  ein TEXT,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  website TEXT,
  storefront_address JSONB,
  billing_address JSONB,
  resale_cert_url TEXT,
  expected_monthly_volume INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  tier TEXT NOT NULL DEFAULT 'silver' CHECK (tier IN ('silver', 'gold', 'platinum')),
  payment_terms TEXT NOT NULL DEFAULT 'prepay' CHECK (payment_terms IN ('prepay', 'net30')),
  credit_limit INTEGER NOT NULL DEFAULT 0,
  stripe_customer_id TEXT,
  notes TEXT,
  rejected_reason TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_wholesale_accounts_updated_at
  BEFORE UPDATE ON wholesale_accounts
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE IF NOT EXISTS wholesale_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES wholesale_accounts(id) ON DELETE RESTRICT,
  po_number TEXT,
  line_items JSONB NOT NULL DEFAULT '[]',
  subtotal INTEGER NOT NULL,
  shipping INTEGER NOT NULL DEFAULT 0,
  tax INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  tier_at_order TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('card', 'net30')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'voided')),
  stripe_invoice_id TEXT,
  stripe_payment_intent TEXT,
  shipping_address JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  tracking_number TEXT,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_wholesale_orders_updated_at
  BEFORE UPDATE ON wholesale_orders
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE wholesale_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to wholesale_accounts"
  ON wholesale_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Wholesale accounts read own row"
  ON wholesale_accounts FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Service role full access to wholesale_orders"
  ON wholesale_orders FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_wholesale_accounts_status ON wholesale_accounts (status);
CREATE INDEX IF NOT EXISTS idx_wholesale_orders_account ON wholesale_orders (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wholesale_orders_payment_status ON wholesale_orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_wholesale_orders_due_at ON wholesale_orders (due_at) WHERE payment_status = 'pending';

-- Mark NET-30 invoices overdue
CREATE OR REPLACE FUNCTION mark_overdue_invoices()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE wholesale_orders
  SET payment_status = 'overdue'
  WHERE payment_status = 'pending'
    AND payment_method = 'net30'
    AND due_at IS NOT NULL
    AND due_at < NOW();
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
