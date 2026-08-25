import type { LucideIcon } from 'lucide-react';
import {
  AirVent,
  Battery,
  Cable,
  Gamepad2,
  Headphones,
  Laptop,
  LayoutGrid,
  Microwave,
  Plug,
  Refrigerator,
  Smartphone,
  Tablet,
  Tv,
  WandSparkles,
  WashingMachine,
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

const TV_SLUG_PARTS = [
  'tvs',
  'tv',
  'television',
  'televizory',
  'herustatsuyts',
  'herustacuyc',
] as const;

const GAME_CONSOLE_SLUG_PARTS = [
  'game-consoles',
  'game-console',
  'consoles',
  'console',
  'playstation',
  'ps5',
  'xbox',
] as const;

const HAIR_DRYER_SLUG_PARTS = [
  'hair-dryers',
  'hair-dryer',
  'hairdryer',
  'fen',
  'varsahardarich',
] as const;

const HAIR_STRAIGHTENER_SLUG_PARTS = [
  'hair-straightener',
  'hair-straighteners',
  'straightener',
  'straighteners',
] as const;

const AIR_CONDITIONER_SLUG_PARTS = [
  'ac',
  'air-conditioner',
  'air-conditioners',
  'airconditioner',
  'conditioner',
  'odorakich',
] as const;

const WASHING_MACHINE_SLUG_PARTS = [
  'washing-machine',
  'washing-machines',
  'washer',
  'lvacqi-meqena',
  'lvacqi',
] as const;

const REFRIGERATOR_SLUG_PARTS = [
  'refrigerator',
  'refrigerators',
  'fridge',
  'fridges',
  'sarnaran',
] as const;

const HOUSEHOLD_SLUG_PARTS = [
  'household-appliances',
  'household',
  'kencaxayin-texnika',
  'bytovaya-tekhnika',
] as const;

const EXTRA_PHONE_SLUG_PARTS = ['heraxos', 'herakhos'] as const;
const EXTRA_TABLET_SLUG_PARTS = ['planshet'] as const;
const EXTRA_ACCESSORY_SLUG_PARTS = ['aksesuar'] as const;

function tokenizeCategory(value: string): string[] {
  return value.toLowerCase().split(/[-_/]/).filter(Boolean);
}

function categoryTokens(category: CategoryIconSource): string[] {
  return [
    ...tokenizeCategory(category.slug),
    ...tokenizeCategory(category.fullPath ?? ''),
  ];
}

function matchesSlugParts(category: CategoryIconSource, parts: readonly string[]): boolean {
  const slug = category.slug.toLowerCase();
  const fullPath = (category.fullPath ?? '').toLowerCase();
  const pathSegments = fullPath.split('/').filter(Boolean);
  const tokens = categoryTokens(category);
  return parts.some(
    (part) =>
      tokens.includes(part) ||
      slug === part ||
      fullPath === part ||
      pathSegments.includes(part),
  );
}

function titleIncludes(category: CategoryIconSource, markers: readonly string[]): boolean {
  const normalized = category.title.toLowerCase();
  return markers.some((marker) => normalized.includes(marker));
}

function resolveAccessoryIcon(category: CategoryIconSource): LucideIcon | null {
  if (titleIncludes(category, ['cable', 'кабель', 'լար']) || category.slug.includes('cable')) {
    return Cable;
  }
  if (titleIncludes(category, ['charger', 'заряд', 'լիցք']) || category.slug.includes('charger')) {
    return Plug;
  }
  if (
    titleIncludes(category, ['power bank', 'powerbank', 'պաուեր', 'power']) ||
    category.slug.includes('power-bank') ||
    category.slug.includes('powerbank')
  ) {
    return Battery;
  }
  if (
    matchesSlugParts(category, [...ACCESSORIES_SLUG_PARTS, ...EXTRA_ACCESSORY_SLUG_PARTS]) ||
    titleIncludes(category, ['աքսեսուար', 'аксессуар', 'accessory'])
  ) {
    return Cable;
  }
  return null;
}

function resolvePrimaryIcon(category: CategoryIconSource): LucideIcon | null {
  if (
    matchesSlugParts(category, HAIR_STRAIGHTENER_SLUG_PARTS) ||
    titleIncludes(category, ['ուղղիչ', 'выпрямител', 'straightener', 'մազերի ուղղ'])
  ) {
    return WandSparkles;
  }
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
    matchesSlugParts(category, AIR_CONDITIONER_SLUG_PARTS) ||
    titleIncludes(category, ['օդորակիչ', 'кондиционер', 'air condition', 'conditioner'])
  ) {
    return AirVent;
  }
  if (
    matchesSlugParts(category, WASHING_MACHINE_SLUG_PARTS) ||
    titleIncludes(category, ['լվացքի', 'стиральн', 'washing machine', 'washer'])
  ) {
    return WashingMachine;
  }
  if (
    matchesSlugParts(category, REFRIGERATOR_SLUG_PARTS) ||
    titleIncludes(category, ['սառնարան', 'холодильник', 'refrigerator', 'fridge'])
  ) {
    return Refrigerator;
  }
  if (
    matchesSlugParts(category, HOUSEHOLD_SLUG_PARTS) ||
    titleIncludes(category, ['կենցաղ', 'бытов', 'household'])
  ) {
    return Microwave;
  }
  if (
    matchesSlugParts(category, [...PHONES_SLUG_PARTS, ...EXTRA_PHONE_SLUG_PARTS]) ||
    titleIncludes(category, ['հեռախոս', 'телефон', 'iphone'])
  ) {
    return Smartphone;
  }
  if (
    matchesSlugParts(category, [...TABLETS_SLUG_PARTS, ...EXTRA_TABLET_SLUG_PARTS]) ||
    titleIncludes(category, ['պլանշետ', 'планшет', 'ipad'])
  ) {
    return Tablet;
  }
  if (
    matchesSlugParts(category, COMPUTERS_SLUG_PARTS) ||
    titleIncludes(category, ['համակարգիչ', 'компьютер', 'macbook', 'laptop'])
  ) {
    return Laptop;
  }
  if (
    matchesSlugParts(category, WATCHES_SLUG_PARTS) ||
    titleIncludes(category, ['ժամացույց', 'часы', 'watch'])
  ) {
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
