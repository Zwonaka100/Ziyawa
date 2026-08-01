-- Make public directory views respect the caller's RLS context instead of
-- running with the view owner's privileges.

ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

CREATE OR REPLACE VIEW public.v_public_events
WITH (security_invoker = true) AS
SELECT
  e.id,
  e.title,
  e.description,
  e.venue,
  e.venue_address,
  e.location,
  e.event_date,
  e.start_time,
  e.end_time,
  e.doors_open,
  e.ticket_price,
  e.capacity,
  e.tickets_sold,
  e.capacity - e.tickets_sold AS tickets_remaining,
  e.cover_image,
  e.state,
  e.published_at,
  p.id AS organizer_id,
  p.full_name AS organizer_name,
  p.avatar_url AS organizer_avatar
FROM public.events e
JOIN public.profiles p ON e.organizer_id = p.id
WHERE e.state IN ('published', 'locked')
  AND e.event_date >= CURRENT_DATE;

GRANT SELECT ON public.v_public_events TO authenticated;
GRANT SELECT ON public.v_public_events TO anon;

CREATE OR REPLACE VIEW public.v_public_artists
WITH (security_invoker = true) AS
SELECT
  a.id,
  a.stage_name,
  a.bio,
  a.genre,
  a.location,
  a.profile_image,
  a.base_price,
  a.total_bookings,
  a.completed_bookings,
  p.id AS profile_id,
  p.full_name,
  p.avatar_url
FROM public.artists a
JOIN public.profiles p ON a.profile_id = p.id
WHERE a.is_available = true
  AND COALESCE(a.is_public, true) = true;

GRANT SELECT ON public.v_public_artists TO authenticated;
GRANT SELECT ON public.v_public_artists TO anon;

CREATE OR REPLACE VIEW public.v_public_providers
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.business_name,
  p.description,
  p.primary_category,
  p.location,
  p.profile_image,
  p.is_available,
  p.total_bookings,
  p.completed_bookings,
  p.average_rating,
  p.created_at,
  pr.full_name AS owner_name,
  (
    SELECT COUNT(*)
    FROM public.provider_services ps
    WHERE ps.provider_id = p.id AND ps.is_available = true
  ) AS service_count
FROM public.providers p
JOIN public.profiles pr ON p.profile_id = pr.id
WHERE p.is_available = true
  AND COALESCE(p.is_public, true) = true;

GRANT SELECT ON public.v_public_providers TO authenticated;
GRANT SELECT ON public.v_public_providers TO anon;

CREATE OR REPLACE VIEW public.v_public_artists_enhanced
WITH (security_invoker = true) AS
SELECT
  a.id,
  a.stage_name,
  a.genre,
  a.location,
  a.profile_image,
  a.bio,
  a.bio_long,
  a.base_price,
  a.is_available,
  a.years_active,
  a.record_label,
  a.total_bookings,
  a.completed_bookings,
  a.cancelled_bookings,
  a.no_show_count,
  a.average_rating,
  a.total_reviews,
  a.response_rate,
  a.verified_at,
  CASE
    WHEN a.total_bookings = 0 THEN 0
    ELSE ROUND(((a.completed_bookings::DECIMAL / NULLIF(a.total_bookings, 0)) * 100)::NUMERIC, 1)
  END AS completion_rate,
  CASE
    WHEN a.total_bookings >= 10
      AND a.completed_bookings::DECIMAL / NULLIF(a.total_bookings, 0) >= 0.95
      AND a.average_rating >= 4.5
      AND a.verified_at IS NOT NULL
    THEN true ELSE false
  END AS is_trusted,
  (
    SELECT COUNT(*)
    FROM public.artist_media am
    WHERE am.artist_id = a.id
  ) AS media_count,
  (
    SELECT COUNT(*)
    FROM public.artist_social_links asl
    WHERE asl.artist_id = a.id
  ) AS social_link_count,
  (
    SELECT COUNT(*)
    FROM public.artist_portfolio ap
    WHERE ap.artist_id = a.id AND ap.is_verified = true
  ) AS verified_gigs,
  a.created_at
FROM public.artists a
WHERE a.is_available = true
  AND COALESCE(a.is_public, true) = true;

GRANT SELECT ON public.v_public_artists_enhanced TO authenticated;
GRANT SELECT ON public.v_public_artists_enhanced TO anon;

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
  p.created_at
FROM public.profiles p
WHERE p.is_organizer = true;

GRANT SELECT ON public.v_public_organizers TO authenticated;
GRANT SELECT ON public.v_public_organizers TO anon;

CREATE OR REPLACE VIEW public.v_public_providers_enhanced
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.business_name,
  p.tagline,
  p.description,
  p.primary_category,
  p.location,
  p.profile_image,
  p.is_available,
  p.years_in_business,
  p.team_size,
  p.insurance_verified,
  p.total_bookings,
  p.completed_bookings,
  p.average_rating,
  p.total_reviews,
  p.response_rate,
  p.verified_at,
  CASE
    WHEN p.total_bookings = 0 THEN 0
    ELSE ROUND(((p.completed_bookings::DECIMAL / NULLIF(p.total_bookings, 0)) * 100)::NUMERIC, 1)
  END AS completion_rate,
  CASE
    WHEN p.total_bookings >= 5
      AND p.completed_bookings::DECIMAL / NULLIF(p.total_bookings, 0) >= 0.95
      AND p.average_rating >= 4.0
      AND p.verified_at IS NOT NULL
    THEN true ELSE false
  END AS is_trusted,
  (
    SELECT COUNT(*)
    FROM public.provider_services ps
    WHERE ps.provider_id = p.id AND ps.is_available = true
  ) AS service_count,
  (
    SELECT COUNT(*)
    FROM public.provider_social_links psl
    WHERE psl.provider_id = p.id
  ) AS social_link_count,
  (
    SELECT COUNT(*)
    FROM public.provider_portfolio pp
    WHERE pp.provider_id = p.id AND pp.is_verified = true
  ) AS verified_jobs,
  pr.full_name AS owner_name,
  p.created_at
FROM public.providers p
JOIN public.profiles pr ON p.profile_id = pr.id
WHERE p.is_available = true
  AND COALESCE(p.is_public, true) = true;

GRANT SELECT ON public.v_public_providers_enhanced TO authenticated;
GRANT SELECT ON public.v_public_providers_enhanced TO anon;