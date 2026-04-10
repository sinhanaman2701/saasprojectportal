import { Router } from 'express';
import { TenantField } from '@prisma/client';
import tenantMiddleware from '../middleware/tenant';
import tenantAuth from '../middleware/tenantAuth';
import { tenantApiAuth } from '../middleware/tenantApiAuth';
import { createTenantUpload, processUploadedFiles } from '../middleware/upload';
import { validateProjectData } from '../middleware/tenantProjectValidation';
import { generatePostmanCollection } from '../utils/postman-generator';
import { getIconUrl } from '../utils/icon-map';
import prisma from '../lib/prisma';

const router = Router();

router.use(tenantMiddleware);

// ─── In-memory field cache (per tenant) ────────────────────────────────────
// Simple TTL cache: refetch tenant fields every 60 seconds
const fieldCache = new Map<number, { fields: TenantField[]; expiry: number }>();
const FIELD_CACHE_TTL_MS = 60_000; // 60 seconds

async function getTenantFields(tenantId: number): Promise<TenantField[]> {
  const cached = fieldCache.get(tenantId);
  if (cached && cached.expiry > Date.now()) return cached.fields;

  const fields = await prisma.tenantField.findMany({
    where: { tenantId },
    orderBy: [{ section: 'asc' }, { order: 'asc' }],
  });
  fieldCache.set(tenantId, { fields, expiry: Date.now() + FIELD_CACHE_TTL_MS });
  return fields;
}

export function invalidateFieldCache(tenantId: number) {
  fieldCache.delete(tenantId);
}

interface ProjectShape {
  id: number;
  status: string;
  isActive: boolean;
  isArchived: boolean;
  isDraft: boolean;
  createdAt: Date;
  updatedAt: Date;
  coverImageUrl: string | null;
  data: Record<string, unknown>;
  attachments: Record<string, unknown[]>;
}

function shapeProjectResponse(
  project: { data: unknown; attachments: unknown; id: number; status: string; isActive: boolean; isArchived: boolean; isDraft: boolean; createdAt: Date; updatedAt: Date },
  fields: TenantField[]
): ProjectShape {
  const data = typeof project.data === 'string' ? JSON.parse(project.data) : (project.data as Record<string, unknown> || {});
  const attachments = typeof project.attachments === 'string' ? JSON.parse(project.attachments) : (project.attachments as Record<string, unknown[]> || {});

  // Pick only showInList fields from data, excluding IMAGE/IMAGE_MULTI (they live in attachments)
  const showInKeys = new Set(
    fields
      .filter((f) => f.showInList && f.type !== 'IMAGE' && f.type !== 'IMAGE_MULTI')
      .map((f) => f.key)
  );
  const shapedData: Record<string, unknown> = {};
  for (const key of Object.keys(data)) {
    if (showInKeys.has(key)) shapedData[key] = data[key];
  }

  // Resolve cover image - prioritize bannerImages field, then first IMAGE_MULTI field
  let coverImageUrl: string | null = null;

  // First, try to find bannerImages field
  if (attachments.bannerImages && Array.isArray(attachments.bannerImages) && attachments.bannerImages.length > 0) {
    const bannerCover = attachments.bannerImages.find((f: { isCover?: boolean; url?: string }) => f.isCover);
    coverImageUrl = bannerCover?.url || attachments.bannerImages[0].url;
  } else {
    // Fallback: find first IMAGE_MULTI field with images
    const imageMultiFields = fields.filter(f => f.type === 'IMAGE_MULTI').map(f => f.key);
    for (const fieldKey of imageMultiFields) {
      const files = attachments[fieldKey];
      if (Array.isArray(files) && files.length > 0) {
        const cover = files.find((f: { isCover?: boolean; url?: string }) => f.isCover);
        if (cover) {
          coverImageUrl = cover.url;
          break;
        }
      }
    }
  }

  return {
    id: project.id,
    status: project.status,
    isActive: project.isActive,
    isArchived: project.isArchived,
    isDraft: project.isDraft,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    coverImageUrl,
    data: shapedData,
    attachments,
  };
}

/**
 * Enriches propertyAmenities (array of value strings) and nearbyPlaces
 * (array of {category, distance, unit} objects) inside a data blob with
 * resolved labels and iconUrls, using the tenant field options from DB.
 */
