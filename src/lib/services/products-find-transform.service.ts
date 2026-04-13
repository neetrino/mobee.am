import { db } from "@white-shop/db";
import { processImageUrl } from "../utils/image-utils";
import { translations } from "../translations";
import { ProductWithRelations } from "./products-find-query.service";

/**
 * Get "Out of Stock" translation for a given language
 */
const getOutOfStockLabel = (lang: string = "en"): string => {
  const langKey = lang as keyof typeof translations;
  const translation = translations[langKey] || translations.en;
  return translation.stock.outOfStock;
};

class ProductsFindTransformService {
  /**
   * Transform products to response format
   */
  async transformProducts(
    products: ProductWithRelations[],
    lang: string = "en"
  ): Promise<any[]> {
    // Get discount settings
    const discountSettings = await db.settings.findMany({
      where: {
        key: {
          in: ["globalDiscount", "categoryDiscounts", "brandDiscounts"],
        },
      },
    });

    const globalDiscount =
      Number(
        discountSettings.find((s: { key: string; value: unknown }) => s.key === "globalDiscount")?.value
      ) || 0;
    
    const categoryDiscountsSetting = discountSettings.find((s: { key: string; value: unknown }) => s.key === "categoryDiscounts");
    const categoryDiscounts = categoryDiscountsSetting ? (categoryDiscountsSetting.value as Record<string, number>) || {} : {};
    
    const brandDiscountsSetting = discountSettings.find((s: { key: string; value: unknown }) => s.key === "brandDiscounts");
    const brandDiscounts = brandDiscountsSetting ? (brandDiscountsSetting.value as Record<string, number>) || {} : {};

    // Format response
    const data = products.map((product: ProductWithRelations) => {
      // Безопасное получение translation с проверкой на существование массива
      const translations = Array.isArray(product.translations) ? product.translations : [];
      const translation = translations.find((t: { locale: string }) => t.locale === lang) || translations[0] || null;
      
      // Безопасное получение brand translation
      const brandTranslations = product.brand && Array.isArray(product.brand.translations)
        ? product.brand.translations
        : [];
      const brandTranslation = brandTranslations.length > 0
        ? brandTranslations.find((t: { locale: string }) => t.locale === lang) || brandTranslations[0]
        : null;
      
      // Безопасное получение variant
      const variants = Array.isArray(product.variants) ? product.variants : [];
      const variant = variants.length > 0
        ? variants.sort((a: { price: number }, b: { price: number }) => a.price - b.price)[0]
        : null;

      // Get all unique colors from ALL variants with imageUrl and colors hex (support both new and old format)
      // IMPORTANT: Only collect colors that actually exist in variants
      // IMPORTANT: Process ALL variants to get ALL colors, not just the first variant
      const colorMap = new Map<string, { value: string; imageUrl?: string | null; colors?: string[] | null }>();
      
      
      // Process all variants to collect all unique colors
      variants.forEach((v) => {
        // First, try to get ALL color options from variant.options (not just the first one)
        const options = Array.isArray(v.options) ? v.options : [];
        const colorOptions = options.filter((opt: ProductWithRelations['variants'][number]['options'][number]) => {
          // Support both new format (AttributeValue) and old format (attributeKey/value)
          if ('attributeValue' in opt && opt.attributeValue) {
            return opt.attributeValue.attribute?.key === "color";
          }
          return opt.attributeKey === "color";
        });
        
        // Process all color options from this variant
        colorOptions.forEach((colorOption: ProductWithRelations['variants'][number]['options'][number]) => {
          let colorValue = "";
          let imageUrl: string | null | undefined = null;
          let colorsHex: string[] | null | undefined = null;
          
          if ('attributeValue' in colorOption && colorOption.attributeValue) {
            // New format: get from translation or value
            const translation = colorOption.attributeValue.translations?.find((t: { locale: string }) => t.locale === lang) || colorOption.attributeValue.translations?.[0];
            colorValue = translation?.label || colorOption.attributeValue.value || "";
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
            // Store color with imageUrl and colors hex if not already stored or if we have better data
            if (!colorMap.has(normalizedValue) || (imageUrl && !colorMap.get(normalizedValue)?.imageUrl)) {
              colorMap.set(normalizedValue, {
                value: colorValue.trim(),
                imageUrl: imageUrl || null,
                colors: colorsHex || null,
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

      const originalPrice = variant?.price || 0;
      let finalPrice = originalPrice;
      const productDiscount = product.discountPercent || 0;
      
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

      if (appliedDiscount > 0 && originalPrice > 0) {
        finalPrice = originalPrice * (1 - appliedDiscount / 100);
      }

      // Get categories with translations
      const categories = Array.isArray(product.categories) ? product.categories.map((cat: { id: string; translations?: Array<{ locale: string; slug: string; title: string }> }) => {
        const catTranslations = Array.isArray(cat.translations) ? cat.translations : [];
        const catTranslation = catTranslations.find((t: { locale: string }) => t.locale === lang) || catTranslations[0] || null;
        return {
          id: cat.id,
          slug: catTranslation?.slug || "",
          title: catTranslation?.title || "",
        };
      }) : [];

      return {
        id: product.id,
        slug: translation?.slug || "",
        title: translation?.title || "",
        defaultVariantId: variant?.id ?? null,
        brand: product.brand
          ? {
              id: product.brand.id,
              name: brandTranslation?.name || "",
            }
          : null,
        categories,
        price: finalPrice,
        originalPrice: appliedDiscount > 0 ? originalPrice : variant?.compareAtPrice || null,
        compareAtPrice: variant?.compareAtPrice || null,
        discountPercent: appliedDiscount > 0 ? appliedDiscount : null,
        image: (() => {
          // Use unified image utilities to get first valid main image
          if (!Array.isArray(product.media) || product.media.length === 0) {
            return null;
          }
          
          // Process first image - cast JsonValue to ImageUrlInput
          const firstImage = processImageUrl(product.media[0] as string | null | undefined | { url?: string; src?: string; value?: string });
          return firstImage || null;
        })(),
        inStock: (variant?.stock || 0) > 0,
        labels: (() => {
          // Map existing labels
          const existingLabels = Array.isArray(product.labels) ? product.labels.map((label: { id: string; type: string; value: string; position: string; color: string | null }) => ({
            id: label.id,
            type: label.type,
            value: label.value,
            position: label.position,
            color: label.color,
          })) : [];
          
          // Check if product is out of stock
          const isOutOfStock = (variant?.stock || 0) <= 0;
          
          // If out of stock, add "Out of Stock" label
          if (isOutOfStock) {
            // Check if "Out of Stock" label already exists
            const outOfStockText = getOutOfStockLabel(lang);
            const hasOutOfStockLabel = existingLabels.some(
              (label) => label.value.toLowerCase() === outOfStockText.toLowerCase() ||
                         label.value.toLowerCase().includes('out of stock') ||
                         label.value.toLowerCase().includes('արտադրված') ||
                         label.value.toLowerCase().includes('нет в наличии') ||
                         label.value.toLowerCase().includes('არ არის მარაგში')
            );
            
            if (!hasOutOfStockLabel) {
              // Check if top-left position is available, otherwise use top-right
              const topLeftOccupied = existingLabels.some((l) => l.position === 'top-left');
              const position = topLeftOccupied ? 'top-right' : 'top-left';
              
              existingLabels.push({
                id: `out-of-stock-${product.id}`,
                type: 'text',
                value: outOfStockText,
                position: position as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
                color: '#6B7280', // Gray color for out of stock
              });
              
            }
          }
          
          return existingLabels;
        })(),
        colors: availableColors, // Add available colors array
      };
    });

    return data;
  }
}

export const productsFindTransformService = new ProductsFindTransformService();
                                                    
