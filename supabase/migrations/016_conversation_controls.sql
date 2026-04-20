-- Conversation Controls
-- Adds booking-gated messaging and auto-close when booking completes

-- 1. Add closure fields to conversations
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS is_closed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_reason TEXT CHECK (closed_reason IN ('booking_completed', 'booking_declined', 'admin_closed', 'dispute_resolved'));

-- 2. Add booking linkage to conversations (who initiated)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS initiated_by_booking BOOLEAN NOT NULL DEFAULT false;

-- 3. Index for admin queries
CREATE INDEX IF NOT EXISTS idx_conversations_is_closed ON conversations(is_closed);
CREATE INDEX IF NOT EXISTS idx_conversations_context ON conversations(context_type, context_id);

-- 4. Admin can view ALL conversations (for dispute investigation)
--    Regular users can only see their own (existing policy already covers this)
DROP POLICY IF EXISTS "Admins can view all conversations" ON conversations;
CREATE POLICY "Admins can view all conversations"
ON conversations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.is_admin = true OR profiles.admin_role = 'super_admin')
  )
);

DROP POLICY IF EXISTS "Admins can view all messages" ON messages;
CREATE POLICY "Admins can view all messages"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.is_admin = true OR profiles.admin_role = 'super_admin')
  )
);

-- 5. Prevent sending messages in closed conversations (policy on INSERT)
DROP POLICY IF EXISTS "Cannot send in closed conversations" ON messages;
CREATE POLICY "Cannot send in closed conversations"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.is_closed = true
  )
  AND EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND (conversations.participant_one = auth.uid() OR conversations.participant_two = auth.uid())
  )
);

-- 6. Function to close a conversation
CREATE OR REPLACE FUNCTION close_conversation(convo_id UUID, reason TEXT DEFAULT 'booking_completed')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE conversations
  SET
    is_closed = true,
    closed_at = NOW(),
    closed_reason = reason
  WHERE id = convo_id;
END;
$$;

-- 7. Function to close all conversations linked to a booking when it completes or is declined
CREATE OR REPLACE FUNCTION auto_close_booking_conversations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (NEW.state IN ('completed', 'declined')) AND (OLD.state IS NULL OR OLD.state != NEW.state) THEN
    UPDATE conversations
    SET
      is_closed = true,
      closed_at = NOW(),
      closed_reason = CASE WHEN NEW.state = 'completed' THEN 'booking_completed' ELSE 'booking_declined' END
    WHERE context_type = 'provider_booking'
      AND context_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_close_conversations_on_booking_complete ON provider_bookings;
CREATE TRIGGER trg_close_conversations_on_booking_complete
AFTER UPDATE OF state ON provider_bookings
FOR EACH ROW
EXECUTE FUNCTION auto_close_booking_conversations();

-- Same for regular bookings (artist bookings)
CREATE OR REPLACE FUNCTION auto_close_artist_booking_conversations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (NEW.state IN ('completed', 'declined')) AND (OLD.state IS NULL OR OLD.state != NEW.state) THEN
    UPDATE conversations
    SET
      is_closed = true,
      closed_at = NOW(),
      closed_reason = CASE WHEN NEW.state = 'completed' THEN 'booking_completed' ELSE 'booking_declined' END
    WHERE context_type = 'booking'
      AND context_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_close_conversations_on_artist_booking_complete ON bookings;
CREATE TRIGGER trg_close_conversations_on_artist_booking_complete
AFTER UPDATE OF state ON bookings
FOR EACH ROW
EXECUTE FUNCTION auto_close_artist_booking_conversations();
