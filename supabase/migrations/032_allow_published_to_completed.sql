-- ── Let organisers actually complete their events ──────────────────────────
--
-- Reported by an organiser: the "complete event" button fails. It fails for
-- everyone, every time, and always has.
--
-- validate_event_state_transition() allowed only these moves out of published:
--
--     published -> locked | cancelled
--     locked    -> completed | cancelled
--
-- so completing required passing through `locked` first. Nothing in the product
-- ever locks an event. The only code that sets `locked` is a manual admin
-- action in src/app/api/admin/events/[id]/route.ts; the nightly lifecycle cron
-- does not touch state. So every published event was stranded: the organiser
-- clicks complete, Postgres raises
--
--     Invalid event state transition from published to completed
--
-- the update fails, and the API returns a generic 500. Verified against the
-- live database before writing this, in a transaction that rolled back.
--
-- That is why no event has ever been completed on the platform, why R220.50 is
-- still held, and why the completion reminder emails kept going out to
-- organisers who could not act on them.
--
-- The fix is to allow published -> completed. Locking is an OPTIONAL step —
-- it means "close sales early". An event that has already happened can
-- legitimately be completed whether or not anyone locked it first. Requiring
-- the intermediate step encoded a lifecycle the product never performed.
--
-- Everything else is unchanged: draft still cannot jump to completed, a
-- completed or cancelled event still cannot be re-stated, timestamps are still
-- set here, and the audit entry is still written.

CREATE OR REPLACE FUNCTION public.validate_event_state_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.state = 'draft' AND NEW.state NOT IN ('published', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid event state transition from % to %', OLD.state, NEW.state;
  ELSIF OLD.state = 'published' AND NEW.state NOT IN ('locked', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid event state transition from % to %', OLD.state, NEW.state;
  ELSIF OLD.state = 'locked' AND NEW.state NOT IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid event state transition from % to %', OLD.state, NEW.state;
  ELSIF OLD.state IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot change state of % event', OLD.state;
  END IF;

  IF NEW.state = 'published' AND OLD.state != 'published' THEN
    NEW.published_at = NOW();
  ELSIF NEW.state = 'locked' AND OLD.state != 'locked' THEN
    NEW.locked_at = NOW();
  ELSIF NEW.state = 'completed' AND OLD.state != 'completed' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.state = 'cancelled' AND OLD.state != 'cancelled' THEN
    NEW.cancelled_at = NOW();
  END IF;

  PERFORM log_audit('event', NEW.id, 'state_change', OLD.state::TEXT, NEW.state::TEXT);

  RETURN NEW;
END;
$function$;
