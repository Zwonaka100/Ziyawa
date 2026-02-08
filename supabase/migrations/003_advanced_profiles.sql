-- =====================================================
-- ZIYAWA MIGRATION 003: Advanced Profiles & Trust System
-- Phase 1: Trust First - Track records, media, messaging
-- =====================================================

-- =====================================================
-- PART 1: TRUST & TRACK RECORD SYSTEM
-- =====================================================

-- Add trust stats to artists table
ALTER TABLE artists 
ADD COLUMN IF NOT EXISTS total_bookings INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS completed_bookings INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS cancelled_bookings INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS no_show_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS total_earned DECIMAL(14,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS response_rate DECIMAL(5,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS avg_response_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS bio_long TEXT,
ADD COLUMN IF NOT EXISTS years_active INTEGER,
ADD COLUMN IF NOT EXISTS record_label TEXT,
ADD COLUMN IF NOT EXISTS management_contact TEXT,
ADD COLUMN IF NOT EXISTS rider_document_url TEXT,
ADD COLUMN IF NOT EXISTS press_kit_url TEXT;

-- Add trust stats to profiles (for organisers)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS company_description TEXT,
ADD COLUMN IF NOT EXISTS company_logo TEXT,
ADD COLUMN IF NOT EXISTS company_website TEXT,
ADD COLUMN IF NOT EXISTS years_in_business INTEGER,
ADD COLUMN IF NOT EXISTS total_events_hosted INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS total_artists_paid INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS total_amount_paid DECIMAL(14,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS payment_completion_rate DECIMAL(5,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS organizer_rating DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS organizer_reviews INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS organizer_verified_at TIMESTAMPTZ;

-- Add more trust fields to providers
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS tagline TEXT,
ADD COLUMN IF NOT EXISTS years_in_business INTEGER,
ADD COLUMN IF NOT EXISTS team_size INTEGER,
ADD COLUMN IF NOT EXISTS insurance_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS response_rate DECIMAL(5,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS avg_response_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS total_earned DECIMAL(14,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- =====================================================
-- PART 2: SOCIAL PLATFORMS ENUM
-- =====================================================
CREATE TYPE social_platform AS ENUM (
  'instagram',
  'youtube',
  'tiktok',
  'facebook',
  'twitter',
  'linkedin',
  'spotify',
  'apple_music',
  'soundcloud',
  'deezer',
  'website',
  'other'
);

-- =====================================================
-- PART 3: MEDIA TYPE ENUM
-- =====================================================
CREATE TYPE media_type AS ENUM (
  'image',
  'youtube_video',
  'tiktok_video',
  'instagram_post',
  'instagram_reel',
  'facebook_video',
  'video_url',
  'audio'
);

-- =====================================================
-- PART 4: SOCIAL LINKS TABLES
-- =====================================================

-- Artist Social Links
CREATE TABLE artist_social_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  url TEXT NOT NULL,
  username TEXT,
  follower_count INTEGER,
  is_verified BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(artist_id, platform)
);

-- Organizer Social Links
CREATE TABLE organizer_social_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  url TEXT NOT NULL,
  username TEXT,
  follower_count INTEGER,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(profile_id, platform)
);

-- Provider Social Links
CREATE TABLE provider_social_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  url TEXT NOT NULL,
  username TEXT,
  follower_count INTEGER,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(provider_id, platform)
);

-- =====================================================
-- PART 5: MEDIA GALLERIES
-- =====================================================

-- Artist Media (photos, videos, embeds)
CREATE TABLE artist_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  media_type media_type NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  description TEXT,
  embed_id TEXT, -- For YouTube/TikTok video IDs
  is_featured BOOLEAN DEFAULT false,
  is_profile_image BOOLEAN DEFAULT false,
  is_cover_image BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Organizer Media
CREATE TABLE organizer_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL, -- Optional: link to specific event
  media_type media_type NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  description TEXT,
  embed_id TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_logo BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Provider Media
CREATE TABLE provider_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES provider_services(id) ON DELETE SET NULL, -- Optional: showcase specific service
  media_type media_type NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  description TEXT,
  embed_id TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_logo BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Event Media (posters, gallery, promo videos)
CREATE TABLE event_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  media_type media_type NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  description TEXT,
  embed_id TEXT,
  is_primary_poster BOOLEAN DEFAULT false,
  is_gallery BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- PART 6: VERIFIED PORTFOLIO / PROOF OF WORK
-- =====================================================

-- Artist Verified Performances (linked to actual bookings)
CREATE TABLE artist_portfolio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL, -- Link to actual booking for verification
  
  -- Event details (captured at time of completion)
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  venue_name TEXT,
  venue_location TEXT,
  organizer_name TEXT,
  organizer_id UUID REFERENCES profiles(id),
  
  -- What they did
  performance_type TEXT, -- headliner, supporting, dj set, etc.
  set_duration_minutes INTEGER,
  
  -- Verification
  is_verified BOOLEAN DEFAULT false, -- True if linked to completed booking
  verified_at TIMESTAMPTZ,
  organizer_confirmed BOOLEAN DEFAULT false,
  
  -- Financial (only shown if verified)
  amount_earned DECIMAL(12,2),
  paid_via_ziyawa BOOLEAN DEFAULT false,
  
  -- Media from this performance
  description TEXT,
  highlights TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Portfolio Media (photos/videos from specific performances)
CREATE TABLE portfolio_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES artist_portfolio(id) ON DELETE CASCADE,
  media_type media_type NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  is_highlight BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Provider Portfolio (past work showcase)
CREATE TABLE provider_portfolio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES provider_bookings(id) ON DELETE SET NULL,
  
  -- Event details
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  client_name TEXT,
  client_id UUID REFERENCES profiles(id),
  
  -- What they provided
  service_description TEXT NOT NULL,
  
  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  client_confirmed BOOLEAN DEFAULT false,
  
  -- Financial
  amount_earned DECIMAL(12,2),
  paid_via_ziyawa BOOLEAN DEFAULT false,
  
  description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Provider Portfolio Media
CREATE TABLE provider_portfolio_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES provider_portfolio(id) ON DELETE CASCADE,
  media_type media_type NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- PART 7: REVIEWS & RATINGS SYSTEM
-- =====================================================

-- Reviews (bi-directional: organizer reviews artist, artist reviews organizer)
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Who is being reviewed
  reviewee_type TEXT NOT NULL CHECK (reviewee_type IN ('artist', 'organizer', 'provider')),
  reviewee_id UUID NOT NULL, -- artist_id, profile_id, or provider_id
  
  -- Who is writing the review
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_type TEXT NOT NULL CHECK (reviewer_type IN ('artist', 'organizer', 'provider')),
  
  -- Link to booking for verification
  booking_id UUID, -- Can be artist booking or provider booking
  booking_type TEXT CHECK (booking_type IN ('artist', 'provider')),
  
  -- Rating
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  
  -- Category ratings (optional, for detailed feedback)
  professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
  punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  
  -- Review content
  title TEXT,
  content TEXT,
  
  -- For artist reviews: Was payment on time?
  payment_on_time BOOLEAN,
  -- For organizer reviews: Did artist show up?
  showed_up BOOLEAN,
  -- Would recommend?
  would_recommend BOOLEAN,
  
  -- Verification
  is_verified BOOLEAN DEFAULT false, -- True if linked to completed booking
  
  -- Moderation
  is_public BOOLEAN DEFAULT true,
  is_flagged BOOLEAN DEFAULT false,
  flagged_reason TEXT,
  
  -- Response
  response TEXT,
  response_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- One review per booking per direction
  UNIQUE(booking_id, booking_type, reviewer_id)
);

-- Video Reviews (15-second clips from events)
CREATE TABLE video_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  
  -- Who/what is being showcased
  subject_type TEXT NOT NULL CHECK (subject_type IN ('artist', 'event', 'provider')),
  subject_id UUID NOT NULL,
  
  -- Video details
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER CHECK (duration_seconds <= 60), -- Max 60 seconds
  
  -- Source
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  source TEXT CHECK (source IN ('upload', 'tiktok', 'instagram', 'youtube')),
  
  -- Verification
  event_id UUID REFERENCES events(id),
  is_verified BOOLEAN DEFAULT false, -- Verified to be from actual event
  
  -- Engagement
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  
  -- Moderation
  is_approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- PART 8: IN-APP MESSAGING SYSTEM
-- =====================================================

-- Conversations (thread between users)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Participants (always 2 for now, can extend to group later)
  participant_one UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_two UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Context (optional: link to booking or event)
  context_type TEXT CHECK (context_type IN ('booking', 'provider_booking', 'event', 'general')),
  context_id UUID,
  
  -- Last activity
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT,
  last_message_by UUID REFERENCES profiles(id),
  
  -- Read status
  participant_one_last_read TIMESTAMPTZ DEFAULT NOW(),
  participant_two_last_read TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unread counts (denormalized for performance)
  participant_one_unread INTEGER DEFAULT 0,
  participant_two_unread INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- One conversation per pair
  UNIQUE(participant_one, participant_two)
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Content
  content TEXT NOT NULL,
  
  -- Attachments
  attachment_url TEXT,
  attachment_type TEXT CHECK (attachment_type IN ('image', 'document', 'audio')),
  attachment_name TEXT,
  
  -- Special message types
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'booking_request', 'payment_notification', 'contract')),
  metadata JSONB, -- For special message types (booking details, payment info, etc.)
  
  -- Read status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Delivery
  is_delivered BOOLEAN DEFAULT true,
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Edit/Delete
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- PART 9: ARTIST DISCOGRAPHY
-- =====================================================

