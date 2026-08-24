/**
 * Hex colors for product attribute values (Apple / MobileCentre catalog).
 * Keys are normalized: lowercase, trimmed.
 */
export const PRODUCT_COLOR_HEX: Record<string, string> = {
  beige: '#F5F5DC',
  black: '#1D1D1F',
  blue: '#276787',
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
  'twill black': '#1A1A1A',
  'gray/green': '#78866B',
  clear: '#F0F0F0',
  transparent: '#FFFFFF',
  sky: '#A7C7E7',
  titanium: '#837F7D',
};

const UNKNOWN_COLOR_FALLBACK = '#CCCCCC';

export function normalizeColorKey(colorName: string): string {
  return colorName.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function getProductColorHex(colorName: string): string {
  const key = normalizeColorKey(colorName);
  return PRODUCT_COLOR_HEX[key] ?? UNKNOWN_COLOR_FALLBACK;
}

export function isKnownProductColor(colorName: string): boolean {
  return normalizeColorKey(colorName) in PRODUCT_COLOR_HEX;
}

/**
 * CSS background for product color swatches.
 * One HEX → solid; two+ → split dual-tone gradient.
 */
export function buildColorSwatchBackground(
  colors: string[] | null | undefined,
  fallbackHex: string = UNKNOWN_COLOR_FALLBACK,
): string {
  const hexes = (Array.isArray(colors) ? colors : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean);

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
