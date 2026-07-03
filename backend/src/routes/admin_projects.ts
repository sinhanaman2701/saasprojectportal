import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import adminAuthMiddleware from '../middleware/auth';
import { query, queryOne, withTransaction } from '../lib/db';
import { getIconUrl } from '../utils/icon-map';

const router = Router();

// Same allowlist as the tenant upload path (middleware/upload.ts) —
// this legacy route previously had no MIME/size validation at all.
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file, matches tenant upload path
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
      return cb(new Error(`File type '${file.mimetype}' is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`));
    }
    cb(null, true);
  },
});

router.use(adminAuthMiddleware);

async function attachRelations(projects: any[]) {
  if (projects.length === 0) return projects;
  const ids = projects.map((p) => p.id);
  const [community, property, nearby] = await Promise.all([
    query(`SELECT * FROM "CommunityAmenity" WHERE "projectId" = ANY($1::int[])`, [ids]),
    query(`SELECT * FROM "PropertyAmenity" WHERE "projectId" = ANY($1::int[])`, [ids]),
    query(`SELECT * FROM "NearbyPlace" WHERE "projectId" = ANY($1::int[])`, [ids]),
  ]);
  return projects.map((p) => ({
    ...p,
    communityAmenities: community.filter((c: any) => c.projectId === p.id),
    propertyAmenities: property.filter((c: any) => c.projectId === p.id),
    nearbyPlaces: nearby.filter((c: any) => c.projectId === p.id),
  }));
}

router.get('/', async (req, res) => {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    const whereClause = includeArchived ? '' : 'WHERE "isArchived" = false';
    const projects = await query(`SELECT * FROM "Project" ${whereClause} ORDER BY "createdAt" DESC`);
    const withRelations = await attachRelations(projects);
    const response_data = withRelations.map((p) => {
      const parsed = (() => { try { return JSON.parse(p.bannerImages || '[]'); } catch { return []; } })();
      const coverImage = parsed.find((b: any) => b.isCover) || parsed[0];
      return { ...p, coverImageUrl: coverImage?.url || null };
    });
    res.status(200).json({ status_code: 200, status_message: "Success", response_data });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: "Internal Server Error" });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const project = await queryOne<any>(`SELECT * FROM "Project" WHERE id = $1`, [parseInt(req.params.id)]);
    if (!project) return res.status(404).json({ status_code: 404, status_message: "Project not found" });
    const [withRelations] = await attachRelations([project]);
    const parsed = (() => { try { return JSON.parse(withRelations.bannerImages || '[]'); } catch { return []; } })();
    const coverImage = parsed.find((b: any) => b.isCover) || parsed[0];
    res.status(200).json({ status_code: 200, status_message: "Success", response_data: { ...withRelations, coverImageUrl: coverImage?.url || null } });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: "Internal Server Error" });
  }
});

