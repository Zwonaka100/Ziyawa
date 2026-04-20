-- Verification Requests
-- Supports both individual (ID/passport) and business (CIPC) verification
-- Admins review submissions and approve/reject manually

-- Add entity type to profiles so public profiles can show the right badge
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS verified_entity_type TEXT CHECK (verified_entity_type IN ('individual', 'business'));

-- Main verification requests table
CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Which path: individual person or registered business
  entity_type TEXT NOT NULL CHECK (entity_type IN ('individual', 'business')),

  -- ── Individual fields ──────────────────────────────────────────────────────
  id_type TEXT CHECK (id_type IN ('sa_id', 'passport')),   -- null for business
  id_number TEXT,                                            -- SA ID or passport number
  doc_front_url TEXT,                                        -- storage path, private
  doc_back_url TEXT,                                         -- storage path, private

  -- ── Business fields ────────────────────────────────────────────────────────
  business_name TEXT,
  registration_number TEXT,                                  -- CIPC reg number
  company_reg_cert_url TEXT,                                 -- CIPC certificate, private

  -- Representative (required for business submissions)
  rep_id_number TEXT,
  rep_id_front_url TEXT,
  rep_id_back_url TEXT,

  -- ── Status ────────────────────────────────────────────────────────────────
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),

  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,

  -- Only one active (pending/approved) request per profile at a time
  -- Rejected ones remain for audit; new submission creates a new row
  CONSTRAINT one_pending_per_profile UNIQUE NULLS NOT DISTINCT (profile_id, status)
    -- Note: this unique constraint on (profile_id, status) means only one 'pending'
    -- per profile, and one 'approved' per profile. Rejected can be many.
);

-- Fast lookup for admin queue
CREATE INDEX IF NOT EXISTS idx_verification_requests_status
  ON verification_requests(status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_verification_requests_profile
  ON verification_requests(profile_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

-- Users can see only their own requests
CREATE POLICY "Users can view own verification requests"
  ON verification_requests FOR SELECT
  USING (profile_id = auth.uid());

-- Users can insert their own request (but not update/delete — done via API)
CREATE POLICY "Users can submit verification requests"
  ON verification_requests FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- Admins (service role) bypass RLS for review operations
-- The review API uses supabaseAdmin (service role) so no SELECT/UPDATE policy needed for admins
