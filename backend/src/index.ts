import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth';
import adminProjectRoutes from './routes/admin_projects';
import publicProjectRoutes from './routes/public_projects';
import superadminAuthRoutes from './routes/superadmin_auth';
import superadminPortalsRoutes from './routes/superadmin_portals';
import superadminTenantRoutes from './routes/superadmin_tenant';
import superadminFieldsRoutes from './routes/superadmin_fields';
import tenantAuthRoutes from './routes/tenant_auth';
import tenantProjectRoutes from './routes/tenant_projects';

dotenv.config();

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
app.use('/api/', generalLimiter);

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

// Health Check / Root Route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'SaaS Portal Platform API Server is running successfully!'
  });
});

// Catch-all: log all requests
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.path}`);
  next();
});

// Static file serving (only in local storage mode)
if (process.env.STORAGE_TYPE !== 's3') {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
  console.log('[INFO] Local file serving enabled at /uploads');
} else {
  console.log('[INFO] S3 storage mode - local file serving disabled');
}

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

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`SaaS Portal Platform API Server running on port ${PORT}`);
});
