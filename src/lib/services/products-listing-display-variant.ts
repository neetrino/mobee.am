import { processImageUrl } from "../utils/image-utils";
import type { ProductWithRelations } from "./products-find-query.service";

type ListingVariant = ProductWithRelations["variants"][number];
type ListingOption = ListingVariant["options"][number];

function normalizeColorFilterList(colors?: string): string[] {
  if (!colors || typeof colors !== "string") return [];
  return colors
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0 && value !== "undefined" && value !== "null");
}

/**
 * Canonical color token for PDP query params (variant option value, lowercased).
 */
export function getVariantColorLinkValue(
  variant: ListingVariant,
  lang = "en",
): string | null {
  const options = Array.isArray(variant.options) ? variant.options : [];

  for (const opt of options) {
    if ("attributeValue" in opt && opt.attributeValue) {
      if (opt.attributeValue.attribute?.key !== "color") continue;
      const raw = opt.attributeValue.value || opt.value;
      if (typeof raw === "string" && raw.trim()) {
        return raw.trim().toLowerCase();
      }
    }

    const legacy = opt as {
      attributeKey?: string | null;
      key?: string;
      attribute?: string;
      value?: string | null;
    };

    if (
      legacy.attributeKey === "color" ||
      legacy.key === "color" ||
      legacy.attribute === "color"
    ) {
      const label = getOptionColorValue(opt, lang);
      const raw = legacy.value?.trim() || label;
      if (raw) return raw.toLowerCase();
    }
  }

  if (
    variant.attributes &&
    typeof variant.attributes === "object" &&
    !Array.isArray(variant.attributes) &&
    "color" in variant.attributes
  ) {
    const colorAttr = (variant.attributes as { color?: unknown }).color;
    const items = Array.isArray(colorAttr) ? colorAttr : colorAttr ? [colorAttr] : [];
    for (const item of items) {
      const raw =
        item && typeof item === "object" && "value" in item
          ? (item as { value?: unknown }).value
          : item;
      if (typeof raw === "string" && raw.trim()) {
        return raw.trim().toLowerCase();
      }
    }
  }

  return null;
}

function getOptionColorValue(opt: ListingOption, lang: string): string | null {
  if (!opt) return null;

  if ("attributeValue" in opt && opt.attributeValue) {
    if (opt.attributeValue.attribute?.key !== "color") return null;
    const translation =
      opt.attributeValue.translations?.find((t) => t.locale === lang) ||
      opt.attributeValue.translations?.[0];
    const value = translation?.label || opt.attributeValue.value || "";
    return value.trim().toLowerCase() || null;
  }

  const legacy = opt as {
    attributeKey?: string | null;
    key?: string;
    attribute?: string;
    value?: string | null;
  };

  if (
    legacy.attributeKey === "color" ||
    legacy.key === "color" ||
    legacy.attribute === "color"
  ) {
    return (legacy.value || "").trim().toLowerCase() || null;
  }

  return null;
}

function variantHasFilteredColor(
  variant: ListingVariant,
  colorList: string[],
  lang: string,
): boolean {
  const options = Array.isArray(variant.options) ? variant.options : [];
  for (const opt of options) {
    const colorValue = getOptionColorValue(opt, lang);
    if (colorValue && colorList.includes(colorValue)) return true;
  }

  if (
    variant.attributes &&
    typeof variant.attributes === "object" &&
    !Array.isArray(variant.attributes) &&
    "color" in variant.attributes
  ) {
    const colorAttr = (variant.attributes as { color?: unknown }).color;
    const items = Array.isArray(colorAttr) ? colorAttr : colorAttr ? [colorAttr] : [];
    for (const item of items) {
      const raw =
        item && typeof item === "object" && "value" in item
          ? (item as { value?: unknown }).value
          : item;
      if (typeof raw === "string" && colorList.includes(raw.trim().toLowerCase())) {
        return true;
      }
    }
  }

  return false;
}

/**
 * When a color filter is active, pick the variant that matches the filtered color
 * so listing cards can show the correct device image.
 * If multiple colors are selected, prefer the last selected color (URL order).
 */
