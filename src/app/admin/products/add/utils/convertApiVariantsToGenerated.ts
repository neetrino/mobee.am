import { convertPrice, type CurrencyCode } from "@/lib/currency";
import type { Attribute, GeneratedVariant } from "../types";

export interface ApiProductVariant {
  id?: string;
  price?: number | string | null;
  compareAtPrice?: number | string | null;
  stock?: number | string | null;
  sku?: string | null;
  imageUrl?: string | null;
  published?: boolean;
  attributes?: Record<string, Array<{ valueId?: string; id?: string; value?: string }>>;
  options?: Array<{
    attributeId?: string;
    attributeKey?: string;
    valueId?: string;
    value?: string;
    attributeValue?: {
      id?: string;
      valueId?: string;
      attributeId?: string;
      attribute?: { id?: string; key?: string };
      attributeKey?: string;
    };
  }>;
}

function extractSelectedValueIds(
  variant: ApiProductVariant,
  attributes: Attribute[],
  variantIndex: number
): string[] {
  const selectedValueIds: string[] = [];

  if (variant.attributes && typeof variant.attributes === "object") {
    Object.keys(variant.attributes).forEach((attributeKey) => {
      const attribute = attributes.find((item) => item.key === attributeKey);
      if (!attribute) {
        return;
      }

      const attributeValues = variant.attributes?.[attributeKey];
      if (!Array.isArray(attributeValues)) {
        return;
      }

      attributeValues.forEach((attrValue) => {
        const valueId = attrValue.valueId || attrValue.id;
        const value = attrValue.value;

        if (valueId && !selectedValueIds.includes(valueId)) {
          selectedValueIds.push(valueId);
          return;
        }

        if (value) {
          const foundValue = attribute.values.find(
            (item) => item.value === value || item.label === value
          );
          if (foundValue && !selectedValueIds.includes(foundValue.id)) {
            selectedValueIds.push(foundValue.id);
          }
        }
      });
    });
  }

  if (selectedValueIds.length === 0 && variant.options && Array.isArray(variant.options)) {
    const attributeValueMap: Record<string, Set<string>> = {};

    variant.options.forEach((opt) => {
      let attributeId = opt.attributeId;
      let valueId = opt.valueId;
      const attributeKey = opt.attributeKey;

      if (!attributeId && opt.attributeValue) {
        attributeId =
          opt.attributeValue.attributeId ||
          opt.attributeValue.attribute?.id ||
          opt.attributeValue.attributeId;
      }
      if (!valueId && opt.attributeValue) {
        valueId = opt.attributeValue.id || opt.attributeValue.valueId;
      }

      if (!attributeId && opt.attributeKey) {
        const foundAttr = attributes.find((item) => item.key === opt.attributeKey);
        if (foundAttr) {
          attributeId = foundAttr.id;
        }
      }

      if (attributeId && !valueId && opt.value) {
        const foundAttr = attributes.find((item) => item.id === attributeId);
        if (foundAttr) {
          const foundValue = foundAttr.values.find(
            (item) => item.value === opt.value || item.label === opt.value
          );
          if (foundValue) {
            valueId = foundValue.id;
          }
        }
      }

      if (attributeKey && valueId) {
        if (!attributeValueMap[attributeKey]) {
          attributeValueMap[attributeKey] = new Set();
        }
        attributeValueMap[attributeKey].add(valueId);
      }
    });

    Object.values(attributeValueMap).forEach((valueIdSet) => {
      valueIdSet.forEach((valueId) => {
        if (!selectedValueIds.includes(valueId)) {
          selectedValueIds.push(valueId);
        }
      });
    });
  }

  if (selectedValueIds.length === 0) {
    console.warn(
      `⚠️ [ADMIN] Variant ${variantIndex} has no resolved value ids`,
      variant.options ?? variant.attributes
    );
  }

  return selectedValueIds.sort();
}

function extractVariantImage(variant: ApiProductVariant): string | null {
  if (!variant.imageUrl) {
    return null;
  }

  if (typeof variant.imageUrl === "string" && variant.imageUrl.startsWith("data:")) {
    return variant.imageUrl;
  }

  const imageUrls =
    typeof variant.imageUrl === "string"
      ? variant.imageUrl.split(",").map((url) => url.trim()).filter(Boolean)
      : [];

  return imageUrls.length > 0 ? imageUrls[0] : null;
}

/**
 * Converts API product variants to GeneratedVariant rows (one row per DB variant).
 */
export function convertApiVariantsToGenerated(
  productVariants: ApiProductVariant[],
  attributes: Attribute[],
  defaultCurrency: CurrencyCode
): GeneratedVariant[] {
  return productVariants.map((variant, variantIndex) => {
    const selectedValueIds = extractSelectedValueIds(variant, attributes, variantIndex);
    const dbId = variant.id;

    const priceInDefaultCurrency =
      variant.price !== undefined && variant.price !== null
        ? convertPrice(Number(variant.price), "USD", defaultCurrency)
        : 0;
    const compareAtPriceInDefaultCurrency =
      variant.compareAtPrice !== undefined && variant.compareAtPrice !== null
        ? convertPrice(Number(variant.compareAtPrice), "USD", defaultCurrency)
        : null;

    return {
      id: dbId ? `variant-ui-${dbId}` : `variant-ui-new-${variantIndex}`,
      databaseVariantId: dbId,
      selectedValueIds,
      price: priceInDefaultCurrency.toString(),
      compareAtPrice:
        compareAtPriceInDefaultCurrency !== null
          ? compareAtPriceInDefaultCurrency.toString()
          : "",
      stock:
        variant.stock !== undefined && variant.stock !== null
          ? String(variant.stock)
          : "0",
      sku: variant.sku?.trim() ?? "",
      image: extractVariantImage(variant),
    };
  });
}
