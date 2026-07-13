import { Router } from 'express';
import { FieldType } from '../types/enums';
import superadminAuth from '../middleware/superadminAuth';
import tenantMiddleware from '../middleware/tenant';
import { invalidateFieldCache } from './tenant_projects';
import { query, queryOne, withTransaction } from '../lib/db';

const router = Router();

router.use(superadminAuth);
router.use(tenantMiddleware);

const VALID_FIELD_TYPES: FieldType[] = [
  'TEXT', 'NUMBER', 'SELECT', 'MULTISELECT',
  'IMAGE', 'IMAGE_MULTI', 'FILE', 'CHECKBOX', 'LOCATION',
  'PRICE', 'AREA', 'DATERANGE',
];

type BulkFieldInput = {
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
};

function isImageField(type: string | undefined | null): boolean {
  return type === 'IMAGE' || type === 'IMAGE_MULTI';
}

function validateImageDimensions(type: string, imageWidth: unknown, imageHeight: unknown): string | null {
  if (!isImageField(type)) return null;

  if (!imageWidth || !imageHeight) {
    return 'Image width and height are required for image fields';
  }

  const w = parseInt(String(imageWidth), 10);
  const h = parseInt(String(imageHeight), 10);
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || w > 4096 || h > 4096) {
    return 'Image dimensions must be between 1 and 4096 pixels';
  }

  return null;
}

