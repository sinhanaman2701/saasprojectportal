-- DropForeignKey
ALTER TABLE "TenantAdmin" DROP CONSTRAINT "TenantAdmin_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TenantField" DROP CONSTRAINT "TenantField_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TenantProject" DROP CONSTRAINT "TenantProject_tenantId_fkey";

-- DropIndex
DROP INDEX "TenantAdmin_email_key";

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "accessToken" TEXT;

-- AlterTable
ALTER TABLE "TenantField" ADD COLUMN     "allowCaption" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "imageHeight" INTEGER,
ADD COLUMN     "imageWidth" INTEGER;

-- AlterTable
ALTER TABLE "TenantProject" DROP COLUMN "clickCount";

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_accessToken_key" ON "Tenant"("accessToken");

-- CreateIndex
CREATE INDEX "TenantAdmin_tenantId_idx" ON "TenantAdmin"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantAdmin_tenantId_email_key" ON "TenantAdmin"("tenantId", "email");

-- CreateIndex
CREATE INDEX "TenantField_tenantId_idx" ON "TenantField"("tenantId");

-- AddForeignKey
ALTER TABLE "TenantField" ADD CONSTRAINT "TenantField_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantAdmin" ADD CONSTRAINT "TenantAdmin_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantProject" ADD CONSTRAINT "TenantProject_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantProject" ADD CONSTRAINT "TenantProject_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "TenantAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantProject" ADD CONSTRAINT "TenantProject_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "TenantAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