CREATE TYPE release_type AS ENUM (
  'single',
  'ep',
  'album',
  'mixtape',
  'compilation',
  'live'
);

CREATE TABLE artist_discography (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  
  -- Release info
  title TEXT NOT NULL,
  release_type release_type NOT NULL,
  release_date DATE,
  
  -- Artwork
  cover_art_url TEXT,
  
  -- Streaming links
  spotify_url TEXT,
  apple_music_url TEXT,
  youtube_music_url TEXT,
  deezer_url TEXT,
  soundcloud_url TEXT,
  
  -- Additional info
  label TEXT,
  description TEXT,
  track_count INTEGER,
  
  -- Featured artists (stored as JSON array of names)
  featured_artists TEXT[],
  
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- PART 10: TRIGGERS FOR STATS
-- =====================================================

-- Update artist stats when booking completes
CREATE OR REPLACE FUNCTION update_artist_trust_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Booking confirmed
  IF NEW.state = 'confirmed' AND (OLD IS NULL OR OLD.state != 'confirmed') THEN
    UPDATE artists 
    SET total_bookings = total_bookings + 1
    WHERE id = NEW.artist_id;
    
    UPDATE profiles
    SET total_artists_paid = total_artists_paid + 1,
        total_amount_paid = total_amount_paid + COALESCE(NEW.final_amount, NEW.offered_amount)
    WHERE id = NEW.organizer_id;
  END IF;
  
  -- Booking completed
  IF NEW.state = 'completed' AND OLD.state != 'completed' THEN
    UPDATE artists 
    SET completed_bookings = completed_bookings + 1,
        total_earned = total_earned + COALESCE(NEW.artist_payout, 0)
    WHERE id = NEW.artist_id;
  END IF;
  
  -- Booking cancelled
  IF NEW.state = 'cancelled' AND OLD.state NOT IN ('cancelled', 'declined') THEN
    UPDATE artists 
    SET cancelled_bookings = cancelled_bookings + 1
    WHERE id = NEW.artist_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_artist_booking_trust_stats ON bookings;
CREATE TRIGGER update_artist_booking_trust_stats
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION update_artist_trust_stats();

-- Update organizer stats when event completes
CREATE OR REPLACE FUNCTION update_organizer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    UPDATE profiles 
    SET total_events_hosted = total_events_hosted + 1
    WHERE id = NEW.organizer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_organizer_event_stats ON events;
CREATE TRIGGER update_organizer_event_stats
AFTER INSERT OR UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION update_organizer_stats();

-- Update provider trust stats
CREATE OR REPLACE FUNCTION update_provider_trust_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.state = 'completed' AND OLD.state != 'completed' THEN
    UPDATE providers 
    SET total_earned = total_earned + COALESCE(NEW.provider_payout, 0)
    WHERE id = NEW.provider_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_provider_booking_trust_stats ON provider_bookings;
CREATE TRIGGER update_provider_booking_trust_stats
AFTER UPDATE ON provider_bookings
FOR EACH ROW EXECUTE FUNCTION update_provider_trust_stats();

-- Update review averages
CREATE OR REPLACE FUNCTION update_review_averages()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating DECIMAL(3,2);
  review_count INTEGER;
BEGIN
  -- Calculate new average for the reviewee
  IF NEW.reviewee_type = 'artist' THEN
    SELECT AVG(overall_rating), COUNT(*) INTO avg_rating, review_count
    FROM reviews 
    WHERE reviewee_type = 'artist' AND reviewee_id = NEW.reviewee_id AND is_public = true;
    
    UPDATE artists 
    SET average_rating = COALESCE(avg_rating, 0),
        total_reviews = review_count
    WHERE id = NEW.reviewee_id;
    
  ELSIF NEW.reviewee_type = 'organizer' THEN
    SELECT AVG(overall_rating), COUNT(*) INTO avg_rating, review_count
    FROM reviews 
    WHERE reviewee_type = 'organizer' AND reviewee_id = NEW.reviewee_id AND is_public = true;
    
    UPDATE profiles 
    SET organizer_rating = COALESCE(avg_rating, 0),
        organizer_reviews = review_count
    WHERE id = NEW.reviewee_id;
    
  ELSIF NEW.reviewee_type = 'provider' THEN
    SELECT AVG(overall_rating), COUNT(*) INTO avg_rating, review_count
    FROM reviews 
    WHERE reviewee_type = 'provider' AND reviewee_id = NEW.reviewee_id AND is_public = true;
    
    UPDATE providers 
    SET average_rating = COALESCE(avg_rating, 0),
        total_reviews = review_count
    WHERE id = NEW.reviewee_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_review_avg_on_insert
AFTER INSERT ON reviews
FOR EACH ROW EXECUTE FUNCTION update_review_averages();

CREATE TRIGGER update_review_avg_on_update
AFTER UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_review_averages();

-- Auto-create portfolio entry when booking completes
CREATE OR REPLACE FUNCTION auto_create_portfolio_entry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.state = 'completed' AND OLD.state != 'completed' THEN
    INSERT INTO artist_portfolio (
      artist_id, 
      booking_id, 
      event_name, 
      event_date, 
      organizer_id,
      is_verified,
      verified_at,
      amount_earned,
      paid_via_ziyawa
    )
    SELECT 
      NEW.artist_id,
      NEW.id,
      e.title,
      e.date,
      NEW.organizer_id,
      true,
      NOW(),
      NEW.artist_payout,
      true
    FROM events e WHERE e.id = NEW.event_id
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_portfolio_on_booking_complete
AFTER UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION auto_create_portfolio_entry();

-- Auto-create provider portfolio on completion
CREATE OR REPLACE FUNCTION auto_create_provider_portfolio()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.state = 'completed' AND OLD.state != 'completed' THEN
    INSERT INTO provider_portfolio (
      provider_id,
      booking_id,
      event_name,
      event_date,
      client_id,
      service_description,
      is_verified,
      verified_at,
      amount_earned,
      paid_via_ziyawa
    )
    SELECT 
      NEW.provider_id,
      NEW.id,
      e.title,
      e.date,
      NEW.organizer_id,
      ps.service_name,
      true,
      NOW(),
      NEW.provider_payout,
      true
    FROM events e, provider_services ps 
    WHERE e.id = NEW.event_id AND ps.id = NEW.service_id
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_portfolio_on_provider_complete
AFTER UPDATE ON provider_bookings
FOR EACH ROW EXECUTE FUNCTION auto_create_provider_portfolio();

-- Update conversation on new message
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    last_message_by = NEW.sender_id,
    participant_one_unread = CASE 
      WHEN participant_one != NEW.sender_id THEN participant_one_unread + 1 
      ELSE participant_one_unread 
    END,
    participant_two_unread = CASE 
      WHEN participant_two != NEW.sender_id THEN participant_two_unread + 1 
      ELSE participant_two_unread 
    END,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_convo_on_message
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- =====================================================
-- PART 11: ROW LEVEL SECURITY
-- =====================================================

-- Social Links RLS
ALTER TABLE artist_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizer_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_social_links ENABLE ROW LEVEL SECURITY;

-- Public can view social links
CREATE POLICY "Public can view artist social links"
ON artist_social_links FOR SELECT USING (true);

CREATE POLICY "Public can view organizer social links"
ON organizer_social_links FOR SELECT USING (true);

CREATE POLICY "Public can view provider social links"
ON provider_social_links FOR SELECT USING (true);

-- Owners can manage their social links
CREATE POLICY "Artist can manage own social links"
ON artist_social_links FOR ALL
USING (artist_id IN (SELECT id FROM artists WHERE profile_id = auth.uid()));

CREATE POLICY "Organizer can manage own social links"
ON organizer_social_links FOR ALL
USING (profile_id = auth.uid());

CREATE POLICY "Provider can manage own social links"
ON provider_social_links FOR ALL
USING (provider_id IN (SELECT id FROM providers WHERE profile_id = auth.uid()));

-- Media RLS
ALTER TABLE artist_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizer_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_media ENABLE ROW LEVEL SECURITY;

-- Public can view media
CREATE POLICY "Public can view artist media"
ON artist_media FOR SELECT USING (true);

CREATE POLICY "Public can view organizer media"
ON organizer_media FOR SELECT USING (true);

CREATE POLICY "Public can view provider media"
ON provider_media FOR SELECT USING (true);

CREATE POLICY "Public can view event media"
ON event_media FOR SELECT USING (true);

-- Owners can manage media
CREATE POLICY "Artist can manage own media"
ON artist_media FOR ALL
USING (artist_id IN (SELECT id FROM artists WHERE profile_id = auth.uid()));

CREATE POLICY "Organizer can manage own media"
ON organizer_media FOR ALL
USING (profile_id = auth.uid());

CREATE POLICY "Provider can manage own media"
ON provider_media FOR ALL
USING (provider_id IN (SELECT id FROM providers WHERE profile_id = auth.uid()));

CREATE POLICY "Event organizer can manage event media"
ON event_media FOR ALL
USING (event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid()));

