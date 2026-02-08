-- =====================================================
-- ZIYAWA MIGRATION: Provider System
-- Adds Provider/Crew functionality
-- =====================================================

-- Add is_provider flag to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_provider BOOLEAN DEFAULT false NOT NULL;

-- =====================================================
-- SERVICE CATEGORIES ENUM
-- =====================================================
CREATE TYPE service_category AS ENUM (
  'sound_lighting',     -- Sound & Lighting equipment
  'staging_av',         -- Staging & Audio Visual
  'event_staff',        -- Security, ushers, bartenders
  'venue_hire',         -- Venue rental
  'catering',           -- Food & beverages
  'music_licensing',    -- SAMRO, CAPASSO
  'photography_video',  -- Photo & Video production
  'decor_design',       -- Event decor & design
  'transport',          -- Artist/equipment transport
  'mc_hosts',           -- MCs & event hosts
  'equipment_rental',   -- General equipment rental
  'marketing',          -- Event marketing & PR
  'other'               -- Other services
);

-- =====================================================
-- PROVIDERS TABLE
-- Provider profiles for service providers
-- Linked to a profile, contains service-specific info
-- =====================================================
CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Business info
  business_name TEXT NOT NULL,
  description TEXT,
  primary_category service_category NOT NULL,
  location sa_province NOT NULL,
  profile_image TEXT,
  
  -- Contact
  business_phone TEXT,
  business_email TEXT,
  website TEXT,
  
  -- Availability
  is_available BOOLEAN DEFAULT true NOT NULL,
  advance_notice_days INTEGER DEFAULT 3 NOT NULL,
  
  -- Stats (denormalized for performance)
  total_bookings INTEGER DEFAULT 0 NOT NULL,
  completed_bookings INTEGER DEFAULT 0 NOT NULL,
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- PROVIDER SERVICES TABLE
-- Multiple services a provider can offer
-- =====================================================
CREATE TABLE provider_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  
  -- Service details
  category service_category NOT NULL,
  service_name TEXT NOT NULL,
  description TEXT,
  
  -- Pricing
  base_price DECIMAL(12,2) NOT NULL CHECK (base_price >= 0),
  price_type TEXT DEFAULT 'fixed' NOT NULL CHECK (price_type IN ('fixed', 'hourly', 'daily', 'negotiable')),
  
  -- Availability
  is_available BOOLEAN DEFAULT true NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- No duplicate services for same provider
  UNIQUE(provider_id, service_name)
);

-- =====================================================
-- PROVIDER BOOKING STATES
-- =====================================================
CREATE TYPE provider_booking_state AS ENUM (
  'pending',    -- Request sent, waiting for provider response
  'accepted',   -- Provider accepted, waiting for payment
  'declined',   -- Provider declined the booking
  'confirmed',  -- Payment received, booking is locked in
  'completed',  -- Service delivered, payout released
  'cancelled',  -- Cancelled, refund rules apply
  'disputed'    -- Under dispute resolution
);

-- =====================================================
-- PROVIDER BOOKINGS TABLE
-- Booking crew/services for events
-- =====================================================
CREATE TABLE provider_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Parties involved
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES provider_services(id) ON DELETE RESTRICT,
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- STATE MACHINE
  state provider_booking_state DEFAULT 'pending' NOT NULL,
  
  -- Financial
  offered_amount DECIMAL(12,2) NOT NULL CHECK (offered_amount > 0),
  final_amount DECIMAL(12,2),
  platform_fee DECIMAL(12,2),
  provider_payout DECIMAL(12,2),
  
  -- Service details
  service_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  quantity INTEGER DEFAULT 1 NOT NULL CHECK (quantity > 0),
  special_requirements TEXT,
  
  -- Communication
  organizer_notes TEXT,
  provider_notes TEXT,
  
  -- State timestamps (audit trail)
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Can't book same provider service twice for same event
  UNIQUE(event_id, provider_id, service_id)
);

-- =====================================================
-- UPDATE TRANSACTION TYPE TO INCLUDE PROVIDER
-- =====================================================
-- Note: Can't alter enum in a migration easily, 
-- 'vendor_service' already exists in transaction_type enum
-- So provider bookings will use 'vendor_service' type

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update provider stats when booking is completed
CREATE OR REPLACE FUNCTION update_provider_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.state = 'confirmed' AND (OLD IS NULL OR OLD.state != 'confirmed') THEN
    UPDATE providers 
    SET total_bookings = total_bookings + 1
    WHERE id = NEW.provider_id;
  END IF;
  
  IF NEW.state = 'completed' AND OLD.state != 'completed' THEN
    UPDATE providers 
    SET completed_bookings = completed_bookings + 1
    WHERE id = NEW.provider_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_provider_booking_stats
AFTER INSERT OR UPDATE ON provider_bookings
FOR EACH ROW EXECUTE FUNCTION update_provider_stats();

