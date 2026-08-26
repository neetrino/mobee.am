import { processImageUrl } from "@/lib/utils/image-utils";
import { productHasMarcoListingImage } from "@/lib/products/marco-product-image";
import { hasDisplayPrice, pickListingPriceVariant } from "@/lib/products/variant-price-display";
import { computeEffectiveVariantPrice, resolveAppliedDiscountPercent } from "@/lib/services/products-effective-price";
import type { ProductDiscountContext } from "@/lib/services/products-find-transform.service";
import { normalizeProductWarrantyYears } from "@/lib/constants/product-warranty";
import type { CatalogOptionLike } from "@/lib/catalog/variant-option-where";
import {
  collectCategorySlugsForLocale,
  expandCategoryIdsWithAncestors,
  type CategoryAncestry,
} from "@/lib/read-model/product-listing-row-category";
import {
  buildListingSearchText,
  collectListingColorFacets,
  collectListingComboTokens,
  collectListingColorTokens,
  collectListingSizeTokens,
} from "@/lib/read-model/product-listing-row-tokens";

export type { CategoryAncestry };

export type ListingRowVariantInput = {
  id: string;
  price: number;
  priceOnRequest?: boolean | null;
  compareAtPrice?: number | null;
  stock?: number | null;
  imageUrl?: string | null;
  media?: unknown;
  sku?: string | null;
  published?: boolean | null;
  options?: CatalogOptionLike[] | null;
};

export type ListingRowProductInput = {
  id: string;
  brandId?: string | null;
  primaryCategoryId?: string | null;
  categoryIds?: string[] | null;
  media?: unknown;
  featured?: boolean | null;
  discountPercent?: number | null;
  warrantyYears?: number | null;
  published?: boolean | null;
  publishedAt?: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  translations?: Array<{
    locale: string;
    title?: string | null;
    slug?: string | null;
    subtitle?: string | null;
  }> | null;
  brand?: {
    id: string;
    slug?: string | null;
    translations?: Array<{ locale: string; name?: string | null }> | null;
  } | null;
  variants?: ListingRowVariantInput[] | null;
  labels?: Array<{
    id: string;
    type: string;
    value: string;
    position: string;
    color?: string | null;
  }> | null;
};

export type ProductListingRowWrite = {
  productId: string;
  locale: string;
  slug: string;
  title: string;
  subtitle: string | null;
  brandId: string | null;
  brandSlug: string | null;
  brandName: string | null;
  primaryCategoryId: string | null;
  categoryIds: string[];
  categorySlugs: string[];
  price: number;
  compareAtPrice: number | null;
  originalPrice: number | null;
  priceSort: number;
  hasPrice: boolean;
  priceOnRequest: boolean;
  discountPercent: number;
  featured: boolean;
  hasMarcoListingImage: boolean;
  defaultVariantId: string | null;
  stock: number;
  inStock: boolean;
  image: string | null;
  labels: ListingRowProductInput["labels"];
  colors: ReturnType<typeof collectListingColorFacets>;
  colorTokens: string[];
  sizeTokens: string[];
  variantComboTokens: string[];
  searchText: string;
  warrantyYears: number | null;
  publishedAt: Date | null;
  productCreatedAt: Date;
  productUpdatedAt: Date;
  isPublished: boolean;
  deletedAt: Date | null;
  rebuiltAt: Date;
};

