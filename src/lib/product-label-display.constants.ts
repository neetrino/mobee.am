/**
 * Corner-badge labels historically injected for out-of-stock (all storefront locales).
 * Keep in sync with `translations.*.stock.outOfStock`.
 */
const OUT_OF_STOCK_BADGE_VALUES_NORMALIZED = new Set(
  ['out of stock', 'առկա չէ', 'нет в наличии', 'არ არის მარაგში'].map((v) => v.trim().toLowerCase()),
);

const OUT_OF_STOCK_BADGE_ID_PREFIX = 'out-of-stock-';

type KnownProductLabelKind = 'new' | 'sale' | 'hot';

const KNOWN_PRODUCT_LABEL_MATCHERS: Array<{ kind: KnownProductLabelKind; needles: string[] }> = [
  { kind: 'new', needles: ['new', 'նոր', 'новый', 'новое', 'новинка'] },
  { kind: 'sale', needles: ['sale', 'զեղչ', 'скидка', 'акция'] },
  { kind: 'hot', needles: ['hot', 'տաք', 'хит', 'горяч'] },
];

/**
 * Whether a product label should not be shown as a corner badge (out-of-stock pill).
 */
export function shouldHideOutOfStockProductLabel(label: { id: string; value: string }): boolean {
  if (label.id.toLowerCase().startsWith(OUT_OF_STOCK_BADGE_ID_PREFIX)) {
    return true;
  }
  const normalized = label.value.trim().toLowerCase();
  return OUT_OF_STOCK_BADGE_VALUES_NORMALIZED.has(normalized);
}

/**
 * Map admin-entered badge text (any storefront locale) to a known label kind.
 */
export function resolveKnownProductLabelKind(value: string): KnownProductLabelKind | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  for (const entry of KNOWN_PRODUCT_LABEL_MATCHERS) {
    if (entry.needles.some((needle) => normalized.includes(needle))) {
      return entry.kind;
    }
  }

  return null;
}

/**
 * i18n key for a known product card badge, or null when the raw value should be shown.
 */
export function getProductLabelDisplayI18nKey(value: string): string | null {
  const kind = resolveKnownProductLabelKind(value);
  if (!kind) {
    return null;
  }

  return `common.productLabels.${kind}`;
}
