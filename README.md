# Kolte-Patil Project Portal

A decoupled full-stack CMS for managing real estate listings — **Next.js** admin frontend + **Node.js/Express** backend + **PostgreSQL** database.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TailwindCSS v4 |
| Backend | Node.js, Express, TypeScript, Multer |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (stateless, no expiry) |

---

## Getting Started

### 1. Database Setup

Create a PostgreSQL database named `kolte_patil_portal` on port `5432`.

### 2. Backend

```bash
cd backend
npm install
```

Create `.env` in `/backend`:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/kolte_patil_portal?schema=public"
JWT_SECRET="your_secret_key"
PORT=3001
```

```bash
npx prisma generate
npx prisma db push
npx ts-node src/index.ts
```

Server runs on **http://localhost:3001**

### 3. Frontend

```bash
cd admin-portal
npm install
npm run dev
```

App runs on **http://localhost:3000**

### Credentials
- **Email:** `admin@koltepatil.test`
- **Password:** `password123`

---

## Project Status

Three values: `ONGOING`, `LATEST`, `COMPLETED`. Set via the dropdown in the new/edit form. Displayed as badges on listing cards and in the detail page header.

---

## Image & File Upload Flow

1. Admin uploads images via the multi-step form
2. Files are saved to `backend/uploads/` (local storage)
3. S3 integration planned: swap Multer's local disk storage for AWS S3 — no API/frontend changes needed

---

## API Overview

### Admin API (`/admin/*`) — requires `Authorization: Bearer <JWT_TOKEN>`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/auth/login` | Login, returns JWT |
| GET | `/admin/projects` | List all projects (`?includeArchived=true\|false`) |
| GET | `/admin/projects/:id` | Get single project |
| POST | `/admin/projects` | Create project (multipart/form-data) |
| PUT | `/admin/projects/:id` | Update project (multipart/form-data) |
| PATCH | `/admin/projects/:id` | Toggle archive/active (`{ isArchived: true\|false }`) |
| DELETE | `/admin/projects/:id` | Archive project (soft-delete) |

### Mobile API (`/projects/*`) — public

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects/list` | Paginated active listings for mobile app |
| POST | `/projects/:id/click` | Track analytics click |

### Postman Collection

Import `KoltePatil_Portal_API.postman_collection.json` for ready-to-use request templates.

---

## Data Model

### Project Fields
- `projectName`, `description`, `location`, `locationIframe`
- `bedrooms`, `bathrooms`, `price`, `furnishing`, `area`
- `bannerImages` — JSON array: `[{url, order, isCover}]`
- `coverImageUrl` — computed convenience field (first image or `isCover: true`)
- `projectStatus` — `ONGOING | LATEST | COMPLETED`
- `project_brochure` — PDF URL
- `communityAmenities[]`, `propertyAmenities[]`, `nearbyPlaces[]`

### Relational Tables
- `CommunityAmenity` — `id, projectId, name, imageUrl`
- `PropertyAmenity` — `id, projectId, name, iconUrl`
- `NearbyPlace` — `id, projectId, category, distanceKm, iconUrl`
