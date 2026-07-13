-- Default crop dimensions for built-in tenant image fields.
-- Existing custom dimensions are preserved.
UPDATE "TenantField"
SET "imageWidth" = 360,
    "imageHeight" = 270
WHERE key = 'bannerImages'
  AND type = 'IMAGE_MULTI'
  AND ("imageWidth" IS NULL OR "imageHeight" IS NULL);

UPDATE "TenantField"
SET "imageWidth" = 246,
    "imageHeight" = 137
WHERE key = 'communityAmenities'
  AND type = 'IMAGE_MULTI'
  AND ("imageWidth" IS NULL OR "imageHeight" IS NULL);
