import { extractCategoryImageUrl } from './categoryMedia';
import type { CategoryTreeNode } from './category-nav';
import { isHouseholdAppliancesStripCategory } from './homeCategoryStripMobileOrder';
import {
  ACCESSORIES_SLUG_PARTS,
  COMPUTERS_SLUG_PARTS,
  findCategoryBySlugParts,
  HEADPHONES_SLUG_PARTS,
  PHONES_SLUG_PARTS,
  TABLETS_SLUG_PARTS,
  WATCHES_SLUG_PARTS,
} from './category-nav';

import { HOME_CATEGORY_STRIP_DESKTOP_COLUMNS } from './constants/home-category-strip.constants';

export { HOME_CATEGORY_STRIP_DESKTOP_COLUMNS };

export type CategoryStripSlotKey =
  | 'computers'
  | 'phones'
  | 'tablets'
  | 'watches'
  | 'headphones'
  | 'accessories';

export const CATEGORY_STRIP_SLOT_ORDER: readonly CategoryStripSlotKey[] = [
  'computers',
  'phones',
  'tablets',
  'watches',
  'headphones',
  'accessories',
];

const SLOT_SLUG_PARTS: Record<CategoryStripSlotKey, readonly string[]> = {
  computers: COMPUTERS_SLUG_PARTS,
  phones: PHONES_SLUG_PARTS,
  tablets: TABLETS_SLUG_PARTS,
  watches: WATCHES_SLUG_PARTS,
  headphones: HEADPHONES_SLUG_PARTS,
  accessories: ACCESSORIES_SLUG_PARTS,
};

const SLOT_FALLBACK_SLUGS: Record<CategoryStripSlotKey, string> = {
  computers: 'computers',
  phones: 'phones',
  tablets: 'tablets',
  watches: 'watches',
  headphones: 'headphones',
  accessories: 'accessories',
};

const FALLBACK_IMAGES: Record<CategoryStripSlotKey, string> = {
  computers: '/images/home/category-strip/computers.png',
  phones: '/images/home/category-strip/phones.png',
  tablets: '/images/home/category-strip/tablets.png',
  watches: '/images/home/category-strip/watches.png',
  headphones: '/images/home/category-strip/headphones.png',
  accessories: '/images/home/category-strip/accessories.png',
};

export interface CategoryStripVisual {
  imageWidth: number;
  imageHeight: number;
  tall: boolean;
  imageWrapperClassName: string;
  imageClassName: string;
}

export const CATEGORY_STRIP_VISUALS: Record<CategoryStripSlotKey, CategoryStripVisual> = {
  computers: {
    imageWidth: 146,
    imageHeight: 146,
    tall: false,
    imageWrapperClassName:
      'absolute left-[31px] top-[24px] flex size-[146px] items-center justify-center',
    imageClassName: 'object-contain',
  },
  phones: {
    imageWidth: 127,
    imageHeight: 127,
    tall: false,
    imageWrapperClassName: 'absolute left-[31px] top-[24px] size-[127px]',
    imageClassName: 'object-cover',
  },
  tablets: {
    imageWidth: 128,
    imageHeight: 128,
    tall: false,
    imageWrapperClassName: 'absolute left-[34px] top-[23px] size-[128px]',
    imageClassName: 'object-cover',
  },
  watches: {
    imageWidth: 154,
    imageHeight: 154,
    tall: false,
    imageWrapperClassName:
      'absolute left-[20px] top-[9px] flex size-[154px] items-center justify-center',
    imageClassName: 'object-contain',
  },
  headphones: {
    imageWidth: 146,
    imageHeight: 146,
    tall: false,
    imageWrapperClassName: 'absolute left-[25px] top-[10px] size-[146px]',
    imageClassName: 'object-cover',
  },
  accessories: {
    imageWidth: 134,
    imageHeight: 134,
    tall: false,
    imageWrapperClassName: 'absolute left-[31px] top-[21px] size-[134px]',
    imageClassName: 'object-contain',
  },
};

export const CATEGORY_STRIP_GRID_COLS: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
};

