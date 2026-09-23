-- ── Welcome new Groovists once ────────────────────────────────────────────
--
-- New accounts get a one-time welcome at /welcome after their first sign-in:
-- where they usually groove (saved to the existing profiles.location), then
-- straight into Ziwaphi. onboarded_at records that they have seen it — set on
-- finish AND on skip, so it never shows twice.
--
-- Every account that exists today is backfilled as onboarded. They already
-- know their way around, and a welcome screen on their next sign-in would be
-- noise, not help. Only accounts created from here on start NULL.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;

UPDATE public.profiles
  SET onboarded_at = NOW()
  WHERE onboarded_at IS NULL;
