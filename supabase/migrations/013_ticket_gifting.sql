-- =====================================================
-- TICKET GIFTING / CLAIM / RESEND SUPPORT
-- =====================================================

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS ticket_type TEXT NOT NULL DEFAULT 'General Admission',
  ADD COLUMN IF NOT EXISTS price_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS buyer_name TEXT,
  ADD COLUMN IF NOT EXISTS buyer_email TEXT,
  ADD COLUMN IF NOT EXISTS attendee_name TEXT,
  ADD COLUMN IF NOT EXISTS attendee_email TEXT,
  ADD COLUMN IF NOT EXISTS attendee_phone TEXT,
  ADD COLUMN IF NOT EXISTS claim_token TEXT,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS original_owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tickets_attendee_email ON tickets(attendee_email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_claim_token ON tickets(claim_token) WHERE claim_token IS NOT NULL;

UPDATE tickets AS t
SET
  buyer_name = COALESCE(t.buyer_name, p.full_name, 'Ticket Buyer'),
  buyer_email = COALESCE(t.buyer_email, p.email),
  attendee_name = COALESCE(t.attendee_name, p.full_name, 'Ticket Holder'),
  attendee_email = COALESCE(t.attendee_email, p.email),
  delivery_status = COALESCE(
    NULLIF(t.delivery_status, ''),
    CASE
      WHEN COALESCE(t.attendee_email, p.email) = COALESCE(t.buyer_email, p.email) THEN 'owner'
      ELSE 'sent'
    END
  )
FROM profiles AS p
WHERE p.id = t.user_id;