-- Let the admin designate which gallery image is the hover image (shown on
-- card hover on the build page). Falls back to first non-primary when unset.
ALTER TABLE product_gallery ADD COLUMN IF NOT EXISTS is_hover BOOLEAN NOT NULL DEFAULT false;
