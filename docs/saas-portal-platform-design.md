# SaaS Multi-Tenant Project Portal Platform
## Architecture Decision Document — v1.0

---

## 1. Executive Summary

### What Is Being Built

A **multi-tenant white-label portal platform** that replaces the current single-tenant Kolte & Patil admin portal. Instead of building a new portal from code for every real estate company onboarded, a **Superadmin** uses a configuration-driven interface to assemble a tenant portal — fields, sections, branding, API contracts — all without writing code. Confirming the configuration "spells out" a new live tenant portal at `projectportal/<tenant-slug>`.

**Current state:** Single-tenant portal hardcoded for Kolte & Patil (`admin-portal` + `backend`).
**Target state:** A platform with three tiers:
- **Superadmin Portal** (`/admin`) — configures and spawns tenant portals
- **Tenant Portals** (`/koltepatil`, `/dlf`, etc.) — each tenant's isolated admin portal
- **Public APIs** (`/api/<tenant-slug>/*`) — each tenant's mobile/app API

---

## 2. Problem Statement

### Current Limitations

| Issue | Impact |
|-------|--------|
| Every new client = new repo/branch deployment | Weeks of dev work per client |
| Schema changes require code edits + deploys | Slow iteration, high coordination cost |
| API contracts are hand-written per client | Inconsistent, error-prone |
| No self-service for client admins | Dev team bottleneck on every change |
| Current portal is tightly coupled | Can't reuse form logic for different field sets |

### Why This Matters Commercially

Onboarding a new real estate developer today = 2–4 weeks of dev work. With this platform = a 1–2 hour configuration session. That shifts the business from a services model to a product model.

---

## 3. Proposed Architecture

### 3.1 Three-Tier Model

```
┌─────────────────────────────────────────────┐
│              SUPERADMIN PORTAL               │
│         /admin (projectportal/admin)         │
│                                             │
│  • Dashboard: list all tenant portals       │
│  • Portal Builder: configure tenant portals │
│  • API Tester: test tenant API contracts    │
│  • Postman Export: auto-generate collection │
│  • Branding Config: logo, colors, name     │
│  • Field Schema Editor: fields, types, s.   │
│  • Confirm & Deploy: spawns tenant portal   │
└────────────────────┬────────────────────────┘
                     │ Confirmed config
                     ▼
┌─────────────────────────────────────────────┐
│           TENANT PORTAL (dynamic)           │
│  /koltepatil, /dlf, /godrej, etc.          │
│                                             │
│  • Multi-step form (from tenant config)     │
│  • Project listing dashboard                 │
│  • Project detail view                       │
│  • Draft/Active/Archived workflow          │
│  • All driven by tenant's field schema      │
└────────────────────┬────────────────────────┘
                     │ Mobile/App API
                     ▼
┌─────────────────────────────────────────────┐
│              TENANT PUBLIC API              │
│         /api/<tenant-slug>/projects         │
│                                             │
│  • List active projects                      │
│  • Project detail                            │
│  • Click analytics                          │
│  • Schema matches tenant's config           │
└─────────────────────────────────────────────┘
```

### 3.2 Backend Architecture

#### Multi-Tenant Database Strategy

One database with a `tenant_id` discriminator. Prisma schema split into:

**Platform Layer (shared):**

