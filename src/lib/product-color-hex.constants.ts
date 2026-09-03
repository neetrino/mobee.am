import hyAttributes from '../locales/hy/attributes.json';
import ruAttributes from '../locales/ru/attributes.json';
import { resolveDysonSwatchHexes } from './dyson-color-registry';
import { isValidHexColor, normalizeHexToSixDigits } from './hexColorUtils';
import {
  buildColorLookupIndexes,
  normalizeColorKey,
  resolveCanonicalColorKey as resolveColorKey,
} from './resolve-product-color-key';

export { normalizeColorKey } from './resolve-product-color-key';

/**
 * Hex colors for product attribute values (Apple / MobileCentre catalog).
 * Keys are normalized: lowercase, trimmed.
 */
export const PRODUCT_COLOR_HEX: Record<string, string> = {
  beige: '#F5F5DC',
  black: '#1D1D1F',
  jetblack: '#0A0A0A',
  'jet black': '#0A0A0A',
  blue: '#276787',
  'blue shadow': '#5C6E7A',
  brown: '#A52A2A',
  gray: '#808080',
  grey: '#808080',
  green: '#394C38',
  red: '#BF0013',
  white: '#FFFFFF',
  yellow: '#F9E479',
  orange: '#FF8A4C',
  pink: '#FADDD7',
  purple: '#594F63',
  navy: '#000080',
  maroon: '#800000',
  olive: '#808000',
  teal: '#4A9B8E',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  lime: '#00FF00',
  silver: '#E2E3E4',
  'silver shadow': '#C8C9CE',
  gold: '#F4E8CE',
  tan: '#D2B48C',
  khaki: '#F0E68C',
  coral: '#FF7F50',
  salmon: '#FA8072',
  turquoise: '#40E0D0',
  violet: '#EE82EE',
  indigo: '#3D3F84',
  crimson: '#DC143C',
  lavender: '#E6E6FA',
  peach: '#FFE5B4',
  mint: '#98FB98',
  ivory: '#FFFFF0',
  cream: '#FFFDD0',
  'space black': '#1D1D1F',
  'space gray': '#535150',
  'space grey': '#535150',
  starlight: '#F6F2EF',
  midnight: '#232A35',
  'deep purple': '#59456B',
  ultramarine: '#2E4A8A',
  'deep blue': '#1E2D49',
  'light blue': '#A8C8E8',
  'mist blue': '#A8B8C8',
  'light green': '#BDD5B0',
  'light yellow': '#F5F0A8',
  'light gold': '#F5E6C8',
  'soft pink': '#F5D0C8',
  blush: '#E8C4C4',
  sage: '#AFBFA5',
  citrus: '#E8EEA9',
  'cloud white': '#F5F5F7',
  'cosmic orange': '#FF8932',
  'dark cherry': '#5A1F23',
  'dark gray': '#545454',
  'desert black': '#2B2B2B',
  'desert titanium': '#C9B896',
  'natural titanium': '#837F7D',
  'sky blue': '#A7C7E7',
  'blue titanium': '#394E63',
  'black titanium': '#2B2B2C',
  'white titanium': '#F2F1ED',
  'silver titanium': '#C2C2C2',
  'gold titanium': '#C9A227',
  'orange titanium': '#C65A30',
  'midnight titanium': '#3C3C3D',
  'gray titanium': '#8B8D91',
  'grey titanium': '#8B8D91',
  'twill black': '#1A1A1A',
  'gray/green': '#78866B',
  clear: '#F0F0F0',
  transparent: '#FFFFFF',
  sky: '#A7C7E7',
  titanium: '#837F7D',
  graphite: '#53565A',
  bronze: '#B08D57',
  burgundy: '#6D2E4B',
  jade: '#5B7F6E',
  'jade green': '#5B7F6E',
  jadegreen: '#5B7F6E',
  silverblue: '#8FA4B8',
  'silver blue': '#8FA4B8',
  whitesilver: '#F2F1ED',
  'white silver': '#F2F1ED',
  pinkgold: '#E6C2B0',
  'pink gold': '#E6C2B0',
  'rose gold': '#E6C2B0',
  rosegold: '#E6C2B0',
  patina: '#6A8F7A',
  nickel: '#C0C5C7',
  copper: '#B87333',
  sakura: '#F3C6C6',
  cherry: '#C44B6A',
  amber: '#D4A017',
  apricot: '#FBCEB1',
  topaz: '#E6C35C',
  plum: '#6B3A6B',
  rose: '#E8B4B8',
  strawberry: '#E25C5C',
  'light violet': '#C5A8D4',
};

const UNKNOWN_COLOR_FALLBACK = '#CCCCCC';
const PLACEHOLDER_SWATCH_HEX = new Set(['#cccccc', '#ccc']);

