-- Remove TEXTAREA enum value
ALTER TYPE "FieldType" RENAME TO "FieldType_old";
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'NUMBER', 'SELECT', 'MULTISELECT', 'IMAGE', 'IMAGE_MULTI', 'FILE', 'CHECKBOX', 'LOCATION', 'PRICE', 'AREA', 'DATERANGE');
ALTER TABLE "TenantField" ALTER COLUMN "type" TYPE "FieldType" USING "type"::text::"FieldType";
DROP TYPE "FieldType_old";
