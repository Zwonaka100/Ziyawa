-- ── Step 1 of closing the profiles data exposure ───────────────────────────
--
-- `profiles` is readable by anyone holding the publishable key, which ships
-- inside the browser bundle:
--
--     policy "Profiles are viewable by everyone"
--       cmd: SELECT   roles: {public}   qual: true
--     anon holds SELECT on all 42 columns
--
-- That exposes email, phone, wallet/held/pending balances, the bank columns,
-- and is_admin / admin_role — the last of which also tells an attacker exactly
-- who is worth targeting.
--
-- Closing the policy is a breaking change for every page that reads another
-- user's profile, so it is deliberately NOT done here. This migration contains
-- only the parts that cannot break anything, so the worst of the exposure goes
-- away immediately rather than waiting on the code changes:
--
--   * The bank columns are deleted outright. They are NULL on all 22 rows and
--     referenced nowhere in the application — payout_accounts superseded them,
--     and every bank_* reference in the codebase points there or at
--     verification_requests. A dropped column cannot leak, which beats any
--     policy.
--   * The admin predicate the new policies will need is created now so it can
--     be reviewed on its own.
--
-- 027 closes the policy once the readers have been repointed at the
-- v_public_* views.

-- ── Delete the bank columns ────────────────────────────────────────────────
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS bank_name,
  DROP COLUMN IF EXISTS bank_account_number,
  DROP COLUMN IF EXISTS bank_account_holder;

-- ── Admin check that cannot recurse ────────────────────────────────────────
-- A policy ON profiles that reads profiles to test is_admin would recurse
-- forever. SECURITY DEFINER reads the flag without re-entering RLS, the same
-- pattern as the existing is_event_team_member().
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND (is_admin = true OR admin_role IN ('admin', 'super_admin'))
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
