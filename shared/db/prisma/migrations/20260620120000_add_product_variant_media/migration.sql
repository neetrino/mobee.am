-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "media" JSONB[] DEFAULT ARRAY[]::JSONB[];
