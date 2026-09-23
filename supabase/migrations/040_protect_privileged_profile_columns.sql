-- ── Users cannot promote themselves ───────────────────────────────────────
--
-- The only UPDATE policy on profiles is "Users can update own profile"
-- (USING auth.uid() = id, no WITH CHECK), and `authenticated` holds UPDATE on
-- every column. So any signed-in user could, from the browser console with the
-- publishable key:
--
--     supabase.from('profiles').update({ is_admin: true, admin_role: 'super_admin' })
--
-- and likewise mark themselves verified (skipping 038's publish gate), set
-- their own wallet/held/pending balances, lift their own ban or suspension,
-- or inflate their organiser rating. The admin email OTP does not help — it
-- goes to the attacker's own inbox.
--
-- This trigger rejects any direct change to those columns. It deliberately
-- lets through:
--
--   * service_role and SECURITY DEFINER functions (current_user is not a client
--     role). Escrow, verification review and event-work acceptance all write
--     via the service-role key; update_organizer_stats() is a definer.
--   * Writes made by another trigger (pg_trigger_depth() > 1). The invoker
--     triggers update_artist_trust_stats() and update_review_averages() maintain
--     the stats columns from the user's own session; their values are computed
--     by the database, not supplied by the client.
--   * Platform admins, whose screens in /admin write profiles from the browser.
--
-- What users legitimately change themselves is untouched: name, phone, avatar,
-- location, company details, onboarded_at, and switching the artist /
-- organiser / provider roles on and off.
--
-- SECURITY INVOKER on purpose: current_user must be the caller's role for the
-- first check to mean anything.

CREATE OR REPLACE FUNCTION public.protect_privileged_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF public.is_platform_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.is_admin, FALSE)
      OR NEW.admin_role IS NOT NULL
      OR COALESCE(NEW.is_verified, FALSE)
      OR NEW.verified_at IS NOT NULL
      OR NEW.verified_entity_type IS NOT NULL
      OR NEW.organizer_verified_at IS NOT NULL
      OR COALESCE(NEW.wallet_balance, 0) <> 0
      OR COALESCE(NEW.held_balance, 0) <> 0
      OR COALESCE(NEW.pending_payout_balance, 0) <> 0
    THEN
      RAISE EXCEPTION 'You cannot set privileged profile fields'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.email IS DISTINCT FROM OLD.email
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    -- access
    OR NEW.is_admin IS DISTINCT FROM OLD.is_admin
    OR NEW.admin_role IS DISTINCT FROM OLD.admin_role
    -- verification
    OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
    OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
    OR NEW.verified_entity_type IS DISTINCT FROM OLD.verified_entity_type
    OR NEW.organizer_verified_at IS DISTINCT FROM OLD.organizer_verified_at
    -- money
    OR NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance
    OR NEW.held_balance IS DISTINCT FROM OLD.held_balance
    OR NEW.pending_payout_balance IS DISTINCT FROM OLD.pending_payout_balance
    -- moderation
    OR NEW.is_suspended IS DISTINCT FROM OLD.is_suspended
    OR NEW.suspended_at IS DISTINCT FROM OLD.suspended_at
    OR NEW.suspended_until IS DISTINCT FROM OLD.suspended_until
    OR NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason
    OR NEW.is_banned IS DISTINCT FROM OLD.is_banned
    OR NEW.banned_at IS DISTINCT FROM OLD.banned_at
    OR NEW.ban_reason IS DISTINCT FROM OLD.ban_reason
    OR NEW.warnings_count IS DISTINCT FROM OLD.warnings_count
    -- trust stats
    OR NEW.total_events_hosted IS DISTINCT FROM OLD.total_events_hosted
    OR NEW.total_artists_paid IS DISTINCT FROM OLD.total_artists_paid
    OR NEW.total_amount_paid IS DISTINCT FROM OLD.total_amount_paid
    OR NEW.payment_completion_rate IS DISTINCT FROM OLD.payment_completion_rate
    OR NEW.organizer_rating IS DISTINCT FROM OLD.organizer_rating
    OR NEW.organizer_reviews IS DISTINCT FROM OLD.organizer_reviews
  THEN
    RAISE EXCEPTION 'You cannot change privileged profile fields'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS protect_privileged_profile_columns ON public.profiles;
CREATE TRIGGER protect_privileged_profile_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_privileged_profile_columns();
