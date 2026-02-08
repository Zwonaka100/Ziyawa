-- =====================================================
-- Add image_url to provider_services table
-- =====================================================

-- Add image_url column for service pictures
ALTER TABLE provider_services 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN provider_services.image_url IS 'URL to the service image stored in Supabase storage';
