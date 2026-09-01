-- ── Close the anonymous half of the profiles exposure ──────────────────────
--
-- `profiles` is readable by anyone holding the publishable key, which ships in
-- the browser bundle. 026 deleted the bank columns; this removes anonymous
-- access to the rest of the private data.
--
-- Deliberately column-level rather than a policy change. RLS is row-level, so
-- the only way to keep public pages working (they legitimately need id,
-- full_name, avatar_url and the organizer display fields) while hiding contact
-- details, money and moderation state is to revoke the columns themselves.
--
-- This is the low-risk half. Verified before applying: every anonymous-reachable
-- read selects only display columns —
--   * src/app/api/events/search/route.ts  -> id, full_name, avatar_url
--   * src/app/page.tsx                    -> only inside `if (user)`
--   * /events/[id], /organizers/[id]      -> repointed at v_public_organizers
-- and none of the v_public_* views (which run security_invoker = true, i.e. as
-- the caller) select any column revoked here.
--
-- `authenticated` is untouched. Narrowing that to own-row + admin is the second
-- half and needs ~20 cross-user reads repointed first, so it is not done here.

-- NOTE: a column-level REVOKE against a TABLE-level grant is silently a no-op —
-- you cannot revoke part of a whole-table privilege. The table grant has to go
-- first, then the safe columns are granted back explicitly. Confirmed after
-- applying: anon retains SELECT on none of email, phone, the three balances,
-- is_admin, admin_role, or any moderation column.

REVOKE SELECT ON public.profiles FROM anon;

GRANT SELECT (
  -- Identity and display
  id,
  full_name,
  avatar_url,
  -- Organizer/company presentation, all already shown on public pages
  company_name,
  company_description,
  company_logo,
  company_website,
  location,
  years_in_business,
  -- Role flags drive which public directory someone appears in
  is_artist,
  is_organizer,
  is_provider,
  -- Trust badges
  is_verified,
  verified_at,
  verified_entity_type,
  organizer_rating,
  organizer_reviews,
  organizer_verified_at,
  total_events_hosted,
  total_artists_paid,
  total_amount_paid,
  payment_completion_rate,
  created_at,
  updated_at
) ON public.profiles TO anon;

-- Withheld from anon, and the reason:
--   email, phone                     a ready-made spam and phishing list
--   wallet/held/pending balances     nobody's business but theirs
--   is_admin, admin_role             tells an attacker who to target
--   is_suspended .. warnings_count   moderation state
