import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import tenantMiddleware from '../middleware/tenant';
import tenantAuth, { type TenantContext } from '../middleware/tenantAuth';
import superadminAuth from '../middleware/superadminAuth';
import { query, queryOne } from '../lib/db';
import { JWT_SECRET, JWT_EXPIRY, type JwtExpiry } from '../lib/env';

const router = Router();

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

    const admin = await queryOne<{ id: number; email: string; passwordHash: string; tenantId: number }>(
      `SELECT id, email, "passwordHash", "tenantId" FROM "TenantAdmin" WHERE email = $1 AND "tenantId" = $2`,
      [email, tenantId]
    );

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

    const existing = await queryOne(
      `SELECT id FROM "TenantAdmin" WHERE "tenantId" = $1 AND email = $2`,
      [tenantId, email]
    );
    if (existing) {
      return res.status(409).json({ status_code: 409, status_message: 'Admin with this email already exists for this tenant' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await queryOne(
      `INSERT INTO "TenantAdmin" (email, "passwordHash", name, "tenantId", "updatedAt")
       VALUES ($1, $2, $3, $4, now())
       RETURNING id, email, name, "tenantId", "createdAt"`,
      [email, passwordHash, name || null, tenantId]
    );

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

    const admin = await queryOne<{ id: number; passwordHash: string }>(
      `SELECT id, "passwordHash" FROM "TenantAdmin" WHERE id = $1 AND "tenantId" = $2`,
      [adminId, tenantId]
    );
    if (!admin) {
      return res.status(404).json({ status_code: 404, status_message: 'Admin not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!isValid) {
      return res.status(401).json({ status_code: 401, status_message: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await query(
      `UPDATE "TenantAdmin" SET "passwordHash" = $1, "updatedAt" = now() WHERE id = $2`,
      [newHash, adminId]
    );

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

    const admin = await queryOne(
      `SELECT id, email, name, "createdAt" FROM "TenantAdmin" WHERE id = $1 AND "tenantId" = $2`,
      [adminId, tenantId]
    );

    if (!admin) {
      return res.status(404).json({ status_code: 404, status_message: 'Admin not found' });
    }

    res.json({ status_code: 200, status_message: 'Success', response_data: admin });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

export default router;
