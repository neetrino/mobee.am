/**
 * Corner-badge labels historically injected for out-of-stock (all storefront locales).
 * Keep in sync with `translations.*.stock.outOfStock`.
 */
const OUT_OF_STOCK_BADGE_VALUES_NORMALIZED = new Set(
  ['out of stock', 'առկա չէ', 'нет в наличии', 'არ არის მარაგში'].map((v) => v.trim().toLowerCase()),
);

const OUT_OF_STOCK_BADGE_ID_PREFIX = 'out-of-stock-';

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