```prisma
model Tenant {
  id          Int      @id @default(autoincrement())
  slug        String   @unique           // koltepatil, dlf, godrej
  name        String                    // "Kolte & Patil Developers"
  logoUrl     String?
  primaryColor String?                  // #C9A84C
  status      TenantStatus @default(PENDING)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  fields      TenantField[]
  projects    Project[]
  admins      TenantAdmin[]
}

enum TenantStatus {
  PENDING      // being configured, not live
  LIVE         // fully operational
  SUSPENDED    // paused by superadmin
}

model TenantField {
  id          Int      @id @default(autoincrement())
  tenantId    Int
  tenant      Tenant   @relation(fields: [tenantId], references: [id])

  key         String   // projectName, bedrooms, price_range
  label       String   // "Project Name", "Bedrooms"
  type        FieldType
  section     String   // "Property Info", "Details", "Location"
  order       Int
  required    Boolean  @default(false)
  placeholder String?
  options     Json?    // for select/multiselect: [{label, value}]
  validation  Json?   // [{rule: "min", value: 0}]

  @@unique([tenantId, key])
}

enum FieldType {
  TEXT
  NUMBER
  SELECT
  MULTISELECT
  TEXTAREA
  IMAGE
  IMAGE_MULTI
  FILE
  CHECKBOX
  LOCATION
  PRICE
  AREA
  DATERANGE
}
```

**Tenant Data Layer (per tenant, isolated):**

```prisma
model Project {
  id            Int      @id @default(autoincrement())
  tenantId      Int
  tenant        Tenant   @relation(fields: [tenantId], references: [id])

  // System fields (always present)
  status        ProjectStatus @default(ONGOING)
  isActive      Boolean  @default(true)
  isArchived    Boolean  @default(false)
  isDraft       Boolean  @default(false)
  clickCount    Int      @default(0)

  // Config-driven fields stored as JSONB
  data          Json     // {projectName: "...", bedrooms: 2, ...}

  // File attachments (standardized shape per tenant)
  attachments   Json?    // [{fieldKey, files: [{url, order, isCover}]}]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([tenantId])
  @@index([tenantId, isArchived])
  @@index([tenantId, isDraft])
}

model TenantAdmin {
  id           Int      @id @default(autoincrement())
  tenantId     Int
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  email        String   @unique
  passwordHash String
  name         String?
  createdAt    DateTime @default(now())
}

model Superadmin {
  id           Int     @id @default(autoincrement())
  email        String  @unique
  passwordHash String
}
```

**Key Design Decision — JSONB `data` column:**
All tenant-specific fields live in a single `data Json` column on the `Project` model. The `TenantField` config acts as the schema. This avoids:
- ALTER TABLE on every new field addition
- Massive EAV joins
- Schema drift between tenants

Query patterns that need to filter/sort by specific fields (e.g., price range) access `data->>'price'` via Prisma's raw query capability or PostgreSQL generated columns.

#### API Contract Dynamic Generation

When a tenant config is saved, the server auto-generates:
1. An **OpenAPI 3.0 spec** (`/api/<slug>/openapi.json`)
2. A **Postman Collection v2.1** (`/api/<slug>/postman.json`)

Both are derived directly from the `TenantField` rows. The superadmin can download these and import into Postman to test the tenant's API before going live.

### 3.3 Frontend Architecture

#### Superadmin Portal (`/admin`)

Built as a new Next.js app (or distinct route group within the existing repo):
- `/admin` — Dashboard listing all tenants with status, creation date, project count
- `/admin/portals/new` — Portal builder wizard
- `/admin/portals/[slug]` — Edit existing tenant config
- `/admin/portals/[slug]/api` — API tester and Postman export
- `/admin/portals/[slug]/branding` — Logo, color, name config
- `/admin/portals/[slug]/fields` — Field schema editor
- `/admin/settings` — Superadmin account settings

#### Dynamic Form Engine

The most complex part of the tenant portal is the form renderer. It reads the tenant's `TenantField` config and produces a multi-step form:

