-- Add the two display columns the public organizer page needs, so it can read
-- from the view instead of the profiles table directly.
--
-- Both are already public by intent: the avatar is rendered on every organizer
-- card and the verification date drives the trust badge. Nothing here exposes
-- contact details, balances, or admin flags.
--
-- Prerequisite for 028, which closes profiles to anonymous readers.

-- Note: the two new columns are appended at the END of the select list.
-- CREATE OR REPLACE VIEW cannot insert a column in the middle — Postgres
-- rejects it with "cannot change name of view column" — and dropping the view
-- first would briefly break every reader.

CREATE OR REPLACE VIEW public.v_public_organizers
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.full_name,
  p.company_name,
  p.company_description,
  p.company_logo,
  p.location,
  p.company_website,
  p.years_in_business,
  p.total_events_hosted,
  p.total_artists_paid,
  p.total_amount_paid,
  p.payment_completion_rate,
  p.organizer_rating,
  p.organizer_reviews,
  p.organizer_verified_at,
  p.verified_at,
  CASE
    WHEN p.total_artists_paid >= 5
      AND p.payment_completion_rate >= 95
      AND p.organizer_rating >= 4.0
      AND p.organizer_verified_at IS NOT NULL
    THEN true ELSE false
  END AS is_trusted_organizer,
  (
    SELECT COUNT(*)
    FROM public.organizer_social_links osl
    WHERE osl.profile_id = p.id
  ) AS social_link_count,
  (
    SELECT COUNT(*)
    FROM public.events e
    WHERE e.organizer_id = p.id AND e.state = 'completed'
  ) AS completed_events,
  p.created_at,
  p.avatar_url,
  p.verified_at
FROM public.profiles p
WHERE p.is_organizer = true;

GRANT SELECT ON public.v_public_organizers TO authenticated;
GRANT SELECT ON public.v_public_organizers TO anon;
