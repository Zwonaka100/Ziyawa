-- ── Close the payout request loop ──────────────────────────────────────────
--
-- payout_requests.status already allows 'completed' and 'failed', and the table
-- already has completed_at, but nothing ever wrote them: the Paystack transfer
-- webhooks updated `transactions` and the balance buckets and left the request
-- sitting at 'processing' forever.
--
-- That mattered beyond a stale badge. enqueuePayoutRequest() skips anyone who
-- already has a request in ('pending','approved','processing'), so a row stuck
-- at 'processing' permanently blocked that person from ever being queued again
-- — their later earnings would release into their available balance and never
-- appear in the payouts queue at all.
--
-- This migration adds the one column the webhook needs to explain a failure.
-- The reason is already stored on transactions.failure_reason, but the admin
-- payouts panel reads payout_requests, so without it a failed payout shows as
-- 'failed' with no indication of why.

ALTER TABLE payout_requests
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;

COMMENT ON COLUMN payout_requests.failure_reason IS
  'Why the transfer failed or was reversed, written by the Paystack webhook. Distinct from admin_notes, which is written by a human.';

-- Surfacing settled payouts in the panel means filtering on terminal statuses
-- as often as on pending ones.
CREATE INDEX IF NOT EXISTS idx_payout_requests_user_status
  ON payout_requests(user_id, status);