```tsx
// Pseudocode for the dynamic form renderer
function DynamicForm({ tenantId, fieldSchema }: { tenantId: number, fieldSchema: TenantField[] }) {
  const sections = groupBy(fieldSchema, 'section')

  return (
    <StepperForm>
      {Object.entries(sections).map(([sectionName, fields]) => (
        <Step label={sectionName}>
          {fields.sort(byOrder).map(field => (
            <DynamicField key={field.key} field={field} />
          ))}
        </Step>
      ))}
    </StepperForm>
  )
}

// Field renderer map
function DynamicField({ field }: { field: TenantField }) {
  switch (field.type) {
    case 'TEXT':     return <TextInput {...field} />
    case 'NUMBER':   return <NumberInput {...field} />
    case 'SELECT':   return <SelectInput {...field} options={field.options} />
    case 'IMAGE_MULTI': return <ImageUploader {...field} />
    case 'PRICE':    return <PriceInput {...field} />
    case 'AREA':     return <AreaInput {...field} />
    // ... etc
  }
}
```

The existing admin-portal's 3-step form (`Property Info → Details → Location & Attachments`) maps cleanly to `section` groupings in `TenantField`. The dnd-kit drag-and-drop reordering already works on arrays — those same patterns apply to the field order in each section.

#### Tenant Listing Dashboard

The project grid/list view is partially dynamic — the columns shown, the filter tabs, and the card layout are driven by config. Specifically:
- **Fixed (always):** Project name, cover image, status badge, draft/active/archived tabs, action buttons
- **Configurable per tenant:** Extra card fields (e.g., "Price Range", "Bedrooms", "Location") shown as chips below the project name

#### Public API Response Shape

Driven by `TenantField` — the `POST /api/<slug>/projects/list` response only includes fields marked `showInList: true` in the field config.

---

## 4. User Flows

### 4.1 Superadmin: Onboarding a New Tenant

```
1. Superadmin logs into /admin
   └── Dashboard shows: 0 tenants | "Create New Portal" button

2. Clicks "Create New Portal"
   └── Step 1: Basic Info — tenant name, slug (URL), logo upload, primary color
   └── Step 2: Field Schema Builder
       • Adds sections (e.g., "Property Info", "Amenities", "Location")
       • Adds fields per section: choose type, label, required, placeholder, options
       • Reorder fields within sections via drag-and-drop
       • Preview pane shows live form preview
   └── Step 3: API Config
       • Review auto-generated POST /projects endpoint body
       • Review auto-generated GET /projects/list response shape
       • Download Postman collection
   └── Step 4: Test & Confirm
       • Use built-in API tester to POST a test project
       • Verify it appears in the tenant's listing
       • "Confirm & Deploy" button

3. Clicks "Confirm & Deploy"
   └── Tenant status: PENDING → LIVE
   └── Tenant portal is accessible at /{slug}
   └── Tenant's own admin credentials sent to their email (onboarding email)
```

### 4.2 Tenant Admin: Creating Their First Project

```
1. Tenant admin receives email: "Your portal is ready — login here: /koltepatil"
   └── Sets initial password
   └── Logs into /koltepatil

2. Sees empty dashboard: "No projects yet — create your first listing"
   └── Clicks "New Project"
   └── Sees multi-step form built from the schema superadmin configured
   └── (If superadmin configured 5 sections, tenant admin sees 5 steps)

3. Fills form, uploads images (drag to reorder banners)
   └── Step 5 (or final): "Save as Draft" (grey) or "Publish" (gold)

4. Project appears in dashboard under "Active" tab
   └── Public API now returns this project for mobile/app consumers
```

### 4.3 Public Consumer (Mobile App / Website)

```
1. App calls POST /api/koltepatil/projects/list
   └── Request body: { page: 1, limit: 10 }
   └── Response: projects filtered by isActive=true, isArchived=false, isDraft=false
   └── Each project includes only fields marked showInList=true

2. User taps a project
   └── App calls GET /api/koltepatil/projects/:id
   └── Full data returned, including all fields

3. User taps "Enquire" or browses images
   └── POST /api/koltepatil/projects/:id/click (analytics)
```

### 4.4 Superadmin: Modifying a Live Tenant Portal

```
1. Superadmin goes to /admin/portals/koltepatil/fields
2. Adds a new field "RERA Number" (TEXT, required, in "Legal Info" section)
3. Saves — field immediately appears in tenant's form
4. Existing projects show "RERA Number: Not Set" badge
5. Tenant admin fills in RERA numbers for existing projects
```

