-- =====================================================
-- ZIYAWA DATABASE SCHEMA v2.0
-- Production-Ready Event Marketplace
-- Based on Phase 0 Foundational Design
-- =====================================================
-- 
-- PRINCIPLES:
-- 1. Ziyawa is a neutral platform (sides with rules, not parties)
-- 2. Money never moves without a state change
-- 3. One human, many roles (roles are permissions, not identities)
-- 4. Events are sacred (published events have consequences)
--
-- =====================================================

-- =====================================================
-- CLEANUP: Drop existing objects (run fresh)
-- =====================================================

-- Drop views first
DROP VIEW IF EXISTS v_public_artists CASCADE;
DROP VIEW IF EXISTS v_public_events CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS update_event_tickets ON tickets;
DROP TRIGGER IF EXISTS update_artist_booking_stats ON bookings;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS validate_transaction_state ON transactions;
DROP TRIGGER IF EXISTS validate_booking_state ON bookings;
DROP TRIGGER IF EXISTS validate_event_state ON events;
DROP TRIGGER IF EXISTS transactions_updated_at ON transactions;
DROP TRIGGER IF EXISTS bookings_updated_at ON bookings;
DROP TRIGGER IF EXISTS events_updated_at ON events;
DROP TRIGGER IF EXISTS artists_updated_at ON artists;
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;

