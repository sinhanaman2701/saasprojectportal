-- Canonical schema for the SaaS Portal Platform, extracted (via pg_dump)
-- from a database built with the old Prisma migration history and then
-- verified to have zero drift against schema.prisma. This single file
-- replaces the previous 4 Prisma-generated migrations.

CREATE TYPE "FieldType" AS ENUM (
    'TEXT', 'NUMBER', 'SELECT', 'MULTISELECT', 'IMAGE', 'IMAGE_MULTI',
    'FILE', 'CHECKBOX', 'LOCATION', 'PRICE', 'AREA', 'DATERANGE'
);

CREATE TYPE "ProjectStatus" AS ENUM ('LATEST', 'ONGOING', 'COMPLETED');

CREATE TYPE "TenantStatus" AS ENUM ('PENDING', 'LIVE', 'SUSPENDED');

-- ─── Platform tables ────────────────────────────────────────────────────────

CREATE TABLE "Superadmin" (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Tenant" (
    id SERIAL PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    "logoUrl" TEXT,
    "accessToken" TEXT UNIQUE,
    status "TenantStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "TenantField" (
    id SERIAL PRIMARY KEY,
    "tenantId" INTEGER NOT NULL REFERENCES "Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE,
    key TEXT NOT NULL,
    label TEXT NOT NULL,
    type "FieldType" NOT NULL,
    section TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    required BOOLEAN NOT NULL DEFAULT false,
    placeholder TEXT,
    options JSONB,
    validation JSONB,
    "showInList" BOOLEAN NOT NULL DEFAULT true,
    "maxLength" INTEGER,
    "imageWidth" INTEGER,
    "imageHeight" INTEGER,
    "allowCaption" BOOLEAN NOT NULL DEFAULT false,
    UNIQUE ("tenantId", key)
);
CREATE INDEX "TenantField_tenantId_idx" ON "TenantField" ("tenantId");

CREATE TABLE "TenantAdmin" (
    id SERIAL PRIMARY KEY,
    "tenantId" INTEGER NOT NULL REFERENCES "Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE,
    email TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    name TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    UNIQUE ("tenantId", email)
);
CREATE INDEX "TenantAdmin_tenantId_idx" ON "TenantAdmin" ("tenantId");

CREATE TABLE "TenantProject" (
    id SERIAL PRIMARY KEY,
    "tenantId" INTEGER NOT NULL REFERENCES "Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE,
    status "ProjectStatus" NOT NULL DEFAULT 'ONGOING',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    data JSONB NOT NULL DEFAULT '{}',
    attachments JSONB DEFAULT '{}',
    "createdBy" INTEGER REFERENCES "TenantAdmin"(id) ON UPDATE CASCADE ON DELETE SET NULL,
    "updatedBy" INTEGER REFERENCES "TenantAdmin"(id) ON UPDATE CASCADE ON DELETE SET NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "TenantProject_tenantId_idx" ON "TenantProject" ("tenantId");
CREATE INDEX "TenantProject_tenantId_isArchived_idx" ON "TenantProject" ("tenantId", "isArchived");
CREATE INDEX "TenantProject_tenantId_isDraft_idx" ON "TenantProject" ("tenantId", "isDraft");

-- ─── Legacy single-tenant tables (Kolte & Patil backward-compat) ───────────

CREATE TABLE "Admin" (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Project" (
    id SERIAL PRIMARY KEY,
    "projectName" TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    bedrooms INTEGER NOT NULL,
    bathrooms INTEGER,
    price TEXT,
    furnishing TEXT NOT NULL,
    area TEXT NOT NULL,
    project_brochure TEXT,
    "bannerImages" TEXT,
    "locationIframe" TEXT,
    "projectStatus" "ProjectStatus" NOT NULL DEFAULT 'ONGOING',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "Project_isArchived_idx" ON "Project" ("isArchived");
CREATE INDEX "Project_location_idx" ON "Project" (location);
CREATE INDEX "Project_createdAt_idx" ON "Project" ("createdAt");

CREATE TABLE "CommunityAmenity" (
    id SERIAL PRIMARY KEY,
    "projectId" INTEGER NOT NULL REFERENCES "Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    name TEXT NOT NULL,
    "imageUrl" TEXT
);

CREATE TABLE "PropertyAmenity" (
    id SERIAL PRIMARY KEY,
    "projectId" INTEGER NOT NULL REFERENCES "Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    name TEXT NOT NULL,
    "iconUrl" TEXT
);

CREATE TABLE "NearbyPlace" (
    id SERIAL PRIMARY KEY,
    "projectId" INTEGER NOT NULL REFERENCES "Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    category TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "iconUrl" TEXT
);
