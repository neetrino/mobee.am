import { extractMediaUrl } from "../../utils/extractMediaUrl";
import type { SupportedCheckoutLocale } from "./checkout-calculations";

export interface CheckoutCartItemDetails {
  variantId: string;
  productId: string;
  quantity: number;
  price: number;
  productTitle: string;
  variantTitle?: string;
  sku: string;
  imageUrl?: string;
  color?: string;
  colorHex?: string;
}

type TranslationRow = { locale: string; title?: string; label?: string };

type CheckoutVariantOption = {
  attributeKey?: string | null;
  value?: string | null;
  attributeValue?: {
    value: string;
    imageUrl?: string | null;
    colors?: unknown;
    translations?: TranslationRow[];
    attribute?: { key?: string };
  } | null;
};

export function pickTranslationByLocale<T extends { locale: string }>(
  rows: T[] | undefined,
  locale: string
): T | undefined {
  if (!rows?.length) {
    return undefined;
  }
  return rows.find((row) => row.locale === locale) ?? rows[0];
}

function parseFirstColorHex(colors: unknown): string | undefined {
  if (!colors) {
    return undefined;
  }

  let values: string[] = [];
  if (Array.isArray(colors)) {
    values = colors.filter((entry): entry is string => typeof entry === "string");
  } else if (typeof colors === "string") {
    try {
      const parsed: unknown = JSON.parse(colors);
      if (Array.isArray(parsed)) {
        values = parsed.filter((entry): entry is string => typeof entry === "string");
      }
    } catch {
      return undefined;
    }
  }

  return values[0];
}

function isColorAttributeKey(key: string): boolean {
  const normalized = key.toLowerCase().trim();
  return normalized === "color" || normalized === "colour";
}

function resolveOptionAttributeKey(option: CheckoutVariantOption): string {
  return option.attributeValue?.attribute?.key ?? option.attributeKey ?? "";
}

function resolveOptionLabel(option: CheckoutVariantOption, locale: string): string {
  if (option.attributeValue) {
    const translation = pickTranslationByLocale(option.attributeValue.translations, locale);
    return translation?.label ?? option.attributeValue.value;
  }
  return option.value ?? "";
}

export function extractColorFromVariantOptions(
  options: CheckoutVariantOption[] | undefined,
  locale: string
): { label?: string; hex?: string; imageUrl?: string } {
  if (!options?.length) {
    return {};
  }

  const colorOption = options.find((option) =>
    isColorAttributeKey(resolveOptionAttributeKey(option))
  );
  if (!colorOption) {
    return {};
  }

  if (colorOption.attributeValue) {
    return {
      label: resolveOptionLabel(colorOption, locale),
      hex: parseFirstColorHex(colorOption.attributeValue.colors),
      imageUrl: colorOption.attributeValue.imageUrl?.trim() || undefined,
    };
  }

  return {
    label: colorOption.value?.trim() || undefined,
  };
}

export function buildCheckoutCartItemDetails(input: {
  variant: {
    id: string;
    sku?: string | null;
    price: unknown;
    imageUrl?: string | null;
    options?: CheckoutVariantOption[];
  };
  product: {
    id: string;
    media?: unknown;
    translations?: Array<{ locale: string; title: string }>;
  };
  quantity: number;
  locale: SupportedCheckoutLocale;
}): CheckoutCartItemDetails {
  const translation = pickTranslationByLocale(input.product.translations, input.locale);
  const colorInfo = extractColorFromVariantOptions(input.variant.options, input.locale);

  const variantTitle =
    input.variant.options
      ?.filter((option) => !isColorAttributeKey(resolveOptionAttributeKey(option)))
      .map((option) => {
        const key = resolveOptionAttributeKey(option);
        const label = resolveOptionLabel(option, input.locale);
        if (!label) {
          return "";
        }
        return key ? `${key}: ${label}` : label;
      })
      .filter(Boolean)
      .join(", ") || undefined;

  const imageUrl =
    input.variant.imageUrl?.trim() ||
    colorInfo.imageUrl ||
    extractMediaUrl(input.product.media) ||
    undefined;

  return {
    variantId: input.variant.id,
    productId: input.product.id,
    quantity: input.quantity,
    price: Number(input.variant.price),
    productTitle: translation?.title ?? "Unknown Product",
    variantTitle,
    sku: input.variant.sku ?? "",
    imageUrl,
    color: colorInfo.label,
    colorHex: colorInfo.hex,
  };
}