-- Portfolio RLS
ALTER TABLE artist_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_portfolio_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view artist portfolio"
ON artist_portfolio FOR SELECT USING (true);

CREATE POLICY "Artist can manage own portfolio"
ON artist_portfolio FOR ALL
USING (artist_id IN (SELECT id FROM artists WHERE profile_id = auth.uid()));

CREATE POLICY "Public can view portfolio media"
ON portfolio_media FOR SELECT USING (true);

CREATE POLICY "Artist can manage portfolio media"
ON portfolio_media FOR ALL
USING (portfolio_id IN (
  SELECT ap.id FROM artist_portfolio ap 
  JOIN artists a ON ap.artist_id = a.id 
  WHERE a.profile_id = auth.uid()
));

CREATE POLICY "Public can view provider portfolio"
ON provider_portfolio FOR SELECT USING (true);

CREATE POLICY "Provider can manage own portfolio"
ON provider_portfolio FOR ALL
USING (provider_id IN (SELECT id FROM providers WHERE profile_id = auth.uid()));

CREATE POLICY "Public can view provider portfolio media"
ON provider_portfolio_media FOR SELECT USING (true);

CREATE POLICY "Provider can manage portfolio media"
ON provider_portfolio_media FOR ALL
USING (portfolio_id IN (
  SELECT pp.id FROM provider_portfolio pp 
  JOIN providers p ON pp.provider_id = p.id 
  WHERE p.profile_id = auth.uid()
));