function enrichIcons(
  data: Record<string, unknown>,
  fields: TenantField[],
  serverBaseUrl: string
): Record<string, unknown> {
  const enriched = { ...data };

  // ── Property Amenities ──────────────────────────────────────────────────
  const amenitiesField = fields.find((f) => f.key === 'propertyAmenities');
  if (amenitiesField && Array.isArray(enriched.propertyAmenities)) {
    const optionsList = (amenitiesField.options as Array<{ label: string; value: string }> | null) || [];
    const optionMap = new Map(optionsList.map((o) => [o.value, o.label]));
    enriched.propertyAmenities = (enriched.propertyAmenities as string[]).map((val) => ({
      value: val,
      label: optionMap.get(val) ?? val,
      iconUrl: getIconUrl(serverBaseUrl, val),
    }));
  }

  // ── Nearby Places ───────────────────────────────────────────────────────
  if (Array.isArray(enriched.nearbyPlaces)) {
    enriched.nearbyPlaces = (enriched.nearbyPlaces as Array<Record<string, unknown>>).map((place) => ({
      ...place,
      iconUrl: getIconUrl(serverBaseUrl, place.category as string),
    }));
  }

  return enriched;
}

// ─── Public endpoints (Access-Token auth) ────────────────────────────────────

// GET /api/:slug/projects/stats — get aggregated stats
// MUST be before /:slug/projects/:id to avoid "stats" being captured as :id
router.get('/:slug/projects/stats', tenantApiAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId!;

    const [total, active, drafts, archived, projects] = await Promise.all([
      prisma.tenantProject.count({ where: { tenantId } }),
      prisma.tenantProject.count({ where: { tenantId, isActive: true, isArchived: false, isDraft: false } }),
      prisma.tenantProject.count({ where: { tenantId, isDraft: true } }),
      prisma.tenantProject.count({ where: { tenantId, isArchived: true } }),
      prisma.tenantProject.findMany({
        where: { tenantId },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
    ]);

    res.json({
      status_code: 200,
      status_message: 'Success',
      response_data: {
        total,
        active,
        drafts,
        archived,
        topProjects: projects.map((p) => ({
          id: p.id,
          lastUpdated: p.updatedAt,
        })),
      },
    });
  } catch (error) {
    console.error('Stats endpoint error:', error);
    res.status(500).json({ status_code: 500, status_message: 'Internal server error', details: error instanceof Error ? error.message : error });
  }
});