-- Drop functions
DROP FUNCTION IF EXISTS update_event_ticket_count() CASCADE;
DROP FUNCTION IF EXISTS update_artist_stats() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS validate_transaction_state_transition() CASCADE;
DROP FUNCTION IF EXISTS validate_booking_state_transition() CASCADE;
DROP FUNCTION IF EXISTS validate_event_state_transition() CASCADE;
DROP FUNCTION IF EXISTS log_audit(TEXT, UUID, TEXT, TEXT, TEXT, UUID, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS calculate_platform_fee(DECIMAL, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS generate_ticket_code() CASCADE;
DROP FUNCTION IF EXISTS generate_transaction_reference() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

-- Drop tables (in dependency order)
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS payouts CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS artists CASCADE;
DROP TABLE IF EXISTS profiles CASCADE; -- Will delete existing user profiles!

-- Drop demo tables if they exist
DROP TABLE IF EXISTS demo_events CASCADE;
DROP TABLE IF EXISTS demo_artists CASCADE;

-- Drop types
DROP TYPE IF EXISTS recipient_type CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS transaction_state CASCADE;
DROP TYPE IF EXISTS booking_state CASCADE;
DROP TYPE IF EXISTS event_state CASCADE;
DROP TYPE IF EXISTS sa_province CASCADE;

-- Legacy type cleanup
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS transaction_status CASCADE;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUM TYPES (State Machines)
-- =====================================================

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

-- EVENT LIFECYCLE STATES
-- Events can only move forward, never backwards
-- Draft → Published → Locked → Completed
--                  ↘ Cancelled
CREATE TYPE event_state AS ENUM (
  'draft',      -- Only organizer sees it, no tickets, no bookings
  'published',  -- Visible on Ziwaphi, tickets sell, bookings accepted
  'locked',     -- Event date near, no new bookings, tickets may sell
  'completed',  -- Event happened, payouts release, reviews possible
  'cancelled'   -- Event didn't happen, refund rules apply
);

-- BOOKING STATES
-- Pending → Accepted → Confirmed (paid) → Completed
--        ↘ Declined
--                   ↘ Cancelled
CREATE TYPE booking_state AS ENUM (
  'pending',    -- Request sent, waiting for artist response
  'accepted',   -- Artist accepted, waiting for payment
  'declined',   -- Artist declined the booking
  'confirmed',  -- Payment received, booking is locked in
  'completed',  -- Event done, payout released to artist
  'cancelled',  -- Cancelled after acceptance, refund rules apply
  'disputed'    -- Under dispute resolution
);

-- TRANSACTION LIFECYCLE STATES
-- Money journey: Initiated → Authorized → Held → Released → Settled
--                                      ↘ Refunded
CREATE TYPE transaction_state AS ENUM (
  'initiated',   -- User clicked pay, no money yet
  'authorized',  -- Payment gateway confirmed, money received by platform
  'held',        -- Money assigned but locked, waiting for conditions
  'released',    -- Conditions met, payout triggered
  'settled',     -- Money arrived in recipient bank
  'refunded',    -- Partial or full refund processed
  'failed'       -- Transaction failed at any point
);

-- TRANSACTION TYPES (what the money is for)
CREATE TYPE transaction_type AS ENUM (
  'ticket_purchase',    -- Groovist buying event ticket
  'artist_booking',     -- Organizer paying to book artist
  'vendor_service',     -- Organizer paying for vendor service (future)
  'payout',             -- Platform releasing held funds
  'refund',             -- Money returning to payer
  'platform_fee'        -- Ziyawa's cut (internal ledger)
);

-- PAYOUT RECIPIENT TYPE
CREATE TYPE recipient_type AS ENUM (
  'organizer',
  'artist',
  'vendor'
);

-- =====================================================
-- CORE TABLES
-- =====================================================

-- PROFILES: Extended user data linked to Supabase Auth
-- Principle 3: One human, many roles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  
  -- Role flags (a user can have multiple roles)
  is_artist BOOLEAN DEFAULT false NOT NULL,
  is_organizer BOOLEAN DEFAULT false NOT NULL,
  is_admin BOOLEAN DEFAULT false NOT NULL,
  
  -- Financial
  wallet_balance DECIMAL(12,2) DEFAULT 0.00 NOT NULL,
  
  -- Bank details for payouts (encrypted in production)
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_holder TEXT,
  
  -- Verification
  is_verified BOOLEAN DEFAULT false NOT NULL,
  verified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ARTISTS: Artist profiles for performers
-- Linked to a profile, contains booking-specific info
CREATE TABLE artists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Public info
  stage_name TEXT NOT NULL,
  bio TEXT,
  genre TEXT NOT NULL,
  location sa_province NOT NULL,
  profile_image TEXT,
  
  -- Booking settings
  base_price DECIMAL(12,2) NOT NULL,
  is_available BOOLEAN DEFAULT true NOT NULL,
  advance_notice_days INTEGER DEFAULT 7 NOT NULL, -- Minimum days notice for booking
  
  -- Stats (denormalized for performance)
  total_bookings INTEGER DEFAULT 0 NOT NULL,
  completed_bookings INTEGER DEFAULT 0 NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- EVENTS: The sacred entity
-- Principle 4: Events are sacred - published events have consequences
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT, -- Can't delete organizer with events
  
  -- Basic info
  title TEXT NOT NULL,
  description TEXT,
  venue TEXT NOT NULL,
  venue_address TEXT,
  location sa_province NOT NULL,
  
  -- Timing
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  doors_open TIME, -- When venue opens
  
  -- Ticketing
  ticket_price DECIMAL(12,2) NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  tickets_sold INTEGER DEFAULT 0 NOT NULL CHECK (tickets_sold >= 0),
  
  -- Media
  cover_image TEXT,
  
  -- STATE MACHINE
  state event_state DEFAULT 'draft' NOT NULL,
  published_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  -- Financial tracking
  total_revenue DECIMAL(12,2) DEFAULT 0.00 NOT NULL,
  total_booking_costs DECIMAL(12,2) DEFAULT 0.00 NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_capacity CHECK (tickets_sold <= capacity),
  CONSTRAINT future_event CHECK (event_date >= CURRENT_DATE OR state IN ('completed', 'cancelled'))
);

-- BOOKINGS: Artist engagement for events
-- Principle 2: Money never moves without state change
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Parties involved
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE RESTRICT,
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- STATE MACHINE
  state booking_state DEFAULT 'pending' NOT NULL,
  
  -- Financial
  offered_amount DECIMAL(12,2) NOT NULL CHECK (offered_amount > 0),
  final_amount DECIMAL(12,2), -- May differ after negotiation
  platform_fee DECIMAL(12,2), -- Calculated when confirmed
  artist_payout DECIMAL(12,2), -- Amount artist receives
  
  -- Performance details
  set_duration_minutes INTEGER,
  performance_time TIME,
  special_requirements TEXT,
  
  -- Communication log
  organizer_notes TEXT,
  artist_notes TEXT,
  
  -- State timestamps (audit trail)
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ, -- When payment received
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  UNIQUE(event_id, artist_id) -- Can't book same artist twice for same event
);