export function findListingDisplayVariant(
  variants: ListingVariant[],
  colorFilter?: string,
  lang = "en",
): ListingVariant | null {
  const colorList = normalizeColorFilterList(colorFilter);
  if (colorList.length === 0 || !Array.isArray(variants) || variants.length === 0) {
    return null;
  }

  const colorsByPriority = [...colorList].reverse();

  for (const preferredColor of colorsByPriority) {
    const matching = variants.filter((variant) =>
      variantHasFilteredColor(variant, [preferredColor], lang),
    );
    if (matching.length === 0) continue;

    const inStock = matching.find((variant) => (variant.stock || 0) > 0);
    const pool = inStock
      ? [inStock, ...matching.filter((variant) => variant !== inStock)]
      : matching;

    const withImage = pool.find(
      (variant) => typeof variant.imageUrl === "string" && variant.imageUrl.trim().length > 0,
    );
    if (withImage) return withImage;

    return [...pool].sort((a, b) => a.price - b.price)[0];
  }

  const matching = variants.filter((variant) =>
    variantHasFilteredColor(variant, colorList, lang),
  );
  if (matching.length === 0) return null;

  const inStock = matching.find((variant) => (variant.stock || 0) > 0);
  const pool = inStock
    ? [inStock, ...matching.filter((variant) => variant !== inStock)]
    : matching;

  const withImage = pool.find(
    (variant) => typeof variant.imageUrl === "string" && variant.imageUrl.trim().length > 0,
  );
  if (withImage) return withImage;

  return [...pool].sort((a, b) => a.price - b.price)[0];
}

export type ListingColorOption = {
  value: string;
  linkValue: string;
  imageUrl?: string | null;
  colors?: string[] | null;
};

function normalizeImageForCompare(url: string | null | undefined): string | null {
  const processed = processImageUrl(url ?? null);
  if (!processed) return null;

  try {
    const parsed = new URL(processed, "https://placeholder.local");
    return `${parsed.pathname}`.toLowerCase();
  } catch {
    return processed.toLowerCase();
  }
}

function imagesMatchForListing(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const normalizedLeft = normalizeImageForCompare(left);
  const normalizedRight = normalizeImageForCompare(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

/**
 * Resolves the color token shown on listing cards so it matches the displayed image.
 */
export function resolveListingDisplayColor(
  variants: ListingVariant[],
  displayVariant: ListingVariant | null,
  listingImage: string | null,
  availableColors: ListingColorOption[],
  fallbackVariant: ListingVariant | null,
  lang = "en",
): string | null {
  if (displayVariant) {
    return getVariantColorLinkValue(displayVariant, lang);
  }

  if (listingImage) {
    for (const variant of variants) {
      if (!imagesMatchForListing(variant.imageUrl, listingImage)) continue;
      const color = getVariantColorLinkValue(variant, lang);
      if (color) return color;
    }

    for (const color of availableColors) {
      if (!imagesMatchForListing(color.imageUrl, listingImage)) continue;
      return color.linkValue;
    }

    for (const variant of variants) {
      const options = Array.isArray(variant.options) ? variant.options : [];
      for (const opt of options) {
        if (!("attributeValue" in opt) || !opt.attributeValue?.imageUrl) continue;
        if (!imagesMatchForListing(opt.attributeValue.imageUrl, listingImage)) continue;

        const colorValue = getOptionColorValue(opt, lang);
        if (colorValue) return colorValue;

        const canonical = opt.attributeValue.value?.trim().toLowerCase();
        if (canonical) return canonical;
      }
    }
  }

  return fallbackVariant ? getVariantColorLinkValue(fallbackVariant, lang) : null;
}

export function resolveListingProductImage(
  product: ProductWithRelations,
  displayVariant: ListingVariant | null,
  colorFilter?: string,
  lang = "en",
): string | null {
  if (displayVariant?.imageUrl) {
    const fromVariant = processImageUrl(displayVariant.imageUrl);
    if (fromVariant) return fromVariant;
  }

  const colorList = normalizeColorFilterList(colorFilter);
  if (colorList.length > 0 && displayVariant) {
    const options = Array.isArray(displayVariant.options) ? displayVariant.options : [];
    for (const opt of options) {
      const colorValue = getOptionColorValue(opt, lang);
      if (!colorValue || !colorList.includes(colorValue)) continue;
      if ("attributeValue" in opt && opt.attributeValue?.imageUrl) {
        const fromAttribute = processImageUrl(opt.attributeValue.imageUrl);
        if (fromAttribute) return fromAttribute;
      }
    }
  }

  if (!Array.isArray(product.media) || product.media.length === 0) {
    return null;
  }

  return (
    processImageUrl(
      product.media[0] as string | null | undefined | { url?: string; src?: string; value?: string },
    ) || null
  );
}