// GET /api/:slug/projects — list projects (Access-Token required)
router.get('/:slug/projects', tenantApiAuth, async (req, res) => {
  try {
    const { page = '1', limit = '10', status, filter = 'active' } = req.query as Record<string, string>;
    const tenantId = req.tenantId!;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: { tenantId: number; isArchived?: boolean; isDraft?: boolean; status?: string } = { tenantId };

    // filter: 'active' | 'archived' | 'drafts' | 'all'
    switch (filter) {
      case 'archived':
        where.isArchived = true;
        break;
      case 'drafts':
        where.isDraft = true;
        break;
      case 'all':
        // No flags - return all projects
        break;
      case 'active':
      default:
        // Active = not archived and not draft
        // Handle edge case where all flags are false (treat as active)
        where.isArchived = false;
        where.isDraft = false;
        break;
    }

    if (status) where.status = status;

    const [projects, total] = await Promise.all([
      prisma.tenantProject.findMany({ where: where as any, skip, take: limitNum, orderBy: { createdAt: 'desc' } }),
      prisma.tenantProject.count({ where: where as any }),
    ]);

    const fields = await getTenantFields(tenantId);
    const serverBaseUrl = `${req.protocol}://${req.get('host')}`;
    const enriched = projects.map((p) => {
      const shaped = shapeProjectResponse(p, fields as any);
      // Pull the full raw data to recover showInList:false fields (e.g. nearbyPlaces)
      const fullData = typeof p.data === 'string' ? JSON.parse(p.data) : (p.data as Record<string, unknown> || {});
      // Always include propertyAmenities + nearbyPlaces in mobile payload
      const dataWithIcons = enrichIcons(
        {
          ...shaped.data,
          ...(fullData.propertyAmenities !== undefined && { propertyAmenities: fullData.propertyAmenities }),
          ...(fullData.nearbyPlaces !== undefined && { nearbyPlaces: fullData.nearbyPlaces }),
        },
        fields as any,
        serverBaseUrl
      );
      return {
        ...shaped,
        data: dataWithIcons,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      };
    });

    res.json({ status_code: 200, status_message: 'Success', response_data: enriched as ProjectShape[] });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// GET /api/:slug/projects/:id — get single project (Access-Token required)
router.get('/:slug/projects/:id', tenantApiAuth, async (req, res) => {
  try {
    const project = await prisma.tenantProject.findFirst({
      where: { id: parseInt(req.params.id as string), tenantId: req.tenantId! },
    });

    if (!project) {
      return res.status(404).json({ status_code: 404, status_message: 'Project not found' });
    }

    // Return ALL data for detail view (not filtered by showInList)
    const data = typeof project.data === 'string' ? JSON.parse(project.data) : (project.data as Record<string, unknown> || {});
    const attachments = typeof project.attachments === 'string' ? JSON.parse(project.attachments) : (project.attachments as Record<string, unknown[]> || {});

    // Resolve cover image - prioritize bannerImages field, then first IMAGE_MULTI field
    let coverImageUrl: string | null = null;
    const fields = await getTenantFields(req.tenantId!);

    // First, try to find bannerImages field
    if (attachments.bannerImages && Array.isArray(attachments.bannerImages) && attachments.bannerImages.length > 0) {
      const bannerCover = attachments.bannerImages.find((f: { isCover?: boolean; url?: string }) => f.isCover);
      coverImageUrl = bannerCover?.url || attachments.bannerImages[0].url;
    } else {
      // Fallback: find first IMAGE_MULTI field with images
      const imageMultiFields = fields.filter(f => f.type === 'IMAGE_MULTI').map(f => f.key);
      for (const fieldKey of imageMultiFields) {
        const files = attachments[fieldKey];
        if (Array.isArray(files) && files.length > 0) {
          const cover = files.find((f: { isCover?: boolean; url?: string }) => f.isCover);
          if (cover) {
            coverImageUrl = cover.url;
            break;
          }
        }
      }
    }

    const serverBaseUrl = `${req.protocol}://${req.get('host')}`;
    const enrichedData = enrichIcons(data, fields as any, serverBaseUrl);

    res.json({
      status_code: 200,
      status_message: 'Success',
      response_data: {
        id: project.id,
        status: project.status,
        isActive: project.isActive,
        isArchived: project.isArchived,
        isDraft: project.isDraft,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        coverImageUrl,
        data: enrichedData,
        attachments,
      },
    });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// ─── Protected endpoints (require tenant admin auth) ───────────────────────────

// POST /api/:slug/projects — create project (multipart/form-data)
router.post('/:slug/projects', tenantAuth, async (req, res) => {
  try {
    const tenantId = req.tenant!.id;
    const upload = createTenantUpload({ tenantSlug: req.tenant!.slug, tenantId });

    upload.any()(req, res, async (err: unknown) => {
      if (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown upload error';
        return res.status(400).json({ status_code: 400, status_message: `Upload error: ${errorMessage}` });
      }

      const {
        status: rawStatus,
        isDraft: rawIsDraft,
        data: rawData,
        _fieldKeys,
        _captionData,
        _attachmentMetadata,
      } = req.body;

      const dataObj = typeof rawData === 'string' ? JSON.parse(rawData) : (rawData as Record<string, unknown> || {});

      // Parse attachment metadata from frontend (contains full attachment state including captions)
      const attachmentMetadata: Record<string, { url: string; caption?: string; order: number; isCover: boolean }[]> = _attachmentMetadata
        ? JSON.parse(_attachmentMetadata)
        : {};

      // Parse captions from form data (legacy format, for backwards compatibility)
      const captions: Record<string, string[]> = _captionData ? JSON.parse(_captionData) : {};

      // Handle file attachments with processing (crop/resize + storage abstraction)
      const files = (req as Express.Request & { files?: Express.Multer.File[] }).files || [];
      let attachments: Record<string, { url: string; caption?: string; order: number; isCover: boolean }[]> = {};

      if (_fieldKeys && files.length > 0) {
        const fieldKeys = _fieldKeys.split(',');
        try {
          attachments = await processUploadedFiles(files, fieldKeys, tenantId, prisma, captions);

          // Merge captions from _attachmentMetadata (takes precedence over _captionData)
          // For new uploads, match by index since URLs are generated after upload
          for (const fieldKey of Object.keys(attachmentMetadata)) {
            const metadataItems = attachmentMetadata[fieldKey];
            if (attachments[fieldKey] && metadataItems.length > 0) {
              // Match by index (metadata order matches file upload order)
              for (let idx = 0; idx < Math.min(attachments[fieldKey].length, metadataItems.length); idx++) {
                const metadataCaption = metadataItems[idx]?.caption;
                // Apply caption from metadata if it exists (even if empty string, treat as intentional)
                if (metadataCaption !== undefined && metadataCaption !== null) {
                  attachments[fieldKey][idx].caption = metadataCaption || undefined;
                }
              }
            }
          }
        } catch (err: any) {
          return res.status(400).json({
            status_code: 400,
            status_message: `File upload failed: ${err.message}`,
          });
        }
      } else if (Object.keys(attachmentMetadata).length > 0) {
        // No new files uploaded, but attachment metadata exists (e.g., captions added without new uploads)
        // Fetch field config to filter captions based on allowCaption
        for (const fieldKey of Object.keys(attachmentMetadata)) {
          const field = await prisma.tenantField.findFirst({
            where: { tenantId, key: fieldKey },
            select: { allowCaption: true },
          });

          attachments[fieldKey] = field?.allowCaption
            ? attachmentMetadata[fieldKey]
            : attachmentMetadata[fieldKey].map(item => ({ ...item, caption: undefined }));
        }
      }

      // Validate against tenant field schema (including file attachments)
      const isDraft = rawIsDraft === 'true' || rawIsDraft === true;
      const validation = await validateProjectData(tenantId, dataObj, isDraft, attachments);
      if (!validation.valid) {
        return res.status(400).json({
          status_code: 400,
          status_message: 'Validation failed',
          errors: validation.errors,
        });
      }

      const project = await prisma.tenantProject.create({
        data: {
          tenantId,
          status: rawStatus || 'ONGOING',
          isDraft,
          isActive: !isDraft,
          data: dataObj,
          attachments,
        },
      });

      res.status(201).json({ status_code: 201, status_message: 'Project created', response_data: project });
    });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// PUT /api/:slug/projects/:id — update project
router.put('/:slug/projects/:id', tenantAuth, async (req, res) => {
  try {
    const id = req.params.id as string;
    const tenantId = req.tenant!.id;

    const existing = await prisma.tenantProject.findFirst({ where: { id: parseInt(id), tenantId } });
    if (!existing) {
      return res.status(404).json({ status_code: 404, status_message: 'Project not found' });
    }

    const upload = createTenantUpload({ tenantSlug: req.tenant!.slug, tenantId });

    upload.any()(req, res, async (err: unknown) => {
      if (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown upload error';
        return res.status(400).json({ status_code: 400, status_message: `Upload error: ${errorMessage}` });
      }

      const { status: rawStatus, isDraft: rawIsDraft, isActive: rawIsActive, data: rawData, _fieldKeys, _attachmentMetadata, _captionData } = req.body;
      const dataObj = typeof rawData === 'string' ? JSON.parse(rawData) : (rawData as Record<string, unknown> || {});

      // Parse captions from form data
      const captions: Record<string, string[]> = _captionData ? JSON.parse(_captionData) : {};

      // Get existing attachments from database
      const existingAttachments: Record<string, { url: string; caption?: string; order: number; isCover: boolean }[]> =
        typeof existing.attachments === 'string'
          ? JSON.parse(existing.attachments)
          : (existing.attachments as Record<string, { url: string; caption?: string; order: number; isCover: boolean }[]> || {});

      // Parse attachment metadata from frontend (contains full attachment state including existing URLs with updated isCover/order)
      const attachmentMetadata: Record<string, { url: string; caption?: string; order: number; isCover: boolean }[]> = _attachmentMetadata
        ? JSON.parse(_attachmentMetadata)
        : {};

      // Handle file attachments with processing (crop/resize + storage abstraction)
      const files = (req as Express.Request & { files?: Express.Multer.File[] }).files || [];
      const newFilesFromUpload: Record<string, { url: string; caption?: string; order: number; isCover: boolean }[]> = {};

      if (_fieldKeys && files.length > 0) {
        const fieldKeys = _fieldKeys.split(',');
        // Process new files through storage abstraction with captions
        const processedAttachments = await processUploadedFiles(files, fieldKeys, tenantId, prisma, captions);
        Object.assign(newFilesFromUpload, processedAttachments);
      }

      // Build final attachments:
      // 1. Start with metadata from frontend (which has updated isCover/order for existing URLs)
      // 2. Append newly uploaded files
      // 3. Filter out captions for fields where allowCaption is disabled
      const finalAttachments: Record<string, { url: string; caption?: string; order: number; isCover: boolean }[]> = {};

      for (const fieldKey of Object.keys(attachmentMetadata)) {
        const metadataItems = attachmentMetadata[fieldKey];
        const uploadedFiles = newFilesFromUpload[fieldKey] || [];

        // Fetch field config to check allowCaption
        const field = await prisma.tenantField.findFirst({
          where: { tenantId, key: fieldKey },
          select: { allowCaption: true },
        });

        // Metadata items come first (existing URLs with potentially updated isCover/order)
        // Filter caption if allowCaption is disabled
        const processedMetadata = field?.allowCaption
          ? metadataItems
          : metadataItems.map(item => ({ ...item, caption: undefined }));

        finalAttachments[fieldKey] = [
          ...processedMetadata,
          ...uploadedFiles.map((f, idx) => ({
            ...f,
            order: processedMetadata.length + idx,
            // Don't mark new files as isCover if metadata items exist
            isCover: processedMetadata.length === 0 && idx === 0,
            // Filter caption if allowCaption is disabled
            caption: field?.allowCaption ? f.caption : undefined,
          })),
        ];
      }
      // Handle fields that only have new files (no metadata)
      for (const fieldKey of Object.keys(newFilesFromUpload)) {
        if (!finalAttachments[fieldKey]) {
          const field = await prisma.tenantField.findFirst({
            where: { tenantId, key: fieldKey },
            select: { allowCaption: true },
          });
          finalAttachments[fieldKey] = field?.allowCaption
            ? newFilesFromUpload[fieldKey]
            : newFilesFromUpload[fieldKey].map(f => ({ ...f, caption: undefined }));
        }
      }

      // Validate against tenant field schema (partial — only validate fields that are provided)
      const isDraft = rawIsDraft !== undefined ? (rawIsDraft === 'true' || rawIsDraft === true) : existing.isDraft;
      const validation = await validateProjectData(tenantId, dataObj, isDraft, finalAttachments);
      if (!validation.valid) {
        return res.status(400).json({
          status_code: 400,
          status_message: 'Validation failed',
          errors: validation.errors,
        });
      }

      // ── State machine: a project can only be in ONE of three states ──────────
      // active  → isActive:true,  isDraft:false, isArchived:false
      // draft   → isActive:false, isDraft:true,  isArchived:false
      // archived→ isActive:false, isDraft:false,  isArchived:true
      //
      // A PUT that sets isDraft must therefore always unarchive the project.
      const newIsDraft = rawIsDraft !== undefined ? (rawIsDraft === 'true' || rawIsDraft === true) : existing.isDraft;
      const draftChanged = newIsDraft !== existing.isDraft;
      // When draft status changes: active = !isDraft. When publishing, also unarchive.
      const newIsActive = draftChanged ? !newIsDraft : (rawIsActive !== undefined ? (rawIsActive === 'true' || rawIsActive === true) : existing.isActive);
      // Unarchive whenever the project transitions to draft or active via PUT
      const shouldUnarchive = draftChanged || (!newIsDraft && newIsActive && existing.isArchived);

      const updateData: Record<string, unknown> = {
        data: dataObj,
        attachments: finalAttachments,
        ...(rawStatus && { status: rawStatus }),
        ...(rawIsDraft !== undefined && { isDraft: newIsDraft }),
        ...(rawIsActive !== undefined && { isActive: rawIsActive === 'true' || rawIsActive === true }),
        // Auto-set isActive when draft status changes
        ...(draftChanged && { isActive: newIsActive }),
        // Clear isArchived whenever moving to draft or active state
        ...(shouldUnarchive && { isArchived: false }),
      };

      const updated = await prisma.tenantProject.update({
        where: { id: parseInt(id) },
        data: updateData,
      });

      res.json({ status_code: 200, status_message: 'Project updated', response_data: updated });
    });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// PATCH /api/:slug/projects/:id — toggle flags
router.patch('/:slug/projects/:id', tenantAuth, async (req, res) => {
  try {
    const id = req.params.id as string;
    const tenantId = req.tenant!.id;
    const { isActive, isArchived, isDraft } = req.body;

    const existing = await prisma.tenantProject.findFirst({ where: { id: parseInt(id), tenantId } });
    if (!existing) {
      return res.status(404).json({ status_code: 404, status_message: 'Project not found' });
    }

    const updateData: { isActive?: boolean; isArchived?: boolean; isDraft?: boolean } = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isArchived !== undefined) {
      updateData.isArchived = isArchived;
      if (isArchived) updateData.isActive = false;
    }
    if (isDraft !== undefined) {
      updateData.isDraft = isDraft;
      if (!isDraft) updateData.isActive = true;
    }

    const updated = await prisma.tenantProject.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.json({ status_code: 200, status_message: 'Project updated', response_data: updated });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// DELETE /api/:slug/projects/:id — soft delete
router.delete('/:slug/projects/:id', tenantAuth, async (req, res) => {
  try {
    const id = req.params.id as string;
    const tenantId = req.tenant!.id;

    const existing = await prisma.tenantProject.findFirst({ where: { id: parseInt(id), tenantId } });
    if (!existing) {
      return res.status(404).json({ status_code: 404, status_message: 'Project not found' });
    }

    await prisma.tenantProject.update({
      where: { id: parseInt(id) },
      data: { isArchived: true, isActive: false },
    });

    res.json({ status_code: 200, status_message: 'Project archived' });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// GET /api/:slug/fields — get tenant field schema (tenant admin auth required)
// Used by tenant admin to render dynamic forms
router.get('/:slug/fields', tenantAuth, async (req, res) => {
  try {
    const tenantId = req.tenant!.id;
    const fields = await prisma.tenantField.findMany({
      where: { tenantId },
      orderBy: [{ order: 'asc' }],
    });

    // Calculate section order based on minimum field order in each section
    const sectionOrderMap = new Map<string, number>();
    for (const field of fields) {
      const currentMin = sectionOrderMap.get(field.section);
      if (currentMin === undefined || field.order < currentMin) {
        sectionOrderMap.set(field.section, field.order);
      }
    }

    // Sort fields by section order, then by field order within section
    const sortedFields = [...fields].sort((a, b) => {
      const sectionOrderA = sectionOrderMap.get(a.section) ?? 0;
      const sectionOrderB = sectionOrderMap.get(b.section) ?? 0;
      if (sectionOrderA !== sectionOrderB) {
        return sectionOrderA - sectionOrderB;
      }
      return a.order - b.order;
    });

    res.json({ status_code: 200, status_message: 'Success', response_data: sortedFields });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// GET /api/:slug/postman.json — get Postman Collection v2.1 (Access-Token required)
router.get('/:slug/postman.json', tenantApiAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId!;
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, accessToken: true },
    });

    const fields = await prisma.tenantField.findMany({
      where: { tenantId },
      orderBy: [{ order: 'asc' }],
    });

    // Calculate section order based on minimum field order in each section
    const sectionOrderMap = new Map<string, number>();
    for (const field of fields) {
      const currentMin = sectionOrderMap.get(field.section);
      if (currentMin === undefined || field.order < currentMin) {
        sectionOrderMap.set(field.section, field.order);
      }
    }

    // Sort fields by section order, then by field order within section
    const sortedFields = [...fields].sort((a, b) => {
      const sectionOrderA = sectionOrderMap.get(a.section) ?? 0;
      const sectionOrderB = sectionOrderMap.get(b.section) ?? 0;
      if (sectionOrderA !== sectionOrderB) {
        return sectionOrderA - sectionOrderB;
      }
      return a.order - b.order;
    });

    const collection = generatePostmanCollection(req.tenantSlug!, tenant!.name, sortedFields, tenant!.accessToken || undefined);
    res.json({ status_code: 200, status_message: 'Success', response_data: collection });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

export default router;
