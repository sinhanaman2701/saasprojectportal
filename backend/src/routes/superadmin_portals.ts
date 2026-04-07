import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import superadminAuth from '../middleware/superadminAuth';
import { DEFAULT_FIELDS } from '../utils/default-fields';
import prisma from '../lib/prisma';

const router = Router();

router.use(superadminAuth);

// GET /admin/portals — list all tenants
router.get('/', async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { projects: true } },
      },
    });

    const result = tenants.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      logoUrl: t.logoUrl,
      accessToken: t.accessToken, // For mobile API access
      status: t.status,
      projectCount: t._count.projects,
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

    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      return res.status(409).json({ status_code: 409, status_message: `Tenant with slug '${slug}' already exists` });
    }

    const tenant = await prisma.tenant.create({
      data: {
        slug,
        name,
        logoUrl: logoUrl || null,
        accessToken: randomBytes(32).toString('hex'), // 64-char hex token
        status: 'LIVE', // Set to LIVE immediately upon creation (wizard completes full setup)
      },
    });

    // Seed default fields for the new tenant
    await prisma.tenantField.createMany({
      data: DEFAULT_FIELDS.map((f: any) => ({
        tenantId: tenant.id,
        key: f.key,
        label: f.label,
        type: f.type,
        section: f.section,
        order: f.order,
        required: f.required,
        placeholder: f.placeholder ?? null,
        options: f.options ? f.options : Prisma.JsonNull,
        validation: Prisma.JsonNull,
        showInList: f.showInList,
        ...(f.imageWidth && { imageWidth: f.imageWidth }),
        ...(f.imageHeight && { imageHeight: f.imageHeight }),
      })),
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

    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      return res.status(404).json({ status_code: 404, status_message: 'Tenant not found' });
    }

    // Delete in order: projects -> fields -> tenant (cascade should handle this, but being explicit)
    await prisma.tenantProject.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenantField.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenantAdmin.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });

    res.json({ status_code: 200, status_message: 'Tenant deleted successfully' });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// POST /admin/portals/delete-all — delete ALL tenants (development/clean slate)
router.post('/delete-all', async (req, res) => {
  try {
    // Delete all projects, fields, and admins first
    await prisma.tenantProject.deleteMany({});
    await prisma.tenantField.deleteMany({});
    await prisma.tenantAdmin.deleteMany({});
    await prisma.tenant.deleteMany({});

    res.json({ status_code: 200, status_message: 'All tenants deleted successfully' });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// POST /admin/portals/:slug/fields/seed — seed default fields for existing tenant (idempotent)
router.post('/:slug/fields/seed', async (req, res) => {
  try {
    const { slug } = req.params;
    const tenant = await prisma.tenant.findUnique({ where: { slug } });

    if (!tenant) {
      return res.status(404).json({ status_code: 404, status_message: 'Tenant not found' });
    }

    // Check if fields already exist - only seed if no fields exist
    const existingFields = await prisma.tenantField.findMany({
      where: { tenantId: tenant.id },
    });

    if (existingFields.length > 0) {
      return res.status(409).json({
        status_code: 409,
        status_message: 'Tenant already has fields. Delete existing fields first or use individual field endpoints.',
      });
    }

    // Seed default fields
    await prisma.tenantField.createMany({
      data: DEFAULT_FIELDS.map((f: any) => ({
        tenantId: tenant.id,
        key: f.key,
        label: f.label,
        type: f.type,
        section: f.section,
        order: f.order,
        required: f.required,
        placeholder: f.placeholder ?? null,
        options: f.options ? f.options : Prisma.JsonNull,
        validation: Prisma.JsonNull,
        showInList: f.showInList,
        ...(f.imageWidth && { imageWidth: f.imageWidth }),
        ...(f.imageHeight && { imageHeight: f.imageHeight }),
      })),
    });

    res.json({ status_code: 200, status_message: 'Default fields seeded successfully' });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

export default router;
