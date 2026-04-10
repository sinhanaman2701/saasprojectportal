import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import tenantMiddleware from '../middleware/tenant';
import tenantAuth, { type TenantContext } from '../middleware/tenantAuth';
import superadminAuth from '../middleware/superadminAuth';
import prisma from '../lib/prisma';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
type JwtExpiry = `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}` | number;

// Extend Express.Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: { id: number; email: string; tenantId: number; role: string };
    }
  }
}

// POST /api/:slug/auth/login
router.post('/:slug/auth/login', tenantMiddleware, async (req, res) => {
  try {
    const { email, password } = req.body;
    const tenantId = req.tenant!.id;

    if (!email || !password) {
      return res.status(400).json({ status_code: 400, status_message: 'Email and password are required' });
    }

    const admin = await prisma.tenantAdmin.findFirst({
      where: { email, tenantId },
    });

    if (!admin) {
      return res.status(401).json({ status_code: 401, status_message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      return res.status(401).json({ status_code: 401, status_message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, tenantId: admin.tenantId, role: 'tenant_admin' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY as JwtExpiry }
    );

    res.json({
      status_code: 200,
      status_message: 'Success',
      response_data: { token, email: admin.email, tenantSlug: req.tenant!.slug, role: 'tenant_admin' },
    });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// POST /api/register-admin — create tenant admin (superadmin only)
// Requires a valid superadmin JWT. Tenant admins should use
// POST /admin/portals/:slug/admins which has the same guard.
router.post('/register-admin', superadminAuth, tenantMiddleware, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const tenantId = req.tenant!.id;

    if (!email || !password) {
      return res.status(400).json({ status_code: 400, status_message: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ status_code: 400, status_message: 'Password must be at least 8 characters' });
    }

    const existing = await prisma.tenantAdmin.findFirst({
      where: { tenantId, email },
    });
    if (existing) {
      return res.status(409).json({ status_code: 409, status_message: 'Admin with this email already exists for this tenant' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await prisma.tenantAdmin.create({
      data: { email, passwordHash, name: name || null, tenantId },
      select: { id: true, email: true, name: true, tenantId: true, createdAt: true },
    });

    res.status(201).json({ status_code: 201, status_message: 'Tenant admin created', response_data: admin });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// PUT /api/:slug/auth/change-password — change password (tenant admin auth required)
router.put('/:slug/auth/change-password', tenantAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.user?.id as number;
    const tenantId = req.tenant!.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ status_code: 400, status_message: 'Current and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ status_code: 400, status_message: 'New password must be at least 8 characters' });
    }

    const admin = await prisma.tenantAdmin.findUnique({ where: { id: adminId, tenantId } });
    if (!admin) {
      return res.status(404).json({ status_code: 404, status_message: 'Admin not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!isValid) {
      return res.status(401).json({ status_code: 401, status_message: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.tenantAdmin.update({
      where: { id: adminId },
      data: { passwordHash: newHash },
    });

    res.json({ status_code: 200, status_message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// GET /api/:slug/auth/me — get current tenant admin info
router.get('/:slug/auth/me', tenantAuth, async (req, res) => {
  try {
    const adminId = req.user?.id as number;
    const tenantId = req.tenant!.id;

    const admin = await prisma.tenantAdmin.findUnique({
      where: { id: adminId, tenantId },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    if (!admin) {
      return res.status(404).json({ status_code: 404, status_message: 'Admin not found' });
    }

    res.json({ status_code: 200, status_message: 'Success', response_data: admin });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

export default router;
