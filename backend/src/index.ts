// Must run before any other import: several modules (lib/env.ts) read and
// validate process.env at import time, so dotenv has to populate it first.
// TypeScript hoists all `import` statements above other statements even in
// commonjs output, so calling dotenv.config() after the imports below runs
// too late — it must be its own side-effecting import, first in the file.
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { logger } from './lib/logger';

import authRoutes from './routes/auth';
import adminProjectRoutes from './routes/admin_projects';
import publicProjectRoutes from './routes/public_projects';
import superadminAuthRoutes from './routes/superadmin_auth';
import superadminPortalsRoutes from './routes/superadmin_portals';
import superadminTenantRoutes from './routes/superadmin_tenant';
import superadminFieldsRoutes from './routes/superadmin_fields';
import tenantAuthRoutes from './routes/tenant_auth';
import tenantProjectRoutes from './routes/tenant_projects';

const app = express();

// Security: Restrict CORS to allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Security: Request size limits (prevent large payload attacks)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate limiting: General API (per IP)
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: { status_code: 429, status_message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
// Previously only /api/* was rate limited, leaving /admin/*, /projects/*
// (legacy tenant-management + legacy public API) completely uncovered.
app.use(['/api/', '/admin', '/projects'], generalLimiter);

// Rate limiting: Auth endpoints (stricter, per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes
  message: { status_code: 429, status_message: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/superadmin/auth/login', authLimiter);
app.use('/api/:slug/auth/login', authLimiter);
app.use('/admin/auth/login', authLimiter); // legacy admin login (previously unprotected)

// Health Check / Root Route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'SaaS Portal Platform API Server is running successfully!'
  });
});

// Catch-all: log all requests (structured, so it's parseable in prod log tooling)
app.use((req, res, next) => {
  logger.info('request', { method: req.method, path: req.path });
  next();
});

// Static file serving (only in local storage mode)
if (process.env.STORAGE_TYPE !== 's3') {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
  logger.info('Local file serving enabled at /uploads');
} else {
  logger.info('S3 storage mode - local file serving disabled');
}

// Icon assets — always served statically (bundled with the codebase, not user uploads)
app.use('/icons', express.static(path.join(__dirname, '../src/icons')));
logger.info('Icon assets served at /icons');

// ─── Existing Routes (Backward Compat) ────────────────────────────────────
app.use('/admin/auth', authRoutes);              // Tenant admin login (existing Kolte & Patil)
app.use('/admin/projects', adminProjectRoutes);  // Admin project CRUD
app.use('/projects', publicProjectRoutes);        // Public project listing

// ─── Superadmin Routes ─────────────────────────────────────────────────────
app.use('/superadmin/auth', superadminAuthRoutes); // Superadmin login/register
app.use('/admin/portals', superadminPortalsRoutes); // List/create tenants (no tenant ctx needed)
app.use('/admin/portals/:slug', superadminTenantRoutes);  // Get/update/delete/suspend tenant
app.use('/admin/portals/:slug/fields', superadminFieldsRoutes); // CRUD tenant fields (own path prefix to avoid Express 5 routing conflict)

// ─── Tenant Public Routes ──────────────────────────────────────────────────
app.use('/api', tenantAuthRoutes);             // Tenant admin auth: /api/:slug/auth/login
app.use('/api', tenantProjectRoutes);          // Tenant projects: /api/:slug/projects

// Centralized error handler — catches errors passed via next(err) (e.g. multer
// fileFilter rejections) so they return a consistent JSON body instead of
// falling through to Express's default HTML error page, and so stack traces
// are logged server-side only, never sent to the client.
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('unhandled request error', { method: req.method, path: req.path, error: err.message, stack: err.stack });
  const isMulterError = err.name === 'MulterError' || /file type|file size|not allowed/i.test(err.message || '');
  res.status(isMulterError ? 400 : 500).json({
    status_code: isMulterError ? 400 : 500,
    status_message: isMulterError ? err.message : 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info(`SaaS Portal Platform API Server running on port ${PORT}`);
});
