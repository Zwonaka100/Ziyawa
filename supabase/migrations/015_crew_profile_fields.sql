-- Crew Profile Expansion
-- Unifies event workers and service providers under the Crew dashboard

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS work_mode TEXT NOT NULL DEFAULT 'offering_services'
    CHECK (work_mode IN ('looking_for_work', 'offering_services', 'both')),
  ADD COLUMN IF NOT EXISTS base_rate NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS rate_type TEXT NOT NULL DEFAULT 'daily'
    CHECK (rate_type IN ('fixed', 'hourly', 'daily', 'negotiable')),
  ADD COLUMN IF NOT EXISTS availability_notes TEXT,
  ADD COLUMN IF NOT EXISTS work_roles TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE providers
SET work_mode = COALESCE(work_mode, 'offering_services'),
    rate_type = COALESCE(rate_type, 'daily'),
    work_roles = COALESCE(work_roles, ARRAY[]::TEXT[]);
