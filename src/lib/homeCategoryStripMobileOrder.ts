import type { CategoryTreeNode } from './category-nav';
import { TABLETS_SLUG_PARTS } from './category-nav';

const HOUSEHOLD_APPLIANCES_SLUG_PARTS = [
  'household-appliances',
  'household',
  'home-appliances',
  'kencaxayin-texnika',
  'kencaxayin',
  'bytovaya-tekhnika',
] as const;

const TABLETS_TITLE_MARKERS = ['պլանշետ', 'планшет', 'tablet', 'ipad'] as const;

const HOUSEHOLD_APPLIANCES_TITLE_MARKERS = [
  'կենցաղ',
  'бытов',
  'household',
  'home appliance',
] as const;

function tokenizeCategoryPath(value: string): string[] {
  return value.toLowerCase().split(/[-_/]/).filter(Boolean);
}

function categoryMatchesSlugParts(category: CategoryTreeNode, parts: readonly string[]): boolean {
  const slugTokens = tokenizeCategoryPath(category.slug);
  const pathTokens = tokenizeCategoryPath(category.fullPath);
  const tokens = [...slugTokens, ...pathTokens];
  return parts.some((part) => tokens.includes(part));
}

function titleIncludesMarker(title: string, markers: readonly string[]): boolean {
  const normalized = title.toLowerCase();
  return markers.some((marker) => normalized.includes(marker));
}

function isTabletsStripCategory(category: CategoryTreeNode): boolean {
  if (categoryMatchesSlugParts(category, TABLETS_SLUG_PARTS)) {
    return true;
  }

  return titleIncludesMarker(category.title, TABLETS_TITLE_MARKERS);
}

function isHouseholdAppliancesStripCategory(category: CategoryTreeNode): boolean {
  if (categoryMatchesSlugParts(category, HOUSEHOLD_APPLIANCES_SLUG_PARTS)) {
    return true;
  }

  return titleIncludesMarker(category.title, HOUSEHOLD_APPLIANCES_TITLE_MARKERS);
}

function swapItemsAtIndexes<T>(items: T[], firstIndex: number, secondIndex: number): T[] {
  const result = [...items];
  const first = result[firstIndex];
  const second = result[secondIndex];
  if (!first || !second) {
    return result;
  }

  result[firstIndex] = second;
  result[secondIndex] = first;
  return result;
}

/**
 * Mobile home strip under hero: show tablets before household appliances.
 */
export function reorderHomeStripItemsForMobile<T extends CategoryTreeNode & { position: number }>(
  items: T[],
): T[] {
  const sorted = [...items].sort((a, b) => a.position - b.position);
  const householdIndex = sorted.findIndex(isHouseholdAppliancesStripCategory);
  const tabletsIndex = sorted.findIndex(isTabletsStripCategory);

  if (householdIndex < 0 || tabletsIndex < 0 || householdIndex === tabletsIndex) {
    return sorted;
  }

  return swapItemsAtIndexes(sorted, householdIndex, tabletsIndex);
}
