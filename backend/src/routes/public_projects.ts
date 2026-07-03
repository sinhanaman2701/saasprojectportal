import { Router, Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { query } from '../lib/db';
import { LEGACY_ACCESS_TOKEN } from '../lib/env';

const router = Router();

// Validates the Access-Token header against LEGACY_ACCESS_TOKEN using a
// constant-time comparison. Previously this only checked that *some*
// non-empty header was present, so any string granted full read access.
function requireLegacyAccessToken(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['access-token'];

  if (!LEGACY_ACCESS_TOKEN) {
    return res.status(503).json({ status_code: 503, status_message: 'Legacy mobile API is not configured' });
  }

  if (typeof token !== 'string' || !token) {
    return res.status(401).json({ status_code: 401, status_message: 'Unauthorized: Invalid or expired access token' });
  }

  const provided = Buffer.from(token);
  const expected = Buffer.from(LEGACY_ACCESS_TOKEN);
  const isValid = provided.length === expected.length && timingSafeEqual(provided, expected);

  if (!isValid) {
    return res.status(401).json({ status_code: 401, status_message: 'Unauthorized: Invalid or expired access token' });
  }

  next();
}

// Legacy Mobile Payloads
router.post('/list', requireLegacyAccessToken, async (req, res) => {
  try {

    // Spec strings pagination legacy constraint
    const page = parseInt(req.body.page as string || "1");
    const limit = parseInt(req.body.limit as string || "10");
    
    if (isNaN(page) || isNaN(limit)) {
      return res.status(404).json({ status_code: 404, status_message: "Bad Request: Missing required field" });
    }

    const skip = (page - 1) * limit;

    const whereClause = req.body.includeArchived
      ? `WHERE "isDraft" = false`
      : `WHERE "isActive" = true AND "isArchived" = false AND "isDraft" = false`;

    const [{ count: totalItemsRaw }] = await query<{ count: string }>(`SELECT COUNT(*) AS count FROM "Project" ${whereClause}`);
    const totalItems = parseInt(totalItemsRaw, 10);
    const projectRows = await query<any>(
      `SELECT * FROM "Project" ${whereClause} ORDER BY "createdAt" DESC LIMIT $1 OFFSET $2`,
      [limit, skip]
    );
    const projectIds = projectRows.map((p) => p.id);
    const [community, property, nearby]: [any[], any[], any[]] = projectIds.length
      ? await Promise.all([
          query<any>(`SELECT * FROM "CommunityAmenity" WHERE "projectId" = ANY($1::int[])`, [projectIds]),
          query<any>(`SELECT * FROM "PropertyAmenity" WHERE "projectId" = ANY($1::int[])`, [projectIds]),
          query<any>(`SELECT * FROM "NearbyPlace" WHERE "projectId" = ANY($1::int[])`, [projectIds]),
        ])
      : [[], [], []];
    const projects = projectRows.map((p) => ({
      ...p,
      communityAmenities: community.filter((c: any) => c.projectId === p.id),
      propertyAmenities: property.filter((c: any) => c.projectId === p.id),
      nearbyPlaces: nearby.filter((c: any) => c.projectId === p.id),
    }));

    // Format rigorously strictly to API Schema Layout explicitly expanding V4 constraints without mutating old expectations
    const response_data = projects.map((p: any) => {
      const parsedBannerImages = (() => { try { return JSON.parse(p.bannerImages || '[]'); } catch { return []; } })();
      const coverImage = parsedBannerImages.find((b: any) => b.isCover) || parsedBannerImages[0];
      return {
        projectId: p.id,
        projectName: p.projectName,
        description: p.description,
        location: p.location,
        locationIframe: p.locationIframe,
        projectStatus: p.projectStatus,
        coverImageUrl: coverImage?.url || null,
        bannerImages: parsedBannerImages,
        overview: {
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          price: p.price,
          furnishing: p.furnishing,
          area: p.area
        },
        project_brochure: p.project_brochure,
        communityAmenities: p.communityAmenities.map((c: any) => ({
          id: c.id,
          name: c.name,
          imageUrl: c.imageUrl
        })),
        propertyAmenities: p.propertyAmenities.map((pa: any) => ({
          id: pa.id,
          name: pa.name,
          iconUrl: pa.iconUrl
        })),
        nearbyPlaces: p.nearbyPlaces.map((n: any) => ({
          id: n.id,
          category: n.category,
          distanceKm: n.distanceKm,
          iconUrl: n.iconUrl
        }))
      };
    });

    const totalPages = Math.ceil(totalItems / limit);

    return res.status(200).json({
      status_code: 200,
      status_message: "Success",
      response_data,
      pagination: {
        current_page: page,
        per_page: limit,
        total_items: totalItems,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      }
    });
    
  } catch (error) {
    console.error("List endpoint error:", error);
    res.status(500).json({ status_code: 500, status_message: "Internal Server Error: Something went wrong on the server." });
  }
});

// Analytics Implementation
router.post('/:id/click', requireLegacyAccessToken, async (req, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    await query(`UPDATE "Project" SET "clickCount" = "clickCount" + 1 WHERE id = $1`, [parseInt(id)]);

    res.status(200).json({ status_code: 200, status_message: "Metrics tracked successfully" });
  } catch(e) {
    res.status(500).json({ status_code: 500, status_message: "Error updating metrics" });
  }
});

export default router;