-- TRANSACTIONS: The trust engine
-- Principle 2: Money never moves without state change
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Reference (unique identifier for this transaction)
  reference TEXT NOT NULL UNIQUE,
  
  -- Type and state
  type transaction_type NOT NULL,
  state transaction_state DEFAULT 'initiated' NOT NULL,
  
  -- Money
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  platform_fee DECIMAL(12,2) DEFAULT 0.00 NOT NULL,
  net_amount DECIMAL(12,2) NOT NULL, -- amount - platform_fee
  
  -- Parties
  payer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  recipient_id UUID REFERENCES profiles(id) ON DELETE RESTRICT, -- NULL for held funds
  recipient_type recipient_type,
  
  -- Related entities (ticket_id added after tickets table exists)
  event_id UUID REFERENCES events(id) ON DELETE RESTRICT,
  booking_id UUID REFERENCES bookings(id) ON DELETE RESTRICT,
  ticket_id UUID, -- FK added later due to circular dependency
  
  -- Payment gateway
  gateway_provider TEXT DEFAULT 'paystack',
  gateway_reference TEXT,
  gateway_response JSONB,
  
  -- State timestamps (audit trail)
  authorized_at TIMESTAMPTZ,
  held_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  
  -- Refund tracking
  refund_amount DECIMAL(12,2),
  refund_reason TEXT,
  parent_transaction_id UUID REFERENCES transactions(id), -- For refunds, link to original
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- TICKETS: Proof of purchase
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Ownership
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
  
  -- Ticket details
  ticket_code TEXT NOT NULL UNIQUE, -- QR/Barcode content
  ticket_type TEXT DEFAULT 'general' NOT NULL, -- For future: VIP, Early Bird, etc.
  price_paid DECIMAL(12,2) NOT NULL,
  
  -- Usage
  is_used BOOLEAN DEFAULT false NOT NULL,
  used_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES profiles(id),
  
  -- Transfer tracking (future feature)
  original_owner_id UUID REFERENCES profiles(id),
  transferred_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  UNIQUE(event_id, ticket_code)
);

-- Add circular FK constraint now that both tables exist
ALTER TABLE transactions 
  ADD CONSTRAINT fk_transactions_ticket 
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE RESTRICT;

-- PAYOUTS: Track money leaving the platform
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Recipient
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  recipient_type recipient_type NOT NULL,
  
  -- Related transactions being paid out
  transaction_ids UUID[] NOT NULL, -- Array of transaction IDs included in this payout
  
  -- Money
  total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount > 0),
  
  -- Bank details (snapshot at time of payout)
  bank_name TEXT NOT NULL,
  bank_account_number TEXT NOT NULL,
  bank_account_holder TEXT NOT NULL,
  
  -- Status
  state transaction_state DEFAULT 'initiated' NOT NULL,
  
  -- Payment gateway
  gateway_provider TEXT DEFAULT 'paystack',
  gateway_reference TEXT,
  gateway_response JSONB,
  
  -- Timestamps
  initiated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- AUDIT LOG (for disputes and compliance)
-- =====================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- What happened
  entity_type TEXT NOT NULL, -- 'event', 'booking', 'transaction', etc.
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'state_change', 'update', 'create', etc.
  
  -- State change tracking
  old_state TEXT,
  new_state TEXT,
  
  -- Who did it
  actor_id UUID REFERENCES profiles(id),
  actor_type TEXT NOT NULL, -- 'user', 'system', 'admin'
  
  -- Details
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Profiles
CREATE INDEX idx_profiles_is_artist ON profiles(is_artist) WHERE is_artist = true;
CREATE INDEX idx_profiles_is_organizer ON profiles(is_organizer) WHERE is_organizer = true;

-- Artists
CREATE INDEX idx_artists_location ON artists(location);
CREATE INDEX idx_artists_genre ON artists(genre);
CREATE INDEX idx_artists_is_available ON artists(is_available) WHERE is_available = true;
CREATE INDEX idx_artists_profile ON artists(profile_id);

-- Events
CREATE INDEX idx_events_state ON events(state);
CREATE INDEX idx_events_location ON events(location);
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_published ON events(state, event_date) WHERE state = 'published';

-- Bookings
CREATE INDEX idx_bookings_state ON bookings(state);
CREATE INDEX idx_bookings_event ON bookings(event_id);
CREATE INDEX idx_bookings_artist ON bookings(artist_id);
CREATE INDEX idx_bookings_organizer ON bookings(organizer_id);

