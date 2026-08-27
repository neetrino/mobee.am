import { db } from "@white-shop/db";
import { normalizeProductWarrantyYears } from "@/lib/constants/product-warranty";
import {
  processImageUrl,
  smartSplitUrls,
  cleanImageUrls,
  separateMainAndVariantImages,
} from "../../utils/image-utils";
import { logger } from "../../utils/logger";
import type { ProductWithFullRelations, ProductVariantWithOptions } from "./types";
import { hasDisplayPrice } from "../../products/variant-price-display";
import { pickCategoryTranslation } from "../../pickCategoryTranslation";
import { localizeCategoryTitle } from "../../category-title-i18n";
import { pickProductTranslation } from "../../products/pickProductTranslation";
import type { LanguageCode } from "../../language";

function normalizeAttributeValueColors(colors: unknown): string[] | null {
  if (Array.isArray(colors)) {
    const parsed = colors.filter((item): item is string => typeof item === "string" && item.length > 0);
    return parsed.length > 0 ? parsed : null;
  }
  if (typeof colors === "string" && colors.trim()) {
    return [colors.trim()];
  }
  return null;
}

type VariantOptionResponse = {
  attribute: string;
  value: string;
  key: string;
  valueId?: string;
  attributeId?: string;
  imageUrl?: string | null;
  colors?: string[] | null;
};

const VARIANT_JSON_ATTRIBUTE_KEYS = [
  ["color", "color"],
  ["colour", "color"],
  ["storage", "storage"],
  ["memory", "storage"],
  ["size", "size"],
  ["ram", "ram"],
  ["gb_ram", "ram"],
  ["connectivity", "connectivity"],
  ["sim", "sim"],
] as const;

