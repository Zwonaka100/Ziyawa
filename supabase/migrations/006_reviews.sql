-- Reviews & Ratings System
-- Run this in Supabase SQL Editor

-- =====================================================
-- SECTION 1: Clean up (safe drops)
-- =====================================================
DO $$ 
BEGIN
  -- Drop triggers if tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
    DROP TRIGGER IF EXISTS trigger_update_rating_summary ON reviews;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'review_helpful_votes') THEN
    DROP TRIGGER IF EXISTS trigger_update_helpful_count ON review_helpful_votes;
  END IF;
END $$;

DROP FUNCTION IF EXISTS update_event_rating_summary();
DROP FUNCTION IF EXISTS update_review_helpful_count();
DROP FUNCTION IF EXISTS user_attended_event(UUID, UUID);
DROP TABLE IF EXISTS review_helpful_votes CASCADE;
DROP TABLE IF EXISTS event_rating_summaries CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;

-- =====================================================
-- SECTION 2: Create Tables with Foreign Keys
-- =====================================================

-- Reviews table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(100),
  comment TEXT,
  is_verified_attendee BOOLEAN DEFAULT false,
  is_anonymous BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  organizer_response TEXT,
  organizer_responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Review helpful votes
CREATE TABLE review_helpful_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- Event rating summary
CREATE TABLE event_rating_summaries (
  event_id UUID PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  average_rating DECIMAL(2,1) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  rating_1_count INTEGER DEFAULT 0,
  rating_2_count INTEGER DEFAULT 0,
  rating_3_count INTEGER DEFAULT 0,
  rating_4_count INTEGER DEFAULT 0,
  rating_5_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SECTION 3: Indexes
-- =====================================================

CREATE INDEX idx_reviews_event_id ON reviews(event_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX idx_review_helpful_votes_review_id ON review_helpful_votes(review_id);

-- =====================================================
-- SECTION 4: Enable RLS
-- =====================================================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rating_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reviews
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for helpful votes
CREATE POLICY "Anyone can view helpful votes"
  ON review_helpful_votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote helpful"
  ON review_helpful_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own helpful votes"
  ON review_helpful_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS for rating summaries
CREATE POLICY "Anyone can view rating summaries"
  ON event_rating_summaries FOR SELECT
  USING (true);

-- =====================================================
-- SECTION 5: Functions and Triggers
-- =====================================================

-- Function to update rating summary when review is added/updated/deleted
CREATE OR REPLACE FUNCTION update_event_rating_summary()
RETURNS TRIGGER AS $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Get the event_id based on operation
  IF TG_OP = 'DELETE' THEN
    v_event_id := OLD.event_id;
  ELSE
    v_event_id := NEW.event_id;
  END IF;

  -- Upsert the rating summary
  INSERT INTO event_rating_summaries (
    event_id,
    average_rating,
    total_reviews,
    rating_1_count,
    rating_2_count,
    rating_3_count,
    rating_4_count,
    rating_5_count,
    updated_at
  )
  SELECT
    v_event_id,
    COALESCE(ROUND(AVG(rating)::numeric, 1), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE rating = 1),
    COUNT(*) FILTER (WHERE rating = 2),
    COUNT(*) FILTER (WHERE rating = 3),
    COUNT(*) FILTER (WHERE rating = 4),
    COUNT(*) FILTER (WHERE rating = 5),
    NOW()
  FROM reviews
  WHERE event_id = v_event_id
  ON CONFLICT (event_id) DO UPDATE SET
    average_rating = EXCLUDED.average_rating,
    total_reviews = EXCLUDED.total_reviews,
    rating_1_count = EXCLUDED.rating_1_count,
    rating_2_count = EXCLUDED.rating_2_count,
    rating_3_count = EXCLUDED.rating_3_count,
    rating_4_count = EXCLUDED.rating_4_count,
    rating_5_count = EXCLUDED.rating_5_count,
    updated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update rating summary
CREATE TRIGGER trigger_update_rating_summary
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_event_rating_summary();

-- Function to update helpful count
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
DECLARE
  v_review_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_review_id := OLD.review_id;
  ELSE
    v_review_id := NEW.review_id;
  END IF;

  UPDATE reviews
  SET helpful_count = (
    SELECT COUNT(*) FROM review_helpful_votes WHERE review_id = v_review_id
  )
  WHERE id = v_review_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for helpful votes
CREATE TRIGGER trigger_update_helpful_count
  AFTER INSERT OR DELETE ON review_helpful_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_review_helpful_count();

-- Function to check if user attended event (has a ticket)
CREATE OR REPLACE FUNCTION user_attended_event(p_user_id UUID, p_event_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tickets
    WHERE user_id = p_user_id
    AND event_id = p_event_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy for organizers to respond to reviews
CREATE POLICY "Organizers can respond to reviews on their events"
  ON reviews FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = reviews.event_id
      AND events.organizer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = reviews.event_id
      AND events.organizer_id = auth.uid()
    )
  );
