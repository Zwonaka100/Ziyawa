-- Add explicit directory visibility flags so creators can be hidden from
-- public listing pages without deleting their profiles.
ALTER TABLE artists
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

UPDATE artists
SET is_public = true
WHERE is_public IS NULL;

UPDATE providers
SET is_public = true
WHERE is_public IS NULL;

CREATE INDEX IF NOT EXISTS idx_artists_is_public ON artists(is_public);
CREATE INDEX IF NOT EXISTS idx_providers_is_public ON providers(is_public);

-- Keep the public providers view aligned with the new visibility control.
CREATE OR REPLACE VIEW v_public_providers AS
SELECT
  p.id,
  p.business_name,
  p.description,
  p.primary_category,
  p.location,
  p.profile_image,
  p.is_available,
  p.is_public,
  p.total_bookings,
  p.completed_bookings,
  p.average_rating,
  p.created_at,
  pr.full_name as owner_name,
  (
    SELECT COUNT(*)
    FROM provider_services ps
    WHERE ps.provider_id = p.id AND ps.is_available = true
  ) as service_count
FROM providers p
JOIN profiles pr ON p.profile_id = pr.id
WHERE p.is_available = true
  AND p.is_public = true;

GRANT SELECT ON v_public_providers TO authenticated;
GRANT SELECT ON v_public_providers TO anon;