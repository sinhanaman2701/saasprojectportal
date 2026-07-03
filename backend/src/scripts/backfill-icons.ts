/**
 * One-time backfill script: populates iconUrl for existing PropertyAmenity
 * and NearbyPlace rows that have iconUrl = null.
 *
 * Run once after deployment:
 *   npx ts-node src/scripts/backfill-icons.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { pool, query } from '../lib/db';
import { getIconUrl } from '../utils/icon-map';

const BASE_URL = process.env.POSTMAN_BASE_URL || 'http://localhost:3002';

async function main() {
  console.log(`\n🔄 Backfilling icons using base URL: ${BASE_URL}\n`);

  // ── 1. Property Amenities ──────────────────────────────────────────────────
  const nullAmenities = await query<{ id: number; name: string }>(
    `SELECT id, name FROM "PropertyAmenity" WHERE "iconUrl" IS NULL`
  );

  console.log(`Found ${nullAmenities.length} PropertyAmenity rows with no icon.`);

  let amenityUpdated = 0;
  for (const amenity of nullAmenities) {
    const iconUrl = getIconUrl(BASE_URL, amenity.name);
    if (iconUrl) {
      await query(`UPDATE "PropertyAmenity" SET "iconUrl" = $1 WHERE id = $2`, [iconUrl, amenity.id]);
      console.log(`  ✅ PropertyAmenity [${amenity.id}] "${amenity.name}" → ${iconUrl}`);
      amenityUpdated++;
    } else {
      console.log(`  ⚠️  PropertyAmenity [${amenity.id}] "${amenity.name}" — no icon found, skipping`);
    }
  }

  // ── 2. Nearby Places ──────────────────────────────────────────────────────
  const nullPlaces = await query<{ id: number; category: string }>(
    `SELECT id, category FROM "NearbyPlace" WHERE "iconUrl" IS NULL`
  );

  console.log(`\nFound ${nullPlaces.length} NearbyPlace rows with no icon.`);

  let placesUpdated = 0;
  for (const place of nullPlaces) {
    const iconUrl = getIconUrl(BASE_URL, place.category);
    if (iconUrl) {
      await query(`UPDATE "NearbyPlace" SET "iconUrl" = $1 WHERE id = $2`, [iconUrl, place.id]);
      console.log(`  ✅ NearbyPlace [${place.id}] "${place.category}" → ${iconUrl}`);
      placesUpdated++;
    } else {
      console.log(`  ⚠️  NearbyPlace [${place.id}] "${place.category}" — no icon found, skipping`);
    }
  }

  console.log(`\n✨ Done. Updated ${amenityUpdated} amenities and ${placesUpdated} nearby places.`);
}

main()
  .catch((e) => {
    console.error('❌ Backfill failed:', e);
    process.exit(1);
  })
  .finally(() => pool.end());
