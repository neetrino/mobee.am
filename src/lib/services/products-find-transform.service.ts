import { db } from "@white-shop/db";
import { normalizeProductWarrantyYears } from "@/lib/constants/product-warranty";
import { cacheService } from "./cache.service";
import { ProductWithRelations } from "./products-find-query.service";
import {
  findListingDisplayVariant,
  resolveListingDisplayColor,
  resolveListingProductImage,
} from "./products-listing-display-variant";
import {
  hasDisplayPrice,
  pickListingPriceVariant,
} from "../products/variant-price-display";
import { pickCategoryTranslation } from "../pickCategoryTranslation";
import { localizeCategoryTitle } from "../category-title-i18n";
import { pickProductTranslation } from "../products/pickProductTranslation";
import type { LanguageCode } from "../language";

export type ProductListingTransformContext = {
  colors?: string;
  /** Compare tray: include description HTML for spec extraction. */
  includeDescriptions?: boolean;
};

const DISCOUNT_CONTEXT_CACHE_KEY = "product-list:discount-context";
const DISCOUNT_CONTEXT_TTL_SEC = 120;

export type ProductDiscountContext = {
  globalDiscount: number;
  categoryDiscounts: Record<string, number>;
  brandDiscounts: Record<string, number>;
};

/**
 * Load discount-related settings once per product list request (cached briefly to cut DB round-trips).
 */
export async function loadProductDiscountContext(): Promise<ProductDiscountContext> {
  try {
    const cached = await cacheService.get(DISCOUNT_CONTEXT_CACHE_KEY);
    if (cached !== null && cached !== undefined) {
      const raw = typeof cached === "string" ? cached : JSON.stringify(cached);
      return JSON.parse(raw) as ProductDiscountContext;
    }
  } catch {
    // continue to DB
  }

  const discountSettings = await db.settings.findMany({
    where: {
      key: {
        in: ["globalDiscount", "categoryDiscounts", "brandDiscounts"],
      },
    },
  });

  const globalDiscount =
    Number(
      discountSettings.find((s: { key: string; value: unknown }) => s.key === "globalDiscount")?.value,
    ) || 0;

  const categoryDiscountsSetting = discountSettings.find(
    (s: { key: string; value: unknown }) => s.key === "categoryDiscounts",
  );
  const categoryDiscounts = categoryDiscountsSetting
    ? ((categoryDiscountsSetting.value as Record<string, number>) || {})
    : {};

  const brandDiscountsSetting = discountSettings.find(
    (s: { key: string; value: unknown }) => s.key === "brandDiscounts",
  );
  const brandDiscounts = brandDiscountsSetting
    ? ((brandDiscountsSetting.value as Record<string, number>) || {})
    : {};

  const ctx: ProductDiscountContext = { globalDiscount, categoryDiscounts, brandDiscounts };

  try {
    await cacheService.setex(DISCOUNT_CONTEXT_CACHE_KEY, DISCOUNT_CONTEXT_TTL_SEC, JSON.stringify(ctx));
  } catch {
    // ignore cache write failures
  }

  return ctx;
};