-- Reviews RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view public reviews"
ON reviews FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own reviews"
ON reviews FOR SELECT USING (reviewer_id = auth.uid());

CREATE POLICY "Users can create reviews"
ON reviews FOR INSERT WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "Users can update own reviews"
ON reviews FOR UPDATE USING (reviewer_id = auth.uid());

CREATE POLICY "Public can view approved video reviews"
ON video_reviews FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can upload video reviews"
ON video_reviews FOR INSERT WITH CHECK (uploaded_by = auth.uid());

-- Discography RLS
ALTER TABLE artist_discography ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view discography"
ON artist_discography FOR SELECT USING (true);

CREATE POLICY "Artist can manage own discography"
ON artist_discography FOR ALL
USING (artist_id IN (SELECT id FROM artists WHERE profile_id = auth.uid()));

-- Messaging RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
ON conversations FOR SELECT
USING (participant_one = auth.uid() OR participant_two = auth.uid());

CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
WITH CHECK (participant_one = auth.uid() OR participant_two = auth.uid());

CREATE POLICY "Users can update own conversations"
ON conversations FOR UPDATE
USING (participant_one = auth.uid() OR participant_two = auth.uid());

CREATE POLICY "Users can view messages in their conversations"
ON messages FOR SELECT
USING (conversation_id IN (
  SELECT id FROM conversations 
  WHERE participant_one = auth.uid() OR participant_two = auth.uid()
));

