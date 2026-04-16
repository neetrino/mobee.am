export interface CategoryTreeNode {
  id: string;
  slug: string;
  title: string;
  fullPath: string;
  children: CategoryTreeNode[];
}

export const PHONES_SLUG_PARTS = [
  'phones',
  'phone',
  'smartphones',
  'smartphone',
  'herakhosner',
  'mobile-phones',
  'cell-phones',
] as const;

export const TABLETS_SLUG_PARTS = ['tablets', 'tablet', 'planshetner', 'planshety', 'ipad'] as const;

export const COMPUTERS_SLUG_PARTS = [
  'computers',
  'computer',
  'pcs',
  'pc',
  'laptops',
  'laptop',
  'notebooks',
  'notebook',
  'hamakargichner',
  'hamakargich',
] as const;

export const WATCHES_SLUG_PARTS = [
  'watches',
  'watch',
  'smartwatches',
  'smartwatch',
  'jamacuyjer',
  'jamacuyc',
  'clock',
  'clocks',
] as const;

export const HEADPHONES_SLUG_PARTS = [
  'headphones',
  'headphone',
  'earphones',
  'earbuds',
  'headsets',
  'headset',
  'akanjakalner',
  'akanjakal',
] as const;

export const ACCESSORIES_SLUG_PARTS = [
  'accessories',
  'accessory',
  'aksessuary',
  'aksesuarner',
  'aksessuarner',
] as const;

function categoryMatchesSlugParts(category: CategoryTreeNode, parts: readonly string[]): boolean {
  const tokens = category.slug.toLowerCase().split(/[-_/]/);
  return parts.some((p) => tokens.includes(p));
}

export function findCategoryBySlugParts(
  categories: CategoryTreeNode[],
  parts: readonly string[],
): CategoryTreeNode | null {
  for (const cat of categories) {
    if (categoryMatchesSlugParts(cat, parts)) return cat;
    const nested = findCategoryBySlugParts(cat.children, parts);
    if (nested) return nested;
  }
  return null;
}
