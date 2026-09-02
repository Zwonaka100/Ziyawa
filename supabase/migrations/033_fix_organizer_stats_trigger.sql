-- ── The second thing blocking event completion ─────────────────────────────
--
-- With 032 allowing published -> completed, the update got one step further and
-- hit this:
--
--     column "events_hosted" does not exist
--
-- update_organizer_stats() increments `events_hosted` on profiles. That column
-- is called `total_events_hosted`. The function only runs when an event becomes
-- completed, and no event has ever completed, so the typo had never executed —
-- it was hiding behind the state-transition bug in front of it.
--
-- Two faults are fixed here.
--
-- 1. The column name.
--
-- 2. A duplicate trigger. The same function was attached twice:
--
--      trigger_update_organizer_stats   AFTER UPDATE
--      update_organizer_event_stats     AFTER INSERT OR UPDATE
--
--    Both fire on the same update, so the first successful completion would
--    have incremented the organiser's event count by two. The INSERT OR UPDATE
--    one is kept because it also covers a row created already-completed; the
--    UPDATE-only duplicate is dropped.
--
-- The counter is also recomputed from the events table rather than blindly
-- incremented, so it is correct even if a completion is ever replayed.

CREATE OR REPLACE FUNCTION public.update_organizer_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.state = 'completed' AND (OLD IS NULL OR OLD.state != 'completed') THEN
    UPDATE profiles
    SET total_events_hosted = (
      SELECT COUNT(*) FROM events
      WHERE organizer_id = NEW.organizer_id AND state = 'completed'
    )
    WHERE id = NEW.organizer_id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_update_organizer_stats ON public.events;
