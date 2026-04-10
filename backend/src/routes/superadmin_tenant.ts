import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import superadminAuth from '../middleware/superadminAuth';
import tenantMiddleware from '../middleware/tenant';
import prisma from '../lib/prisma';

const router = Router();

router.use(superadminAuth);
router.use(tenantMiddleware);

// GET /admin/portals/:slug — get tenant detail + fields
router.get('/', async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant!.id },
      include: {
        fields: { orderBy: { order: 'asc' } },
        _count: { select: { projects: true } },
      },
    });

    if (!tenant) {
      return res.status(404).json({ status_code: 404, status_message: 'Tenant not found' });
    }

    res.json({ status_code: 200, status_message: 'Success', response_data: tenant });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// PUT /admin/portals/:slug — update tenant
router.put('/', async (req, res) => {
  try {
    const { name, logoUrl, status } = req.body;

    const tenant = await prisma.tenant.update({
      where: { id: req.tenant!.id },
      data: {
        ...(name !== undefined && { name }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(status !== undefined && { status }),
      },
    });

    res.json({ status_code: 200, status_message: 'Tenant updated', response_data: tenant });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// GET /admin/portals/:slug/admins — list tenant admins
router.get('/admins', async (req, res) => {
  try {
    const admins = await prisma.tenantAdmin.findMany({
      where: { tenantId: req.tenant!.id },
      select: { id: true, email: true, name: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ status_code: 200, status_message: 'Success', response_data: admins });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// POST /admin/portals/:slug/admins — create tenant admin
router.post('/admins', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ status_code: 400, status_message: 'Email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ status_code: 400, status_message: 'Password must be at least 8 characters' });
    }

    const existing = await prisma.tenantAdmin.findFirst({
      where: { tenantId: req.tenant!.id, email },
    });
    if (existing) {
      return res.status(409).json({ status_code: 409, status_message: 'Admin with this email already exists for this tenant' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await prisma.tenantAdmin.create({
      data: { email, passwordHash, name: name || null, tenantId: req.tenant!.id },
      select: { id: true, email: true, name: true, tenantId: true, createdAt: true },
    });

    res.status(201).json({ status_code: 201, status_message: 'Tenant admin created', response_data: admin });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// DELETE /admin/portals/:slug/admins/:id — delete tenant admin
router.delete('/admins/:id', async (req, res) => {
  try {
    const adminId = parseInt(req.params.id);
    // deleteMany is used because delete requires a unique where clause.
    // The tenantId scope ensures a superadmin cannot delete admins
    // belonging to a different tenant even if they know the integer ID.
    const result = await prisma.tenantAdmin.deleteMany({
      where: { id: adminId, tenantId: req.tenant!.id },
    });

    if (result.count === 0) {
      return res.status(404).json({ status_code: 404, status_message: 'Admin not found for this tenant' });
    }

    res.json({ status_code: 200, status_message: 'Tenant admin deleted' });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// DELETE /admin/portals/:slug — suspend tenant
router.delete('/', async (req, res) => {
  try {
    await prisma.tenant.update({
      where: { id: req.tenant!.id },
      data: { status: 'SUSPENDED' },
    });

    res.json({ status_code: 200, status_message: 'Tenant suspended' });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// POST /admin/portals/:slug/regenerate-token — regenerate access token
router.post('/regenerate-token', async (req, res) => {
  try {
    const newToken = randomBytes(32).toString('hex');
    const tenant = await prisma.tenant.update({
      where: { id: req.tenant!.id },
      data: { accessToken: newToken },
      select: { id: true, slug: true, name: true, accessToken: true },
    });

    res.json({
      status_code: 200,
      status_message: 'Access token regenerated',
      response_data: tenant
    });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

export default router;
