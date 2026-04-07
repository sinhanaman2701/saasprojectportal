import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { TenantStatus } from '@prisma/client';
import prisma from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export interface TenantContext {
  id: number;
  slug: string;
  name: string;
  logoUrl: string | null;
  status: TenantStatus;
}

export interface UserContext {
  id: number;
  email: string;
  tenantId: number;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
      user?: UserContext;
    }
  }
}

export default async function tenantAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status_code: 401, status_message: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; tenantId: number; role: string };

    if (decoded.role !== 'tenant_admin') {
      return res.status(403).json({ status_code: 403, status_message: 'Forbidden: Tenant admin access required' });
    }

    (req as any).user = decoded;

    // Also set tenant context for routes that need it
    const tenant = await prisma.tenant.findUnique({
      where: { id: decoded.tenantId },
      select: { id: true, slug: true, name: true, logoUrl: true, status: true },
    });

    if (tenant) {
      req.tenant = tenant;
    }

    next();
  } catch {
    return res.status(401).json({ status_code: 401, status_message: 'Unauthorized: Invalid or expired token' });
  }
}