router.post('/', upload.any(), async (req: any, res) => {
  try {
    const {
      projectName, description, location, bedrooms, bathrooms, price, furnishing, area,
      locationIframe, projectStatus
    } = req.body;

    const adminId = req.user.id;
    const files = req.files as Express.Multer.File[] || [];
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
    const serverBaseUrl = `${req.protocol}://${req.get('host')}`;

    // 1. Banner Images — parse the order/cover JSON
    const bannerImagesRaw = req.body.bannerImages ? JSON.parse(req.body.bannerImages) : [];
    const bannerImages = bannerImagesRaw.map((item: any, idx: number) => {
      const file = files.find((f: any) => f.fieldname === `bannerImage_${idx}`);
      return {
        url: file ? baseUrl + file.filename : item.url || null,
        order: idx,
        isCover: item.isCover === true || item.isCover === 'true'
      };
    });

    // 2. Brochure
    const brochureFile = files.find((f: any) => f.fieldname === 'brochure');
    const brochureUrl = brochureFile ? baseUrl + brochureFile.filename : null;

    // 3. Community Amenities
    const baseCommunity = req.body.communityAmenities ? JSON.parse(req.body.communityAmenities) : [];
    const communityAmenitiesData = baseCommunity.map((am: any, idx: number) => {
      const matchedImg = files.find((f: any) => f.fieldname === `communityImage_${idx}`);
      return { name: am.name, imageUrl: matchedImg ? baseUrl + matchedImg.filename : null };
    });

    // 4. Property Amenities (ordered string array)
    const propertyAmenitiesData: { name: string; iconUrl: string | null }[] = [];
    if (req.body.propertyAmenities) {
      const selected: string[] = JSON.parse(req.body.propertyAmenities);
      selected.forEach((name: string) => {
        if (name.trim()) propertyAmenitiesData.push({ name: name.trim(), iconUrl: getIconUrl(serverBaseUrl, name.trim()) });
      });
    }

    // 5. Nearby Places (with km/m unit)
    const nearbyPlacesData: { category: string; distanceKm: number; iconUrl: string | null }[] = [];
    if (req.body.nearbyPlaces) {
      const places: { category: string; distance: string; unit: string }[] = JSON.parse(req.body.nearbyPlaces);
      places.forEach((pl) => {
        if (pl.category && pl.distance) {
          const dist = parseFloat(pl.distance);
          const distanceKm = pl.unit === 'm' ? dist / 1000 : dist;
          nearbyPlacesData.push({ category: pl.category, distanceKm, iconUrl: getIconUrl(serverBaseUrl, pl.category) });
        }
      });
    }

    const newProject = await withTransaction(async (client) => {
      const { rows: [project] } = await client.query(
        `INSERT INTO "Project"
           ("projectName", description, location, bedrooms, bathrooms, price, furnishing, area,
            "locationIframe", "projectStatus", "isActive", "isDraft", "bannerImages", project_brochure,
            "createdBy", "updatedBy", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, now())
         RETURNING *`,
        [
          projectName, description || '', location, parseInt(bedrooms) || 0,
          bathrooms ? parseInt(bathrooms) : null, price || '', furnishing || 'Unfurnished', area || '',
          locationIframe || '', projectStatus || 'ONGOING',
          req.body.isDraft === 'true' ? false : true, req.body.isDraft === 'true',
          JSON.stringify(bannerImages), brochureUrl, adminId, adminId,
        ]
      );

      for (const am of communityAmenitiesData) {
        await client.query(
          `INSERT INTO "CommunityAmenity" ("projectId", name, "imageUrl") VALUES ($1, $2, $3)`,
          [project.id, am.name, am.imageUrl]
        );
      }
      for (const am of propertyAmenitiesData) {
        await client.query(
          `INSERT INTO "PropertyAmenity" ("projectId", name, "iconUrl") VALUES ($1, $2, $3)`,
          [project.id, am.name, am.iconUrl]
        );
      }
      for (const np of nearbyPlacesData) {
        await client.query(
          `INSERT INTO "NearbyPlace" ("projectId", category, "distanceKm", "iconUrl") VALUES ($1, $2, $3, $4)`,
          [project.id, np.category, np.distanceKm, np.iconUrl]
        );
      }

      return project;
    });

    const [withRelations] = await attachRelations([newProject]);
    res.status(200).json({ status_code: 200, status_message: "Success", response_data: withRelations });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({ status_code: 500, status_message: "Internal Server Error" });
  }
});