-- Transactions
CREATE INDEX idx_transactions_state ON transactions(state);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_payer ON transactions(payer_id);
CREATE INDEX idx_transactions_recipient ON transactions(recipient_id);
CREATE INDEX idx_transactions_event ON transactions(event_id);
CREATE INDEX idx_transactions_booking ON transactions(booking_id);
CREATE INDEX idx_transactions_gateway_ref ON transactions(gateway_reference);

-- Tickets
CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_tickets_user ON tickets(user_id);
CREATE INDEX idx_tickets_code ON tickets(ticket_code);

-- Audit log
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate unique transaction reference
CREATE OR REPLACE FUNCTION generate_transaction_reference()
RETURNS TEXT AS $$
BEGIN
  RETURN 'ZYW-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
         UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
END;
$$ LANGUAGE plpgsql;

-- Generate ticket code
CREATE OR REPLACE FUNCTION generate_ticket_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'TKT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 10));
END;
$$ LANGUAGE plpgsql;

-- Calculate platform fee (10% default)
CREATE OR REPLACE FUNCTION calculate_platform_fee(amount DECIMAL, fee_percent DECIMAL DEFAULT 10.0)
RETURNS DECIMAL AS $$
BEGIN
  RETURN ROUND(amount * (fee_percent / 100), 2);
END;
$$ LANGUAGE plpgsql;

