-- Fix events RLS policy to allow published events to be viewed publicly
-- Organizers must publish their events for them to be visible

-- First, fix the broken trigger that references non-existent 'status' column
DROP TRIGGER IF EXISTS trigger_update_organizer_stats ON events;

-- Fix the function to use 'state' instead of 'status'
CREATE OR REPLACE FUNCTION update_organizer_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stats when event state changes to completed
  IF NEW.state = 'completed' AND (OLD IS NULL OR OLD.state != 'completed') THEN
    UPDATE profiles
    SET events_hosted = COALESCE(events_hosted, 0) + 1
    WHERE id = NEW.organizer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_update_organizer_stats
  AFTER UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_organizer_stats();

-- Add the is_published column if it doesn't exist
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Set existing events with state='published' to is_published=true
UPDATE events SET is_published = true WHERE state = 'published';

-- Drop the old policy
DROP POLICY IF EXISTS "Published events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;

-- Create policy: Published events visible to everyone, drafts only to owner
CREATE POLICY "Published events are viewable by everyone"
  ON events FOR SELECT
  USING (
    is_published = true 
    OR organizer_id = auth.uid()
  );
