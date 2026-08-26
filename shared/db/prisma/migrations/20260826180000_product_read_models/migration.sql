-- Storefront read models: one listing row and one PDP payload per product×locale.
-- GIN indexes match PLP filters (category / color / size tokens). B-tree indexes match
-- default sort (Marco demotion + createdAt) and price sort.

CREATE TABLE "product_listing_rows" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "brandId" TEXT,
    "brandSlug" TEXT,
    "brandName" TEXT,
    "primaryCategoryId" TEXT,
    "categoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categorySlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "compareAtPrice" DOUBLE PRECISION,
    "originalPrice" DOUBLE PRECISION,
    "priceSort" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hasPrice" BOOLEAN NOT NULL DEFAULT false,
    "priceOnRequest" BOOLEAN NOT NULL DEFAULT false,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "hasMarcoListingImage" BOOLEAN NOT NULL DEFAULT false,
    "defaultVariantId" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "inStock" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "labels" JSONB NOT NULL DEFAULT '[]',
    "colors" JSONB NOT NULL DEFAULT '[]',
    "colorTokens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sizeTokens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "variantComboTokens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "searchText" TEXT NOT NULL DEFAULT '',
    "warrantyYears" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "productCreatedAt" TIMESTAMP(3) NOT NULL,
    "productUpdatedAt" TIMESTAMP(3) NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "rebuiltAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_listing_rows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_listing_rows_productId_locale_key" ON "product_listing_rows"("productId", "locale");
CREATE UNIQUE INDEX "product_listing_rows_locale_slug_key" ON "product_listing_rows"("locale", "slug");
CREATE INDEX "product_listing_rows_locale_isPublished_deletedAt_hasMarcoListingImage_productCreatedAt_idx"
  ON "product_listing_rows"("locale", "isPublished", "deletedAt", "hasMarcoListingImage", "productCreatedAt" DESC);
CREATE INDEX "product_listing_rows_locale_brandId_idx" ON "product_listing_rows"("locale", "brandId");
CREATE INDEX "product_listing_rows_locale_brandSlug_idx" ON "product_listing_rows"("locale", "brandSlug");
CREATE INDEX "product_listing_rows_locale_featured_productCreatedAt_idx"
  ON "product_listing_rows"("locale", "featured", "productCreatedAt" DESC);
CREATE INDEX "product_listing_rows_locale_hasPrice_priceSort_idx"
  ON "product_listing_rows"("locale", "hasPrice", "priceSort");
CREATE INDEX "product_listing_rows_categoryIds_idx" ON "product_listing_rows" USING GIN ("categoryIds");
CREATE INDEX "product_listing_rows_categorySlugs_idx" ON "product_listing_rows" USING GIN ("categorySlugs");
CREATE INDEX "product_listing_rows_colorTokens_idx" ON "product_listing_rows" USING GIN ("colorTokens");
CREATE INDEX "product_listing_rows_sizeTokens_idx" ON "product_listing_rows" USING GIN ("sizeTokens");
CREATE INDEX "product_listing_rows_variantComboTokens_idx" ON "product_listing_rows" USING GIN ("variantComboTokens");

CREATE TABLE "product_pdp_rows" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "slugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "payload" JSONB NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "productUpdatedAt" TIMESTAMP(3) NOT NULL,
    "rebuiltAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pdp_rows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_pdp_rows_productId_locale_key" ON "product_pdp_rows"("productId", "locale");
CREATE INDEX "product_pdp_rows_locale_slug_idx" ON "product_pdp_rows"("locale", "slug");
CREATE INDEX "product_pdp_rows_slugs_idx" ON "product_pdp_rows" USING GIN ("slugs");
