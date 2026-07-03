import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import superadminAuth from '../middleware/superadminAuth';
import tenantMiddleware from '../middleware/tenant';
import { query, queryOne } from '../lib/db';

const router = Router();

router.use(superadminAuth);
router.use(tenantMiddleware);

// GET /admin/portals/:slug — get tenant detail + fields
router.get('/', async (req, res) => {
  try {
    const tenant = await queryOne(
      `SELECT id, slug, name, "logoUrl", "accessToken", status, "createdAt", "updatedAt" FROM "Tenant" WHERE id = $1`,
      [req.tenant!.id]
    );

    if (!tenant) {
      return res.status(404).json({ status_code: 404, status_message: 'Tenant not found' });
    }

    const fields = await query(
      `SELECT * FROM "TenantField" WHERE "tenantId" = $1 ORDER BY "order" ASC`,
      [req.tenant!.id]
    );
    const [{ count }] = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM "TenantProject" WHERE "tenantId" = $1`,
      [req.tenant!.id]
    );

    res.json({
      status_code: 200,
      status_message: 'Success',
      response_data: { ...tenant, fields, _count: { projects: parseInt(count, 10) } },
    });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// PUT /admin/portals/:slug — update tenant
router.put('/', async (req, res) => {
  try {
    const { name, logoUrl, status } = req.body;

    const sets: string[] = [];
    const params: unknown[] = [];
    if (name !== undefined) { params.push(name); sets.push(`name = $${params.length}`); }
    if (logoUrl !== undefined) { params.push(logoUrl); sets.push(`"logoUrl" = $${params.length}`); }
    if (status !== undefined) { params.push(status); sets.push(`status = $${params.length}`); }
    sets.push(`"updatedAt" = now()`);

    params.push(req.tenant!.id);
    const tenant = await queryOne(
      `UPDATE "Tenant" SET ${sets.join(', ')} WHERE id = $${params.length}
       RETURNING id, slug, name, "logoUrl", "accessToken", status, "createdAt", "updatedAt"`,
      params
    );

    res.json({ status_code: 200, status_message: 'Tenant updated', response_data: tenant });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// GET /admin/portals/:slug/admins — list tenant admins
router.get('/admins', async (req, res) => {
  try {
    const admins = await query(
      `SELECT id, email, name, "createdAt" FROM "TenantAdmin" WHERE "tenantId" = $1 ORDER BY "createdAt" ASC`,
      [req.tenant!.id]
    );
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

    const existing = await queryOne(
      `SELECT id FROM "TenantAdmin" WHERE "tenantId" = $1 AND email = $2`,
      [req.tenant!.id, email]
    );
    if (existing) {
      return res.status(409).json({ status_code: 409, status_message: 'Admin with this email already exists for this tenant' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await queryOne(
      `INSERT INTO "TenantAdmin" (email, "passwordHash", name, "tenantId", "updatedAt")
       VALUES ($1, $2, $3, $4, now())
       RETURNING id, email, name, "tenantId", "createdAt"`,
      [email, passwordHash, name || null, req.tenant!.id]
    );

    res.status(201).json({ status_code: 201, status_message: 'Tenant admin created', response_data: admin });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// DELETE /admin/portals/:slug/admins/:id — delete tenant admin
router.delete('/admins/:id', async (req, res) => {
  try {
    const adminId = parseInt(req.params.id);
    // The tenantId scope ensures a superadmin cannot delete an admin
    // belonging to a different tenant even if they know the integer ID.
    const deleted = await query(
      `DELETE FROM "TenantAdmin" WHERE id = $1 AND "tenantId" = $2 RETURNING id`,
      [adminId, req.tenant!.id]
    );

    if (deleted.length === 0) {
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
    await query(`UPDATE "Tenant" SET status = 'SUSPENDED', "updatedAt" = now() WHERE id = $1`, [req.tenant!.id]);
    res.json({ status_code: 200, status_message: 'Tenant suspended' });
  } catch (error) {
    res.status(500).json({ status_code: 500, status_message: 'Internal server error' });
  }
});

// POST /admin/portals/:slug/regenerate-token — regenerate access token
router.post('/regenerate-token', async (req, res) => {
  try {
    const newToken = randomBytes(32).toString('hex');
    const tenant = await queryOne(
      `UPDATE "Tenant" SET "accessToken" = $1, "updatedAt" = now() WHERE id = $2
       RETURNING id, slug, name, "accessToken"`,
      [newToken, req.tenant!.id]
    );

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
