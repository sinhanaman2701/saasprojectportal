# Multi-Tenant Project Portal

A production-ready multi-tenant SaaS platform for managing real estate listings. Built with Next.js 16, Node.js/Express, and PostgreSQL.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TailwindCSS v4, @dnd-kit |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Database | PostgreSQL |
| Auth | JWT (stateless, dual-system) |
| File Storage | Local (dev) / S3 (prod) |

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### 1. Database Setup

```bash
createdb saasportal
```

### 2. Backend Setup

```bash
cd backend

npm install

cat > .env <<EOF
DATABASE_URL="postgresql://postgres@localhost:5432/saasportal?schema=public"
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRY="7d"
PORT=3002
POSTMAN_BASE_URL="http://localhost:3002"
STORAGE_TYPE=local
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"
EOF

npx prisma generate
npx prisma migrate deploy

npm run dev
```

Backend runs on **http://localhost:3002**

### 3. Frontend Setup

```bash
cd admin-portal

npm install

cat > .env.local <<EOF
NEXT_PUBLIC_API_URL="http://localhost:3002"
EOF

npm run dev
```

Frontend runs on **http://localhost:3000**

---

## First-Time Setup

### 1. Register Superadmin

`POST /superadmin/auth/register` is a **first-run-only** endpoint. It creates the initial superadmin account and is automatically locked (returns `403`) once any superadmin exists in the database.

```bash
curl -X POST http://localhost:3002/superadmin/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"yourpassword"}'
```

After the first superadmin is created, this endpoint is permanently disabled. Use `/superadmin/auth/login` to authenticate.

### 2. Create Your First Tenant Portal

1. Login at **http://localhost:3000/admin**
2. Click **"Create Portal"**
3. Follow the 5-step wizard:
   - **Step 1:** Name + slug (e.g. `kolte-patil`)
   - **Step 2:** Branding (logo URL)
   - **Step 3:** Field schema (drag-and-drop form builder)
   - **Step 4:** Admin credentials
   - **Step 5:** Review and create
4. Tenant portal is live at **/:slug** (e.g. `/kolte-patil`)

---

## Architecture

### Multi-Tenant Design

- Single deployment serves unlimited tenants
- Each tenant has isolated data via `tenantId` scoping on all Prisma queries
- Dynamic form schemas via `TenantField` table — no code changes needed to add fields
- Self-service portal creation via 5-step wizard

### Authentication

Three independent auth systems, all using JWT:

| System | Header | Endpoints | Notes |
|--------|--------|-----------|-------|
| Superadmin | `Authorization: Bearer <token>` | `/superadmin/*`, `/admin/portals/*` | JWT payload includes `role: 'superadmin'` |
| Tenant Admin | `Authorization: Bearer <token>` | `/api/:slug/*` | JWT payload includes `tenantId` |
| Mobile API | `Access-Token: <64-char hex>` | `/api/:slug/*` (read-only) | Static token per tenant, regeneratable |

### Project State Machine

Every project has three mutually exclusive states:

| State | `isActive` | `isDraft` | `isArchived` |
|-------|-----------|---------|------------|
| Active | `true` | `false` | `false` |
| Draft | `false` | `true` | `false` |
| Archived | `false` | `false` | `true` |

Transitioning to `draft` or `active` automatically clears the `isArchived` flag via the PUT route state machine.

### Mobile API Payload

The public project listing and detail endpoints enrich the data with resolved icons:

- `propertyAmenities`: `[{ value, label, iconUrl }]`
- `nearbyPlaces`: `[{ category, distance, unit, iconUrl }]`

Icons are served as SVGs from `/icons/<name>.svg` (bundled with the codebase, not user uploads).

### Key Features

| Feature | Description |
|---------|-------------|
| **Dynamic Forms** | Form fields configured per-tenant via database schema |
| **Image Cropping** | Fixed-dimension crop modal for IMAGE/IMAGE_MULTI fields |
| **Image Captions** | Optional captions per image, configurable per field |
| **Draft Save** | Save partial progress without required-field validation |
| **Icon Enrichment** | SVG icons injected into amenity/nearby-places payloads |
| **Rate Limiting** | 100 req/min general, 10 req/15min auth endpoints |
| **File Validation** | MIME type + size limits (20MB max) |
| **Storage Abstraction** | Local filesystem (dev) or S3 (production) |

---

## API Overview

