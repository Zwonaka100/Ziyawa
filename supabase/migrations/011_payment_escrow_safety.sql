-- =====================================================
-- PAYMENT ESCROW SAFETY UPGRADE
-- Adds protected balance buckets and completion confirmation fields
-- =====================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS held_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_payout_balance NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS organizer_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_hold_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completion_notes TEXT;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS organizer_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS artist_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_hold_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completion_notes TEXT;

ALTER TABLE provider_bookings
  ADD COLUMN IF NOT EXISTS organizer_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_hold_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completion_notes TEXT;

DO $$
BEGIN
  INSERT INTO platform_settings (key, value, description) VALUES
    ('minimum_payout_amount', '100', 'Minimum payout amount in ZAR'),
    ('payout_hold_hours', '48', 'Default escrow hold time after completion'),
    ('manual_review_threshold_rands', '5000', 'Payouts above this require higher-trust confirmation')
  ON CONFLICT (key) DO NOTHING;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;