function readVariantAttributeString(
  attributes: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = attributes[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function buildOptionsFromVariantAttributes(attributes: unknown): VariantOptionResponse[] {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
    return [];
  }

  const record = attributes as Record<string, unknown>;
  const options: VariantOptionResponse[] = [];

  for (const [sourceKey, targetKey] of VARIANT_JSON_ATTRIBUTE_KEYS) {
    const value = readVariantAttributeString(record, [sourceKey]);
    if (!value) continue;
    if (options.some((option) => option.key === targetKey)) continue;
    options.push({
      attribute: targetKey,
      value,
      key: targetKey,
    });
  }

  return options;
}

function mapVariantOptions(
  variant: ProductVariantWithOptions,
): VariantOptionResponse[] {
  if (Array.isArray(variant.options) && variant.options.length > 0) {
    const mapped = variant.options
      .map((opt: ProductVariantWithOptions["options"][number]) => {
        if (opt.attributeValue) {
          const attrValue = opt.attributeValue;
          const attr = attrValue.attribute;
          return {
            attribute: attr?.key || "",
            value: attrValue.value || "",
            key: attr?.key || "",
            valueId: attrValue.id,
            attributeId: attr?.id,
            imageUrl: attrValue.imageUrl || null,
            colors: normalizeAttributeValueColors(attrValue.colors),
          };
        }

        return {
          attribute: opt.attributeKey || "",
          value: opt.value || "",
          key: opt.attributeKey || "",
        };
      })
      .filter((option) => option.key && option.value);

    if (mapped.length > 0) {
      return mapped;
    }
  }

  return buildOptionsFromVariantAttributes(
    (variant as { attributes?: unknown }).attributes,
  );
}

/**
 * Get discount settings from database
 */
async function getDiscountSettings() {
  const discountSettings = await db.settings.findMany({
    where: {
      key: {
        in: ["globalDiscount", "categoryDiscounts", "brandDiscounts"],
      },
    },
  });

  const globalDiscountSetting = discountSettings.find((s: { key: string; value: unknown }) => s.key === "globalDiscount");
  const globalDiscount = Number(globalDiscountSetting?.value) || 0;
  
  const categoryDiscountsSetting = discountSettings.find((s: { key: string; value: unknown }) => s.key === "categoryDiscounts");
  const categoryDiscounts = categoryDiscountsSetting ? (categoryDiscountsSetting.value as Record<string, number>) || {} : {};
  
  const brandDiscountsSetting = discountSettings.find((s: { key: string; value: unknown }) => s.key === "brandDiscounts");
  const brandDiscounts = brandDiscountsSetting ? (brandDiscountsSetting.value as Record<string, number>) || {} : {};

  return { globalDiscount, categoryDiscounts, brandDiscounts };
}

/**
 * Calculate actual discount with priority: productDiscount > categoryDiscount > brandDiscount > globalDiscount
 */
function calculateActualDiscount(
  productDiscount: number,
  primaryCategoryId: string | null,
  brandId: string | null,
  categoryDiscounts: Record<string, number>,
  brandDiscounts: Record<string, number>,
  globalDiscount: number
): number {
  if (productDiscount > 0) {
    return productDiscount;
  }

  // Check category discounts
  if (primaryCategoryId && categoryDiscounts[primaryCategoryId]) {
    return categoryDiscounts[primaryCategoryId];
  }

  // Check brand discounts
  if (brandId && brandDiscounts[brandId]) {
    return brandDiscounts[brandId];
  }

  if (globalDiscount > 0) {
    return globalDiscount;
  }

  return 0;
}

/**
 * Transform variant media array to response format
 */
function transformVariantMedia(variant: ProductVariantWithOptions): Array<{ url: string; alt?: string }> {
  const rawMedia = (variant as { media?: unknown[] }).media;
  if (!Array.isArray(rawMedia) || rawMedia.length === 0) {
    return [];
  }

  const result: Array<{ url: string; alt?: string }> = [];
  for (const item of rawMedia) {
    if (typeof item === "string") {
      const processed = processImageUrl(item);
      if (processed) result.push({ url: processed });
      continue;
    }
    if (item && typeof item === "object" && "url" in item) {
      const url = processImageUrl(item as { url?: string });
      if (url) {
        result.push({
          url,
          alt: typeof (item as { alt?: string }).alt === "string"
            ? (item as { alt?: string }).alt
            : undefined,
        });
      }
    }
  }
  return result;
}

/**
 * Transform product media (separate main from variant images)
 */
function transformMedia(
  product: ProductWithFullRelations
): string[] {
  if (!Array.isArray(product.media)) {
    logger.warn('Product media is not an array, returning empty array');
    return [];
  }

  const variantsHaveOwnMedia = Array.isArray(product.variants) &&
    product.variants.some((variant) => {
      const media = (variant as { media?: unknown[] }).media;
      return Array.isArray(media) && media.length > 0;
    });

  const mediaAsStrings = product.media.map((item: unknown) => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object' && 'url' in item) return item as { url?: string };
    if (item && typeof item === 'object' && 'src' in item) return item as { src?: string };
    if (item && typeof item === 'object' && 'value' in item) return item as { value?: string };
    return String(item);
  });

  if (variantsHaveOwnMedia) {
    return cleanImageUrls(
      mediaAsStrings
        .map((item) => processImageUrl(item))
        .filter((url): url is string => url !== null)
    );
  }
  
  // Collect all variant images for separation (legacy products)
  const variantImages: string[] = [];
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    product.variants.forEach((variant: ProductVariantWithOptions) => {
      if (variant.imageUrl) {
        const urls = smartSplitUrls(variant.imageUrl);
        variantImages.push(...urls);
      }
    });
  }
  
  const { main } = separateMainAndVariantImages(mediaAsStrings, variantImages);
  const cleanedMain = cleanImageUrls(main);
  
  logger.debug('Main media images count (after cleanup)', { count: cleanedMain.length });
  logger.debug('Variant images excluded', { count: variantImages.length });
  if (cleanedMain.length > 0) {
    logger.debug('Main media (first 3)', { images: cleanedMain.slice(0, 3).map((img: string) => img.substring(0, 50)) });
  }
  
  return cleanedMain;
}

/**
 * Map product labels from persistence (no synthetic out-of-stock badge).
 */
function transformLabels(product: ProductWithFullRelations): Array<{
  id: string;
  type: string;
  value: string;
  position: string;
  color: string | null;
}> {
  return Array.isArray(product.labels)
    ? product.labels.map((label: { id: string; type: string; value: string; position: string; color: string | null }) => ({
        id: label.id,
        type: label.type,
        value: label.value,
        position: label.position,
        color: label.color,
      }))
    : [];
}

