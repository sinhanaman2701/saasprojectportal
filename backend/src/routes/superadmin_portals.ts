import { Router } from 'express';
import { randomBytes } from 'crypto';
import superadminAuth from '../middleware/superadminAuth';
import { DEFAULT_FIELDS } from '../utils/default-fields';
import { query, queryOne, withTransaction } from '../lib/db';

const router = Router();

router.use(superadminAuth);

// GET /admin/portals — list all tenants
router.get('/', async (req, res) => {
  try {
    const tenants = await query<{
      id: number; slug: string; name: string; logoUrl: string | null;
      accessToken: string | null; status: string; createdAt: Date; updatedAt: Date;
      projectCount: string;
    }>(`
      SELECT t.id, t.slug, t.name, t."logoUrl", t."accessToken", t.status, t."createdAt", t."updatedAt",
             COUNT(p.id) AS "projectCount"
      FROM "Tenant" t
      LEFT JOIN "TenantProject" p ON p."tenantId" = t.id
      GROUP BY t.id
      ORDER BY t."createdAt" DESC
    `);

    const result = tenants.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      logoUrl: t.logoUrl,
      accessToken: t.accessToken,
      status: t.status,
      projectCount: parseInt(t.projectCount, 10),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    res.json({ status_code: 200, status_message: 'Success', response_data: result });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// POST /admin/portals — create tenant
router.post('/', async (req, res) => {
  try {
    const { slug, name, logoUrl } = req.body;

    if (!slug || !name) {
      return res.status(400).json({ status_code: 400, status_message: 'slug and name are required' });
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({
        status_code: 400,
        status_message: 'slug must contain only lowercase letters, numbers, and hyphens',
      });
    }

    const existing = await queryOne(`SELECT id FROM "Tenant" WHERE slug = $1`, [slug]);
    if (existing) {
      return res.status(409).json({ status_code: 409, status_message: `Tenant with slug '${slug}' already exists` });
    }

    const accessToken = randomBytes(32).toString('hex'); // 64-char hex token

    const tenant = await withTransaction(async (client) => {
      const { rows: [tenant] } = await client.query(
        `INSERT INTO "Tenant" (slug, name, "logoUrl", "accessToken", status, "updatedAt")
         VALUES ($1, $2, $3, $4, 'LIVE', now())
         RETURNING id, slug, name, "logoUrl", "accessToken", status, "createdAt", "updatedAt"`,
        [slug, name, logoUrl || null, accessToken]
      );

      // Seed default fields for the new tenant
      for (const f of DEFAULT_FIELDS as any[]) {
        await client.query(
          `INSERT INTO "TenantField"
             (key, label, type, section, "order", required, placeholder, options, validation, "showInList", "imageWidth", "imageHeight", "tenantId")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, $9, $10, $11, $12)`,
          [
            f.key, f.label, f.type, f.section, f.order, f.required,
            f.placeholder ?? null,
            f.options ? JSON.stringify(f.options) : null,
            f.showInList,
            f.imageWidth ?? null,
            f.imageHeight ?? null,
            tenant.id,
          ]
        );
      }

      return tenant;
    });

    res.status(201).json({ status_code: 201, status_message: 'Tenant created with default fields', response_data: tenant });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// DELETE /admin/portals/:slug — delete tenant and all related data
router.delete('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const tenant = await queryOne<{ id: number }>(`SELECT id FROM "Tenant" WHERE slug = $1`, [slug]);
    if (!tenant) {
      return res.status(404).json({ status_code: 404, status_message: 'Tenant not found' });
    }

    // Delete in order: projects -> fields -> admins -> tenant (cascade should
    // handle this via ON DELETE CASCADE, but being explicit as the original did).
    await withTransaction(async (client) => {
      await client.query(`DELETE FROM "TenantProject" WHERE "tenantId" = $1`, [tenant.id]);
      await client.query(`DELETE FROM "TenantField" WHERE "tenantId" = $1`, [tenant.id]);
      await client.query(`DELETE FROM "TenantAdmin" WHERE "tenantId" = $1`, [tenant.id]);
      await client.query(`DELETE FROM "Tenant" WHERE id = $1`, [tenant.id]);
    });

    res.json({ status_code: 200, status_message: 'Tenant deleted successfully' });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// POST /admin/portals/delete-all — delete ALL tenants (development/clean slate)
router.post('/delete-all', async (req, res) => {
  try {
    await withTransaction(async (client) => {
      await client.query(`DELETE FROM "TenantProject"`);
      await client.query(`DELETE FROM "TenantField"`);
      await client.query(`DELETE FROM "TenantAdmin"`);
      await client.query(`DELETE FROM "Tenant"`);
    });

    res.json({ status_code: 200, status_message: 'All tenants deleted successfully' });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// POST /admin/portals/:slug/fields/seed — seed default fields for existing tenant (idempotent)
router.post('/:slug/fields/seed', async (req, res) => {
  try {
    const { slug } = req.params;
    const tenant = await queryOne<{ id: number }>(`SELECT id FROM "Tenant" WHERE slug = $1`, [slug]);

    if (!tenant) {
      return res.status(404).json({ status_code: 404, status_message: 'Tenant not found' });
    }

    // Check if fields already exist - only seed if no fields exist
    const existingFields = await query(`SELECT id FROM "TenantField" WHERE "tenantId" = $1`, [tenant.id]);

    if (existingFields.length > 0) {
      return res.status(409).json({
        status_code: 409,
        status_message: 'Tenant already has fields. Delete existing fields first or use individual field endpoints.',
      });
    }

    // Seed default fields
    await withTransaction(async (client) => {
      for (const f of DEFAULT_FIELDS as any[]) {
        await client.query(
          `INSERT INTO "TenantField"
             (key, label, type, section, "order", required, placeholder, options, validation, "showInList", "imageWidth", "imageHeight", "tenantId")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, $9, $10, $11, $12)`,
          [
            f.key, f.label, f.type, f.section, f.order, f.required,
            f.placeholder ?? null,
            f.options ? JSON.stringify(f.options) : null,
            f.showInList,
            f.imageWidth ?? null,
            f.imageHeight ?? null,
            tenant.id,
          ]
        );
      }
    });

    res.json({ status_code: 200, status_message: 'Default fields seeded successfully' });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

export default router;