-- Updated_at triggers
CREATE TRIGGER providers_updated_at
BEFORE UPDATE ON providers
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER provider_services_updated_at
BEFORE UPDATE ON provider_services
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER provider_bookings_updated_at
BEFORE UPDATE ON provider_bookings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- STATE TRANSITION VALIDATION
-- =====================================================
CREATE OR REPLACE FUNCTION validate_provider_booking_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Validate state transitions
  CASE OLD.state
    WHEN 'pending' THEN
      IF NEW.state NOT IN ('accepted', 'declined') THEN
        RAISE EXCEPTION 'Invalid state transition from pending to %', NEW.state;
      END IF;
    WHEN 'accepted' THEN
      IF NEW.state NOT IN ('confirmed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid state transition from accepted to %', NEW.state;
      END IF;
    WHEN 'declined' THEN
      RAISE EXCEPTION 'Cannot transition from declined state';
    WHEN 'confirmed' THEN
      IF NEW.state NOT IN ('completed', 'cancelled', 'disputed') THEN
        RAISE EXCEPTION 'Invalid state transition from confirmed to %', NEW.state;
      END IF;
    WHEN 'completed' THEN
      RAISE EXCEPTION 'Cannot transition from completed state';
    WHEN 'cancelled' THEN
      RAISE EXCEPTION 'Cannot transition from cancelled state';
    WHEN 'disputed' THEN
      IF NEW.state NOT IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid state transition from disputed to %', NEW.state;
      END IF;
  END CASE;
  
  -- Set timestamps
  CASE NEW.state
    WHEN 'accepted' THEN NEW.accepted_at = NOW();
    WHEN 'declined' THEN NEW.declined_at = NOW();
    WHEN 'confirmed' THEN NEW.confirmed_at = NOW();
    WHEN 'completed' THEN NEW.completed_at = NOW();
    WHEN 'cancelled' THEN NEW.cancelled_at = NOW();
    ELSE NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_provider_booking_state
BEFORE UPDATE ON provider_bookings
FOR EACH ROW EXECUTE FUNCTION validate_provider_booking_state_transition();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_bookings ENABLE ROW LEVEL SECURITY;

-- Providers: Public read, owner writes
CREATE POLICY "Public can view available providers"
ON providers FOR SELECT
USING (is_available = true);

CREATE POLICY "Provider can view own profile"
ON providers FOR SELECT
USING (profile_id = auth.uid());

CREATE POLICY "Provider can insert own profile"
ON providers FOR INSERT
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Provider can update own profile"
ON providers FOR UPDATE
USING (profile_id = auth.uid());

-- Provider Services: Public read, owner writes
CREATE POLICY "Public can view available services"
ON provider_services FOR SELECT
USING (
  is_available = true 
  AND provider_id IN (SELECT id FROM providers WHERE is_available = true)
);

CREATE POLICY "Provider can view own services"
ON provider_services FOR SELECT
USING (provider_id IN (SELECT id FROM providers WHERE profile_id = auth.uid()));

CREATE POLICY "Provider can insert own services"
ON provider_services FOR INSERT
WITH CHECK (provider_id IN (SELECT id FROM providers WHERE profile_id = auth.uid()));

CREATE POLICY "Provider can update own services"
ON provider_services FOR UPDATE
USING (provider_id IN (SELECT id FROM providers WHERE profile_id = auth.uid()));

CREATE POLICY "Provider can delete own services"
ON provider_services FOR DELETE
USING (provider_id IN (SELECT id FROM providers WHERE profile_id = auth.uid()));

-- Provider Bookings: Involved parties can view
CREATE POLICY "Organizer can view own bookings"
ON provider_bookings FOR SELECT
USING (organizer_id = auth.uid());

CREATE POLICY "Provider can view bookings for their services"
ON provider_bookings FOR SELECT
USING (provider_id IN (SELECT id FROM providers WHERE profile_id = auth.uid()));

CREATE POLICY "Organizer can create bookings"
ON provider_bookings FOR INSERT
WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Organizer can update own bookings"
ON provider_bookings FOR UPDATE
USING (organizer_id = auth.uid());

CREATE POLICY "Provider can update bookings for their services"
ON provider_bookings FOR UPDATE
USING (provider_id IN (SELECT id FROM providers WHERE profile_id = auth.uid()));

-- =====================================================
-- PUBLIC VIEWS
-- =====================================================
CREATE OR REPLACE VIEW v_public_providers AS
SELECT 
  p.id,
  p.business_name,
  p.description,
  p.primary_category,
  p.location,
  p.profile_image,
  p.is_available,
  p.total_bookings,
  p.completed_bookings,
  p.average_rating,
  p.created_at,
  pr.full_name as owner_name,
  (SELECT COUNT(*) FROM provider_services ps WHERE ps.provider_id = p.id AND ps.is_available = true) as service_count
FROM providers p
JOIN profiles pr ON p.profile_id = pr.id
WHERE p.is_available = true;

-- Grant access to the view
GRANT SELECT ON v_public_providers TO authenticated;
GRANT SELECT ON v_public_providers TO anon;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_providers_profile_id ON providers(profile_id);
CREATE INDEX IF NOT EXISTS idx_providers_category ON providers(primary_category);
CREATE INDEX IF NOT EXISTS idx_providers_location ON providers(location);
CREATE INDEX IF NOT EXISTS idx_providers_available ON providers(is_available);

CREATE INDEX IF NOT EXISTS idx_provider_services_provider ON provider_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_category ON provider_services(category);

CREATE INDEX IF NOT EXISTS idx_provider_bookings_event ON provider_bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_provider_bookings_provider ON provider_bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_bookings_organizer ON provider_bookings(organizer_id);
CREATE INDEX IF NOT EXISTS idx_provider_bookings_state ON provider_bookings(state);
