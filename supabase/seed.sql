-- =====================================================
-- ZIYAWA SEED DATA
-- Sample data for demo purposes
-- Run this AFTER schema.sql
-- =====================================================

-- ⚠️ IMPORTANT: Profiles are linked to Supabase Auth users!
-- You cannot insert profiles directly without creating auth users first.
-- 
-- OPTION 1: Use the Ziyawa app to sign up test users, then run the 
--           artist/event seed data below with your actual user IDs.
--
-- OPTION 2: Create test users via Supabase Dashboard:
--           1. Go to Authentication > Users > Add User
--           2. Create users with emails like: admin@test.com, artist@test.com, etc.
--           3. Copy the User UID for each
--           4. Replace the UUIDs below with your actual user IDs
--
-- OPTION 3 (Quick Demo): Run only the events section below which doesn't 
--           require pre-existing users (events will show but booking won't work)

-- =====================================================
-- STEP 1: UPDATE THESE WITH YOUR ACTUAL USER IDS
-- After creating users in Supabase Auth, paste their IDs here
-- =====================================================

-- Replace these with your actual user IDs from Supabase Auth
-- Example: If you created admin@test.com and got ID 'abc123...', use that

-- DO {
--   -- Your Admin User ID (create user: admin@ziyawa.co.za)
--   admin_id := 'PASTE_ADMIN_USER_ID_HERE';
--   
--   -- Your Organizer User IDs
--   organizer1_id := 'PASTE_ORGANIZER1_USER_ID_HERE';
--   organizer2_id := 'PASTE_ORGANIZER2_USER_ID_HERE';
--   
--   -- Your Artist User IDs  
--   artist1_id := 'PASTE_ARTIST1_USER_ID_HERE';
--   artist2_id := 'PASTE_ARTIST2_USER_ID_HERE';
--   artist3_id := 'PASTE_ARTIST3_USER_ID_HERE';
--   artist4_id := 'PASTE_ARTIST4_USER_ID_HERE';
-- }

-- =====================================================
-- QUICK DEMO: Sample events without user dependencies
-- This creates events that will display on the Ziwaphi page
-- (Booking features require real users)
-- =====================================================

-- First, let's create a function to add demo events that any organizer can claim
-- This is safe to run without auth users

-- Create demo events table for display purposes only
CREATE TABLE IF NOT EXISTS demo_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  venue VARCHAR(255) NOT NULL,
  location sa_province NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  ticket_price DECIMAL(10, 2) DEFAULT 0,
  capacity INTEGER DEFAULT 100,
  tickets_sold INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create demo artists table for display purposes only
CREATE TABLE IF NOT EXISTS demo_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_name VARCHAR(255) NOT NULL,
  bio TEXT,
  genre VARCHAR(100) NOT NULL,
  base_price DECIMAL(10, 2) DEFAULT 0,
  location sa_province NOT NULL,
  is_available BOOLEAN DEFAULT true,
  profile_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert demo artists for display
INSERT INTO demo_artists (stage_name, bio, genre, base_price, location, is_available) VALUES
  (
    'DJ Sbu',
    'Award-winning DJ and entrepreneur. Known for energetic sets that blend Amapiano, House, and Afrobeats. Over 15 years in the industry.',
    'Amapiano',
    15000.00,
    'gauteng',
    true
  ),
  (
    'Amanda Black',
    'Soulful vocalist with powerful Afro-Soul sound. Multiple SAMA winner. Known for emotional performances that move audiences.',
    'Afro-Soul',
    20000.00,
    'eastern_cape',
    true
  ),
  (
    'Heavy K',
    'Pioneer of the Drumboss sound. Heavyweight producer and DJ. International tours across Africa and Europe.',
    'Afro-House',
    25000.00,
    'gauteng',
    true
  ),
  (
    'Shekhinah',
    'Chart-topping vocalist and songwriter. Known for blending R&B with African sounds. Multiple platinum records.',
    'R&B',
    22000.00,
    'kwazulu_natal',
    false
  ),
  (
    'Focalistic',
    'Pitori Maradona. Leading voice in Amapiano with infectious energy and memorable hooks. Collaborations with global artists.',
    'Amapiano',
    30000.00,
    'gauteng',
    true
  ),
  (
    'Makhadzi',
    'Queen of Limpopo! High-energy performer mixing traditional sounds with modern beats. Known for electrifying live shows.',
    'Afro-Pop',
    28000.00,
    'limpopo',
    true
  );

-- Insert demo events for display
INSERT INTO demo_events (title, description, venue, location, event_date, start_time, end_time, ticket_price, capacity, tickets_sold) VALUES
  (
    'Amapiano Sundays',
    'The biggest Amapiano experience in Joburg. Featuring top DJs, food trucks, and good vibes. Dress code: All white.',
    'The Venue, Melrose Arch',
    'gauteng',
    CURRENT_DATE + INTERVAL '14 days',
    '14:00',
    '22:00',
    150.00,
    500,
    127
  ),
  (
    'Soul Sessions',
    'An intimate evening of soulful music. Acoustic sets, poetry, and wine. Limited seats available.',
    'Constitution Hill',
    'gauteng',
    CURRENT_DATE + INTERVAL '21 days',
    '18:00',
    '23:00',
    350.00,
    200,
    89
  ),
  (
    'Cape Town Summer Fest',
    'The ultimate summer festival at the waterfront. Three stages, 12 hours of music, fireworks at midnight.',
    'V&A Waterfront Amphitheatre',
    'western_cape',
    CURRENT_DATE + INTERVAL '30 days',
    '12:00',
    '00:00',
    450.00,
    2000,
    1456
  ),
  (
    'Durban Beach Party',
    'Sand, sea, and beats. Annual beach party on the Golden Mile. Family-friendly until 6pm.',
    'uShaka Beach',
    'kwazulu_natal',
    CURRENT_DATE + INTERVAL '45 days',
    '10:00',
    '22:00',
    200.00,
    1000,
    234
  ),
  (
    'Soweto Music Festival',
    'Celebrating local talent in the heart of Soweto. Multiple stages, street food, and community vibes.',
    'Orlando Stadium',
    'gauteng',
    CURRENT_DATE + INTERVAL '60 days',
    '11:00',
    '21:00',
    180.00,
    3000,
    890
  );

-- =====================================================
-- FULL SEED (Run after creating auth users)
-- Uncomment and update the IDs below after creating users
-- =====================================================

/*
-- STEP 1: Update profile roles for your created users
-- Run these one at a time after signing up each user

-- Make a user an admin
UPDATE profiles SET role = 'admin', full_name = 'Ziyawa Admin' 
WHERE email = 'admin@ziyawa.co.za';

-- Make users organizers
UPDATE profiles SET role = 'organizer', full_name = 'Thabo Mokoena' 
WHERE email = 'thabo@events.co.za';

UPDATE profiles SET role = 'organizer', full_name = 'Zanele Dlamini' 
WHERE email = 'zanele@parties.co.za';

-- Make users artists (profile role update)
UPDATE profiles SET role = 'artist', full_name = 'Sibusiso Leope' 
WHERE email = 'djsbu@music.co.za';

-- STEP 2: Create artist profiles
-- Replace 'USER_ID_HERE' with actual user IDs

INSERT INTO artists (profile_id, stage_name, bio, genre, base_price, location, is_available) 
SELECT id, 'DJ Sbu', 
  'Award-winning DJ and entrepreneur. Known for energetic sets that blend Amapiano, House, and Afrobeats.',
  'Amapiano', 15000.00, 'gauteng', true
FROM profiles WHERE email = 'djsbu@music.co.za';

INSERT INTO artists (profile_id, stage_name, bio, genre, base_price, location, is_available) 
SELECT id, 'Amanda Black', 
  'Soulful vocalist with powerful Afro-Soul sound. Multiple SAMA winner.',
  'Afro-Soul', 20000.00, 'eastern_cape', true
FROM profiles WHERE email = 'amanda@sounds.co.za';

-- STEP 3: Create events for organizers
INSERT INTO events (organizer_id, title, description, venue, location, event_date, start_time, end_time, ticket_price, capacity, is_published) 
SELECT id, 'Amapiano Sundays', 
  'The biggest Amapiano experience in Joburg.',
  'The Venue, Melrose Arch', 'gauteng', 
  CURRENT_DATE + INTERVAL '14 days', '14:00', '22:00', 150.00, 500, true
FROM profiles WHERE email = 'thabo@events.co.za';

*/

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 'Demo events created: ' || COUNT(*)::text FROM demo_events;
SELECT 'Demo artists created: ' || COUNT(*)::text FROM demo_artists;
