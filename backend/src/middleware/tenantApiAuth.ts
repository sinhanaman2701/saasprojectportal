import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { TenantStatus } from '@prisma/client';
import prisma from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

declare global {
  namespace Express {
    interface Request {
      tenantId?: number;
      tenantSlug?: string;
      user?: { id: number; email: string; tenantId: number; role: string };
    }
  }
}

/**
 * Dual-auth middleware for /api/:slug/* endpoints.
 * Accepts either:
 * 1. Access-Token header (static token for mobile API / public access)
 * 2. Authorization: Bearer <JWT> header (JWT for tenant admin access)
 */
export async function tenantApiAuth(req: Request, res: Response, next: NextFunction) {
  const accessToken = req.headers['access-token'] as string | undefined;
  const authHeader = req.headers.authorization;

  // ─── Mode 1: Access-Token (static token for mobile API) ───────────────────
  if (accessToken) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { accessToken },
        select: { id: true, slug: true, name: true, status: true },
      });

      if (!tenant) {
        return res.status(401).json({
          status_code: 401,
          status_message: 'Invalid Access-Token. Token not found.',
        });
      }

      if (tenant.status === 'SUSPENDED') {
        return res.status(401).json({
          status_code: 401,
          status_message: `Tenant is not accessible. Current status: ${tenant.status}`,
        });
      }

      req.tenantId = tenant.id;
      req.tenantSlug = tenant.slug;
      return next();
    } catch (error) {
      console.error('tenantApiAuth (Access-Token) error:', error);
      return res.status(500).json({
        status_code: 500,
        status_message: 'Internal server error during authentication',
      });
    }
  }

  // ─── Mode 2: Authorization Bearer JWT (tenant admin) ──────────────────────
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; tenantId: number; role: string };

      if (decoded.role !== 'tenant_admin') {
        return res.status(403).json({ status_code: 403, status_message: 'Forbidden: Tenant admin access required' });
      }

      req.user = decoded;

      const tenant = await prisma.tenant.findUnique({
        where: { id: decoded.tenantId },
        select: { id: true, slug: true, name: true, status: true },
      });

      if (!tenant || tenant.status === 'SUSPENDED') {
        return res.status(401).json({
          status_code: 401,
          status_message: 'Tenant not accessible',
        });
      }

      req.tenantId = tenant.id;
      req.tenantSlug = tenant.slug;
      return next();
    } catch (error) {
      return res.status(401).json({
        status_code: 401,
        status_message: 'Unauthorized: Invalid or expired token',
      });
    }
  }

  // ─── No auth provided ─────────────────────────────────────────────────────
  return res.status(401).json({
    status_code: 401,
    status_message: 'Access-Token header required. Include your tenant access token.',
  });
}
