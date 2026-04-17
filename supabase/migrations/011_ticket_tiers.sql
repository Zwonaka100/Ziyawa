-- =====================================================
-- TICKET TIERS / RELEASES
-- Supports General, VIP, VVIP, Early Bird, Door Sales
-- =====================================================

CREATE TABLE IF NOT EXISTS event_ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  sold_count INTEGER NOT NULL DEFAULT 0 CHECK (sold_count >= 0),
  sales_start TIMESTAMPTZ,
  sales_end TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT event_ticket_types_sales_window CHECK (
    sales_end IS NULL OR sales_start IS NULL OR sales_end >= sales_start
  ),
  CONSTRAINT event_ticket_types_sold_count_limit CHECK (sold_count <= quantity)
);

CREATE INDEX IF NOT EXISTS idx_event_ticket_types_event_id ON event_ticket_types(event_id);
CREATE INDEX IF NOT EXISTS idx_event_ticket_types_event_sort ON event_ticket_types(event_id, sort_order);

ALTER TABLE event_ticket_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view ticket tiers for live events" ON event_ticket_types;
CREATE POLICY "Public can view ticket tiers for live events"
ON event_ticket_types
FOR SELECT
USING (
  is_public = true
  AND EXISTS (
    SELECT 1
    FROM events
    WHERE events.id = event_ticket_types.event_id
      AND events.state IN ('published', 'locked', 'completed')
  )
);

DROP POLICY IF EXISTS "Organizers can manage their ticket tiers" ON event_ticket_types;
CREATE POLICY "Organizers can manage their ticket tiers"
ON event_ticket_types
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM events
    WHERE events.id = event_ticket_types.event_id
      AND events.organizer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM events
    WHERE events.id = event_ticket_types.event_id
      AND events.organizer_id = auth.uid()
  )
);

DROP TRIGGER IF EXISTS event_ticket_types_updated_at ON event_ticket_types;
CREATE TRIGGER event_ticket_types_updated_at
BEFORE UPDATE ON event_ticket_types
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Backfill default ticket tiers for older events
INSERT INTO event_ticket_types (
  event_id,
  name,
  description,
  price,
  quantity,
  sold_count,
  sort_order,
  is_active,
  is_public
)
SELECT
  e.id,
  'General Admission',
  'Standard event access',
  COALESCE(e.ticket_price, 0),
  COALESCE(NULLIF(e.capacity, 0), 100),
  COALESCE(e.tickets_sold, 0),
  0,
  true,
  true
FROM events e
WHERE NOT EXISTS (
  SELECT 1 FROM event_ticket_types ett WHERE ett.event_id = e.id
);
