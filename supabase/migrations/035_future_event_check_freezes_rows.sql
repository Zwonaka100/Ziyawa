-- ── A CHECK constraint that changes its mind overnight ──────────────────────
--
-- events carried:
--
--     CONSTRAINT future_event CHECK (
--       event_date >= CURRENT_DATE OR state IN ('completed','cancelled')
--     )
--
-- CURRENT_DATE is not immutable. Postgres requires a CHECK to depend only on
-- the row's own values precisely because of what happens otherwise: a row that
-- satisfied the constraint when it was written stops satisfying it later with
-- nobody having touched it. From then on EVERY update to that row is rejected,
-- because a CHECK is re-evaluated for the whole row on any UPDATE.
--
-- The effect on live data, measured 2 Sep 2026 — 7 of 10 events are frozen:
--
--     Amapiano Sundays      2026-03-01  published
--     The Groove            2026-04-29  draft
--     Youth event           2026-04-30  published
--     Blue Mondays          2026-06-01  published
--     Sunset vibes          2026-06-30  draft
--     Soulful Live Session  2026-08-02  published   2 tickets sold
--     Two Man Show          2026-08-29  published   1 ticket sold
--
-- Nothing about those rows can be changed — not a typo in the title, not
-- is_published, not tickets_sold — unless the same statement also sets state to
-- completed or cancelled. That is why completing an event works while every
-- other write to a past event fails: completion happens to satisfy the check on
-- its way past.
--
-- It also blocks the state/is_published reconcile, since both rows that
-- disagree (Youth event, Blue Mondays) are past-dated.
--
-- The rule the constraint was reaching for is "you cannot create an event in
-- the past", which is about the moment of writing, not a permanent property of
-- the row. A CHECK cannot express that; a BEFORE trigger can.
--
-- So: drop the constraint, and enforce the real rule on INSERT, and on an
-- UPDATE that actually moves the date. A state change, a title fix or a ticket
-- sale no longer re-litigates the calendar.
--
-- The UI already enforces the same rule where a user meets it — the create form
-- sets min={today}, and the edit page refuses to open a past event at all — so
-- this is the server-side backstop those two were relying on the constraint for.

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS future_event;

CREATE OR REPLACE FUNCTION public.enforce_event_date_not_in_past()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- A completed or cancelled event is history; its date is allowed to be past.
  IF NEW.state IN ('completed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  -- On UPDATE, only care when the date itself is being moved. Every other
  -- column change on a past event is none of this trigger's business.
  IF TG_OP = 'UPDATE' AND NEW.event_date IS NOT DISTINCT FROM OLD.event_date THEN
    RETURN NEW;
  END IF;

  IF NEW.event_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'An event cannot be dated in the past (got %)', NEW.event_date
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_event_date_not_in_past ON public.events;
CREATE TRIGGER enforce_event_date_not_in_past
  BEFORE INSERT OR UPDATE OF event_date, state ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_event_date_not_in_past();