CREATE POLICY "Users can send messages in their conversations"
ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  conversation_id IN (
    SELECT id FROM conversations 
    WHERE participant_one = auth.uid() OR participant_two = auth.uid()
  )
);

CREATE POLICY "Users can update own messages"
ON messages FOR UPDATE
USING (sender_id = auth.uid());

-- =====================================================
-- PART 12: INDEXES
-- =====================================================

-- Social Links
CREATE INDEX idx_artist_social_links_artist ON artist_social_links(artist_id);
CREATE INDEX idx_organizer_social_links_profile ON organizer_social_links(profile_id);
CREATE INDEX idx_provider_social_links_provider ON provider_social_links(provider_id);

-- Media
CREATE INDEX idx_artist_media_artist ON artist_media(artist_id);
CREATE INDEX idx_artist_media_featured ON artist_media(artist_id, is_featured);
CREATE INDEX idx_organizer_media_profile ON organizer_media(profile_id);
CREATE INDEX idx_provider_media_provider ON provider_media(provider_id);
CREATE INDEX idx_event_media_event ON event_media(event_id);

-- Portfolio
CREATE INDEX idx_artist_portfolio_artist ON artist_portfolio(artist_id);
CREATE INDEX idx_artist_portfolio_verified ON artist_portfolio(artist_id, is_verified);
CREATE INDEX idx_portfolio_media_portfolio ON portfolio_media(portfolio_id);
CREATE INDEX idx_provider_portfolio_provider ON provider_portfolio(provider_id);

