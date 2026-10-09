-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN "isMain" BOOLEAN NOT NULL DEFAULT false;

-- At most one main variant per product
CREATE UNIQUE INDEX "product_variants_productId_main_key" ON "product_variants"("productId") WHERE "isMain" = true;
