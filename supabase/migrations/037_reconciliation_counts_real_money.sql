-- ── The reconciliation count was counting checkouts nobody paid ────────────
--
-- finance_daily_reconciliation has four money columns, each correctly filtered
-- by transaction state, and then:
--
--     COUNT(*) AS transaction_count
--
-- with no filter at all. So the 30 July row reports 7 transactions against 3
-- real ticket sales — the other 4 are abandoned checkouts that never took a
-- cent, plus failures.
--
-- That put two finance pages in open disagreement: /admin/finance/transactions
-- deliberately excludes `initiated` and `failed` and reports 3, reconciliation
-- reports 7, and neither says which it means.
--
-- transaction_count now counts money that actually moved. The abandoned and
-- failed counts are kept as their own columns rather than discarded — the
-- ratio between them is the checkout conversion signal, which is worth having,
-- it just is not a money figure.
--
-- Column order is preserved and only additive changes are made, so existing
-- readers keep working.

CREATE OR REPLACE VIEW finance_daily_reconciliation AS
SELECT
  date(COALESCE(settled_at, released_at, refunded_at, failed_at, created_at)) AS day,
  round(sum(
    CASE WHEN type = 'ticket_purchase'::transaction_type
          AND state = ANY (ARRAY['held'::transaction_state, 'released'::transaction_state, 'settled'::transaction_state])
         THEN amount ELSE 0::numeric END) / 100.0, 2) AS ticket_sales_rands,
  round(sum(
    CASE WHEN type = 'payout'::transaction_type
          AND state = ANY (ARRAY['initiated'::transaction_state, 'released'::transaction_state, 'settled'::transaction_state])
         THEN amount ELSE 0::numeric END) / 100.0, 2) AS payout_requests_rands,
  round(sum(
    CASE WHEN type = 'refund'::transaction_type
          AND state = ANY (ARRAY['settled'::transaction_state, 'refunded'::transaction_state])
         THEN amount ELSE 0::numeric END) / 100.0, 2) AS refunds_rands,
  round(sum(
    CASE WHEN state = 'held'::transaction_state THEN net_amount ELSE 0::numeric END) / 100.0, 2) AS held_value_rands,
  count(*) FILTER (
    WHERE state <> ALL (ARRAY['initiated'::transaction_state, 'failed'::transaction_state])
  ) AS transaction_count,
  count(*) FILTER (WHERE state = 'initiated'::transaction_state) AS abandoned_count,
  count(*) FILTER (WHERE state = 'failed'::transaction_state) AS failed_count
FROM transactions t
GROUP BY 1
ORDER BY 1 DESC;
