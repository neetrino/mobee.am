import type { LucideIcon } from 'lucide-react';
import {
  Battery,
  Cable,
  Gamepad2,
  Headphones,
  Laptop,
  LayoutGrid,
  Package,
  Plug,
  Refrigerator,
  Smartphone,
  Tablet,
  Tv,
  Watch,
  Wind,
} from 'lucide-react';
import {
  ACCESSORIES_SLUG_PARTS,
  COMPUTERS_SLUG_PARTS,
  HEADPHONES_SLUG_PARTS,
  PHONES_SLUG_PARTS,
  TABLETS_SLUG_PARTS,
  WATCHES_SLUG_PARTS,
} from './category-nav';

export type CategoryIconSource = {
  title: string;
  slug: string;
  fullPath?: string;
};

const TV_SLUG_PARTS = ['tvs', 'tv', 'television', 'televizory', 'herustatsuyts'] as const;
const GAME_CONSOLE_SLUG_PARTS = [
  'game-consoles',
  'game-console',
  'consoles',
  'console',
  'playstation',
  'ps5',
  'xbox',
] as const;
const HAIR_DRYER_SLUG_PARTS = ['hair-dryers', 'hair-dryer', 'hairdryer'] as const;
const HOUSEHOLD_SLUG_PARTS = [
  'household-appliances',
  'household',
  'kencaxayin-texnika',
  'bytovaya-tekhnika',
] as const;

function tokenizeCategory(value: string): string[] {
  return value.toLowerCase().split(/[-_/]/).filter(Boolean);
}

function matchesSlugParts(category: CategoryIconSource, parts: readonly string[]): boolean {
  const tokens = [
    ...tokenizeCategory(category.slug),
    ...tokenizeCategory(category.fullPath ?? ''),
  ];
  return parts.some((part) => tokens.includes(part));
}

function titleIncludes(category: CategoryIconSource, markers: readonly string[]): boolean {
  const normalized = category.title.toLowerCase();
  return markers.some((marker) => normalized.includes(marker));
}

function resolveAccessoryIcon(category: CategoryIconSource): LucideIcon | null {
  if (titleIncludes(category, ['cable', 'кабель']) || category.slug.includes('cable')) {
    return Cable;
  }
  if (titleIncludes(category, ['charger', 'заряд', 'լիցք']) || category.slug.includes('charger')) {
    return Plug;
  }
  if (
    titleIncludes(category, ['power bank', 'powerbank', 'բатар']) ||
    category.slug.includes('power')
  ) {
    return Battery;
  }
  if (matchesSlugParts(category, ACCESSORIES_SLUG_PARTS) || titleIncludes(category, ['աքսեսուար', 'аксессуар', 'accessory'])) {
    return Package;
  }
  return null;
}

function resolvePrimaryIcon(category: CategoryIconSource): LucideIcon | null {
  if (
    matchesSlugParts(category, HAIR_DRYER_SLUG_PARTS) ||
    titleIncludes(category, ['ֆեն', 'фен', 'hair dryer', 'վարսահարդարիչ'])
  ) {
    return Wind;
  }
  if (
    matchesSlugParts(category, GAME_CONSOLE_SLUG_PARTS) ||
    titleIncludes(category, ['կոնսոլ', 'консол', 'playstation', 'xbox'])
  ) {
    return Gamepad2;
  }
  if (
    matchesSlugParts(category, TV_SLUG_PARTS) ||
    titleIncludes(category, ['հեռուստացույց', 'телевизор', 'television'])
  ) {
    return Tv;
  }
  if (
    matchesSlugParts(category, HOUSEHOLD_SLUG_PARTS) ||
    titleIncludes(category, ['կենցաղ', 'бытов', 'household'])
  ) {
    return Refrigerator;
  }
  if (matchesSlugParts(category, PHONES_SLUG_PARTS) || titleIncludes(category, ['հեռախոս', 'телефон', 'iphone'])) {
    return Smartphone;
  }
  if (matchesSlugParts(category, TABLETS_SLUG_PARTS) || titleIncludes(category, ['պլանշետ', 'планшет', 'ipad'])) {
    return Tablet;
  }
  if (
    matchesSlugParts(category, COMPUTERS_SLUG_PARTS) ||
    titleIncludes(category, ['համակարգիչ', 'компьютер', 'macbook', 'laptop'])
  ) {
    return Laptop;
  }
  if (matchesSlugParts(category, WATCHES_SLUG_PARTS) || titleIncludes(category, ['ժամացույց', 'часы', 'watch'])) {
    return Watch;
  }
  if (
    matchesSlugParts(category, HEADPHONES_SLUG_PARTS) ||
    titleIncludes(category, ['ականջակալ', 'наушник', 'airpods', 'headphone'])
  ) {
    return Headphones;
  }
  return resolveAccessoryIcon(category);
}

/** Lucide icon for header categories flyout cards (slug/title heuristics). */
export function resolveCategoryMenuIcon(category: CategoryIconSource): LucideIcon {
  return resolvePrimaryIcon(category) ?? LayoutGrid;
}