-- Reviews
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_type, reviewee_id);
CREATE INDEX idx_reviews_reviewer ON reviews(reviewer_id);
CREATE INDEX idx_reviews_booking ON reviews(booking_id, booking_type);
CREATE INDEX idx_video_reviews_subject ON video_reviews(subject_type, subject_id);

-- Discography
CREATE INDEX idx_discography_artist ON artist_discography(artist_id);

-- Messaging
CREATE INDEX idx_conversations_participant_one ON conversations(participant_one);
CREATE INDEX idx_conversations_participant_two ON conversations(participant_two);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(conversation_id, created_at DESC);

-- =====================================================
-- PART 13: PUBLIC VIEWS
-- =====================================================

-- Enhanced public artist view with trust stats
CREATE OR REPLACE VIEW v_public_artists_enhanced AS
SELECT 
  a.id,
  a.stage_name,
  a.genre,
  a.location,
  a.profile_image,
  a.bio,
  a.bio_long,
  a.base_price,
  a.is_available,
  a.years_active,
  a.record_label,
  -- Trust stats
  a.total_bookings,
  a.completed_bookings,
  a.cancelled_bookings,
  a.no_show_count,
  a.average_rating,
  a.total_reviews,
  a.response_rate,
  a.verified_at,
  -- Computed trust score
  CASE 
    WHEN a.total_bookings = 0 THEN 0
    ELSE ROUND(((a.completed_bookings::DECIMAL / NULLIF(a.total_bookings, 0)) * 100)::NUMERIC, 1)
  END as completion_rate,
  CASE 
    WHEN a.total_bookings >= 10 AND a.completed_bookings::DECIMAL / NULLIF(a.total_bookings, 0) >= 0.95 
         AND a.average_rating >= 4.5 AND a.verified_at IS NOT NULL
    THEN true ELSE false 
  END as is_trusted,
  -- Media counts
  (SELECT COUNT(*) FROM artist_media am WHERE am.artist_id = a.id) as media_count,
  (SELECT COUNT(*) FROM artist_social_links asl WHERE asl.artist_id = a.id) as social_link_count,
  (SELECT COUNT(*) FROM artist_portfolio ap WHERE ap.artist_id = a.id AND ap.is_verified = true) as verified_gigs,
  a.created_at
FROM artists a
WHERE a.is_available = true;

GRANT SELECT ON v_public_artists_enhanced TO authenticated;
GRANT SELECT ON v_public_artists_enhanced TO anon;

