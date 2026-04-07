import { Request, Response, NextFunction } from 'express';
import { TenantStatus } from '@prisma/client';
import { extractSlug } from '../utils/extractSlug';
import prisma from '../lib/prisma';

export interface TenantContext {
  id: number;
  slug: string;
  name: string;
  logoUrl: string | null;
  status: TenantStatus;
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

/**
 * Resolves a tenant from the :slug route param, attaches req.tenant,
 * and validates the tenant exists and is not SUSPENDED.
 * Used on all /admin/portals/:slug/* and /api/:slug/* routes.
 */
export default async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const slug = extractSlug(req.originalUrl);

  if (!slug) {
    return res.status(400).json({ status_code: 400, status_message: 'Tenant slug is required' });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, logoUrl: true, status: true },
  });

  if (!tenant) {
    return res.status(404).json({ status_code: 404, status_message: `Tenant '${slug}' not found` });
  }

  if (tenant.status === TenantStatus.SUSPENDED) {
    return res.status(403).json({ status_code: 403, status_message: `Tenant '${slug}' is suspended` });
  }

  req.tenant = tenant;
  next();
}