---

## 5. What's New vs. What's Changing

### New Components

| Component | Purpose |
|-----------|---------|
| **Superadmin Portal** (`/admin`) | Platform dashboard, portal builder, tenant management |
| **Portal Builder UI** | Drag-and-drop field schema editor for superadmins |
| **Dynamic Form Engine** | Renders forms from `TenantField` config at runtime |
| **Dynamic API Layer** | Runtime request validation + response shaping against tenant schema |
| **API Contract Generator** | Auto-generates OpenAPI spec + Postman collection per tenant |
| **Branding Config Module** | Per-tenant logo, color, portal name configuration |
| **Multi-Tenant Middleware** | Resolves `tenantSlug` from URL/path, injects tenant context |
| **Tenant Admin Auth** | Separate from superadmin — JWT per tenant, scoped to tenant |
| **Email Onboarding Flow** | Sends tenant admin credentials on portal creation |
| **Attachment Storage v2** | Per-tenant S3 bucket or namespaced paths |

### Changed Components

| Component | Current State | After |
|-----------|---------------|-------|
| `admin-portal` | Single-tenant hardcoded form | Becomes the **tenant portal template** — form engine replaces hardcoded fields |
| `backend` | Fixed Prisma schema with 15 columns on `Project` | Platform backend: dynamic validation, JSONB storage, multi-tenant routing |
| `Project` model | 15 fixed fields | System fields (status, isActive, isArchived, isDraft) + `data Json` + `attachments Json` |
| `CommunityAmenity`, `PropertyAmenity`, `NearbyPlace` | Separate related tables | Stored inside `attachments Json` or as configurable related records |
| API endpoints | `/admin/projects`, `/projects` | `/admin/portals`, `/admin/portals/:slug`, `/api/:slug/projects` |
| Authentication | Single `Admin` model, single JWT secret | `Superadmin` (platform) + `TenantAdmin` (per tenant), tenant-scoped JWTs |
| Postman collection | Hand-written JSON | Auto-generated from `TenantField` config |

### Removed Components

| Component | Reason |
|-----------|--------|
| Hardcoded field types on `Project` model | Replaced by dynamic `TenantField` config |
| Fixed `communityAmenities`, `propertyAmenities`, `nearbyPlaces` tables | Configurable related entities or JSON within `attachments` |
| Single-tenant `Admin` model | Replaced by `TenantAdmin` + `Superadmin` |
| `bannerImages`, `coverImageUrl` as separate fields | Merged into `attachments Json` with generic shape |
| `reader.js`, `reader2.js` (PDF utilities) | Deprecated unless PDF parsing is needed for field extraction |

---

## 6. Pros and Cons

### Advantages

**Business:**
- **Near-zero cost to onboard a new client.** What takes 2–4 weeks of dev time becomes a 1–2 hour config session. Changes the business model from services to product.
- **Self-service for tenant admins.** No dev involvement needed for field additions, label changes, or new sections.
- **Consistent API contracts.** Auto-generated Postman collections eliminate hand-written spec errors.
- **Single codebase.** One platform, many tenants. Security patches, features, and UX improvements benefit all tenants simultaneously.
- **Competitive moat.** Harder to replicate once enough tenant-specific configs and integrations exist.

**Technical:**
- **Schema flexibility.** Adding a new field to a tenant's form = INSERT into `TenantField`. No migrations, no deploys.
- **JSONB `data` column** is a pragmatic tradeoff — avoids ALTER TABLE complexity while keeping related data co-located.
- **Auto-generated API contracts** mean the frontend (mobile app / consumer website) always has accurate docs.
- **Inherits proven UX.** The current portal's multi-step form, dnd-kit interactions, and draft workflow are battle-tested. The dynamic form engine applies the same patterns.

### Risks and Cons