/**
 * Transform variant image URL
 */
function transformVariantImageUrl(variant: ProductVariantWithOptions): string | null {
  if (!variant.imageUrl) {
    return null;
  }

  // Use smartSplitUrls to handle comma-separated URLs
  const urls = smartSplitUrls(variant.imageUrl);
  // Process and validate each URL
  const processedUrls = urls.map(url => processImageUrl(url)).filter((url): url is string => url !== null);
  // Use first valid URL, or join if multiple (comma-separated)
  return processedUrls.length > 0 ? processedUrls.join(',') : null;
}

/**
 * Transform product variants
 */
function transformVariants(
  variants: ProductVariantWithOptions[],
  actualDiscount: number,
  globalDiscount: number,
  productDiscount: number,
) {
  return variants
    .sort((a: ProductVariantWithOptions, b: ProductVariantWithOptions) => {
      const aPriced = hasDisplayPrice(a) ? a.price : Number.POSITIVE_INFINITY;
      const bPriced = hasDisplayPrice(b) ? b.price : Number.POSITIVE_INFINITY;
      return aPriced - bPriced;
    })
    .map((variant: ProductVariantWithOptions) => {
      const originalPrice = variant.price;
      const variantHasPrice = hasDisplayPrice(variant);
      let finalPrice = originalPrice;
      let discountPrice = null;

      if (variantHasPrice && actualDiscount > 0 && originalPrice > 0) {
        discountPrice = originalPrice;
        finalPrice = originalPrice * (1 - actualDiscount / 100);
      }

      const variantImageUrl = transformVariantImageUrl(variant);
      const variantMedia = transformVariantMedia(variant);
      
      if (variantImageUrl) {
        logger.debug('Variant has imageUrl', {
          variantId: variant.id,
          sku: variant.sku,
          imageUrl: variantImageUrl.substring(0, 50) + (variantImageUrl.length > 50 ? '...' : ''),
        });
      }

      return {
        id: variant.id,
        sku: variant.sku || "",
        price: variantHasPrice ? finalPrice : 0,
        priceOnRequest: Boolean(variant.priceOnRequest),
        hasPrice: variantHasPrice,
        originalPrice: variantHasPrice ? discountPrice || variant.compareAtPrice || null : null,
        compareAtPrice: variantHasPrice ? variant.compareAtPrice || null : null,
        globalDiscount: globalDiscount > 0 ? globalDiscount : null,
        productDiscount: productDiscount > 0 ? productDiscount : null,
        stock: variant.stock,
        imageUrl: variantImageUrl,
        media: variantMedia,
        options: mapVariantOptions(variant),
        available: variant.stock > 0,
      };
    });
}

/**
 * Transform productAttributes
 */
function transformProductAttributes(
  product: ProductWithFullRelations,
  lang: string
) {
  const productAttrs = (product as { productAttributes?: unknown[] }).productAttributes;
  logger.debug('Raw productAttributes from DB', {
    isArray: Array.isArray(productAttrs),
    length: productAttrs?.length || 0,
  });
  
  if (Array.isArray(productAttrs) && productAttrs.length > 0) {
    type ProductAttribute = {
      id: string;
      attribute: {
        id: string;
        key: string;
        translations?: Array<{ locale: string; name: string }>;
        values: Array<{
          id: string;
          value: string;
          translations?: Array<{ locale: string; label: string }>;
          imageUrl: string | null;
          colors: string | null;
        }>;
      };
    };
    
    const mapped = (productAttrs as ProductAttribute[]).map((pa) => {
      const attr = pa.attribute;
      const attrTranslation = attr.translations?.find((t: { locale: string }) => t.locale === lang) || attr.translations?.[0];
      
      return {
        id: pa.id,
        attribute: {
          id: attr.id,
          key: attr.key,
          name: attrTranslation?.name || attr.key,
          values: Array.isArray(attr.values) ? attr.values.map((val: {
            id: string;
            value: string;
            translations?: Array<{ locale: string; label: string }>;
            imageUrl: string | null;
            colors: string | null;
          }) => {
            const valTranslation = val.translations?.find((t: { locale: string }) => t.locale === lang) || val.translations?.[0];
            return {
              id: val.id,
              value: val.value,
              label: valTranslation?.label || val.value,
              imageUrl: val.imageUrl || null,
              colors: normalizeAttributeValueColors(val.colors),
            };
          }) : [],
        },
      };
    });
    logger.debug('Mapped productAttributes', { count: mapped.length });
    return mapped;
  }
  logger.debug('No productAttributes, returning empty array');
  return [];
}

