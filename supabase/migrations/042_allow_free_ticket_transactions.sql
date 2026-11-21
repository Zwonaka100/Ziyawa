-- ── Allow R0 transactions so free tickets can be issued ───────────────────
--
-- Every ticket must point at a transaction (tickets.transaction_id is NOT
-- NULL), and transactions_amount_check required amount > 0. A free ticket has
-- nothing to charge, so its order could never be recorded and free events
-- could not issue tickets at all.
--
-- Zero is now allowed; negative amounts are still rejected. Paid flows are
-- unaffected: they always compute a positive amount, and Paystack refuses a
-- zero charge anyway.

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_amount_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_amount_check CHECK (amount >= 0);
