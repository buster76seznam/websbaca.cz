-- Migration 017: Subscription management
-- Billing states (paid/overdue/unpaid), site suspension after 15-day grace,
-- 10-month minimum commitment tracking and official cancellation requests.

-- 1) New billing columns on orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'active';
-- values: 'active' | 'overdue' (payment failed, 15-day grace period) | 'unpaid' (grace ended)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS first_failed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_months_count INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subscription_start_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_before_suspension TEXT;

-- 2) Normalizace legacy českých stavů na anglické ekvivalenty
--    (jinak by ADD CONSTRAINT selhal na starých řádcích)
UPDATE orders SET status = 'draft' WHERE status = 'čeká';
UPDATE orders SET status = 'completed' WHERE status = 'dokončená';
UPDATE orders SET status = 'development' WHERE status = 'vývoj';

-- 3) Allow new lifecycle statuses (suspended = unpaid website, expired = stale draft)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN (
  'draft', 'queued', 'development', 'completed', 'generated', 'preview_ready',
  'revision_requested', 'approved', 'paid', 'active', 'pending_domain', 'failed_email',
  'expired', 'suspended'
));

-- 3) Fast lookup of orders by Stripe subscription id (webhooks)
CREATE INDEX IF NOT EXISTS idx_orders_stripe_subscription ON orders(stripe_subscription_id);

-- 4) Official cancellation requests (30-day notice period, Terms section 3.3)
CREATE TABLE IF NOT EXISTS cancellation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  effective_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
