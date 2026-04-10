import { Router } from 'express';
import { FieldType, Prisma } from '@prisma/client';
import superadminAuth from '../middleware/superadminAuth';
import tenantMiddleware from '../middleware/tenant';
import { invalidateFieldCache } from './tenant_projects';
import prisma from '../lib/prisma';

const router = Router();

router.use(superadminAuth);
router.use(tenantMiddleware);

const VALID_FIELD_TYPES: FieldType[] = [
  'TEXT', 'NUMBER', 'SELECT', 'MULTISELECT',
  'IMAGE', 'IMAGE_MULTI', 'FILE', 'CHECKBOX', 'LOCATION',
  'PRICE', 'AREA', 'DATERANGE',
];

// GET /admin/portals/:slug/fields — list tenant fields
router.get('/', async (req, res) => {
  try {
    const fields = await prisma.tenantField.findMany({
      where: { tenantId: req.tenant!.id },
      orderBy: { order: 'asc' },
    });

    res.json({ status_code: 200, status_message: 'Success', response_data: fields });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// POST /admin/portals/:slug/fields — create field
router.post('/', async (req, res) => {
  try {
    const { key, label, type, section, order, required, placeholder, options, validation, showInList, maxLength, imageWidth, imageHeight, allowCaption } = req.body;

    if (!key || !label || !type || !section) {
      return res.status(400).json({ status_code: 400, status_message: 'key, label, type, and section are required' });
    }

    // Validate section name
    if (!section.trim() || section.trim().length === 0) {
      return res.status(400).json({ status_code: 400, status_message: 'Section name cannot be empty' });
    }

    if (!VALID_FIELD_TYPES.includes(type)) {
      return res.status(400).json({ status_code: 400, status_message: `Invalid field type. Must be one of: ${VALID_FIELD_TYPES.join(', ')}` });
    }

    // Validate allowCaption is only set for IMAGE types
    if (allowCaption !== undefined && type !== 'IMAGE' && type !== 'IMAGE_MULTI') {
      return res.status(400).json({
        status_code: 400,
        status_message: 'allowCaption can only be set for IMAGE or IMAGE_MULTI fields'
      });
    }

    // Validate dimensions for IMAGE fields.
    // Use != null (loose) so that null values are treated as "not provided" and
    // skip the check — only validate when the caller actually sends real numbers.
    if (type === 'IMAGE' || type === 'IMAGE_MULTI') {
      if (imageWidth != null || imageHeight != null) {
        if (!imageWidth || !imageHeight) {
          return res.status(400).json({
            status_code: 400,
            status_message: 'Both width and height must be provided for image fields'
          });
        }
        const w = parseInt(imageWidth, 10);
        const h = parseInt(imageHeight, 10);
        if (w < 1 || h < 1 || w > 4096 || h > 4096) {
          return res.status(400).json({
            status_code: 400,
            status_message: 'Dimensions must be between 1 and 4096 pixels'
          });
        }
      }
    }

    // Auto-generate key from label if not provided
    const finalKey = key || label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    const existing = await prisma.tenantField.findUnique({
      where: { tenantId_key: { tenantId: req.tenant!.id, key: finalKey } },
    });
    if (existing) {
      return res.status(409).json({ status_code: 409, status_message: `Field with key '${finalKey}' already exists` });
    }

    const field = await prisma.tenantField.create({
      data: {
        tenantId: req.tenant!.id,
        key: finalKey,
        label,
        type,
        section,
        order: order ?? 0,
        required: required ?? false,
        placeholder: placeholder ?? null,
        options: options ?? null,
        validation: validation ?? null,
        showInList: showInList ?? true,
        ...(maxLength && { maxLength: parseInt(maxLength, 10) }),
        ...(imageWidth && { imageWidth: parseInt(imageWidth, 10) }),
        ...(imageHeight && { imageHeight: parseInt(imageHeight, 10) }),
        ...(allowCaption !== undefined && { allowCaption: !!allowCaption }),
      },
    });

    // Invalidate field cache
    invalidateFieldCache(req.tenant!.id);

    res.status(201).json({ status_code: 201, status_message: 'Field created', response_data: field });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// PUT /admin/portals/:slug/fields/:fieldId — update field
router.put('/:fieldId', async (req, res) => {
  try {
    const { fieldId } = req.params;
    const { label, type, section, order, required, placeholder, options, validation, showInList, key, maxLength, imageWidth, imageHeight, allowCaption } = req.body;

    const field = await prisma.tenantField.findFirst({
      where: { id: parseInt(fieldId), tenantId: req.tenant!.id },
    });

    if (!field) {
      return res.status(404).json({ status_code: 404, status_message: 'Field not found' });
    }

    if (type && !VALID_FIELD_TYPES.includes(type)) {
      return res.status(400).json({ status_code: 400, status_message: `Invalid field type` });
    }

    // Validate section name if provided
    if (section !== undefined && (!section.trim() || section.trim().length === 0)) {
      return res.status(400).json({ status_code: 400, status_message: 'Section name cannot be empty' });
    }

    // Validate allowCaption is only set for IMAGE types
    if (allowCaption !== undefined && type !== 'IMAGE' && type !== 'IMAGE_MULTI') {
      return res.status(400).json({
        status_code: 400,
        status_message: 'allowCaption can only be set for IMAGE or IMAGE_MULTI fields'
      });
    }

    // Validate dimensions for IMAGE fields.
    // Use != null (loose) so that null values are treated as "not provided" and
    // skip the check — only validate when the caller actually sends real numbers.
    if (type === 'IMAGE' || type === 'IMAGE_MULTI') {
      if (imageWidth != null || imageHeight != null) {
        if (!imageWidth || !imageHeight) {
          return res.status(400).json({
            status_code: 400,
            status_message: 'Both width and height must be provided for image fields'
          });
        }
        const w = parseInt(imageWidth, 10);
        const h = parseInt(imageHeight, 10);
        if (w < 1 || h < 1 || w > 4096 || h > 4096) {
          return res.status(400).json({
            status_code: 400,
            status_message: 'Dimensions must be between 1 and 4096 pixels'
          });
        }
      }
    }

    // Check for key collision if key is being changed
    const finalKey = key || field.key;
    if (finalKey !== field.key) {
      const collision = await prisma.tenantField.findUnique({
        where: { tenantId_key: { tenantId: req.tenant!.id, key: finalKey } },
      });
      if (collision && collision.id !== field.id) {
        return res.status(409).json({ status_code: 409, status_message: `Field with key '${finalKey}' already exists` });
      }
    }

    const updated = await prisma.tenantField.update({
      where: { id: field.id },
      data: {
        ...(label !== undefined && { label }),
        ...(type !== undefined && { type }),
        ...(section !== undefined && { section }),
        ...(order !== undefined && { order }),
        ...(key !== undefined && { key: finalKey }),
        ...(required !== undefined && { required }),
        ...(placeholder !== undefined && { placeholder }),
        ...(options !== undefined && { options }),
        ...(validation !== undefined && { validation }),
        ...(showInList !== undefined && { showInList }),
        ...(maxLength !== undefined && { maxLength: maxLength === '' ? null : parseInt(maxLength, 10) }),
        ...(imageWidth !== undefined && { imageWidth: imageWidth === '' ? null : parseInt(imageWidth, 10) }),
        ...(imageHeight !== undefined && { imageHeight: imageHeight === '' ? null : parseInt(imageHeight, 10) }),
        ...(allowCaption !== undefined && { allowCaption: !!allowCaption }),
      },
    });

    // Migrate project data if key changed
    if (key !== undefined && finalKey !== field.key) {
      const projects = await prisma.tenantProject.findMany({
        where: { tenantId: req.tenant!.id },
        select: { id: true, data: true },
      });

      for (const project of projects) {
        const projectData = typeof project.data === 'string'
          ? JSON.parse(project.data)
          : (project.data as Record<string, unknown> || {});

        if (field.key in projectData) {
          const value = projectData[field.key];
          delete projectData[field.key];
          projectData[finalKey] = value;

          await prisma.tenantProject.update({
            where: { id: project.id },
            data: { data: projectData },
          });
        }
      }
    }

    // Invalidate field cache
    invalidateFieldCache(req.tenant!.id);

    res.json({ status_code: 200, status_message: 'Field updated', response_data: updated });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// DELETE /admin/portals/:slug/fields/:fieldId
router.delete('/:fieldId', async (req, res) => {
  try {
    const { fieldId } = req.params;

    const field = await prisma.tenantField.findFirst({
      where: { id: parseInt(fieldId), tenantId: req.tenant!.id },
    });

    if (!field) {
      return res.status(404).json({ status_code: 404, status_message: 'Field not found' });
    }

    await prisma.tenantField.delete({ where: { id: field.id } });

    // Invalidate field cache
    invalidateFieldCache(req.tenant!.id);

    res.json({ status_code: 200, status_message: 'Field deleted' });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// POST /admin/portals/:slug/fields/bulk — create/update fields in bulk (used by wizard)
router.post('/bulk', async (req, res) => {
  try {
    const { fields } = req.body;

    if (!Array.isArray(fields)) {
      return res.status(400).json({ status_code: 400, status_message: 'fields must be an array' });
    }

    if (!req.tenant) {
      return res.status(404).json({ status_code: 404, status_message: 'Tenant not found' });
    }

    // Create all fields in a transaction
    const created = await prisma.$transaction(
      fields.map((f: {
        key: string;
        label: string;
        type: string;
        section: string;
        order: number;
        required: boolean;
        showInList: boolean;
        placeholder?: string | null;
        maxLength?: number | null;
        imageWidth?: number | null;
        imageHeight?: number | null;
        allowCaption?: boolean;
        options?: Array<{ label: string; value: string }> | null;
      }) =>
        prisma.tenantField.upsert({
          where: {
            tenantId_key: {
              tenantId: req.tenant!.id,
              key: f.key,
            },
          },
          create: {
            tenantId: req.tenant!.id,
            key: f.key,
            label: f.label,
            type: f.type as FieldType,
            section: f.section,
            order: f.order,
            required: f.required,
            showInList: f.showInList,
            placeholder: f.placeholder,
            maxLength: f.maxLength,
            ...(f.imageWidth && { imageWidth: f.imageWidth }),
            ...(f.imageHeight && { imageHeight: f.imageHeight }),
            ...(f.allowCaption && { allowCaption: f.allowCaption }),
            options: f.options ? f.options : Prisma.JsonNull,
          },
          update: {
            label: f.label,
            type: f.type as FieldType,
            section: f.section,
            order: f.order,
            required: f.required,
            showInList: f.showInList,
            placeholder: f.placeholder,
            maxLength: f.maxLength,
            ...(f.imageWidth !== undefined && { imageWidth: f.imageWidth }),
            ...(f.imageHeight !== undefined && { imageHeight: f.imageHeight }),
            ...(f.allowCaption !== undefined && { allowCaption: f.allowCaption }),
            options: f.options !== undefined && f.options !== null ? f.options : Prisma.JsonNull,
          },
        })
      )
    );

    // Invalidate field cache
    invalidateFieldCache(req.tenant!.id);

    res.status(201).json({ status_code: 201, status_message: 'Fields created/updated', response_data: created });
  } catch (error) {
    console.error('Bulk field creation error:', error);
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// PUT /admin/portals/:slug/fields/reorder — bulk update order
router.put('/reorder', async (req, res) => {
  try {
    const { fields } = req.body;

    if (!Array.isArray(fields)) {
      return res.status(400).json({ status_code: 400, status_message: 'fields must be an array of {id, order}' });
    }

    await Promise.all(
      fields.map((f: { id: number; order: number }) =>
        prisma.tenantField.updateMany({
          where: { id: f.id, tenantId: req.tenant!.id },
          data: { order: f.order },
        })
      )
    );

    res.json({ status_code: 200, status_message: 'Fields reordered' });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// ─── Section Management Endpoints ───────────────────────────────────────────

// GET /admin/portals/:slug/sections — list all sections with field counts
router.get('/sections', async (req, res) => {
  try {
    const sections = await prisma.tenantField.groupBy({
      by: ['section'],
      where: { tenantId: req.tenant!.id },
      _count: { id: true },
    });

    // Sort sections by the minimum order value of fields in each section
    const sectionsWithOrder = await Promise.all(
      sections.map(async (s) => {
        const minOrder = await prisma.tenantField.findFirst({
          where: { tenantId: req.tenant!.id, section: s.section },
          orderBy: { order: 'asc' },
          select: { order: true },
        });
        return {
          name: s.section,
          fieldCount: s._count.id,
          order: minOrder?.order ?? 0,
        };
      })
    );

    sectionsWithOrder.sort((a, b) => a.order - b.order);

    res.json({
      status_code: 200,
      status_message: 'Success',
      response_data: sectionsWithOrder
    });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// POST /admin/portals/:slug/sections — create new section
router.post('/sections', async (req, res) => {
  try {
    const { section } = req.body;

    if (!section || !section.trim()) {
      return res.status(400).json({ status_code: 400, status_message: 'Section name is required' });
    }

    const trimmedSection = section.trim();

    // Check for duplicate section name
    const existing = await prisma.tenantField.findFirst({
      where: { tenantId: req.tenant!.id, section: trimmedSection },
    });

    if (existing) {
      return res.status(409).json({
        status_code: 409,
        status_message: `Section '${trimmedSection}' already exists`
      });
    }

    // Calculate max order value among all sections to place new section at the bottom
    const maxOrderResult = await prisma.tenantField.findFirst({
      where: { tenantId: req.tenant!.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const newSectionOrder = (maxOrderResult?.order ?? 0) + 100;

    // Invalidate field cache so new section appears immediately
    invalidateFieldCache(req.tenant!.id);

    // Section created successfully (sections are implicit, no DB record needed)
    res.status(201).json({
      status_code: 201,
      status_message: 'Section created',
      response_data: { name: trimmedSection, fieldCount: 0, order: newSectionOrder }
    });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// PUT /admin/portals/:slug/sections/:sectionName — rename section
router.put('/sections/:sectionName', async (req, res) => {
  try {
    const { sectionName } = req.params;
    const { newSection } = req.body;

    if (!newSection || !newSection.trim()) {
      return res.status(400).json({ status_code: 400, status_message: 'New section name is required' });
    }

    const decodedSectionName = decodeURIComponent(sectionName);
    const trimmedNewSection = newSection.trim();

    // Check if new section name already exists
    const existing = await prisma.tenantField.findFirst({
      where: { tenantId: req.tenant!.id, section: trimmedNewSection },
    });

    if (existing) {
      return res.status(409).json({
        status_code: 409,
        status_message: `Section '${trimmedNewSection}' already exists`
      });
    }

    // Update all fields in the section
    await prisma.tenantField.updateMany({
      where: { tenantId: req.tenant!.id, section: decodedSectionName },
      data: { section: trimmedNewSection },
    });

    // Invalidate field cache
    invalidateFieldCache(req.tenant!.id);

    res.json({
      status_code: 200,
      status_message: 'Section renamed',
      response_data: { oldName: decodedSectionName, newName: trimmedNewSection }
    });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// DELETE /admin/portals/:slug/sections/:sectionName — delete section and its fields
router.delete('/sections/:sectionName', async (req, res) => {
  try {
    const { sectionName } = req.params;
    const decodedSectionName = decodeURIComponent(sectionName);

    // Count fields in this section
    const fieldCount = await prisma.tenantField.count({
      where: { tenantId: req.tenant!.id, section: decodedSectionName },
    });

    if (fieldCount === 0) {
      return res.status(404).json({
        status_code: 404,
        status_message: 'Section not found or has no fields'
      });
    }

    // Delete all fields in the section (cascade handles related data)
    await prisma.tenantField.deleteMany({
      where: { tenantId: req.tenant!.id, section: decodedSectionName },
    });

    // Invalidate field cache
    invalidateFieldCache(req.tenant!.id);

    res.json({
      status_code: 200,
      status_message: `Section deleted along with ${fieldCount} field(s)`,
    });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

export default router;
