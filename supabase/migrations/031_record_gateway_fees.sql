-- ── Record what Paystack actually charges us ───────────────────────────────
--
-- Paystack's real fee has been arriving on every successful charge all along,
-- inside gateway_response as `paystack.fees` with a `paystack.fees_breakdown`
-- splitting their cut from the VAT on it. Nothing has ever read it, so every
-- revenue figure in the app is gross of the gateway cost.
--
-- On the three completed sales that is not a rounding difference:
--
--   buyer paid   R260.00
--   Ziyawa gross  R39.50
--   Paystack took R12.14   <- invisible until now
--   Ziyawa net    R27.36   <- 31% less than what the dashboard reported
--
-- Stored as real columns rather than read out of the JSON each time: they sum
-- and index cheaply, and they survive Paystack changing the shape of their
-- payload. The JSON stays as the source of truth for the backfill and for
-- anything else buried in there.
--
-- Cents, matching transactions.amount / net_amount / platform_fee. (Note that
-- profiles.*_balance and payout_requests.amount are RANDS. The two units live
-- side by side in this schema and mixing them silently produces nonsense.)

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS gateway_fee_cents integer,
  ADD COLUMN IF NOT EXISTS gateway_fee_vat_cents integer;

COMMENT ON COLUMN public.transactions.gateway_fee_cents IS
  'Total charged by the payment gateway for this transaction, in cents, inclusive of VAT. Null means no fee was reported (an incomplete charge, or a pre-existing row).';
COMMENT ON COLUMN public.transactions.gateway_fee_vat_cents IS
  'The VAT portion of gateway_fee_cents, in cents, where the gateway itemises it.';

-- Backfill from what Paystack already sent us.
--
-- fees_breakdown is an array like
--   [{"type":"paystack","amount":245}, {"type":"vat","amount":37}]
-- so the VAT entry is matched on its type rather than its position, which is
-- not guaranteed to be stable.
UPDATE public.transactions
SET
  gateway_fee_cents = (gateway_response -> 'paystack' ->> 'fees')::integer,
  gateway_fee_vat_cents = (
    SELECT (entry ->> 'amount')::integer
    FROM jsonb_array_elements(gateway_response -> 'paystack' -> 'fees_breakdown') AS entry
    WHERE entry ->> 'type' = 'vat'
    LIMIT 1
  )
WHERE gateway_response -> 'paystack' ? 'fees'
  AND gateway_fee_cents IS NULL;

-- Transfers cost roughly R3 ex VAT each and are charged even when they fail.
-- payout_requests records no fee at all today. Nothing has been paid out yet,
-- so there is nothing to backfill - this exists so the first transfer is
-- accounted for rather than discovered later.
ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS transfer_fee_cents integer;

COMMENT ON COLUMN public.payout_requests.transfer_fee_cents IS
  'What the gateway charged to make this transfer, in cents, inclusive of VAT. Ziyawa absorbs this - it is not deducted from the recipient.';

-- Sums over a period filter on state and date; this keeps that off a seq scan
-- as the table grows.
CREATE INDEX IF NOT EXISTS idx_transactions_state_created_at
  ON public.transactions (state, created_at DESC);
