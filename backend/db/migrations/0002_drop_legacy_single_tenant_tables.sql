-- Removes the legacy single-tenant "Kolte Patil" prototype that predates
-- the multi-tenant platform. Confirmed via full codebase audit before
-- this migration was written:
--   - No foreign keys connect these tables to Tenant/TenantProject/etc.
--   - No frontend page anywhere ever writes an "adminToken" to localStorage
--     (the only auth mechanism these tables' API required), so this data
--     was unreachable through the app's UI.
--   - ProjectStatus enum is NOT dropped here — it's still used by the
--     current TenantProject.status column.
-- Drop children (amenities/nearby-places) before the parent Project table.
DROP TABLE IF EXISTS "CommunityAmenity";
DROP TABLE IF EXISTS "PropertyAmenity";
DROP TABLE IF EXISTS "NearbyPlace";
DROP TABLE IF EXISTS "Project";
DROP TABLE IF EXISTS "Admin";
