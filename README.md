# Kolte-Patil Project Portal

A decoupled full-stack CMS for managing real estate listings — **Next.js** admin frontend + **Node.js/Express** backend + **PostgreSQL** database.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TailwindCSS v4 |
| Backend | Node.js, Express, TypeScript, Multer |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (stateless) |
| Drag & Drop | @dnd-kit/core, @dnd-kit/sortable |

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

### 3. Frontend (Admin Portal)

```bash
cd admin-portal
npm install
npm run dev
```

App runs on **http://localhost:3000**

### Default Credentials
- **Email:** `admin@koltepatil.test`
- **Password:** `password123`

---

## Features

### Dashboard Tabs
The dashboard supports four filter tabs:
- **All** — all live (non-draft) projects
- **Active** — live, non-archived projects
- **Drafts** — work-in-progress listings not yet published
- **Archived** — soft-deleted / hidden projects

### Drafts Workflow
Admins can save a project as a **Draft** during creation:
1. Fill out the multi-step form (Step 1 → 3)
2. On Step 3, choose **"Save as Draft"** (grey) or **"Publish Listing"** (gold)
3. Drafts appear exclusively in the **Drafts** tab — never in All, Active, or mobile API
4. Open any draft → click **"Make Live"** in the sidebar to publish it instantly

### Project Creation Form
Multi-step form with three steps:
1. **Property Info** — banner images (drag to reorder via dnd-kit), project name, location, price
2. **Details** — bedrooms, area, furnishing, status, description, community amenities, property amenities (checkbox + reorder)
3. **Location & Attachments** — nearby places (checkbox to include/exclude + drag to reorder), map embed, brochure PDF upload

### Project Status
Three values: `ONGOING`, `LATEST`, `COMPLETED`. Set via the form and displayed as badges on listing cards and in the detail page header.

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
| GET | `/admin/projects` | List all projects (`?includeArchived=true`) |
| GET | `/admin/projects/:id` | Get single project |
| POST | `/admin/projects` | Create project (multipart/form-data) |
| PUT | `/admin/projects/:id` | Update project (multipart/form-data) |
| PATCH | `/admin/projects/:id` | Toggle `isArchived`, `isActive`, or `isDraft` |
| DELETE | `/admin/projects/:id` | Archive project (soft-delete) |

### Mobile API (`/projects/*`) — public

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects/list` | Paginated active listings (drafts & archived excluded) |
| POST | `/projects/:id/click` | Track analytics click |

> **Note:** The mobile API enforces `isActive: true`, `isArchived: false`, `isDraft: false` — drafts can never leak to mobile consumers.

---

## Data Model

### Project Fields
- `projectName`, `description`, `location`, `locationIframe`
- `bedrooms`, `bathrooms`, `price`, `furnishing`, `area`
- `bannerImages` — JSON array: `[{url, order, isCover}]`
- `coverImageUrl` — computed field (first `isCover: true` image, or first image)
- `projectStatus` — `ONGOING | LATEST | COMPLETED`
- `project_brochure` — PDF URL
- `isActive` — `true` for live listings
- `isArchived` — `true` for soft-deleted listings
- `isDraft` — `true` for work-in-progress listings (mutually exclusive with active)
- `communityAmenities[]`, `propertyAmenities[]`, `nearbyPlaces[]`

### Relational Tables
- `CommunityAmenity` — `id, projectId, name, imageUrl`
- `PropertyAmenity` — `id, projectId, name`
- `NearbyPlace` — `id, projectId, category, distanceKm`

---

## Frontend Architecture

### Universal Header (`src/components/Header.tsx`)
A single shared header component used across all pages. Contains:
- Kolte Patil logo (click to go to dashboard)
- Logout button

Each page renders page-specific controls (e.g., "Publish Listing" button, stepper, "Cancel") in a sub-bar below the universal header.

### Pages
| Route | Description |
|-------|-------------|
| `/` | Login page |
| `/dashboard` | Project catalog with All / Active / Drafts / Archived tabs |
| `/dashboard/[projectname]` | Project detail view with admin actions |
| `/projects/new` | Multi-step create form |
| `/projects/edit/[id]` | Edit existing project |
