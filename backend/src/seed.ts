import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { pool, query, queryOne, withTransaction } from './lib/db';

async function main() {
  const email = 'admin@koltepatil.test';
  const password = 'password123';

  const existingAdmin = await queryOne(`SELECT id FROM "Admin" WHERE email = $1`, [email]);
  if (!existingAdmin) {
    const password_hash = await bcrypt.hash(password, 10);
    await query(
      `INSERT INTO "Admin" (email, password_hash, "updatedAt") VALUES ($1, $2, now())`,
      [email, password_hash]
    );
    console.log(`Seeded super admin: ${email} / ${password}`);
  } else {
    console.log('Super admin already exists');
  }

  // Create "Canvas" Project
  const projectName = "Canvas";
  const existingProject = await queryOne(`SELECT id FROM "Project" WHERE "projectName" = $1`, [projectName]);

  if (existingProject) {
    console.log('Project "Canvas" already exists. Skipping project seed.');
    return;
  }

  const bannerImages = [
    { url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=1200", order: 0, isCover: true },
    { url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1200", order: 1, isCover: false },
    { url: "https://images.unsplash.com/photo-1448630360428-65456885c650?auto=format&fit=crop&q=80&w=1200", order: 2, isCover: false },
  ];

  const canvasProject = await withTransaction(async (client) => {
    const { rows: [project] } = await client.query(
      `INSERT INTO "Project"
         ("projectName", description, location, bedrooms, bathrooms, price, furnishing, area,
          "locationIframe", "projectStatus", "bannerImages", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
       RETURNING *`,
      [
        projectName,
        "Introducing Canvas - A development by Kolte Patil, where a diverse ecosystem of villages and social spaces gathered at the edges of a shaded wadi, each piece bringing its own unique rhythm, yet all belonging to the same whole, within a low-density, sustainable masterplan.",
        "Near Hinjwadi, Pune",
        2, 2, "₹ 82 Lacs", "Furnished", "2500 sq.ft",
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15129.567439545!2d73.7402!3d18.5913!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2bb08e1ec26a3%3A0x7d025b3a4a1d6368!2sHinjewadi%2C%20Pune%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1620000000000!5m2!1sen!2sin",
        'ONGOING',
        JSON.stringify(bannerImages),
      ]
    );

    const communityAmenities = [
      { name: "Swimming pool", imageUrl: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&q=80&w=600" },
      { name: "Kids Area", imageUrl: "https://images.unsplash.com/photo-1537162809335-5e367808269e?auto=format&fit=crop&q=80&w=600" },
      { name: "Gymnasium", imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=600" },
    ];
    for (const a of communityAmenities) {
      await client.query(`INSERT INTO "CommunityAmenity" ("projectId", name, "imageUrl") VALUES ($1, $2, $3)`, [project.id, a.name, a.imageUrl]);
    }

    const propertyAmenities = ["CCTV Cameras", "Parking", "Security", "Power Backup"];
    for (const name of propertyAmenities) {
      await client.query(`INSERT INTO "PropertyAmenity" ("projectId", name) VALUES ($1, $2)`, [project.id, name]);
    }

    const nearbyPlaces = [
      { category: "Hospital", distanceKm: 0.4 },
      { category: "School", distanceKm: 0.55 },
      { category: "Mall", distanceKm: 1.2 },
    ];
    for (const p of nearbyPlaces) {
      await client.query(`INSERT INTO "NearbyPlace" ("projectId", category, "distanceKm") VALUES ($1, $2, $3)`, [project.id, p.category, p.distanceKm]);
    }

    return project;
  });

  console.log(`Seeded project: ${canvasProject.projectName}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
