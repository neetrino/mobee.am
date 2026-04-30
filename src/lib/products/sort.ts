export const PRODUCT_SORT_OPTIONS = [
  "default",
  "price-asc",
  "price-desc",
  "name-asc",
  "name-desc",
] as const;

export type ProductSortOption = (typeof PRODUCT_SORT_OPTIONS)[number];

export function parseProductSortOption(value: string | null | undefined): ProductSortOption {
  if (!value) return "default";

  return PRODUCT_SORT_OPTIONS.includes(value as ProductSortOption)
    ? (value as ProductSortOption)
    : "default";
}
