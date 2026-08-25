import type { Prisma } from "@white-shop/db";
import {
  CATALOG_ATTRIBUTE_COLOR,
  CATALOG_ATTRIBUTE_SIZE,
} from "./catalog.constants";

export type CatalogOptionLike = {
  attributeKey?: string | null;
  key?: string | null;
  attribute?: string | null;
  value?: string | null;
  label?: string | null;
  attributeValue?: {
    value?: string | null;
    imageUrl?: string | null;
    colors?: unknown;
    attribute?: { key?: string | null } | null;
    translations?: Array<{ locale: string; label: string }> | null;
  } | null;
};

function pickTranslationLabel(
  translations: Array<{ locale: string; label: string }> | null | undefined,
  lang: string,
): string {
  if (!translations || translations.length === 0) {
    return "";
  }
  const match =
    translations.find((row) => row.locale === lang) ?? translations[0];
  return match?.label?.trim() ?? "";
}

function optionAttributeKey(option: CatalogOptionLike): string {
  const fromValue = option.attributeValue?.attribute?.key;
  const raw = fromValue || option.attributeKey || option.key || option.attribute || "";
  return raw.trim().toLowerCase();
}

function optionDisplayValue(option: CatalogOptionLike, lang: string): string {
  if (option.attributeValue) {
    const label = pickTranslationLabel(option.attributeValue.translations, lang);
    const value = option.attributeValue.value?.trim() ?? "";
    return label || value;
  }
  return (option.value || option.label || "").trim();
}

export function catalogOptionColorValue(
  option: CatalogOptionLike,
  lang: string,
): string | null {
  if (optionAttributeKey(option) !== CATALOG_ATTRIBUTE_COLOR) {
    return null;
  }
  const value = optionDisplayValue(option, lang);
  return value ? value.toLowerCase() : null;
}

export function catalogOptionColorLabel(
  option: CatalogOptionLike,
  lang: string,
): string | null {
  if (optionAttributeKey(option) !== CATALOG_ATTRIBUTE_COLOR) {
    return null;
  }
  const value = optionDisplayValue(option, lang);
  return value ? value : null;
}

export function catalogOptionSizeValue(
  option: CatalogOptionLike,
  lang: string,
): string | null {
  if (optionAttributeKey(option) !== CATALOG_ATTRIBUTE_SIZE) {
    return null;
  }
  const value = optionDisplayValue(option, lang);
  return value ? value.toUpperCase() : null;
}

function optionEqualsTokenWhere(
  token: string,
): Prisma.ProductVariantOptionWhereInput {
  return {
    OR: [
      {
        attributeValue: {
          is: {
            OR: [
              { value: { equals: token, mode: "insensitive" } },
              {
                translations: {
                  some: { label: { equals: token, mode: "insensitive" } },
                },
              },
            ],
          },
        },
      },
      { value: { equals: token, mode: "insensitive" } },
    ],
  };
}

function optionMatchesAttributeWhere(
  attributeKey: string,
  token: string,
): Prisma.ProductVariantOptionWhereInput {
  return {
    AND: [
      {
        OR: [
          { attributeValue: { is: { attribute: { key: attributeKey } } } },
          { attributeKey: { equals: attributeKey, mode: "insensitive" } },
        ],
      },
      optionEqualsTokenWhere(token),
    ],
  };
}

function someOptionWhere(
  attributeKey: string,
  tokens: string[],
): Prisma.ProductVariantWhereInput {
  return {
    options: {
      some: {
        OR: tokens.map((token) => optionMatchesAttributeWhere(attributeKey, token)),
      },
    },
  };
}

/**
 * Color and size must match on the same published variant (no cross-variant false match).
 */
export function buildVariantOptionWhere(
  colors: string[],
  sizes: string[],
): Prisma.ProductWhereInput | null {
  if (colors.length === 0 && sizes.length === 0) {
    return null;
  }

  const variantAnd: Prisma.ProductVariantWhereInput[] = [];
  if (colors.length > 0) {
    variantAnd.push(someOptionWhere(CATALOG_ATTRIBUTE_COLOR, colors));
  }
  if (sizes.length > 0) {
    variantAnd.push(someOptionWhere(CATALOG_ATTRIBUTE_SIZE, sizes));
  }

  const variantWhere: Prisma.ProductVariantWhereInput =
    variantAnd.length === 1
      ? { published: true, ...variantAnd[0] }
      : { published: true, AND: variantAnd };

  return {
    variants: {
      some: variantWhere,
    },
  };
}

export function variantMatchesColorAndSize(
  options: CatalogOptionLike[] | undefined,
  colors: string[],
  sizes: string[],
  lang: string,
): boolean {
  if (!options || options.length === 0) {
    return colors.length === 0 && sizes.length === 0;
  }
  if (colors.length > 0) {
    const hasColor = options.some((option) => {
      const value = catalogOptionColorValue(option, lang);
      return value !== null && colors.includes(value);
    });
    if (!hasColor) {
      return false;
    }
  }
  if (sizes.length > 0) {
    const hasSize = options.some((option) => {
      const value = catalogOptionSizeValue(option, lang);
      return value !== null && sizes.includes(value);
    });
    if (!hasSize) {
      return false;
    }
  }
  return true;
}
