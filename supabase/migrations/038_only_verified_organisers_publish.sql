-- ── Only a verified organiser can put an event in front of buyers ──────────
--
-- Publishing is the moment an organiser starts taking other people's money, and
-- until now anyone with an account could do it. Verification then became a
-- problem only later, when they tried to get paid — after the tickets were
-- sold and the audience was committed. Moving the check to publish time means
-- nobody sells a ticket we cannot pay out on, and it raises the floor on who
-- can list an event at all.
--
-- Enforced as a trigger rather than in the API because events are written
-- directly from the browser with the organiser's own session — there is no
-- single server route to guard. A trigger covers every path, including any
-- future one.
--
-- Scope is deliberately narrow:
--
--   * Only fires on the TRANSITION to published. An event that is already
--     published stays published, so nothing live goes dark. Two of those
--     belong to organisers who are not verified today.
--   * Admins are exempt. They are the platform, not a counterparty, and one
--     super_admin already has a published event.
--   * Drafts, edits, completion and cancellation are untouched.
--
-- is_platform_admin() is the existing helper used by the RLS policies, so the
-- definition of "admin" stays in one place.

CREATE OR REPLACE FUNCTION public.require_verified_organiser_to_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  becoming_public BOOLEAN;
  organiser_verified BOOLEAN;
BEGIN
  becoming_public := (NEW.state = 'published' OR NEW.is_published IS TRUE)
    AND (
      TG_OP = 'INSERT'
      OR (OLD.state IS DISTINCT FROM 'published' AND OLD.is_published IS DISTINCT FROM TRUE)
    );

  IF NOT becoming_public THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.is_verified, FALSE) OR COALESCE(p.is_admin, FALSE)
    INTO organiser_verified
  FROM profiles p
  WHERE p.id = NEW.organizer_id;

  IF COALESCE(organiser_verified, FALSE) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Your account must be verified before you can publish an event'
    USING ERRCODE = 'check_violation',
          HINT = 'Verify your identity and bank details in Settings, then publish.';
END;
$function$;

DROP TRIGGER IF EXISTS require_verified_organiser_to_publish ON public.events;
CREATE TRIGGER require_verified_organiser_to_publish
  BEFORE INSERT OR UPDATE OF state, is_published ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.require_verified_organiser_to_publish();
