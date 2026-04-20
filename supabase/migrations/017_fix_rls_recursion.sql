-- Fix RLS infinite recursion on events search
-- Problem: Multiple overlapping SELECT policies on events table may cause
-- infinite recursion when joining profiles or event_rating_summaries.
-- Solution: Drop all SELECT policies and recreate clean ones.

-- =====================================================
-- EVENTS TABLE - Clean up SELECT policies
-- =====================================================
DROP POLICY IF EXISTS "Published events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Anyone can view published events" ON events;
DROP POLICY IF EXISTS "events_select_policy" ON events;

-- Single clean policy: published events public, drafts only to owner/admin
CREATE POLICY "Published events are viewable by everyone"
  ON events FOR SELECT
  USING (
    is_published = true
    OR organizer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =====================================================
-- PROFILES TABLE - Ensure clean SELECT policy
-- =====================================================
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;

-- Profiles are always public (no auth check = no recursion risk)
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- =====================================================
-- EVENT_RATING_SUMMARIES - Ensure clean SELECT policy
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view rating summaries" ON event_rating_summaries;
DROP POLICY IF EXISTS "Rating summaries are viewable by everyone" ON event_rating_summaries;

CREATE POLICY "Anyone can view rating summaries"
  ON event_rating_summaries FOR SELECT
  USING (true);

-- =====================================================
-- NOTES
-- =====================================================
-- Run this migration in the Supabase SQL Editor.
-- After running, test: GET /api/events/search?q=test
-- Expected: No "infinite recursion" error.
