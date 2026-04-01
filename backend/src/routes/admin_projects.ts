import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import adminAuthMiddleware from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// MVP S3 Emulator
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
const upload = multer({ storage });

router.use(adminAuthMiddleware);

router.get('/', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { isArchived: false },
      orderBy: { createdAt: 'desc' },
      include: { attachments: true, communityAmenities: true, propertyAmenities: true, nearbyPlaces: true }
    });
    res.status(200).json({ status_code: 200, status_message: "Success", response_data: projects });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: "Internal Server Error" });
  }
});

// Natively intercept ANY file format configurations dynamically mapping into our custom S3 relations array.
router.post('/', upload.any(), async (req: any, res) => {
  try {
    const { 
      projectName, description, location, bedrooms, bathrooms, price, furnishing, floor, area, 
      locationIframe, projectStatus 
    } = req.body;
    
    const adminId = req.user.id; 
    const files = req.files as Express.Multer.File[] || [];
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    // 1. Core Brochure
    const brochureFile = files.find(f => f.fieldname === 'brochure');
    const brochureUrl = brochureFile ? baseUrl + brochureFile.filename : null;

    // 2. Banner Thumbnail
    const thumbnailFile = files.find(f => f.fieldname === 'thumbnail');
    const thumbnailUrl = thumbnailFile ? baseUrl + thumbnailFile.filename : '';

    // 3. Generic Image Attachments Array
    const attachmentFiles = files.filter(f => f.fieldname === 'attachments');
    const attachmentsData = attachmentFiles.map(file => ({
      name: file.originalname,
      imageUrl: baseUrl + file.filename,
      extension: path.extname(file.originalname).substring(1).toUpperCase()
    }));

    // 4. Community Amenities Injection explicitly mapping dynamic indexes
    const baseCommunity = req.body.communityAmenities ? JSON.parse(req.body.communityAmenities) : [];
    const communityAmenitiesData = baseCommunity.map((am: any, idx: number) => {
      const matchedImg = files.find(f => f.fieldname === `communityImage_${idx}`);
      return { name: am.name, imageUrl: matchedImg ? baseUrl + matchedImg.filename : null };
    });

    // 5. Property Amenities
    const baseProperty = req.body.propertyAmenities ? JSON.parse(req.body.propertyAmenities) : [];
    const propertyAmenitiesData = baseProperty.map((am: any, idx: number) => {
      const matchedImg = files.find(f => f.fieldname === `propertyIcon_${idx}`);
      return { name: am.name, iconUrl: matchedImg ? baseUrl + matchedImg.filename : null };
    });

    // 6. Nearby Distances
    const baseNearby = req.body.nearbyPlaces ? JSON.parse(req.body.nearbyPlaces) : [];
    const nearbyPlacesData = baseNearby.map((pl: any, idx: number) => {
      const matchedImg = files.find(f => f.fieldname === `nearbyIcon_${idx}`);
      return { category: pl.category, distanceKm: pl.distanceKm, iconUrl: matchedImg ? baseUrl + matchedImg.filename : null };
    });

    const newProject = await prisma.project.create({
      data: {
        projectName, description, location, bedrooms: parseInt(bedrooms), bathrooms: parseInt(bathrooms), price, furnishing, floor, area, locationIframe, 
        projectStatus: projectStatus || "ONGOING", 
        thumbnailUrl, project_brochure: brochureUrl, createdBy: adminId, updatedBy: adminId,
        attachments: { create: attachmentsData },
        communityAmenities: { create: communityAmenitiesData },
        propertyAmenities: { create: propertyAmenitiesData },
        nearbyPlaces: { create: nearbyPlacesData }
      },
      include: { attachments: true, communityAmenities: true, propertyAmenities: true, nearbyPlaces: true }
    });

    res.status(200).json({ status_code: 200, status_message: "Success", response_data: newProject });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({ status_code: 500, status_message: "Internal Server Error" });
  }
});

router.patch('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    const { isActive, isArchived } = req.body;
    const adminId = req.user.id;
    
    const dataObj: any = { updatedBy: adminId };
    if (isActive !== undefined) dataObj.isActive = isActive;
    if (isArchived !== undefined) {
      dataObj.isArchived = isArchived;
      if (isArchived) dataObj.isActive = false; 
    }

    const project = await prisma.project.update({ where: { id: parseInt(id) }, data: dataObj });
    res.status(200).json({ status_code: 200, status_message: "Toggled successfully", response_data: project });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: "Internal Server Error" });
  }
});

router.delete('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    await prisma.project.update({ where: { id: parseInt(id) }, data: { isArchived: true, isActive: false, updatedBy: adminId }});
    res.status(200).json({ status_code: 200, status_message: "Archived successfully" });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: "Internal Server Error" });
  }
});

export default router;
