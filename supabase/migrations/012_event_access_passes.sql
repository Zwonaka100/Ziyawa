-- =====================================================
-- EVENT ACCESS PASSES / GUEST LIST / COMP TICKETS
-- =====================================================

CREATE TABLE IF NOT EXISTS event_access_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  pass_type TEXT NOT NULL DEFAULT 'guest_list',
  code TEXT NOT NULL UNIQUE,
  notes TEXT,
  checked_in BOOLEAN NOT NULL DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_access_passes_event_id ON event_access_passes(event_id);
CREATE INDEX IF NOT EXISTS idx_event_access_passes_code ON event_access_passes(code);

ALTER TABLE event_access_passes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organizers can manage their access passes" ON event_access_passes;
CREATE POLICY "Organizers can manage their access passes"
ON event_access_passes
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM events
    WHERE events.id = event_access_passes.event_id
      AND events.organizer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM events
    WHERE events.id = event_access_passes.event_id
      AND events.organizer_id = auth.uid()
  )
);

DROP TRIGGER IF EXISTS event_access_passes_updated_at ON event_access_passes;
CREATE TRIGGER event_access_passes_updated_at
BEFORE UPDATE ON event_access_passes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