export function getCategoryStripDesktopGridClass(itemCount: number): string {
  if (itemCount <= 0) {
    return CATEGORY_STRIP_GRID_COLS[1];
  }

  if (itemCount <= HOME_CATEGORY_STRIP_DESKTOP_COLUMNS) {
    return CATEGORY_STRIP_GRID_COLS[itemCount] ?? CATEGORY_STRIP_GRID_COLS[1];
  }

  return CATEGORY_STRIP_GRID_COLS[HOME_CATEGORY_STRIP_DESKTOP_COLUMNS];
}

function categoryMatchesSlugParts(category: CategoryTreeNode, parts: readonly string[]): boolean {
  const tokens = category.slug.toLowerCase().split(/[-_/]/);
  return parts.some((part) => tokens.includes(part));
}

export function resolveCategoryStripSlotKey(
  category: CategoryTreeNode,
  index?: number,
): CategoryStripSlotKey | null {
  for (const slotKey of CATEGORY_STRIP_SLOT_ORDER) {
    if (categoryMatchesSlugParts(category, SLOT_SLUG_PARTS[slotKey])) {
      return slotKey;
    }
  }

  if (index !== undefined && index >= 0) {
    return CATEGORY_STRIP_SLOT_ORDER[index % CATEGORY_STRIP_SLOT_ORDER.length];
  }

  return null;
}

export function mapHomeStripItemsByPosition<T extends { position: number }>(
  items: T[],
): Map<number, T> {
  const map = new Map<number, T>();
  for (const item of items) {
    map.set(item.position, item);
  }
  return map;
}

export function resolveCategoryForStripSlot(
  categories: CategoryTreeNode[],
  slotKey: CategoryStripSlotKey,
): CategoryTreeNode | null {
  return findCategoryBySlugParts(categories, SLOT_SLUG_PARTS[slotKey]);
}

export function getCategoryStripSlotKeyByPosition(
  position: number,
): CategoryStripSlotKey | null {
  const slotKey = CATEGORY_STRIP_SLOT_ORDER[position - 1];
  return slotKey ?? null;
}

export function getDefaultStripImageByPosition(position: number): string {
  const slotKey = getCategoryStripSlotKeyByPosition(position);
  if (!slotKey) {
    return FALLBACK_IMAGES.computers;
  }
  return FALLBACK_IMAGES[slotKey];
}

export function resolveCategoryStripImageSrc(slotKey: CategoryStripSlotKey): string {
  return FALLBACK_IMAGES[slotKey];
}

export function resolveCategoryStripImageForItem(
  media: unknown,
  slotKey: CategoryStripSlotKey,
): string {
  // Always prefer the CMS/admin category image so home strip matches /supersudo/categories.
  // Slot fallbacks (including curated watches PNG) are only used when media is missing.
  const fromMedia = extractCategoryImageUrl(media);
  if (fromMedia) {
    return fromMedia;
  }

  return resolveCategoryStripImageSrc(slotKey);
}

export function getCategoryStripVisual(slotKey: CategoryStripSlotKey): CategoryStripVisual {
  return CATEGORY_STRIP_VISUALS[slotKey];
}

export function getCategoryStripTitleTranslateClass(
  category: CategoryTreeNode,
  slotKey: CategoryStripSlotKey,
): string {
  if (isHouseholdAppliancesStripCategory(category)) {
    return '-translate-y-[3px]';
  }

  if (slotKey === 'accessories') {
    return '-translate-y-[6px]';
  }

  return '-translate-y-[8px]';
}

export function categoryStripHref(category: CategoryTreeNode): string {
  return `/shop?category=${encodeURIComponent(category.slug)}`;
}

export function categoryStripHrefForSlot(
  resolved: CategoryTreeNode | null,
  slotKey: CategoryStripSlotKey,
): string {
  const slug = resolved?.slug ?? SLOT_FALLBACK_SLUGS[slotKey];
  return `/shop?category=${encodeURIComponent(slug)}`;
}

export function categoryStripCardAspectClass(visual: CategoryStripVisual): string {
  return visual.tall ? 'aspect-[197/227]' : 'aspect-[197/201]';
}

export function categoryStripInnerHeightClass(visual: CategoryStripVisual): string {
  return visual.tall ? 'h-[227px]' : 'h-[201px]';
}
