-- Launch hardening baseline for refunds, wallet auditability, payroll, and door audit logs
-- Rollback notes:
-- 1) Drop view finance_daily_reconciliation
-- 2) Drop tables checkin_scan_logs, balance_ledger_entries, refund_work_items
-- 3) Drop added columns on event_team_payments

CREATE TABLE IF NOT EXISTS refund_work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  source_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  reason_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'under_review', 'approved', 'rejected', 'executed', 'failed')),
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  admin_notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_refund_work_items_source_transaction_unique
  ON refund_work_items (source_transaction_id)
  WHERE source_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_refund_work_items_event_status
  ON refund_work_items(event_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_refund_work_items_user
  ON refund_work_items(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS balance_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL CHECK (bucket IN ('wallet', 'held', 'pending_payout')),
  delta_amount NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  reason_code TEXT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  actor_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_balance_ledger_entries_user_created
  ON balance_ledger_entries(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_balance_ledger_entries_reason
  ON balance_ledger_entries(reason_code, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_balance_ledger_entries_ref
  ON balance_ledger_entries(reference_type, reference_id, created_at DESC);

ALTER TABLE event_team_payments
  ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS payout_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS checkin_scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  access_pass_id UUID REFERENCES event_access_passes(id) ON DELETE SET NULL,
  scanner_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  scan_input TEXT,
  result TEXT NOT NULL CHECK (result IN ('valid', 'already_checked_in', 'wrong_event', 'not_found', 'not_authorized', 'too_early', 'event_ended', 'self_checkin_blocked', 'error')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkin_scan_logs_event_created
  ON checkin_scan_logs(event_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_checkin_scan_logs_result
  ON checkin_scan_logs(result, created_at DESC);

CREATE OR REPLACE VIEW finance_daily_reconciliation AS
SELECT
  DATE(COALESCE(t.settled_at, t.released_at, t.refunded_at, t.failed_at, t.created_at)) AS day,
  ROUND(SUM(CASE WHEN t.type = 'wallet_deposit' AND t.state IN ('settled', 'released') THEN t.net_amount ELSE 0 END) / 100.0, 2) AS wallet_deposits_rands,
  ROUND(SUM(CASE WHEN t.type = 'payout' AND t.state IN ('initiated', 'released', 'settled') THEN t.amount ELSE 0 END) / 100.0, 2) AS payout_requests_rands,
  ROUND(SUM(CASE WHEN t.type = 'refund' AND t.state IN ('settled', 'refunded') THEN t.amount ELSE 0 END) / 100.0, 2) AS refunds_rands,
  ROUND(SUM(CASE WHEN t.state = 'held' THEN t.net_amount ELSE 0 END) / 100.0, 2) AS held_value_rands,
  COUNT(*) AS transaction_count
FROM transactions t
GROUP BY 1
ORDER BY 1 DESC;
