-- ── Make the anon lockdown in 029 actually workable ────────────────────────
--
-- Revoking anon's table-level SELECT on profiles (029) broke two things that
-- were not obvious until the site was exercised against it. Both are fixed
-- here, and both are the same root cause: something else was reading profiles
-- *as the caller*.
--
-- 1. The v_public_* views ran with security_invoker = true, i.e. as whoever
--    called them. That made them useless the moment the caller lost access to
--    the base table — the views exist precisely to be the safe public path.
--    They are safe to run as owner: every one filters its own rows and selects
--    only display columns. No email, phone, balance, admin or moderation
--    column appears in any of them. Their column lists are the public contract.
--
-- 2. The events SELECT policy inlined `EXISTS (SELECT 1 FROM profiles ...)` to
--    test for admin. Evaluating that needs SELECT on profiles, so an anonymous
--    visitor could no longer read ANY event — the whole public site returned
--    500 with "permission denied for table profiles". is_platform_admin() is
--    SECURITY DEFINER and answers the same question without the caller holding
--    any privilege on profiles, returning false cleanly when auth.uid() is null.
--
-- 23 other policies still inline the same subquery. They sit on
-- admin/authenticated paths that anon never reads, so they are not breaking
-- today, but they carry the same latent fault and should move to the helper.

ALTER VIEW public.v_public_profiles SET (security_invoker = false);
ALTER VIEW public.v_public_organizers SET (security_invoker = false);
ALTER VIEW public.v_public_events SET (security_invoker = false);
ALTER VIEW public.v_public_artists SET (security_invoker = false);
ALTER VIEW public.v_public_providers SET (security_invoker = false);
ALTER VIEW public.v_public_providers_enhanced SET (security_invoker = false);

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO anon;

DROP POLICY IF EXISTS "Published events are viewable by everyone" ON public.events;

-- Note: the helper accepts is_admin = true OR admin_role IN ('admin',
-- 'super_admin') where the old inline check tested is_admin only. Deliberate
-- widening — an admin_role admin should be able to see unpublished events.
CREATE POLICY "Published events are viewable by everyone"
  ON public.events FOR SELECT
  USING (
    is_published = true
    OR organizer_id = auth.uid()
    OR public.is_event_team_member(id)
    OR public.is_platform_admin()
  );