-- Enhanced organizer view
CREATE OR REPLACE VIEW v_public_organizers AS
SELECT 
  p.id,
  p.full_name,
  p.company_name,
  p.company_description,
  p.company_logo,
  p.location,
  p.company_website,
  p.years_in_business,
  -- Trust stats
  p.total_events_hosted,
  p.total_artists_paid,
  p.total_amount_paid,
  p.payment_completion_rate,
  p.organizer_rating,
  p.organizer_reviews,
  p.organizer_verified_at,
  -- Computed
  CASE 
    WHEN p.total_artists_paid >= 5 AND p.payment_completion_rate >= 95 
         AND p.organizer_rating >= 4.0 AND p.organizer_verified_at IS NOT NULL
    THEN true ELSE false 
  END as is_trusted_organizer,
  (SELECT COUNT(*) FROM organizer_social_links osl WHERE osl.profile_id = p.id) as social_link_count,
  (SELECT COUNT(*) FROM events e WHERE e.organizer_id = p.id AND e.state = 'completed') as completed_events,
  p.created_at
FROM profiles p
WHERE p.is_organizer = true;

GRANT SELECT ON v_public_organizers TO authenticated;
GRANT SELECT ON v_public_organizers TO anon;

-- Enhanced provider view
CREATE OR REPLACE VIEW v_public_providers_enhanced AS
SELECT 
  p.id,
  p.business_name,
  p.tagline,
  p.description,
  p.primary_category,
  p.location,
  p.profile_image,
  p.is_available,
  p.years_in_business,
  p.team_size,
  p.insurance_verified,
  -- Trust stats
  p.total_bookings,
  p.completed_bookings,
  p.average_rating,
  p.total_reviews,
  p.response_rate,
  p.verified_at,
  -- Computed
  CASE 
    WHEN p.total_bookings = 0 THEN 0
    ELSE ROUND(((p.completed_bookings::DECIMAL / NULLIF(p.total_bookings, 0)) * 100)::NUMERIC, 1)
  END as completion_rate,
  CASE 
    WHEN p.total_bookings >= 5 AND p.completed_bookings::DECIMAL / NULLIF(p.total_bookings, 0) >= 0.95 
         AND p.average_rating >= 4.0 AND p.verified_at IS NOT NULL
    THEN true ELSE false 
  END as is_trusted,
  (SELECT COUNT(*) FROM provider_services ps WHERE ps.provider_id = p.id AND ps.is_available = true) as service_count,
  (SELECT COUNT(*) FROM provider_social_links psl WHERE psl.provider_id = p.id) as social_link_count,
  (SELECT COUNT(*) FROM provider_portfolio pp WHERE pp.provider_id = p.id AND pp.is_verified = true) as verified_jobs,
  pr.full_name as owner_name,
  p.created_at
FROM providers p
JOIN profiles pr ON p.profile_id = pr.id
WHERE p.is_available = true;

GRANT SELECT ON v_public_providers_enhanced TO authenticated;
GRANT SELECT ON v_public_providers_enhanced TO anon;

-- =====================================================
-- PART 14: HELPER FUNCTIONS
-- =====================================================

-- Get or create conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  user_one UUID,
  user_two UUID,
  ctx_type TEXT DEFAULT NULL,
  ctx_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  convo_id UUID;
  p1 UUID;
  p2 UUID;
BEGIN
  -- Always store in consistent order
  IF user_one < user_two THEN
    p1 := user_one;
    p2 := user_two;
  ELSE
    p1 := user_two;
    p2 := user_one;
  END IF;
  
  -- Try to find existing
  SELECT id INTO convo_id
  FROM conversations
  WHERE participant_one = p1 AND participant_two = p2;
  
  -- Create if not exists
  IF convo_id IS NULL THEN
    INSERT INTO conversations (participant_one, participant_two, context_type, context_id)
    VALUES (p1, p2, ctx_type, ctx_id)
    RETURNING id INTO convo_id;
  END IF;
  
  RETURN convo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark conversation as read
CREATE OR REPLACE FUNCTION mark_conversation_read(convo_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE conversations
  SET 
    participant_one_unread = CASE WHEN participant_one = auth.uid() THEN 0 ELSE participant_one_unread END,
    participant_two_unread = CASE WHEN participant_two = auth.uid() THEN 0 ELSE participant_two_unread END,
    participant_one_last_read = CASE WHEN participant_one = auth.uid() THEN NOW() ELSE participant_one_last_read END,
    participant_two_last_read = CASE WHEN participant_two = auth.uid() THEN NOW() ELSE participant_two_last_read END
  WHERE id = convo_id;
  
  UPDATE messages
  SET is_read = true, read_at = NOW()
  WHERE conversation_id = convo_id 
    AND sender_id != auth.uid() 
    AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DONE!
-- =====================================================