-- Log audit entry
CREATE OR REPLACE FUNCTION log_audit(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action TEXT,
  p_old_state TEXT DEFAULT NULL,
  p_new_state TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_actor_type TEXT DEFAULT 'system',
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO audit_log (entity_type, entity_id, action, old_state, new_state, actor_id, actor_type, details)
  VALUES (p_entity_type, p_entity_id, p_action, p_old_state, p_new_state, p_actor_id, p_actor_type, p_details)
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STATE TRANSITION VALIDATION FUNCTIONS
-- Events and money can only move forward
-- =====================================================

-- Validate event state transition
CREATE OR REPLACE FUNCTION validate_event_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Define valid transitions
  IF OLD.state = 'draft' AND NEW.state NOT IN ('published', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid event state transition from % to %', OLD.state, NEW.state;
  ELSIF OLD.state = 'published' AND NEW.state NOT IN ('locked', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid event state transition from % to %', OLD.state, NEW.state;
  ELSIF OLD.state = 'locked' AND NEW.state NOT IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid event state transition from % to %', OLD.state, NEW.state;
  ELSIF OLD.state IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot change state of % event', OLD.state;
  END IF;
  
  -- Set timestamps
  IF NEW.state = 'published' AND OLD.state != 'published' THEN
    NEW.published_at = NOW();
  ELSIF NEW.state = 'locked' AND OLD.state != 'locked' THEN
    NEW.locked_at = NOW();
  ELSIF NEW.state = 'completed' AND OLD.state != 'completed' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.state = 'cancelled' AND OLD.state != 'cancelled' THEN
    NEW.cancelled_at = NOW();
  END IF;
  
  -- Log the state change
  PERFORM log_audit('event', NEW.id, 'state_change', OLD.state::TEXT, NEW.state::TEXT);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Validate booking state transition
CREATE OR REPLACE FUNCTION validate_booking_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Define valid transitions
  IF OLD.state = 'pending' AND NEW.state NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'Invalid booking state transition from % to %', OLD.state, NEW.state;
  ELSIF OLD.state = 'accepted' AND NEW.state NOT IN ('confirmed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid booking state transition from % to %', OLD.state, NEW.state;
  ELSIF OLD.state = 'confirmed' AND NEW.state NOT IN ('completed', 'cancelled', 'disputed') THEN
    RAISE EXCEPTION 'Invalid booking state transition from % to %', OLD.state, NEW.state;
  ELSIF OLD.state = 'disputed' AND NEW.state NOT IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid booking state transition from % to %', OLD.state, NEW.state;
  ELSIF OLD.state IN ('declined', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot change state of % booking', OLD.state;
  END IF;
  
  -- Set timestamps
  IF NEW.state = 'accepted' AND OLD.state != 'accepted' THEN
    NEW.accepted_at = NOW();
  ELSIF NEW.state = 'declined' AND OLD.state != 'declined' THEN
    NEW.declined_at = NOW();
  ELSIF NEW.state = 'confirmed' AND OLD.state != 'confirmed' THEN
    NEW.confirmed_at = NOW();
  ELSIF NEW.state = 'completed' AND OLD.state != 'completed' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.state = 'cancelled' AND OLD.state != 'cancelled' THEN
    NEW.cancelled_at = NOW();
  END IF;
  
  -- Log the state change
  PERFORM log_audit('booking', NEW.id, 'state_change', OLD.state::TEXT, NEW.state::TEXT);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Validate transaction state transition
CREATE OR REPLACE FUNCTION validate_transaction_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Define valid transitions
  IF OLD.state = 'initiated' AND NEW.state NOT IN ('authorized', 'failed') THEN
    RAISE EXCEPTION 'Invalid transaction state transition from % to %', OLD.state, NEW.state;
  ELSIF OLD.state = 'authorized' AND NEW.state NOT IN ('held', 'refunded', 'failed') THEN
    RAISE EXCEPTION 'Invalid transaction state transition from % to %', OLD.state, NEW.state;
  ELSIF OLD.state = 'held' AND NEW.state NOT IN ('released', 'refunded') THEN
    RAISE EXCEPTION 'Invalid transaction state transition from % to %', OLD.state, NEW.state;
  ELSIF OLD.state = 'released' AND NEW.state NOT IN ('settled', 'failed') THEN
    RAISE EXCEPTION 'Invalid transaction state transition from % to %', OLD.state, NEW.state;
  ELSIF OLD.state IN ('settled', 'refunded', 'failed') THEN
    RAISE EXCEPTION 'Cannot change state of % transaction', OLD.state;
  END IF;
  
  -- Set timestamps
  IF NEW.state = 'authorized' AND OLD.state != 'authorized' THEN
    NEW.authorized_at = NOW();
  ELSIF NEW.state = 'held' AND OLD.state != 'held' THEN
    NEW.held_at = NOW();
  ELSIF NEW.state = 'released' AND OLD.state != 'released' THEN
    NEW.released_at = NOW();
  ELSIF NEW.state = 'settled' AND OLD.state != 'settled' THEN
    NEW.settled_at = NOW();
  ELSIF NEW.state = 'refunded' AND OLD.state != 'refunded' THEN
    NEW.refunded_at = NOW();
  ELSIF NEW.state = 'failed' AND OLD.state != 'failed' THEN
    NEW.failed_at = NOW();
  END IF;
  
  -- Log the state change
  PERFORM log_audit('transaction', NEW.id, 'state_change', OLD.state::TEXT, NEW.state::TEXT);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated_at triggers
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

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- State transition validation triggers
CREATE TRIGGER validate_event_state
  BEFORE UPDATE OF state ON events
  FOR EACH ROW
  WHEN (OLD.state IS DISTINCT FROM NEW.state)
  EXECUTE FUNCTION validate_event_state_transition();

CREATE TRIGGER validate_booking_state
  BEFORE UPDATE OF state ON bookings
  FOR EACH ROW
  WHEN (OLD.state IS DISTINCT FROM NEW.state)
  EXECUTE FUNCTION validate_booking_state_transition();

CREATE TRIGGER validate_transaction_state
  BEFORE UPDATE OF state ON transactions
  FOR EACH ROW
  WHEN (OLD.state IS DISTINCT FROM NEW.state)
  EXECUTE FUNCTION validate_transaction_state_transition();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update artist stats after booking completion
CREATE OR REPLACE FUNCTION update_artist_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.state = 'completed' AND OLD.state != 'completed' THEN
    UPDATE artists 
    SET completed_bookings = completed_bookings + 1
    WHERE id = NEW.artist_id;
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    UPDATE artists 
    SET total_bookings = total_bookings + 1
    WHERE id = NEW.artist_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_artist_booking_stats
  AFTER INSERT OR UPDATE OF state ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_artist_stats();

-- Update event ticket count after ticket purchase
CREATE OR REPLACE FUNCTION update_event_ticket_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE events 
    SET tickets_sold = tickets_sold + 1,
        total_revenue = total_revenue + NEW.price_paid
    WHERE id = NEW.event_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_tickets
  AFTER INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_event_ticket_count();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all, update own
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Artists: Anyone can view available artists
CREATE POLICY "Available artists are viewable by everyone" ON artists
  FOR SELECT USING (is_available = true OR profile_id = auth.uid());

CREATE POLICY "Artists can update own profile" ON artists
  FOR UPDATE USING (profile_id = auth.uid());

CREATE POLICY "Users can create artist profile" ON artists
  FOR INSERT WITH CHECK (profile_id = auth.uid());

-- Events: Published events are public, drafts only for organizer
CREATE POLICY "Published events are viewable by everyone" ON events
  FOR SELECT USING (state != 'draft' OR organizer_id = auth.uid());

CREATE POLICY "Organizers can create events" ON events
  FOR INSERT WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Organizers can update own events" ON events
  FOR UPDATE USING (organizer_id = auth.uid());

-- Bookings: Visible to organizer and artist
CREATE POLICY "Bookings visible to parties involved" ON bookings
  FOR SELECT USING (
    organizer_id = auth.uid() OR 
    artist_id IN (SELECT id FROM artists WHERE profile_id = auth.uid())
  );

CREATE POLICY "Organizers can create bookings" ON bookings
  FOR INSERT WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Parties can update bookings" ON bookings
  FOR UPDATE USING (
    organizer_id = auth.uid() OR 
    artist_id IN (SELECT id FROM artists WHERE profile_id = auth.uid())
  );

-- Transactions: Only visible to payer/recipient
CREATE POLICY "Transactions visible to parties" ON transactions
  FOR SELECT USING (payer_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "System can create transactions" ON transactions
  FOR INSERT WITH CHECK (payer_id = auth.uid());

-- Tickets: Visible to owner
CREATE POLICY "Tickets visible to owner" ON tickets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can purchase tickets" ON tickets
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Payouts: Visible to recipient
CREATE POLICY "Payouts visible to recipient" ON payouts
  FOR SELECT USING (recipient_id = auth.uid());

-- Audit log: Admin only (service role)
CREATE POLICY "Audit log admin only" ON audit_log
  FOR SELECT USING (false); -- Only accessible via service role

-- =====================================================
-- HELPER VIEWS
-- =====================================================

-- View: Published events with organizer info (for Ziwaphi page)
CREATE OR REPLACE VIEW v_public_events AS
SELECT 
  e.id,
  e.title,
  e.description,
  e.venue,
  e.venue_address,
  e.location,
  e.event_date,
  e.start_time,
  e.end_time,
  e.doors_open,
  e.ticket_price,
  e.capacity,
  e.tickets_sold,
  e.capacity - e.tickets_sold AS tickets_remaining,
  e.cover_image,
  e.state,
  e.published_at,
  p.id AS organizer_id,
  p.full_name AS organizer_name,
  p.avatar_url AS organizer_avatar
FROM events e
JOIN profiles p ON e.organizer_id = p.id
WHERE e.state IN ('published', 'locked')
  AND e.event_date >= CURRENT_DATE;

-- View: Available artists with profile info (for Artists page)
CREATE OR REPLACE VIEW v_public_artists AS
SELECT 
  a.id,
  a.stage_name,
  a.bio,
  a.genre,
  a.location,
  a.profile_image,
  a.base_price,
  a.total_bookings,
  a.completed_bookings,
  p.id AS profile_id,
  p.full_name,
  p.avatar_url
FROM artists a
JOIN profiles p ON a.profile_id = p.id
WHERE a.is_available = true;

-- =====================================================
-- COMMENTS (Documentation)
-- =====================================================

COMMENT ON TABLE profiles IS 'Extended user data. One human, many roles (is_artist, is_organizer flags).';
COMMENT ON TABLE events IS 'Sacred entities with state machine (draft→published→locked→completed/cancelled).';
COMMENT ON TABLE bookings IS 'Artist engagements with state machine (pending→accepted→confirmed→completed).';
COMMENT ON TABLE transactions IS 'Trust engine. Money lifecycle (initiated→authorized→held→released→settled).';
COMMENT ON TABLE audit_log IS 'Compliance and dispute resolution. Tracks all state changes.';

COMMENT ON COLUMN events.state IS 'Event lifecycle: draft, published, locked, completed, cancelled. Forward-only.';
COMMENT ON COLUMN bookings.state IS 'Booking lifecycle: pending, accepted, declined, confirmed, completed, cancelled, disputed.';
COMMENT ON COLUMN transactions.state IS 'Money lifecycle: initiated, authorized, held, released, settled, refunded, failed.';