class ProductsFindTransformService {
  /**
   * Transform products to response format
   */
  async transformProducts(
    products: ProductWithRelations[],
    lang: string = "en",
    discounts: ProductDiscountContext,
    listingContext?: ProductListingTransformContext,
  ): Promise<any[]> {
    const { globalDiscount, categoryDiscounts, brandDiscounts } = discounts;

    // Format response
    const data = products.map((product: ProductWithRelations) => {
      // Безопасное получение translation с проверкой на существование массива
      const translations = Array.isArray(product.translations) ? product.translations : [];
      const translation = pickProductTranslation(translations, lang);
      
      // Безопасное получение brand translation
      const brandTranslations = product.brand && Array.isArray(product.brand.translations)
        ? product.brand.translations
        : [];
      const brandTranslation = brandTranslations.length > 0
        ? brandTranslations.find((t: { locale: string }) => t.locale === lang) || brandTranslations[0]
        : null;
      
      const variants = Array.isArray(product.variants) ? product.variants : [];
      const displayVariant = findListingDisplayVariant(
        variants,
        listingContext?.colors,
        lang,
      );
      const variant = pickListingPriceVariant(variants, displayVariant);

      // Get all unique colors from ALL variants with imageUrl and colors hex (support both new and old format)
      // IMPORTANT: Only collect colors that actually exist in variants
      // IMPORTANT: Process ALL variants to get ALL colors, not just the first variant
      const colorMap = new Map<string, { value: string; linkValue: string; imageUrl?: string | null; colors?: string[] | null }>();
      
      
      // Process all variants to collect all unique colors
      variants.forEach((v) => {
        // First, try to get ALL color options from variant.options (not just the first one)
        const options = Array.isArray(v.options) ? v.options : [];
        const colorOptions = options.filter((opt: ProductWithRelations['variants'][number]['options'][number]) => {
          // Prefer attributeKey so listing still matches when AttributeValue.attribute is thin/omitted.
          const legacy = opt as { attributeKey?: string | null; key?: string; attribute?: string };
          if (
            legacy.attributeKey === "color" ||
            legacy.key === "color" ||
            legacy.attribute === "color"
          ) {
            return true;
          }
          if ("attributeValue" in opt && opt.attributeValue) {
            return opt.attributeValue.attribute?.key === "color";
          }
          return false;
        });
        
        // Process all color options from this variant
        colorOptions.forEach((colorOption: ProductWithRelations['variants'][number]['options'][number]) => {
          let colorValue = "";
          let imageUrl: string | null | undefined = null;
          let colorsHex: string[] | null | undefined = null;
          
          if ('attributeValue' in colorOption && colorOption.attributeValue) {
            // New format: get from translation or value
            const translation = colorOption.attributeValue.translations?.find((t: { locale: string }) => t.locale === lang) || colorOption.attributeValue.translations?.[0];
            colorValue = translation?.label || colorOption.attributeValue.value || colorOption.value || "";
            // Get imageUrl and colors from AttributeValue
            imageUrl = colorOption.attributeValue.imageUrl || null;
            const colorsValue = colorOption.attributeValue.colors;
            colorsHex = Array.isArray(colorsValue) && colorsValue.every((c): c is string => typeof c === 'string') ? colorsValue : null;
          } else {
            // Old format: use value directly
            colorValue = colorOption.value || "";
          }
          
          if (colorValue) {
            const normalizedValue = colorValue.trim().toLowerCase();
            const canonicalValue = (
              ('attributeValue' in colorOption && colorOption.attributeValue?.value) ||
              colorOption.value ||
              colorValue
            ).trim();
            const linkValue = canonicalValue.toLowerCase();
            const existing = colorMap.get(normalizedValue);
            const shouldReplace =
              !existing ||
              (Boolean(colorsHex?.length) && !existing.colors?.length) ||
              (Boolean(imageUrl) && !existing.imageUrl);
            if (shouldReplace) {
              colorMap.set(normalizedValue, {
                value: colorValue.trim(),
                linkValue,
                imageUrl: imageUrl || existing?.imageUrl || null,
                colors: colorsHex || existing?.colors || null,
              });
            }
          }
        });
        
        // Fallback: check variant.attributes JSONB column if options don't have color
        // This handles cases where colors are stored in JSONB but not in options
        if (colorOptions.length === 0 && v.attributes && typeof v.attributes === 'object' && !Array.isArray(v.attributes) && 'color' in v.attributes) {
          const colorAttr = (v.attributes as { color?: unknown }).color;
          const colorAttributes = Array.isArray(colorAttr) ? colorAttr : colorAttr ? [colorAttr] : [];
          colorAttributes.forEach((colorAttrItem: unknown) => {
            const colorValue = (colorAttrItem && typeof colorAttrItem === 'object' && 'value' in colorAttrItem) 
              ? (colorAttrItem as { value?: unknown }).value 
              : colorAttrItem;
            if (colorValue && typeof colorValue === 'string') {
              const normalizedValue = colorValue.trim().toLowerCase();
              // Only add if not already in colorMap
              if (!colorMap.has(normalizedValue)) {
                colorMap.set(normalizedValue, {
                  value: colorValue.trim(),
                  linkValue: colorValue.trim().toLowerCase(),
                  imageUrl: null,
                  colors: null,
                });
              }
            }
          });
        }
      });
      
      
      // Also check productAttributes for color attribute values with imageUrl and colors
      // IMPORTANT: Only update colors that already exist in variants (already in colorMap)
      // Do not add new colors that don't exist in variants
      const productAttrs = product && 'productAttributes' in product && Array.isArray(product.productAttributes) ? product.productAttributes : [];
      if (productAttrs.length > 0) {
        productAttrs.forEach((productAttr: any) => {
          const attr = productAttr?.attribute;
          if (attr && typeof attr === 'object' && 'key' in attr && attr.key === 'color' && 'values' in attr && Array.isArray(attr.values)) {
            attr.values.forEach((attrValue: { translations?: Array<{ locale: string; label?: string }>; value?: string; imageUrl?: string | null; colors?: string[] | null }) => {
              const translation = attrValue.translations?.find((t: { locale: string }) => t.locale === lang) || attrValue.translations?.[0];
              const colorValue = translation?.label || attrValue.value || "";
              if (colorValue) {
                const normalizedValue = colorValue.trim().toLowerCase();
                // Only update if color already exists in colorMap (i.e., exists in variants)
                // This ensures we only show colors that actually exist in product variants
                if (colorMap.has(normalizedValue)) {
                  const existing = colorMap.get(normalizedValue);
                  // Update with imageUrl and colors hex from productAttributes if available
                  if (attrValue.imageUrl || attrValue.colors) {
                    colorMap.set(normalizedValue, {
                      value: colorValue.trim(),
                      linkValue: existing?.linkValue ?? colorValue.trim().toLowerCase(),
                      imageUrl: attrValue.imageUrl || existing?.imageUrl || null,
                      colors: attrValue.colors || existing?.colors || null,
                    });
                  }
                }
              }
            });
          }
        });
      }
      
      const availableColors = Array.from(colorMap.values());
      const listingImage = resolveListingProductImage(
        product,
        displayVariant,
        listingContext?.colors,
        lang,
      );
      const displayColor = resolveListingDisplayColor(
        variants,
        displayVariant,
        listingImage,
        availableColors,
        variant,
        lang,
      );

      const originalPrice = variant?.price ?? 0;
      let finalPrice = originalPrice;
      const productDiscount = product.discountPercent || 0;
      const variantHasPrice = hasDisplayPrice(variant);
      
      // Calculate applied discount with priority: productDiscount > categoryDiscount > brandDiscount > globalDiscount
      let appliedDiscount = 0;
      if (productDiscount > 0) {
        appliedDiscount = productDiscount;
      } else {
        // Check category discounts
        const primaryCategoryId = product.primaryCategoryId;
        if (primaryCategoryId && categoryDiscounts[primaryCategoryId]) {
          appliedDiscount = categoryDiscounts[primaryCategoryId];
        } else {
          // Check brand discounts
          const brandId = product.brandId;
          if (brandId && brandDiscounts[brandId]) {
            appliedDiscount = brandDiscounts[brandId];
          } else if (globalDiscount > 0) {
            appliedDiscount = globalDiscount;
          }
        }
      }

      if (appliedDiscount > 0 && originalPrice > 0 && variantHasPrice) {
        finalPrice = originalPrice * (1 - appliedDiscount / 100);
      }

      // Get categories with translations; dictionary fills en/ru when DB still has Armenian copy.
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

      return {
        id: product.id,
        slug: translation?.slug || "",
        title: translation?.title || "",
        subtitle: translation?.subtitle || "",
        primaryCategoryId: product.primaryCategoryId ?? null,
        categoryIds: Array.isArray(product.categoryIds) ? [...product.categoryIds] : [],
        defaultVariantId: variant?.id ?? variants[0]?.id ?? null,
        brand: product.brand
          ? {
              id: product.brand.id,
              name: brandTranslation?.name || "",
            }
          : null,
        categories,
        price: variantHasPrice ? finalPrice : null,
        hasPrice: variantHasPrice,
        priceOnRequest: Boolean(variant?.priceOnRequest),
        originalPrice: variantHasPrice && appliedDiscount > 0 ? originalPrice : variantHasPrice ? variant?.compareAtPrice || null : null,
        compareAtPrice: variantHasPrice ? variant?.compareAtPrice || null : null,
        discountPercent: variantHasPrice && appliedDiscount > 0 ? appliedDiscount : null,
        warrantyYears: normalizeProductWarrantyYears(
          (product as { warrantyYears?: number | null }).warrantyYears,
        ),
        image: listingImage,
        inStock: variantHasPrice && (variant?.stock || 0) > 0,
        labels: Array.isArray(product.labels)
          ? product.labels.map((label: { id: string; type: string; value: string; position: string; color: string | null }) => ({
              id: label.id,
              type: label.type,
              value: label.value,
              position: label.position,
              color: label.color,
            }))
          : [],
        colors: availableColors,
        displayColor,
        ...(listingContext?.includeDescriptions
          ? {
              description: translation?.descriptionHtml || null,
              sourceDescription:
                translations.find((t: { locale: string }) => t.locale === 'hy')?.descriptionHtml ||
                translation?.descriptionHtml ||
                null,
            }
          : {}),
      };
    });

    return data;
  }
}

export const productsFindTransformService = new ProductsFindTransformService();
                                                    
