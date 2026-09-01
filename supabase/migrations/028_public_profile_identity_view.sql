-- A minimal public identity projection.
--
-- Lots of surfaces need only "who is this, what are they called, what do they
-- look like" for someone other than the caller: the author of a review, the
-- organizer named on an event card, the other participant in a conversation.
-- Today those all embed the profiles table directly, which is why an anonymous
-- visitor can currently read email, phone, balances and admin flags.
--
-- Three columns, nothing else. Deliberately unfiltered by role, because a
-- reviewer or ticket buyer is not an organizer, artist or provider and still
-- has to be nameable. What it reveals is that an account exists and its display
-- name — which is already visible anywhere that person has posted publicly.
--
-- Anything added to this column list is public by definition. Treat it as a
-- published API, not an internal view.

CREATE OR REPLACE VIEW public.v_public_profiles
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url
FROM public.profiles p;

GRANT SELECT ON public.v_public_profiles TO authenticated;
GRANT SELECT ON public.v_public_profiles TO anon;
