-- Dispute Tracking
-- Adds dispute metadata columns to bookings and provider_bookings
-- Resolution: 'release' = pay recipient, 'refund' = return to organizer

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
  ADD COLUMN IF NOT EXISTS dispute_opened_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS dispute_resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispute_resolution TEXT,        -- 'release' | 'refund'
  ADD COLUMN IF NOT EXISTS dispute_resolved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS dispute_resolution_notes TEXT;

ALTER TABLE provider_bookings
  ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
  ADD COLUMN IF NOT EXISTS dispute_opened_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS dispute_resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispute_resolution TEXT,
  ADD COLUMN IF NOT EXISTS dispute_resolved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS dispute_resolution_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_disputed ON bookings(state) WHERE state = 'disputed';
CREATE INDEX IF NOT EXISTS idx_provider_bookings_disputed ON provider_bookings(state) WHERE state = 'disputed';
