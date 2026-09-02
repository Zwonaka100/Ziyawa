-- ── Audit logging must not be able to block the thing it audits ────────────
--
-- The third fault behind the broken "complete event" button, and the one that
-- actually stopped it once 032 and 033 were in.
--
-- Every state-change trigger calls log_audit(), which INSERTs into audit_log.
-- audit_log has exactly one RLS policy — "Audit log admin only", SELECT — and
-- no INSERT policy at all. log_audit() is SECURITY INVOKER, so the insert is
-- attempted as whoever triggered the change. For an organiser that is refused:
--
--     new row violates row-level security policy for table "audit_log"
--
-- The failed insert aborts the trigger, which aborts the UPDATE, which fails
-- the request. An organiser could not complete their own event because the
-- system could not write down that they had.
--
-- Three trigger functions have this shape, so this was never only about events:
--
--     validate_event_state_transition        on events
--     validate_booking_state_transition      on bookings
--     validate_transaction_state_transition  on transactions
--
-- Transactions and bookings mostly move via the service role (webhooks, admin
-- routes) which bypasses RLS, which is why only the organiser-facing path
-- surfaced this.
--
-- Fixed by making the three TRIGGER functions SECURITY DEFINER, rather than
-- log_audit() itself or by opening audit_log to inserts:
--
--   * A trigger function cannot be called directly — Postgres refuses it
--     outside a trigger context — so this adds no way to forge audit rows.
--   * Making log_audit() SECURITY DEFINER would let any authenticated caller
--     write arbitrary audit entries, and it cannot have EXECUTE revoked
--     because the triggers are invoked by those same users.
--   * An INSERT policy on audit_log would let users write audit rows directly
--     through the API, which defeats the point of an audit trail.
--
-- search_path is pinned on each, which is required practice for SECURITY
-- DEFINER: without it the function resolves unqualified names against the
-- caller's search_path.
--
-- Bodies are unchanged — ALTER FUNCTION only flips the security context, so
-- there is no risk of transcribing the logic wrongly.

ALTER FUNCTION public.validate_event_state_transition() SECURITY DEFINER;
ALTER FUNCTION public.validate_event_state_transition() SET search_path = public, pg_temp;

ALTER FUNCTION public.validate_booking_state_transition() SECURITY DEFINER;
ALTER FUNCTION public.validate_booking_state_transition() SET search_path = public, pg_temp;

ALTER FUNCTION public.validate_transaction_state_transition() SECURITY DEFINER;
ALTER FUNCTION public.validate_transaction_state_transition() SET search_path = public, pg_temp;

-- update_organizer_stats() writes to profiles from the same trigger path and
-- would hit the same wall the moment an organiser completes an event.
ALTER FUNCTION public.update_organizer_stats() SECURITY DEFINER;
ALTER FUNCTION public.update_organizer_stats() SET search_path = public, pg_temp;
