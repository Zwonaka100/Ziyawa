-- =====================================================
-- FIX ADMIN FINANCE SYSTEM
-- =====================================================
-- Issues:
-- 1. Admins can't see transactions due to RLS
-- 2. Need to track platform revenue breakdown
-- 3. Need payout_requests table for withdrawal flow

-- ── FIX 1: Admin access to transactions ────────────────────────────────────

-- Add admin policy to view all transactions
CREATE POLICY "Admins can view all transactions"
  ON transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  ));

-- ── FIX 2: Create payout_requests table ────────────────────────────────────

CREATE TABLE IF NOT EXISTS payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Amount requested
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  
  -- Bank details (snapshot at time of request)
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected', 'failed')),
  
  -- Reference for tracking
  reference TEXT UNIQUE,
  
  -- Admin review
  admin_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  
  -- Timestamps
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Payment gateway tracking
  gateway_reference TEXT,
  gateway_response JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for payout_requests
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests
CREATE POLICY "Users can view own payout requests"
  ON payout_requests FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own requests
CREATE POLICY "Users can create payout requests"
  ON payout_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins can see all requests
CREATE POLICY "Admins can view all payout requests"
  ON payout_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  ));

-- Admins can update requests (for approval/rejection)
CREATE POLICY "Admins can update payout requests"
  ON payout_requests FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  ));

-- Index for admin queue
CREATE INDEX IF NOT EXISTS idx_payout_requests_status 
  ON payout_requests(status, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_payout_requests_user 
  ON payout_requests(user_id);

-- ── FIX 3: Platform revenue tracking view ──────────────────────────────────

-- View to show platform revenue breakdown by event
CREATE OR REPLACE VIEW v_platform_revenue AS
SELECT 
  e.id AS event_id,
  e.title AS event_title,
  e.organizer_id,
  p.full_name AS organizer_name,
  e.event_date,
  e.state AS event_status,
  
  -- Ticket sales
  COUNT(DISTINCT t.id) AS tickets_sold,
  COALESCE(SUM(t.price_paid), 0) AS gross_ticket_revenue,
  
  -- Platform fee (10% of ticket sales)
  COALESCE(SUM(t.price_paid) * 0.10, 0) AS platform_commission,
  
  -- Net to organizer (90%)
  COALESCE(SUM(t.price_paid) * 0.90, 0) AS organizer_net_revenue,
  
  -- Booking costs (what organizer pays to artists/crew)
  COALESCE(SUM(DISTINCT b.final_amount), 0) AS total_booking_costs,
  
  -- Organizer profit (ticket revenue - booking costs)
  COALESCE(SUM(t.price_paid) * 0.90, 0) - COALESCE(SUM(DISTINCT b.final_amount), 0) AS organizer_profit,
  
  -- Payment status
  COUNT(DISTINCT CASE WHEN tr.state IN ('settled', 'released') THEN t.id END) AS paid_tickets,
  COUNT(DISTINCT CASE WHEN tr.state = 'held' THEN t.id END) AS pending_tickets,
  
  e.created_at,
  e.published_at

FROM events e
LEFT JOIN profiles p ON e.organizer_id = p.id
LEFT JOIN tickets t ON t.event_id = e.id
LEFT JOIN transactions tr ON tr.id = t.transaction_id
LEFT JOIN bookings b ON b.event_id = e.id AND b.state IN ('confirmed', 'completed')

WHERE e.state != 'draft'
GROUP BY e.id, e.title, e.organizer_id, p.full_name, e.event_date, e.state, e.created_at, e.published_at
ORDER BY e.event_date DESC;

-- Grant access to authenticated users (admins will see via RLS)
GRANT SELECT ON v_platform_revenue TO authenticated;

-- ── FIX 4: Wallet summary view ─────────────────────────────────────────────

-- View to show wallet balances with user info
CREATE OR REPLACE VIEW v_wallet_summary AS
SELECT 
  p.id AS user_id,
  p.full_name,
  p.email,
  p.avatar_url,
  p.is_organizer,
  p.is_artist,
  p.is_provider,
  p.wallet_balance AS balance,
  p.held_balance,
  p.pending_payout_balance AS pending_balance,
  
  -- Calculate available for withdrawal
  p.wallet_balance - COALESCE(p.held_balance, 0) - COALESCE(p.pending_payout_balance, 0) AS available_balance,
  
  -- Recent activity
  (SELECT COUNT(*) FROM transactions WHERE recipient_id = p.id AND state IN ('settled', 'released')) AS total_transactions,
  (SELECT COUNT(*) FROM payout_requests WHERE user_id = p.id AND status = 'pending') AS pending_payouts,
  
  p.created_at,
  p.updated_at

FROM profiles p
WHERE p.wallet_balance > 0 OR p.held_balance > 0 OR p.pending_payout_balance > 0;

-- Grant access
GRANT SELECT ON v_wallet_summary TO authenticated;

-- ── FIX 5: Transaction summary for users ───────────────────────────────────

-- View to show user's transaction history with context
CREATE OR REPLACE VIEW v_user_transactions AS
SELECT 
  t.id,
  t.reference,
  t.type,
  t.state,
  t.amount,
  t.platform_fee,
  t.net_amount,
  t.payer_id,
  t.recipient_id,
  
  -- Related entities
  t.event_id,
  t.booking_id,
  t.ticket_id,
  
  -- Event details
  e.title AS event_title,
  e.event_date,
  
  -- Payer details
  payer.full_name AS payer_name,
  payer.email AS payer_email,
  
  -- Recipient details  
  recipient.full_name AS recipient_name,
  recipient.email AS recipient_email,
  
  -- Timestamps
  t.created_at,
  t.authorized_at,
  t.settled_at,
  t.refunded_at,
  t.failed_at,
  t.failure_reason

FROM transactions t
LEFT JOIN events e ON e.id = t.event_id
LEFT JOIN profiles payer ON payer.id = t.payer_id
LEFT JOIN profiles recipient ON recipient.id = t.recipient_id;

-- Grant access (RLS on transactions will filter to user's own transactions)
GRANT SELECT ON v_user_transactions TO authenticated;