// GET /admin/portals/:slug/fields — list tenant fields
router.get('/', async (req, res) => {
  try {
    const fields = await query(
      `SELECT * FROM "TenantField" WHERE "tenantId" = $1 ORDER BY "order" ASC`,
      [req.tenant!.id]
    );

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

    const dimensionError = validateImageDimensions(type, imageWidth, imageHeight);
    if (dimensionError) {
      return res.status(400).json({
        status_code: 400,
        status_message: dimensionError,
      });
    }

    // Auto-generate key from label if not provided
    const finalKey = key || label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    const existing = await queryOne(
      `SELECT id FROM "TenantField" WHERE "tenantId" = $1 AND key = $2`,
      [req.tenant!.id, finalKey]
    );
    if (existing) {
      return res.status(409).json({ status_code: 409, status_message: `Field with key '${finalKey}' already exists` });
    }

    const field = await queryOne(
      `INSERT INTO "TenantField"
         (key, label, type, section, "order", required, placeholder, options, validation, "showInList", "maxLength", "imageWidth", "imageHeight", "allowCaption", "tenantId")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        finalKey, label, type, section, order ?? 0, required ?? false,
        placeholder ?? null,
        options ? JSON.stringify(options) : null,
        validation ? JSON.stringify(validation) : null,
        showInList ?? true,
        maxLength ? parseInt(maxLength, 10) : null,
        imageWidth ? parseInt(imageWidth, 10) : null,
        imageHeight ? parseInt(imageHeight, 10) : null,
        allowCaption !== undefined ? !!allowCaption : false,
        req.tenant!.id,
      ]
    );

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

    const field = await queryOne<{ id: number; key: string; type: FieldType; imageWidth: number | null; imageHeight: number | null }>(
      `SELECT id, key, type, "imageWidth", "imageHeight" FROM "TenantField" WHERE id = $1 AND "tenantId" = $2`,
      [parseInt(fieldId), req.tenant!.id]
    );

    if (!field) {
      return res.status(404).json({ status_code: 404, status_message: 'Field not found' });
    }

    if (type && !VALID_FIELD_TYPES.includes(type)) {
      return res.status(400).json({ status_code: 400, status_message: `Invalid field type` });
    }

    const finalType = type ?? field.type;

    // Validate section name if provided
    if (section !== undefined && (!section.trim() || section.trim().length === 0)) {
      return res.status(400).json({ status_code: 400, status_message: 'Section name cannot be empty' });
    }

    // Validate allowCaption is only set for IMAGE types
    if (allowCaption !== undefined && !isImageField(finalType)) {
      return res.status(400).json({
        status_code: 400,
        status_message: 'allowCaption can only be set for IMAGE or IMAGE_MULTI fields'
      });
    }

    const finalImageWidth = imageWidth !== undefined && imageWidth !== '' ? imageWidth : field.imageWidth;
    const finalImageHeight = imageHeight !== undefined && imageHeight !== '' ? imageHeight : field.imageHeight;
    const dimensionError = validateImageDimensions(finalType, finalImageWidth, finalImageHeight);
    if (dimensionError) {
      return res.status(400).json({
        status_code: 400,
        status_message: dimensionError,
      });
    }

    // Check for key collision if key is being changed
    const finalKey = key || field.key;
    if (finalKey !== field.key) {
      const collision = await queryOne<{ id: number }>(
        `SELECT id FROM "TenantField" WHERE "tenantId" = $1 AND key = $2`,
        [req.tenant!.id, finalKey]
      );
      if (collision && collision.id !== field.id) {
        return res.status(409).json({ status_code: 409, status_message: `Field with key '${finalKey}' already exists` });
      }
    }

    const sets: string[] = [];
    const params: unknown[] = [];
    const set = (col: string, val: unknown) => { params.push(val); sets.push(`"${col}" = $${params.length}`); };

    if (label !== undefined) set('label', label);
    if (type !== undefined) set('type', type);
    if (section !== undefined) set('section', section);
    if (order !== undefined) set('order', order);
    if (key !== undefined) set('key', finalKey);
    if (required !== undefined) set('required', required);
    if (placeholder !== undefined) set('placeholder', placeholder);
    if (options !== undefined) set('options', options !== null ? JSON.stringify(options) : null);
    if (validation !== undefined) set('validation', validation !== null ? JSON.stringify(validation) : null);
    if (showInList !== undefined) set('showInList', showInList);
    if (maxLength !== undefined) set('maxLength', maxLength === '' ? null : parseInt(maxLength, 10));
    if (imageWidth !== undefined) set('imageWidth', imageWidth === '' ? null : parseInt(imageWidth, 10));
    if (imageHeight !== undefined) set('imageHeight', imageHeight === '' ? null : parseInt(imageHeight, 10));
    if (allowCaption !== undefined) set('allowCaption', !!allowCaption);

    params.push(field.id);
    const updated = await queryOne(
      `UPDATE "TenantField" SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    // Migrate project data if key changed
    if (key !== undefined && finalKey !== field.key) {
      const projects = await query<{ id: number; data: Record<string, unknown> }>(
        `SELECT id, data FROM "TenantProject" WHERE "tenantId" = $1`,
        [req.tenant!.id]
      );

      for (const project of projects) {
        const projectData = project.data || {};

        if (field.key in projectData) {
          const value = projectData[field.key];
          delete projectData[field.key];
          projectData[finalKey] = value;

          await query(
            `UPDATE "TenantProject" SET data = $1, "updatedAt" = now() WHERE id = $2`,
            [JSON.stringify(projectData), project.id]
          );
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

    const field = await queryOne<{ id: number }>(
      `SELECT id FROM "TenantField" WHERE id = $1 AND "tenantId" = $2`,
      [parseInt(fieldId), req.tenant!.id]
    );

    if (!field) {
      return res.status(404).json({ status_code: 404, status_message: 'Field not found' });
    }

    await query(`DELETE FROM "TenantField" WHERE id = $1`, [field.id]);

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

    for (const field of fields as BulkFieldInput[]) {
      const dimensionError = validateImageDimensions(field.type, field.imageWidth, field.imageHeight);
      if (dimensionError) {
        return res.status(400).json({
          status_code: 400,
          status_message: `${field.label || field.key}: ${dimensionError}`,
        });
      }
    }

    // Upsert all fields in a transaction
    const created = await withTransaction(async (client) => {
      const results = [];
      for (const f of fields as Array<{
        key: string; label: string; type: string; section: string; order: number;
        required: boolean; showInList: boolean; placeholder?: string | null;
        maxLength?: number | null; imageWidth?: number | null; imageHeight?: number | null;
        allowCaption?: boolean; options?: Array<{ label: string; value: string }> | null;
      }>) {
        const { rows: [row] } = await client.query(
          `INSERT INTO "TenantField"
             (key, label, type, section, "order", required, "showInList", placeholder, "maxLength", "imageWidth", "imageHeight", "allowCaption", options, "tenantId")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT ("tenantId", key) DO UPDATE SET
             label = EXCLUDED.label,
             type = EXCLUDED.type,
             section = EXCLUDED.section,
             "order" = EXCLUDED."order",
             required = EXCLUDED.required,
             "showInList" = EXCLUDED."showInList",
             placeholder = EXCLUDED.placeholder,
             "maxLength" = EXCLUDED."maxLength",
             "imageWidth" = COALESCE(EXCLUDED."imageWidth", "TenantField"."imageWidth"),
             "imageHeight" = COALESCE(EXCLUDED."imageHeight", "TenantField"."imageHeight"),
             "allowCaption" = COALESCE(EXCLUDED."allowCaption", "TenantField"."allowCaption"),
             options = EXCLUDED.options
           RETURNING *`,
          [
            f.key, f.label, f.type, f.section, f.order, f.required, f.showInList,
            f.placeholder ?? null,
            f.maxLength ?? null,
            f.imageWidth ?? null,
            f.imageHeight ?? null,
            f.allowCaption ?? false,
            f.options !== undefined && f.options !== null ? JSON.stringify(f.options) : null,
            req.tenant!.id,
          ]
        );
        results.push(row);
      }
      return results;
    });

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
      (fields as Array<{ id: number; order: number }>).map((f) =>
        query(
          `UPDATE "TenantField" SET "order" = $1 WHERE id = $2 AND "tenantId" = $3`,
          [f.order, f.id, req.tenant!.id]
        )
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
    const sections = await query<{ section: string; fieldCount: string; order: number }>(
      `SELECT section, COUNT(id) AS "fieldCount", MIN("order") AS "order"
       FROM "TenantField"
       WHERE "tenantId" = $1
       GROUP BY section
       ORDER BY MIN("order") ASC`,
      [req.tenant!.id]
    );

    const sectionsWithOrder = sections.map((s) => ({
      name: s.section,
      fieldCount: parseInt(s.fieldCount, 10),
      order: s.order,
    }));

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
    const existing = await queryOne(
      `SELECT id FROM "TenantField" WHERE "tenantId" = $1 AND section = $2`,
      [req.tenant!.id, trimmedSection]
    );

    if (existing) {
      return res.status(409).json({
        status_code: 409,
        status_message: `Section '${trimmedSection}' already exists`
      });
    }

    // Calculate max order value among all sections to place new section at the bottom
    const maxOrderResult = await queryOne<{ order: number | null }>(
      `SELECT "order" FROM "TenantField" WHERE "tenantId" = $1 ORDER BY "order" DESC LIMIT 1`,
      [req.tenant!.id]
    );

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
    const existing = await queryOne(
      `SELECT id FROM "TenantField" WHERE "tenantId" = $1 AND section = $2`,
      [req.tenant!.id, trimmedNewSection]
    );

    if (existing) {
      return res.status(409).json({
        status_code: 409,
        status_message: `Section '${trimmedNewSection}' already exists`
      });
    }

    // Update all fields in the section
    await query(
      `UPDATE "TenantField" SET section = $1 WHERE "tenantId" = $2 AND section = $3`,
      [trimmedNewSection, req.tenant!.id, decodedSectionName]
    );

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
    const [{ count }] = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM "TenantField" WHERE "tenantId" = $1 AND section = $2`,
      [req.tenant!.id, decodedSectionName]
    );
    const fieldCount = parseInt(count, 10);

    if (fieldCount === 0) {
      return res.status(404).json({
        status_code: 404,
        status_message: 'Section not found or has no fields'
      });
    }

    // Delete all fields in the section (cascade handles related data)
    await query(
      `DELETE FROM "TenantField" WHERE "tenantId" = $1 AND section = $2`,
      [req.tenant!.id, decodedSectionName]
    );

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