/**
 * Transform product data to response format
 */
export async function transformProduct(
  product: ProductWithFullRelations,
  lang: string = "en"
) {
  // Get translations
  const translations = Array.isArray(product.translations) ? product.translations : [];
  const translation = pickProductTranslation(translations, lang);
  const hyTranslation = translations.find((t: { locale: string }) => t.locale === 'hy') || null;
  
  // Get brand translation
  const brandTranslations = product.brand && Array.isArray(product.brand.translations)
    ? product.brand.translations
    : [];
  const brandTranslation = brandTranslations.length > 0
    ? brandTranslations.find((t: { locale: string }) => t.locale === lang) || brandTranslations[0]
    : null;

  // Get discount settings
  const { globalDiscount, categoryDiscounts, brandDiscounts } = await getDiscountSettings();
  
  const productDiscount = product.discountPercent || 0;
  
  // Calculate actual discount
  const actualDiscount = calculateActualDiscount(
    productDiscount,
    product.primaryCategoryId,
    product.brandId,
    categoryDiscounts,
    brandDiscounts,
    globalDiscount
  );

  // Transform categories
  const categories = Array.isArray(product.categories) ? product.categories.map((cat: { id: string; translations?: Array<{ locale: string; slug: string; title: string }> }) => {
    const catTranslations = Array.isArray(cat.translations) ? cat.translations : [];
    const catTranslation = pickCategoryTranslation(catTranslations, lang) ?? null;
    const hyTitle =
      catTranslations.find((entry) => entry.locale === "hy")?.title ||
      catTranslations[0]?.title ||
      "";
    const sourceTitle = catTranslation?.title || hyTitle;
    return {
      id: cat.id,
      slug: catTranslation?.slug || "",
      title: localizeCategoryTitle(sourceTitle, lang as LanguageCode),
    };
  }) : [];

  const listingCardImage: string | null = (() => {
    if (!Array.isArray(product.media) || product.media.length === 0) {
      return null;
    }
    const firstImage = processImageUrl(
      product.media[0] as
        | string
        | null
        | undefined
        | { url?: string; src?: string; value?: string },
    );
    return firstImage || null;
  })();

  return {
    id: product.id,
    slug: translation?.slug || "",
    title: translation?.title || "",
    subtitle: translation?.subtitle || null,
    description: translation?.descriptionHtml || null,
    sourceDescription: hyTranslation?.descriptionHtml || null,
    primaryCategoryId: product.primaryCategoryId ?? null,
    categoryIds: Array.isArray(product.categoryIds) ? [...product.categoryIds] : [],
    /** Same as product list/card: first gallery URL from raw `media[0]` (before variant separation). */
    image: listingCardImage,
    brand: product.brand
      ? {
          id: product.brand.id,
          slug: product.brand.slug,
          name: brandTranslation?.name || "",
          logo: product.brand.logoUrl,
        }
      : null,
    categories,
    media: transformMedia(product),
    labels: transformLabels(product),
    warrantyYears: normalizeProductWarrantyYears(product.warrantyYears),
    variants: Array.isArray(product.variants) ? transformVariants(
      product.variants,
      actualDiscount,
      globalDiscount,
      productDiscount,
    ) : [],
    globalDiscount: globalDiscount > 0 ? globalDiscount : null,
    productDiscount: productDiscount > 0 ? productDiscount : null,
    seo: {
      title: translation?.seoTitle || translation?.title,
      description: translation?.seoDescription || null,
    },
    published: product.published,
    publishedAt: product.publishedAt,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    productAttributes: transformProductAttributes(product, lang),
  };
}

export type ProductPdpPayload = Awaited<ReturnType<typeof transformProduct>>;