### Superadmin API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/superadmin/auth/register` | None (first-run only) | Bootstrap first superadmin |
| POST | `/superadmin/auth/login` | None | Superadmin login |
| GET | `/admin/portals` | Superadmin JWT | List all tenants |
| POST | `/admin/portals` | Superadmin JWT | Create tenant + seed fields |
| GET | `/admin/portals/:slug` | Superadmin JWT | Get tenant detail + fields |
| PUT | `/admin/portals/:slug` | Superadmin JWT | Update branding/status |
| GET | `/admin/portals/:slug/fields` | Superadmin JWT | List field schema |
| POST | `/admin/portals/:slug/fields` | Superadmin JWT | Add field |
| PUT | `/admin/portals/:slug/fields/:id` | Superadmin JWT | Update field (migrates project data) |
| DELETE | `/admin/portals/:slug/fields/:id` | Superadmin JWT | Delete field |
| POST | `/admin/portals/:slug/fields/bulk` | Superadmin JWT | Upsert many fields (used by wizard) |
| GET | `/admin/portals/:slug/admins` | Superadmin JWT | List tenant admins |
| POST | `/admin/portals/:slug/admins` | Superadmin JWT | Create tenant admin |
| DELETE | `/admin/portals/:slug/admins/:id` | Superadmin JWT | Delete tenant admin (tenant-scoped) |

### Tenant Admin API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/:slug/auth/login` | None | Tenant admin login |
| GET | `/api/:slug/auth/me` | Tenant JWT | Current admin profile |
| PUT | `/api/:slug/auth/change-password` | Tenant JWT | Change password |
| GET | `/api/:slug/projects` | Access-Token or JWT | List projects (filter, page, limit) |
| GET | `/api/:slug/projects/:id` | Access-Token or JWT | Get project detail |
| POST | `/api/:slug/projects` | Tenant JWT | Create project |
| PUT | `/api/:slug/projects/:id` | Tenant JWT | Update project + state machine |
| PATCH | `/api/:slug/projects/:id` | Tenant JWT | Toggle flags (archive/publish) |
| DELETE | `/api/:slug/projects/:id` | Tenant JWT | Archive project |
| GET | `/api/:slug/projects/stats` | Access-Token or JWT | Aggregated stats |
| GET | `/api/:slug/postman.json` | Access-Token or JWT | Auto-generated Postman collection |

---

## Project Structure

```
├── admin-portal/              # Next.js frontend
│   └── src/
│       ├── app/
│       │   ├── admin/         # Superadmin portal
│       │   └── [slug]/        # Tenant portal (dynamic)
│       └── components/
│           └── dynamic-form/  # Form engine (DynamicForm, FieldRenderer, StepperBar)
├── backend/
│   └── src/
│       ├── routes/            # API endpoints
│       ├── middleware/        # Auth, validation, upload
│       ├── utils/             # icon-map, default-fields, postman-generator
│       ├── icons/             # SVG icon assets (served at /icons/)
│       ├── storage/           # Local/S3 abstraction
│       └── lib/               # Prisma client
│   └── prisma/
│       ├── schema.prisma
│       └── migrations/
└── README.md
```

---

## Security Notes

- `POST /superadmin/auth/register` is **first-run locked** — permanently returns `403` once any superadmin exists. Cannot be bypassed.
- `DELETE /admin/portals/:slug/admins/:id` is **tenant-scoped** — a superadmin cannot delete an admin belonging to a different tenant even with the correct integer ID.
- `POST /api/register-admin` requires a **superadmin JWT** — tenant admins cannot create other admins via this route.
- All `/api/:slug/*` routes are scoped by `tenantId` extracted from the JWT or Access-Token.

---

## Production Deployment

### Key Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | 32+ character random string |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated allowed domains |
| `STORAGE_TYPE` | ✅ | `local` or `s3` |
| `PORT` | — | Backend port (default `3001`) |
| `JWT_EXPIRY` | — | Token expiry (default `7d`) |
| `POSTMAN_BASE_URL` | — | Base URL in generated Postman collection |

### S3 Storage

Set `STORAGE_TYPE=s3` and add:
```
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=your-bucket-name
```

---

## Development Commands

### Backend

```bash
npm run dev      # Start dev server with nodemon
npm run build    # Compile TypeScript
npm run start    # Start production server
```

### Frontend

```bash
npm run dev      # Start Next.js dev server (http://localhost:3000)
npm run build    # Build for production
npm run start    # Start Next.js production server
npm run lint     # Run ESLint
```

---

## License

MIT
