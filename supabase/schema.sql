-- =====================================================
-- ZIYAWA DATABASE SCHEMA
-- South African Event Marketplace
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- User roles: admin, organizer, artist, user (groovist)
CREATE TYPE user_role AS ENUM ('admin', 'organizer', 'artist', 'user');

-- Booking status flow
CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'declined', 'paid', 'completed', 'cancelled');

-- Transaction types for financial tracking
CREATE TYPE transaction_type AS ENUM ('ticket_sale', 'booking_payment', 'platform_fee', 'payout');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- South African provinces
CREATE TYPE sa_province AS ENUM (
  'gauteng', 
  'western_cape', 
  'kwazulu_natal', 
  'eastern_cape',
  'free_state',
  'mpumalanga',
  'limpopo',
  'north_west',
  'northern_cape'
);

-- =====================================================
-- TABLES
-- =====================================================

-- Profiles: Extended user data linked to Supabase Auth
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'user' NOT NULL,
  phone TEXT,
  wallet_balance DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Artists: Artist profiles for bookable performers
CREATE TABLE artists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  bio TEXT,
  genre TEXT NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  location sa_province NOT NULL,
  profile_image TEXT,
  is_available BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(profile_id) -- One artist profile per user
);

-- Events: Events created by organizers
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  venue TEXT NOT NULL,
  location sa_province NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  ticket_price DECIMAL(10,2) NOT NULL,
  capacity INTEGER NOT NULL,
  tickets_sold INTEGER DEFAULT 0 NOT NULL,
  cover_image TEXT,
  is_published BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Bookings: Organizer requests to book artists
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status booking_status DEFAULT 'pending' NOT NULL,
  offered_amount DECIMAL(10,2) NOT NULL,
  artist_notes TEXT,
  organizer_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(event_id, artist_id) -- Can't book same artist twice for same event
);

-- Transactions: All financial movements
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  status transaction_status DEFAULT 'pending' NOT NULL,
  reference TEXT NOT NULL UNIQUE, -- Our internal reference
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  paystack_reference TEXT, -- Paystack transaction reference
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tickets: Purchased tickets for events
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  ticket_code TEXT NOT NULL UNIQUE, -- Scannable code
  is_used BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_artists_location ON artists(location);
CREATE INDEX idx_artists_genre ON artists(genre);
CREATE INDEX idx_artists_is_available ON artists(is_available);
CREATE INDEX idx_events_location ON events(location);
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_is_published ON events(is_published);
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_artist ON bookings(artist_id);
CREATE INDEX idx_bookings_organizer ON bookings(organizer_id);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_tickets_user ON tickets(user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER artists_updated_at
  BEFORE UPDATE ON artists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
-- Everyone can view profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ARTISTS POLICIES
-- Everyone can view available artists
CREATE POLICY "Artists are viewable by everyone"
  ON artists FOR SELECT
  USING (true);

-- Artists can manage their own artist profile
CREATE POLICY "Artists can insert own artist profile"
  ON artists FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Artists can update own artist profile"
  ON artists FOR UPDATE
  USING (auth.uid() = profile_id);

-- EVENTS POLICIES
-- Everyone can view published events
CREATE POLICY "Published events are viewable by everyone"
  ON events FOR SELECT
  USING (is_published = true OR organizer_id = auth.uid());

-- Organizers can create events
CREATE POLICY "Organizers can create events"
  ON events FOR INSERT
  WITH CHECK (
    auth.uid() = organizer_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('organizer', 'admin')
    )
  );

-- Organizers can update their own events
CREATE POLICY "Organizers can update own events"
  ON events FOR UPDATE
  USING (organizer_id = auth.uid());

-- Organizers can delete their own events
CREATE POLICY "Organizers can delete own events"
  ON events FOR DELETE
  USING (organizer_id = auth.uid());

-- BOOKINGS POLICIES
-- Organizers and artists can view their bookings
CREATE POLICY "Users can view their bookings"
  ON bookings FOR SELECT
  USING (
    organizer_id = auth.uid() OR
    artist_id IN (SELECT id FROM artists WHERE profile_id = auth.uid())
  );

-- Organizers can create booking requests
CREATE POLICY "Organizers can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (
    auth.uid() = organizer_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('organizer', 'admin')
    )
  );

-- Organizers and artists can update their bookings
CREATE POLICY "Users can update their bookings"
  ON bookings FOR UPDATE
  USING (
    organizer_id = auth.uid() OR
    artist_id IN (SELECT id FROM artists WHERE profile_id = auth.uid())
  );

-- TRANSACTIONS POLICIES
-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (user_id = auth.uid());

-- System can create transactions (via service role)
CREATE POLICY "System can create transactions"
  ON transactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- TICKETS POLICIES
-- Users can view their own tickets
CREATE POLICY "Users can view own tickets"
  ON tickets FOR SELECT
  USING (user_id = auth.uid());

-- Event organizers can view tickets for their events
CREATE POLICY "Organizers can view event tickets"
  ON tickets FOR SELECT
  USING (
    event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid())
  );

-- System can create tickets (via service role)
CREATE POLICY "System can create tickets"
  ON tickets FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Calculate platform fee (10% default)
CREATE OR REPLACE FUNCTION calculate_platform_fee(amount DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
  RETURN ROUND(amount * 0.10, 2);
END;
$$ LANGUAGE plpgsql;

-- Generate unique ticket code
CREATE OR REPLACE FUNCTION generate_ticket_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'ZYW-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
END;
$$ LANGUAGE plpgsql;

-- Generate transaction reference
CREATE OR REPLACE FUNCTION generate_transaction_ref()
RETURNS TEXT AS $$
BEGIN
  RETURN 'TXN-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
END;
$$ LANGUAGE plpgsql;