**Technical Risks:**

1. **Dynamic form validation complexity.** Every field type needs a corresponding validator on the server. A `PRICE` field needs range validation; a `SELECT` needs enum validation; a `TEXT` might need regex. This validation logic must be exhaustive and tested per field type. Missed edge cases = bad data.

2. **JSONB query ergonomics.** Filtering projects by `data->>'price' > 5000000` requires raw SQL or Prisma raw queries. Type-safe Prisma queries on JSONB fields are limited. Reporting queries (e.g., "show all projects with 3 bedrooms in Phase 2") become complex.

3. **No database-level referential integrity** on dynamic fields. You can't put a foreign key on a field that doesn't exist in the schema yet. Data integrity is enforced only at the application layer.

4. **Form engine is a significant undertaking.** The current hardcoded 3-step form is ~1,500 lines of React. A config-driven form engine that handles all field types (IMAGE_MULTI with dnd-kit, SELECT with options, conditional fields, cross-field validation) with good UX is weeks of work on its own.

5. **File upload in a dynamic schema.** The current portal knows exactly which fields are images. In a dynamic schema, the server must know `IMAGE` and `IMAGE_MULTI` field keys to route uploaded files correctly. This requires the upload request to carry field metadata alongside files.

6. **Multi-tenant isolation.** A bug in tenant data filtering could expose one tenant's projects to another. Needs rigorous testing, especially around Prisma queries with `tenantId` discriminators.

**Business Risks:**

1. **Scope creep in the Portal Builder.** The superadmin UI for configuring fields can easily balloon — conditional logic ("show this field only if that field = X"), calculated fields, field dependencies. Each feature added here multiplies complexity.

2. **Tenant migration problem.** If the schema evolves (new `TenantField` row added), what happens to existing projects? Do they get nulls, defaults, or a migration prompt? This needs a clear policy.

3. **Limited to what's configurable.** If a tenant needs a completely new UI pattern (e.g., a map-based project picker instead of a list), that's not a field addition — it's a code change. The platform's ceiling is "anything that fits in the config model."

4. **Onboarding complexity vs. perceived simplicity.** The "no coding" promise requires the superadmin to understand field types, validation rules, and API shapes. Non-technical superadmins may still need guidance.

---

## 7. Build Phases

Given the scope, a phased approach is strongly recommended.

### Phase 1 — Platform Foundation (4–6 weeks)
- Multi-tenant database schema (Tenant, TenantField, TenantAdmin, updated Project)
- Multi-tenant routing middleware (resolve slug, inject tenant context)
- Basic superadmin auth + tenant CRUD (create, list, status)
- Branding config (logo, color, name per tenant)
- Tenant admin auth (separate from superadmin)
- Upload middleware v2 (handles dynamic image/file fields)

### Phase 2 — Form Engine + Portal Builder (4–6 weeks)
- Field schema editor UI (superadmin adds/reorders fields, sets types, validation)
- Dynamic form renderer (reads TenantField → renders React form)
- Section/step grouping and stepper UI
- dnd-kit integration into dynamic form (field reordering, image reordering)
- Save as Draft / Publish flow (already proven, adapted)
- Dynamic project listing dashboard (fixed columns + config-driven card fields)

### Phase 3 — Dynamic API + Contract Generation (2–3 weeks)
- Runtime request validation against TenantField schema
- Dynamic response shaping (only return fields marked `showInList`)
- OpenAPI spec generator
- Postman collection auto-export
- Built-in API tester UI (for superadmin to validate before going live)

### Phase 4 — Tenant Portal Polish (2–3 weeks)
- Tenant onboarding email flow
- Portal settings for tenant admins (change password, portal name)
- Project detail page (dynamic fields rendered from `data Json`)
- Mobile API endpoints per tenant (`/api/:slug/projects/list`, `/api/:slug/projects/:id/click`)
- Analytics dashboard (click counts per project per tenant)

