# Multi-Tenant Project Portal

A production-ready multi-tenant SaaS platform for managing real estate listings. Built with Next.js 16, Node.js/Express, and PostgreSQL.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TailwindCSS v4, @dnd-kit |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Database | PostgreSQL |
| Auth | JWT (stateless) |
| File Storage | Local (dev) / S3 (prod) |

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### 1. Database Setup

```bash
# Create database
createdb saasportal
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env <<EOF
DATABASE_URL="postgresql://postgres@localhost:5432/saasportal?schema=public"
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRY="7d"
PORT=3002
POSTMAN_BASE_URL="http://localhost:3002"
STORAGE_TYPE=local
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"
EOF

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate deploy

# Start development server
npm run dev
```

Backend runs on **http://localhost:3002**

### 3. Frontend Setup

```bash
cd admin-portal

# Install dependencies
npm install

# Create .env.local file
cat > .env.local <<EOF
NEXT_PUBLIC_API_URL="http://localhost:3002"
EOF

# Start development server
npm run dev
```

Frontend runs on **http://localhost:3000**

---

## Default Credentials

**First-time setup:** Register a superadmin at http://localhost:3000/admin/login

**Tenant Admin (after creating a portal):**
- Email: The email you specified during portal creation
- Password: The password you specified during portal creation

---

## Architecture

### Multi-Tenant Design

- Single deployment serves unlimited tenants
- Each tenant has isolated data via `tenantId` scoping
- Dynamic form schemas via `TenantField` table
- Self-service portal creation via 5-step wizard

### Key Features

| Feature | Description |
|---------|-------------|
| **Dynamic Forms** | Form fields configured per-tenant via database schema |
| **Image Captions** | Optional captions per image field |
| **Image Cropping** | Fixed dimension cropping for IMAGE/IMAGE_MULTI fields |
| **Rate Limiting** | 100 req/min general, 10 req/15min auth endpoints |
| **CORS** | Configurable via `ALLOWED_ORIGINS` env var |
| **File Validation** | MIME type + size limits (20MB max) |
| **Storage Abstraction** | Local filesystem (dev) or S3 (production) |

---

## API Overview

### Superadmin API (`/superadmin/*`, `/admin/portals/*`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/superadmin/auth/register` | Register first superadmin |
| POST | `/superadmin/auth/login` | Superadmin login |
| GET | `/admin/portals` | List all tenants |
| POST | `/admin/portals` | Create new tenant |
| GET | `/admin/portals/:slug/fields` | Get tenant field schema |
| POST | `/admin/portals/:slug/fields` | Add field to tenant |

### Tenant API (`/api/:slug/*`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/:slug/auth/login` | Tenant admin login |
| GET | `/api/:slug/projects` | List projects (paginated) |
| POST | `/api/:slug/projects` | Create project |
| PUT | `/api/:slug/projects/:id` | Update project |
| DELETE | `/api/:slug/projects/:id` | Archive project |

### Public API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/api/:slug/postman.json` | Auto-generated Postman collection |

---

## Project Structure

```
├── admin-portal/          # Next.js frontend
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # Reusable components
│   │   └── lib/           # Utilities
│   └── .env.local
├── backend/               # Express backend
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth, validation, upload
│   │   ├── storage/       # Storage abstraction (local/S3)
│   │   └── lib/           # Prisma client
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── .env
└── README.md
```

---

## Production Deployment

See `Dev-Handoff.md` in the documentation folder for production deployment requirements.

### Key Environment Variables (Production)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | 32+ character random string |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed domains |
| `STORAGE_TYPE` | `local` or `s3` |
| `REDIS_URL` | Redis connection string (optional) |

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
npm run dev      # Start Next.js dev server
npm run build    # Build for production
npm run start    # Start Next.js production server
npm run lint     # Run ESLint
```

---

## License

MIT