function buildTranslatedColorAliases(): Record<string, string> {
  const aliases: Record<string, string> = {};
  for (const colorMap of [hyAttributes.color, ruAttributes.color]) {
    for (const [canonical, label] of Object.entries(colorMap)) {
      if (typeof label !== 'string') continue;
      const aliasKey = normalizeColorKey(label);
      if (aliasKey && aliasKey !== canonical) {
        aliases[aliasKey] = canonical;
      }
    }
  }
  return aliases;
}

const TRANSLATED_COLOR_ALIASES = buildTranslatedColorAliases();
const COLOR_LOOKUP_INDEXES = buildColorLookupIndexes(PRODUCT_COLOR_HEX);

function resolveCanonicalColorKey(colorName: string): string | null {
  return resolveColorKey(
    colorName,
    PRODUCT_COLOR_HEX,
    COLOR_LOOKUP_INDEXES,
    TRANSLATED_COLOR_ALIASES,
  );
}

/**
 * Drops the UI placeholder gray so named-color fallback can take over.
 */
export function pickUsableSwatchHexes(
  colors: string[] | null | undefined,
): string[] {
  return (Array.isArray(colors) ? colors : [])
    .map((value) => String(value || '').trim())
    .filter((value) => {
      if (!value) return false;
      return !PLACEHOLDER_SWATCH_HEX.has(value.toLowerCase());
    });
}

function hexesFromSlashParts(colorName: string): string[] {
  const parts = colorName
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return [];

  const hexes: string[] = [];
  for (const part of parts.slice(0, 2)) {
    const canonicalKey = resolveCanonicalColorKey(part);
    if (!canonicalKey) continue;
    hexes.push(PRODUCT_COLOR_HEX[canonicalKey]);
  }
  return hexes;
}

/**
 * HEX ցուցակ գույնի անվան համար։ Dyson CMF alias-ները հաղթում են generic hue token-ներին։
 */
export function getProductColorHexes(colorName: string): string[] {
  const dyson = resolveDysonSwatchHexes(colorName);
  if (dyson.length > 0) return dyson;

  const canonicalKey = resolveCanonicalColorKey(colorName);
  if (canonicalKey) return [PRODUCT_COLOR_HEX[canonicalKey]];

  const dual = hexesFromSlashParts(colorName);
  if (dual.length > 0) return dual;

  if (isValidHexColor(colorName)) return [normalizeHexToSixDigits(colorName)];
  return [];
}

export function getProductColorHex(colorName: string): string {
  const hexes = getProductColorHexes(colorName);
  if (hexes.length > 0) return hexes[0];
  return UNKNOWN_COLOR_FALLBACK;
}

export function isKnownProductColor(colorName: string): boolean {
  if (resolveDysonSwatchHexes(colorName).length > 0) return true;
  if (resolveCanonicalColorKey(colorName)) return true;
  return isValidHexColor(colorName);
}

export type ResolveProductSwatchHexesParams = {
  names: string[];
  stored?: string[] | null;
};

/**
 * Dyson CMF անունները միշտ գերակայում են պահված generic HEX-ին (սխալ catalog backfill)։
 * Այլ դեպքում պահված HEX-ն է աղբյուրը; վերջին տարբերակը անվան lookup-ն է։
 */
export function resolveProductSwatchHexes(
  params: ResolveProductSwatchHexesParams,
): string[] {
  for (const name of params.names) {
    if (!name?.trim()) continue;
    const dyson = resolveDysonSwatchHexes(name);
    if (dyson.length > 0) return dyson;
  }

  const stored = pickUsableSwatchHexes(params.stored);
  if (stored.length > 0) return stored;

  for (const name of params.names) {
    if (!name?.trim()) continue;
    const hexes = getProductColorHexes(name);
    if (hexes.length > 0) return hexes;
  }

  return [];
}

/**
 * CSS background for product color swatches.
 * One HEX → solid; two+ → split dual-tone gradient.
 */
export function buildColorSwatchBackground(
  colors: string[] | null | undefined,
  fallbackHex: string = UNKNOWN_COLOR_FALLBACK,
): string {
  const hexes = pickUsableSwatchHexes(colors);

  if (hexes.length >= 2) {
    const primary = hexes[0];
    const secondary = hexes[1];
    return `linear-gradient(135deg, ${primary} 0%, ${primary} 48%, ${secondary} 52%, ${secondary} 100%)`;
  }

  if (hexes.length === 1) {
    return hexes[0];
  }

  return fallbackHex;
}

/**
 * React style object for a color swatch circle.
 */
export function buildColorSwatchStyle(
  colors: string[] | null | undefined,
  fallbackHex: string = UNKNOWN_COLOR_FALLBACK,
): { background: string } {
  return { background: buildColorSwatchBackground(colors, fallbackHex) };
}
