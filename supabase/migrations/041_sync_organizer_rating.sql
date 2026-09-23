-- ── Keep organiser ratings in step with their reviews ─────────────────────
--
-- Groovists review events (reviews.event_id), and update_event_rating_summary()
-- keeps event_rating_summaries accurate per event. But the organiser-level
-- columns profiles.organizer_rating / organizer_reviews — which the organiser
-- profile page and v_public_organizers (including is_trusted_organizer) read —
-- were only ever written by update_review_averages(), a leftover from an older
-- review design that no trigger calls. Every organiser showed 0 / "New"
-- however they were reviewed.
--
-- This rolls event summaries up to the organiser whenever a summary changes,
-- and backfills every organiser once.
--
-- SECURITY DEFINER: the review is written from the reviewer's session, which
-- cannot update someone else's profile. As a definer it also passes 040's
-- privileged-column guard, which exempts non-client roles.

CREATE OR REPLACE FUNCTION public.sync_organizer_rating(p_organizer_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  UPDATE profiles p
  SET organizer_rating = COALESCE(agg.rating, 0),
      organizer_reviews = COALESCE(agg.reviews, 0)
  FROM (
    SELECT
      ROUND(SUM(s.average_rating * s.total_reviews) / NULLIF(SUM(s.total_reviews), 0), 2) AS rating,
      SUM(s.total_reviews)::int AS reviews
    FROM event_rating_summaries s
    JOIN events e ON e.id = s.event_id
    WHERE e.organizer_id = p_organizer_id
  ) agg
  WHERE p.id = p_organizer_id;
$function$;

REVOKE ALL ON FUNCTION public.sync_organizer_rating(UUID) FROM public;

CREATE OR REPLACE FUNCTION public.sync_organizer_rating_from_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_event_id UUID := COALESCE(NEW.event_id, OLD.event_id);
  v_organizer_id UUID;
BEGIN
  SELECT organizer_id INTO v_organizer_id FROM events WHERE id = v_event_id;
  IF v_organizer_id IS NOT NULL THEN
    PERFORM sync_organizer_rating(v_organizer_id);
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS sync_organizer_rating ON public.event_rating_summaries;
CREATE TRIGGER sync_organizer_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.event_rating_summaries
  FOR EACH ROW EXECUTE FUNCTION public.sync_organizer_rating_from_summary();

-- Backfill
SELECT public.sync_organizer_rating(id) FROM public.profiles WHERE is_organizer = true;
