import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import adminAuthMiddleware from '../middleware/auth';
import prisma from '../lib/prisma';
import { getIconUrl } from '../utils/icon-map';

const router = Router();

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
    const includeArchived = req.query.includeArchived === 'true';
    const whereClause = includeArchived ? {} : { isArchived: false };
    const projects = await prisma.project.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: { communityAmenities: true, propertyAmenities: true, nearbyPlaces: true }
    });
    const response_data = projects.map(p => {
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
    const project = await prisma.project.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { communityAmenities: true, propertyAmenities: true, nearbyPlaces: true }
    });
    if (!project) return res.status(404).json({ status_code: 404, status_message: "Project not found" });
    const parsed = (() => { try { return JSON.parse(project.bannerImages || '[]'); } catch { return []; } })();
    const coverImage = parsed.find((b: any) => b.isCover) || parsed[0];
    res.status(200).json({ status_code: 200, status_message: "Success", response_data: { ...project, coverImageUrl: coverImage?.url || null } });
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

    const newProject = await prisma.project.create({
      data: {
        projectName,
        description: description || '',
        location,
        bedrooms: parseInt(bedrooms) || 0,
        bathrooms: bathrooms ? parseInt(bathrooms) : null,
        price: price || '',
        furnishing: furnishing || 'Unfurnished',
        area: area || '',
        locationIframe: locationIframe || '',
        projectStatus: projectStatus || 'ONGOING',
        isActive: req.body.isDraft === 'true' ? false : true,
        isDraft: req.body.isDraft === 'true',
        bannerImages: JSON.stringify(bannerImages),
        project_brochure: brochureUrl,
        createdBy: adminId,
        updatedBy: adminId,
        communityAmenities: { create: communityAmenitiesData },
        propertyAmenities: { create: propertyAmenitiesData },
        nearbyPlaces: { create: nearbyPlacesData }
      },
      include: { communityAmenities: true, propertyAmenities: true, nearbyPlaces: true }
    });

    res.status(200).json({ status_code: 200, status_message: "Success", response_data: newProject });
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

    const existingProject = await prisma.project.findUnique({
      where: { id: parseInt(id) },
      include: { communityAmenities: true, propertyAmenities: true, nearbyPlaces: true }
    });
    if (!existingProject) return res.status(404).json({ status_code: 404, status_message: "Project not found" });

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
      const existing = existingProject.communityAmenities.find((xa: any) => xa.name === am.name);
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

    const updatedProject = await prisma.$transaction(async (tx) => {
      await tx.communityAmenity.deleteMany({ where: { projectId: parseInt(id) } });
      await tx.propertyAmenity.deleteMany({ where: { projectId: parseInt(id) } });
      await tx.nearbyPlace.deleteMany({ where: { projectId: parseInt(id) } });

      return tx.project.update({
        where: { id: parseInt(id) },
        data: {
          projectName,
          description: description || '',
          location,
          bedrooms: parseInt(bedrooms) || 0,
          bathrooms: bathrooms ? parseInt(bathrooms) : null,
          price: price || '',
          furnishing: furnishing || 'Unfurnished',
          area: area || '',
          locationIframe: locationIframe || '',
          projectStatus: projectStatus || 'ONGOING',
          bannerImages: JSON.stringify(bannerImages),
          project_brochure: brochureUrl,
          updatedBy: adminId,
          communityAmenities: { create: communityAmenitiesData },
          propertyAmenities: { create: propertyAmenitiesData },
          nearbyPlaces: { create: nearbyPlacesData }
        },
        include: { communityAmenities: true, propertyAmenities: true, nearbyPlaces: true }
      });
    });

    res.status(200).json({ status_code: 200, status_message: "Update successful", response_data: updatedProject });
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

    const dataObj: any = { updatedBy: adminId };
    if (isActive !== undefined) dataObj.isActive = isActive;
    if (isArchived !== undefined) {
      dataObj.isArchived = isArchived;
      if (isArchived === true) dataObj.isActive = false;
      if (isArchived === false) dataObj.isActive = true;
    }
    if (isDraft !== undefined) {
      dataObj.isDraft = isDraft;
      if (isDraft === false) {
        dataObj.isActive = true;
        dataObj.isArchived = false;
      }
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
    await prisma.project.update({ where: { id: parseInt(id) }, data: { isArchived: true, isActive: false, updatedBy: adminId } });
    res.status(200).json({ status_code: 200, status_message: "Archived successfully" });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: "Internal Server Error" });
  }
});

export default router;
