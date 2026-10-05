import { convertPrice, type CurrencyCode } from "@/lib/currency";
import { smartSplitUrls } from "@/lib/utils/image-utils";
import type { Attribute, GeneratedVariant } from "../types";

type ApiAttributeValueItem = {
  valueId?: string;
  id?: string;
  value?: string;
};

export interface ApiProductVariant {
  id?: string;
  price?: number | string | null;
  compareAtPrice?: number | string | null;
  stock?: number | string | null;
  sku?: string | null;
  imageUrl?: string | null;
  media?: string[];
  published?: boolean;
  attributes?: Record<string, string | ApiAttributeValueItem[] | unknown>;
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

function addUniqueValueId(selectedValueIds: string[], valueId: string | undefined): void {
  if (!valueId || selectedValueIds.includes(valueId)) {
    return;
  }
  selectedValueIds.push(valueId);
}

function resolveValueIdByLabel(attribute: Attribute, label: string): string | undefined {
  const normalized = label.trim().toLowerCase();
  const found = attribute.values.find(
    (item) =>
      item.value.trim().toLowerCase() === normalized ||
      item.label.trim().toLowerCase() === normalized
  );
  return found?.id;
}

function collectFromOptions(
  variant: ApiProductVariant,
  attributes: Attribute[],
  selectedValueIds: string[]
): void {
  if (!Array.isArray(variant.options)) {
    return;
  }

  for (const opt of variant.options) {
    let attributeId = opt.attributeId;
    let valueId = opt.valueId;
    let attributeKey = opt.attributeKey;

    if (!attributeId && opt.attributeValue) {
      attributeId = opt.attributeValue.attributeId || opt.attributeValue.attribute?.id;
    }
    if (!valueId && opt.attributeValue) {
      valueId = opt.attributeValue.id || opt.attributeValue.valueId;
    }
    if (!attributeKey && opt.attributeValue?.attribute?.key) {
      attributeKey = opt.attributeValue.attribute.key;
    }

    if (!attributeId && attributeKey) {
      const foundAttr = attributes.find((item) => item.key === attributeKey);
      if (foundAttr) {
        attributeId = foundAttr.id;
      }
    }

    if (!valueId && opt.value) {
      const foundAttr =
        (attributeId ? attributes.find((item) => item.id === attributeId) : undefined) ||
        (attributeKey ? attributes.find((item) => item.key === attributeKey) : undefined);
      if (foundAttr) {
        valueId = resolveValueIdByLabel(foundAttr, opt.value);
      }
    }

    addUniqueValueId(selectedValueIds, valueId);
  }
}

function collectFromJsonAttributes(
  variant: ApiProductVariant,
  attributes: Attribute[],
  selectedValueIds: string[]
): void {
  if (!variant.attributes || typeof variant.attributes !== "object" || Array.isArray(variant.attributes)) {
    return;
  }

  for (const [attributeKey, raw] of Object.entries(variant.attributes)) {
    const attribute = attributes.find((item) => item.key === attributeKey);
    if (!attribute) {
      continue;
    }

    if (typeof raw === "string" && raw.trim()) {
      addUniqueValueId(selectedValueIds, resolveValueIdByLabel(attribute, raw));
      continue;
    }

    if (!Array.isArray(raw)) {
      continue;
    }

    for (const attrValue of raw) {
      if (!attrValue || typeof attrValue !== "object") {
        if (typeof attrValue === "string" && attrValue.trim()) {
          addUniqueValueId(selectedValueIds, resolveValueIdByLabel(attribute, attrValue));
        }
        continue;
      }

      const item = attrValue as ApiAttributeValueItem;
      const valueId = item.valueId || item.id;
      if (valueId) {
        addUniqueValueId(selectedValueIds, valueId);
        continue;
      }
      if (item.value) {
        addUniqueValueId(selectedValueIds, resolveValueIdByLabel(attribute, item.value));
      }
    }
  }
}

function extractSelectedValueIds(
  variant: ApiProductVariant,
  attributes: Attribute[],
  variantIndex: number
): string[] {
  const selectedValueIds: string[] = [];

  // Relational options are the source of truth; JSONB fills gaps.
  collectFromOptions(variant, attributes, selectedValueIds);
  collectFromJsonAttributes(variant, attributes, selectedValueIds);

  if (selectedValueIds.length === 0) {
    console.warn(
      `⚠️ [ADMIN] Variant ${variantIndex} has no resolved value ids`,
      variant.options ?? variant.attributes
    );
  }

  return selectedValueIds.sort();
}

/** Same order as the storefront gallery: imageUrl entries first, then variant media. */
function extractVariantImages(variant: ApiProductVariant): string[] {
  const fromImageUrl = typeof variant.imageUrl === "string" ? smartSplitUrls(variant.imageUrl) : [];
  const fromMedia = Array.isArray(variant.media) ? variant.media.filter(Boolean) : [];
  return Array.from(new Set([...fromImageUrl, ...fromMedia]));
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
      images: extractVariantImages(variant),
    };
  });
}