function firstMediaUrl(media: unknown): string | null {
  if (!Array.isArray(media) || media.length === 0) return null;
  const first = media[0];
  if (typeof first === "string" && first.trim()) return first.trim();
  if (first && typeof first === "object") {
    const record = first as { url?: unknown; src?: unknown; value?: unknown };
    for (const key of ["url", "src", "value"] as const) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return null;
}

function listingPrice(
  variants: ListingRowVariantInput[],
  discountPercent: number,
): number | null {
  let min: number | null = null;
  for (const variant of variants) {
    if (!hasDisplayPrice(variant)) continue;
    const effective = computeEffectiveVariantPrice(variant.price, discountPercent);
    if (!Number.isFinite(effective)) continue;
    if (min === null || effective < min) min = effective;
  }
  return min;
}

function resolveTranslation<T extends { locale: string }>(
  rows: T[] | null | undefined,
  locale: string,
): T | null {
  const list = Array.isArray(rows) ? rows : [];
  return list.find((row) => row.locale === locale) ?? list[0] ?? null;
}

function buildRowForLocale(
  product: ListingRowProductInput,
  locale: string,
  discounts: ProductDiscountContext,
  ancestry: CategoryAncestry,
  rebuiltAt: Date,
): ProductListingRowWrite | null {
  const translation = resolveTranslation(product.translations, locale);
  const slug = translation?.slug?.trim();
  if (!slug) return null;

  const publishedVariants = (product.variants ?? []).filter(
    (variant) => variant.published !== false,
  );
  const discountPercent = resolveAppliedDiscountPercent(product, discounts);
  const priceVariant = pickListingPriceVariant(publishedVariants);
  const minPrice = listingPrice(publishedVariants, discountPercent);
  const hasPrice = minPrice !== null;
  const original = hasPrice && discountPercent > 0 ? (priceVariant?.price ?? minPrice) : null;
  const allOptions = publishedVariants.flatMap((variant) => variant.options ?? []);
  const ownCategoryIds = [
    ...new Set(
      [product.primaryCategoryId, ...(product.categoryIds ?? [])].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  ];
  const categoryIds = expandCategoryIdsWithAncestors(ownCategoryIds, ancestry.parentById);
  const brandTranslation = resolveTranslation(product.brand?.translations, locale);
  const image =
    processImageUrl(priceVariant?.imageUrl ?? null) ||
    processImageUrl(firstMediaUrl(product.media));
  const skuParts = publishedVariants.map((variant) => variant.sku);

  return {
    productId: product.id,
    locale,
    slug,
    title: translation?.title?.trim() || slug,
    subtitle: translation?.subtitle?.trim() || null,
    brandId: product.brand?.id ?? product.brandId ?? null,
    brandSlug: product.brand?.slug ?? null,
    brandName: brandTranslation?.name?.trim() || null,
    primaryCategoryId: product.primaryCategoryId ?? null,
    categoryIds,
    categorySlugs: collectCategorySlugsForLocale(categoryIds, locale, ancestry.slugByIdLocale),
    price: minPrice ?? 0,
    compareAtPrice: priceVariant?.compareAtPrice ?? null,
    originalPrice: original,
    priceSort: minPrice ?? 0,
    hasPrice,
    priceOnRequest: Boolean(priceVariant?.priceOnRequest) && !hasPrice,
    discountPercent: hasPrice && discountPercent > 0 ? discountPercent : 0,
    featured: Boolean(product.featured),
    hasMarcoListingImage: productHasMarcoListingImage(product),
    defaultVariantId: priceVariant?.id ?? publishedVariants[0]?.id ?? null,
    stock: priceVariant?.stock ?? 0,
    inStock: hasPrice && (priceVariant?.stock ?? 0) > 0,
    image,
    labels: product.labels ?? [],
    colors: collectListingColorFacets(allOptions, locale),
    colorTokens: collectListingColorTokens(allOptions, locale),
    sizeTokens: collectListingSizeTokens(allOptions, locale),
    variantComboTokens: collectListingComboTokens(publishedVariants, locale),
    searchText: buildListingSearchText([
      translation?.title,
      translation?.subtitle,
      slug,
      product.brand?.slug,
      brandTranslation?.name,
      ...skuParts,
      ...collectCategorySlugsForLocale(categoryIds, locale, ancestry.slugByIdLocale),
    ]),
    warrantyYears: normalizeProductWarrantyYears(product.warrantyYears) ?? null,
    publishedAt: product.publishedAt ?? null,
    productCreatedAt: product.createdAt,
    productUpdatedAt: product.updatedAt,
    isPublished: product.published !== false && !product.deletedAt,
    deletedAt: product.deletedAt ?? null,
    rebuiltAt,
  };
}

export function buildProductListingRowsForLocales(
  product: ListingRowProductInput,
  locales: readonly string[],
  discounts: ProductDiscountContext,
  ancestry: CategoryAncestry,
): ProductListingRowWrite[] {
  const rebuiltAt = new Date();
  return locales
    .map((locale) => buildRowForLocale(product, locale, discounts, ancestry, rebuiltAt))
    .filter((row): row is ProductListingRowWrite => row !== null);
}
