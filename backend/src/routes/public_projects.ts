import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Legacy Mobile Payloads
router.post('/list', async (req, res) => {
  try {
    // The mobile app uniquely sends access headers statically, usually decoded in middleware.
    const token = req.headers['access-token'];
    if (!token) {
      return res.status(401).json({ status_code: 401, status_message: "Unauthorized: Invalid or expired access token" });
    }

    // Spec strings pagination legacy constraint
    const page = parseInt(req.body.page as string || "1");
    const limit = parseInt(req.body.limit as string || "10");
    
    if (isNaN(page) || isNaN(limit)) {
      return res.status(404).json({ status_code: 404, status_message: "Bad Request: Missing required field" });
    }

    const skip = (page - 1) * limit;

    const whereClause = { isActive: true, isArchived: false };

    const [totalItems, projects] = await prisma.$transaction([
      prisma.project.count({ where: whereClause }),
      prisma.project.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { 
          communityAmenities: true,
          propertyAmenities: true,
          nearbyPlaces: true
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Format rigorously strictly to API Schema Layout explicitly expanding V4 constraints without mutating old expectations
    const response_data = projects.map(p => {
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
        communityAmenities: p.communityAmenities.map(c => ({
          id: c.id,
          name: c.name,
          imageUrl: c.imageUrl
        })),
        propertyAmenities: p.propertyAmenities.map(pa => ({
          id: pa.id,
          name: pa.name,
          iconUrl: pa.iconUrl
        })),
        nearbyPlaces: p.nearbyPlaces.map(n => ({
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
router.post('/:id/click', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.project.update({
      where: { id: parseInt(id) },
      data: { clickCount: { increment: 1 } }
    });

    res.status(200).json({ status_code: 200, status_message: "Metrics tracked successfully" });
  } catch(e) {
    res.status(500).json({ status_code: 500, status_message: "Error updating metrics" });
  }
});

export default router;