### Phase 5 — Operational Maturity (ongoing)
- Tenant health monitoring (project count, last activity)
- Superadmin audit log (who changed what tenant config)
- Backup/restore per tenant
- Rate limiting per tenant API

---

## 8. Migration Strategy for Existing Kolte & Patil Data

The current Kolte & Patil portal becomes the **first tenant** on the new platform.

```
1. Export existing projects from current DB
   └── Prisma → JSON (npx prisma export or custom script)

2. Create tenant record in new platform
   slug: "koltepatil"
   status: PENDING

3. Import field schema equivalent to current hardcoded fields:
   • projectName (TEXT, section: "Property Info")
   • location (TEXT)
   • price (PRICE)
   • bedrooms (NUMBER)
   • bathrooms (NUMBER)
   • furnishing (SELECT)
   • area (AREA)
   • description (TEXTAREA)
   • communityAmenities (MULTISELECT)
   • propertyAmenities (MULTISELECT)
   • nearbyPlaces (MULTISELECT)
   • bannerImages (IMAGE_MULTI)
   • brochure (FILE)
   • locationIframe (TEXTAREA)
   • projectStatus (SELECT: ONGOING/LATEST/COMPLETED)

4. Map existing project rows to new Project[data] format
   └── bannerImages → attachments Json
   └── communityAmenities → stored under data.communityAmenities
   └── propertyAmenities → stored under data.propertyAmenities
   └── nearbyPlaces → stored under data.nearbyPlaces

5. Seed TenantAdmin for existing admin@koltepatil.test

6. Switch admin-portal to read from new platform as tenant "koltepatil"

7. Confirm & Deploy → status: LIVE
```

This means the existing portal is re-implemented as a **tenant config** on the new platform, not new code. It validates the entire platform with a real dataset.

---

## 9. Open Questions

These need decisions before or during Phase 1:

1. **Subdomain vs. subpath routing?** (`koltepatil.projectportal.com` vs. `projectportal.com/koltepatil`) — subpath is simpler to implement but subdomain is more professional. Consider path-based as v1, subdomain as v2.

2. **Custom domains?** (e.g., `admin.koltepatil.com` → `projectportal.com/koltepatil`) — adds DNS and SSL complexity. Defer to v2.

3. **File storage per tenant?** Separate S3 buckets vs. single bucket with `/<tenantSlug>/` prefixes. Single bucket with prefix is simpler and sufficient for v1.

4. **Tenant data export?** Tenants may want to export all their project data as CSV/Excel. Should the platform provide this, or is it the tenant's responsibility to query their own API?

5. **Pricing model?** Per-project? Per-portal? Per-API-call? This affects how you build the metering layer. Design the data model for metering from day 1.

6. **Draft workflow for tenant portal?** Keep the same (Save as Draft / Publish / Archived) — it's proven. But should the superadmin be able to "force publish" or "reject" a tenant's draft?

7. **Tenant admin self-service registration?** Or does superadmin create all tenant admins manually? Manual at v1, self-service invite link at v2.

---

## 10. Summary

| Dimension | Today | After Platform |
|-----------|-------|----------------|
| **Tenants** | 1 (Kolte & Patil, hardcoded) | Unlimited (config-driven) |
| **Onboarding time** | 2–4 weeks dev | 1–2 hours config |
| **New field addition** | Code change + migration + deploy | INSERT into TenantField |
| **API contract** | Hand-written | Auto-generated |
| **Frontend per tenant** | Separate repo/branch | Dynamic from same codebase |
| **Schema changes** | Require dev + deploy | Superadmin self-service |
| **Codebase count** | 1 portal + 1 backend | 1 platform |

The concept is sound and the business value is clear. The main risks are in execution: the dynamic form engine is the hardest part, and the JSONB query ergonomics will surface in unexpected ways once real tenants have real data. A phased build with Kolte & Patil as the first tenant validates the platform without betting on untested assumptions.