router.put('/:id', upload.any(), async (req: any, res) => {
  try {
    const { id } = req.params;
    const {
      projectName, description, location, bedrooms, bathrooms, price, furnishing, area,
      locationIframe, projectStatus
    } = req.body;

    const adminId = req.user.id;
    const files = req.files as Express.Multer.File[] || [];
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
    const serverBaseUrl = `${req.protocol}://${req.get('host')}`;

    const existingProject = await queryOne<any>(`SELECT * FROM "Project" WHERE id = $1`, [parseInt(id)]);
    if (!existingProject) return res.status(404).json({ status_code: 404, status_message: "Project not found" });
    const existingCommunityAmenities = await query<any>(`SELECT * FROM "CommunityAmenity" WHERE "projectId" = $1`, [parseInt(id)]);

    // 1. Banner Images
    const bannerImagesRaw = req.body.bannerImages ? JSON.parse(req.body.bannerImages) : [];
    const bannerImages = bannerImagesRaw.map((item: any, idx: number) => {
      const file = files.find((f: any) => f.fieldname === `bannerImage_${idx}`);
      return {
        url: file ? baseUrl + file.filename : (item.url || null),
        order: idx,
        isCover: item.isCover === true || item.isCover === 'true'
      };
    });

    // 2. Brochure
    const brochureFile = files.find((f: any) => f.fieldname === 'brochure');
    const brochureUrl = brochureFile ? baseUrl + brochureFile.filename : existingProject.project_brochure;

    // 3. Community Amenities
    const baseCommunity = req.body.communityAmenities ? JSON.parse(req.body.communityAmenities) : [];
    const communityAmenitiesData = baseCommunity.map((am: any, idx: number) => {
      const matchedImg = files.find((f: any) => f.fieldname === `communityImage_${idx}`);
      const existing = existingCommunityAmenities.find((xa: any) => xa.name === am.name);
      return {
        name: am.name,
        imageUrl: matchedImg ? baseUrl + matchedImg.filename : (existing ? existing.imageUrl : null)
      };
    });

    // 4. Property Amenities
    const propertyAmenitiesData: { name: string; iconUrl: string | null }[] = [];
    if (req.body.propertyAmenities) {
      const selected: string[] = JSON.parse(req.body.propertyAmenities);
      selected.forEach((name: string) => {
        if (name.trim()) propertyAmenitiesData.push({ name: name.trim(), iconUrl: getIconUrl(serverBaseUrl, name.trim()) });
      });
    }

    // 5. Nearby Places
    const nearbyPlacesData: { category: string; distanceKm: number; iconUrl: string | null }[] = [];
    if (req.body.nearbyPlaces) {
      const places: { category: string; distance: string; unit: string }[] = JSON.parse(req.body.nearbyPlaces);
      places.forEach((pl) => {
        if (pl.category && pl.distance) {
          const dist = parseFloat(pl.distance);
          const distanceKm = pl.unit === 'm' ? dist / 1000 : dist;
          nearbyPlacesData.push({ category: pl.category, distanceKm, iconUrl: getIconUrl(serverBaseUrl, pl.category) });
        }
      });
    }

    const updatedProject = await withTransaction(async (client) => {
      await client.query(`DELETE FROM "CommunityAmenity" WHERE "projectId" = $1`, [parseInt(id)]);
      await client.query(`DELETE FROM "PropertyAmenity" WHERE "projectId" = $1`, [parseInt(id)]);
      await client.query(`DELETE FROM "NearbyPlace" WHERE "projectId" = $1`, [parseInt(id)]);

      const { rows: [project] } = await client.query(
        `UPDATE "Project" SET
           "projectName" = $1, description = $2, location = $3, bedrooms = $4, bathrooms = $5,
           price = $6, furnishing = $7, area = $8, "locationIframe" = $9, "projectStatus" = $10,
           "bannerImages" = $11, project_brochure = $12, "updatedBy" = $13, "updatedAt" = now()
         WHERE id = $14
         RETURNING *`,
        [
          projectName, description || '', location, parseInt(bedrooms) || 0,
          bathrooms ? parseInt(bathrooms) : null, price || '', furnishing || 'Unfurnished', area || '',
          locationIframe || '', projectStatus || 'ONGOING', JSON.stringify(bannerImages), brochureUrl,
          adminId, parseInt(id),
        ]
      );

      for (const am of communityAmenitiesData) {
        await client.query(
          `INSERT INTO "CommunityAmenity" ("projectId", name, "imageUrl") VALUES ($1, $2, $3)`,
          [project.id, am.name, am.imageUrl]
        );
      }
      for (const am of propertyAmenitiesData) {
        await client.query(
          `INSERT INTO "PropertyAmenity" ("projectId", name, "iconUrl") VALUES ($1, $2, $3)`,
          [project.id, am.name, am.iconUrl]
        );
      }
      for (const np of nearbyPlacesData) {
        await client.query(
          `INSERT INTO "NearbyPlace" ("projectId", category, "distanceKm", "iconUrl") VALUES ($1, $2, $3, $4)`,
          [project.id, np.category, np.distanceKm, np.iconUrl]
        );
      }

      return project;
    });

    const [withRelations] = await attachRelations([updatedProject]);
    res.status(200).json({ status_code: 200, status_message: "Update successful", response_data: withRelations });
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({ status_code: 500, status_message: "Internal Server Error" });
  }
});

router.patch('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    const { isActive, isArchived, isDraft } = req.body;
    const adminId = req.user.id;

    const sets: string[] = [`"updatedBy" = $1`, `"updatedAt" = now()`];
    const params: unknown[] = [adminId];
    const set = (col: string, val: unknown) => { params.push(val); sets.push(`"${col}" = $${params.length}`); };

    if (isActive !== undefined) set('isActive', isActive);
    if (isArchived !== undefined) {
      set('isArchived', isArchived);
      if (isArchived === true) set('isActive', false);
      if (isArchived === false) set('isActive', true);
    }
    if (isDraft !== undefined) {
      set('isDraft', isDraft);
      if (isDraft === false) {
        set('isActive', true);
        set('isArchived', false);
      }
    }

    params.push(parseInt(id));
    const project = await queryOne(
      `UPDATE "Project" SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    res.status(200).json({ status_code: 200, status_message: "Toggled successfully", response_data: project });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: "Internal Server Error" });
  }
});

router.delete('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    await query(
      `UPDATE "Project" SET "isArchived" = true, "isActive" = false, "updatedBy" = $1, "updatedAt" = now() WHERE id = $2`,
      [adminId, parseInt(id)]
    );
    res.status(200).json({ status_code: 200, status_message: "Archived successfully" });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: "Internal Server Error" });
  }
});

export default router;
