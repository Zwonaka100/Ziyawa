-- =====================================================
-- FIX VERIFICATION REQUESTS ADMIN ACCESS
-- =====================================================
-- Issue: Admins cannot see verification requests due to RLS
-- The existing SELECT policy only allows users to see their own requests
-- Admins need to see ALL requests to review them

-- Add admin access to verification_requests
CREATE POLICY "Admins can view all verification requests"
  ON verification_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  ));

-- Allow admins to update verification requests (for review operations)
-- Note: The API uses service role, but this adds a belt-and-suspenders approach
CREATE POLICY "Admins can update verification requests"
  ON verification_requests FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  ));
